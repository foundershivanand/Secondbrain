import { Env } from '../config';
import { Database } from '../db';
import { processIngestion } from '../pipeline/ingestion';
import { jsonResponse, errorResponse } from '../utils/response';
import { IngestionPriority, SourceType } from '../types';

export interface ManifestItem {
  raw_id?: string;
  filename: string;
  storage: 'terabox' | 'google_drive' | 'telegram' | 'discord' | 'web' | 'local';
  url: string;
  size?: number;
  priority?: IngestionPriority;
  source_type?: SourceType;
  title?: string;
  summary?: string;
  channel_id?: string;
  message_id?: string;
}

export async function handleManifestImport(
  request: Request,
  env: Env,
  db: Database
): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed. Use POST.', 405);
  }

  try {
    const body: any = await request.json();
    const items: ManifestItem[] = Array.isArray(body) ? body : body.items || [];

    if (items.length === 0) {
      return errorResponse('Manifest must contain at least one item', 400);
    }

    const registered: any[] = [];
    let processedImmediately = 0;

    for (const item of items) {
      const priority: IngestionPriority = item.priority || 'P1';

      // Infer source type from filename if omitted
      let inferredType: SourceType = item.source_type || 'raw_pointer';
      const ext = item.filename.split('.').pop()?.toLowerCase();
      if (['mp4', 'mov', 'mkv', 'avi'].includes(ext || '')) inferredType = 'video';
      else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) inferredType = 'screenshot';
      else if (['pdf'].includes(ext || '')) inferredType = 'pdf';
      else if (['mp3', 'm4a', 'wav', 'ogg'].includes(ext || '')) inferredType = 'voice';

      // P0 items are processed right now; P1-P4 are registered as pointers with jobs queued
      if (priority === 'P0' && processedImmediately < 5) {
        const result = await processIngestion(env, db, {
          sourceType: inferredType,
          title: item.title || item.filename,
          rawStorage: item.storage,
          rawId: item.raw_id,
          rawUrl: item.url,
          fileSize: item.size,
          priority: 'P0',
          userNote: item.summary,
          importance: 9,
        });
        registered.push({
          raw_id: result.source.raw_id,
          title: result.source.title,
          status: 'PROCESSED_P0',
          knowledge_id: result.knowledge.id,
        });
        processedImmediately++;
      } else {
        // Register raw pointer in sources
        const sourceId = `SRC-${Math.floor(100000 + Math.random() * 900000)}`;
        const rawId = item.raw_id || `RAW-${Math.floor(100000 + Math.random() * 900000)}`;
        const now = new Date().toISOString();

        await db.createSource({
          id: sourceId,
          raw_id: rawId,
          source_type: inferredType,
          title: item.title || item.filename,
          original_url: item.url,
          raw_storage: item.storage,
          raw_file_id: null,
          raw_message_id: item.message_id || null,
          channel_id: item.channel_id || null,
          raw_url: item.url,
          mime_type: null,
          file_size: item.size || null,
          captured_at: now,
          processed_at: null,
          status: 'QUEUED',
          content_hash: null,
          importance: priority === 'P1' ? 8 : 5,
          priority,
          created_at: now,
        });

        // Queue processing job
        await db.createJob({
          id: `JOB-${Math.floor(100000 + Math.random() * 900000)}`,
          source_id: sourceId,
          job_type: 'MANIFEST_INGESTION',
          status: 'QUEUED',
          attempts: 0,
          error: null,
          created_at: now,
          started_at: null,
          completed_at: null,
        });

        registered.push({
          raw_id: rawId,
          title: item.title || item.filename,
          status: 'QUEUED_FOR_PROGRESSIVE_PROCESSING',
          priority,
          storage: item.storage,
        });
      }
    }

    return jsonResponse({
      success: true,
      message: `Manifest registered: ${registered.length} raw files cataloged. ${processedImmediately} P0 items processed immediately.`,
      items: registered,
    });
  } catch (err: any) {
    console.error('Manifest ingestion error:', err);
    return errorResponse(`Manifest import failed: ${err.message}`, 500);
  }
}
