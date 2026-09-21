import React, { useState, useEffect } from 'react';
import {
  Database,
  HardDrive,
  ExternalLink,
  ShieldAlert,
  FolderGit2,
  Cloud,
  CheckCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { SourceRecord } from '../types';

export const SourcesView: React.FC = () => {
  const [sources, setSources] = useState<SourceRecord[]>([]);

  useEffect(() => {
    api.getSourcesList().then((res) => setSources(res.sources || []));
  }, []);

  const storageStats = sources.reduce((acc, curr) => {
    const s = curr.raw_storage || 'web';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            M0 Pointer Architecture
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center space-x-2">
          <Database className="w-6 h-6 text-emerald-400" />
          <span>Raw Storage Pointers & Sources</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Raw 100 GB+ media lives in TeraBox, Telegram, Google Drive, or YouTube. Your Second Brain stores only the compressed knowledge and pointers.
        </p>
      </div>

      {/* Architectural Guarantee Box */}
      <div className="p-5 glass-panel rounded-2xl border border-emerald-500/30 bg-emerald-950/15 space-y-2">
        <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
          <CheckCircle className="w-4 h-4" />
          <span>The Zero-Bloat Principle</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Your Cloudflare D1 database (limited to 500 MB on free tier) and your Obsidian vault stay ultra-lean and instant to search. When you need the original 4K video or 500-page PDF, the system resolves the pointer seamlessly.
        </p>
      </div>

      {/* Storage Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {['telegram', 'terabox', 'gdrive', 'youtube', 'web', 'local'].map((storageKey) => (
          <div key={storageKey} className="glass-panel p-4 rounded-xl border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">{storageKey}</span>
            <span className="text-lg font-black text-white font-mono">{storageStats[storageKey] || 0}</span>
            <span className="text-[10px] text-slate-500 block">pointers</span>
          </div>
        ))}
      </div>

      {/* Sources Table */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Registered Source Pointers ({sources.length})
        </h3>

        <div className="space-y-2">
          {sources.map((src) => (
            <div
              key={src.id}
              className="glass-panel p-3.5 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center space-x-3 overflow-hidden">
                <span className="text-[10px] font-mono font-bold text-purple-400 shrink-0">
                  {src.id}
                </span>
                <span className="font-semibold text-slate-200 truncate">{src.title}</span>
              </div>

              <div className="flex items-center space-x-4 shrink-0">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-400">
                  {src.raw_storage || 'web'}
                </span>
                {(src.raw_url || src.original_url) && (
                  <a
                    href={src.raw_url || src.original_url || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-400 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
