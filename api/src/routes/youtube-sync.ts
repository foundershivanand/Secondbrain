import { Env } from '../config';
import { Database } from '../db';
import { processIngestion } from '../pipeline/ingestion';
import { jsonResponse, errorResponse } from '../utils/response';

export interface YouTubeVideoItem {
  videoId: string;
  title: string;
  channel?: string;
  url: string;
  publishedAt?: string;
  playlistTitle?: string;
}

export interface YouTubePlaylistItem {
  id: string;
  title: string;
  description: string;
  itemCount: number;
  privacyStatus: string;
  thumbnailUrl?: string;
  playlistUrl: string;
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
 * Get active OAuth Access Token using stored or configured credentials
 */
export async function getOAuthAccessToken(env: Env, db: Database): Promise<string | null> {
  const clientId = env.YOUTUBE_CLIENT_ID || (await db.getKV('youtube_client_id'));
  const clientSecret = env.YOUTUBE_CLIENT_SECRET || (await db.getKV('youtube_client_secret'));

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
 * Fetch ALL Liked Videos using OAuth Access Token with pagination
 */
export async function fetchOAuthLikedVideos(
  accessToken: string,
  maxTotal: number = 200
): Promise<YouTubeVideoItem[]> {
  const allVideos: YouTubeVideoItem[] = [];
  let nextPageToken: string | undefined = undefined;

  // Attempt 1: playlistItems.list with playlistId=LL
  try {
    do {
      const pageSize = Math.min(50, maxTotal - allVideos.length);
      let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=LL&maxResults=${pageSize}`;
      if (nextPageToken) {
        url += `&pageToken=${encodeURIComponent(nextPageToken)}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`YouTube Liked Videos (LL) API response ${res.status}:`, errText);
        break;
      }

      const data: any = await res.json();
      const items = data.items || [];

      for (const item of items) {
        const videoId = item.snippet?.resourceId?.videoId || item.contentDetails?.videoId;
        if (videoId) {
          allVideos.push({
            videoId,
            title: item.snippet?.title || 'YouTube Liked Video',
            channel: item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            publishedAt: item.snippet?.publishedAt,
            playlistTitle: 'Liked Videos',
          });
        }
      }

      nextPageToken = data.nextPageToken;
    } while (nextPageToken && allVideos.length < maxTotal);
  } catch (err) {
    console.warn('Error fetching LL playlist items:', err);
  }

  // Attempt 2: If LL returned no items, try videos.list with myRating=like
  if (allVideos.length === 0) {
    let videoPageToken: string | undefined = undefined;
    try {
      do {
        const pageSize = Math.min(50, maxTotal - allVideos.length);
        let url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&myRating=like&maxResults=${pageSize}`;
        if (videoPageToken) {
          url += `&pageToken=${encodeURIComponent(videoPageToken)}`;
        }

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!res.ok) {
          const errText = await res.text();
          console.warn(`YouTube videos.list (myRating=like) API response ${res.status}:`, errText);
          break;
        }

        const data: any = await res.json();
        const items = data.items || [];

        for (const item of items) {
          const videoId = item.id;
          if (videoId) {
            allVideos.push({
              videoId,
              title: item.snippet?.title || 'YouTube Liked Video',
              channel: item.snippet?.channelTitle,
              url: `https://www.youtube.com/watch?v=${videoId}`,
              publishedAt: item.snippet?.publishedAt,
              playlistTitle: 'Liked Videos',
            });
          }
        }

        videoPageToken = data.nextPageToken;
      } while (videoPageToken && allVideos.length < maxTotal);
    } catch (err) {
      console.warn('Error fetching videos with myRating=like:', err);
    }
  }

  return allVideos;
}

/**
 * Fetch ALL Playlists on user's YouTube profile (mine=true)
 */
