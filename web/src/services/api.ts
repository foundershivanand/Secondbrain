import {
  BrainStats,
  BrainState,
  ChatResponse,
  KnowledgeRecord,
  MemoryRecord,
  SourceRecord,
  RelationshipRecord,
  MapOfContentRecord,
  YouTubePlaylistItem,
} from '../types';

export const DEFAULT_WORKER_API = 'https://second-brain-api.fitt.workers.dev';
export const DEFAULT_AUTH_TOKEN = 'secondbrain_dev_secret';

export function getApiBaseUrl(): string {
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const custom = typeof window !== 'undefined' ? localStorage.getItem('sb_api_endpoint') : null;
  if (custom && custom.trim()) {
    const trimmed = custom.trim().replace(/\/+$/, '');
    // Guard against mixed content or localhost on mobile devices
    if (!isLocalhost && (trimmed.includes('localhost') || trimmed.includes('127.0.0.1') || trimmed.startsWith('http://'))) {
      return DEFAULT_WORKER_API;
    }
    return trimmed;
  }

  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) return envUrl.replace(/\/+$/, '');

  // If running in production browser on Cloudflare Pages or mobile PWA, point directly to the deployed Worker API
  if (!isLocalhost) {
    return DEFAULT_WORKER_API;
  }
  return ''; // Default uses relative /api proxied to Worker in local Vite dev
}

export function getAuthHeader(): Record<string, string> {
  const custom = typeof window !== 'undefined' ? localStorage.getItem('sb_auth_token') : null;
  const token = (custom && custom.trim()) ? custom.trim() : DEFAULT_AUTH_TOKEN;
  if (token) return { Authorization: `Bearer ${token}` };
  return {};
}

