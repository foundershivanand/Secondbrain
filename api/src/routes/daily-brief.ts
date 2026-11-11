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
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true' || request.method === 'POST';
    const today = new Date().toISOString().slice(0, 10);
    const cacheKey = `daily_brief_${today}`;

    if (!forceRefresh) {
      const cached = await db.getKV(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          return jsonResponse({
            success: true,
            cached: true,
            report: parsed,
          });
        } catch {}
      }
    }

    const report = await runEvolutionAgent(env, db);
    try {
      await db.setKV(cacheKey, JSON.stringify(report));
    } catch (saveErr) {
      console.warn('Failed to cache daily brief:', saveErr);
    }

    return jsonResponse({
      success: true,
      cached: false,
      report,
    });
  } catch (err: any) {
    console.error('Daily Brief error:', err);
    return errorResponse(`Failed to generate Daily Brief: ${err.message}`, 500);
  }
}