export async function fetchUserPlaylists(
  accessToken: string,
  db?: Database
): Promise<YouTubePlaylistItem[]> {
  const playlists: YouTubePlaylistItem[] = [];
  let nextPageToken: string | undefined = undefined;

  do {
    let url = `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails,status&mine=true&maxResults=50`;
    if (nextPageToken) {
      url += `&pageToken=${encodeURIComponent(nextPageToken)}`;
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      console.warn('Failed to fetch user playlists from YouTube API:', await res.text());
      break;
    }

    const data: any = await res.json();
    const items = data.items || [];

    for (const pl of items) {
      const plItem: YouTubePlaylistItem = {
        id: pl.id,
        title: pl.snippet?.title || 'Untitled Playlist',
        description: pl.snippet?.description || '',
        itemCount: pl.contentDetails?.itemCount || 0,
        privacyStatus: pl.status?.privacyStatus || 'public',
        thumbnailUrl: pl.snippet?.thumbnails?.medium?.url || pl.snippet?.thumbnails?.default?.url,
        playlistUrl: `https://www.youtube.com/playlist?list=${pl.id}`,
      };

      playlists.push(plItem);

      if (db) {
        await db.saveYouTubePlaylist(plItem);
      }
    }

    nextPageToken = data.nextPageToken;
  } while (nextPageToken);

  if (db && playlists.length > 0) {
    await db.setKV('youtube_playlists', JSON.stringify(playlists));
  }

  return playlists;
}

/**
 * Fetch Playlist Videos (via API key, OAuth, or RSS fallback)
 */