export const api = {
  async getHealth() {
    const res = await fetch(`${getApiBaseUrl()}/api/health`, {
      headers: getAuthHeader(),
    });
    return res.json();
  },

  async getStats(): Promise<BrainStats> {
    const [statsRes, sourcesRes] = await Promise.all([
      fetch(`${getApiBaseUrl()}/api/stats`, { headers: getAuthHeader() }),
      fetch(`${getApiBaseUrl()}/api/sources?limit=500`, { headers: getAuthHeader() }).catch(() => null),
    ]);
    if (!statsRes.ok) throw new Error('Failed to fetch stats');
    const stats = await statsRes.json();
    if (sourcesRes && sourcesRes.ok) {
      try {
        const sourcesData = await sourcesRes.json();
        const validSources = (sourcesData.sources || []).filter(
          (s: any) =>
            s.raw_storage !== 'terabox' &&
            !s.raw_url?.includes('terabox') &&
            !s.original_url?.includes('terabox') &&
            !s.id?.startsWith('SRC-IMAGES-')
        );
        stats.sourcesCount = validSources.length;
      } catch {}
    }
    return stats;
  },

  async getBrainState(): Promise<BrainState> {
    const res = await fetch(`${getApiBaseUrl()}/api/brain-state`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to fetch brain state');
    return res.json();
  },

  async getExtractionStatus(): Promise<{
    status: 'idle' | 'running' | 'paused';
    currentStream: string;
    imagesExtracted: number;
    totalKnownImages: number;
    videosExtracted: number;
    allImagesDone: boolean;
    canStartVideos: boolean;
    message: string;
  }> {
    return {
      status: 'idle',
      currentStream: 'none',
      imagesExtracted: 0,
      totalKnownImages: 0,
      videosExtracted: 0,
      allImagesDone: true,
      canStartVideos: true,
      message: 'Extraction decommissioned',
    };
  },

  async updateBrainState(state: BrainState): Promise<{ success: boolean }> {
    const res = await fetch(`${getApiBaseUrl()}/api/brain-state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(state),
    });
    if (!res.ok) throw new Error('Failed to update brain state');
    return res.json();
  },

  async capture(payload: {
    source_type?: string;
    title?: string;
    text?: string;
    url?: string;
    raw_storage?: string;
    raw_id?: string;
    raw_file_id?: string;
    raw_message_id?: string;
    channel_id?: string;
    raw_url?: string;
    user_note?: string;
    importance?: number;
    priority?: string;
    base64_data?: string;
    mime_type?: string;
    video_frames?: string[];
  }) {
    const res = await fetch(`${getApiBaseUrl()}/api/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Capture failed' }));
      throw new Error(err.error || 'Capture failed');
    }
    return res.json();
  },

  async chat(query: string): Promise<ChatResponse> {
    const res = await fetch(`${getApiBaseUrl()}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Chat failed' }));
      throw new Error(err.error || 'Chat failed');
    }
    return res.json();
  },

  async search(q: string) {
    const res = await fetch(`${getApiBaseUrl()}/api/search?q=${encodeURIComponent(q)}`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Search failed');
    return res.json();
  },

  async getKnowledgeList(topic?: string, limit: number = 100): Promise<{ items: KnowledgeRecord[]; count: number }> {
    const params = new URLSearchParams();
    if (topic) params.set('topic', topic);
    if (limit) params.set('limit', String(limit));
    const url = `${getApiBaseUrl()}/api/knowledge?${params.toString()}`;
    const res = await fetch(url, { headers: getAuthHeader() });
    if (!res.ok) throw new Error('Failed to fetch knowledge list');
    return res.json();
  },

  async getKnowledgeDetail(id: string): Promise<KnowledgeRecord> {
    const res = await fetch(`${getApiBaseUrl()}/api/knowledge/${id}`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to fetch knowledge note');
    return res.json();
  },

  async deleteKnowledge(id: string) {
    const res = await fetch(`${getApiBaseUrl()}/api/knowledge/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    return res.json();
  },

  async getSourcesList(): Promise<{ sources: SourceRecord[]; count: number }> {
    const res = await fetch(`${getApiBaseUrl()}/api/sources?limit=500`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to fetch sources');
    const data = await res.json();
    const validSources = (data.sources || []).filter(
      (s: SourceRecord) =>
        s.raw_storage !== 'terabox' &&
        !s.raw_url?.includes('terabox') &&
        !s.original_url?.includes('terabox') &&
        !s.id?.startsWith('SRC-IMAGES-')
    );
    return { sources: validSources, count: validSources.length };
  },

  async getMemoriesList(status?: string): Promise<{ memories: MemoryRecord[]; count: number }> {
    const url = status
      ? `${getApiBaseUrl()}/api/memories?status=${status}`
      : `${getApiBaseUrl()}/api/memories`;
    const res = await fetch(url, { headers: getAuthHeader() });
    if (!res.ok) throw new Error('Failed to fetch memories');
    return res.json();
  },

  async promoteMemory(id: string) {
    const res = await fetch(`${getApiBaseUrl()}/api/memories/${id}/promote`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return res.json();
  },

  async rejectMemory(id: string) {
    const res = await fetch(`${getApiBaseUrl()}/api/memories/${id}/reject`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return res.json();
  },

  async runConsolidation() {
    const res = await fetch(`${getApiBaseUrl()}/api/memories/consolidate`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Consolidation failed' }));
      throw new Error(err.error || 'Consolidation failed');
    }
    return res.json();
  },

  async getMOCs(): Promise<{ mocs: MapOfContentRecord[] }> {
    const res = await fetch(`${getApiBaseUrl()}/api/mocs`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to fetch MOCs');
    return res.json();
  },

  async generateMOC(topic: string): Promise<{ success: boolean; moc: MapOfContentRecord }> {
    const res = await fetch(`${getApiBaseUrl()}/api/mocs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ topic }),
    });
    if (!res.ok) throw new Error('Failed to generate MOC');
    return res.json();
  },

  async getDailyBrief(): Promise<{ success: boolean; report: any }> {
    const res = await fetch(`${getApiBaseUrl()}/api/daily-brief`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to fetch daily brief');
    return res.json();
  },

  async importManifest(items: any[]): Promise<any> {
    const res = await fetch(`${getApiBaseUrl()}/api/manifest/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(items),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Manifest import failed' }));
      throw new Error(err.error || 'Manifest import failed');
    }
    return res.json();
  },

  async importChatExport(conversations: any) {
    const res = await fetch(`${getApiBaseUrl()}/api/import/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(conversations),
    });
    if (!res.ok) throw new Error('Chat import failed');
    return res.json();
  },

  async importYoutubeHistory(history: any) {
    const res = await fetch(`${getApiBaseUrl()}/api/import/youtube-history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(history),
    });
    if (!res.ok) throw new Error('YouTube import failed');
    return res.json();
  },

  async exportVaultManifest() {
    const res = await fetch(`${getApiBaseUrl()}/api/export/vault`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Vault export failed');
    return res.json();
  },

  getMarkdownDownloadUrl(id: string): string {
    return `${getApiBaseUrl()}/api/export/markdown/${id}`;
  },

  async getSyncStatus(): Promise<{
    configured: boolean;
    owner?: string | null;
    repo?: string;
    branch?: string;
  }> {
    const res = await fetch(`${getApiBaseUrl()}/api/sync/status`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to get sync status');
    return res.json();
  },

  async triggerSyncAll(): Promise<{
    success: boolean;
    total: number;
    successful: number;
    message: string;
  }> {
    const res = await fetch(`${getApiBaseUrl()}/api/sync/all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Sync failed' }));
      throw new Error(err.error || 'Sync failed');
    }
    return res.json();
  },

  async getYoutubeSyncStatus(): Promise<{
    connected: boolean;
    mode: 'oauth' | 'playlist' | 'none';
    oauthConfigured: boolean;
    hasRefreshToken: boolean;
    playlistId: string | null;
    hasApiKey: boolean;
    lastSync: {
      lastSyncAt: string;
      totalFound: number;
      newIngested: number;
      skippedCount: number;
      playlistsSynced?: number;
      mode: string;
    } | null;
    totalSyncedCount: number;
    playlistsCount?: number;
    playlists?: YouTubePlaylistItem[];
  }> {
    const res = await fetch(`${getApiBaseUrl()}/api/youtube/status`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to get YouTube sync status');
    return res.json();
  },

  async getYoutubePlaylists(): Promise<{
    success: boolean;
    count: number;
    playlists: YouTubePlaylistItem[];
  }> {
    const res = await fetch(`${getApiBaseUrl()}/api/youtube/playlists`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to get YouTube playlists');
    return res.json();
  },

  async triggerYoutubeSync(options?: {
    playlistId?: string;
    limit?: number;
    target?: 'liked' | 'playlists' | 'all';
  }): Promise<{
    success: boolean;
    mode: string;
    totalFound: number;
    newIngested: number;
    skippedCount: number;
    playlistsSynced?: number;
    syncedNotes: Array<{ title: string; id: string; url: string; core_idea?: string }>;
    message: string;
  }> {
    const res = await fetch(`${getApiBaseUrl()}/api/youtube/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({
        playlist_id: options?.playlistId,
        limit: options?.limit || 25,
        target: options?.target || 'all',
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'YouTube sync failed' }));
      throw new Error(err.error || err.message || 'YouTube sync failed');
    }
    return res.json();
  },

  async configureYoutubeSync(config: {
    client_id?: string;
    client_secret?: string;
    playlist_id?: string;
    refresh_token?: string;
  }): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${getApiBaseUrl()}/api/youtube/configure`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Configuration failed' }));
      throw new Error(err.error || 'Configuration failed');
    }
    return res.json();
  },
};
