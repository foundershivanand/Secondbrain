import { Env } from '../config';
import { Database } from '../db';
import { processIngestion } from '../pipeline/ingestion';
import { jsonResponse, errorResponse } from '../utils/response';

export async function handleImporters(
  request: Request,
  env: Env,
  db: Database,
  pathParts: string[]
): Promise<Response> {
  const importerType = pathParts[0]; // 'chat' or 'youtube-history'

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed. Use POST.', 405);
  }

  try {
    const body: any = await request.json();

    if (importerType === 'chat') {
      // Handles ChatGPT, Claude, or Gemini export conversations
      const conversations = Array.isArray(body)
        ? body
        : body.conversations || (body.mapping ? [body] : [body]);
      const results: any[] = [];

      for (const conv of conversations.slice(0, 15)) {
        let conversationText = '';
        let title = conv.title || 'Exported AI Conversation';

        // ChatGPT export format parsing
        if (conv.mapping) {
          const messages = Object.values(conv.mapping)
            .map((node: any) => node.message)
            .filter((m: any) => m && m.content && m.content.parts && m.content.parts.length > 0)
            .map((m: any) => `${m.author?.role?.toUpperCase() || 'USER'}: ${m.content.parts.join(' ')}`);
          conversationText = messages.join('\n\n');
        } else if (conv.chat_messages) {
          // Claude export format
          conversationText = conv.chat_messages
            .map((m: any) => `${m.sender?.toUpperCase() || 'USER'}: ${m.text}`)
            .join('\n\n');
        } else if (Array.isArray(conv.messages)) {
          // Normalized or Gemini format
          conversationText = conv.messages
            .map((m: any) => `${m.role?.toUpperCase() || 'USER'}: ${m.content || m.text}`)
            .join('\n\n');
        } else if (typeof conv.text === 'string') {
          conversationText = conv.text;
        }

        if (!conversationText || conversationText.length < 20) continue;

        const res = await processIngestion(env, db, {
          sourceType: 'chat_export',
          text: conversationText,
          title: `Chat: ${title}`,
          rawStorage: 'chat_export',
          userNote: `Imported from AI conversation export (${title})`,
          importance: 7,
          priority: 'P1',
        });

        results.push({
          title: res.knowledge.title,
          id: res.knowledge.id,
          core_idea: res.knowledge.core_idea,
        });
      }

      return jsonResponse({
        success: true,
        importedCount: results.length,
        notes: results,
      });
    }

    if (importerType === 'youtube-history') {
      // Handles YouTube watch-history.json from Google Takeout
      const history = Array.isArray(body) ? body : body.history || [];
      const topicKeywords: Record<string, string[]> = {
        'AI agents': ['agent', 'agents', 'agentic', 'langchain', 'autogpt', 'crewai'],
        'Memory Systems & RAG': ['rag', 'retrieval', 'memory', 'vector', 'embeddings', 'context'],
        'SaaS & Product': ['saas', 'startup', 'product', 'mrr', 'onboarding', 'business', 'pricing'],
        'Programming & Architecture': ['architecture', 'cloudflare', 'sqlite', 'database', 'system design', 'rust', 'typescript'],
        'Content & Growth': ['growth', 'youtube', 'content', 'marketing', 'distribution'],
      };

      const topicCounts: Record<string, number> = {};
      const prioritizedVideos: any[] = [];

      for (const item of history) {
        const title = (item.title || item.titleUrl || '').toLowerCase();
        let matchedTopic: string | null = null;

        for (const [topic, keywords] of Object.entries(topicKeywords)) {
          if (keywords.some((kw) => title.includes(kw))) {
            matchedTopic = topic;
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
            break;
          }
        }

        if (matchedTopic && prioritizedVideos.length < 20) {
          prioritizedVideos.push({
            title: item.title?.replace(/^Watched\s+/, '') || 'YouTube Learning Video',
            url: item.titleUrl || item.url,
            matchedTopic,
          });
        }
      }

      // Ingest top prioritized videos into Second Brain
      const results: any[] = [];
      for (const v of prioritizedVideos.slice(0, 10)) {
        if (!v.url) continue;

        const res = await processIngestion(env, db, {
          sourceType: 'youtube',
          url: v.url,
          title: v.title,
          rawStorage: 'youtube',
          userNote: `Prioritized YouTube learning: ${v.matchedTopic}`,
          importance: 7,
          priority: 'P1',
        });

        results.push({
          title: res.knowledge.title,
          id: res.knowledge.id,
          url: v.url,
          topic: v.matchedTopic,
        });
      }

      // Update Current Interests in Brain State (Section 21)
      const currentBrainState = await db.getBrainState();
      if (currentBrainState) {
        const totalMatches = Object.values(topicCounts).reduce((a, b) => a + b, 0) || 1;
        const newInterests = Object.entries(topicCounts).map(([topic, count]) => {
          const score = Math.min(0.99, Math.round((count / totalMatches) * 100) / 100 + 0.4);
          return {
            topic,
            interest_score: score,
            trend: count > 3 ? 'increasing' : 'stable',
          };
        });

        currentBrainState.current_interests = newInterests.length > 0
          ? newInterests.sort((a, b) => b.interest_score - a.interest_score)
          : currentBrainState.current_interests;

        await db.updateBrainState(currentBrainState);
      }

      return jsonResponse({
        success: true,
        importedCount: results.length,
        discoveredInterests: topicCounts,
        videos: results,
      });
    }

    return errorResponse(`Unknown importer type "${importerType}"`, 404);
  } catch (err: any) {
    console.error('Import error:', err);
    return errorResponse(err.message || 'Import processing failed', 500);
  }
}
