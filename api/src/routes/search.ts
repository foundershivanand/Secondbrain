import { Database } from '../db';
import { jsonResponse, errorResponse } from '../utils/response';

export async function handleSearch(request: Request, db: Database): Promise<Response> {
  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.trim() || '';

  if (!query) {
    return errorResponse('Search query "q" parameter is required', 400);
  }

  try {
    const knowledge = await db.searchKnowledge(query, 15);
    const atomic = await db.searchAtomicKnowledge(query, 20);
    const memories = await db.listMemories();
    const matchedMemories = memories.filter((m) =>
      m.content.toLowerCase().includes(query.toLowerCase())
    );

    return jsonResponse({
      query,
      results: {
        knowledge,
        atomic_knowledge: atomic,
        memories: matchedMemories,
      },
      counts: {
        knowledge: knowledge.length,
        atomic: atomic.length,
        memories: matchedMemories.length,
      },
    });
  } catch (err: any) {
    console.error('Search endpoint error:', err);
    return errorResponse(err.message || 'Search failed', 500);
  }
}
