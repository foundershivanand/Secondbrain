import { Env } from './config';
import { Database } from './db';
import { handleCapture } from './routes/capture';
import { handleTelegramWebhook } from './routes/telegram';
import { handleChat } from './routes/chat';
import { handleSearch } from './routes/search';
import { handleKnowledge, handleStats } from './routes/knowledge';
import { handleMemories } from './routes/memories';
import { handleSources } from './routes/sources';
import { handleImporters } from './routes/importers';
import { handleExport } from './routes/export';
import { runMemoryConsolidationAgent } from './ai/memory-agent';
import { verifyAuth } from './utils/security';
import { handleCorsPreflight, jsonResponse, errorResponse } from './utils/response';

export default {
  /**
   * HTTP Request Handler (Cloudflare Workers)
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // 1. Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCorsPreflight();
    }

    const url = new URL(request.url);
    const pathname = url.pathname;
    const db = new Database(env.DB);

    // 2. Public Health Check & Root
    if (pathname === '/' || pathname === '/api/health') {
      return jsonResponse({
        status: 'online',
        service: 'Second Brain API',
        environment: env.ENVIRONMENT || 'development',
        timestamp: new Date().toISOString(),
      });
    }

    // 3. Telegram Webhook (Protected by Telegram secret header)
    if (pathname === '/api/telegram/webhook') {
      return handleTelegramWebhook(request, env, db);
    }

    // 4. Authentication Check for API routes (if env.AUTH_TOKEN is configured)
    if (!verifyAuth(request, env)) {
      return errorResponse('Unauthorized: Invalid or missing API token', 401);
    }

    // 5. Route Dispatcher
    try {
      if (pathname === '/api/capture') {
        return await handleCapture(request, env, db);
      }

      if (pathname === '/api/chat') {
        return await handleChat(request, env, db);
      }

      if (pathname === '/api/search') {
        return await handleSearch(request, db);
      }

      if (pathname === '/api/stats') {
        return await handleStats(db);
      }

      if (pathname.startsWith('/api/knowledge')) {
        const pathParts = pathname.replace(/^\/api\/knowledge\/?/, '').split('/').filter(Boolean);
        return await handleKnowledge(request, db, pathParts);
      }

      if (pathname.startsWith('/api/memories')) {
        const pathParts = pathname.replace(/^\/api\/memories\/?/, '').split('/').filter(Boolean);
        return await handleMemories(request, env, db, pathParts);
      }

      if (pathname.startsWith('/api/sources')) {
        const pathParts = pathname.replace(/^\/api\/sources\/?/, '').split('/').filter(Boolean);
        return await handleSources(request, db, pathParts);
      }

      if (pathname.startsWith('/api/import')) {
        const pathParts = pathname.replace(/^\/api\/import\/?/, '').split('/').filter(Boolean);
        return await handleImporters(request, env, db, pathParts);
      }

      if (pathname.startsWith('/api/export')) {
        const pathParts = pathname.replace(/^\/api\/export\/?/, '').split('/').filter(Boolean);
        return await handleExport(request, db, pathParts);
      }

      return errorResponse(`Endpoint not found: ${pathname}`, 404);
    } catch (err: any) {
      console.error('Unhandled Worker error:', err);
      return errorResponse(err.message || 'Internal Server Error', 500);
    }
  },

  /**
   * Cloudflare Cron Trigger (Nightly Memory Consolidation Agent)
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('⏰ Running scheduled nightly Memory Consolidation Agent at:', new Date().toISOString());
    const db = new Database(env.DB);
    try {
      const report = await runMemoryConsolidationAgent(env, db);
      console.log(`✅ Nightly consolidation completed: ${report.promotedCount} promoted, ${report.rejectedCount} rejected.`);
    } catch (err) {
      console.error('❌ Scheduled memory consolidation failed:', err);
    }
  },
};
