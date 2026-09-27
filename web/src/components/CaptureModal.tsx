import React, { useState } from 'react';
import {
  X,
  FileText,
  Camera,
  Video,
  FileCode,
  Link2,
  Mic,
  HardDrive,
  Sparkles,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { api } from '../services/api';
import { SourceType } from '../types';

interface CaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CaptureModal: React.FC<CaptureModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [activeType, setActiveType] = useState<SourceType>('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [userNote, setUserNote] = useState('');
  const [importance, setImportance] = useState<number>(7);
  const [rawStorage, setRawStorage] = useState('web');
  const [rawUrl, setRawUrl] = useState('');
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileMime, setFileMime] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [successData, setSuccessData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const captureTabs: { type: SourceType; label: string; icon: any }[] = [
    { type: 'text', label: 'Text / Thought', icon: FileText },
    { type: 'screenshot', label: 'Screenshot', icon: Camera },
    { type: 'youtube', label: 'Video / YouTube', icon: Video },
    { type: 'pdf', label: 'PDF Document', icon: FileCode },
    { type: 'url', label: 'Web Article', icon: Link2 },
    { type: 'voice', label: 'Voice Memo', icon: Mic },
    { type: 'raw_pointer', label: 'Cloud Pointer', icon: HardDrive },
  ];

  const [queuedFiles, setQueuedFiles] = useState<{ name: string; mime: string; base64: string; sizeMB: string }[]>([]);
  const [batchResults, setBatchResults] = useState<{ title: string; filename?: string; isPersonal?: boolean; isDuplicate?: boolean }[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length === 1) {
      const file = files[0];
      setFileName(file.name);
      setFileMime(file.type);
      setQueuedFiles([]);

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setFileBase64(base64);
      };
      reader.readAsDataURL(file);
    } else {
      // Multi-file batch
      const items: { name: string; mime: string; base64: string; sizeMB: string }[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
        items.push({
          name: file.name,
          mime: file.type || 'image/jpeg',
          base64,
          sizeMB: (file.size / (1024 * 1024)).toFixed(2),
        });
      }
      setQueuedFiles(items);
      setFileName(`${items.length} photos selected`);
    }
  };

  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setBatchResults([]);

    try {
      if (queuedFiles.length > 1) {
        // Multi-file batch processing
        const results = [];
        for (let i = 0; i < queuedFiles.length; i++) {
          const item = queuedFiles[i];
          setLoadingStep(`[${i + 1}/${queuedFiles.length}] Analyzing ${item.name} with Gemini...`);

          try {
            const res = await api.capture({
              source_type: activeType,
              user_note: userNote || undefined,
              importance,
              base64_data: item.base64,
              mime_type: item.mime,
            });

            results.push({
              title: res.knowledge?.title || item.name,
              filename: res.markdown?.filename,
              isPersonal: res.source?.status === 'IGNORED_PERSONAL_MEDIA',
              isDuplicate: res.isDuplicate,
            });
          } catch (itemErr: any) {
            results.push({
              title: item.name,
              filename: itemErr.message,
              isPersonal: false,
            });
          }
        }

        setBatchResults(results);
        setIsLoading(false);
        onSuccess();
      } else {
        // Single file / item
        setLoadingStep('Uploading to Cloudflare Worker...');
        setTimeout(() => setLoadingStep('Analyzing with Google Gemini AI...'), 700);
        setTimeout(() => setLoadingStep('Extracting atomic knowledge & relationships...'), 1400);
        setTimeout(() => setLoadingStep('Generating Obsidian Markdown note & indexing D1...'), 2100);

        const result = await api.capture({
          source_type: activeType,
          text: text || undefined,
          url: url || undefined,
          user_note: userNote || undefined,
          importance,
          raw_storage: activeType === 'raw_pointer' ? rawStorage : undefined,
          raw_url: rawUrl || undefined,
          base64_data: fileBase64 || undefined,
          mime_type: fileMime || undefined,
        });

        setSuccessData(result);
        setIsLoading(false);
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Capture failed');
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setText('');
    setUrl('');
    setUserNote('');
    setFileBase64(null);
    setFileMime(null);
    setFileName(null);
    setRawUrl('');
    setQueuedFiles([]);
    setBatchResults([]);
    setSuccessData(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Universal Quick Capture</h2>
              <p className="text-xs text-slate-400">Transform any raw input into compressed knowledge</p>
            </div>
          </div>
          <button
            onClick={resetForm}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {batchResults.length > 0 ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Batch Capture Complete!</h3>
                <p className="text-xs text-purple-300 font-semibold mt-1">
                  Processed {batchResults.length} photos with Gemini Vision
                </p>
              </div>

              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 text-left text-xs space-y-2 max-h-60 overflow-y-auto">
                {batchResults.map((res, i) => (
                  <div key={i} className="flex items-center justify-between py-1 border-b border-slate-800/60 last:border-0">
                    <span className="text-slate-200 font-medium truncate max-w-xs">{res.title}</span>
                    {res.isPersonal ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">Personal Photo (Skipped)</span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">Note Created</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-center space-x-3 pt-2">
                <button
                  onClick={() => {
                    setBatchResults([]);
                    setQueuedFiles([]);
                    setFileName(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
                >
                  Capture More
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white shadow-lg shadow-purple-600/30 transition"
                >
                  Done
                </button>
              </div>
            </div>
          ) : successData ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {successData.isDuplicate ? 'Already in Second Brain' : 'Captured & Indexed!'}
                </h3>
                <p className="text-sm text-purple-300 font-semibold mt-1">
                  {successData.knowledge?.title}
                </p>
                <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto italic">
                  "{successData.knowledge?.core_idea}"
                </p>
              </div>

              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Vault File:</span>
                  <span className="text-slate-200 font-mono">{successData.markdown?.filename}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Knowledge ID:</span>
                  <span className="text-purple-400 font-mono">{successData.knowledge?.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Storage Strategy:</span>
                  <span className="text-emerald-400 font-semibold">Pointer & Compressed Index</span>
                </div>
              </div>

              <div className="flex justify-center space-x-3 pt-2">
                <button
                  onClick={() => {
                    setSuccessData(null);
                    setText('');
                    setUrl('');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
                >
                  Capture Another
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white shadow-lg shadow-purple-600/30 transition"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCapture} className="space-y-4">
              {/* Type Switcher */}
              <div className="flex flex-wrap gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
                {captureTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isSelected = activeType === tab.type;
                  return (
                    <button
                      type="button"
                      key={tab.type}
                      onClick={() => setActiveType(tab.type)}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        isSelected
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Input based on Type */}
              {activeType === 'text' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Thought, Idea, or Note
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="e.g. This idea could be a SaaS. Retrieval-based agents should decouple storage from reasoning..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition font-sans"
                  />
                </div>
              )}

              {activeType === 'screenshot' && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-300">
                    Upload Screenshots or Photos {queuedFiles.length > 0 && `(${queuedFiles.length} selected)`}
                  </label>
                  <div className="border-2 border-dashed border-slate-700/80 hover:border-purple-500/60 rounded-xl p-6 text-center cursor-pointer transition bg-slate-950/40 relative">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Camera className="w-8 h-8 mx-auto text-purple-400 mb-2" />
                    <p className="text-xs text-slate-300 font-medium">
                      {fileName || 'Click to select 1 or multiple photos from phone or PC'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Gemini Vision extracts diagrams, ideas, text, & UI patterns. Personal family photos are automatically filtered out.
                    </p>
                  </div>

                  {queuedFiles.length > 1 && (
                    <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5 max-h-36 overflow-y-auto">
                      <div className="text-[11px] font-semibold text-purple-300 flex justify-between">
                        <span>Queued for Vision Processing:</span>
                        <span>{queuedFiles.length} photos</span>
                      </div>
                      {queuedFiles.map((q, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[11px] text-slate-300">
                          <span className="truncate max-w-[200px]">{q.name}</span>
                          <span className="text-slate-500 text-[10px] font-mono">{q.sizeMB} MB</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Optional: Add context about these photos"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}

              {activeType === 'youtube' && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-300">YouTube or Video URL</label>
                  <input
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <p className="text-[11px] text-slate-400">
                    Gemini extracts spoken concepts, scene transitions, and timestamped bookmarks without downloading gigabytes of video to your database.
                  </p>
                </div>
              )}

              {activeType === 'pdf' && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-300">Upload PDF Document / Whitepaper</label>
                  <div className="border-2 border-dashed border-slate-700/80 hover:border-purple-500/60 rounded-xl p-6 text-center cursor-pointer transition bg-slate-950/40 relative">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <FileCode className="w-8 h-8 mx-auto text-indigo-400 mb-2" />
                    <p className="text-xs text-slate-300 font-medium">
                      {fileName || 'Click to select PDF or whitepaper'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">Untrusted content defense is strictly enforced.</p>
                  </div>
                </div>
              )}

              {activeType === 'url' && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-300">Web Article or Resource Link</label>
                  <input
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/article"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}

              {activeType === 'voice' && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-300">Voice Note or Audio</label>
                  <div className="border-2 border-dashed border-slate-700/80 hover:border-purple-500/60 rounded-xl p-5 text-center cursor-pointer transition bg-slate-950/40 relative">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Mic className="w-8 h-8 mx-auto text-rose-400 mb-2" />
                    <p className="text-xs text-slate-300 font-medium">
                      {fileName || 'Upload voice recording or audio memo'}
                    </p>
                  </div>
                  <textarea
                    rows={2}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Or type rough voice transcript notes here..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}

              {activeType === 'raw_pointer' && (
                <div className="space-y-3">
                  <div className="p-3 bg-purple-950/30 border border-purple-800/40 rounded-xl text-xs text-purple-200">
                    💡 <strong>Pointer Architecture:</strong> Large 100 GB+ files stay in TeraBox, Google Drive, Telegram, or Discord. Your Second Brain only indexes compressed insights and keeps this pointer.
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Storage Provider</label>
                      <select
                        value={rawStorage}
                        onChange={(e) => setRawStorage(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                      >
                        <option value="terabox">TeraBox</option>
                        <option value="gdrive">Google Drive</option>
                        <option value="telegram">Telegram</option>
                        <option value="discord">Discord</option>
                        <option value="s3">AWS S3 / Wasabi</option>
                        <option value="local">Local Hard Drive</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Direct Pointer Link / Path</label>
                      <input
                        type="text"
                        value={rawUrl}
                        onChange={(e) => setRawUrl(e.target.value)}
                        placeholder="https://terabox.com/s/... or /media/archive/..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Summary or key takeaway of this large file..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}

              {/* "Why did I save this?" Field (Section 20) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Why did I save this? (Optional Context)</span>
                  <span className="text-[10px] text-purple-400">Critical for Lineage</span>
                </label>
                <input
                  type="text"
                  value={userNote}
                  onChange={(e) => setUserNote(e.target.value)}
                  placeholder="e.g. Useful for Product Factory; solves current agent memory limit"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Importance Slider */}
              <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <span className="text-xs font-medium text-slate-300">Importance Rating</span>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={importance}
                    onChange={(e) => setImportance(Number(e.target.value))}
                    className="w-28 accent-purple-500"
                  />
                  <span className="text-xs font-bold text-purple-400 font-mono w-6 text-right">
                    {importance}/10
                  </span>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-900/30 border border-red-800/50 text-red-200 text-xs">
                  {error}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{loadingStep}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {queuedFiles.length > 1
                          ? `Extract from ${queuedFiles.length} Photos (AI Vision)`
                          : 'Ingest into Second Brain'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
