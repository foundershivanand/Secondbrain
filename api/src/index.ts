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
import { handleBrainState } from './routes/brain-state';
import { handleMOCs } from './routes/mocs';
import { handleManifestImport } from './routes/manifest';
import { handleDailyBrief } from './routes/daily-brief';
import { handleSync } from './routes/sync';
import { handleYouTubeRoutes, syncYouTubeVideos } from './routes/youtube-sync';
import { handleExtraction } from './routes/extraction';
import { runMemoryConsolidationAgent } from './ai/memory-agent';
import { runEvolutionAgent } from './ai/evolution-agent';
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
    if (pathname === '/' || pathname === '/health' || pathname === '/healthz' || pathname === '/api/health') {
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

    // 4. Public OAuth Handlers (Google YouTube OAuth redirect & callback)
    if (pathname === '/api/youtube/auth' || pathname === '/api/youtube/callback') {
      const pathParts = pathname.replace(/^\/api\/youtube\/?/, '').split('/').filter(Boolean);
      return await handleYouTubeRoutes(request, env, db, pathParts);
    }

    // 5. Authentication Check for API routes (if env.AUTH_TOKEN is configured)
    if (!verifyAuth(request, env)) {
      return errorResponse('Unauthorized: Invalid or missing API token', 401);
    }

    // 6. Route Dispatcher
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

      if (pathname === '/api/brain-state') {
        return await handleBrainState(request, db);
      }

      if (pathname.startsWith('/api/mocs')) {
        return await handleMOCs(request, env, db);
      }

      if (pathname === '/api/manifest/import') {
        return await handleManifestImport(request, env, db);
      }

      if (pathname.startsWith('/api/daily-brief')) {
        return await handleDailyBrief(request, env, db);
      }

      if (pathname.startsWith('/api/sync')) {
        const pathParts = pathname.replace(/^\/api\/sync\/?/, '').split('/').filter(Boolean);
        if (pathParts[0] === 'youtube') {
          return await handleYouTubeRoutes(request, env, db, ['sync']);
        }
        return await handleSync(request, env, db, pathParts);
      }

      if (pathname.startsWith('/api/extraction')) {
        const pathParts = pathname.replace(/^\/api\/extraction\/?/, '').split('/').filter(Boolean);
        return await handleExtraction(request, db, pathParts);
      }

      if (pathname.startsWith('/api/youtube')) {
        const pathParts = pathname.replace(/^\/api\/youtube\/?/, '').split('/').filter(Boolean);
        return await handleYouTubeRoutes(request, env, db, pathParts);
      }

      return errorResponse(`Endpoint not found: ${pathname}`, 404);
    } catch (err: any) {
      console.error('Unhandled Worker error:', err);
      return errorResponse(err.message || 'Internal Server Error', 500);
    }
  },

  /**
   * Cloudflare Cron Trigger (Nightly Autonomous Intelligence Harnessing)
   * Runs daily at 2:00 AM UTC
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const now = new Date();
    const currentHour = now.getUTCHours();
    const timestamp = now.toISOString();
    console.log(`⏰ [Cron Trigger] Starting Second Brain Scheduled Tasks at ${timestamp} (UTC hour: ${currentHour})`);
    const db = new Database(env.DB);

    // 1. Run Nightly Memory Consolidation Agent (2:00 AM UTC)
    if (currentHour === 2) {
      try {
        const memReport = await runMemoryConsolidationAgent(env, db);
        console.log(`✅ [Memory Agent] Promoted ${memReport.promotedCount} to durable, rejected ${memReport.rejectedCount}.`);
      } catch (err) {
        console.error('❌ [Memory Agent] Failed:', err);
      }

      // 2. Run Nightly Evolution & Discovery Agent (2:00 AM UTC)
      try {
        const evoReport = await runEvolutionAgent(env, db);
        console.log(`✅ [Evolution Agent] Discovered ${evoReport.newConnections.length} new connections and ${evoReport.productOpportunitiesDetected.length} product opportunities.`);
      } catch (err) {
        console.error('❌ [Evolution Agent] Failed:', err);
      }
    }

    // 3. Automated YouTube Liked Videos & Playlist Ingestion (Runs every hour)
    try {
      console.log('🎬 [YouTube Auto-Sync] Checking for newly liked videos or playlist additions...');
      const ytReport = await syncYouTubeVideos(env, db, 10);
      if (ytReport.newIngested > 0) {
        console.log(`✅ [YouTube Auto-Sync] Ingested ${ytReport.newIngested} new videos into Obsidian vault.`);
      }
    } catch (err) {
      console.error('❌ [YouTube Auto-Sync] Failed:', err);
    }
  },
};
