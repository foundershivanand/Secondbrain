import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Tag,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { KnowledgeRecord } from '../types';
import { api } from '../services/api';

interface KnowledgeCardProps {
  knowledge: KnowledgeRecord;
  onDeleted?: () => void;
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
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const topics: string[] = safeJsonArray(knowledge.topics);
  const keyInfo: string[] = safeJsonArray(knowledge.key_information);
  const insights: string[] = safeJsonArray(knowledge.insights);
  const actions: string[] = safeJsonArray(knowledge.actionable_items);

  const handleCopyMarkdown = async () => {
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

  const handleDelete = async () => {
    if (confirm(`Delete note "${knowledge.title}"?`)) {
      await api.deleteKnowledge(knowledge.id);
      if (onDeleted) onDeleted();
    }
  };

  return (
    <div className="glass-panel-interactive rounded-2xl p-5 border border-slate-800/80 hover:border-purple-500/40 transition-all space-y-4">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 flex-1">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
              {knowledge.id}
            </span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
              {knowledge.knowledge_type}
            </span>
            <span className="text-[10px] font-semibold text-slate-400">
              {new Date(knowledge.created_at).toLocaleDateString()}
            </span>
          </div>
          <h3 className="text-base font-bold text-white hover:text-purple-300 transition cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
            {knowledge.title}
          </h3>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={handleCopyMarkdown}
            title="Copy Obsidian Markdown"
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <a
            href={api.getMarkdownDownloadUrl(knowledge.id)}
            download
            title="Download .md file"
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            onClick={handleDelete}
            title="Delete note"
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-red-950 text-slate-400 hover:text-red-400 text-xs transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Core Idea */}
      <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-900/30 text-xs text-slate-200 leading-relaxed font-medium">
        <span className="text-purple-400 font-bold mr-1.5">💡 Core Idea:</span>
        {knowledge.core_idea}
      </div>

      {/* Topics & Tags */}
      {topics.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <Tag className="w-3 h-3 text-slate-500 mr-0.5" />
          {topics.map((topic, i) => (
            <span
              key={i}
              className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800/80 text-purple-300 border border-purple-500/10 hover:border-purple-500/30 transition cursor-pointer"
            >
              [[{topic}]]
            </span>
          ))}
        </div>
      )}

      {/* "Why saved" & "What changed" indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-1">
        {knowledge.why_saved && (
          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300">
            <span className="text-slate-400 font-semibold block mb-0.5">🎯 Why I Saved This:</span>
            {knowledge.why_saved}
          </div>
        )}
        {knowledge.what_changed && (
          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300">
            <span className="text-indigo-400 font-semibold block mb-0.5">🔄 What Changed:</span>
            {knowledge.what_changed}
          </div>
        )}
      </div>

      {/* Expandable Details */}
      {isExpanded && (
        <div className="pt-3 border-t border-slate-800/80 space-y-4 text-xs animate-fade-in">
          {keyInfo.length > 0 && (
            <div>
              <h4 className="font-bold text-slate-300 mb-1">Key Information</h4>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                {keyInfo.map((info, idx) => (
                  <li key={idx}>{info}</li>
                ))}
              </ul>
            </div>
          )}

          {insights.length > 0 && (
            <div>
              <h4 className="font-bold text-purple-300 mb-1">Insights</h4>
              <ul className="space-y-1 text-slate-300">
                {insights.map((insight, idx) => (
                  <li key={idx} className="flex items-start space-x-1.5">
                    <span className="text-purple-400">⚡</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {actions.length > 0 && (
            <div>
              <h4 className="font-bold text-emerald-300 mb-1">Action Items</h4>
              <ul className="space-y-1 text-slate-300">
                {actions.map((act, idx) => (
                  <li key={idx} className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded accent-purple-500" readOnly />
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {knowledge.atomic_items && knowledge.atomic_items.length > 0 && (
            <div>
              <h4 className="font-bold text-indigo-300 mb-1.5">Atomic Knowledge (M2 Layer)</h4>
              <div className="space-y-2">
                {knowledge.atomic_items.map((ak, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300 flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase mr-1.5">
                        [{ak.concept_type}]
                      </span>
                      <span>{ak.statement}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono ml-2">
                      {Math.round(ak.confidence * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800">
            <span>Obsidian Path: <code className="text-slate-400">{knowledge.markdown_path}</code></span>
            <span>Source: <code className="text-purple-400">{knowledge.source_id}</code></span>
          </div>
        </div>
      )}

      {/* Expand Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full py-1 text-center text-[11px] font-semibold text-slate-400 hover:text-purple-300 flex items-center justify-center space-x-1 transition"
      >
        <span>{isExpanded ? 'Collapse' : 'Show Full Knowledge Details'}</span>
        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};
