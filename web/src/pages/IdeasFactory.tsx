import React, { useState, useEffect } from 'react';
import {
  Lightbulb,
  Boxes,
  Video,
  BookOpen,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { api } from '../services/api';
import { KnowledgeRecord } from '../types';

export const IdeasFactory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'product' | 'content' | 'ebook'>('product');
  const [knowledge, setKnowledge] = useState<KnowledgeRecord[]>([]);

  useEffect(() => {
    api.getKnowledgeList().then((res) => setKnowledge(res.items || []));
  }, []);

  // Aggregate ideas from notes
  const productOpportunities: { title: string; idea: string; source: string; why: string }[] = [];
  const contentIdeas: { title: string; idea: string; source: string }[] = [];
  const ebookChapters: { topic: string; insight: string; source: string }[] = [];

  knowledge.forEach((k) => {
    // Actions as product opportunities
    try {
      const actions: string[] = JSON.parse(k.actionable_items || '[]');
      actions.forEach((act) => {
        if (
          act.toLowerCase().includes('build') ||
          act.toLowerCase().includes('implement') ||
          act.toLowerCase().includes('create') ||
          act.toLowerCase().includes('agent') ||
          act.toLowerCase().includes('saas')
        ) {
          productOpportunities.push({
            title: act,
            idea: k.core_idea,
            source: k.title,
            why: k.why_saved,
          });
        }
      });

      const insights: string[] = JSON.parse(k.insights || '[]');
      insights.forEach((ins) => {
        contentIdeas.push({
          title: ins,
          idea: `Based on: ${k.title}`,
          source: k.title,
        });
      });

      const topics: string[] = JSON.parse(k.topics || '[]');
      topics.forEach((top) => {
        ebookChapters.push({
          topic: top,
          insight: k.core_idea,
          source: k.title,
        });
      });
    } catch {}
  });

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Factory System
          </span>
          <span className="text-xs text-slate-500">•</span>
          <span className="text-xs text-slate-400">Derived from your Second Brain</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center space-x-2">
          <Lightbulb className="w-6 h-6 text-amber-400" />
          <span>Product, Content & Ebook Factory</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Your knowledge isn't just stored—it actively feeds business validation, content generation, and structured publishing.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        {[
          { id: 'product', label: 'Product Factory', icon: Boxes, count: productOpportunities.length },
          { id: 'content', label: 'Content Factory', icon: Video, count: contentIdeas.length },
          { id: 'ebook', label: 'Ebook Factory', icon: BookOpen, count: ebookChapters.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                isSelected
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'product' && (
        <div className="space-y-4">
          <div className="p-4 bg-purple-950/20 border border-purple-900/30 rounded-2xl flex items-start space-x-3 text-xs text-purple-200">
            <TrendingUp className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block mb-0.5">Automated Product Opportunity Discovery</strong>
              Synthesized from pain points, architecture patterns, and actionable items across your ingested sources.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {productOpportunities.length === 0 ? (
              <p className="text-xs text-slate-500 p-6">No product ideas extracted yet. Capture more notes with actions.</p>
            ) : (
              productOpportunities.map((prod, idx) => (
                <div
                  key={idx}
                  className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-purple-500/40 transition space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                      SaaS Opportunity
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-slate-500" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-100">{prod.title}</h3>
                  <p className="text-xs text-slate-400 italic">"{prod.idea}"</p>
                  <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
                    <span>Evidence Source: </span>
                    <span className="text-purple-400 font-semibold">{prod.source}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'content' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contentIdeas.map((ci, idx) => (
            <div
              key={idx}
              className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-indigo-500/40 transition space-y-2.5"
            >
              <div className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                High-Value Post / Video Concept
              </div>
              <h3 className="text-sm font-bold text-slate-100">{ci.title}</h3>
              <p className="text-xs text-slate-400">{ci.idea}</p>
              <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
                <span>Derived from: </span>
                <span className="text-indigo-300 font-semibold">{ci.source}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'ebook' && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-purple-400" />
            <span>Structured Ebook Blueprint & Chapter Synthesizer</span>
          </h3>
          <p className="text-xs text-slate-400">
            Topics and core breakthroughs organized into cohesive knowledge modules for documentation or course outlines.
          </p>

          <div className="space-y-3 pt-2">
            {ebookChapters.slice(0, 8).map((ch, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start space-x-3 text-xs"
              >
                <span className="w-6 h-6 rounded-lg bg-purple-600/20 text-purple-400 font-mono font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-200">Module: [[{ch.topic}]]</div>
                  <div className="text-slate-400">{ch.insight}</div>
                  <div className="text-[10px] text-slate-500">Source: {ch.source}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
