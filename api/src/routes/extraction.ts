import { Database } from '../db';
import { jsonResponse } from '../utils/response';

export async function handleExtraction(_request?: Request, _db?: Database, _pathParts?: string[]): Promise<Response> {
  return jsonResponse({
    status: 'idle',
    currentStream: 'none',
    imagesExtracted: 0,
    totalKnownImages: 0,
    videosExtracted: 0,
    allImagesDone: true,
    canStartVideos: true,
    message: 'TeraBox extraction is decommissioned. Only user uploads and YouTube sync are active.',
    updatedAt: new Date().toISOString()
  });
}
