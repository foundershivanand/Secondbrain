import { Env } from '../config';
import { Database } from '../db';
import { processIngestion, IngestionInput } from '../pipeline/ingestion';
import { jsonResponse, errorResponse } from '../utils/response';
import { SourceType } from '../types';

export async function handleCapture(request: Request, env: Env, db: Database): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed. Use POST.', 405);
  }

  const contentType = request.headers.get('content-type') || '';
  let input: IngestionInput;

  try {
    if (contentType.includes('application/json')) {
      const body: any = await request.json();

      let inferredType: SourceType = body.source_type || 'text';
      if (body.url && (body.url.includes('youtube.com') || body.url.includes('youtu.be'))) {
        inferredType = 'youtube';
      } else if (body.url && (body.url.includes('instagram.com/reel') || body.url.includes('instagram.com/p/') || body.url.includes('instagram.com/share/') || body.url.includes('instagr.am/'))) {
        inferredType = 'reel';
      } else if (body.url && (body.url.includes('tiktok.com/') || body.url.includes('shorts'))) {
        inferredType = 'reel';
      } else if (body.url && inferredType === 'text') {
        inferredType = 'url';
      }

      input = {
        sourceType: inferredType,
        text: body.text,
        url: body.url,
        rawStorage: body.raw_storage,
        rawFileId: body.raw_file_id,
        rawUrl: body.raw_url,
        mimeType: body.mime_type,
        fileSize: body.file_size,
        base64Data: body.base64_data,
        fileUri: body.file_uri,
        title: body.title,
        userNote: body.user_note || body.why_saved,
        importance: body.importance ? Number(body.importance) : 5,
      };
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const text = formData.get('text') as string | null;
      const url = formData.get('url') as string | null;
      const userNote = formData.get('user_note') as string | null;
      const sourceType = (formData.get('source_type') as SourceType) || 'text';
      const rawStorage = formData.get('raw_storage') as string | null;
      const rawUrl = formData.get('raw_url') as string | null;

      let base64Data: string | undefined;
      let mimeType: string | undefined;
      let fileSize: number | undefined;

      if (file) {
        mimeType = file.type;
        fileSize = file.size;
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        base64Data = btoa(binary);
      }

      let detectedType = sourceType;
      if (file) {
        if (mimeType?.startsWith('image/')) detectedType = 'screenshot';
        else if (mimeType?.includes('pdf')) detectedType = 'pdf';
        else if (mimeType?.startsWith('video/')) detectedType = 'reel';
        else if (mimeType?.startsWith('audio/')) detectedType = 'voice';
      } else if (url) {
        if (url.includes('youtube.com') || url.includes('youtu.be')) detectedType = 'youtube';
        else if (url.includes('instagram.com/reel') || url.includes('instagram.com/p/') || url.includes('instagram.com/share/') || url.includes('instagr.am')) detectedType = 'reel';
        else if (url.includes('tiktok.com')) detectedType = 'reel';
      }

      input = {
        sourceType: detectedType,
        text: text || undefined,
        url: url || undefined,
        rawStorage: rawStorage || undefined,
        rawUrl: rawUrl || undefined,
        mimeType,
        fileSize,
        base64Data,
        userNote: userNote || undefined,
      };
    } else {
      const rawText = await request.text();
      input = {
        sourceType: 'text',
        text: rawText,
      };
    }

    if (!input.text && !input.url && !input.base64Data && !input.rawUrl) {
      if (input.title) {
        input.text = input.title;
      } else {
        return errorResponse('Empty capture. Provide text, title, url, file, or raw_url.', 400);
      }
    }

    const result = await processIngestion(env, db, input);

    return jsonResponse({
      success: true,
      message: result.isDuplicate ? 'Note already indexed in Second Brain' : 'Successfully ingested into Second Brain',
      source: result.source,
      knowledge: result.knowledge,
      markdown: result.markdown,
      isDuplicate: result.isDuplicate,
    });
  } catch (err: any) {
    console.error('Capture endpoint error:', err);
    return errorResponse(err.message || 'Capture failed', 500);
  }
}
