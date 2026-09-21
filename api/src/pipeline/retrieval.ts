import { Env } from '../config';
import { Database } from '../db';
import { ChatResponse, CitationSource, KnowledgeRecord, MemoryRecord } from '../types';
import { callGemini, cleanAndParseJson } from '../ai/gemini';
import { CHAT_SYNTHESIS_PROMPT } from '../ai/prompts';

export interface RetrievalResult {
  knowledgeNotes: KnowledgeRecord[];
  atomicStatements: string[];
  memories: MemoryRecord[];
  sources: CitationSource[];
}

export async function retrieveRelevantContext(
  db: Database,
  userQuery: string
): Promise<RetrievalResult> {
  const keywords = userQuery
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !['what', 'how', 'when', 'where', 'which', 'about', 'know', 'tell', 'that'].includes(w));

  const relevantKnowledgeMap = new Map<string, KnowledgeRecord>();
  const atomicStatementsSet = new Set<string>();

  // 1. Search knowledge notes matching keywords or overall query
  const directMatches = await db.searchKnowledge(userQuery, 10);
  for (const k of directMatches) {
    relevantKnowledgeMap.set(k.id, k);
  }

  for (const word of keywords.slice(0, 4)) {
    const wordMatches = await db.searchKnowledge(word, 5);
    for (const k of wordMatches) {
      if (!relevantKnowledgeMap.has(k.id)) {
        relevantKnowledgeMap.set(k.id, k);
      }
    }
  }

  // 2. Search atomic knowledge statements (M2 level)
  for (const word of keywords.slice(0, 4)) {
    const atomicMatches = await db.searchAtomicKnowledge(word, 8);
    for (const a of atomicMatches) {
      atomicStatementsSet.add(`• [${a.concept_type}] ${a.statement} (confidence: ${Math.round(a.confidence * 100)}%)`);
      if (a.knowledge_id && !relevantKnowledgeMap.has(a.knowledge_id)) {
        const parentK = await db.getKnowledgeById(a.knowledge_id);
        if (parentK) relevantKnowledgeMap.set(parentK.id, parentK);
      }
    }
  }

  // 3. Fetch durable long-term personal memories (M4 level)
  const durableMemories = await db.getDurableMemories(20);
  const relevantMemories = durableMemories.filter((m) => {
    const content = m.content.toLowerCase();
    return keywords.some((k) => content.includes(k));
  });

  const knowledgeNotes = Array.from(relevantKnowledgeMap.values()).slice(0, 8);
  const sources: CitationSource[] = [];

  for (const k of knowledgeNotes) {
    let originalUrl: string | null = null;
    let rawStorage: string | null = null;
    let rawUrl: string | null = null;
    let rawId: string | null = null;

    if (k.source_id) {
      const src = await db.getSourceById(k.source_id);
      if (src) {
        originalUrl = src.original_url;
        rawStorage = src.raw_storage;
        rawUrl = src.raw_url;
        rawId = src.raw_id || null;
      }
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
    knowledgeNotes,
    atomicStatements: Array.from(atomicStatementsSet).slice(0, 15),
    memories: relevantMemories.length > 0 ? relevantMemories : durableMemories.slice(0, 5),
    sources,
  };
}

export async function answerBrainQuery(
  env: Env,
  db: Database,
  userQuery: string
): Promise<ChatResponse> {
  const context = await retrieveRelevantContext(db, userQuery);
  const brainState = await db.getBrainState();

  if (context.knowledgeNotes.length === 0 && context.memories.length === 0 && !brainState) {
    return {
      answer: `I searched your Second Brain for **"${userQuery}"**, but could not find any saved knowledge notes or personal memories on this topic yet.\n\nTo build your brain:\n- Capture ideas or screenshots using the **Quick Capture** button\n- Share YouTube links, articles, or PDFs\n- Send notes directly via your Telegram bot`,
      sources: [],
      related_topics: [],
      memories_used: [],
      suggested_questions: [
        'How does my Second Brain ingestion pipeline work?',
        'What are the memory levels M0 through M5?',
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
      contextBlock += `Interests: ${brainState.current_interests.map((i) => `${i.topic} (score: ${i.interest_score})`).join(', ')}\n`;
    }
    contextBlock += `\n`;
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
