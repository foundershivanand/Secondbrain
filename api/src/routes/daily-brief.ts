import { Env } from '../config';
import { Database } from '../db';
import { runEvolutionAgent } from '../ai/evolution-agent';
import { jsonResponse, errorResponse } from '../utils/response';

export async function handleDailyBrief(
  request: Request,
  env: Env,
  db: Database
): Promise<Response> {
  try {
    const report = await runEvolutionAgent(env, db);
    return jsonResponse({
      success: true,
      report,
    });
  } catch (err: any) {
    console.error('Daily Brief error:', err);
    return errorResponse(`Failed to generate Daily Brief: ${err.message}`, 500);
  }
}
