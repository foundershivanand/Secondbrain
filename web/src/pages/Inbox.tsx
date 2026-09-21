import React, { useState, useEffect } from 'react';
import {
  Inbox as InboxIcon,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Plus,
  FileText,
  Camera,
  Video,
  FileCode,
  Link2,
  Mic,
  HardDrive,
} from 'lucide-react';
import { api } from '../services/api';
import { SourceRecord, SourceStatus } from '../types';

export const Inbox: React.FC<{ onOpenCapture: () => void; onSelectKnowledge?: (id: string) => void }> = ({
  onOpenCapture,
}) => {
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const res = await api.getSourcesList();
      setSources(res.sources || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const filteredSources = sources.filter((s) => {
    if (filter === 'ALL') return true;
    if (filter === 'PROCESSING') return ['RECEIVED', 'QUEUED', 'EXTRACTING', 'ANALYZING', 'CONNECTING', 'INDEXING'].includes(s.status);
    if (filter === 'DONE') return s.status === 'DONE';
    if (filter === 'FAILED') return s.status === 'FAILED';
    return true;
  });

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'screenshot':
      case 'image':
        return <Camera className="w-4 h-4 text-purple-400" />;
      case 'youtube':
      case 'video':
        return <Video className="w-4 h-4 text-rose-400" />;
      case 'pdf':
        return <FileCode className="w-4 h-4 text-indigo-400" />;
      case 'url':
        return <Link2 className="w-4 h-4 text-blue-400" />;
      case 'voice':
        return <Mic className="w-4 h-4 text-amber-400" />;
      case 'raw_pointer':
        return <HardDrive className="w-4 h-4 text-emerald-400" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: SourceStatus) => {
    switch (status) {
      case 'DONE':
        return (
          <span className="flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            <span>PROCESSED</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3 h-3" />
            <span>FAILED</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center space-x-2">
            <InboxIcon className="w-6 h-6 text-purple-400" />
            <span>Universal Ingestion Inbox</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Every text, image, YouTube video, PDF, or Telegram message enters here and is indexed into structured knowledge.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchSources}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Refresh Inbox"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onOpenCapture}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Quick Capture</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
        {[
          { id: 'ALL', label: 'All Ingestions' },
          { id: 'PROCESSING', label: 'In Pipeline' },
          { id: 'DONE', label: 'Completed' },
          { id: 'FAILED', label: 'Needs Review' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === tab.id
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Source Cards List */}
      <div className="space-y-3">
        {filteredSources.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800 space-y-3">
            <InboxIcon className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">Inbox is empty</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Start by capturing thoughts, dropping screenshots, or sharing links to your Telegram bot.
            </p>
            <button
              onClick={onOpenCapture}
              className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold inline-flex items-center space-x-1 mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Capture Your First Idea</span>
            </button>
          </div>
        ) : (
          filteredSources.map((source) => (
            <div
              key={source.id}
              className="glass-panel p-4 rounded-xl border border-slate-800/80 hover:border-purple-500/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start space-x-3">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                  {getSourceIcon(source.source_type)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono font-bold text-purple-400">
                      {source.id}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-500">
                      {source.source_type}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                      <Clock className="w-3 h-3 mr-0.5" />
                      <span>{new Date(source.captured_at).toLocaleTimeString()}</span>
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-100">
                    {source.title || 'Processing untitled capture...'}
                  </h4>
                  {source.raw_url && (
                    <a
                      href={source.raw_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-1 text-[11px] text-purple-400 hover:underline"
                    >
                      <span className="truncate max-w-xs">{source.raw_url}</span>
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end space-x-3 pt-2 sm:pt-0 border-t sm:border-0 border-slate-800">
                <div className="text-right text-[11px] text-slate-400 hidden md:block">
                  <div>Storage: <span className="text-slate-300 font-mono">{source.raw_storage || 'local'}</span></div>
                </div>
                {getStatusBadge(source.status)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
