import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { CaptureModal } from './components/CaptureModal';
import { BrainChat } from './pages/BrainChat';
import { Inbox } from './pages/Inbox';
import { KnowledgeView } from './pages/KnowledgeView';
import { TopicsGraph } from './pages/TopicsGraph';
import { IdeasFactory } from './pages/IdeasFactory';
import { MemoriesView } from './pages/MemoriesView';
import { SourcesView } from './pages/SourcesView';
import { Settings } from './pages/Settings';
import { api } from './services/api';
import { BrainStats, SourceType, KnowledgeRecord } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState('brain');
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [stats, setStats] = useState<BrainStats | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | undefined>(undefined);
  const [shareData, setShareData] = useState<{ url?: string; text?: string; title?: string } | null>(null);
  const [captureType, setCaptureType] = useState<SourceType>('text');
  const [captureCategory, setCaptureCategory] = useState<string | undefined>(undefined);
  const [knowledgeRefreshKey, setKnowledgeRefreshKey] = useState(0);
  const [newlyCreatedNote, setNewlyCreatedNote] = useState<KnowledgeRecord | null>(null);

  // Detect Share Target from mobile OS (Android / iOS share sheet)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const url = params.get('url') || params.get('link');
      const text = params.get('text');
      const title = params.get('title');

      if (url || text || title) {
        setShareData({
          url: url || undefined,
          text: text || undefined,
          title: title || undefined,
        });
        setIsCaptureOpen(true);
        // Clean URL params without page reload
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const refreshStats = async () => {
    try {
      const res = await api.getStats();
      setStats(res);
    } catch {
      // API not yet ready or offline in dev
    }
  };

  useEffect(() => {
    refreshStats();
  }, [activeTab]);

  const handleOpenCapture = (type: SourceType = 'text', category?: string) => {
    setCaptureType(type);
    setCaptureCategory(category);
    setIsCaptureOpen(true);
  };

  const handleCaptureSuccess = (result?: any) => {
    refreshStats();
    setKnowledgeRefreshKey((prev) => prev + 1);
    if (result && result.id && typeof result.id === 'string' && result.id.startsWith('KN-')) {
      setNewlyCreatedNote(result);
    }
  };

  const handleNavigateTopic = (topic: string) => {
    setSelectedTopic(topic);
    setActiveTab('knowledge');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-purple-600 selection:text-white pb-16 md:pb-0">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCapture={() => handleOpenCapture('text')}
        stats={stats}
      />

      {/* Main View Area */}
      <main className="flex-1 w-full">
        {activeTab === 'brain' && (
          <BrainChat onNavigateTopic={handleNavigateTopic} />
        )}
        {activeTab === 'inbox' && (
          <Inbox onOpenCapture={() => handleOpenCapture('text')} />
        )}
        {activeTab === 'knowledge' && (
          <KnowledgeView
            onOpenCapture={handleOpenCapture}
            selectedTopic={selectedTopic}
            onClearTopic={() => setSelectedTopic(undefined)}
            refreshTrigger={knowledgeRefreshKey}
            newNoteItem={newlyCreatedNote}
          />
        )}
        {activeTab === 'topics' && (
          <TopicsGraph onSelectTopic={handleNavigateTopic} />
        )}
        {activeTab === 'ideas' && <IdeasFactory />}
        {activeTab === 'memories' && <MemoriesView />}
        {activeTab === 'sources' && <SourcesView />}
        {activeTab === 'settings' && <Settings />}
      </main>

      {/* Quick Capture Modal */}
      <CaptureModal
        isOpen={isCaptureOpen}
        initialType={captureType}
        initialData={shareData}
        defaultCategory={captureCategory}
        onClose={() => {
          setIsCaptureOpen(false);
          setShareData(null);
          setCaptureCategory(undefined);
        }}
        onSuccess={handleCaptureSuccess}
      />
    </div>
  );
}

export default App;
