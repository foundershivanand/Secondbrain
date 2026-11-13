import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  ExternalLink,
  Copy,
  Check,
  FolderGit2,
  Boxes,
  Rocket,
  Compass,
  GraduationCap,
  FileText,
  Brain,
  Zap,
  Sparkles,
  Globe,
  LayoutGrid,
} from 'lucide-react';
import { EcosystemLink, getEcosystemLinks } from '../data/allLinks';

interface AllLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AllLinksModal: React.FC<AllLinksModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // All valid external links (current project excluded)
  const links = useMemo(() => getEcosystemLinks(true), []);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(links.map((item) => item.category)));
    return ['All', ...cats];
  }, [links]);

  // Filter links based on search query and category
  const filteredLinks = useMemo(() => {
    return links.filter((item) => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.url.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.tag.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [links, selectedCategory, searchQuery]);

  const handleCopy = (id: string, url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const renderIcon = (iconName: EcosystemLink['iconName']) => {
    const iconClass = 'w-5 h-5';
    switch (iconName) {
      case 'FolderGit2':
        return <FolderGit2 className={iconClass} />;
      case 'Boxes':
        return <Boxes className={iconClass} />;
      case 'Rocket':
        return <Rocket className={iconClass} />;
      case 'Compass':
        return <Compass className={iconClass} />;
      case 'GraduationCap':
        return <GraduationCap className={iconClass} />;
      case 'FileText':
        return <FileText className={iconClass} />;
      case 'Brain':
        return <Brain className={iconClass} />;
      case 'Zap':
        return <Zap className={iconClass} />;
      case 'Sparkles':
        return <Sparkles className={iconClass} />;
      default:
        return <Globe className={iconClass} />;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#101216] border border-white/[0.08] w-full max-w-3xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up sm:animate-scale-in">
        {/* Header */}
        <div className="p-5 border-b border-white/[0.06] bg-[#0c0d11]/90 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-inner">
              <LayoutGrid className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">All Links</h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {links.length} Connected Apps
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Quick access to all connected ecosystem tools and services
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar & Search */}
        <div className="px-5 pt-4 pb-3 bg-[#0e1014] border-b border-white/[0.04] space-y-3 shrink-0">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search links by name, purpose, URL, or category..."
              className="w-full bg-[#15181e] text-xs text-zinc-200 placeholder-zinc-500 pl-10 pr-9 py-2.5 rounded-xl border border-zinc-800/80 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5 rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pb-1">
            {categories.map((cat) => {
              const count =
                cat === 'All' ? links.length : links.filter((l) => l.category === cat).length;
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-lg shrink-0 transition flex items-center space-x-1.5 ${
                    isActive
                      ? 'bg-zinc-800 text-amber-300 border border-amber-500/30 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-amber-400/20 text-amber-300' : 'bg-zinc-800/80 text-zinc-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Links Grid List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {filteredLinks.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center text-zinc-500 mx-auto mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-300">No matching links found</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                No apps matched "{searchQuery}". Try searching with a different term or clear the filter.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="mt-4 px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-medium transition"
              >
                Clear search &amp; filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredLinks.map((item) => {
                const isCopied = copiedId === item.id;
                // Clean host for compact display
                let host = item.url.replace(/^https?:\/\//, '').replace(/\/$/, '');

                return (
                  <div
                    key={item.id}
                    onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                    className="group relative bg-[#14161b] hover:bg-[#181b22] border border-white/[0.06] hover:border-amber-500/30 rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-lg hover:shadow-amber-500/5 hover:-translate-y-0.5"
                  >
                    <div>
                      {/* Top Row: Icon + Badge + Copy */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center space-x-2.5">
                          <div
                            className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-sm ${item.accentColor}`}
                          >
                            {renderIcon(item.iconName)}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-zinc-100 group-hover:text-amber-300 transition-colors">
                              {item.name}
                            </h3>
                            <span className="inline-block text-[10px] font-medium px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50 mt-0.5">
                              {item.tag}
                            </span>
                          </div>
                        </div>

                        {/* Copy Link Button */}
                        <button
                          onClick={(e) => handleCopy(item.id, item.url, e)}
                          title="Copy Link URL"
                          className={`p-1.5 rounded-lg border transition ${
                            isCopied
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-zinc-800/80 text-zinc-400 hover:text-white border-zinc-700/50 hover:bg-zinc-700'
                          }`}
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    {/* Footer Row: Host link + External Action */}
                    <div className="pt-3 mt-3 border-t border-white/[0.04] flex items-center justify-between text-[11px]">
                      <span className="text-zinc-500 font-mono truncate max-w-[190px]" title={item.url}>
                        {host}
                      </span>
                      <div className="flex items-center space-x-1 text-emerald-400 font-medium group-hover:text-emerald-300 transition-colors">
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Sticky Footer */}
        <div className="p-4 border-t border-white/[0.06] bg-[#0c0d11]/90 flex items-center justify-between shrink-0 pb-safe">
          <div className="text-[11px] text-zinc-500 flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Showing {filteredLinks.length} external links (current project excluded)</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition border border-zinc-700/60"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
