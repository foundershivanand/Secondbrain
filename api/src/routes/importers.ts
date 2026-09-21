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
      const conversations = Array.isArray(body) ? body : [body];
      const results: any[] = [];

      for (const conv of conversations.slice(0, 10)) {
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
        } else if (typeof conv.text === 'string') {
          conversationText = conv.text;
        }

        if (!conversationText) continue;

        const res = await processIngestion(env, db, {
          sourceType: 'chat_export',
          text: conversationText,
          title: `Chat: ${title}`,
          rawStorage: 'chat_export',
          userNote: `Imported from AI conversation export (${title})`,
          importance: 7,
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
      // Handles YouTube watch-history.json
      const history = Array.isArray(body) ? body : body.history || [];
      const learningCategories = [
        'ai', 'agent', 'rag', 'system', 'architecture', 'software',
        'programming', 'saas', 'startup', 'design', 'memory'
      ];

      const prioritizedVideos = history
        .filter((item: any) => {
          const title = (item.title || item.titleUrl || '').toLowerCase();
          return learningCategories.some((cat) => title.includes(cat));
        })
        .slice(0, 15);

      const results: any[] = [];
      for (const v of prioritizedVideos) {
        const url = v.titleUrl || v.url;
        if (!url) continue;

        const res = await processIngestion(env, db, {
          sourceType: 'youtube',
          url,
          title: v.title?.replace(/^Watched\s+/, '') || 'YouTube Learning Video',
          rawStorage: 'youtube',
          userNote: 'Imported from prioritized YouTube watch history',
          importance: 6,
        });

        results.push({
          title: res.knowledge.title,
          id: res.knowledge.id,
          url,
        });
      }

      return jsonResponse({
        success: true,
        importedCount: results.length,
        videos: results,
      });
    }

    return errorResponse(`Unknown importer type "${importerType}"`, 404);
  } catch (err: any) {
    console.error('Import error:', err);
    return errorResponse(err.message || 'Import processing failed', 500);
  }
}
