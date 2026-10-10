import { Database } from '../db';
import { jsonResponse, errorResponse } from '../utils/response';

export async function handleExtraction(request: Request, db: Database, pathParts: string[]): Promise<Response> {
  const subRoute = pathParts[0] || 'status';

  // 1. GET /api/extraction or /api/extraction/status
  if (request.method === 'GET') {
    const rawState = await db.getBrainState();
    const extractionMeta: any = (rawState as any)?.extraction_state || {
      status: 'idle',
      currentStream: 'images',
      batchSize: 10,
    };

    // Query actual note counts from DB
    const sources = await db.listSources(500, 0);
    const knowledge = await db.listKnowledge(500, 0);

    const imagesExtracted = knowledge.filter(k => 
      k.markdown_path?.includes('/images/') || 
      ['screenshot', 'image'].includes(k.knowledge_type)
    ).length;

    const videosExtracted = knowledge.filter(k => 
      k.markdown_path?.includes('/videos/') || 
      ['reel', 'video', 'youtube'].includes(k.knowledge_type)
    ).length;

    // Rule: videos are locked until images are done
    const totalKnownImages = 3330;
    const allImagesDone = imagesExtracted >= totalKnownImages && totalKnownImages > 0;

    return jsonResponse({
      status: extractionMeta.status || 'idle',
      currentStream: allImagesDone ? 'videos' : 'images',
      imagesExtracted,
      totalKnownImages,
      videosExtracted,
      allImagesDone,
      canStartVideos: allImagesDone,
      message: allImagesDone
        ? 'All images completed. Video extraction available.'
        : `Images in progress (${imagesExtracted} extracted). Videos locked until images complete.`,
      updatedAt: new Date().toISOString()
    });
  }

  // 2. POST /api/extraction/start
  if (request.method === 'POST' && subRoute === 'start') {
    const state = (await db.getBrainState()) || ({} as any);
    state.extraction_state = {
      status: 'running',
      currentStream: 'images',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.updateBrainState(state);

    return jsonResponse({
      success: true,
      status: 'running',
      currentStream: 'images',
      message: 'Image extraction started.'
    });
  }

  // 3. POST /api/extraction/stop or /api/extraction/pause
  if (request.method === 'POST' && (subRoute === 'stop' || subRoute === 'pause')) {
    const state = (await db.getBrainState()) || ({} as any);
    state.extraction_state = {
      status: 'paused',
      pausedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.updateBrainState(state);

    return jsonResponse({
      success: true,
      status: 'paused',
      message: 'Extraction paused.'
    });
  }

  return errorResponse('Method not allowed', 405);
}
