import React, { useState, useEffect } from 'react';
import {
  Network,
  ArrowRight,
  Sparkles,
  BookOpen,
  Share2,
  FileText,
  Loader2,
} from 'lucide-react';
import { api } from '../services/api';
import { KnowledgeRecord, MapOfContentRecord } from '../types';

export const TopicsGraph: React.FC<{ onSelectTopic: (topic: string) => void }> = ({
  onSelectTopic,
}) => {
  const [knowledge, setKnowledge] = useState<KnowledgeRecord[]>([]);
  const [mocs, setMocs] = useState<MapOfContentRecord[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [isGeneratingMOC, setIsGeneratingMOC] = useState(false);

  useEffect(() => {
    api.getKnowledgeList().then((res) => setKnowledge(res.items || []));
    api.getMOCs().then((res) => setMocs(res.mocs || [])).catch(() => {});
  }, []);

  // Map topics to their notes
  const topicMap = new Map<string, KnowledgeRecord[]>();
  knowledge.forEach((k) => {
    try {
      const topics: string[] = JSON.parse(k.topics || '[]');
      topics.forEach((t) => {
        const existing = topicMap.get(t) || [];
        existing.push(k);
        topicMap.set(t, existing);
      });
    } catch {}
  });

  const topicsList = Array.from(topicMap.entries()).sort((a, b) => b[1].length - a[1].length);

  const handleGenerateMOC = async (topic: string) => {
    setIsGeneratingMOC(true);
    try {
      await api.generateMOC(topic);
      const updated = await api.getMOCs();
      setMocs(updated.mocs || []);
      alert(`✅ MOC generated for [[${topic}]]! Synced to 02 Topics.`);
    } catch (err: any) {
      alert(`Failed to generate MOC: ${err.message}`);
    } finally {
      setIsGeneratingMOC(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            M3 Topic Knowledge Layer
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center space-x-2">
          <Network className="w-6 h-6 text-indigo-400" />
          <span>Topic Knowledge & Maps of Content (MOCs)</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Explore how disparate ideas, videos, and articles interconnect across conceptual clusters and high-level MOCs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Topics Cloud */}
        <div className="md:col-span-1 glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Discovered Topics</span>
            <span className="text-purple-400 font-mono">{topicsList.length}</span>
          </h3>

          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
            {topicsList.map(([topic, notes]) => {
              const hasMoc = mocs.some((m) => m.topic.toLowerCase() === topic.toLowerCase());
              return (
                <button
                  key={topic}
                  onClick={() => setSelectedTopic(topic)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition ${
                    selectedTopic === topic
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 border border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 truncate">
                    {hasMoc && <span className="text-[10px] text-amber-400">🗺️</span>}
                    <span>[[{topic}]]</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950/60 font-mono">
                    {notes.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Topic Details & Connected Notes */}
        <div className="md:col-span-2 space-y-4">
          {selectedTopic ? (
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] text-purple-400 uppercase font-bold tracking-wider">
                    Topic Exploration
                  </span>
                  <h2 className="text-xl font-black text-white mt-0.5">[[{selectedTopic}]]</h2>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleGenerateMOC(selectedTopic)}
                    disabled={isGeneratingMOC}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 text-xs font-bold transition disabled:opacity-50"
                  >
                    {isGeneratingMOC ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generate MOC</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => onSelectTopic(selectedTopic)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow"
                  >
                    <span>Filter Notes</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* MOC Summary if exists */}
              {mocs.find((m) => m.topic.toLowerCase() === selectedTopic.toLowerCase()) && (
                <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-xs space-y-1.5 text-indigo-200">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                    🗺️ Map of Content Active
                  </span>
                  <p>{mocs.find((m) => m.topic.toLowerCase() === selectedTopic.toLowerCase())?.summary}</p>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Associated Knowledge Notes ({topicMap.get(selectedTopic)?.length})
                </h4>

                <div className="space-y-2.5">
                  {topicMap.get(selectedTopic)?.map((k) => (
                    <div
                      key={k.id}
                      className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/40 transition space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-100">{k.title}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-purple-300">
                          {k.id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 italic">"{k.core_idea}"</p>
                      {k.my_thought && (
                        <div className="text-[11px] text-amber-300 bg-amber-950/20 p-2 rounded-lg border border-amber-800/30">
                          <strong className="text-amber-400">My Thought:</strong> {k.my_thought}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800 space-y-3">
              <Share2 className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-300">Select a topic to inspect</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click any topic cluster on the left to trace all atomic ideas, generate Maps of Content (MOCs), and inspect knowledge lineage.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
