import { Env } from '../config';
import { Database } from '../db';
import { runMemoryConsolidationAgent } from '../ai/memory-agent';
import { jsonResponse, errorResponse } from '../utils/response';

export async function handleMemories(
  request: Request,
  env: Env,
  db: Database,
  pathParts: string[]
): Promise<Response> {
  const action = pathParts[0];

  // POST /api/memories/consolidate - Run Memory Consolidation Agent
  if (action === 'consolidate' && request.method === 'POST') {
    try {
      const report = await runMemoryConsolidationAgent(env, db);
      return jsonResponse({
        success: true,
        message: `Consolidation complete: ${report.promotedCount} promoted, ${report.rejectedCount} rejected, ${report.mergedCount} merged.`,
        report,
      });
    } catch (err: any) {
      return errorResponse(`Consolidation failed: ${err.message}`, 500);
    }
  }

  // POST /api/memories/:id/promote or POST /api/memories/:id/reject
  const memoryId = pathParts[0];
  const subAction = pathParts[1];

  if (memoryId && subAction && request.method === 'POST') {
    if (subAction === 'promote') {
      await db.updateMemoryStatus(memoryId, 'DURABLE');
      return jsonResponse({ success: true, message: `Memory ${memoryId} promoted to DURABLE` });
    }
    if (subAction === 'reject') {
      await db.updateMemoryStatus(memoryId, 'REJECTED');
      return jsonResponse({ success: true, message: `Memory ${memoryId} marked REJECTED` });
    }
  }

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || undefined;
    const memories = await db.listMemories(status);
    return jsonResponse({ memories, count: memories.length });
  }

  return errorResponse('Method not allowed', 405);
}
