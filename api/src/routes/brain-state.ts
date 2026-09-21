import { Database } from '../db';
import { jsonResponse, errorResponse } from '../utils/response';
import { BrainState } from '../types';

export async function handleBrainState(request: Request, db: Database): Promise<Response> {
  if (request.method === 'GET') {
    const state = await db.getBrainState();
    if (!state) {
      return jsonResponse({
        current_goals: [],
        active_projects: [],
        important_preferences: [],
        recent_learning: [],
        current_interests: [],
        open_questions: [],
        recent_decisions: [],
        knowledge_gaps: [],
      });
    }
    return jsonResponse(state);
  }

  if (request.method === 'PUT' || request.method === 'POST') {
    try {
      const body: BrainState = await request.json();
      await db.updateBrainState(body);
      return jsonResponse({ success: true, state: body });
    } catch (err: any) {
      return errorResponse(`Failed to update brain state: ${err.message}`, 400);
    }
  }

  return errorResponse('Method not allowed', 405);
}
