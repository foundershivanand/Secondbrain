import { Database } from '../db';
import { jsonResponse, errorResponse } from '../utils/response';

export async function handleSources(request: Request, db: Database, pathParts: string[]): Promise<Response> {
  const id = pathParts[0];

  if (id === 'jobs' && request.method === 'GET') {
    const jobs = await db.listJobs();
    return jsonResponse({ jobs });
  }

  if (request.method === 'GET') {
    if (id) {
      const source = await db.getSourceById(id);
      if (!source) return errorResponse('Source not found', 404);
      return jsonResponse(source);
    }

    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit')) || 50;
    const offset = Number(url.searchParams.get('offset')) || 0;
    const sources = await db.listSources(limit, offset);
    return jsonResponse({ sources, count: sources.length });
  }

  if (request.method === 'DELETE') {
    if (!id) {
      return errorResponse('Source ID is required for deletion. Use DELETE /api/sources/:id or DELETE /api/sources/all', 400);
    }
    if (id === 'all') {
      await db.deleteAllSources();
      return jsonResponse({ success: true, message: 'All sources cleared from inbox' });
    }
    await db.deleteSource(id);
    return jsonResponse({ success: true, deletedId: id });
  }

  return errorResponse('Method not allowed', 405);
}
