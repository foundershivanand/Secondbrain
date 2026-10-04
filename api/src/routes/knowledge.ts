import { Database } from '../db';
import { jsonResponse, errorResponse } from '../utils/response';

export async function handleKnowledge(request: Request, db: Database, pathParts: string[]): Promise<Response> {
  const id = pathParts[0];

  if (request.method === 'GET') {
    if (id) {
      const item = await db.getKnowledgeById(id);
      if (!item) return errorResponse('Knowledge note not found', 404);
      return jsonResponse(item);
    }

    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit')) || 100, 1000);
    const offset = Number(url.searchParams.get('offset')) || 0;
    const topic = url.searchParams.get('topic') || undefined;

    const items = await db.listKnowledge(limit, offset, topic);
    return jsonResponse({ items, count: items.length });
  }

  if (request.method === 'DELETE') {
    if (!id) return errorResponse('Knowledge ID required for deletion', 400);
    await db.deleteKnowledge(id);
    return jsonResponse({ success: true, deletedId: id });
  }

  return errorResponse('Method not allowed', 405);
}

export async function handleStats(db: Database): Promise<Response> {
  const stats = await db.getBrainStats();
  return jsonResponse(stats);
}
