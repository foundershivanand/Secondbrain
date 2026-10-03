import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Layers,
  LayoutGrid,
  List,
  Eye,
  X,
  Calendar,
  Sparkles,
  Tag,
} from 'lucide-react';
import { api } from '../services/api';
import { KnowledgeRecord } from '../types';
import { KnowledgeCard } from '../components/KnowledgeCard';
import {
  CANONICAL_CATEGORIES,
  CategoryDef,
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

export const KnowledgeView: React.FC<{
  onOpenCapture: (type?: any) => void;
  selectedTopic?: string;
  onClearTopic?: () => void;
}> = ({ onOpenCapture, selectedTopic, onClearTopic }) => {
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grouped' | 'list' | 'cards'>('grouped');
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
  }, [selectedTopic, searchQuery]);

  // Filter notes by search query and active category
  const filteredNotes = useMemo(() => {
    return knowledgeList.filter((note) => {
      // Category filter
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

  // Calculate counts per category for the overview header
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
      fetchKnowledge();
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center space-x-2.5">
            <BookOpen className="w-6 h-6 text-purple-400" />
            <span>Structured Knowledge Notes</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Organized into strictly bounded categories with atomic concepts and Obsidian Markdown provenance.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setViewMode('grouped')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                viewMode === 'grouped' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Organize by Category"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">By Category</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                viewMode === 'list' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Compact Minimal List"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Minimal List</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                viewMode === 'cards' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Detailed Cards"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>

          <button
            onClick={() => onOpenCapture('text')}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Note</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search knowledge notes, core ideas, insights, or categories..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category Overview Bar */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none text-xs">
        <button
          onClick={() => setActiveCategory(null)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-medium transition whitespace-nowrap ${
            activeCategory === null
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>All Notes</span>
          <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] font-mono">
            {knowledgeList.length}
          </span>
        </button>

        {categoryStats.map((cat) => {
          const isSelected = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(isSelected ? null : cat.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-medium transition whitespace-nowrap ${
                isSelected
                  ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-400'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] font-mono text-purple-300">
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      {filteredNotes.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800 space-y-3">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">No knowledge notes found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || activeCategory
              ? 'No notes match your active category or search filter.'
              : 'Add your first note or sync YouTube videos to start building your Second Brain.'}
          </p>
          {(searchQuery || activeCategory) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory(null);
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-purple-300"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : viewMode === 'grouped' ? (
        /* MODE 1: GROUPED BY CATEGORY */
        <div className="space-y-6">
          {groupedCategories.map(({ category, count, notes }) => {
            const isCollapsed = collapsedCategories[category.id];

            return (
              <div
                key={category.id}
                className="rounded-2xl border border-slate-800/90 bg-slate-950/60 overflow-hidden shadow-sm transition"
              >
                {/* Category Header */}
                <div
                  onClick={() => toggleCategoryCollapse(category.id)}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-900/40 select-none transition border-b border-slate-800/60"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{category.icon}</span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-sm font-bold text-white tracking-wide">
                          {category.name}
                        </h2>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950/60 text-purple-300 border border-purple-800/40">
                          {count} {count === 1 ? 'note' : 'notes'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-1 rounded-lg text-slate-400 hover:text-white">
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {/* Notes under this Category */}
                {!isCollapsed && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-slate-950/20">
                    {notes.map((note) => {
                      const topics = safeJsonArray(note.topics).slice(0, 3);
                      return (
                        <div
                          key={note.id}
                          className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:bg-slate-900 hover:border-purple-500/40 transition flex flex-col justify-between space-y-3 group shadow-sm"
                        >
                          <div>
                            {/* Card Topline */}
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center space-x-2">
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/40">
                                  {note.id}
                                </span>
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                                  {note.knowledge_type}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500">
                                {new Date(note.created_at).toLocaleDateString()}
                              </span>
                            </div>

                            {/* Title */}
                            <h3
                              onClick={() => setActiveNoteModal(note)}
                              className="text-sm font-bold text-white hover:text-purple-300 transition cursor-pointer leading-snug line-clamp-2"
                            >
                              {note.title}
                            </h3>

                            {/* Core Idea snippet */}
                            {note.core_idea && (
                              <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                                {note.core_idea}
                              </p>
                            )}
                          </div>

                          {/* Footer & Actions */}
                          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-1 flex-wrap gap-1">
                              {topics.map((t, idx) => (
                                <span key={idx} className="text-[10px] text-slate-400 font-mono">
                                  #{t}
                                </span>
                              ))}
                            </div>

                            <div className="flex items-center space-x-1 shrink-0">
                              <button
                                onClick={() => setActiveNoteModal(note)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                title="Quick Read Note"
                              >
                                <Eye className="w-3.5 h-3.5 text-purple-400" />
                              </button>
                              <button
                                onClick={() => handleCopyMarkdown(note)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
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
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition"
                                title="Delete Note"
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
      ) : viewMode === 'list' ? (
        /* MODE 2: COMPACT MINIMAL LIST */
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden divide-y divide-slate-800/60 shadow">
          {filteredNotes.map((note) => {
            const cat = resolveNoteCategory(note);
            return (
              <div
                key={note.id}
                onClick={() => setActiveNoteModal(note)}
                className="p-3 sm:px-4 sm:py-3 hover:bg-slate-800/60 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 group"
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <span className="text-base shrink-0">{cat.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-white group-hover:text-purple-300 transition truncate">
                        {note.title}
                      </span>
                      <span className="hidden md:inline text-[10px] font-mono text-purple-400/80 px-1.5 py-0.2 rounded bg-purple-950/60">
                        {note.id}
                      </span>
                    </div>
                    {note.core_idea && (
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {note.core_idea}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-xs shrink-0 self-end sm:self-center">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                    {cat.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(note.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* MODE 3: FULL DETAILED CARDS */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNotes.map((k) => (
            <KnowledgeCard key={k.id} knowledge={k} onDeleted={fetchKnowledge} />
          ))}
        </div>
      )}

      {/* QUICK READER MODAL */}
      {activeNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/90">
              <div className="flex items-center space-x-2.5">
                <span className="text-xl">
                  {resolveNoteCategory(activeNoteModal).icon}
                </span>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/40">
                      {activeNoteModal.id}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {resolveNoteCategory(activeNoteModal).name}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Created on {new Date(activeNoteModal.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => handleCopyMarkdown(activeNoteModal)}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
                >
                  {copiedNoteId === activeNoteModal.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-purple-400" />
                      <span>Markdown</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setActiveNoteModal(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-200">
              {/* Title */}
              <h2 className="text-base sm:text-lg font-bold text-white leading-snug">
                {activeNoteModal.title}
              </h2>

              {/* Core Idea */}
              {activeNoteModal.core_idea && (
                <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/40 text-purple-200 leading-relaxed font-medium">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-purple-400 mb-1">
                    💡 Core Idea
                  </div>
                  <p>{activeNoteModal.core_idea}</p>
                </div>
              )}

              {/* Key Takeaways */}
              {safeJsonArray(activeNoteModal.key_information).length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                    Key Takeaways
                  </h3>
                  <ul className="space-y-1.5 list-disc pl-4 text-slate-300 leading-relaxed">
                    {safeJsonArray(activeNoteModal.key_information).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Insights */}
              {safeJsonArray(activeNoteModal.insights).length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                    Insights & Patterns
                  </h3>
                  <div className="space-y-1.5">
                    {safeJsonArray(activeNoteModal.insights).map((item, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-300 leading-relaxed">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {safeJsonArray(activeNoteModal.actionable_items).length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                    Action Items
                  </h3>
                  <ul className="space-y-1">
                    {safeJsonArray(activeNoteModal.actionable_items).map((item, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <span className="text-purple-400 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Why Saved & What Changed */}
              {(activeNoteModal.why_saved || activeNoteModal.what_changed) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {activeNoteModal.why_saved && (
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Why Saved
                      </span>
                      <p className="text-slate-300">{activeNoteModal.why_saved}</p>
                    </div>
                  )}
                  {activeNoteModal.what_changed && (
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        What Changed
                      </span>
                      <p className="text-slate-300">{activeNoteModal.what_changed}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-slate-800 bg-slate-950/90 flex justify-between items-center text-xs">
              <button
                onClick={() => handleDeleteNote(activeNoteModal)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-rose-400 hover:bg-rose-950/30 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <button
                onClick={() => setActiveNoteModal(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
