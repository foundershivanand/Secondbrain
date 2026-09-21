import React from 'react';
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
  Compass,
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
  const navItems = [
    { id: 'brain', label: 'Brain', icon: Brain, badge: null },
    { id: 'inbox', label: 'Inbox', icon: Inbox, badge: stats?.sourcesCount },
    { id: 'knowledge', label: 'Knowledge', icon: BookOpen, badge: stats?.knowledgeCount },
    { id: 'topics', label: 'Topics', icon: Network, badge: null },
    { id: 'ideas', label: 'Ideas & Factory', icon: Lightbulb, badge: null },
    { id: 'memories', label: 'Memories', icon: Sparkles, badge: stats?.durableMemoriesCount },
    { id: 'sources', label: 'Sources', icon: Database, badge: null },
    { id: 'settings', label: 'Settings', icon: Settings, badge: null },
  ];

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('brain')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/20 ring-1 ring-white/20">
              <Brain className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-purple-300 bg-clip-text text-transparent">
                  SECOND BRAIN
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  D1 + Gemini
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Compressed Knowledge • Provenance • Zero Bloat
              </p>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge !== null && item.badge !== undefined && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 ml-1">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Capture Button */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenCapture}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-purple-600/25 transition-all transform active:scale-95 ring-1 ring-white/20"
            >
              <Plus className="w-4 h-4" />
              <span>Capture</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-xl px-2 py-1.5 flex justify-around items-center">
        {[
          { id: 'brain', label: 'Brain', icon: Brain },
          { id: 'inbox', label: 'Inbox', icon: Inbox },
          { id: 'knowledge', label: 'Notes', icon: BookOpen },
          { id: 'ideas', label: 'Ideas', icon: Lightbulb },
          { id: 'memories', label: 'Memory', icon: Sparkles },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-medium transition-all ${
                isActive ? 'text-purple-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-purple-400 scale-110' : ''}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};
