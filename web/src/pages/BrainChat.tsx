import React, { useState, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  ExternalLink,
  BookOpen,
  Clock,
  HelpCircle,
  Flame,
  ArrowRight,
  AlertTriangle,
  Target,
  Compass,
} from 'lucide-react';
import { api } from '../services/api';
import { ChatResponse, CitationSource, BrainState } from '../types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  response?: ChatResponse;
}

export const BrainChat: React.FC<{ onNavigateTopic?: (t: string) => void }> = ({
  onNavigateTopic,
}) => {
  const [inputQuery, setInputQuery] = useState('');
  const [brainState, setBrainState] = useState<BrainState | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        '👋 Welcome to your Personal Intelligence OS. I have loaded your current Brain State, atomic ideas, and long-term memory.\n\nAsk me anything you have learned, or trace how your beliefs have evolved over time.',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDailyBriefOpen, setIsDailyBriefOpen] = useState(false);
  const [briefReport, setBriefReport] = useState<any>(null);
  const [isLoadingBrief, setIsLoadingBrief] = useState(false);

  useEffect(() => {
    api.getBrainState().then((s) => setBrainState(s)).catch(() => {});
  }, []);

  const handleFetchBrief = async () => {
    setIsDailyBriefOpen(true);
    setIsLoadingBrief(true);
    try {
      const res = await api.getDailyBrief();
      setBriefReport(res.report);
    } catch (e: any) {
      alert(`Failed to load Daily Brief: ${e.message}`);
    } finally {
      setIsLoadingBrief(false);
    }
  };

  const samplePrompts = [
    'What playlists do I have on my YouTube profile?',
    'What videos did I watch recently?',
    'What have I learned about AI agent memory?',
    'What SaaS and product opportunities were identified?',
  ];

  const handleSend = async (queryToSend?: string) => {
    const query = queryToSend || inputQuery.trim();
    if (!query || isLoading) return;

    setInputQuery('');
    setMessages((prev) => [...prev, { role: 'user', content: query }]);
    setIsLoading(true);

    try {
      const response = await api.chat(query);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.answer,
          response,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Failed to query your second brain: ${err.message}. Ensure your Worker backend is running.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)] sm:h-[calc(100vh-5rem)] max-w-4xl mx-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
      {/* Compact Brain State Banner (Section 32) */}
      {brainState && (
        <div className="glass-panel p-3 rounded-2xl border border-purple-500/20 bg-purple-950/20 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded-lg bg-purple-600/30 text-purple-300">
              <Target className="w-3.5 h-3.5" />
            </span>
            <span className="font-bold text-slate-200">Active Goals:</span>
            <span className="text-purple-300 font-medium truncate max-w-md">
              {brainState.current_goals?.[0] || 'Build Second Brain'}
            </span>
          </div>

          <div className="flex items-center space-x-3 text-[11px] text-slate-400">
            <span>
              Projects: <strong className="text-white">{brainState.active_projects?.length || 0}</strong>
            </span>
            <span>•</span>
            <span>
              Top Interest:{' '}
              <strong className="text-purple-300">
                {brainState.current_interests?.[0]?.topic || 'AI agents'}
              </strong>
            </span>
            <button
              onClick={handleFetchBrief}
              className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 text-[10px] font-bold transition flex items-center space-x-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>Evolution Brief</span>
            </button>
          </div>
        </div>
      )}

      {/* Evolution Brief Modal */}
      {isDailyBriefOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                  <Sparkles className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">Daily Intelligence & Evolution Brief</h3>
                  <p className="text-xs text-slate-400">Nightly cross-domain pattern matching & gap discovery</p>
                </div>
              </div>
              <button
                onClick={() => setIsDailyBriefOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded bg-slate-800"
              >
                ✕
              </button>
            </div>

            {isLoadingBrief ? (
              <div className="p-8 text-center text-xs text-purple-300 space-y-2">
                <Sparkles className="w-6 h-6 animate-spin mx-auto text-purple-400" />
                <p>Synthesizing cross-source connections and knowledge evolution...</p>
              </div>
            ) : briefReport ? (
              <div className="space-y-4 text-xs">
                {/* Patterns & Opportunities */}
                {briefReport.productOpportunitiesDetected?.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1.5">
                    <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px]">
                      🚀 Product Opportunities Discovered Across Sources
                    </span>
                    <ul className="space-y-1 text-slate-200">
                      {briefReport.productOpportunitiesDetected.map((opp: string, idx: number) => (
                        <li key={idx} className="flex items-start space-x-1.5">
                          <span>💡</span>
                          <span>{opp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Knowledge Gaps */}
                {briefReport.knowledgeGapsIdentified?.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-1.5">
                    <span className="font-bold text-indigo-400 uppercase tracking-wider text-[10px]">
                      🔍 Knowledge Gaps to Investigate
                    </span>
                    <ul className="space-y-1 text-slate-300">
                      {briefReport.knowledgeGapsIdentified.map((gap: string, idx: number) => (
                        <li key={idx}>• {gap}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Markdown Summary */}
                <div className="glass-panel p-4 rounded-xl border border-slate-800 whitespace-pre-wrap text-slate-300 leading-relaxed font-sans">
                  {briefReport.dailyBriefMarkdown}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Sample Question Chips */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-bold text-purple-400 flex items-center space-x-1 shrink-0">
          <Flame className="w-3.5 h-3.5" />
          <span>Try:</span>
        </span>
        {samplePrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            className="text-xs px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-purple-500/40 hover:bg-slate-800/80 transition whitespace-nowrap"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-2">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={idx}
              className={`flex items-start space-x-3 ${
                isUser ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  isUser
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-slate-800 text-purple-400 border border-purple-500/20'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className={`space-y-3 max-w-[85%] ${isUser ? 'items-end' : ''}`}>
                {/* Conflict Detection Card (Section 59) */}
                {msg.response?.conflict_detected && (
                  <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs space-y-1.5 text-amber-200 animate-fade-in">
                    <div className="flex items-center space-x-1.5 font-bold text-amber-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Belief Conflict Detected</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Prior Belief: </span>
                      <span className="line-through text-slate-300">{msg.response.conflict_detected.prior_belief}</span>
                    </div>
                    <div>
                      <span className="text-amber-300 font-semibold">New Evidence: </span>
                      <span>{msg.response.conflict_detected.new_evidence}</span>
                    </div>
                    <div className="text-[11px] text-amber-400/90 italic">
                      💡 {msg.response.conflict_detected.suggested_action}
                    </div>
                  </div>
                )}

                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    isUser
                      ? 'bg-purple-600 text-white rounded-tr-none shadow-md shadow-purple-600/20'
                      : 'glass-panel rounded-tl-none border border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>

                {/* Sources & Provenance Citations (Section 19 & 46) */}
                {msg.response?.sources && msg.response.sources.length > 0 && (
                  <div className="glass-panel p-3.5 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                    <div className="flex items-center space-x-1.5 text-purple-400 font-bold uppercase tracking-wider text-[10px]">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Knowledge Provenance & Sources ({msg.response.sources.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {msg.response.sources.map((src, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-purple-500/30 transition space-y-1"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-bold text-slate-200 truncate">{src.title}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-purple-300 shrink-0">
                              {src.source_type}
                            </span>
                          </div>
                          {src.raw_id && (
                            <div className="text-[10px] font-mono text-emerald-400">
                              Pointer: {src.raw_id} ({src.raw_storage || 'cloud'})
                            </div>
                          )}
                          {src.timestamp && (
                            <div className="flex items-center space-x-1 text-[11px] text-amber-400 font-mono">
                              <Clock className="w-3 h-3" />
                              <span>{src.timestamp}</span>
                            </div>
                          )}
                          {src.snippet && (
                            <p className="text-[11px] text-slate-400 line-clamp-2 italic">
                              "{src.snippet}"
                            </p>
                          )}
                          {(src.original_url || src.raw_url) && (
                            <a
                              href={src.original_url || src.raw_url || '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center space-x-1 text-[10px] text-purple-400 hover:text-purple-300 font-semibold"
                            >
                              <span>Open original</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related Topics WikiLinks */}
                {msg.response && (
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    {msg.response.related_topics?.map((topic, i) => (
                      <span
                        key={i}
                        onClick={() => onNavigateTopic && onNavigateTopic(topic)}
                        className="px-2 py-0.5 rounded-full bg-purple-950/40 text-purple-300 border border-purple-800/40 cursor-pointer hover:bg-purple-900/60 transition"
                      >
                        [[{topic}]]
                      </span>
                    ))}
                  </div>
                )}

                {/* Suggested Questions */}
                {msg.response?.suggested_questions && msg.response.suggested_questions.length > 0 && (
                  <div className="space-y-1 text-xs">
                    <div className="text-slate-500 font-medium text-[11px] flex items-center space-x-1">
                      <HelpCircle className="w-3 h-3" />
                      <span>Suggested Follow-ups:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.response.suggested_questions.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(q)}
                          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-purple-500/30 text-[11px] transition"
                        >
                          <span>{q}</span>
                          <ArrowRight className="w-2.5 h-2.5 text-purple-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center space-x-3 text-xs text-purple-400 glass-panel p-3.5 rounded-xl border border-purple-500/20 max-w-sm animate-pulse">
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>Retrieving Second Brain knowledge & synthesizing answer...</span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="glass-panel p-2 rounded-2xl border border-slate-800 focus-within:border-purple-500/50 transition shadow-2xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask your brain (e.g. What did I learn about AI agent memory?)..."
            className="flex-1 bg-transparent px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading || !inputQuery.trim()}
            className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40 transition shadow-md shadow-purple-600/30"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
