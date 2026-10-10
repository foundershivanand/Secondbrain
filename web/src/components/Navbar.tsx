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
  isSyncing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenCapture,
  stats,
  isSyncing,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // 4 Primary core navigation tabs (minimal, clear focus)
  const primaryNavItems = [
    { id: 'brain', label: 'Brain', icon: Brain },
    { id: 'knowledge', label: 'Notes', icon: BookOpen, count: stats?.knowledgeCount },
    { id: 'inbox', label: 'Inbox', icon: Inbox, count: stats?.sourcesCount },
    { id: 'topics', label: 'Graph', icon: Network },
  ];

  // Secondary tools in refined dropdown/more sheet
  const secondaryNavItems = [
    { id: 'ideas', label: 'Ideas & Product Factory', icon: Lightbulb, desc: 'SaaS & content opportunities' },
    { id: 'memories', label: 'Durable Memories', icon: Sparkles, count: stats?.durableMemoriesCount, desc: 'Permanent principles & mental models' },
    { id: 'sources', label: 'Raw Sources', icon: Database, desc: 'External files & cloud pointers' },
    { id: 'settings', label: 'Settings', icon: Settings, desc: 'API endpoints, token & GitHub sync' },
  ];

  const handleSelectSecondary = (id: string) => {
    setActiveTab(id);
    setIsMoreMenuOpen(false);
  };

  const isSecondaryActive = secondaryNavItems.some((item) => item.id === activeTab);

  return (
    <>
      {/* Top Header - Minimalist & Aesthetic */}
      <header className="sticky top-0 z-40 w-full bg-[#090d16]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo & Brand */}
          <div
            className="flex items-center space-x-2.5 cursor-pointer select-none group"
            onClick={() => setActiveTab('brain')}
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-sm shadow-purple-500/25 group-hover:scale-105 transition-transform duration-200">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm tracking-tight text-white group-hover:text-purple-300 transition-colors">
                Second Brain
              </span>
              {isSyncing ? (
                <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] bg-purple-500/15 text-purple-300 border border-purple-500/20 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                  <span>Syncing</span>
                </span>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.6)]" title="Online" />
              )}
            </div>
          </div>

          {/* Desktop Navigation - 4 Core Pills + More */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-900/40 p-1 rounded-xl border border-white/[0.05]">
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {typeof item.count === 'number' && item.count > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}

            {/* More Menu Dropdown Toggle */}
            <div className="relative">
              <button
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  isSecondaryActive || isMoreMenuOpen
                    ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
                title="More Tools"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>

              {/* Desktop Dropdown */}
              {isMoreMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0d1322] border border-white/[0.08] shadow-2xl p-1.5 z-50 animate-fade-in space-y-0.5"
                  onMouseLeave={() => setIsMoreMenuOpen(false)}
                >
                  {secondaryNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectSecondary(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition ${
                          isActive
                            ? 'bg-purple-600/20 text-purple-300'
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <Icon className="w-3.5 h-3.5 text-purple-400" />
                          <span>{item.label}</span>
                        </div>
                        {typeof item.count === 'number' && item.count > 0 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
                            {item.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* Desktop Quick Capture Button */}
          <div className="hidden sm:flex items-center space-x-2">
            <button
              onClick={onOpenCapture}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-sm shadow-purple-600/20 transition-all duration-150 active:scale-95 border border-purple-400/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Capture</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Minimalist & Ergonomic) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090d16]/95 backdrop-blur-2xl border-t border-white/[0.06] px-3 pb-safe">
        <div className="grid grid-cols-5 items-center h-14 max-w-md mx-auto">
          {/* 1. Brain */}
          <button
            onClick={() => setActiveTab('brain')}
            className={`flex flex-col items-center justify-center h-full py-1 text-[10px] font-medium transition ${
              activeTab === 'brain' ? 'text-purple-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Brain className={`w-4 h-4 mb-0.5 ${activeTab === 'brain' ? 'text-purple-400' : ''}`} />
            <span>Brain</span>
          </button>

          {/* 2. Notes */}
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`flex flex-col items-center justify-center h-full py-1 text-[10px] font-medium transition ${
              activeTab === 'knowledge' ? 'text-purple-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className={`w-4 h-4 mb-0.5 ${activeTab === 'knowledge' ? 'text-purple-400' : ''}`} />
            <span>Notes</span>
          </button>

          {/* 3. Center Capture Button */}
          <div className="flex items-center justify-center">
            <button
              onClick={onOpenCapture}
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/30 active:scale-90 transition border border-purple-400/30"
              aria-label="Capture"
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
            <Inbox className={`w-4 h-4 mb-0.5 ${activeTab === 'inbox' ? 'text-purple-400' : ''}`} />
            <span>Inbox</span>
          </button>

          {/* 5. More */}
          <button
            onClick={() => setIsMoreMenuOpen(true)}
            className={`flex flex-col items-center justify-center h-full py-1 text-[10px] font-medium transition ${
              isSecondaryActive ? 'text-purple-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MoreHorizontal className="w-4 h-4 mb-0.5" />
            <span>More</span>
          </button>
        </div>
      </div>

      {/* Mobile Slide-up Sheet */}
      {isMoreMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end md:hidden animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsMoreMenuOpen(false);
          }}
        >
          <div className="bg-[#0d1322] border-t border-white/[0.08] rounded-t-3xl p-5 space-y-4 max-h-[75vh] overflow-y-auto pb-safe">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Second Brain Navigation
              </span>
              <button
                onClick={() => setIsMoreMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              {[...primaryNavItems, ...secondaryNavItems].map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectSecondary(item.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl transition text-left ${
                      isActive
                        ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-slate-950 border border-white/[0.06] text-purple-400">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{item.label}</div>
                        {'desc' in item && typeof (item as any).desc === 'string' && (
                          <div className="text-[11px] text-slate-400">{(item as any).desc}</div>
                        )}
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
