import React, { useState, useEffect, useMemo } from 'react';
import {
  Lightbulb,
  Boxes,
  Video,
  BookOpen,
  ArrowUpRight,
  TrendingUp,
  Search,
  Sparkles,
  Smartphone,
  Cpu,
  Layers,
  CheckCircle2,
  ExternalLink,
  Tag,
} from 'lucide-react';
import { api } from '../services/api';
import { KnowledgeRecord } from '../types';
import { resolveNoteCategory } from '../utils/categories';

export interface ProductOpportunity {
  id: string;
  title: string;
  idea: string;
  source: string;
  sourceId: string;
  why: string;
  type: 'Mobile App' | 'SaaS Opportunity' | 'AI & Autonomous' | 'Digital Wellness' | 'Tool & System';
  actions: string[];
}

export const IdeasFactory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'product' | 'content' | 'ebook'>('product');
  const [knowledge, setKnowledge] = useState<KnowledgeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getKnowledgeList(undefined, 500)
      .then((res) => {
        setKnowledge(res.items || []);
      })
      .catch((e) => {
        console.error('Failed to load notes for Ideas Factory:', e);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Multi-Channel Idea Extraction
  const { productOpportunities, contentIdeas, ebookChapters } = useMemo(() => {
    const products: ProductOpportunity[] = [];
    const content: { title: string; idea: string; source: string; sourceId: string; topics: string[] }[] = [];
    const ebook: { topic: string; insight: string; source: string; sourceId: string }[] = [];
    const seenTitles = new Set<string>();

    const safeParse = (str: string | null | undefined): string[] => {
      if (!str) return [];
      try {
        const p = JSON.parse(str);
        return Array.isArray(p) ? p : [String(p)];
      } catch {
        return str ? [str] : [];
      }
    };

    knowledge.forEach((k) => {
      const actions = safeParse(k.actionable_items);
      const insights = safeParse(k.insights);
      const topics = safeParse(k.topics);
      const cat = resolveNoteCategory(k);

      const titleLower = (k.title || '').toLowerCase();
      const coreLower = (k.core_idea || '').toLowerCase();
      const topicsLower = topics.map((t) => t.toLowerCase()).join(' ');

      // Determine product type
      const inferType = (): ProductOpportunity['type'] => {
        if (
          cat.id === 'digital-wellness' ||
          titleLower.includes('screen') ||
          titleLower.includes('doomscroll') ||
          titleLower.includes('detox') ||
          titleLower.includes('focus') ||
          titleLower.includes('habit')
        ) {
          return 'Digital Wellness';
        }
        if (
          cat.id === 'mobile-ui-apps' ||
          titleLower.includes('app') ||
          titleLower.includes('mobile') ||
          titleLower.includes('widget') ||
          titleLower.includes('ui concept')
        ) {
          return 'Mobile App';
        }
        if (
          cat.id === 'ai-agents' ||
          cat.id === 'ai-llms' ||
          titleLower.includes('agent') ||
          titleLower.includes('rag') ||
          titleLower.includes('llm') ||
          titleLower.includes('memory')
        ) {
          return 'AI & Autonomous';
        }
        if (
          cat.id === 'saas-product' ||
          titleLower.includes('saas') ||
          titleLower.includes('startup') ||
          titleLower.includes('platform') ||
          titleLower.includes('onboarding') ||
          titleLower.includes('mrr')
        ) {
          return 'SaaS Opportunity';
        }
        return 'Tool & System';
      };

      const pType = inferType();

      // Channel 1: Note itself is an App / Product / Tool Concept
      const isConceptNote =
        cat.id === 'mobile-ui-apps' ||
        cat.id === 'digital-wellness' ||
        cat.id === 'saas-product' ||
        titleLower.includes('app') ||
        titleLower.includes('idea') ||
        titleLower.includes('product') ||
        titleLower.includes('tool') ||
        titleLower.includes('system') ||
        titleLower.includes('concept') ||
        topicsLower.includes('app') ||
        topicsLower.includes('product') ||
        topicsLower.includes('idea') ||
        topicsLower.includes('startup');

      if (isConceptNote && k.core_idea) {
        const cleanTitle = k.title.replace(/^App Idea:\s*/i, '').replace(/-\s*App\s*/i, ' App ').trim();
        const normKey = cleanTitle.toLowerCase().slice(0, 40);

        if (!seenTitles.has(normKey)) {
          seenTitles.add(normKey);
          products.push({
            id: k.id,
            title: cleanTitle,
            idea: k.core_idea,
            source: k.title,
            sourceId: k.id,
            why: k.why_saved || k.what_changed || 'Extracted directly from user note & research',
            type: pType,
            actions: actions.slice(0, 3),
          });
        }
      }

      // Channel 2: Actionable items indicating build / implement / create / develop
      const actionKeywords = [
        'build', 'implement', 'create', 'develop', 'design', 'saas', 'agent',
        'app', 'tool', 'feature', 'widget', 'platform', 'automate', 'prototype',
        'ship', 'solution', 'system', 'model', 'launch', 'integrate', 'explore'
      ];

      actions.forEach((act) => {
        const actLower = act.toLowerCase();
        const matchesAction = actionKeywords.some((kw) => actLower.includes(kw));

        if (matchesAction && act.length > 15) {
          const actKey = actLower.slice(0, 45);
          if (!seenTitles.has(actKey)) {
            seenTitles.add(actKey);
            products.push({
              id: `${k.id}-act`,
              title: act,
              idea: k.core_idea,
              source: k.title,
              sourceId: k.id,
              why: k.why_saved || 'Extracted from note action item',
              type: pType,
              actions: [act],
            });
          }
        }
      });

      // Channel 3: Content Factory Ideas
      insights.forEach((ins) => {
        if (ins.length > 20) {
          content.push({
            title: ins,
            idea: `Synthesized from: ${k.title} — ${k.core_idea ? k.core_idea.slice(0, 120) + '...' : ''}`,
            source: k.title,
            sourceId: k.id,
            topics: topics.slice(0, 3),
          });
        }
      });

      // Channel 4: Ebook Blueprint Chapters
      topics.forEach((top) => {
        if (k.core_idea && top.length > 3) {
          ebook.push({
            topic: top,
            insight: k.core_idea,
            source: k.title,
            sourceId: k.id,
          });
        }
      });
    });

    return {
      productOpportunities: products,
      contentIdeas: content,
      ebookChapters: ebook,
    };
  }, [knowledge]);

  // Filtered Product Opportunities
  const filteredProducts = useMemo(() => {
    return productOpportunities.filter((p) => {
      if (selectedType && p.type !== selectedType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.idea.toLowerCase().includes(q) ||
          p.source.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [productOpportunities, selectedType, searchQuery]);

  const typePills = [
    { label: 'All Ideas', value: null, count: productOpportunities.length },
    { label: '📱 Mobile Apps', value: 'Mobile App', count: productOpportunities.filter((p) => p.type === 'Mobile App').length },
    { label: '🧘 Digital Wellness', value: 'Digital Wellness', count: productOpportunities.filter((p) => p.type === 'Digital Wellness').length },
    { label: '🤖 AI & Autonomous', value: 'AI & Autonomous', count: productOpportunities.filter((p) => p.type === 'AI & Autonomous').length },
    { label: '🚀 SaaS & Platform', value: 'SaaS Opportunity', count: productOpportunities.filter((p) => p.type === 'SaaS Opportunity').length },
    { label: '⚡ Tools & Systems', value: 'Tool & System', count: productOpportunities.filter((p) => p.type === 'Tool & System').length },
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Factory System
          </span>
          <span className="text-xs text-slate-500">•</span>
          <span className="text-xs text-slate-400">Synthesized from {knowledge.length} Second Brain Notes</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center space-x-2.5">
          <Lightbulb className="w-6 h-6 text-amber-400" />
          <span>Product, Content &amp; Ebook Factory</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
          Your captured notes actively feed business validation, mobile UI architectures, and structured publishing.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        {[
          { id: 'product', label: 'Product Factory', icon: Boxes, count: productOpportunities.length },
          { id: 'content', label: 'Content Factory', icon: Video, count: contentIdeas.length },
          { id: 'ebook', label: 'Ebook Blueprint', icon: BookOpen, count: ebookChapters.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                isSelected
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Product Factory */}
      {activeTab === 'product' && (
        <div className="space-y-4">
          {/* Top Banner */}
          <div className="p-4 bg-gradient-to-r from-purple-950/30 to-indigo-950/20 border border-purple-900/40 rounded-2xl flex items-start space-x-3 text-xs text-purple-200">
            <TrendingUp className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <strong className="text-white block font-bold">
                Automated Product &amp; SaaS Opportunity Engine
              </strong>
              <span>
                Identified <strong>{productOpportunities.length} opportunities</strong> from your notes, UI sketches, digital detox concepts, and architecture patterns.
              </span>
            </div>
          </div>

          {/* Controls: Search + Filter Pills */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ideas by keyword, app name, problem, or feature..."
                className="w-full bg-slate-900/90 border border-slate-800/80 rounded-xl pl-8 pr-3.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
              />
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              {typePills.filter((p) => p.count > 0).map((pill) => {
                const isSelected = selectedType === pill.value;
                return (
                  <button
                    key={pill.label}
                    onClick={() => setSelectedType(isSelected ? null : pill.value)}
                    className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg font-medium transition whitespace-nowrap text-xs ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-sm font-bold'
                        : 'bg-slate-900 border border-slate-800/80 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{pill.label}</span>
                    <span className="text-[10px] opacity-75 font-mono">({pill.count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Opportunities Grid */}
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500 space-y-2">
              <Sparkles className="w-6 h-6 text-purple-400 mx-auto animate-spin" />
              <p>Analyzing Second Brain notes and synthesizing product opportunities...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/30 rounded-2xl border border-slate-800 text-xs text-slate-500">
              No product opportunities match your current filter. Clear search or capture more notes.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProducts.map((prod, idx) => {
                const badgeColor =
                  prod.type === 'Mobile App'
                    ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
                    : prod.type === 'Digital Wellness'
                    ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                    : prod.type === 'AI & Autonomous'
                    ? 'text-purple-400 bg-purple-500/10 border-purple-500/20'
                    : prod.type === 'SaaS Opportunity'
                    ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                    : 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';

                return (
                  <div
                    key={`${prod.id}-${idx}`}
                    className="p-5 rounded-2xl border border-slate-800/90 bg-slate-900/60 hover:border-purple-500/40 transition space-y-3 flex flex-col justify-between shadow-sm group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${badgeColor}`}>
                          {prod.type}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {prod.sourceId}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-100 group-hover:text-purple-300 transition leading-snug">
                        {prod.title}
                      </h3>

                      <p className="text-xs text-slate-400 leading-relaxed italic">
                        "{prod.idea}"
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs">
                      {prod.actions && prod.actions.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Key Next Step:
                          </span>
                          <div className="text-[11px] text-slate-300 flex items-start space-x-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{prod.actions[0]}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span className="truncate max-w-[200px]" title={prod.source}>
                          Evidence: <strong className="text-purple-400">{prod.source}</strong>
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          {prod.why ? 'Validated' : 'Concept'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Content Factory */}
      {activeTab === 'content' && (
        <div className="space-y-4">
          <div className="p-4 bg-indigo-950/20 border border-indigo-900/30 rounded-2xl flex items-start space-x-3 text-xs text-indigo-200">
            <Video className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block font-bold">Content &amp; Publishing Pipeline</strong>
              High-leverage insights, counterintuitive patterns, and framework explanations ready for social posts or technical threads.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contentIdeas.slice(0, 30).map((ci, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl border border-slate-800/90 bg-slate-900/60 hover:border-indigo-500/40 transition space-y-2.5 shadow-sm"
              >
                <div className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                  High-Value Insight / Post Angle
                </div>
                <h3 className="text-sm font-bold text-slate-100 leading-snug">{ci.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-2">{ci.idea}</p>
                <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="truncate max-w-[220px]">Source: <strong className="text-indigo-300">{ci.source}</strong></span>
                  <span className="font-mono text-[10px] text-slate-600">{ci.sourceId}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Ebook Blueprint */}
      {activeTab === 'ebook' && (
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-purple-400" />
            <span>Structured Knowledge Blueprint &amp; Chapters</span>
          </h3>
          <p className="text-xs text-slate-400">
            Concept clusters mapped into cohesive chapters and documentation modules.
          </p>

          <div className="space-y-2.5 pt-2">
            {ebookChapters.slice(0, 16).map((ch, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start space-x-3 text-xs"
              >
                <span className="w-6 h-6 rounded-lg bg-purple-600/20 text-purple-400 font-mono font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="font-bold text-slate-200">Chapter Module: [[{ch.topic}]]</div>
                  <div className="text-slate-400 line-clamp-2">{ch.insight}</div>
                  <div className="text-[10px] text-slate-500 pt-1">Derived from: {ch.source} ({ch.sourceId})</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
