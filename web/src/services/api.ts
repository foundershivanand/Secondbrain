import {
  BrainStats,
  BrainState,
  ChatResponse,
  KnowledgeRecord,
  MemoryRecord,
  SourceRecord,
  RelationshipRecord,
  MapOfContentRecord,
} from '../types';

export const DEFAULT_WORKER_API = 'https://second-brain-api.fitt.workers.dev';
export const DEFAULT_AUTH_TOKEN = 'secondbrain_dev_secret';

export function getApiBaseUrl(): string {
  const custom = localStorage.getItem('sb_api_endpoint');
  if (custom && custom.trim()) return custom.replace(/\/+$/, '');
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) return envUrl.replace(/\/+$/, '');

  // If running in production browser on Cloudflare Pages or mobile PWA, point directly to the deployed Worker API
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return DEFAULT_WORKER_API;
  }
  return ''; // Default uses relative /api proxied to Worker in local Vite dev
}

export function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('sb_auth_token') || DEFAULT_AUTH_TOKEN;
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
    const res = await fetch(`${getApiBaseUrl()}/api/stats`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  async getBrainState(): Promise<BrainState> {
    const res = await fetch(`${getApiBaseUrl()}/api/brain-state`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to fetch brain state');
    return res.json();
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

  async getKnowledgeList(topic?: string): Promise<{ items: KnowledgeRecord[]; count: number }> {
    const url = topic
      ? `${getApiBaseUrl()}/api/knowledge?topic=${encodeURIComponent(topic)}`
      : `${getApiBaseUrl()}/api/knowledge`;
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
    const res = await fetch(`${getApiBaseUrl()}/api/sources`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to fetch sources');
    return res.json();
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
    mode: 'oauth_liked' | 'playlist' | 'none';
    oauthConfigured: boolean;
    hasRefreshToken: boolean;
    playlistId: string | null;
    hasApiKey: boolean;
    lastSync: {
      lastSyncAt: string;
      totalFound: number;
      newIngested: number;
      skippedCount: number;
      mode: string;
    } | null;
    totalSyncedCount: number;
  }> {
    const res = await fetch(`${getApiBaseUrl()}/api/youtube/status`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to get YouTube sync status');
    return res.json();
  },

  async triggerYoutubeSync(playlistId?: string, limit: number = 10): Promise<{
    success: boolean;
    mode: string;
    totalFound: number;
    newIngested: number;
    skippedCount: number;
    syncedNotes: Array<{ title: string; id: string; url: string; core_idea?: string }>;
    message: string;
  }> {
    const res = await fetch(`${getApiBaseUrl()}/api/youtube/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ playlist_id: playlistId, limit }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'YouTube sync failed' }));
      throw new Error(err.error || err.message || 'YouTube sync failed');
    }
    return res.json();
  },

  async configureYoutubeSync(config: { playlist_id?: string; refresh_token?: string }): Promise<{ success: boolean; message: string }> {
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
