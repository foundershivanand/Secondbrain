import React, { useState, useEffect } from 'react';
import {
  Database,
  HardDrive,
  ExternalLink,
  ShieldAlert,
  CheckCircle,
  Upload,
  Layers,
  FileCode,
  Loader2,
} from 'lucide-react';
import { api } from '../services/api';
import { SourceRecord } from '../types';

export const SourcesView: React.FC = () => {
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'catalog' | 'manifest'>('catalog');
  const [manifestText, setManifestText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const fetchSources = () => {
    api.getSourcesList().then((res) => setSources(res.sources || []));
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const sampleManifest = [
    {
      raw_id: "RAW-019823",
      filename: "ai-agents-memory-deep-dive.mp4",
      storage: "google_drive",
      url: "https://drive.google.com/file/d/1AbCdEfG_DriveFileId/view",
      size: 450000000,
      priority: "P0",
      title: "AI Agent Memory Architecture",
      summary: "Comprehensive lecture on RAG and decoupling storage from reasoning"
    },
    {
      raw_id: "RAW-019824",
      filename: "saas-onboarding-ux.png",
      storage: "telegram",
      url: "telegram://file/tg-file-98214",
      message_id: "81923",
      size: 1240000,
      priority: "P1",
      title: "Frictionless SaaS Onboarding UX Pattern",
      summary: "Deferred authentication UI pattern"
    },
    {
      raw_id: "RAW-019826",
      filename: "discord-customer-feedback.txt",
      storage: "discord",
      url: "https://discord.com/channels/123/456/789",
      channel_id: "456",
      message_id: "789",
      priority: "P2",
      title: "Community Pain Points on Context Bloat",
      summary: "Pain points reported by developers running out of LLM context"
    }
  ];

  const handleLoadSample = () => {
    setManifestText(JSON.stringify(sampleManifest, null, 2));
  };

  const handleImportManifest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manifestText.trim()) return;

    setIsImporting(true);
    setImportResult(null);
    try {
      const parsed = JSON.parse(manifestText);
      const res = await api.importManifest(parsed);
      setImportResult(res);
      fetchSources();
    } catch (err: any) {
      alert(`Manifest import failed: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const storageStats = sources.reduce((acc, curr) => {
    const s = curr.raw_storage || 'web';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:px-6 py-5 space-y-4 animate-fade-in">
      {/* Minimal Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <Database className="w-5 h-5 text-emerald-400" />
          <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Sources
          </h1>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
            {sources.length}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-medium transition ${
            activeTab === 'catalog'
              ? 'bg-zinc-800 text-white border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span>Catalog ({sources.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('manifest')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-medium transition ${
            activeTab === 'manifest'
              ? 'bg-zinc-800 text-white border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Upload className="w-3.5 h-3.5 text-zinc-400" />
          <span>Import Manifest</span>
        </button>
      </div>

      {activeTab === 'catalog' && (
        <div className="space-y-5">
          {/* Storage Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['google_drive', 'telegram', 'discord', 'local'].map((storageKey) => (
              <div key={storageKey} className="glass-panel p-3.5 rounded-xl border border-zinc-800 text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block truncate">{storageKey}</span>
                <span className="text-lg font-black text-white font-mono">{storageStats[storageKey] || 0}</span>
                <span className="text-[10px] text-zinc-500 block">pointers</span>
              </div>
            ))}
          </div>

          {/* Sources Table */}
          <div className="space-y-2">
            {sources.map((src) => (
              <div
                key={src.id}
                className="glass-panel p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <span className="text-[10px] font-mono font-bold text-amber-400 shrink-0">
                    {src.raw_id || src.id}
                  </span>
                  <div className="truncate">
                    <span className="font-semibold text-zinc-200 block truncate">{src.title}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Priority: <strong className="text-amber-400">{src.priority || 'P1'}</strong> • Status: {src.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-emerald-400 uppercase">
                    {src.raw_storage || 'cloud'}
                  </span>
                  {(src.raw_url || src.original_url) && (
                    <a
                      href={src.raw_url || src.original_url || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
                      title="Open Original Cloud File"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'manifest' && (
        <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <span>Bulk Raw Manifest Ingest</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Paste raw files from your Drive or Telegram catalogs. P0 items are extracted immediately; P1–P4 are queued progressively.
              </p>
            </div>
            <button
              onClick={handleLoadSample}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold underline"
            >
              Load Sample Template
            </button>
          </div>

          <form onSubmit={handleImportManifest} className="space-y-4">
            <textarea
              rows={10}
              required
              value={manifestText}
              onChange={(e) => setManifestText(e.target.value)}
              placeholder='[ { "raw_id": "RAW-001", "filename": "notes.pdf", "storage": "google_drive", "url": "https://...", "priority": "P0" } ]'
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 font-mono text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-white/30"
            />

            {importResult && (
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-300">
                {importResult.message}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isImporting || !manifestText.trim()}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Cataloging Raw Files...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Import Manifest to Second Brain</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
