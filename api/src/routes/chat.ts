import { Env } from '../config';
import { Database } from '../db';
import { answerBrainQuery } from '../pipeline/retrieval';
import { jsonResponse, errorResponse } from '../utils/response';

export async function handleChat(request: Request, env: Env, db: Database): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed. Use POST.', 405);
  }

  try {
    const body: any = await request.json();
    const query = body.query?.trim();

    if (!query) {
      return errorResponse('Missing "query" parameter in request body', 400);
    }

    const response = await answerBrainQuery(env, db, query);
    return jsonResponse(response);
  } catch (err: any) {
    console.error('Chat endpoint error:', err);
    return errorResponse(err.message || 'Chat failed', 500);
  }
}
