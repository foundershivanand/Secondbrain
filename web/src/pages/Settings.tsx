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
} from 'lucide-react';
import { api } from '../services/api';

export const Settings: React.FC = () => {
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  useEffect(() => {
    setApiEndpoint(localStorage.getItem('sb_api_endpoint') || '');
    setAuthToken(localStorage.getItem('sb_auth_token') || '');
  }, []);

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

      {/* Obsidian Vault Sync & Export */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
          <FolderGit2 className="w-4 h-4 text-purple-400" />
          <span>Obsidian Vault Synchronization</span>
        </h3>
        <p className="text-xs text-slate-400">
          Export all generated Markdown notes matching your Obsidian vault structure (<code>00 Inbox</code> through <code>99 System</code>).
        </p>

        <button
          onClick={handleDownloadVault}
          disabled={isExporting}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition shadow"
        >
          <Download className="w-4 h-4" />
          <span>{isExporting ? 'Preparing Vault Export...' : 'Download Complete Vault Manifest (JSON)'}</span>
        </button>
      </div>
    </div>
  );
};
