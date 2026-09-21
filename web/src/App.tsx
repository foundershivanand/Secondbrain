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
import { BrainStats } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState('brain');
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [stats, setStats] = useState<BrainStats | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | undefined>(undefined);

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

  const handleNavigateTopic = (topic: string) => {
    setSelectedTopic(topic);
    setActiveTab('knowledge');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-purple-600 selection:text-white pb-20 lg:pb-0">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCapture={() => setIsCaptureOpen(true)}
        stats={stats}
      />

      {/* Main View Area */}
      <main className="flex-1 w-full">
        {activeTab === 'brain' && (
          <BrainChat onNavigateTopic={handleNavigateTopic} />
        )}
        {activeTab === 'inbox' && (
          <Inbox onOpenCapture={() => setIsCaptureOpen(true)} />
        )}
        {activeTab === 'knowledge' && (
          <KnowledgeView
            onOpenCapture={() => setIsCaptureOpen(true)}
            selectedTopic={selectedTopic}
            onClearTopic={() => setSelectedTopic(undefined)}
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
        onClose={() => setIsCaptureOpen(false)}
        onSuccess={() => {
          refreshStats();
        }}
      />
    </div>
  );
}

export default App;
