/**
 * Media & Permissions Utility
 * Handles camera/microphone permissions, live capture streams, and mobile client-side image compression
 */

export interface ProcessedImage {
  name: string;
  mime: string;
  base64: string;
  previewUrl: string;
  sizeMB: string;
  width: number;
  height: number;
}

/**
 * Compresses and downscales an image file using an offscreen canvas
 * Prevents mobile memory overload and converts 15MB+ camera photos to ~200-400KB
 */
export async function compressImageFile(
  file: File,
  maxDimension: number = 1600,
  quality: number = 0.82
): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    // If not an image (e.g. invalid), reject
    if (!file.type.startsWith('image/')) {
      return reject(new Error(`File ${file.name} is not an image`));
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Downscale while preserving aspect ratio
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          return reject(new Error('Canvas 2D context not available'));
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to optimized JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.split(',')[1];
        const sizeBytes = Math.round((base64.length * 3) / 4);
        const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);

        URL.revokeObjectURL(objectUrl);

        resolve({
          name: file.name,
          mime: 'image/jpeg',
          base64,
          previewUrl: dataUrl,
          sizeMB,
          width,
          height,
        });
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to decode image: ${file.name}`));
    };

    img.src = objectUrl;
  });
}

/**
 * Check if the browser supports media devices / getUserMedia
 */
export function isMediaDevicesSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia;
}

/**
 * Request camera access and return video stream
 */
export async function requestCameraStream(facingMode: 'environment' | 'user' = 'environment'): Promise<MediaStream> {
  if (!isMediaDevicesSupported()) {
    throw new Error('Camera access is not supported by this browser. Use the file upload button.');
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    });
  } catch (err: any) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      throw new Error('Camera permission was denied. Please allow camera permissions in your browser or phone site settings.');
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      throw new Error('No camera found on this device.');
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      throw new Error('Camera is currently in use by another application.');
    }
    throw new Error(err.message || 'Unable to access camera.');
  }
}

/**
 * Capture a single still frame from an active video element
 */
export function captureFrameFromVideo(
  videoElement: HTMLVideoElement,
  maxDimension: number = 1600,
  quality: number = 0.85
): { base64: string; previewUrl: string; mime: string; sizeMB: string } {
  const width = videoElement.videoWidth || 1280;
  const height = videoElement.videoHeight || 720;

  let targetWidth = width;
  let targetHeight = height;

  if (targetWidth > maxDimension || targetHeight > maxDimension) {
    if (targetWidth > targetHeight) {
      targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
      targetWidth = maxDimension;
    } else {
      targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
      targetHeight = maxDimension;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.drawImage(videoElement, 0, 0, targetWidth, targetHeight);

  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const base64 = dataUrl.split(',')[1];
  const sizeBytes = Math.round((base64.length * 3) / 4);
  const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);

  return {
    base64,
    previewUrl: dataUrl,
    mime: 'image/jpeg',
    sizeMB,
  };
}

/**
 * Request microphone access and return audio stream
 */
export async function requestMicrophoneStream(): Promise<MediaStream> {
  if (!isMediaDevicesSupported()) {
    throw new Error('Microphone access is not supported by this browser.');
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
      video: false,
    });
  } catch (err: any) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      throw new Error('Microphone permission was denied. Please allow microphone access in your browser or phone settings.');
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      throw new Error('No microphone device found on this device.');
    }
    throw new Error(err.message || 'Unable to access microphone.');
  }
}

/**
 * Convert a Blob to base64 string
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
