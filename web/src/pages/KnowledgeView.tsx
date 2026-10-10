import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Copy,
  Check,
  Trash2,
  LayoutGrid,
  List,
  Eye,
  X,
  ExternalLink,
  Film,
  Video,
  Mic,
  Sparkles,
  CheckCircle2,
  FolderOpen,
} from 'lucide-react';
import { api } from '../services/api';
import { KnowledgeRecord } from '../types';
import {
  CANONICAL_CATEGORIES,
  resolveNoteCategory,
  groupNotesByCategory,
} from '../utils/categories';
import { KnowledgeCard } from '../components/KnowledgeCard';

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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

  // Category counts
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
      return match ? match[0] : null;
    }
    return null;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-4 animate-fade-in">
      {/* 1. Minimal Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Notes
          </h1>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
            {filteredNotes.length}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs transition ${
                viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs transition ${
                viewMode === 'list' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => onOpenCapture('reel')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-800 transition active:scale-95"
          >
            <Film className="w-3.5 h-3.5 text-emerald-400" />
            <span>Reel</span>
          </button>

          <button
            onClick={() => onOpenCapture('text')}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold shadow-sm transition active:scale-95 border border-emerald-400/30"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* 2. Minimal Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search notes..."
          className="w-full glass-input rounded-xl pl-9 pr-9 py-2 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 3. Category Filter Pills */}
      <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none pb-1">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-150 ${
            activeCategory === null
              ? 'bg-emerald-500 text-zinc-950 font-semibold shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800'
          }`}
        >
          All ({knowledgeList.length})
        </button>

        {categoryStats.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-150 ${
              activeCategory === cat.id
                ? 'bg-emerald-500 text-zinc-950 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
            <span className="text-[10px] opacity-75 font-mono">({cat.count})</span>
          </button>
        ))}
      </div>

      {/* 4. Notes Feed */}
      {loading ? (
        <div className="p-16 text-center text-xs text-amber-300 space-y-2">
          <Sparkles className="w-5 h-5 animate-spin mx-auto text-amber-400" />
          <p>Loading knowledge notes...</p>
        </div>
      ) : filteredNotes.length === 0 ? (
        /* Minimal Empty State */
        <div className="p-12 sm:p-16 rounded-3xl border border-white/[0.06] bg-zinc-900/20 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white">Your Second Brain is ready</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              No notes yet. Capture a 1-3 minute Instagram reel, link, screenshot, or write your first insight.
            </p>
          </div>
          <div className="flex items-center justify-center space-x-2 pt-2">
            <button
              onClick={() => onOpenCapture('reel')}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/20 transition active:scale-95"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Capture Reel</span>
            </button>
            <button
              onClick={() => onOpenCapture('text')}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold shadow-sm transition active:scale-95 border border-white/20"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>New Note</span>
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID MODE */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {filteredNotes.map((note) => (
            <KnowledgeCard
              key={note.id}
              knowledge={note}
              onDeleted={fetchKnowledge}
              onOpenModal={setActiveNoteModal}
            />
          ))}
        </div>
      ) : (
        /* LIST MODE */
        <div className="rounded-2xl border border-white/[0.06] bg-slate-900/30 divide-y divide-white/[0.04] overflow-hidden">
          {filteredNotes.map((note) => {
            const cat = resolveNoteCategory(note);
            const isReel = note.knowledge_type === 'reel' || cat.id === 'content-reels';

            return (
              <div
                key={note.id}
                onClick={() => setActiveNoteModal(note)}
                className="px-4 py-3 hover:bg-slate-800/40 transition cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <span className="text-base shrink-0">{cat.icon}</span>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-white group-hover:text-amber-200 transition truncate">
                        {note.title}
                      </span>
                      {isReel && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500/10 text-rose-300 font-bold border border-rose-500/20 shrink-0">
                          Reel
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
                  <Eye className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-300 transition" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. DISTRACTION-FREE NOTE READER MODAL */}
      {activeNoteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveNoteModal(null);
          }}
        >
          <div className="relative w-full max-w-2xl bg-[#0d1322] border border-white/[0.08] rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-[#090d16]/70 shrink-0">
              <div className="flex items-center space-x-2 min-w-0">
                <span className="text-base">{resolveNoteCategory(activeNoteModal).icon}</span>
                <span className="text-xs font-semibold text-slate-300 truncate">
                  {resolveNoteCategory(activeNoteModal).name}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  • {new Date(activeNoteModal.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  onClick={() => handleCopyMarkdown(activeNoteModal)}
                  className="p-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white transition"
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
                  className="p-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-rose-400 transition"
                  title="Delete Note"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActiveNoteModal(null)}
                  className="p-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-7 overflow-y-auto space-y-5 text-xs leading-relaxed">
              {/* Note Title */}
              <div>
                <h2 className="text-base sm:text-xl font-bold text-white leading-snug">
                  {activeNoteModal.title}
                </h2>
                <div className="flex items-center space-x-2 mt-1.5">
                  <span className="text-[10px] font-mono text-amber-400 font-semibold">
                    {activeNoteModal.id}
                  </span>
                  {(activeNoteModal.knowledge_type === 'reel' || activeNoteModal.knowledge_type === 'video') && (
                    <span className="text-[10px] font-bold text-rose-300 flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                      <Film className="w-3 h-3" />
                      <span>Instagram Reel</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Core Idea */}
              {activeNoteModal.core_idea && (
                <div className="p-4 rounded-2xl bg-amber-500/[0.08] border border-amber-500/20 text-amber-100 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Core Breakthrough Thesis
                  </div>
                  <p className="text-xs sm:text-sm font-medium leading-relaxed">
                    {activeNoteModal.core_idea}
                  </p>
                </div>
              )}

              {/* 🎙️ Full Reel Transcript & Audio Atmosphere */}
              {(activeNoteModal.full_transcript || activeNoteModal.audio_sound_profile) && (
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/[0.08] space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-pink-300">
                    <span className="flex items-center space-x-1.5">
                      <Mic className="w-3.5 h-3.5 text-pink-400" />
                      <span>Transcript &amp; Spoken Speech</span>
                    </span>
                    {activeNoteModal.audio_sound_profile && (
                      <span className="text-[10px] font-normal text-slate-400">
                        {activeNoteModal.audio_sound_profile}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-mono bg-slate-950/50 p-3 rounded-xl border border-white/[0.04]">
                    {activeNoteModal.full_transcript || 'No spoken audio transcript.'}
                  </p>
                </div>
              )}

              {/* 📱 On-Screen Text & Visual Overlays (Sound with Text) */}
              {safeJsonArray(activeNoteModal.visual_text_content).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <Film className="w-3.5 h-3.5 text-indigo-400" />
                    <span>On-Screen Visual Text Overlays</span>
                  </h4>
                  <div className="space-y-1.5">
                    {safeJsonArray(activeNoteModal.visual_text_content).map((overlay, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-indigo-950/20 border border-indigo-900/30 text-indigo-200 flex items-start space-x-2"
                      >
                        <span className="text-[10px] font-mono text-indigo-400 shrink-0 mt-0.5">#{idx + 1}</span>
                        <span className="text-xs">{overlay}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* User Thought */}
              {activeNoteModal.my_thought && (
                <div className="p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-900/30 text-indigo-200 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                    My Thought (User Note)
                  </div>
                  <p className="text-xs leading-relaxed">{activeNoteModal.my_thought}</p>
                </div>
              )}

              {/* Key Information */}
              {safeJsonArray(activeNoteModal.key_information).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Key Information &amp; Takeaways
                  </h4>
                  <ul className="space-y-1.5 pl-4 list-disc text-slate-300">
                    {safeJsonArray(activeNoteModal.key_information).map((item, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Items */}
              {safeJsonArray(activeNoteModal.actionable_items).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Actionable Steps
                  </h4>
                  <div className="space-y-1.5">
                    {safeJsonArray(activeNoteModal.actionable_items).map((item, idx) => (
                      <div key={idx} className="flex items-start space-x-2 text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Deductions */}
              {safeJsonArray(activeNoteModal.insights).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    AI Deductions &amp; Insights
                  </h4>
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/[0.06] text-slate-300 space-y-1.5">
                    {safeJsonArray(activeNoteModal.insights).map((item, idx) => (
                      <p key={idx} className="leading-relaxed">
                        &bull; {item}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Topics */}
              {safeJsonArray(activeNoteModal.topics).length > 0 && (
                <div className="flex items-center space-x-1.5 flex-wrap pt-1 border-t border-white/[0.06]">
                  {safeJsonArray(activeNoteModal.topics).map((t, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-900 text-slate-400 font-mono border border-white/[0.05]"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-white/[0.06] bg-[#090d16]/70 flex items-center justify-between shrink-0">
              <span className="text-[10px] text-slate-500 font-mono truncate max-w-xs">
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
