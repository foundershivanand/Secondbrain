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
      <header className="sticky top-0 z-40 w-full bg-[#08090c]/85 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo & Brand */}
          <div
            className="flex items-center space-x-2.5 cursor-pointer select-none group"
            onClick={() => setActiveTab('brain')}
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-zinc-950 shadow-sm shadow-amber-500/20 group-hover:scale-105 transition-transform duration-200">
              <Brain className="w-4 h-4 text-zinc-950 stroke-[2.2]" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm tracking-tight text-zinc-100 group-hover:text-amber-200 transition-colors">
                Second Brain
              </span>
              {isSyncing ? (
                <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/20 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  <span>Syncing</span>
                </span>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.6)]" title="Online" />
              )}
            </div>
          </div>

          {/* Desktop Navigation - 4 Core Pills + More */}
          <nav className="hidden md:flex items-center space-x-1 bg-zinc-900/60 p-1 rounded-xl border border-white/[0.06]">
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-white/10 text-white border border-white/15 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {typeof item.count === 'number' && item.count > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-300">
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
                    ? 'bg-white/10 text-white border border-white/15'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
                title="More Tools"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>

              {/* Desktop Dropdown */}
              {isMoreMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0f1118] border border-white/[0.08] shadow-2xl p-1.5 z-50 animate-fade-in space-y-0.5"
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
                            ? 'bg-white/10 text-white border border-white/10'
                            : 'text-zinc-300 hover:bg-white/[0.04] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <Icon className="w-3.5 h-3.5 text-amber-400" />
                          <span>{item.label}</span>
                        </div>
                        {typeof item.count === 'number' && item.count > 0 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-400">
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
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold shadow-sm transition-all duration-150 active:scale-95 border border-white/20"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Capture</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Minimalist & Ergonomic) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#08090c]/95 backdrop-blur-2xl border-t border-white/[0.06] px-3 pb-safe">
        <div className="grid grid-cols-5 items-center h-14 max-w-md mx-auto">
          {/* 1. Brain */}
          <button
            onClick={() => setActiveTab('brain')}
            className={`flex flex-col items-center justify-center h-full py-1 text-[10px] font-medium transition ${
              activeTab === 'brain' ? 'text-amber-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Brain className={`w-4 h-4 mb-0.5 ${activeTab === 'brain' ? 'text-amber-400' : ''}`} />
            <span>Brain</span>
          </button>

          {/* 2. Notes */}
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`flex flex-col items-center justify-center h-full py-1 text-[10px] font-medium transition ${
              activeTab === 'knowledge' ? 'text-amber-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BookOpen className={`w-4 h-4 mb-0.5 ${activeTab === 'knowledge' ? 'text-amber-400' : ''}`} />
            <span>Notes</span>
          </button>

          {/* 3. Center Capture Button */}
          <div className="flex items-center justify-center">
            <button
              onClick={onOpenCapture}
              className="w-10 h-10 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow-lg shadow-white/10 active:scale-90 transition border border-white/20"
              aria-label="Capture"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* 4. Inbox */}
          <button
            onClick={() => setActiveTab('inbox')}
            className={`flex flex-col items-center justify-center h-full py-1 text-[10px] font-medium transition ${
              activeTab === 'inbox' ? 'text-amber-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Inbox className={`w-4 h-4 mb-0.5 ${activeTab === 'inbox' ? 'text-amber-400' : ''}`} />
            <span>Inbox</span>
          </button>

          {/* 5. More */}
          <button
            onClick={() => setIsMoreMenuOpen(true)}
            className={`flex flex-col items-center justify-center h-full py-1 text-[10px] font-medium transition ${
              isSecondaryActive ? 'text-amber-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
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
          <div className="bg-[#0f1118] border-t border-white/[0.08] rounded-t-3xl p-5 space-y-4 max-h-[75vh] overflow-y-auto pb-safe">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Second Brain Navigation
              </span>
              <button
                onClick={() => setIsMoreMenuOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
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
                        ? 'bg-white/10 text-white border border-white/15'
                        : 'text-zinc-300 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-zinc-950 border border-white/[0.06] text-amber-400">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{item.label}</div>
                        {'desc' in item && typeof (item as any).desc === 'string' && (
                          <div className="text-[11px] text-zinc-400">{(item as any).desc}</div>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
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
