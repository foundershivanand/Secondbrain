import React, { useState, useEffect } from 'react';
import { Play, Pause, RefreshCw, CheckCircle2, Lock } from 'lucide-react';
import { api } from '../services/api';

interface ExtractionControlProps {
  onStatusChange?: () => void;
  className?: string;
}

export const ExtractionControl: React.FC<ExtractionControlProps> = ({ onStatusChange, className = '' }) => {
  const [status, setStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const [imagesExtracted, setImagesExtracted] = useState(0);
  const [totalImages, setTotalImages] = useState(3330);
  const [allImagesDone, setAllImagesDone] = useState(false);
  const [isLoadingAction, setIsLoadingAction] = useState(false);

  const fetchStatus = async () => {
    try {
      const data = await api.getExtractionStatus();
      setStatus(data.status);
      setImagesExtracted(data.imagesExtracted);
      if (data.totalKnownImages) setTotalImages(data.totalKnownImages);
      setAllImagesDone(data.allImagesDone);
    } catch {
      // offline / quiet
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = async () => {
    setIsLoadingAction(true);
    try {
      if (status === 'running') {
        await api.stopExtraction();
        setStatus('paused');
      } else {
        await api.startExtraction();
        setStatus('running');
      }
      if (onStatusChange) onStatusChange();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingAction(false);
      fetchStatus();
    }
  };

  const isRunning = status === 'running';

  return (
    <div className={`flex items-center space-x-2 text-xs select-none ${className}`}>
      {/* Status indicator pill */}
      <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-300">
        <span className="relative flex h-2 w-2">
          {isRunning ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </>
          ) : (
            <span className="inline-flex rounded-full h-2 w-2 bg-zinc-500" />
          )}
        </span>

        <span className="font-medium text-zinc-200">
          {isRunning ? 'Extracting Images' : status === 'paused' ? 'Paused' : 'Extraction Idle'}
        </span>

        <span className="text-[11px] font-mono text-zinc-400 border-l border-zinc-800 pl-2">
          {imagesExtracted}/{totalImages}
        </span>

        {!allImagesDone && (
          <span className="flex items-center space-x-1 text-[10px] text-zinc-400 border-l border-zinc-800 pl-2" title="Videos locked until all images complete">
            <Lock className="w-2.5 h-2.5 text-zinc-500" />
            <span>Reels locked</span>
          </span>
        )}
      </div>

      {/* Start / Stop Toggle Button */}
      <button
        onClick={handleToggle}
        disabled={isLoadingAction}
        className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 disabled:opacity-50 ${
          isRunning
            ? 'bg-zinc-800 hover:bg-zinc-700 text-rose-300 border border-zinc-700'
            : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'
        }`}
        title={isRunning ? 'Stop extraction' : 'Start extraction'}
      >
        {isLoadingAction ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        ) : isRunning ? (
          <>
            <Pause className="w-3 h-3 fill-current" />
            <span>Stop</span>
          </>
        ) : (
          <>
            <Play className="w-3 h-3 fill-current" />
            <span>Start</span>
          </>
        )}
      </button>
    </div>
  );
};
