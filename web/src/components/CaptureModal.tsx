import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  FileText,
  Camera,
  Film,
  FileCode,
  Link2,
  Mic,
  Sparkles,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Trash2,
  Square,
  Image as ImageIcon,
  AlertCircle,
  Video,
  Lock,
} from 'lucide-react';
import { api } from '../services/api';
import { SourceType } from '../types';
import {
  compressImageFile,
  requestCameraStream,
  captureFrameFromVideo,
  requestMicrophoneStream,
  blobToBase64,
  extractVideoKeyframes,
  ProcessedImage,
  VideoKeyframe,
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

  // Selected Media / Video / Image
  const [photos, setPhotos] = useState<ProcessedImage[]>([]);
  const [videoFile, setVideoFile] = useState<{ name: string; base64: string; mime: string; sizeMB: string } | null>(null);
  const [videoKeyframes, setVideoKeyframes] = useState<VideoKeyframe[]>([]);
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
      } catch {}
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
      if (defaultCategory !== undefined) setCategory(defaultCategory);
      setError(null);
      setSuccessToast(null);
      setIsLoading(false);
    }
  }, [isOpen, initialType, defaultCategory]);

  // Auto-detect Instagram Reel or YouTube URL on input
  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    const trimmed = newUrl.trim().toLowerCase();
    if (trimmed.includes('instagram.com/reel') || trimmed.includes('instagram.com/p/') || trimmed.includes('instagram.com/share') || trimmed.includes('instagr.am')) {
      setActiveType('reel');
      if (!category) setCategory('Content, Reels & Creative Media');
    } else if (trimmed.includes('tiktok.com')) {
      setActiveType('reel');
      if (!category) setCategory('Content, Reels & Creative Media');
    } else if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
      setActiveType('youtube');
      if (!category) setCategory('YouTube');
    }
  };

  // Prefill when opened via Share Target or URL params
  useEffect(() => {
    if (initialData) {
      if (initialData.title) setTitle(initialData.title);
      if (initialData.url) {
        handleUrlChange(initialData.url);
      }
      if (initialData.text && !initialData.url) {
        const match = initialData.text.match(/https?:\/\/[^\s]+/);
        if (match) {
          handleUrlChange(match[0]);
          const remainingText = initialData.text.replace(match[0], '').trim();
          if (remainingText) setUserNote(remainingText);
        } else {
          setText(initialData.text);
          setActiveType('text');
        }
      } else if (initialData.text && initialData.url) {
        setUserNote(initialData.text);
      }
    }
  }, [initialData]);

  useEffect(() => {
    return () => {
      stopCameraStream();
      stopAudioRecordingStream();
    };
  }, []);

  if (!isOpen) return null;

  // Streamlined 6 Core Tabs
  const captureTabs: { type: SourceType; label: string; icon: any }[] = [
    { type: 'text', label: 'Thought', icon: FileText },
    { type: 'reel', label: 'Instagram Reel', icon: Film },
    { type: 'url', label: 'Link', icon: Link2 },
    { type: 'screenshot', label: 'Photo / Scan', icon: Camera },
    { type: 'voice', label: 'Voice', icon: Mic },
    { type: 'pdf', label: 'PDF', icon: FileCode },
  ];

  // 1. Handle Image Selection
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // 2. Handle Reel Video Selection with lightweight keyframe sampling
  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingMedia(true);
    setMediaProcessingStatus('Extracting video keyframes...');
    setError(null);

    try {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      // Sample 4 lightweight keyframes (<100KB each) to prevent Cloudflare Worker memory crashes and fetch failed errors
      const { frames, durationSec } = await extractVideoKeyframes(file, 4, 1080);
      setVideoKeyframes(frames);
      setVideoFile({
        name: file.name,
        base64: frames[0]?.base64 || '',
        mime: 'image/jpeg',
        sizeMB,
      });
      setActiveType('reel');
    } catch (err: any) {
      setError('Video read notice: ' + (err.message || 'Could not sample video frames.'));
    } finally {
      setIsProcessingMedia(false);
      setMediaProcessingStatus('');
    }
  };

  // 3. Live Camera
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

  // 4. Voice Recording
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

  // 5. Submit Capture to Second Brain
  const handleCapture = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isLoading) return;

    let contentText = text.trim();
    const contentTitle = title.trim();
    if (activeType === 'text' && !contentText && contentTitle) {
      contentText = contentTitle;
    }

    if (activeType === 'text' && !contentText) {
      setError('Please write a thought or enter a title.');
      return;
    }

    if ((activeType === 'url' || activeType === 'reel') && !url.trim() && !contentText && !videoFile && photos.length === 0) {
      setError('Please enter an Instagram Reel link or upload the video clip.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingStep('Extracting knowledge with Gemini...');

    try {
      let payloadBase64: string | undefined;
      let payloadMime: string | undefined;
      let payloadVideoFrames: string[] | undefined;

      if (videoKeyframes.length > 0) {
        payloadBase64 = videoKeyframes[0].base64;
        payloadMime = 'image/jpeg';
        payloadVideoFrames = videoKeyframes.map((f) => f.base64);
      } else if (videoFile) {
        payloadBase64 = videoFile.base64;
        payloadMime = videoFile.mime;
      } else if (activeType === 'screenshot' && photos.length > 0) {
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
        title: contentTitle || undefined,
        text: contentText || undefined,
        url: url.trim() || undefined,
        user_note: noteContext,
        importance,
        base64_data: payloadBase64,
        mime_type: payloadMime,
        video_frames: payloadVideoFrames,
      });

      setIsLoading(false);
      setSuccessToast(
        result.isDuplicate
          ? 'Note already indexed in Second Brain'
          : `Extracted: "${result.knowledge?.title || 'Knowledge Note'}"`
      );

      onSuccess(result.knowledge || result);

      setTimeout(() => {
        resetForm();
      }, 1000);
    } catch (err: any) {
      console.error('Capture error:', err);
      setError(err.message || 'Capture failed. Check connection.');
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
    setVideoFile(null);
    setRecordedAudioBase64(null);
    setAudioPreviewUrl(null);
    setSuccessToast(null);
    setError(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-black/80 backdrop-blur-md sm:p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) resetForm();
      }}
    >
      <div className="relative w-full sm:max-w-xl bg-[#0f1118] border-t sm:border border-white/[0.08] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[85vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-[#090a0e]/70 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20">
              <Sparkles className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-semibold text-white tracking-tight">
              Capture &amp; Extract
            </h2>
          </div>
          <button
            onClick={resetForm}
            disabled={isLoading}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Minimal Pill Tabs */}
        <div className="px-5 py-2.5 border-b border-white/[0.06] bg-[#090a0e]/40 shrink-0 overflow-x-auto scrollbar-none">
          <div className="flex items-center space-x-1.5 whitespace-nowrap">
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
                    if (tab.type === 'reel' && !category) {
                      setCategory('Content, Reels & Creative Media');
                    }
                  }}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                    isSelected
                      ? 'bg-white text-zinc-950 font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Body */}
        {successToast ? (
          <div className="p-8 text-center space-y-3 flex-1 flex flex-col justify-center items-center animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-white">{successToast}</h3>
            <p className="text-xs text-zinc-400">Structured note &amp; provenance pointer saved in Obsidian.</p>
          </div>
        ) : (
          <form id="capture-form" onSubmit={handleCapture} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="p-5 overflow-y-auto flex-1 overscroll-contain space-y-3.5">
              {/* 1. INSTAGRAM REEL TAB */}
              {activeType === 'reel' && (
                <div className="space-y-3 animate-fade-in">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Instagram Reel URL
                    </label>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      placeholder="https://www.instagram.com/reel/..."
                      className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center space-x-2 text-[11px] text-zinc-600">
                    <span className="flex-1 border-t border-zinc-800" />
                    <span>OR UPLOAD VIDEO</span>
                    <span className="flex-1 border-t border-zinc-800" />
                  </div>

                  <label className="flex items-center justify-center space-x-2 p-3.5 rounded-2xl border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:text-white transition cursor-pointer text-xs">
                    <Video className="w-4 h-4 text-emerald-400" />
                    <span>
                      {videoFile ? `${videoFile.name} (${videoFile.sizeMB} MB)` : 'Choose reel or video file (.mp4, .mov)'}
                    </span>
                    <input type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />
                  </label>

                  {videoKeyframes.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                        Sampled Keyframes ({videoKeyframes.length})
                      </span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {videoKeyframes.map((kf, idx) => (
                          <div key={idx} className="relative rounded-lg overflow-hidden border border-zinc-800 aspect-video bg-black">
                            <img src={kf.previewUrl} alt={`Frame ${idx + 1}`} className="w-full h-full object-cover" />
                            <span className="absolute bottom-0.5 right-1 text-[9px] font-mono text-white/90 bg-black/70 px-1 rounded">
                              {kf.timestampSec}s
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <textarea
                    rows={2}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Optional notes or caption..."
                    className="w-full glass-input rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none resize-none"
                  />
                </div>
              )}

              {/* 2. NOTE / THOUGHT TAB */}
              {activeType === 'text' && (
                <div className="space-y-3 animate-fade-in">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title (optional, auto-generated by AI if blank)..."
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-semibold text-white placeholder-slate-500 focus:outline-none"
                  />

                  <textarea
                    required
                    rows={4}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="What is on your mind? Write your note, paste quotes, or draft ideas..."
                    className="w-full glass-input rounded-2xl p-3.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
                  />
                </div>
              )}

              {/* 3. WEB / ARTICLE LINK */}
              {activeType === 'url' && (
                <div className="space-y-3 animate-fade-in">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Web Link</label>
                    <input
                      type="url"
                      required
                      value={url}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      placeholder="https://example.com/article"
                      className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                  <input
                    type="text"
                    value={userNote}
                    onChange={(e) => setUserNote(e.target.value)}
                    placeholder="Why are you saving this link? (Context)"
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
              )}

              {/* 4. PHOTO / CAMERA TAB */}
              {activeType === 'screenshot' && (
                <div className="space-y-3 animate-fade-in">
                  {cameraError && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>{cameraError}</span>
                    </div>
                  )}

                  {isCameraActive ? (
                    <div className="relative rounded-2xl overflow-hidden bg-black border border-white/20">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-52 object-cover bg-black" />
                      <div className="absolute top-2 right-2 flex space-x-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const next = cameraFacingMode === 'environment' ? 'user' : 'environment';
                            setCameraFacingMode(next);
                            handleStartCamera(next);
                          }}
                          className="p-1.5 rounded-full bg-black/60 text-white"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={stopCameraStream} className="p-1.5 rounded-full bg-black/60 text-white">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                        <button
                          type="button"
                          onClick={handleSnapPhoto}
                          className="px-5 py-2 rounded-full bg-white text-zinc-950 font-bold text-xs shadow-lg active:scale-95"
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
                        className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 transition"
                      >
                        <Camera className="w-5 h-5 text-amber-400 mb-1" />
                        <span className="text-xs font-semibold">Live Camera</span>
                      </button>

                      <label className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-white/[0.08] bg-zinc-900/40 hover:bg-zinc-900 text-zinc-300 transition cursor-pointer">
                        <ImageIcon className="w-5 h-5 text-amber-400 mb-1" />
                        <span className="text-xs font-semibold">Gallery</span>
                        <input type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
                      </label>
                    </div>
                  )}

                  {photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto">
                      {photos.map((photo, idx) => (
                        <div key={idx} className="relative rounded-xl overflow-hidden border border-white/[0.08] aspect-video">
                          <img src={photo.previewUrl} alt={photo.name} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
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
                    placeholder="Optional: Context or note about photo..."
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
              )}

              {/* 5. VOICE MEMO TAB */}
              {activeType === 'voice' && (
                <div className="space-y-3 text-center p-4 rounded-2xl bg-slate-900/40 border border-white/[0.06] animate-fade-in">
                  {isRecordingAudio ? (
                    <div className="space-y-3">
                      <div className="text-rose-400 text-xs font-mono font-bold animate-pulse">
                        RECORDING {Math.floor(audioRecordingTime / 60)}:{(audioRecordingTime % 60).toString().padStart(2, '0')}
                      </div>
                      <button
                        type="button"
                        onClick={handleStopRecording}
                        className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold inline-flex items-center space-x-1.5 shadow-lg active:scale-95"
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
                        onClick={() => {
                          setRecordedAudioBase64(null);
                          setAudioPreviewUrl(null);
                        }}
                        className="text-xs text-rose-400 hover:underline"
                      >
                        Re-record
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      className="px-5 py-3 rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-600 text-white text-xs font-bold inline-flex items-center space-x-2 shadow-lg shadow-rose-600/20 active:scale-95 transition"
                    >
                      <Mic className="w-4 h-4" />
                      <span>Start Voice Recording</span>
                    </button>
                  )}
                </div>
              )}

              {/* 6. PDF DOCUMENT TAB */}
              {activeType === 'pdf' && (
                <div className="space-y-3 animate-fade-in">
                  <label className="border border-dashed border-white/[0.12] hover:border-white/30 rounded-2xl p-6 text-center block cursor-pointer bg-zinc-900/40 transition">
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
                      className="hidden"
                    />
                    <FileCode className="w-6 h-6 mx-auto text-sky-400 mb-1.5" />
                    <span className="text-xs text-zinc-300 font-medium">
                      {photos.length > 0 && photos[0].mime === 'application/pdf'
                        ? photos[0].name
                        : 'Choose PDF document'}
                    </span>
                  </label>
                </div>
              )}

              {/* Category & Context Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-white/[0.06]">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none"
                  >
                    <option value="">Auto-classify (AI)</option>
                    {CANONICAL_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    User Thought / Why Saved
                  </label>
                  <input
                    type="text"
                    value={userNote}
                    onChange={(e) => setUserNote(e.target.value)}
                    placeholder="Your thought on this..."
                    className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Modal Sticky Footer */}
            <div className="p-4 border-t border-white/[0.06] bg-[#090a0e]/85 flex items-center justify-between shrink-0 pb-safe">
              <button
                type="button"
                onClick={resetForm}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                onClick={(e) => handleCapture(e)}
                disabled={isLoading || isProcessingMedia}
                className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:opacity-50 text-zinc-950 font-semibold text-xs shadow-sm transition-all duration-150 active:scale-95 border border-emerald-400/20"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-950" />
                    <span>{loadingStep || 'Extracting...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-zinc-950 stroke-[2.2]" />
                    <span>Extract Knowledge</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