async function fetchPlaylistVideos(
  rawPlaylistId: string,
  apiKey?: string,
  accessToken?: string | null,
  maxResults: number = 30
): Promise<YouTubeVideoItem[]> {
  let playlistId = rawPlaylistId.trim();
  if (playlistId.includes('list=')) {
    const m = playlistId.match(/list=([a-zA-Z0-9_-]+)/);
    if (m) playlistId = m[1];
  } else if (playlistId.includes('/channel/') || playlistId.includes('/c/') || playlistId.includes('/@')) {
    const m = playlistId.match(/\/(UC[a-zA-Z0-9_-]+)/);
    if (m) playlistId = m[1];
  }

  // If access token available, use authenticated endpoint
  if (accessToken) {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=${Math.min(maxResults, 50)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
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

  // API Key fallback
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
  try {
    const param = playlistId.startsWith('UC') ? `channel_id=${playlistId}` : `playlist_id=${playlistId}`;
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?${param}`;
    const rssRes = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      },
    });
    if (rssRes.ok) {
      const xmlText = await rssRes.text();
      return parseYouTubeRss(xmlText).slice(0, maxResults);
    }
  } catch (err) {
    console.warn(`RSS playlist fetch error for ${playlistId}:`, err);
  }

  return [];
}

/**
 * Core YouTube Synchronizer:
 * Ingests videos into D1 & Gemini knowledge notes with deduplication
 */
export async function syncYouTubeVideos(
  env: Env,
  db: Database,
  maxVideos: number = 25,
  options?: {
    overridePlaylistId?: string;
    target?: 'liked' | 'playlists' | 'all';
  }
): Promise<{
  success: boolean;
  totalFound: number;
  newIngested: number;
  skippedCount: number;
  playlistsSynced?: number;
  syncedNotes: Array<{ title: string; id: string; url: string; core_idea?: string }>;
  mode: 'oauth_liked' | 'oauth_all' | 'playlist' | 'none';
}> {
  let videos: YouTubeVideoItem[] = [];
  let mode: 'oauth_liked' | 'oauth_all' | 'playlist' | 'none' = 'none';
  let playlistsSynced = 0;

  const accessToken = await getOAuthAccessToken(env, db);

  // 1. If connected via OAuth, fetch liked videos and user profile playlists
  if (accessToken) {
    try {
      const target = options?.target || 'all';

      // Always fetch & update profile playlists when OAuth is active
      if (target === 'playlists' || target === 'all') {
        const playlists = await fetchUserPlaylists(accessToken, db);
        playlistsSynced = playlists.length;

        // Fetch videos from the first few playlists
        for (const pl of playlists.slice(0, 5)) {
          if (pl.id && pl.itemCount > 0) {
            const plVideos = await fetchPlaylistVideos(pl.id, env.YOUTUBE_API_KEY, accessToken, 10);
            plVideos.forEach((v) => {
              v.playlistTitle = pl.title;
              videos.push(v);
            });
          }
        }
      }

      if (target === 'liked' || target === 'all') {
        const likedVideos = await fetchOAuthLikedVideos(accessToken, maxVideos);
        videos.push(...likedVideos);
      }

      mode = target === 'all' ? 'oauth_all' : 'oauth_liked';
    } catch (e) {
      console.warn('OAuth YouTube fetch encountered an issue:', e);
    }
  }

  // 2. Playlist ID fallback (manual playlist or zero-OAuth configured)
  if (videos.length === 0) {
    const playlistId = options?.overridePlaylistId || env.YOUTUBE_PLAYLIST_ID || (await db.getKV('youtube_playlist_id'));
    if (playlistId) {
      videos = await fetchPlaylistVideos(playlistId, env.YOUTUBE_API_KEY, accessToken, maxVideos);
      mode = 'playlist';
    }
  }

  if (videos.length === 0 && mode === 'none') {
    return {
      success: false,
      totalFound: 0,
      newIngested: 0,
      skippedCount: 0,
      playlistsSynced: 0,
      syncedNotes: [],
      mode: 'none',
    };
  }

  // Deduplicate against each other in the batch
  const uniqueVideos = new Map<string, YouTubeVideoItem>();
  for (const v of videos) {
    if (v.videoId && !uniqueVideos.has(v.videoId)) {
      uniqueVideos.set(v.videoId, v);
    }
  }

  const syncedNotes: Array<{ title: string; id: string; url: string; core_idea?: string }> = [];
  let skippedCount = 0;

  for (const video of uniqueVideos.values()) {
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
      const provenanceNote = video.playlistTitle
        ? `Playlist: "${video.playlistTitle}" • Channel: ${video.channel || 'YouTube'}`
        : `Channel: ${video.channel || 'YouTube'} (YouTube Liked Video)`;

      const result = await processIngestion(env, db, {
        sourceType: 'youtube',
        url: video.url,
        title: video.title,
        userNote: provenanceNote,
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
    totalFound: uniqueVideos.size,
    newIngested: syncedNotes.length,
    skippedCount,
    playlistsSynced,
    mode,
  };
  await db.setKV('youtube_sync_state', JSON.stringify(syncState));

  return {
    success: true,
    totalFound: uniqueVideos.size,
    newIngested: syncedNotes.length,
    skippedCount,
    playlistsSynced,
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
    const clientId = env.YOUTUBE_CLIENT_ID || (await db.getKV('youtube_client_id'));
    const clientSecret = env.YOUTUBE_CLIENT_SECRET || (await db.getKV('youtube_client_secret'));
    const hasClientId = Boolean(clientId && clientSecret);
    const envRefreshToken = Boolean(env.YOUTUBE_REFRESH_TOKEN);
    const dbTokenRaw = await db.getKV('youtube_oauth_token');
    const hasDbToken = Boolean(dbTokenRaw);
    const playlistId = env.YOUTUBE_PLAYLIST_ID || (await db.getKV('youtube_playlist_id')) || null;
    const syncStateRaw = await db.getKV('youtube_sync_state');

    // Count youtube sources and playlists in D1
    const youtubeSources = await db.getYouTubeSources(100);
    const playlists = await db.listYouTubePlaylists();

    return jsonResponse({
      connected: (hasClientId && (envRefreshToken || hasDbToken)) || Boolean(playlistId),
      mode: (hasClientId && (envRefreshToken || hasDbToken)) ? 'oauth' : (playlistId ? 'playlist' : 'none'),
      oauthConfigured: hasClientId,
      hasRefreshToken: envRefreshToken || hasDbToken,
      playlistId,
      hasApiKey: Boolean(env.YOUTUBE_API_KEY),
      lastSync: syncStateRaw ? JSON.parse(syncStateRaw) : null,
      totalSyncedCount: youtubeSources.length,
      playlistsCount: playlists.length,
      playlists: playlists.slice(0, 10),
    });
  }

  // 2. GET /api/youtube/playlists - Return all playlists on user's YouTube profile
  if (request.method === 'GET' && action === 'playlists') {
    const playlists = await db.listYouTubePlaylists();
    return jsonResponse({
      success: true,
      count: playlists.length,
      playlists,
    });
  }

  // 2b. GET /api/youtube/diagnose - Test YouTube API responses directly
  if (request.method === 'GET' && action === 'diagnose') {
    const accessToken = await getOAuthAccessToken(env, db);
    if (!accessToken) {
      return jsonResponse({ error: 'No OAuth access token available' }, 400);
    }

    const testUrls: Record<string, string> = {
      channel: 'https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&mine=true',
      playlists: 'https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails,status&mine=true&maxResults=50',
      playlist_LL: 'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=LL&maxResults=10',
      videos_liked: 'https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&myRating=like&maxResults=10',
    };

    const results: Record<string, any> = {};
    for (const [key, testUrl] of Object.entries(testUrls)) {
      try {
        const resp = await fetch(testUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const status = resp.status;
        const text = await resp.text();
        let json = null;
        try { json = JSON.parse(text); } catch {}
        results[key] = { status, ok: resp.ok, data: json || text };
      } catch (err: any) {
        results[key] = { error: err.message };
      }
    }

    return jsonResponse({ success: true, results });
  }

  // 3. GET /api/youtube/auth - Redirect user to Google OAuth Consent Screen
  if (request.method === 'GET' && action === 'auth') {
    const clientId = env.YOUTUBE_CLIENT_ID || (await db.getKV('youtube_client_id'));
    if (!clientId) {
      return errorResponse('Google Client ID not configured. Please enter your Client ID in Settings -> YouTube.', 400);
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

  // 4. GET /api/youtube/callback - Exchange authorization code for refresh token
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

    const clientId = env.YOUTUBE_CLIENT_ID || (await db.getKV('youtube_client_id'));
    const clientSecret = env.YOUTUBE_CLIENT_SECRET || (await db.getKV('youtube_client_secret'));
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

      // Immediately fetch user playlists so the bot knows all profile playlists
      if (tokenData.access_token) {
        await fetchUserPlaylists(tokenData.access_token, db).catch(() => {});
      }

      return new Response(`<html>
        <body style="font-family: system-ui, -apple-system, sans-serif; padding: 3rem 1.5rem; background: #0b0f19; color: #e2e8f0; text-align: center;">
          <div style="max-width: 480px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; padding: 2.5rem; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🎉</div>
            <h2 style="color: #c084fc; margin-bottom: 0.75rem;">YouTube Profile Connected!</h2>
            <p style="color: #94a3b8; font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem;">
              Your Second Brain now has full access to your <strong>Liked Videos</strong> and <strong>Playlists</strong>. You can ask your AI bot what videos you watched, query concepts from any playlist, and view all playlists on your profile!
            </p>
            <a href="https://second-brain-web-83u.pages.dev/settings" style="display: inline-block; background: #9333ea; color: #ffffff; padding: 0.75rem 1.5rem; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 0.9rem;">
              Return to Second Brain
            </a>
          </div>
        </body>
      </html>`, { headers: { 'Content-Type': 'text/html' } });
    } catch (err: any) {
      return errorResponse(`Failed to complete OAuth callback: ${err.message}`, 500);
    }
  }

  // 5. POST /api/youtube/sync - Trigger sync of Liked Videos and/or Playlists
  if (request.method === 'POST' && (action === 'sync' || action === 'trigger' || !action)) {
    try {
      let body: any = {};
      try {
        body = await request.json();
      } catch {}

      const maxLimit = Math.min(Number(body.limit) || 25, 200);
      const target = body.target || 'all';

      const result = await syncYouTubeVideos(env, db, maxLimit, {
        overridePlaylistId: body.playlist_id || body.playlistId,
        target,
      });

      return jsonResponse({
        success: result.success,
        mode: result.mode,
        totalFound: result.totalFound,
        newIngested: result.newIngested,
        skippedCount: result.skippedCount,
        playlistsSynced: result.playlistsSynced,
        syncedNotes: result.syncedNotes,
        message: result.mode === 'none'
          ? 'Neither Google OAuth nor YouTube Playlist ID is configured. Please configure in Settings.'
          : `Synced ${result.newIngested} new videos and ${result.playlistsSynced || 0} playlists to your Second Brain.`,
      });
    } catch (syncErr: any) {
      console.error('YouTube sync execution error:', syncErr);
      return errorResponse(`YouTube sync failed: ${syncErr.message}`, 500);
    }
  }

  // 6. POST /api/youtube/import - Direct import of Google Takeout watch-history or playlists JSON
  if (request.method === 'POST' && action === 'import') {
    try {
      const body: any = await request.json();
      const items = Array.isArray(body) ? body : (body.items || body.videos || []);

      if (!Array.isArray(items) || items.length === 0) {
        return errorResponse('Expected JSON array of watched videos or playlists.', 400);
      }

      let importedCount = 0;
      let skippedCount = 0;

      for (const item of items.slice(0, 100)) {
        // Handle Google Takeout watch-history format or simple format
        const title = item.title || item.titleUrl || item.name;
        const url = item.titleUrl || item.url || (item.videoId ? `https://www.youtube.com/watch?v=${item.videoId}` : null);

        if (!url || !url.includes('youtube.com')) {
          skippedCount++;
          continue;
        }

        const existing = await db.getSourceByUrl(url);
        if (existing) {
          skippedCount++;
          continue;
        }

        try {
          const channel = item.subtitles?.[0]?.name || item.channel || item.author;
          await processIngestion(env, db, {
            sourceType: 'youtube',
            url,
            title: title ? title.replace(/^Watched\s+/i, '') : 'YouTube Watch History',
            userNote: channel ? `Channel: ${channel} (Imported Watch History)` : 'Imported YouTube Watch History',
            importance: 6,
          });
          importedCount++;
        } catch {
          skippedCount++;
        }
      }

      return jsonResponse({
        success: true,
        importedCount,
        skippedCount,
        message: `Successfully imported ${importedCount} videos from YouTube history into your Second Brain.`,
      });
    } catch (err: any) {
      return errorResponse(`Import failed: ${err.message}`, 500);
    }
  }

  // 7. POST /api/youtube/configure - Save credentials or custom playlist IDs into D1
  if (request.method === 'POST' && action === 'configure') {
    try {
      const body: any = await request.json();

      if (body.client_id !== undefined) {
        await db.setKV('youtube_client_id', body.client_id.trim());
      }
      if (body.client_secret !== undefined) {
        await db.setKV('youtube_client_secret', body.client_secret.trim());
      }
      if (body.playlist_id !== undefined || body.playlistId !== undefined) {
        const pId = (body.playlist_id !== undefined ? body.playlist_id : body.playlistId || '').trim();
        await db.setKV('youtube_playlist_id', pId);
      }
      if (body.refresh_token) {
        await db.setKV('youtube_oauth_token', JSON.stringify({
          refresh_token: body.refresh_token.trim(),
          updated_at: new Date().toISOString(),
        }));
      }

      return jsonResponse({
        success: true,
        message: 'YouTube configuration saved successfully.',
      });
    } catch (err: any) {
      return errorResponse(err.message, 400);
    }
  }

  return errorResponse(`Action not found: ${action}`, 404);
}
