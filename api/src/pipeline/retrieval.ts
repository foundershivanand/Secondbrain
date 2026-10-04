import { Env } from '../config';
import { Database } from '../db';
import { ChatResponse, CitationSource, KnowledgeRecord, MemoryRecord, SourceRecord } from '../types';
import { callGemini, cleanAndParseJson } from '../ai/gemini';
import { CHAT_SYNTHESIS_PROMPT } from '../ai/prompts';
import { getOAuthAccessToken, fetchOAuthLikedVideos } from '../routes/youtube-sync';

export interface RetrievalResult {
  knowledgeNotes: KnowledgeRecord[];
  atomicStatements: string[];
  memories: MemoryRecord[];
  sources: CitationSource[];
  recentActivity?: {
    type: 'video' | 'general';
    items: Array<{ title: string; id: string; url?: string; captured_at?: string; core_idea?: string; source_type?: string; isLiked?: boolean }>;
    isYouTubeQuery?: boolean;
    hasNoVideos?: boolean;
  };
  playlists?: Array<{
    id: string;
    title: string;
    description: string;
    item_count: number;
    privacy_status: string;
    thumbnail_url: string;
    playlist_url: string;
    synced_at: string;
    created_at?: string;
  }>;
  isPlaylistQuery?: boolean;
}

