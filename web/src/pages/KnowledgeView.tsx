import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Tag,
  Filter,
  Download,
  Plus,
} from 'lucide-react';
import { api } from '../services/api';
import { KnowledgeRecord } from '../types';
import { KnowledgeCard } from '../components/KnowledgeCard';

export const KnowledgeView: React.FC<{
  onOpenCapture: () => void;
  selectedTopic?: string;
  onClearTopic?: () => void;
}> = ({ onOpenCapture, selectedTopic, onClearTopic }) => {
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTopic, setActiveTopic] = useState<string | undefined>(selectedTopic);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setActiveTopic(selectedTopic);
  }, [selectedTopic]);

  const fetchKnowledge = async () => {
    setLoading(true);
    try {
      if (searchQuery.trim()) {
        const res = await api.search(searchQuery.trim());
        setKnowledgeList(res.results.knowledge || []);
      } else {
        const res = await api.getKnowledgeList(activeTopic);
        setKnowledgeList(res.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledge();
  }, [activeTopic, searchQuery]);

  // Extract all unique topics across notes
  const allTopics = Array.from(
    new Set(
      knowledgeList.flatMap((k) => {
        try {
          return JSON.parse(k.topics || '[]');
        } catch {
          return [];
        }
      })
    )
  ).slice(0, 15);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center space-x-2">
            <BookOpen className="w-6 h-6 text-purple-400" />
            <span>Structured Knowledge Notes</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            M1 Source Summaries & M2 Atomic Ideas formatted as clean Obsidian Markdown.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenCapture}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* Search & Topic Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search core ideas, atomic concepts, topics, or insights..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
          />
        </div>

        {allTopics.length > 0 && (
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-slate-500 font-semibold flex items-center shrink-0 mr-1">
              <Tag className="w-3 h-3 mr-1" />
              <span>Topics:</span>
            </span>
            {activeTopic && (
              <button
                onClick={() => {
                  setActiveTopic(undefined);
                  if (onClearTopic) onClearTopic();
                }}
                className="px-2.5 py-1 rounded-lg bg-purple-600 text-white font-bold text-[11px] shrink-0"
              >
                Clear: {activeTopic} ✕
              </button>
            )}
            {allTopics.map((topic, i) => (
              <button
                key={i}
                onClick={() => setActiveTopic(topic === activeTopic ? undefined : topic)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap ${
                  activeTopic === topic
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                [[{topic}]]
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Knowledge Cards Grid */}
      {knowledgeList.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800 space-y-3">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">No knowledge notes found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || activeTopic
              ? 'Try changing your search keywords or topic filter.'
              : 'Capture text, video links, or screenshots to generate your knowledge notes.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {knowledgeList.map((k) => (
            <KnowledgeCard key={k.id} knowledge={k} onDeleted={fetchKnowledge} />
          ))}
        </div>
      )}
    </div>
  );
};
