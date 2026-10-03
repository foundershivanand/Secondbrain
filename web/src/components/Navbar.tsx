import React, { useState } from 'react';
import {
  Brain,
  Inbox,
  BookOpen,
  Network,
  Lightbulb,
  Sparkles,
  Database,
  Settings,
  Plus,
  MoreHorizontal,
  X,
  ChevronRight,
} from 'lucide-react';
import { BrainStats } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenCapture: () => void;
  stats: BrainStats | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenCapture,
  stats,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const desktopNavItems = [
    { id: 'brain', label: 'Brain', icon: Brain },
    { id: 'knowledge', label: 'Notes', icon: BookOpen, count: stats?.knowledgeCount },
    { id: 'inbox', label: 'Inbox', icon: Inbox, count: stats?.sourcesCount },
    { id: 'topics', label: 'Topics', icon: Network },
    { id: 'ideas', label: 'Ideas', icon: Lightbulb },
    { id: 'memories', label: 'Memories', icon: Sparkles, count: stats?.durableMemoriesCount },
    { id: 'sources', label: 'Sources', icon: Database },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const moreMenuItems = [
    { id: 'topics', label: 'Topics & Knowledge Graph', icon: Network, desc: 'Visual MOC network and concept clusters' },
    { id: 'ideas', label: 'Ideas & Product Factory', icon: Lightbulb, desc: 'Extracted SaaS, product & content ideas' },
    { id: 'memories', label: 'Durable Memories', icon: Sparkles, desc: 'Permanent principles, goals & mental models' },
    { id: 'sources', label: 'Raw Sources & Archives', icon: Database, desc: 'TeraBox, YouTube, and media pointers' },
    { id: 'settings', label: 'Settings & Cloud Sync', icon: Settings, desc: 'API endpoints, token, and GitHub sync' },
  ];

  const handleSelectMoreItem = (id: string) => {
    setActiveTab(id);
    setIsMoreMenuOpen(false);
  };

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo & Brand */}
          <div
            className="flex items-center space-x-2.5 cursor-pointer select-none"
            onClick={() => setActiveTab('brain')}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-purple-500/20">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm tracking-tight text-white">Second Brain</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Online & Connected" />
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {desktopNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isActive
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {typeof item.count === 'number' && item.count > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 ml-0.5">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Desktop Capture Action */}
          <div className="hidden sm:flex items-center space-x-2">
            <button
              onClick={onOpenCapture}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-sm shadow-purple-600/25 transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Capture</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (5 clean, accessible touch targets) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-2 pb-safe">
        <div className="grid grid-cols-5 items-center h-14 max-w-md mx-auto">
          {/* 1. Brain */}
          <button
            onClick={() => setActiveTab('brain')}
            className={`flex flex-col items-center justify-center h-full py-1 text-[10px] font-medium transition ${
              activeTab === 'brain' ? 'text-purple-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Brain className={`w-5 h-5 mb-0.5 ${activeTab === 'brain' ? 'text-purple-400 scale-105' : ''}`} />
            <span>Brain</span>
          </button>

          {/* 2. Notes */}
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`flex flex-col items-center justify-center h-full py-1 text-[10px] font-medium transition ${
              activeTab === 'knowledge' ? 'text-purple-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className={`w-5 h-5 mb-0.5 ${activeTab === 'knowledge' ? 'text-purple-400 scale-105' : ''}`} />
            <span>Notes</span>
          </button>

          {/* 3. Center Capture Button - Guaranteed Tap Target */}
          <div className="flex items-center justify-center">
            <button
              onClick={onOpenCapture}
              className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/30 active:scale-90 transition border border-purple-400/30"
              aria-label="Quick Capture"
              title="Quick Capture"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* 4. Inbox */}
          <button
            onClick={() => setActiveTab('inbox')}
            className={`flex flex-col items-center justify-center h-full py-1 text-[10px] font-medium transition ${
              activeTab === 'inbox' ? 'text-purple-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Inbox className={`w-5 h-5 mb-0.5 ${activeTab === 'inbox' ? 'text-purple-400 scale-105' : ''}`} />
            <span>Inbox</span>
          </button>

          {/* 5. More Menu */}
          <button
            onClick={() => setIsMoreMenuOpen(true)}
            className={`flex flex-col items-center justify-center h-full py-1 text-[10px] font-medium transition ${
              ['topics', 'ideas', 'memories', 'sources', 'settings'].includes(activeTab)
                ? 'text-purple-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MoreHorizontal className="w-5 h-5 mb-0.5" />
            <span>More</span>
          </button>
        </div>
      </div>

      {/* Mobile "More" Slide-up Sheet */}
      {isMoreMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col justify-end md:hidden animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsMoreMenuOpen(false);
          }}
        >
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-2xl p-4 space-y-3 max-h-[75vh] overflow-y-auto pb-safe">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Explore Second Brain
              </span>
              <button
                onClick={() => setIsMoreMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              {moreMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectMoreItem(item.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition text-left ${
                      isActive
                        ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-purple-400">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{item.label}</div>
                        <div className="text-[11px] text-slate-400">{item.desc}</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