export async function retrieveRelevantContext(
  db: Database,
  userQuery: string,
  env?: Env
): Promise<RetrievalResult> {
  const lowerQuery = userQuery.toLowerCase();
  const isPlaylistQuery = /\b(playlist|playlists)\b/i.test(lowerQuery);
  const isLikedQuery = /\b(liked|likes|favorite|favorites)\b/i.test(lowerQuery);
  const isYouTubeQuery = /\b(youtube|yt|liked|likes)\b/i.test(lowerQuery) || isPlaylistQuery;
  const isVideoQuery = isYouTubeQuery || /\b(video|watch|watched|watching|seen|viewed)\b/i.test(lowerQuery);
  const isRecencyQuery = /\b(last|latest|recent|recently|newest|yesterday|today|just now|past|previous)\b/i.test(lowerQuery);

  const relevantKnowledgeMap = new Map<string, KnowledgeRecord>();
  const atomicStatementsSet = new Set<string>();
  let recentActivity: RetrievalResult['recentActivity'] | undefined;
  let playlists: any[] = [];

  if (isPlaylistQuery || isYouTubeQuery) {
    try {
      playlists = await db.listYouTubePlaylists();
    } catch (e) {
      console.warn('D1 listYouTubePlaylists skipped:', e);
    }
  }

  // 0. Recency & Video Handling: If asking about videos or playlists or recent notes
  if (isVideoQuery) {
    const sourceTypes = isYouTubeQuery ? ['youtube'] : ['youtube', 'video'];
    const limit = /\b(all|list|what videos|which videos|history|liked)\b/i.test(lowerQuery) ? 50 : 15;
    let recentVideos: SourceRecord[] = [];
    try {
      recentVideos = await db.getRecentSourcesByType(sourceTypes, limit);
    } catch (e) {
      console.warn('D1 getRecentSourcesByType skipped:', e);
    }
    const videoItems: Array<{ title: string; id: string; url?: string; captured_at?: string; core_idea?: string; source_type?: string; isLiked?: boolean }> = [];

    // 0a. If Google OAuth is connected and asking about YouTube / liked videos, fetch live liked videos directly from Google
    if (env && (isLikedQuery || isYouTubeQuery)) {
      try {
        const accessToken = await getOAuthAccessToken(env, db);
        if (accessToken) {
          const liveLiked = await fetchOAuthLikedVideos(accessToken, 5);
          for (const lv of liveLiked) {
            let k: KnowledgeRecord | null = null;
            try {
              const src = await db.getSourceByUrl(lv.url);
              if (src) {
                k = await db.getKnowledgeBySourceId(src.id);
                // Keep captured_at updated with the exact like timestamp
                if (lv.publishedAt && src.captured_at !== lv.publishedAt) {
                  await db.updateSourceCapturedAt(src.id, lv.publishedAt, 'liked_videos');
                  await db.updateKnowledgeTimestamp(src.id, lv.publishedAt);
                }
              }
            } catch {}

            if (k) {
              relevantKnowledgeMap.set(k.id, k);
            } else {
              const virtualNote: KnowledgeRecord = {
                id: `KN-YT-${lv.videoId}`,
                source_id: `SRC-YT-${lv.videoId}`,
                title: lv.title,
                knowledge_type: 'youtube',
                core_idea: `User liked YouTube video: "${lv.title}" from channel ${lv.channel || 'YouTube'}.`,
                key_information: '[]',
                insights: '[]',
                my_thought: `Liked Video (Live Google Sync)`,
                actionable_items: '[]',
                topics: JSON.stringify(['YouTube', 'Liked Video']),
                entities: '[]',
                tags: JSON.stringify(['youtube', 'liked-video']),
                confidence: 1.0,
                importance: 8,
                why_saved: 'User clicked Like on YouTube',
                what_changed: 'Real-time liked video from YouTube API',
                markdown_path: `01 Knowledge/YouTube/${lv.videoId}.md`,
                created_at: lv.publishedAt || new Date().toISOString(),
                updated_at: lv.publishedAt || new Date().toISOString(),
              };
              relevantKnowledgeMap.set(virtualNote.id, virtualNote);
            }

            videoItems.push({
              title: k?.title || lv.title,
              id: k?.id || `KN-YT-${lv.videoId}`,
              url: lv.url,
              captured_at: lv.publishedAt || new Date().toISOString(),
              core_idea: k?.core_idea || `User liked YouTube video: "${lv.title}" from channel ${lv.channel || 'YouTube'}.`,
              source_type: 'youtube',
              isLiked: true,
            });
          }
        }
      } catch (oauthErr) {
        console.warn('Real-time YouTube liked videos fetch skipped:', oauthErr);
      }
    }

    // Query knowledge notes associated with YouTube as well
    try {
      const ytKnowledge = await db.getYouTubeKnowledge(limit);
      for (const k of ytKnowledge) {
        if (!relevantKnowledgeMap.has(k.id)) {
          relevantKnowledgeMap.set(k.id, k);
        }
        let srcUrl: string | undefined = undefined;
        let isLikedFromSrc = false;
        if (k.source_id) {
          try {
            const src = await db.getSourceById(k.source_id);
            if (src) {
              srcUrl = src.original_url || src.raw_url || undefined;
              isLikedFromSrc = src.channel_id === 'liked_videos';
            }
          } catch {}
        }
        videoItems.push({
          title: k.title,
          id: k.id,
          url: srcUrl,
          captured_at: k.created_at,
          core_idea: k.core_idea,
          source_type: k.knowledge_type || 'youtube',
          isLiked: Boolean(isLikedFromSrc || (k.my_thought && k.my_thought.includes('Liked Video'))),
        });
      }
    } catch (e) {
      console.warn('D1 getYouTubeKnowledge skipped:', e);
    }

    for (const src of recentVideos) {
      // Exclude Android system screenshot files from being treated as video watch history
      if (src.title && (src.title.includes('Screenshot_') || src.title.includes('.YouTube.png'))) {
        continue;
      }
      const isLiked = src.channel_id === 'liked_videos';
      let k: KnowledgeRecord | null = null;
      try {
        k = await db.getKnowledgeBySourceId(src.id);
      } catch {}
      if (k) {
        relevantKnowledgeMap.set(k.id, k);
        const existingIdx = videoItems.findIndex((v) => v.id === k.id || v.title === k.title);
        const itemObj = {
          title: k.title,
          id: k.id,
          url: src.original_url || src.raw_url || undefined,
          captured_at: src.captured_at || k.created_at,
          core_idea: k.core_idea,
          source_type: src.source_type,
          isLiked: Boolean(isLiked || (k.my_thought && k.my_thought.includes('Liked Video'))),
        };
        if (existingIdx >= 0) {
          videoItems[existingIdx] = itemObj;
        } else {
          videoItems.push(itemObj);
        }
      } else {
        if (!videoItems.some((v) => v.id === src.id || v.title === src.title)) {
          videoItems.push({
            title: src.title || 'Untitled Video',
            id: src.id,
            url: src.original_url || src.raw_url || undefined,
            captured_at: src.captured_at,
            core_idea: undefined,
            source_type: src.source_type,
            isLiked,
          });
        }
      }
    }

    // Sort by recency (most recent first)
    videoItems.sort((a, b) => new Date(b.captured_at || 0).getTime() - new Date(a.captured_at || 0).getTime());

    // If user specifically asked about liked videos, bring verified liked videos to the top
    if (isLikedQuery) {
      videoItems.sort((a, b) => {
        if (a.isLiked && !b.isLiked) return -1;
        if (!a.isLiked && b.isLiked) return 1;
        return new Date(b.captured_at || 0).getTime() - new Date(a.captured_at || 0).getTime();
      });
    }

    recentActivity = {
      type: 'video',
      items: videoItems,
      isYouTubeQuery,
      hasNoVideos: videoItems.length === 0,
    };
  } else if (isRecencyQuery) {
    try {
      const recentNotes = await db.getRecentKnowledge(5);
      const noteItems: Array<{ title: string; id: string; url?: string; captured_at?: string; core_idea?: string }> = [];
      for (const k of recentNotes) {
        if (!relevantKnowledgeMap.has(k.id)) {
          relevantKnowledgeMap.set(k.id, k);
        }
        noteItems.push({
          title: k.title,
          id: k.id,
          captured_at: k.created_at,
          core_idea: k.core_idea,
        });
      }
      if (noteItems.length > 0) {
        recentActivity = {
          type: 'general',
          items: noteItems,
        };
      }
    } catch (e) {
      console.warn('D1 getRecentKnowledge skipped:', e);
    }
  }

  const keywords = userQuery
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !['what', 'how', 'when', 'where', 'which', 'about', 'know', 'tell', 'that'].includes(w));

  // 1. Search knowledge notes matching keywords or concise overall query
  try {
    if (userQuery.trim().length > 0 && userQuery.trim().length <= 30 && !userQuery.includes(' ')) {
      const directMatches = await db.searchKnowledge(userQuery.trim(), 10);
      for (const k of directMatches) {
        relevantKnowledgeMap.set(k.id, k);
      }
    }

    for (const word of keywords.slice(0, 5)) {
      if (word.length > 2) {
        const wordMatches = await db.searchKnowledge(word, 5);
        for (const k of wordMatches) {
          if (!relevantKnowledgeMap.has(k.id)) {
            relevantKnowledgeMap.set(k.id, k);
          }
        }
      }
    }
  } catch (e) {
    console.warn('D1 searchKnowledge skipped:', e);
  }

  // 2. Search atomic knowledge statements (M2 level)
  try {
    for (const word of keywords.slice(0, 4)) {
      const atomicMatches = await db.searchAtomicKnowledge(word, 8);
      for (const a of atomicMatches) {
        atomicStatementsSet.add(`• [${a.concept_type}] ${a.statement} (confidence: ${Math.round(a.confidence * 100)}%)`);
        if (a.knowledge_id && !relevantKnowledgeMap.has(a.knowledge_id)) {
          try {
            const parentK = await db.getKnowledgeById(a.knowledge_id);
            if (parentK) relevantKnowledgeMap.set(parentK.id, parentK);
          } catch {}
        }
      }
    }
  } catch (e) {
    console.warn('D1 searchAtomicKnowledge skipped:', e);
  }

  // 3. Fetch durable long-term personal memories (M4 level)
  let durableMemories: MemoryRecord[] = [];
  try {
    durableMemories = await db.getDurableMemories(20);
  } catch (e) {
    console.warn('D1 getDurableMemories skipped:', e);
  }
  const relevantMemories = durableMemories.filter((m) => {
    const content = m.content.toLowerCase();
    return keywords.some((k) => content.includes(k));
  });

  // Prioritize recent activity notes first in the list
  const knowledgeNotes: KnowledgeRecord[] = [];
  if (recentActivity?.items) {
    for (const item of recentActivity.items) {
      const k = relevantKnowledgeMap.get(item.id);
      if (k && !knowledgeNotes.some((n) => n.id === k.id)) {
        knowledgeNotes.push(k);
      }
    }
  }

  // If this is a video/YouTube-specific query and we found video notes, isolate video notes to prevent irrelevant context
  if (isVideoQuery && knowledgeNotes.length > 0) {
    const videoKnowledgeOnly = knowledgeNotes.filter(
      (k) =>
        k.knowledge_type === 'youtube' ||
        (k.markdown_path && k.markdown_path.includes('YouTube')) ||
        (k.my_thought && k.my_thought.toLowerCase().includes('youtube')) ||
        (recentActivity?.items && recentActivity.items.some((v) => v.id === k.id || v.title === k.title))
    );
    if (videoKnowledgeOnly.length > 0) {
      knowledgeNotes.length = 0;
      knowledgeNotes.push(...videoKnowledgeOnly);
    }
  } else {
    for (const k of relevantKnowledgeMap.values()) {
      if (!knowledgeNotes.some((n) => n.id === k.id)) {
        knowledgeNotes.push(k);
      }
    }
  }

  const trimmedKnowledgeNotes = knowledgeNotes.slice(0, 8);
  const sources: CitationSource[] = [];

  for (const k of trimmedKnowledgeNotes) {
    let originalUrl: string | null = null;
    let rawStorage: string | null = null;
    let rawUrl: string | null = null;
    let rawId: string | null = null;

    if (k.source_id) {
      try {
        const src = await db.getSourceById(k.source_id);
        if (src) {
          originalUrl = src.original_url;
          rawStorage = src.raw_storage;
          rawUrl = src.raw_url;
          rawId = src.raw_id || null;
        }
      } catch {}
    }

    sources.push({
      id: k.id,
      title: k.title,
      source_type: k.knowledge_type,
      raw_id: rawId,
      original_url: originalUrl,
      raw_storage: rawStorage,
      raw_url: rawUrl,
      snippet: k.core_idea.slice(0, 150),
    });
  }

  return {
    knowledgeNotes: trimmedKnowledgeNotes,
    atomicStatements: Array.from(atomicStatementsSet).slice(0, 15),
    memories: relevantMemories.length > 0 ? relevantMemories : durableMemories.slice(0, 5),
    sources,
    recentActivity,
    playlists,
    isPlaylistQuery,
  };
}

