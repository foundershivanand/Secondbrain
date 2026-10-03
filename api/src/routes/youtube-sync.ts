import { Env } from '../config';
import { Database } from '../db';
import { processIngestion } from '../pipeline/ingestion';
import { jsonResponse, errorResponse } from '../utils/response';

interface YouTubeVideoItem {
  videoId: string;
  title: string;
  channel?: string;
  url: string;
  publishedAt?: string;
}

/**
 * Parse public or unlisted YouTube RSS feed without external dependencies
 */
function parseYouTubeRss(xml: string): YouTubeVideoItem[] {
  const items: YouTubeVideoItem[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const block = match[1];
    const idMatch = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || block.match(/<id>yt:video:([^<]+)<\/id>/);
    const titleMatch = block.match(/<title>([^<]+)<\/title>/) || block.match(/<media:title>([^<]+)<\/media:title>/);
    const authorMatch = block.match(/<author>\s*<name>([^<]+)<\/name>/);
    const publishedMatch = block.match(/<published>([^<]+)<\/published>/);

    if (idMatch && idMatch[1]) {
      const videoId = idMatch[1].trim();
      const title = titleMatch ? titleMatch[1].trim() : `YouTube Video ${videoId}`;
      const channel = authorMatch ? authorMatch[1].trim() : undefined;
      const publishedAt = publishedMatch ? publishedMatch[1].trim() : undefined;

      items.push({
        videoId,
        title,
        channel,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        publishedAt,
      });
    }
  }

  return items;
}

/**
 * Get active OAuth Access Token using stored or configured Refresh Token
 */
async function getOAuthAccessToken(env: Env, db: Database): Promise<string | null> {
  const clientId = env.YOUTUBE_CLIENT_ID;
  const clientSecret = env.YOUTUBE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  // Refresh token from Env or D1 KV
  let refreshToken = env.YOUTUBE_REFRESH_TOKEN;
  if (!refreshToken) {
    const stored = await db.getKV('youtube_oauth_token');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        refreshToken = parsed.refresh_token;
      } catch {}
    }
  }

  if (!refreshToken) {
    return null;
  }

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) {
      console.error('Failed to refresh Google OAuth token:', await res.text());
      return null;
    }

    const data: any = await res.json();
    return data.access_token || null;
  } catch (err) {
    console.error('Error refreshing Google OAuth access token:', err);
    return null;
  }
}

/**
 * Fetch Liked Videos list using OAuth Access Token
 */
async function fetchOAuthLikedVideos(accessToken: string, maxResults: number = 15): Promise<YouTubeVideoItem[]> {
  const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=LL&maxResults=${maxResults}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`YouTube API returned ${res.status}: ${errText}`);
  }

  const data: any = await res.json();
  const items = data.items || [];

  return items.map((item: any) => ({
    videoId: item.snippet?.resourceId?.videoId || item.contentDetails?.videoId,
    title: item.snippet?.title || 'YouTube Video',
    channel: item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle,
    url: `https://www.youtube.com/watch?v=${item.snippet?.resourceId?.videoId || item.contentDetails?.videoId}`,
    publishedAt: item.snippet?.publishedAt,
  })).filter((v: YouTubeVideoItem) => Boolean(v.videoId));
}

/**
 * Fetch Playlist Videos (via API key or RSS fallback)
 */
