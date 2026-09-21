import { Env } from '../config';
import { Database } from '../db';
import { processIngestion, IngestionInput } from '../pipeline/ingestion';
import { verifyTelegramWebhook } from '../utils/security';
import { jsonResponse, errorResponse } from '../utils/response';
import { SourceType } from '../types';

async function sendTelegramMessage(botToken: string, chatId: number | string, text: string): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    });
  } catch (err) {
    console.error('Failed to send Telegram message:', err);
  }
}

async function getTelegramFileBase64(botToken: string, fileId: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const fileInfoRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
    const fileInfo: any = await fileInfoRes.json();
    if (!fileInfo.ok || !fileInfo.result?.file_path) return null;

    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileInfo.result.file_path}`;
    const fileRes = await fetch(fileUrl);
    const mimeType = fileRes.headers.get('content-type') || 'application/octet-stream';
    const buffer = await fileRes.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return {
      base64: btoa(binary),
      mimeType,
    };
  } catch (err) {
    console.error('Failed to fetch Telegram file:', err);
    return null;
  }
}

export async function handleTelegramWebhook(request: Request, env: Env, db: Database): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed. Use POST.', 405);
  }

  // Security check: Verify Telegram Secret Token
  if (!verifyTelegramWebhook(request, env)) {
    return errorResponse('Unauthorized: Invalid Telegram Secret Token', 403);
  }

  try {
    const update: any = await request.json();
    const message = update.message || update.edited_message;

    if (!message) {
      return jsonResponse({ ok: true, note: 'No message in update' });
    }

    const chatId = message.chat?.id;
    const botToken = env.TELEGRAM_BOT_TOKEN;

    // Handle commands like /start or /help
    if (message.text && message.text.startsWith('/start')) {
      if (botToken && chatId) {
        await sendTelegramMessage(
          botToken,
          chatId,
          `🧠 *Welcome to your Second Brain Bot*\n\nSend me anything:\n• 📝 Raw thoughts or ideas\n• 🔗 Articles or links\n• 🎥 YouTube videos\n• 📸 Screenshots or images\n• 📄 PDFs or documents\n• 🎤 Voice memos\n\nI will extract atomic knowledge, store metadata, connect topics, and sync to your Obsidian vault.`
        );
      }
      return jsonResponse({ ok: true });
    }

    let sourceType: SourceType = 'text';
    let text = message.text || message.caption || '';
    let url: string | undefined;
    let base64Data: string | undefined;
    let mimeType: string | undefined;
    let rawFileId: string | undefined;

    // Detect YouTube / Web URLs in text
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    if (urlMatch && urlMatch[0]) {
      const detectedUrl = urlMatch[0];
      url = detectedUrl;
      if (detectedUrl.includes('youtube.com') || detectedUrl.includes('youtu.be')) {
        sourceType = 'youtube';
      } else {
        sourceType = 'url';
      }
    }

    // Handle Photos / Screenshots
    if (message.photo && message.photo.length > 0) {
      sourceType = 'screenshot';
      const largestPhoto = message.photo[message.photo.length - 1];
      if (largestPhoto && largestPhoto.file_id) {
        rawFileId = largestPhoto.file_id;
        if (botToken) {
          const fileData = await getTelegramFileBase64(botToken, largestPhoto.file_id);
          if (fileData) {
            base64Data = fileData.base64;
            mimeType = 'image/jpeg';
          }
        }
      }
    } else if (message.voice || message.audio) {
      sourceType = 'voice';
      const voiceObj = message.voice || message.audio;
      if (voiceObj && voiceObj.file_id) {
        rawFileId = voiceObj.file_id;
        if (botToken) {
          const fileData = await getTelegramFileBase64(botToken, voiceObj.file_id);
          if (fileData) {
            base64Data = fileData.base64;
            mimeType = voiceObj.mime_type || 'audio/ogg';
          }
        }
      }
    } else if (message.document) {
      sourceType = 'pdf';
      if (message.document.file_id) {
        rawFileId = message.document.file_id;
        mimeType = message.document.mime_type;
        if (botToken) {
          const fileData = await getTelegramFileBase64(botToken, message.document.file_id);
          if (fileData) {
            base64Data = fileData.base64;
          }
        }
      }
    }

    // Send immediate acknowledgment
    if (botToken && chatId) {
      await sendTelegramMessage(
        botToken,
        chatId,
        `🧠 *Captured*\n\n*Type:* \`${sourceType.toUpperCase()}\`\n*Status:* Analyzing with Gemini AI...\n_Transforming into durable knowledge..._`
      );
    }

    // Process Ingestion
    const ingestionInput: IngestionInput = {
      sourceType,
      text: text || undefined,
      url,
      rawStorage: 'telegram',
      rawFileId,
      rawUrl: url || (rawFileId ? `telegram://file/${rawFileId}` : undefined),
      base64Data,
      mimeType,
      userNote: text,
      importance: 7,
    };

    const result = await processIngestion(env, db, ingestionInput);

    // Send completion message back to user in Telegram
    if (botToken && chatId) {
      const topics = result.extraction.topics?.map((t) => `• ${t}`).join('\n') || '• General';
      const actions = result.extraction.actions?.map((a) => `→ ${a}`).join('\n') || '→ No action required';

      const reply = `✅ *Added to Second Brain*

*Title:* ${result.extraction.title}
*Core Idea:*
_${result.extraction.core_idea}_

*Connected Topics:*
${topics}

*Potential Actions:*
${actions}

📁 _Saved to Obsidian vault: \`${result.markdown.folder}/${result.markdown.filename}\`_`;

      await sendTelegramMessage(botToken, chatId, reply);
    }

    return jsonResponse({ ok: true, knowledgeId: result.knowledge.id });
  } catch (err: any) {
    console.error('Telegram webhook processing error:', err);
    return jsonResponse({ ok: false, error: err.message });
  }
}