export async function answerBrainQuery(
  env: Env,
  db: Database,
  userQuery: string
): Promise<ChatResponse> {
  const context = await retrieveRelevantContext(db, userQuery, env);
  let brainState: any = null;
  try {
    brainState = await db.getBrainState();
  } catch (e) {
    console.warn('D1 getBrainState skipped:', e);
  }

  const hasPlaylists = Boolean(context.playlists && context.playlists.length > 0);
  const hasRecentVideos = Boolean(context.recentActivity && context.recentActivity.items.length > 0);

  if (
    context.knowledgeNotes.length === 0 &&
    context.memories.length === 0 &&
    !brainState &&
    !hasPlaylists &&
    !hasRecentVideos &&
    !context.isPlaylistQuery
  ) {
    return {
      answer: `I searched your Second Brain for **"${userQuery}"**, but could not find any saved knowledge notes, YouTube playlists, or personal memories on this topic yet.\n\nTo build your brain:\n- Capture ideas or screenshots using the **Quick Capture** button\n- Share YouTube links, articles, or PDFs\n- Connect YouTube in Settings to sync your liked videos and profile playlists\n- Send notes directly via your Telegram bot`,
      sources: [],
      related_topics: [],
      memories_used: [],
      suggested_questions: [
        'How does my Second Brain ingestion pipeline work?',
        'What playlists do I have on my YouTube profile?',
      ],
    };
  }

  // Format retrieved context with Brain State & Provenance
  let contextBlock = '';

  if (brainState) {
    contextBlock += `=== CURRENT BRAIN STATE (COMPACT CONTEXT) ===\n`;
    if (brainState.current_goals?.length) {
      contextBlock += `Current Goals: ${brainState.current_goals.join('; ')}\n`;
    }
    if (brainState.important_preferences?.length) {
      contextBlock += `Preferences: ${brainState.important_preferences.join('; ')}\n`;
    }
    if (brainState.recent_learning?.length) {
      contextBlock += `Recent Learning: ${brainState.recent_learning.join('; ')}\n`;
    }
    if (brainState.current_interests?.length) {
      contextBlock += `Interests: ${brainState.current_interests.map((i: any) => `${i.topic} (score: ${i.interest_score})`).join(', ')}\n`;
    }
    contextBlock += `\n`;
  }

  if (context.isPlaylistQuery || hasPlaylists) {
    contextBlock += `=== USER'S YOUTUBE PLAYLISTS ON PROFILE ===\n`;
    if (hasPlaylists) {
      contextBlock += `The user has ${context.playlists!.length} playlists on their YouTube profile:\n`;
      context.playlists!.forEach((pl, idx) => {
        contextBlock += `${idx + 1}. "${pl.title}" (${pl.item_count} videos, privacy: ${pl.privacy_status})\n`;
        if (pl.description) contextBlock += `   Description: ${pl.description}\n`;
        contextBlock += `   URL: ${pl.playlist_url}\n`;
      });
      contextBlock += `\nCRITICAL INSTRUCTION: If user asks what playlists they have on their YouTube profile, or asks about any specific playlist, list and describe them accurately with links from above.\n\n`;
    } else {
      contextBlock += `CRITICAL FACT: The user asked about their YouTube profile playlists, but NO playlists have been synced to the Second Brain yet.\n`;
      contextBlock += `Explicitly tell the user:\n`;
      contextBlock += `1. No YouTube playlists have been synced yet.\n`;
      contextBlock += `2. They can connect their YouTube profile or sync playlists via Settings -> YouTube in the Second Brain Web App.\n\n`;
    }
  }

  if (context.recentActivity) {
    contextBlock += `=== CHRONOLOGICAL PROVENANCE / RECENT ACTIVITY ===\n`;
    if (context.recentActivity.type === 'video') {
      if (context.recentActivity.hasNoVideos) {
        contextBlock += `CRITICAL FACT: The user asked about ${context.recentActivity.isYouTubeQuery ? 'YouTube or liked' : 'recent'} videos, but NO ${context.recentActivity.isYouTubeQuery ? 'YouTube' : 'video'} notes exist in the Second Brain yet.\n`;
        contextBlock += `DO NOT cite unrelated notes, mock data, or offline media files unless explicitly requested.\n`;
        contextBlock += `Explicitly tell the user:\n`;
        contextBlock += `1. No ${context.recentActivity.isYouTubeQuery ? 'YouTube' : ''} videos have been captured or synced to your Second Brain yet.\n`;
        contextBlock += `2. Instant capture: Tap "Share" on any YouTube video in the YouTube mobile app -> select Telegram -> send to @MyDailySecondBrainBot (or paste the link into the Second Brain Web App "Quick Capture"). It extracts the core ideas, takeaways, and creates an Obsidian note within seconds.\n`;
        contextBlock += `3. Automatic sync: Background polling of YouTube Liked Videos requires Google OAuth credentials to access private playlist data.\n\n`;
      } else {
        contextBlock += `Order of most recently captured/watched/liked videos (MOST RECENT FIRST):\n`;
        context.recentActivity.items.forEach((item, idx) => {
          contextBlock += `${idx + 1}. [${idx === 0 ? 'LATEST / LAST WATCHED OR LIKED' : `Earlier Video #${idx}`}] "${item.title}" (${item.source_type || 'video'})${item.isLiked ? ' [USER LIKED VIDEO]' : ''}\n`;
          if (item.url) contextBlock += `   Original URL: ${item.url}\n`;
          if (item.captured_at) contextBlock += `   Captured / Watched / Liked At: ${item.captured_at}\n`;
          if (item.core_idea) contextBlock += `   Core Idea: ${item.core_idea}\n`;
        });
        contextBlock += `\nCRITICAL INSTRUCTION: If user asks "what was the last video i liked", "what is the latest video", "what was the last video I watched", "explain that to me", "what videos did I watch", or any question about their YouTube videos:
1. NEVER ask the user to paste or provide a URL. You have full access to their synced YouTube videos and notes above.
2. The exact latest/last video is: "${context.recentActivity.items[0]?.title}".
3. Directly state this video's title and URL (${context.recentActivity.items[0]?.url || 'No URL'}).
4. Dedicate your entire response to thoroughly explaining this video: its core idea, technical/architectural breakthroughs, key concepts, actionable takeaways, and why it was saved.
5. Do NOT list or bring up unrelated notes, academic PDFs, or offline media. Focus entirely on explaining the video requested.\n\n`;
      }
    } else {
      contextBlock += `Order of most recently saved notes (MOST RECENT FIRST):\n`;
      context.recentActivity.items.forEach((item, idx) => {
        contextBlock += `${idx + 1}. [${idx === 0 ? 'LATEST NOTE' : `Earlier Note #${idx}`}] "${item.title}"\n`;
        if (item.captured_at) contextBlock += `   Created At: ${item.captured_at}\n`;
        if (item.core_idea) contextBlock += `   Core Idea: ${item.core_idea}\n`;
      });
      contextBlock += `\n`;
    }
  }

  contextBlock += `=== RETRIEVED SECOND BRAIN KNOWLEDGE ===\n\n`;
  context.knowledgeNotes.forEach((k, idx) => {
    contextBlock += `[NOTE ${idx + 1}]: ${k.title} (ID: ${k.id}, Type: ${k.knowledge_type})\n`;
    contextBlock += `Core Idea: ${k.core_idea}\n`;
    contextBlock += `Key Info: ${k.key_information}\n`;
    contextBlock += `AI Insights: ${k.insights}\n`;
    if (k.my_thought) {
      contextBlock += `USER THOUGHT (User's explicit words): ${k.my_thought}\n`;
    }
    contextBlock += `Actions: ${k.actionable_items}\n`;
    contextBlock += `Topics: ${k.topics}\n`;
    contextBlock += `Why I Saved This: ${k.why_saved}\n`;
    contextBlock += `What Changed: ${k.what_changed}\n\n`;
  });

  if (context.atomicStatements.length > 0) {
    contextBlock += `=== ATOMIC KNOWLEDGE STATEMENTS (M2) ===\n`;
    contextBlock += context.atomicStatements.join('\n') + `\n\n`;
  }

  if (context.memories.length > 0) {
    contextBlock += `=== DURABLE PERSONAL MEMORIES (M4) ===\n`;
    context.memories.forEach((m) => {
      contextBlock += `- [${m.memory_type}] ${m.content} (importance: ${m.importance}/10, repetitions: ${m.repetition_count})\n`;
    });
    contextBlock += `\n`;
  }

  const promptText = `${contextBlock}\nUSER QUESTION: "${userQuery}"\n\nProvide an insightful answer synthesizing the knowledge above with source citations, lineage, and related topics. Clearly distinguish user thoughts from external facts. If any conflict exists between the user's prior beliefs and new evidence, explicitly report it.`;

  try {
    const rawResponse = await callGemini(
      env,
      [{ text: promptText }],
      CHAT_SYNTHESIS_PROMPT,
      true
    );

    const parsed = cleanAndParseJson<ChatResponse>(rawResponse);

    if (parsed.sources && parsed.sources.length > 0) {
      parsed.sources = parsed.sources.map((s) => {
        const matched = context.sources.find(
          (cs) => cs.id === s.id || cs.title.toLowerCase().includes(s.title.toLowerCase())
        );
        return {
          ...s,
          raw_id: matched?.raw_id || s.raw_id || null,
          original_url: matched?.original_url || s.original_url || null,
          raw_storage: matched?.raw_storage || s.raw_storage || null,
          raw_url: matched?.raw_url || s.raw_url || null,
        };
      });
    } else {
      parsed.sources = context.sources.slice(0, 4);
    }

    return parsed;
  } catch (err) {
    console.error('Brain chat synthesis failed:', err);
    return {
      answer: `Here is what your Second Brain contains regarding **"${userQuery}"**:\n\n${context.knowledgeNotes
        .map((k) => `### [[${k.title}]]\n${k.core_idea}\n\n${k.my_thought ? `**My Thought:** ${k.my_thought}\n` : ''}**Why Saved:** ${k.why_saved}\n**What Changed:** ${k.what_changed}`)
        .join('\n\n')}`,
      sources: context.sources,
      related_topics: Array.from(new Set(context.knowledgeNotes.flatMap((k) => JSON.parse(k.topics || '[]')))),
      memories_used: context.memories.map((m) => m.content),
      suggested_questions: ['What actions are recommended from these notes?'],
    };
  }
}
