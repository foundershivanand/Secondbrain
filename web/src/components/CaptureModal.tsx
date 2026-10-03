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
  Play,
  Square,
  Image as ImageIcon,
  AlertCircle,
  SwitchCamera,
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
  const [activeType, setActiveType] = useState<SourceType>('screenshot');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [userNote, setUserNote] = useState('');
  const [importance, setImportance] = useState<number>(7);
  const [rawStorage, setRawStorage] = useState('web');
  const [rawUrl, setRawUrl] = useState('');

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
  const [successData, setSuccessData] = useState<any>(null);
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

  // Cleanup on unmount or modal close
  useEffect(() => {
    return () => {
      stopCameraStream();
      stopAudioRecordingStream();
    };
  }, []);

  if (!isOpen) return null;

  const captureTabs: { type: SourceType; label: string; icon: any }[] = [
    { type: 'screenshot', label: 'Camera & Photos', icon: Camera },
    { type: 'text', label: 'Text / Thought', icon: FileText },
    { type: 'voice', label: 'Voice Memo', icon: Mic },
    { type: 'youtube', label: 'Video / YouTube', icon: Video },
    { type: 'pdf', label: 'PDF Document', icon: FileCode },
    { type: 'url', label: 'Web Article', icon: Link2 },
    { type: 'raw_pointer', label: 'Cloud Pointer', icon: HardDrive },
  ];

  // 1. Handle File Selection (with client-side resizing)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingMedia(true);
    setMediaProcessingStatus('Optimizing photos for mobile upload...');
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
    // Reset file input so user can re-select same file if needed
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

  // 3. Handle Live Voice Recording
  const handleStartRecording = async () => {
    setAudioError(null);
    setRecordedAudioBase64(null);
    setAudioPreviewUrl(null);
    audioChunksRef.current = [];

    try {
      const stream = await requestMicrophoneStream();
      audioStreamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/ogg';

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

        // Stop microphone hardware
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((t) => t.stop());
          audioStreamRef.current = null;
        }
      };

      recorder.start(500); // 500ms chunk interval
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

  // 4. Form Submission
  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setBatchResults([]);

    try {
      if (activeType === 'screenshot' && photos.length > 1) {
        // Multi-photo batch
        const results = [];
        for (let i = 0; i < photos.length; i++) {
          const item = photos[i];
          setLoadingStep(`[${i + 1}/${photos.length}] Analyzing ${item.name} with Gemini...`);

          try {
            const res = await api.capture({
              source_type: 'screenshot',
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
        onSuccess();
      } else {
        // Single Capture
        setLoadingStep('Connecting to Second Brain...');
        setTimeout(() => setLoadingStep('Analyzing with Google Gemini AI...'), 700);
        setTimeout(() => setLoadingStep('Extracting atomic knowledge & concepts...'), 1500);

        let payloadBase64: string | undefined;
        let payloadMime: string | undefined;

        if (activeType === 'screenshot' && photos.length > 0) {
          payloadBase64 = photos[0].base64;
          payloadMime = photos[0].mime;
        } else if (activeType === 'voice' && recordedAudioBase64) {
          payloadBase64 = recordedAudioBase64;
          payloadMime = recordedAudioMime;
        }

        const result = await api.capture({
          source_type: activeType,
          text: text || undefined,
          url: url || undefined,
          user_note: userNote || undefined,
          importance,
          raw_storage: activeType === 'raw_pointer' ? rawStorage : undefined,
          raw_url: rawUrl || undefined,
          base64_data: payloadBase64,
          mime_type: payloadMime,
        });

        setSuccessData(result);
        setIsLoading(false);
        onSuccess();
      }
    } catch (err: any) {
      console.error('Capture error:', err);
      setError(err.message || 'Capture failed. Check your API settings.');
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    stopCameraStream();
    stopAudioRecordingStream();
    setText('');
    setUrl('');
    setUserNote('');
    setPhotos([]);
    setRawUrl('');
    setRecordedAudioBase64(null);
    setAudioPreviewUrl(null);
    setBatchResults([]);
    setSuccessData(null);
    setError(null);
    onClose();
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Universal Quick Capture</h2>
              <p className="text-[11px] text-slate-400">Camera, Voice, Photos & Raw Thought to Knowledge</p>
            </div>
          </div>
          <button
            onClick={resetForm}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition active:scale-95"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 overscroll-contain">
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
                    setPhotos([]);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
                >
                  Capture More
                </button>
                <button
                  onClick={resetForm}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white shadow-lg shadow-purple-600/30 transition"
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
                {successData.knowledge?.core_idea && (
                  <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto italic">
                    "{successData.knowledge?.core_idea}"
                  </p>
                )}
              </div>

              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Vault File:</span>
                  <span className="text-slate-200 font-mono truncate max-w-[240px]">{successData.markdown?.filename}</span>
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
                    setPhotos([]);
                    setRecordedAudioBase64(null);
                    setAudioPreviewUrl(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
                >
                  Capture Another
                </button>
                <button
                  onClick={resetForm}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white shadow-lg shadow-purple-600/30 transition"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCapture} className="space-y-4">
              {/* Type Switcher */}
              <div className="flex flex-wrap gap-1 p-1 bg-slate-950/90 rounded-xl border border-slate-800">
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
                      className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                        isSelected
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* 1. CAMERA & PHOTOS TAB */}
              {activeType === 'screenshot' && (
                <div className="space-y-3">
                  {cameraError && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 text-amber-400 flex-shrink-0" />
                      <span>{cameraError}</span>
                    </div>
                  )}

                  {/* Live Camera View */}
                  {isCameraActive ? (
                    <div className="relative rounded-2xl overflow-hidden bg-black border border-purple-500/40 shadow-xl">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-64 sm:h-80 object-cover bg-black"
                      />
                      <div className="absolute top-3 right-3 flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={handleToggleCameraFacing}
                          className="p-2 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition"
                          title="Switch Camera (Front/Back)"
                        >
                          <SwitchCamera className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={stopCameraStream}
                          className="p-2 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition"
                          title="Close Camera"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Snap Button */}
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                        <button
                          type="button"
                          onClick={handleSnapPhoto}
                          className="flex items-center space-x-2 px-6 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-xl shadow-purple-900/50 active:scale-95 transition ring-4 ring-white/20"
                        >
                          <Camera className="w-5 h-5" />
                          <span>Snap Photo</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Photo Actions Selection */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Live Camera Button (Triggers Camera Permission) */}
                      <button
                        type="button"
                        onClick={() => handleStartCamera('environment')}
                        className="flex items-center justify-center space-x-2.5 p-4 rounded-xl border border-purple-500/30 bg-purple-600/10 hover:bg-purple-600/20 text-purple-200 transition active:scale-98"
                      >
                        <Camera className="w-5 h-5 text-purple-400" />
                        <div className="text-left">
                          <div className="text-xs font-bold text-white">Open Live Camera</div>
                          <div className="text-[10px] text-purple-300/80">Requests camera permission</div>
                        </div>
                      </button>

                      {/* Gallery / File Picker */}
                      <label className="flex items-center justify-center space-x-2.5 p-4 rounded-xl border border-slate-700/80 bg-slate-950/60 hover:bg-slate-900 text-slate-200 transition cursor-pointer active:scale-98">
                        <ImageIcon className="w-5 h-5 text-indigo-400" />
                        <div className="text-left">
                          <div className="text-xs font-bold text-white">Upload from Gallery</div>
                          <div className="text-[10px] text-slate-400">Select screenshots or photos</div>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}

                  {/* Native Mobile Camera Fallback */}
                  {!isCameraActive && (
                    <div className="text-center pt-1">
                      <label className="inline-flex items-center space-x-1.5 text-[11px] text-purple-400 hover:text-purple-300 cursor-pointer underline">
                        <span>Or take photo with native system camera app</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}

                  {/* Processing Status */}
                  {isProcessingMedia && (
                    <div className="flex items-center space-x-2 p-3 rounded-xl bg-purple-950/40 border border-purple-800/40 text-purple-300 text-xs">
                      <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                      <span>{mediaProcessingStatus}</span>
                    </div>
                  )}

                  {/* Selected Photos Grid */}
                  {photos.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-300 font-semibold px-1">
                        <span>Selected Photos ({photos.length}):</span>
                        <button
                          type="button"
                          onClick={() => setPhotos([])}
                          className="text-[11px] text-rose-400 hover:text-rose-300"
                        >
                          Clear all
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-1">
                        {photos.map((photo, idx) => (
                          <div
                            key={idx}
                            className="relative group rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 aspect-video flex items-center justify-center shadow"
                          >
                            <img
                              src={photo.previewUrl}
                              alt={photo.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-90 p-2 flex flex-col justify-between">
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(idx)}
                                className="self-end p-1 rounded-full bg-rose-600/80 text-white hover:bg-rose-600 transition"
                                title="Remove photo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <div className="text-[10px] text-slate-200 font-mono truncate">
                                {photo.sizeMB} MB
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Optional context about this screenshot/photo..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}

              {/* 2. TEXT TAB */}
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

              {/* 3. VOICE MEMO TAB */}
              {activeType === 'voice' && (
                <div className="space-y-3">
                  {audioError && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 text-amber-400 flex-shrink-0" />
                      <span>{audioError}</span>
                    </div>
                  )}

                  {/* Microphone Live Recorder */}
                  <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center space-y-4">
                    {isRecordingAudio ? (
                      <div className="space-y-3 py-2">
                        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-mono font-bold animate-pulse">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                          <span>RECORDING {formatTimer(audioRecordingTime)}</span>
                        </div>
                        <p className="text-xs text-slate-300">Speak clearly into your phone's microphone...</p>
                        <div className="flex justify-center space-x-3 pt-2">
                          <button
                            type="button"
                            onClick={handleStopRecording}
                            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 active:scale-95 transition"
                          >
                            <Square className="w-4 h-4" />
                            <span>Stop & Save Audio</span>
                          </button>
                        </div>
                      </div>
                    ) : recordedAudioBase64 && audioPreviewUrl ? (
                      <div className="space-y-3 py-1">
                        <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                          <span>Voice Recording Ready</span>
                          <span className="font-mono text-slate-400">{formatTimer(audioRecordingTime)}</span>
                        </div>
                        <audio controls src={audioPreviewUrl} className="w-full h-10 rounded-lg" />
                        <div className="flex justify-center space-x-3">
                          <button
                            type="button"
                            onClick={handleDiscardAudio}
                            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-rose-300 transition"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Re-record</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 py-2">
                        <Mic className="w-10 h-10 mx-auto text-rose-400" />
                        <div className="text-xs font-bold text-white">Record Audio with Microphone</div>
                        <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                          Requests microphone permission to transcribe and extract concepts with Gemini AI.
                        </p>
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handleStartRecording}
                            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-rose-600/25 active:scale-95 transition"
                          >
                            <Mic className="w-4 h-4" />
                            <span>Start Microphone Recording</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <textarea
                    rows={2}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Optional notes or transcription context..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}

              {/* 4. YOUTUBE / VIDEO TAB */}
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
                    Gemini extracts spoken concepts, timestamps, and key insights without downloading gigabytes of video to your database.
                  </p>
                </div>
              )}

              {/* 5. PDF TAB */}
              {activeType === 'pdf' && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-300">Upload PDF Document / Whitepaper</label>
                  <div className="border-2 border-dashed border-slate-700/80 hover:border-purple-500/60 rounded-xl p-6 text-center cursor-pointer transition bg-slate-950/40 relative">
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsProcessingMedia(true);
                        setMediaProcessingStatus('Reading PDF document...');
                        try {
                          const base64 = await blobToBase64(file);
                          setPhotos([
                            {
                              name: file.name,
                              mime: 'application/pdf',
                              base64,
                              previewUrl: '',
                              sizeMB: (file.size / (1024 * 1024)).toFixed(2),
                              width: 0,
                              height: 0,
                            },
                          ]);
                        } catch (err: any) {
                          setError('Failed to read PDF: ' + err.message);
                        } finally {
                          setIsProcessingMedia(false);
                          setMediaProcessingStatus('');
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <FileCode className="w-8 h-8 mx-auto text-indigo-400 mb-2" />
                    <p className="text-xs text-slate-300 font-medium">
                      {photos.length > 0 && photos[0].mime === 'application/pdf'
                        ? `${photos[0].name} (${photos[0].sizeMB} MB)`
                        : 'Click to select PDF or whitepaper'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">Untrusted content defense is strictly enforced.</p>
                  </div>
                </div>
              )}

              {/* 6. URL TAB */}
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

              {/* 7. RAW POINTER TAB */}
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
                      >
                      </input>
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

              {/* Context Note (Why did I save this?) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Why did I save this? (Optional Context)</span>
                  <span className="text-[10px] text-purple-400">Provenance & Lineage</span>
                </label>
                <input
                  type="text"
                  value={userNote}
                  onChange={(e) => setUserNote(e.target.value)}
                  placeholder="e.g. Useful for product idea; solves current memory limit"
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

              {/* Action Buttons */}
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
                  disabled={isLoading || isProcessingMedia || (activeType === 'screenshot' && photos.length === 0 && !text)}
                  className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition disabled:opacity-50 active:scale-95"
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
                        {activeType === 'screenshot' && photos.length > 1
                          ? `Extract from ${photos.length} Photos (AI Vision)`
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