async function fetchPlaylistVideos(playlistId: string, apiKey?: string, maxResults: number = 15): Promise<YouTubeVideoItem[]> {
  if (apiKey) {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=${maxResults}&key=${apiKey}`;
    const res = await fetch(url);
    if (res.ok) {
      const data: any = await res.json();
      return (data.items || []).map((item: any) => ({
        videoId: item.snippet?.resourceId?.videoId || item.contentDetails?.videoId,
        title: item.snippet?.title || 'YouTube Video',
        channel: item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle,
        url: `https://www.youtube.com/watch?v=${item.snippet?.resourceId?.videoId || item.contentDetails?.videoId}`,
        publishedAt: item.snippet?.publishedAt,
      })).filter((v: YouTubeVideoItem) => Boolean(v.videoId));
    }
  }

  // Zero-auth RSS feed fallback (supports playlist_id or channel_id)
  const param = playlistId.startsWith('UC') ? `channel_id=${playlistId}` : `playlist_id=${playlistId}`;
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?${param}`;
  const rssRes = await fetch(rssUrl);
  if (!rssRes.ok) {
    throw new Error(`Failed to fetch YouTube playlist RSS feed: HTTP ${rssRes.status}`);
  }

  const xmlText = await rssRes.text();
  return parseYouTubeRss(xmlText).slice(0, maxResults);
}

/**
 * Core YouTube Synchronizer: Polls videos, deduplicates against D1, and passes new ones to Gemini & Obsidian
 */
export async function syncYouTubeVideos(
  env: Env,
  db: Database,
  maxVideos: number = 10,
  overridePlaylistId?: string
): Promise<{
  success: boolean;
  totalFound: number;
  newIngested: number;
  skippedCount: number;
  syncedNotes: Array<{ title: string; id: string; url: string; core_idea?: string }>;
  mode: 'oauth_liked' | 'playlist' | 'none';
}> {
  let videos: YouTubeVideoItem[] = [];
  let mode: 'oauth_liked' | 'playlist' | 'none' = 'none';

  // 1. Try Google OAuth for Liked Videos (playlistId = 'LL')
  const accessToken = await getOAuthAccessToken(env, db);
  if (accessToken) {
    try {
      videos = await fetchOAuthLikedVideos(accessToken, maxVideos);
      mode = 'oauth_liked';
    } catch (e) {
      console.warn('Failed to fetch OAuth liked videos, attempting playlist fallback:', e);
    }
  }

  // 2. Fallback to Playlist ID if OAuth not available or returned no items
  if (videos.length === 0) {
    const playlistId = overridePlaylistId || env.YOUTUBE_PLAYLIST_ID || (await db.getKV('youtube_playlist_id'));
    if (playlistId) {
      videos = await fetchPlaylistVideos(playlistId, env.YOUTUBE_API_KEY, maxVideos);
      mode = 'playlist';
    }
  }

  if (videos.length === 0 && mode === 'none') {
    return {
      success: false,
      totalFound: 0,
      newIngested: 0,
      skippedCount: 0,
      syncedNotes: [],
      mode: 'none',
    };
  }

  const syncedNotes: Array<{ title: string; id: string; url: string; core_idea?: string }> = [];
  let skippedCount = 0;

  // Process videos sequentially to respect Gemini rate limits
  for (const video of videos) {
    if (!video.videoId || video.title === 'Private video' || video.title === 'Deleted video') {
      skippedCount++;
      continue;
    }

    // Check if already captured in D1
    const existing = await db.getSourceByUrl(video.url);
    if (existing) {
      skippedCount++;
      continue;
    }

    try {
      console.log(`🎬 [YouTube Sync] Ingesting: ${video.title} (${video.videoId})`);
      const result = await processIngestion(env, db, {
        sourceType: 'youtube',
        url: video.url,
        title: video.title,
        userNote: video.channel
          ? `Channel: ${video.channel} (Auto-synced from YouTube Liked Videos)`
          : 'Auto-synced from YouTube Liked Videos',
        importance: 7,
      });

      if (!result.isDuplicate) {
        syncedNotes.push({
          title: result.knowledge.title,
          id: result.knowledge.id,
          url: video.url,
          core_idea: result.knowledge.core_idea,
        });
      } else {
        skippedCount++;
      }
    } catch (ingestErr) {
      console.error(`Failed to ingest video ${video.videoId}:`, ingestErr);
    }
  }

  // Save sync state in D1 KV
  const syncState = {
    lastSyncAt: new Date().toISOString(),
    totalFound: videos.length,
    newIngested: syncedNotes.length,
    skippedCount,
    mode,
  };
  await db.setKV('youtube_sync_state', JSON.stringify(syncState));

  return {
    success: true,
    totalFound: videos.length,
    newIngested: syncedNotes.length,
    skippedCount,
    syncedNotes,
    mode,
  };
}

/**
 * Route handler for /api/youtube and /api/sync/youtube
 */
export async function handleYouTubeRoutes(
  request: Request,
  env: Env,
  db: Database,
  pathParts: string[]
): Promise<Response> {
  const action = pathParts[0] || 'status';
  const url = new URL(request.url);

  // 1. GET /api/youtube/status - Check connection & sync state
  if (request.method === 'GET' && action === 'status') {
    const hasClientId = Boolean(env.YOUTUBE_CLIENT_ID && env.YOUTUBE_CLIENT_SECRET);
    const envRefreshToken = Boolean(env.YOUTUBE_REFRESH_TOKEN);
    const dbTokenRaw = await db.getKV('youtube_oauth_token');
    const hasDbToken = Boolean(dbTokenRaw);
    const playlistId = env.YOUTUBE_PLAYLIST_ID || (await db.getKV('youtube_playlist_id')) || null;
    const syncStateRaw = await db.getKV('youtube_sync_state');

    // Count how many youtube sources currently exist in D1
    const stats = await db.listSources(100, 0);
    const youtubeSourcesCount = stats.filter((s) => s.source_type === 'youtube').length;

    return jsonResponse({
      connected: (hasClientId && (envRefreshToken || hasDbToken)) || Boolean(playlistId),
      mode: (hasClientId && (envRefreshToken || hasDbToken)) ? 'oauth_liked' : (playlistId ? 'playlist' : 'none'),
      oauthConfigured: hasClientId,
      hasRefreshToken: envRefreshToken || hasDbToken,
      playlistId,
      hasApiKey: Boolean(env.YOUTUBE_API_KEY),
      lastSync: syncStateRaw ? JSON.parse(syncStateRaw) : null,
      totalSyncedCount: youtubeSourcesCount,
    });
  }

  // 2. GET /api/youtube/auth - Redirect user to Google OAuth Consent Screen
  if (request.method === 'GET' && action === 'auth') {
    const clientId = env.YOUTUBE_CLIENT_ID;
    if (!clientId) {
      return errorResponse('YOUTUBE_CLIENT_ID not configured in Cloudflare environment', 400);
    }

    const redirectUri = `${url.origin}/api/youtube/callback`;
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', clientId);
    googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/youtube.readonly');
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('prompt', 'consent');

    return Response.redirect(googleAuthUrl.toString(), 302);
  }

  // 3. GET /api/youtube/callback - Exchange authorization code for refresh token
  if (request.method === 'GET' && action === 'callback') {
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error || !code) {
      return new Response(`<html><body style="font-family: sans-serif; padding: 2rem; background: #0f172a; color: #f87171;">
        <h2>Google OAuth Authorization Failed</h2>
        <p>${error || 'No authorization code returned from Google.'}</p>
        <a href="/settings" style="color: #c084fc;">Return to Second Brain Settings</a>
      </body></html>`, { headers: { 'Content-Type': 'text/html' } });
    }

    const clientId = env.YOUTUBE_CLIENT_ID;
    const clientSecret = env.YOUTUBE_CLIENT_SECRET;
    const redirectUri = `${url.origin}/api/youtube/callback`;

    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId || '',
          client_secret: clientSecret || '',
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        return new Response(`<html><body style="font-family: sans-serif; padding: 2rem; background: #0f172a; color: #f87171;">
          <h2>Google Token Exchange Failed</h2>
          <pre>${errText}</pre>
        </body></html>`, { headers: { 'Content-Type': 'text/html' } });
      }

      const tokenData: any = await tokenRes.json();
      if (tokenData.refresh_token) {
        await db.setKV('youtube_oauth_token', JSON.stringify({
          refresh_token: tokenData.refresh_token,
          connected_at: new Date().toISOString(),
        }));
      }

      return new Response(`<html>
        <body style="font-family: system-ui, -apple-system, sans-serif; padding: 3rem 1.5rem; background: #0b0f19; color: #e2e8f0; text-align: center;">
          <div style="max-width: 480px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; padding: 2.5rem; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🎉</div>
            <h2 style="color: #c084fc; margin-bottom: 0.75rem;">YouTube Liked Videos Connected!</h2>
            <p style="color: #94a3b8; font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem;">
              Your Second Brain will now continuously fetch newly liked YouTube videos, extract atomic ideas and insights using Gemini, and commit them directly to your Obsidian vault.
            </p>
            <a href="https://second-brain-web-83u.pages.dev/settings" style="display: inline-block; background: #9333ea; color: #ffffff; padding: 0.75rem 1.5rem; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 0.9rem;">
              Open Second Brain Settings
            </a>
          </div>
        </body>
      </html>`, { headers: { 'Content-Type': 'text/html' } });
    } catch (err: any) {
      return errorResponse(`Failed to complete OAuth callback: ${err.message}`, 500);
    }
  }

  // 4. POST /api/youtube/sync or /api/sync/youtube - Trigger sync of Liked / Playlist videos
  if (request.method === 'POST' && (action === 'sync' || action === 'trigger' || !action)) {
    try {
      let body: any = {};
      try {
        body = await request.json();
      } catch {}

      const maxLimit = Math.min(Number(body.limit) || 10, 50);
      const result = await syncYouTubeVideos(env, db, maxLimit, body.playlist_id);

      return jsonResponse({
        success: result.success,
        mode: result.mode,
        totalFound: result.totalFound,
        newIngested: result.newIngested,
        skippedCount: result.skippedCount,
        syncedNotes: result.syncedNotes,
        message: result.mode === 'none'
          ? 'Neither Google OAuth nor YouTube Playlist ID is configured. Please configure credentials in Settings.'
          : `Synced ${result.newIngested} new videos to Obsidian vault (${result.skippedCount} skipped as already indexed).`,
      });
    } catch (syncErr: any) {
      console.error('YouTube sync execution error:', syncErr);
      return errorResponse(`YouTube sync failed: ${syncErr.message}`, 500);
    }
  }

  // 5. POST /api/youtube/configure - Save Playlist ID or custom refresh token
  if (request.method === 'POST' && action === 'configure') {
    try {
      const body: any = await request.json();
      if (body.playlist_id !== undefined) {
        await db.setKV('youtube_playlist_id', body.playlist_id.trim());
      }
      if (body.refresh_token) {
        await db.setKV('youtube_oauth_token', JSON.stringify({
          refresh_token: body.refresh_token.trim(),
          updated_at: new Date().toISOString(),
        }));
      }

      return jsonResponse({
        success: true,
        message: 'YouTube sync configuration updated successfully.',
      });
    } catch (err: any) {
      return errorResponse(err.message, 400);
    }
  }

  return errorResponse(`Action not found: ${action}`, 404);
}
