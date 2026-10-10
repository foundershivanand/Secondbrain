import React, { useState } from 'react';
import {
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Trash2,
  Film,
  Video,
  Mic,
  Sparkles,
} from 'lucide-react';
import { KnowledgeRecord } from '../types';
import { api } from '../services/api';
import { resolveNoteCategory } from '../utils/categories';

interface KnowledgeCardProps {
  knowledge: KnowledgeRecord;
  onDeleted?: () => void;
  onOpenModal?: (note: KnowledgeRecord) => void;
}

function safeJsonArray(val: string | null | undefined): string[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [String(parsed)];
  } catch {
    return val ? [val] : [];
  }
}

export const KnowledgeCard: React.FC<KnowledgeCardProps> = ({
  knowledge,
  onDeleted,
  onOpenModal,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const topics: string[] = safeJsonArray(knowledge.topics);
  const keyInfo: string[] = safeJsonArray(knowledge.key_information);
  const insights: string[] = safeJsonArray(knowledge.insights);
  const actions: string[] = safeJsonArray(knowledge.actionable_items);
  const visualText: string[] = safeJsonArray(knowledge.visual_text_content);

  const categoryDef = resolveNoteCategory(knowledge);
  const isReel = knowledge.knowledge_type === 'reel' || knowledge.knowledge_type === 'video' || categoryDef.id === 'content-reels';
  const isYt = knowledge.knowledge_type === 'youtube' || categoryDef.id === 'youtube';

  const handleCopyMarkdown = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(api.getMarkdownDownloadUrl(knowledge.id));
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete note "${knowledge.title}"?`)) {
      await api.deleteKnowledge(knowledge.id);
      if (onDeleted) onDeleted();
    }
  };

  return (
    <div
      onClick={() => (onOpenModal ? onOpenModal(knowledge) : setIsExpanded(!isExpanded))}
      className="glass-panel-interactive rounded-2xl p-4 sm:p-5 border border-white/[0.06] hover:border-purple-500/30 transition-all duration-200 space-y-3 cursor-pointer group"
    >
      {/* Header: Badges & Actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          <span className="text-sm shrink-0">{categoryDef.icon}</span>
          <span className="text-[11px] font-semibold text-slate-300">
            {categoryDef.name}
          </span>

          {isReel && (
            <span className="flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-300 border border-pink-500/20">
              <Film className="w-3 h-3" />
              <span>Instagram Reel</span>
            </span>
          )}

          {isYt && (
            <span className="flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/20">
              <Video className="w-3 h-3" />
              <span>YouTube</span>
            </span>
          )}

          <span className="text-[10px] text-slate-500 font-mono">
            • {new Date(knowledge.created_at).toLocaleDateString()}
          </span>
        </div>

        <div className="flex items-center space-x-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleCopyMarkdown}
            title="Copy Markdown"
            className="p-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <a
            href={api.getMarkdownDownloadUrl(knowledge.id)}
            download
            title="Download .md file"
            className="p-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={handleDelete}
            title="Delete note"
            className="p-1.5 rounded-xl bg-slate-900/60 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm sm:text-base font-semibold text-white group-hover:text-purple-300 transition-colors leading-snug">
        {knowledge.title}
      </h3>

      {/* Core Idea */}
      {knowledge.core_idea && (
        <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-900/20 text-xs text-purple-200/90 leading-relaxed font-normal">
          <span className="font-semibold text-purple-400 mr-1.5">Thesis:</span>
          {knowledge.core_idea}
        </div>
      )}

      {/* Reel Transcript Preview / Sound Overlay Badge */}
      {(knowledge.full_transcript || visualText.length > 0 || knowledge.audio_sound_profile) && (
        <div className="p-2.5 rounded-xl bg-slate-900/40 border border-white/[0.05] space-y-1.5 text-xs">
          {knowledge.audio_sound_profile && (
            <div className="flex items-center space-x-1.5 text-[11px] text-pink-300 font-medium">
              <Mic className="w-3 h-3 shrink-0" />
              <span>Audio: {knowledge.audio_sound_profile}</span>
            </div>
          )}

          {knowledge.full_transcript && (
            <div className="text-[11px] text-slate-400 line-clamp-2 italic">
              &ldquo;{knowledge.full_transcript}&rdquo;
            </div>
          )}

          {visualText.length > 0 && (
            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1 pt-1">
              <span className="text-[10px] text-slate-500 font-medium">On-Screen Text:</span>
              {visualText.slice(0, 3).map((item, idx) => (
                <span
                  key={idx}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/60 text-slate-300 font-mono border border-white/[0.04] truncate max-w-xs"
                >
                  {item}
                </span>
              ))}
              {visualText.length > 3 && (
                <span className="text-[10px] text-slate-500 font-mono">
                  +{visualText.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Topics */}
      {topics.length > 0 && (
        <div className="flex flex-wrap gap-1 items-center pt-0.5">
          {topics.slice(0, 4).map((t, i) => (
            <span
              key={i}
              className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-900/70 text-slate-400 font-mono border border-white/[0.05]"
            >
              #{t}
            </span>
          ))}
          {topics.length > 4 && (
            <span className="text-[10px] text-slate-500 font-mono">
              +{topics.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Expanded Quick Details */}
      {isExpanded && (
        <div className="pt-3 border-t border-white/[0.06] space-y-3 text-xs animate-fade-in" onClick={(e) => e.stopPropagation()}>
          {keyInfo.length > 0 && (
            <div>
              <h4 className="font-semibold text-slate-300 mb-1">Key Takeaways</h4>
              <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                {keyInfo.map((info, idx) => (
                  <li key={idx} className="leading-relaxed">{info}</li>
                ))}
              </ul>
            </div>
          )}

          {actions.length > 0 && (
            <div>
              <h4 className="font-semibold text-emerald-400 mb-1">Action Items</h4>
              <ul className="space-y-1 text-slate-300">
                {actions.map((act, idx) => (
                  <li key={idx} className="flex items-center space-x-2">
                    <span className="text-emerald-400 text-xs">&#10003;</span>
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {insights.length > 0 && (
            <div>
              <h4 className="font-semibold text-purple-400 mb-1">AI Deductions</h4>
              <ul className="space-y-1 text-slate-300">
                {insights.map((ins, idx) => (
                  <li key={idx} className="leading-relaxed">&bull; {ins}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
