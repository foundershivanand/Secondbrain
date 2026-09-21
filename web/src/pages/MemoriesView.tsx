import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Play,
  Loader2,
  ShieldCheck,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { MemoryRecord } from '../types';

export const MemoriesView: React.FC = () => {
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'DURABLE' | 'CANDIDATE'>('DURABLE');
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [consolidationReport, setConsolidationReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const res = await api.getMemoriesList();
      setMemories(res.memories || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  const durableMemories = memories.filter((m) => m.status === 'DURABLE');
  const candidateMemories = memories.filter((m) => m.status === 'CANDIDATE');

  const handlePromote = async (id: string) => {
    await api.promoteMemory(id);
    fetchMemories();
  };

  const handleReject = async (id: string) => {
    await api.rejectMemory(id);
    fetchMemories();
  };

  const handleRunConsolidation = async () => {
    setIsConsolidating(true);
    setConsolidationReport(null);
    try {
      const res = await api.runConsolidation();
      setConsolidationReport(res.report);
      fetchMemories();
    } catch (err: any) {
      alert(`Consolidation failed: ${err.message}`);
    } finally {
      setIsConsolidating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              M4 Personal Memory Layer
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center space-x-2">
            <Sparkles className="w-6 h-6 text-purple-400" />
            <span>Long-Term Memory & Consolidation</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            The AI does not turn every random note into permanent memory. It consolidates durable facts, preferences, and mental models nightly.
          </p>
        </div>

        <button
          onClick={handleRunConsolidation}
          disabled={isConsolidating}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition disabled:opacity-50"
        >
          {isConsolidating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Consolidating Nightly Agent...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Consolidation Agent</span>
            </>
          )}
        </button>
      </div>

      {/* Consolidation Agent Report */}
      {consolidationReport && (
        <div className="glass-panel p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-xs space-y-2">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Consolidation Report Generated</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="p-2 rounded-lg bg-slate-950/60">
              <span className="text-slate-400 block text-[10px]">Evaluated</span>
              <span className="text-sm font-bold text-white">{consolidationReport.totalEvaluated}</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/60">
              <span className="text-emerald-400 block text-[10px]">Promoted to Durable</span>
              <span className="text-sm font-bold text-emerald-300">+{consolidationReport.promotedCount}</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/60">
              <span className="text-rose-400 block text-[10px]">Rejected / Noise</span>
              <span className="text-sm font-bold text-rose-300">{consolidationReport.rejectedCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('DURABLE')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'DURABLE'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-purple-400" />
          <span>Durable Memories</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
            {durableMemories.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('CANDIDATE')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'CANDIDATE'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-400" />
          <span>Candidate Queue</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
            {candidateMemories.length}
          </span>
        </button>
      </div>

      {/* Memory Cards */}
      <div className="space-y-3">
        {(activeTab === 'DURABLE' ? durableMemories : candidateMemories).length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800 space-y-3">
            <Sparkles className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">
              No {activeTab.toLowerCase()} memories yet
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              As you capture knowledge, high-confidence permanent insights and preferences are queued as candidates and consolidated.
            </p>
          </div>
        ) : (
          (activeTab === 'DURABLE' ? durableMemories : candidateMemories).map((mem) => (
            <div
              key={mem.id}
              className="glass-panel p-4 rounded-xl border border-slate-800/80 hover:border-purple-500/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono font-bold text-purple-400">
                    {mem.id}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Importance: {mem.importance}/10
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(mem.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-100">{mem.content}</p>
                {mem.evidence && (
                  <div className="text-[11px] text-slate-400 italic">
                    Evidence: {mem.evidence}
                  </div>
                )}
              </div>

              {activeTab === 'CANDIDATE' && (
                <div className="flex items-center space-x-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-800">
                  <button
                    onClick={() => handlePromote(mem.id)}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-bold transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Promote</span>
                  </button>
                  <button
                    onClick={() => handleReject(mem.id)}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-500/30 text-xs font-bold transition"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
