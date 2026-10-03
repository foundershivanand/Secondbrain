import React, { useState, useRef, useEffect } from 'react';
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
  RotateCcw,
  Trash2,
  Square,
  Image as ImageIcon,
  AlertCircle,
  FolderOpen,
} from 'lucide-react';
import { api } from '../services/api';
import { SourceType } from '../types';
import {
  compressImageFile,
  requestCameraStream,
  captureFrameFromVideo,
  requestMicrophoneStream,
  blobToBase64,
  ProcessedImage,
} from '../utils/media';
import { CANONICAL_CATEGORIES } from '../utils/categories';

interface CaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result?: any) => void;
  initialType?: SourceType;
  initialData?: { url?: string; text?: string; title?: string } | null;
  defaultCategory?: string;
}

export const CaptureModal: React.FC<CaptureModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialType = 'text',
  initialData,
  defaultCategory,
}) => {
  const [activeType, setActiveType] = useState<SourceType>(initialType);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [userNote, setUserNote] = useState('');
  const [category, setCategory] = useState<string>(defaultCategory || '');
  const [importance, setImportance] = useState<number>(7);
  const [rawStorage, setRawStorage] = useState('web');
  const [rawUrl, setRawUrl] = useState('');

  // Prefill when opened via Share Target or URL params
  useEffect(() => {
    if (initialData) {
      if (initialData.title) {
        setTitle(initialData.title);
      }
      if (initialData.url) {
        setUrl(initialData.url);
        if (initialData.url.includes('youtube.com') || initialData.url.includes('youtu.be')) {
          setActiveType('youtube');
        } else {
          setActiveType('url');
        }
      }
      if (initialData.text && !initialData.url) {
        const match = initialData.text.match(/https?:\/\/[^\s]+/);
        if (match) {
          setUrl(match[0]);
          const remainingText = initialData.text.replace(match[0], '').trim();
          if (remainingText) setUserNote(remainingText);
          if (match[0].includes('youtube.com') || match[0].includes('youtu.be')) {
            setActiveType('youtube');
          } else {
            setActiveType('url');
          }
        } else {
          setText(initialData.text);
          setActiveType('text');
        }
      } else if (initialData.text && initialData.url) {
        setUserNote(initialData.text);
      }
    }
  }, [initialData]);

  // Selected & Compressed Photos
  const [photos, setPhotos] = useState<ProcessedImage[]>([]);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const [mediaProcessingStatus, setMediaProcessingStatus] = useState('');

  // Live Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Live Voice Recording State
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioRecordingTime, setAudioRecordingTime] = useState(0);
  const [recordedAudioBase64, setRecordedAudioBase64] = useState<string | null>(null);
  const [recordedAudioMime, setRecordedAudioMime] = useState<string>('audio/webm');
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioTimerRef = useRef<number | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // Submission State
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [batchResults, setBatchResults] = useState<{ title: string; filename?: string; isPersonal?: boolean; isDuplicate?: boolean }[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Stop active camera and microphone streams
  const stopCameraStream = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const stopAudioRecordingStream = () => {
    if (audioTimerRef.current) {
      window.clearInterval(audioTimerRef.current);
      audioTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    setIsRecordingAudio(false);
  };

  useEffect(() => {
    if (isOpen) {
      if (initialType) setActiveType(initialType);
      if (defaultCategory) setCategory(defaultCategory);
      setError(null);
      setSuccessToast(null);
    }
  }, [isOpen, initialType, defaultCategory]);

  useEffect(() => {
    return () => {
      stopCameraStream();
      stopAudioRecordingStream();
    };
  }, []);

  if (!isOpen) return null;

  const captureTabs: { type: SourceType; label: string; icon: any }[] = [
    { type: 'text', label: 'Note / Idea', icon: FileText },
    { type: 'url', label: 'Web Link', icon: Link2 },
    { type: 'screenshot', label: 'Camera / Photos', icon: Camera },
    { type: 'voice', label: 'Voice Memo', icon: Mic },
    { type: 'youtube', label: 'YouTube Video', icon: Video },
    { type: 'pdf', label: 'PDF Document', icon: FileCode },
    { type: 'raw_pointer', label: 'Cloud Pointer', icon: HardDrive },
  ];

  // 1. Handle File Selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingMedia(true);
    setMediaProcessingStatus('Optimizing image...');
    setError(null);

    const processedList: ProcessedImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        setMediaProcessingStatus(`Compressing ${file.name} (${i + 1}/${files.length})...`);
        const processed = await compressImageFile(file, 1600, 0.82);
        processedList.push(processed);
      } catch (err: any) {
        console.error('Image compression failed for', file.name, err);
      }
    }

    setPhotos((prev) => [...prev, ...processedList]);
    setIsProcessingMedia(false);
    setMediaProcessingStatus('');
    e.target.value = '';
  };

  // 2. Handle Live Camera Activation
  const handleStartCamera = async (mode: 'environment' | 'user' = cameraFacingMode) => {
    stopCameraStream();
    setCameraError(null);
    setIsCameraActive(true);

    try {
      const stream = await requestCameraStream(mode);
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      setCameraError(err.message || 'Could not start camera.');
      setIsCameraActive(false);
    }
  };

  const handleToggleCameraFacing = () => {
    const nextMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextMode);
    handleStartCamera(nextMode);
  };

  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    try {
      const captured = captureFrameFromVideo(videoRef.current, 1600, 0.85);
      const photoItem: ProcessedImage = {
        name: `Camera_${new Date().toISOString().slice(11, 19).replace(/:/g, '-')}.jpg`,
        mime: captured.mime,
        base64: captured.base64,
        previewUrl: captured.previewUrl,
        sizeMB: captured.sizeMB,
        width: 1280,
        height: 720,
      };

      setPhotos((prev) => [...prev, photoItem]);
      stopCameraStream();
    } catch (err: any) {
      setCameraError('Failed to capture frame: ' + err.message);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // 3. Handle Voice Memo
  const handleStartRecording = async () => {
    setAudioError(null);
    setRecordedAudioBase64(null);
    setAudioPreviewUrl(null);
    audioChunksRef.current = [];

    try {
      const stream = await requestMicrophoneStream();
      audioStreamRef.current = stream;

      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
        else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
        else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
      }

      setRecordedAudioMime(mimeType);

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const previewUrl = URL.createObjectURL(audioBlob);
        setAudioPreviewUrl(previewUrl);

        try {
          const b64 = await blobToBase64(audioBlob);
          setRecordedAudioBase64(b64);
        } catch (b64Err: any) {
          setAudioError('Failed to encode audio: ' + b64Err.message);
        }

        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((t) => t.stop());
          audioStreamRef.current = null;
        }
      };

      recorder.start(500);
      setIsRecordingAudio(true);
      setAudioRecordingTime(0);

      audioTimerRef.current = window.setInterval(() => {
        setAudioRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setAudioError(err.message || 'Microphone access failed.');
      setIsRecordingAudio(false);
    }
  };

  const handleStopRecording = () => {
    if (audioTimerRef.current) {
      window.clearInterval(audioTimerRef.current);
      audioTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingAudio(false);
  };

  const handleDiscardAudio = () => {
    stopAudioRecordingStream();
    setRecordedAudioBase64(null);
    setAudioPreviewUrl(null);
    setAudioRecordingTime(0);
  };

  // 4. Submission
  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setBatchResults([]);

    try {
      if (activeType === 'screenshot' && photos.length > 1) {
        const results = [];
        for (let i = 0; i < photos.length; i++) {
          const item = photos[i];
          setLoadingStep(`Analyzing photo ${i + 1}/${photos.length}...`);

          try {
            const res = await api.capture({
              source_type: 'screenshot',
              title: title.trim() || undefined,
              user_note: userNote || text || undefined,
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
        onSuccess(results);
      } else {
        setLoadingStep('Ingesting into Second Brain...');

        let payloadBase64: string | undefined;
        let payloadMime: string | undefined;

        if (activeType === 'screenshot' && photos.length > 0) {
          payloadBase64 = photos[0].base64;
          payloadMime = photos[0].mime;
        } else if (activeType === 'voice' && recordedAudioBase64) {
          payloadBase64 = recordedAudioBase64;
          payloadMime = recordedAudioMime;
        }

        const noteContext = category
          ? `[Category: ${category}] ${userNote || ''}`.trim()
          : userNote || undefined;

        const result = await api.capture({
          source_type: activeType,
          title: title.trim() || undefined,
          text: text.trim() || undefined,
          url: url.trim() || undefined,
          user_note: noteContext,
          importance,
          raw_storage: activeType === 'raw_pointer' ? rawStorage : undefined,
          raw_url: rawUrl.trim() || undefined,
          base64_data: payloadBase64,
          mime_type: payloadMime,
        });

        setIsLoading(false);
        setSuccessToast(result.isDuplicate ? 'Note already in Second Brain' : 'Captured & Indexed successfully!');

        // Call parent onSuccess immediately to update UI
        onSuccess(result.knowledge || result);

        // Auto-close after brief confirmation
        setTimeout(() => {
          resetForm();
        }, 1100);
      }
    } catch (err: any) {
      console.error('Capture error:', err);
      setError(err.message || 'Capture failed. Check network or settings.');
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    stopCameraStream();
    stopAudioRecordingStream();
    setTitle('');
    setText('');
    setUrl('');
    setUserNote('');
    setPhotos([]);
    setRawUrl('');
    setRecordedAudioBase64(null);
    setAudioPreviewUrl(null);
    setBatchResults([]);
    setSuccessToast(null);
    setError(null);
    onClose();
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-black/75 backdrop-blur-sm sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) resetForm();
      }}
    >
      <div className="relative w-full sm:max-w-xl bg-slate-900 border-t sm:border border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[85vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-purple-600/20 text-purple-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-bold text-white tracking-tight">
              {activeType === 'text' ? 'New Note & Idea' : 'Quick Capture'}
            </h2>
          </div>
          <button
            onClick={resetForm}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Capture Type Selector - Minimal Pill Tabs */}
        <div className="px-4 py-2 border-b border-slate-800/60 bg-slate-950/40 shrink-0 overflow-x-auto scrollbar-none">
          <div className="flex items-center space-x-1 whitespace-nowrap">
            {captureTabs.map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeType === tab.type;
              return (
                <button
                  type="button"
                  key={tab.type}
                  onClick={() => {
                    stopCameraStream();
                    stopAudioRecordingStream();
                    setActiveType(tab.type);
                  }}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                    isSelected
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Body - Scrollable */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 overscroll-contain">
          {successToast ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">{successToast}</h3>
              <p className="text-xs text-slate-400">Vault synced and linked in your Second Brain.</p>
            </div>
          ) : batchResults.length > 0 ? (
            <div className="py-4 space-y-3">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Processed {batchResults.length} photos</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5 max-h-48 overflow-y-auto">
                {batchResults.map((res, i) => (
                  <div key={i} className="flex justify-between items-center py-1 border-b border-slate-800/60 last:border-0">
                    <span className="text-slate-300 truncate max-w-xs">{res.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      Indexed
                    </span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="w-full py-2 rounded-xl bg-purple-600 text-white text-xs font-bold"
              >
                Done
              </button>
            </div>
          ) : (
            <form id="capture-form" onSubmit={handleCapture} className="space-y-3.5">
              {/* NOTE / TEXT TAB */}
              {activeType === 'text' && (
                <div className="space-y-2.5">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Note title (optional, AI generates if blank)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />

                  <textarea
                    required
                    rows={4}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Write your note, idea, or paste content here..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition resize-none leading-relaxed"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Category (Optional)
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                      >
                        <option value="">Auto-classify with Gemini</option>
                        {CANONICAL_CATEGORIES.map((cat) => (
                          <option key={cat.id} value={cat.name}>
                            {cat.icon} {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Context / Why Save?
                      </label>
                      <input
                        type="text"
                        value={userNote}
                        onChange={(e) => setUserNote(e.target.value)}
                        placeholder="Context or reasoning..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* WEB LINK TAB */}
              {activeType === 'url' && (
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Web URL</label>
                    <input
                      type="url"
                      required
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com/article"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Context Note</label>
                    <input
                      type="text"
                      value={userNote}
                      onChange={(e) => setUserNote(e.target.value)}
                      placeholder="Why is this link relevant?"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              )}

              {/* YOUTUBE TAB */}
              {activeType === 'youtube' && (
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">YouTube Video Link</label>
                    <input
                      type="url"
                      required
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Gemini extracts spoken concepts and timestamps without downloading heavy video files.
                  </p>
                </div>
              )}

              {/* CAMERA / PHOTOS TAB */}
              {activeType === 'screenshot' && (
                <div className="space-y-3">
                  {cameraError && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>{cameraError}</span>
                    </div>
                  )}

                  {isCameraActive ? (
                    <div className="relative rounded-xl overflow-hidden bg-black border border-purple-500/40">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-56 object-cover bg-black" />
                      <div className="absolute top-2 right-2 flex space-x-1.5">
                        <button
                          type="button"
                          onClick={handleToggleCameraFacing}
                          className="p-1.5 rounded-full bg-black/60 text-white"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={stopCameraStream}
                          className="p-1.5 rounded-full bg-black/60 text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                        <button
                          type="button"
                          onClick={handleSnapPhoto}
                          className="px-5 py-2 rounded-full bg-purple-600 text-white font-bold text-xs shadow-lg active:scale-95"
                        >
                          Snap Photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleStartCamera('environment')}
                        className="flex flex-col items-center justify-center p-3 rounded-xl border border-purple-500/30 bg-purple-600/10 hover:bg-purple-600/20 text-purple-200 transition"
                      >
                        <Camera className="w-5 h-5 text-purple-400 mb-1" />
                        <span className="text-xs font-semibold">Live Camera</span>
                      </button>

                      <label className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-900 text-slate-300 transition cursor-pointer">
                        <ImageIcon className="w-5 h-5 text-indigo-400 mb-1" />
                        <span className="text-xs font-semibold">Photo Gallery</span>
                        <input type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
                      </label>
                    </div>
                  )}

                  {isProcessingMedia && (
                    <div className="flex items-center space-x-2 text-xs text-purple-300">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{mediaProcessingStatus}</span>
                    </div>
                  )}

                  {photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto">
                      {photos.map((photo, idx) => (
                        <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-800 aspect-video">
                          <img src={photo.previewUrl} alt={photo.name} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(idx)}
                            className="absolute top-1 right-1 p-1 rounded-full bg-rose-600/80 text-white"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Optional notes or context about photo..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}

              {/* VOICE MEMO TAB */}
              {activeType === 'voice' && (
                <div className="space-y-3">
                  {audioError && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
                      {audioError}
                    </div>
                  )}

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-3">
                    {isRecordingAudio ? (
                      <div className="space-y-2">
                        <div className="text-rose-400 text-xs font-mono font-bold animate-pulse">
                          RECORDING {formatTimer(audioRecordingTime)}
                        </div>
                        <button
                          type="button"
                          onClick={handleStopRecording}
                          className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold inline-flex items-center space-x-1.5"
                        >
                          <Square className="w-3.5 h-3.5" />
                          <span>Stop Recording</span>
                        </button>
                      </div>
                    ) : recordedAudioBase64 && audioPreviewUrl ? (
                      <div className="space-y-2">
                        <audio controls src={audioPreviewUrl} className="w-full h-9" />
                        <button
                          type="button"
                          onClick={handleDiscardAudio}
                          className="text-xs text-rose-400 hover:underline"
                        >
                          Re-record
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStartRecording}
                        className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold inline-flex items-center space-x-2"
                      >
                        <Mic className="w-4 h-4" />
                        <span>Start Microphone Recording</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* PDF TAB */}
              {activeType === 'pdf' && (
                <div className="space-y-2.5">
                  <div className="border border-dashed border-slate-800 hover:border-purple-500/60 rounded-xl p-5 text-center relative cursor-pointer bg-slate-950/60">
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsProcessingMedia(true);
                        try {
                          const base64 = await blobToBase64(file);
                          setPhotos([{
                            name: file.name,
                            mime: 'application/pdf',
                            base64,
                            previewUrl: '',
                            sizeMB: (file.size / (1024 * 1024)).toFixed(2),
                            width: 0,
                            height: 0,
                          }]);
                        } catch (err: any) {
                          setError('PDF read error: ' + err.message);
                        } finally {
                          setIsProcessingMedia(false);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <FileCode className="w-6 h-6 mx-auto text-indigo-400 mb-1" />
                    <span className="text-xs text-slate-300">
                      {photos.length > 0 && photos[0].mime === 'application/pdf'
                        ? photos[0].name
                        : 'Choose PDF document'}
                    </span>
                  </div>
                </div>
              )}

              {/* CLOUD POINTER TAB */}
              {activeType === 'raw_pointer' && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">Storage</label>
                      <select
                        value={rawStorage}
                        onChange={(e) => setRawStorage(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                      >
                        <option value="terabox">TeraBox</option>
                        <option value="gdrive">Google Drive</option>
                        <option value="telegram">Telegram</option>
                        <option value="discord">Discord</option>
                        <option value="s3">AWS S3</option>
                        <option value="local">Local Hard Drive</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">Direct Link</label>
                      <input
                        type="text"
                        value={rawUrl}
                        onChange={(e) => setRawUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Key takeaway of this pointer..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>
              )}

              {error && (
                <div className="p-2.5 rounded-xl bg-red-900/30 border border-red-800/50 text-red-200 text-xs">
                  {error}
                </div>
              )}
            </form>
          )}
        </div>

        {/* Modal Sticky Footer - Always Visible Above Keyboard */}
        {!successToast && batchResults.length === 0 && (
          <div className="p-3 sm:px-5 sm:py-3 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between shrink-0 pb-safe">
            <button
              type="button"
              onClick={resetForm}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              form="capture-form"
              disabled={
                isLoading ||
                isProcessingMedia ||
                (activeType === 'screenshot' && photos.length === 0 && !text) ||
                (activeType === 'text' && !text.trim()) ||
                ((activeType === 'url' || activeType === 'youtube') && !url.trim())
              }
              className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition active:scale-95"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{loadingStep || 'Saving...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{activeType === 'text' ? 'Save Note' : 'Capture'}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
