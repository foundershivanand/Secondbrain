import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Key,
  Send,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Copy,
  Terminal,
  FolderGit2,
  FileJson,
  Cloud,
  RefreshCw,
  GitBranch,
  ExternalLink,
  Video,
  ThumbsUp,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Shield,
  Play,
} from 'lucide-react';
import { api } from '../services/api';
import { YouTubePlaylistItem } from '../types';

export const Settings: React.FC = () => {
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<{
    configured: boolean;
    owner?: string | null;
    repo?: string;
    branch?: string;
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // YouTube Sync & Playlists State
  const [ytStatus, setYtStatus] = useState<any>(null);
  const [playlists, setPlaylists] = useState<YouTubePlaylistItem[]>([]);
  const [isYtSyncing, setIsYtSyncing] = useState(false);
  const [ytSyncMessage, setYtSyncMessage] = useState<string | null>(null);
  const [playlistInput, setPlaylistInput] = useState('');
  const [isSavingPlaylist, setIsSavingPlaylist] = useState(false);
  const [clientIdInput, setClientIdInput] = useState('');
  const [clientSecretInput, setClientSecretInput] = useState('');
  const [isSavingOAuth, setIsSavingOAuth] = useState(false);
  const [showAdvancedYt, setShowAdvancedYt] = useState(false);

  useEffect(() => {
    setApiEndpoint(localStorage.getItem('sb_api_endpoint') || '');
    setAuthToken(localStorage.getItem('sb_auth_token') || '');
    loadSyncStatus();
    loadYtStatus();
  }, []);

  const loadYtStatus = async () => {
    try {
      const status = await api.getYoutubeSyncStatus();
      setYtStatus(status);
      if (status.playlistId) setPlaylistInput(status.playlistId);
      if (status.playlists) setPlaylists(status.playlists);
      const plRes = await api.getYoutubePlaylists().catch(() => null);
      if (plRes && plRes.playlists) {
        setPlaylists(plRes.playlists);
      }
    } catch {}
  };

  const loadSyncStatus = async () => {
    try {
      const status = await api.getSyncStatus();
      setSyncStatus(status);
    } catch {
      // Worker might not be running or offline
    }
  };

  const handleSaveConnection = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('sb_api_endpoint', apiEndpoint.trim());
    localStorage.setItem('sb_auth_token', authToken.trim());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleDownloadVault = async () => {
    setIsExporting(true);
    try {
      const manifest = await api.exportVaultManifest();
      const blob = new Blob([JSON.stringify(manifest, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `second-brain-vault-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(`Export failed: ${e.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleChatExportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('Parsing conversation export...');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const json = JSON.parse(reader.result as string);
        setImportStatus('Extracting durable decisions and reusable concepts with Gemini...');
        const res = await api.importChatExport(json);
        setImportStatus(`✅ Successfully imported ${res.importedCount} high-value notes into Second Brain!`);
      } catch (err: any) {
        setImportStatus(`❌ Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleYoutubeHistoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('Filtering YouTube learning history...');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const json = JSON.parse(reader.result as string);
        setImportStatus('Ingesting prioritized AI and tech videos...');
        const res = await api.importYoutubeHistory(json);
        setImportStatus(`✅ Successfully imported ${res.importedCount} prioritized learning videos!`);
      } catch (err: any) {
        setImportStatus(`❌ Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleSyncLiked = async () => {
    setIsYtSyncing(true);
    setYtSyncMessage('Polling YouTube Liked videos & extracting concepts with Gemini...');
    try {
      const res = await api.triggerYoutubeSync({ target: 'liked', limit: 50 });
      setYtSyncMessage(`✅ ${res.message}`);
      loadYtStatus();
    } catch (err: any) {
      setYtSyncMessage(`❌ YouTube sync error: ${err.message}`);
    } finally {
      setIsYtSyncing(false);
    }
  };

  const handleSyncPlaylists = async () => {
    setIsYtSyncing(true);
    setYtSyncMessage('Syncing user playlists from YouTube profile & ingesting videos...');
    try {
      const res = await api.triggerYoutubeSync({ target: 'playlists', limit: 50 });
      setYtSyncMessage(`✅ ${res.message}`);
      loadYtStatus();
    } catch (err: any) {
      setYtSyncMessage(`❌ Playlist sync error: ${err.message}`);
    } finally {
      setIsYtSyncing(false);
    }
  };

  const handleSyncSinglePlaylist = async (playlistId: string) => {
    setIsYtSyncing(true);
    setYtSyncMessage(`Syncing videos from playlist (${playlistId})...`);
    try {
      const res = await api.triggerYoutubeSync({ playlistId, limit: 25 });
      setYtSyncMessage(`✅ ${res.message}`);
      loadYtStatus();
    } catch (err: any) {
      setYtSyncMessage(`❌ Sync error: ${err.message}`);
    } finally {
      setIsYtSyncing(false);
    }
  };

  const handleSaveOAuthCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientIdInput.trim() || !clientSecretInput.trim()) return;
    setIsSavingOAuth(true);
    try {
      await api.configureYoutubeSync({
        client_id: clientIdInput.trim(),
        client_secret: clientSecretInput.trim(),
      });
      await loadYtStatus();
      setYtSyncMessage('✅ Google OAuth credentials saved! You can now click "Connect Google Account" below.');
      setTimeout(() => setYtSyncMessage(null), 4000);
    } catch (err: any) {
      setYtSyncMessage(`❌ Failed to save credentials: ${err.message}`);
    } finally {
      setIsSavingOAuth(false);
    }
  };

  const handleSavePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPlaylist(true);
    try {
      await api.configureYoutubeSync({ playlist_id: playlistInput });
      await loadYtStatus();
      setYtSyncMessage('✅ Playlist ID updated successfully!');
      setTimeout(() => setYtSyncMessage(null), 3500);
    } catch (err: any) {
      setYtSyncMessage(`❌ Failed to save playlist: ${err.message}`);
    } finally {
      setIsSavingPlaylist(false);
    }
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setSyncMessage('Syncing all vault notes directly to GitHub via Cloudflare Workers...');
    try {
      const res = await api.triggerSyncAll();
      setSyncMessage(`✅ ${res.message}`);
      loadSyncStatus();
    } catch (err: any) {
      setSyncMessage(`❌ Cloud sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white flex items-center space-x-2">
          <SettingsIcon className="w-6 h-6 text-amber-400" />
          <span>Second Brain System Settings</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Configure backend API endpoints, Telegram bot webhooks, data export, and historical chat importers.
        </p>
      </div>

      {/* Cloudflare Worker Connection */}
      <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
          <Key className="w-4 h-4 text-amber-400" />
          <span>API Connection & Cloudflare Worker</span>
        </h3>

        <form onSubmit={handleSaveConnection} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Cloudflare Worker URL
            </label>
            <input
              type="url"
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
              placeholder="https://second-brain-api.your-subdomain.workers.dev (leave blank for local dev proxy)"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-white/30"
            />
            <span className="text-[11px] text-zinc-500 block mt-1">
              Default uses relative <code>/api</code> proxied to local Worker.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              API Bearer Token (Optional)
            </label>
            <input
              type="password"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder="AUTH_TOKEN if configured in Cloudflare Secrets"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-white/30"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {savedSuccess && (
              <span className="text-xs text-emerald-400 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Settings saved successfully!</span>
              </span>
            )}
            <button
              type="submit"
              className="ml-auto px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold transition shadow-sm border border-white/20 active:scale-95"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>

      {/* Telegram Bot Setup */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
          <Send className="w-4 h-4 text-sky-400" />
          <span>Telegram Bot Webhook Setup</span>
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Create a bot via <strong>@BotFather</strong>, then register your Cloudflare Worker webhook with your secret token:
        </p>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
          <code>
            curl -F "url=https://YOUR_WORKER_URL/api/telegram/webhook" \<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-F "secret_token=YOUR_SECRET_TOKEN" \<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook
          </code>
        </div>
      </div>

      {/* Historical Data Importers (Section 15 & 16) */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
          <Upload className="w-4 h-4 text-emerald-400" />
          <span>Historical Importers (ChatGPT / Claude / YouTube)</span>
        </h3>
        <p className="text-xs text-slate-400">
          The system will NOT import 5,000 chats into 5,000 permanent memories. It filters out trivia and imports only durable decisions and reusable concepts.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-200 block">AI Chat Export (conversations.json)</span>
            <p className="text-[11px] text-zinc-500">Supports ChatGPT, Claude, or Gemini exports</p>
            <input
              type="file"
              accept=".json"
              onChange={handleChatExportUpload}
              className="text-xs text-zinc-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:bg-white file:text-zinc-950 hover:file:bg-zinc-200 cursor-pointer font-medium"
            />
          </div>

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
            <span className="text-xs font-bold text-zinc-200 block">YouTube Watch History (watch-history.json)</span>
            <p className="text-[11px] text-zinc-500">Filters learning videos from Google Takeout</p>
            <input
              type="file"
              accept=".json"
              onChange={handleYoutubeHistoryUpload}
              className="text-xs text-zinc-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:bg-rose-600 file:text-white hover:file:bg-rose-500 cursor-pointer font-medium"
            />
          </div>
        </div>

        {importStatus && (
          <div className="p-3 rounded-xl bg-zinc-900 border border-amber-500/25 text-xs text-amber-300 font-medium animate-fade-in">
            {importStatus}
          </div>
        )}
      </div>

      {/* YouTube Profile, Liked Videos & Playlists */}
      <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-6">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Video className="w-4 h-4 text-rose-400" />
            <span>YouTube Profile, Liked Videos &amp; Playlists</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Access and query all your liked videos and profile playlists with AI-extracted core ideas, atomic notes, and architectural takeaways.
          </p>
        </div>

        {/* Status & Quick Sync Actions */}
        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  ytStatus?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="text-xs font-semibold text-zinc-200">
                {ytStatus?.connected
                  ? (ytStatus.mode === 'oauth' || ytStatus.mode === 'oauth_liked'
                      ? 'Connected to YouTube Profile (Liked Videos & Playlists)'
                      : `Connected via Playlist (${ytStatus.playlistId || 'Active'})`)
                  : 'YouTube Sync Not Connected'}
              </span>
            </div>

            <div className="flex items-center space-x-2 text-[11px] font-mono text-zinc-400 bg-zinc-900 px-3 py-1 rounded-lg border border-zinc-800">
              <span>{ytStatus?.totalSyncedCount ?? 0} Videos</span>
              <span>•</span>
              <span className="text-amber-300">{playlists.length || ytStatus?.playlistsCount || 0} Playlists</span>
            </div>
          </div>

          {/* Sync Trigger and Auth Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              onClick={handleSyncLiked}
              disabled={isYtSyncing}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold transition shadow-sm active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isYtSyncing ? 'animate-spin' : ''}`} />
              <span>{isYtSyncing ? 'Syncing...' : 'Sync Liked Videos'}</span>
            </button>

            <button
              onClick={handleSyncPlaylists}
              disabled={isYtSyncing}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-50 text-zinc-950 text-xs font-semibold transition shadow-sm border border-white/20 active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isYtSyncing ? 'animate-spin' : ''}`} />
              <span>{isYtSyncing ? 'Syncing...' : 'Sync Playlists'}</span>
            </button>

            <a
              href={`${apiEndpoint || 'https://second-brain-api.fitt.workers.dev'}/api/youtube/auth`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition border border-zinc-700 active:scale-95"
            >
              <ExternalLink className="w-3.5 h-3.5 text-rose-400" />
              <span>Connect Google Account</span>
            </a>
          </div>

          {/* Direct Playlist ID Syncer (Zero OAuth Required) */}
          <div className="pt-2 border-t border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300">Custom YouTube Playlist ID (Zero-OAuth Alternative)</span>
              <span className="text-[11px] text-zinc-500">Public or unlisted playlists (starts with PL...)</span>
            </div>
            <form onSubmit={handleSavePlaylist} className="flex gap-2">
              <input
                type="text"
                value={playlistInput}
                onChange={(e) => setPlaylistInput(e.target.value)}
                placeholder="e.g. PLrAXtmErZgOdP_8GzqsJ4VSL822rW8n"
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                disabled={isSavingPlaylist || !playlistInput.trim()}
                className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-xs font-bold text-white transition border border-zinc-700 shrink-0"
              >
                {isSavingPlaylist ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => handleSyncSinglePlaylist(playlistInput)}
                disabled={isYtSyncing || !playlistInput.trim()}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-xs font-bold text-white transition shadow shrink-0"
              >
                Sync Now
              </button>
            </form>
          </div>

          {ytSyncMessage && (
            <div className="p-3 rounded-xl bg-zinc-900 border border-amber-500/25 text-xs text-amber-300 font-medium">
              {ytSyncMessage}
            </div>
          )}

          {ytStatus?.lastSync && (
            <div className="text-[11px] text-slate-500 space-y-0.5 pt-1">
              <div>Last Synced: {new Date(ytStatus.lastSync.lastSyncAt).toLocaleString()}</div>
              <div>Mode: {ytStatus.lastSync.mode} &bull; New Notes Added: {ytStatus.lastSync.newIngested} &bull; Already Indexed: {ytStatus.lastSync.skippedCount}</div>
            </div>
          )}
        </div>

        {/* User Playlists List */}
        {playlists.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Profile Playlists ({playlists.length})
              </span>
              <span className="text-[11px] text-slate-500">
                You can ask Brain Chat about any of these playlists
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-200 truncate">
                        {pl.title}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                        {pl.item_count} videos
                      </span>
                    </div>
                    {pl.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        {pl.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-2 pt-0.5">
                      <span className="text-[10px] text-slate-400 capitalize">
                        {pl.privacy_status}
                      </span>
                      <a
                        href={pl.playlist_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center space-x-0.5"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSyncSinglePlaylist(pl.id)}
                    disabled={isYtSyncing}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition text-[11px]"
                    title="Sync videos from this playlist"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collapsible Advanced Configuration */}
        <div className="border-t border-slate-800/80 pt-3">
          <button
            type="button"
            onClick={() => setShowAdvancedYt(!showAdvancedYt)}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-400 hover:text-slate-200 transition py-1"
          >
            <span>Advanced YouTube Configuration (OAuth App, Custom Playlist &amp; Userscript)</span>
            {showAdvancedYt ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvancedYt && (
            <div className="space-y-4 pt-3 animate-fade-in">
              {/* Google OAuth Credentials Form */}
              <form onSubmit={handleSaveOAuthCredentials} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">Google Cloud OAuth Credentials</span>
                  <p className="text-[11px] text-slate-500">
                    Enter your Google Client ID and Secret to enable one-click Google OAuth without CLI.
                  </p>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={clientIdInput}
                    onChange={(e) => setClientIdInput(e.target.value)}
                    placeholder="Google Client ID (e.g. 1234...apps.googleusercontent.com)"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-white/30"
                  />
                  <input
                    type="password"
                    value={clientSecretInput}
                    onChange={(e) => setClientSecretInput(e.target.value)}
                    placeholder="Google Client Secret"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-white/30"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-500">
                    Authorized redirect URI: <code className="text-slate-400">https://second-brain-api.fitt.workers.dev/api/youtube/callback</code>
                  </span>
                  <button
                    type="submit"
                    disabled={isSavingOAuth}
                    className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-50 text-xs font-bold text-zinc-950 transition shadow"
                  >
                    {isSavingOAuth ? 'Saving...' : 'Save Credentials'}
                  </button>
                </div>
              </form>

              {/* Playlist ID Setting Form */}
              <form onSubmit={handleSavePlaylist} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">Custom YouTube Playlist ID (Zero-OAuth Alternative)</span>
                  <p className="text-[11px] text-slate-500">Sync any unlisted or public playlist (starts with PL...)</p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={playlistInput}
                    onChange={(e) => setPlaylistInput(e.target.value)}
                    placeholder="e.g. PLrAXtmErZgOdP_8GzqsJ4VSL822rW8n"
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-rose-500"
                  />
                  <button
                    type="submit"
                    disabled={isSavingPlaylist}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition border border-slate-700"
                  >
                    {isSavingPlaylist ? 'Saving...' : 'Save Playlist'}
                  </button>
                </div>
              </form>

              {/* Desktop Browser Userscript */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
                  <ThumbsUp className="w-3.5 h-3.5 text-rose-400" />
                  <span>Instant Desktop Browser Capture (Userscript)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Install the Second Brain Userscript into <strong>Tampermonkey</strong> in Chrome/Brave. Clicking the YouTube <strong>Like</strong> button automatically extracts ideas and saves them to your vault!
                </p>
                <div className="text-[11px] font-mono text-amber-400 pt-0.5">
                  Script file: <code>scripts/youtube-watcher-userscript.js</code>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Obsidian Vault Sync & Zero-Laptop Cloud Sync */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Cloud className="w-4 h-4 text-amber-400" />
            <span>Autonomous Cloud Vault Sync (Zero-Laptop Dependency)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Your notes, daily intelligence briefs, and durable memories are committed directly from Cloudflare Workers to your private GitHub repository 24/7/365. Your laptop does not need to stay awake or running.
          </p>
        </div>

        {/* Status & Sync Trigger */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  syncStatus?.configured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="text-xs font-semibold text-slate-200">
                {syncStatus?.configured
                  ? 'Cloud Git Sync Active & Connected'
                  : 'GitHub Credentials Not Configured'}
              </span>
            </div>

            {syncStatus?.configured && syncStatus?.owner && (
              <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                <GitBranch className="w-3 h-3 text-amber-400" />
                <span>
                  {syncStatus.owner}/{syncStatus.repo || 'second-brain-vault'} : {syncStatus.branch || 'main'}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-50 text-zinc-950 text-xs font-bold transition shadow"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing to GitHub...' : 'Sync All Knowledge to GitHub Now'}</span>
            </button>

            <button
              onClick={handleDownloadVault}
              disabled={isExporting}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Preparing...' : 'Export JSON Manifest'}</span>
            </button>
          </div>

          {syncMessage && (
            <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/30 text-xs text-amber-300 font-medium">
              {syncMessage}
            </div>
          )}
        </div>

        {/* Step-by-Step Zero-Laptop Setup Instructions */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            How Zero-Laptop Cloud Sync Works
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5">
              <span className="font-semibold text-amber-300 block">1. Cloudflare Worker Secrets</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Add your GitHub Personal Access Token (classic or fine-grained with <code>repo</code> scope) to Cloudflare:
              </p>
              <div className="p-2 rounded bg-black/60 font-mono text-[10px] text-slate-300 space-y-0.5 select-all">
                <div>npx wrangler secret put GITHUB_TOKEN</div>
                <div>npx wrangler secret put GITHUB_OWNER</div>
                <div>npx wrangler secret put GITHUB_REPO</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5">
              <span className="font-semibold text-emerald-300 block">2. Obsidian Mobile &amp; Desktop Setup</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Install the <strong>Obsidian Git</strong> plugin from Community Plugins. Set <em>Auto Pull on startup</em> to <strong>On</strong>.
              </p>
              <p className="text-slate-500 text-[10px] leading-relaxed">
                Whenever you open Obsidian on your phone or PC, your latest captures, MOCs, and daily briefs are pulled immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

