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
  ExternalLink,
  Video,
  Folder,
  FolderOpen,
  Sparkles,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';
import { KnowledgeRecord } from '../types';
import {
  CANONICAL_CATEGORIES,
  resolveNoteCategory,
  groupNotesByCategory,
  CategoryDef,
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
        const res = await api.getKnowledgeList(selectedTopic, 300);
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

  // Prepend newly captured note instantly
  useEffect(() => {
    if (newNoteItem) {
      setKnowledgeList((prev) => {
        if (prev.some((k) => k.id === newNoteItem.id)) return prev;
        return [newNoteItem, ...prev];
      });
    }
  }, [newNoteItem]);

  // Filter notes by active category
  const filteredNotes = useMemo(() => {
    return knowledgeList.filter((note) => {
      if (activeCategory) {
        const cat = resolveNoteCategory(note);
        if (cat.id !== activeCategory) return false;
      }
      return true;
    });
  }, [knowledgeList, activeCategory]);

  // Group notes into categories (with dedicated YouTube folder)
  const groupedCategories = useMemo(() => {
    return groupNotesByCategory(filteredNotes);
  }, [filteredNotes]);

  // Category counts and quick folders
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

  // Dedicated YouTube folder stats
  const youtubeCount = useMemo(() => {
    return knowledgeList.filter((n) => resolveNoteCategory(n).id === 'youtube').length;
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

  const getSourceUrl = (note: KnowledgeRecord): string | null => {
    if (note.markdown_path?.includes('http')) {
      const match = note.markdown_path.match(/https?:\/\/[^\s)]+/);
      if (match) return match[0];
    }
    return null;
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">
      {/* 1. Minimal Overview Header & Quick Stats */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-purple-400" />
                <span>Notes Vault &amp; Folders</span>
              </h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-purple-600/20 text-purple-300 font-bold border border-purple-500/20">
                {knowledgeList.length} Notes
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Minimalist, atomic personal knowledge organized by topic folders.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Quick Filter: YouTube Folder */}
            <button
              onClick={() => setActiveCategory(activeCategory === 'youtube' ? null : 'youtube')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                activeCategory === 'youtube'
                  ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/25'
                  : 'bg-slate-950/80 text-rose-300 border-rose-500/30 hover:bg-rose-950/30'
              }`}
              title="Filter YouTube Folder"
            >
              <span>▶️</span>
              <span>YouTube</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900 font-mono">
                {youtubeCount}
              </span>
            </button>

            {/* Primary Add Note Button */}
            <button
              onClick={() => onOpenCapture('text', activeCategory || undefined)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/25 transition active:scale-95 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Note</span>
            </button>
          </div>
        </div>

        {selectedTopic && (
          <div className="flex items-center space-x-1.5 text-xs text-purple-300 pt-2 border-t border-slate-800/60 mt-3">
            <span>Filtered by Topic: #{selectedTopic}</span>
            {onClearTopic && (
              <button onClick={onClearTopic} className="text-slate-400 hover:text-white underline text-[10px]">
                (clear topic)
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. Control Bar: Search Bar + View Mode Toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes, insights, concepts, or YouTube videos..."
            className="w-full bg-slate-900/90 border border-slate-800/80 rounded-xl pl-8 pr-8 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* View Switcher */}
        <div className="flex items-center bg-slate-900/90 border border-slate-800/80 rounded-xl p-0.5 text-xs shrink-0">
          <button
            onClick={() => setViewMode('grouped')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg font-medium transition ${
              viewMode === 'grouped'
                ? 'bg-purple-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Group by Folders"
          >
            <Folder className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Folders</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg font-medium transition ${
              viewMode === 'list'
                ? 'bg-purple-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Compact List"
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Compact</span>
          </button>
        </div>
      </div>

      {/* 3. Folder Pills Carousel (Horizontally Scrollable) */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        <button
          onClick={() => setActiveCategory(null)}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl font-medium transition whitespace-nowrap shrink-0 text-xs ${
            activeCategory === null
              ? 'bg-purple-600 text-white shadow-sm font-bold'
              : 'bg-slate-900 border border-slate-800/80 text-slate-400 hover:text-white'
          }`}
        >
          <span>All Folders</span>
          <span className="text-[10px] opacity-75 font-mono">({knowledgeList.length})</span>
        </button>

        {categoryStats.map((cat) => {
          const isSelected = activeCategory === cat.id;
          const isYt = cat.id === 'youtube';

          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(isSelected ? null : cat.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-medium transition whitespace-nowrap shrink-0 text-xs border ${
                isSelected
                  ? isYt
                    ? 'bg-rose-600 text-white border-rose-500 font-bold shadow-sm'
                    : 'bg-purple-600 text-white border-purple-500 font-bold shadow-sm'
                  : isYt
                  ? 'bg-slate-900 border-rose-500/30 text-rose-300 hover:bg-slate-800'
                  : 'bg-slate-900 border-slate-800/80 text-slate-300 hover:text-white'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
              <span className={`text-[10px] font-mono ${isSelected ? 'text-white' : isYt ? 'text-rose-400' : 'text-purple-300'}`}>
                ({cat.count})
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. Notes Listing */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500 space-y-2">
          <Sparkles className="w-6 h-6 text-purple-400 mx-auto animate-spin" />
          <p>Loading your Second Brain vault...</p>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="p-10 text-center rounded-2xl border border-slate-800/80 bg-slate-900/40 space-y-3">
          <FolderOpen className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-xs font-bold text-slate-300">
            {activeCategory === 'youtube'
              ? 'No YouTube videos in this folder yet'
              : 'No notes found'}
          </h3>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
            {activeCategory === 'youtube'
              ? 'Paste a YouTube video link via Quick Capture or sync your liked videos in Settings.'
              : searchQuery || activeCategory
              ? 'No notes match your active filter. Try resetting search or select another folder.'
              : 'Create your first note to build your second brain.'}
          </p>
          <div className="flex items-center justify-center space-x-2 pt-1">
            {(searchQuery || activeCategory) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-purple-300 text-xs font-semibold hover:bg-slate-700 transition"
              >
                Clear filter
              </button>
            )}
            <button
              onClick={() => onOpenCapture(activeCategory === 'youtube' ? 'youtube' : 'text', activeCategory || undefined)}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold inline-flex items-center space-x-1 hover:bg-purple-500 transition shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{activeCategory === 'youtube' ? 'Capture YouTube Video' : 'Add Note'}</span>
            </button>
          </div>
        </div>
      ) : viewMode === 'grouped' ? (
        /* MODE 1: ORGANIZED BY FOLDERS */
        <div className="space-y-4">
          {groupedCategories.map(({ category, count, notes }) => {
            const isCollapsed = collapsedCategories[category.id];
            const isYt = category.id === 'youtube';

            return (
              <div
                key={category.id}
                className={`rounded-2xl border transition overflow-hidden shadow-sm ${
                  isYt
                    ? 'border-rose-900/40 bg-gradient-to-b from-rose-950/15 to-slate-900/40'
                    : 'border-slate-800/80 bg-slate-900/30'
                }`}
              >
                {/* Folder Header */}
                <div
                  onClick={() => toggleCategoryCollapse(category.id)}
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-800/40 select-none transition border-b border-slate-800/60"
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="text-lg">{category.icon}</span>
                    <h2 className={`text-xs font-bold tracking-tight ${isYt ? 'text-rose-200' : 'text-white'}`}>
                      {category.name}
                    </h2>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      isYt
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {count} {count === 1 ? 'note' : 'notes'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-slate-500">
                    <span className="text-[11px] hidden sm:inline text-slate-500">
                      {isCollapsed ? 'Click to expand' : 'Collapse'}
                    </span>
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {/* Notes Grid */}
                {!isCollapsed && (
                  <div className="p-3.5 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {notes.map((note) => {
                      const topics = safeJsonArray(note.topics).slice(0, 3);
                      const isNoteYt = isYt || note.knowledge_type === 'youtube';

                      return (
                        <div
                          key={note.id}
                          className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/70 hover:border-purple-500/40 transition flex flex-col justify-between space-y-3 group shadow-sm"
                        >
                          <div className="space-y-1.5">
                            {/* Card Topline: ID, Badge & Date */}
                            <div className="flex items-center justify-between text-[10px] text-slate-500">
                              <span className="font-mono text-purple-400 font-semibold">{note.id}</span>
                              <div className="flex items-center space-x-1.5">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                  isNoteYt
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {isNoteYt ? 'YouTube' : note.knowledge_type}
                                </span>
                                <span>{new Date(note.created_at).toLocaleDateString()}</span>
                              </div>
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
                              <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                                {note.core_idea}
                              </p>
                            )}
                          </div>

                          {/* Footer with Tags and Quick Actions */}
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
                                className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-slate-800 transition"
                                title="Read Note"
                              >
                                <Eye className="w-3.5 h-3.5" />
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
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
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
        /* MODE 2: COMPACT LIST VIEW */
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 divide-y divide-slate-800/60 overflow-hidden shadow-sm">
          {filteredNotes.map((note) => {
            const cat = resolveNoteCategory(note);
            const isYt = cat.id === 'youtube' || note.knowledge_type === 'youtube';

            return (
              <div
                key={note.id}
                onClick={() => setActiveNoteModal(note)}
                className="px-4 py-3 hover:bg-slate-800/50 transition cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <span className="text-base shrink-0">{cat.icon}</span>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-white group-hover:text-purple-300 transition truncate">
                        {note.title}
                      </span>
                      {isYt && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 shrink-0">
                          YouTube
                        </span>
                      )}
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
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-300 transition" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. MINIMAL NOTE READER MODAL */}
      {activeNoteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveNoteModal(null);
          }}
        >
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80 shrink-0">
              <div className="flex items-center space-x-2 min-w-0">
                <span className="text-base">{resolveNoteCategory(activeNoteModal).icon}</span>
                <span className="text-xs font-bold text-slate-300 truncate">
                  {resolveNoteCategory(activeNoteModal).name}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  • {new Date(activeNoteModal.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center space-x-1 shrink-0">
                <button
                  onClick={() => handleCopyMarkdown(activeNoteModal)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white transition"
                  title="Copy Markdown"
                >
                  {copiedNoteId === activeNoteModal.id ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => handleDeleteNote(activeNoteModal)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition"
                  title="Delete Note"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActiveNoteModal(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs leading-relaxed">
              {/* Note Title */}
              <div>
                <h2 className="text-base sm:text-lg font-black text-white leading-snug">
                  {activeNoteModal.title}
                </h2>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-[10px] font-mono text-purple-400 font-semibold">
                    {activeNoteModal.id}
                  </span>
                  {activeNoteModal.knowledge_type === 'youtube' && (
                    <span className="text-[10px] font-bold text-rose-400 flex items-center space-x-1">
                      <span>▶️ YouTube Video</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Core Idea */}
              {activeNoteModal.core_idea && (
                <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-900/30 text-purple-200 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                    Core Breakthrough
                  </div>
                  <p className="text-xs sm:text-sm font-medium leading-relaxed">
                    {activeNoteModal.core_idea}
                  </p>
                </div>
              )}

              {/* User Thoughts */}
              {activeNoteModal.my_thought && (
                <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-900/30 text-indigo-200 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                    My Thoughts (User Note)
                  </div>
                  <p className="text-xs leading-relaxed">
                    {activeNoteModal.my_thought}
                  </p>
                </div>
              )}

              {/* Key Information */}
              {safeJsonArray(activeNoteModal.key_information).length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Key Information
                  </h4>
                  <ul className="space-y-1 pl-4 list-disc text-slate-300">
                    {safeJsonArray(activeNoteModal.key_information).map((item, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actionable Items */}
              {safeJsonArray(activeNoteModal.actionable_items).length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Action Items
                  </h4>
                  <div className="space-y-1">
                    {safeJsonArray(activeNoteModal.actionable_items).map((item, idx) => (
                      <div key={idx} className="flex items-start space-x-2 text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Insights */}
              {safeJsonArray(activeNoteModal.insights).length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    AI Deductions &amp; Insights
                  </h4>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 space-y-1">
                    {safeJsonArray(activeNoteModal.insights).map((item, idx) => (
                      <p key={idx} className="leading-relaxed">
                        &bull; {item}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Why I Saved This */}
              {activeNoteModal.why_saved && (
                <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
                  <span>Context: </span>
                  <span className="text-slate-400 italic">{activeNoteModal.why_saved}</span>
                </div>
              )}

              {/* Topics / Tags */}
              {safeJsonArray(activeNoteModal.topics).length > 0 && (
                <div className="flex items-center space-x-1.5 flex-wrap pt-1">
                  {safeJsonArray(activeNoteModal.topics).map((t, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-400 font-mono"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
              <span className="text-[10px] text-slate-500 font-mono">
                {activeNoteModal.markdown_path || `01 Knowledge/${resolveNoteCategory(activeNoteModal).name}`}
              </span>
              <button
                onClick={() => setActiveNoteModal(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
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
