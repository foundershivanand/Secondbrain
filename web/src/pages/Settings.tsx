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
} from 'lucide-react';
import { api } from '../services/api';

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

  useEffect(() => {
    setApiEndpoint(localStorage.getItem('sb_api_endpoint') || '');
    setAuthToken(localStorage.getItem('sb_auth_token') || '');
    loadSyncStatus();
  }, []);

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
          <SettingsIcon className="w-6 h-6 text-purple-400" />
          <span>Second Brain System Settings</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Configure backend API endpoints, Telegram bot webhooks, data export, and historical chat importers.
        </p>
      </div>

      {/* Cloudflare Worker Connection */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
          <Key className="w-4 h-4 text-purple-400" />
          <span>API Connection & Cloudflare Worker</span>
        </h3>

        <form onSubmit={handleSaveConnection} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Cloudflare Worker URL
            </label>
            <input
              type="url"
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
              placeholder="https://second-brain-api.your-subdomain.workers.dev (leave blank for local dev proxy)"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
            <span className="text-[11px] text-slate-500 block mt-1">
              Default uses relative <code>/api</code> proxied to local Worker.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              API Bearer Token (Optional)
            </label>
            <input
              type="password"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder="AUTH_TOKEN if configured in Cloudflare Secrets"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
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
              className="ml-auto px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow"
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
            <p className="text-[11px] text-slate-500">Supports ChatGPT, Claude, or Gemini exports</p>
            <input
              type="file"
              accept=".json"
              onChange={handleChatExportUpload}
              className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:bg-purple-600 file:text-white hover:file:bg-purple-500 cursor-pointer"
            />
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-200 block">YouTube Watch History (watch-history.json)</span>
            <p className="text-[11px] text-slate-500">Filters learning videos from Google Takeout</p>
            <input
              type="file"
              accept=".json"
              onChange={handleYoutubeHistoryUpload}
              className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:bg-rose-600 file:text-white hover:file:bg-rose-500 cursor-pointer"
            />
          </div>
        </div>

        {importStatus && (
          <div className="p-3 rounded-xl bg-slate-900 border border-purple-500/30 text-xs text-purple-300 font-medium animate-fade-in">
            {importStatus}
          </div>
        )}
      </div>

      {/* Obsidian Vault Sync & Zero-Laptop Cloud Sync */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Cloud className="w-4 h-4 text-purple-400" />
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
                <GitBranch className="w-3 h-3 text-purple-400" />
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
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold transition shadow"
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
            <div className="p-3 rounded-xl bg-slate-900 border border-purple-500/30 text-xs text-purple-300 font-medium">
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
              <span className="font-semibold text-purple-300 block">1. Cloudflare Worker Secrets</span>
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

