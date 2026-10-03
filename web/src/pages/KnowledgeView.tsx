import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Copy,
  Check,
  Trash2,
  ChevronDown,
  ChevronRight,
  Layers,
  List,
  Eye,
  X,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { KnowledgeRecord } from '../types';
import {
  CANONICAL_CATEGORIES,
  resolveNoteCategory,
  groupNotesByCategory,
} from '../utils/categories';

function safeJsonArray(val: string | null | undefined): string[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [String(parsed)];
  } catch {
    return val ? [val] : [];
  }
}

interface KnowledgeViewProps {
  onOpenCapture: (type?: any, defaultCategory?: string) => void;
  selectedTopic?: string;
  onClearTopic?: () => void;
  refreshTrigger?: number;
  newNoteItem?: KnowledgeRecord | null;
}

export const KnowledgeView: React.FC<KnowledgeViewProps> = ({
  onOpenCapture,
  selectedTopic,
  onClearTopic,
  refreshTrigger,
  newNoteItem,
}) => {
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [activeNoteModal, setActiveNoteModal] = useState<KnowledgeRecord | null>(null);
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchKnowledge = async () => {
    setLoading(true);
    try {
      if (searchQuery.trim()) {
        const res = await api.search(searchQuery.trim());
        setKnowledgeList(res.results.knowledge || []);
      } else {
        const res = await api.getKnowledgeList(selectedTopic);
        setKnowledgeList(res.items || []);
      }
    } catch (e) {
      console.error('Failed to fetch knowledge:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledge();
  }, [selectedTopic, searchQuery, refreshTrigger]);

  // Instantly prepend new note if captured
  useEffect(() => {
    if (newNoteItem) {
      setKnowledgeList((prev) => {
        if (prev.some((k) => k.id === newNoteItem.id)) return prev;
        return [newNoteItem, ...prev];
      });
    }
  }, [newNoteItem]);

  // Filter notes by search query and active category
  const filteredNotes = useMemo(() => {
    return knowledgeList.filter((note) => {
      if (activeCategory) {
        const cat = resolveNoteCategory(note);
        if (cat.id !== activeCategory) return false;
      }
      return true;
    });
  }, [knowledgeList, activeCategory]);

  // Group notes into canonical categories
  const groupedCategories = useMemo(() => {
    return groupNotesByCategory(filteredNotes);
  }, [filteredNotes]);

  // Calculate counts per category
  const categoryStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const note of knowledgeList) {
      const cat = resolveNoteCategory(note);
      counts.set(cat.id, (counts.get(cat.id) || 0) + 1);
    }
    return CANONICAL_CATEGORIES.map((cat) => ({
      ...cat,
      count: counts.get(cat.id) || 0,
    })).filter((cat) => cat.count > 0);
  }, [knowledgeList]);

  const toggleCategoryCollapse = (catId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const handleCopyMarkdown = async (note: KnowledgeRecord) => {
    try {
      const res = await fetch(api.getMarkdownDownloadUrl(note.id));
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopiedNoteId(note.id);
      setTimeout(() => setCopiedNoteId(null), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteNote = async (note: KnowledgeRecord) => {
    if (confirm(`Delete note "${note.title}"?`)) {
      await api.deleteKnowledge(note.id);
      if (activeNoteModal?.id === note.id) setActiveNoteModal(null);
      setKnowledgeList((prev) => prev.filter((k) => k.id !== note.id));
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-purple-600/15 text-purple-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Notes Vault
              </h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {knowledgeList.length}
              </span>
            </div>
            {selectedTopic && (
              <div className="flex items-center space-x-1.5 text-xs text-purple-300 mt-0.5">
                <span>Topic: #{selectedTopic}</span>
                {onClearTopic && (
                  <button onClick={onClearTopic} className="text-slate-400 hover:text-white underline text-[10px]">
                    (clear)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => onOpenCapture('text', activeCategory || undefined)}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-sm shadow-purple-600/25 transition active:scale-95 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Note</span>
        </button>
      </div>

      {/* Control Bar: Search + View Toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes, insights, concepts..."
            className="w-full bg-slate-900/90 border border-slate-800/80 rounded-xl pl-8 pr-8 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* View Switcher */}
        <div className="flex items-center bg-slate-900/90 border border-slate-800/80 rounded-xl p-0.5 text-xs shrink-0">
          <button
            onClick={() => setViewMode('grouped')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-medium transition ${
              viewMode === 'grouped' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Group by Category"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Categories</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-medium transition ${
              viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Compact List"
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">List</span>
          </button>
        </div>
      </div>

      {/* Category Filter Pills (Horizontal Scroll) */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        <button
          onClick={() => setActiveCategory(null)}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-medium transition whitespace-nowrap shrink-0 ${
            activeCategory === null
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-slate-900 border border-slate-800/80 text-slate-400 hover:text-white'
          }`}
        >
          <span>All</span>
          <span className="text-[10px] opacity-75 font-mono">({knowledgeList.length})</span>
        </button>

        {categoryStats.map((cat) => {
          const isSelected = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(isSelected ? null : cat.id)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg font-medium transition whitespace-nowrap shrink-0 ${
                isSelected
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-900 border border-slate-800/80 text-slate-300 hover:text-white'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
              <span className="text-[10px] text-purple-300 font-mono">({cat.count})</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      {filteredNotes.length === 0 ? (
        <div className="p-10 text-center rounded-2xl border border-slate-800/80 bg-slate-900/40 space-y-2.5">
          <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-xs font-bold text-slate-300">No notes found</h3>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
            {searchQuery || activeCategory
              ? 'No notes match your active category or search filter.'
              : 'Create your first note to start your Second Brain.'}
          </p>
          {(searchQuery || activeCategory) ? (
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory(null);
              }}
              className="px-3 py-1 rounded-lg bg-slate-800 text-purple-300 text-xs font-semibold"
            >
              Clear filter
            </button>
          ) : (
            <button
              onClick={() => onOpenCapture('text')}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold inline-flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Note</span>
            </button>
          )}
        </div>
      ) : viewMode === 'grouped' ? (
        /* MODE 1: GROUPED BY CATEGORY */
        <div className="space-y-4">
          {groupedCategories.map(({ category, count, notes }) => {
            const isCollapsed = collapsedCategories[category.id];

            return (
              <div
                key={category.id}
                className="rounded-xl border border-slate-800/80 bg-slate-900/30 overflow-hidden shadow-sm"
              >
                {/* Category Header */}
                <div
                  onClick={() => toggleCategoryCollapse(category.id)}
                  className="flex items-center justify-between px-3.5 py-2.5 cursor-pointer hover:bg-slate-800/40 select-none transition border-b border-slate-800/60"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-base">{category.icon}</span>
                    <h2 className="text-xs font-bold text-white tracking-tight">{category.name}</h2>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
                      {count}
                    </span>
                  </div>

                  <div className="text-slate-500 hover:text-slate-300">
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {/* Notes List */}
                {!isCollapsed && (
                  <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {notes.map((note) => {
                      const topics = safeJsonArray(note.topics).slice(0, 2);
                      return (
                        <div
                          key={note.id}
                          className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/70 hover:border-purple-500/40 transition flex flex-col justify-between space-y-2 group shadow-sm"
                        >
                          <div>
                            {/* Card Topline */}
                            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                              <span className="font-mono text-purple-400 font-semibold">{note.id}</span>
                              <span>{new Date(note.created_at).toLocaleDateString()}</span>
                            </div>

                            {/* Title */}
                            <h3
                              onClick={() => setActiveNoteModal(note)}
                              className="text-xs font-bold text-white hover:text-purple-300 transition cursor-pointer leading-snug line-clamp-2"
                            >
                              {note.title}
                            </h3>

                            {/* Core Idea snippet */}
                            {note.core_idea && (
                              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                {note.core_idea}
                              </p>
                            )}
                          </div>

                          {/* Footer & Actions */}
                          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-1 flex-wrap">
                              {topics.map((t, idx) => (
                                <span key={idx} className="text-[10px] text-slate-500 font-mono">
                                  #{t}
                                </span>
                              ))}
                            </div>

                            <div className="flex items-center space-x-1 shrink-0">
                              <button
                                onClick={() => setActiveNoteModal(note)}
                                className="p-1 rounded text-slate-400 hover:text-purple-400 transition"
                                title="Read Note"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleCopyMarkdown(note)}
                                className="p-1 rounded text-slate-400 hover:text-white transition"
                                title="Copy Markdown"
                              >
                                {copiedNoteId === note.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => handleDeleteNote(note)}
                                className="p-1 rounded text-slate-400 hover:text-rose-400 transition"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* MODE 2: COMPACT MINIMAL LIST */
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 divide-y divide-slate-800/60 overflow-hidden">
          {filteredNotes.map((note) => {
            const cat = resolveNoteCategory(note);
            return (
              <div
                key={note.id}
                onClick={() => setActiveNoteModal(note)}
                className="px-3.5 py-2.5 hover:bg-slate-800/50 transition cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                  <span className="text-sm shrink-0">{cat.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-white group-hover:text-purple-300 transition truncate">
                        {note.title}
                      </span>
                    </div>
                    {note.core_idea && (
                      <p className="text-[11px] text-slate-400 truncate">
                        {note.core_idea}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-[10px] shrink-0 text-slate-500 font-mono">
                  <span>{new Date(note.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MINIMAL NOTE READER MODAL */}
      {activeNoteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveNoteModal(null);
          }}
        >
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
            {/* Reader Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80 shrink-0">
              <div className="flex items-center space-x-2">
                <span>{resolveNoteCategory(activeNoteModal).icon}</span>
                <span className="text-xs font-semibold text-slate-300">
                  {resolveNoteCategory(activeNoteModal).name}
                </span>
                <span className="text-[10px] font-mono text-purple-400">
                  ({activeNoteModal.id})
                </span>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => handleCopyMarkdown(activeNoteModal)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="Copy Markdown"
                >
                  {copiedNoteId === activeNoteModal.id ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => setActiveNoteModal(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Reader Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs text-slate-200">
              <h2 className="text-base font-bold text-white leading-snug">
                {activeNoteModal.title}
              </h2>

              {/* Core Idea */}
              {activeNoteModal.core_idea && (
                <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-800/40 text-purple-200 leading-relaxed font-medium">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-1">
                    💡 Core Idea
                  </div>
                  <p>{activeNoteModal.core_idea}</p>
                </div>
              )}

              {/* Key Takeaways */}
              {safeJsonArray(activeNoteModal.key_information).length > 0 && (
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                    Key Information
                  </div>
                  <ul className="space-y-1 list-disc pl-4 text-slate-300 leading-relaxed">
                    {safeJsonArray(activeNoteModal.key_information).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Insights */}
              {safeJsonArray(activeNoteModal.insights).length > 0 && (
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                    Insights
                  </div>
                  <div className="space-y-1">
                    {safeJsonArray(activeNoteModal.insights).map((item, i) => (
                      <div key={i} className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action items */}
              {safeJsonArray(activeNoteModal.actionable_items).length > 0 && (
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                    Actionable Items
                  </div>
                  <ul className="space-y-1">
                    {safeJsonArray(activeNoteModal.actionable_items).map((item, i) => (
                      <li key={i} className="flex items-start space-x-1.5">
                        <span className="text-purple-400">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Reader Footer */}
            <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
              <button
                onClick={() => handleDeleteNote(activeNoteModal)}
                className="text-xs text-rose-400 hover:text-rose-300 transition"
              >
                Delete note
              </button>

              <button
                onClick={() => setActiveNoteModal(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
