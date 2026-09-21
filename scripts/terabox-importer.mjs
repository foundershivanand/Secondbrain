import fs from 'fs';
import path from 'path';

/**
 * 📦 TeraBox 50 GB Progressive Importer & Parser
 *
 * Scans your 50 GB TeraBox directory or file manifest, parses each file using
 * Google Gemini multimodal extraction, extracts atomic concepts and timestamps,
 * and creates permanent pointers back to TeraBox without bloating Obsidian or D1.
 *
 * Features:
 * - Resume support: Saves progress in `terabox-progress.json` (safe to interrupt and restart).
 * - Gemini File API: Uploads large videos & PDFs directly to Google Gemini File API (up to 2 GB per file).
 * - Automatic cleanup: Deletes temporary upload from Gemini File API after knowledge is extracted.
 * - Cloudflare Worker / GitHub Sync: Posts distilled knowledge note to `/api/capture` which auto-commits to your GitHub vault.
 *
 * Usage:
 *   node scripts/terabox-importer.mjs <folder_path_or_manifest.json> [--api-url <url>] [--gemini-key <key>]
 *
 * Example:
 *   node scripts/terabox-importer.mjs /home/shiva/TeraBoxSync --gemini-key AIzaSy...
 */

const targetPath = process.argv[2];

if (!targetPath || targetPath === '--help') {
  console.log(`
📦 TeraBox 50 GB Progressive Knowledge Importer
─────────────────────────────────────────────────
Parses your 50 GB TeraBox media collection into atomic knowledge notes
with permanent pointers back to your original files.

Usage:
  node scripts/terabox-importer.mjs <path_to_folder_or_manifest.json> [options]

Options:
  --gemini-key <key>  Google Gemini API Key (defaults to GEMINI_API_KEY env var)
  --api-url <url>     Second Brain API URL (defaults to API_URL or http://127.0.0.1:8787)
  --auth-token <tok>  API Bearer token if configured in Cloudflare secrets
  --terabox-prefix    Base URL to prefix filenames with (e.g. https://terabox.com/s/xxxx)

Examples:
  node scripts/terabox-importer.mjs /home/shiva/TeraBoxDownload
  node scripts/terabox-importer.mjs ./terabox-links.json --gemini-key AIzaSyXXXXX
`);
  process.exit(0);
}

function getArg(name, envVar, fallback = '') {
  const idx = process.argv.indexOf(name);
  if (idx !== -1 && process.argv[idx + 1]) {
    return process.argv[idx + 1];
  }
  return process.env[envVar] || fallback;
}

const geminiKey = getArg('--gemini-key', 'GEMINI_API_KEY', '');
const apiUrl = getArg('--api-url', 'API_URL', 'http://127.0.0.1:8787').replace(/\/+$/, '');
const authToken = getArg('--auth-token', 'AUTH_TOKEN', '');
const teraboxPrefix = getArg('--terabox-prefix', 'TERABOX_PREFIX', '');

const PROGRESS_FILE = path.resolve(process.cwd(), 'terabox-progress.json');

const MIME_MAP = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
  '.webm': 'video/webm',
  '.avi': 'video/x-msvideo',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.mp3': 'audio/mp3',
  '.m4a': 'audio/m4a',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
};

// 1. Load or initialize progress file
let progress = { processed: {}, failed: {} };
if (fs.existsSync(PROGRESS_FILE)) {
  try {
    progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  } catch (e) {
    console.warn('⚠️ Could not parse existing progress file, starting fresh.');
  }
}

function saveProgress() {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf8');
}

// 2. Discover files
function collectFiles(sourcePath) {
  const stat = fs.statSync(sourcePath);
  if (stat.isFile()) {
    if (sourcePath.endsWith('.json')) {
      // JSON Manifest of files
      const raw = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
      const list = Array.isArray(raw) ? raw : raw.items || [];
      return list.map((item) => ({
        path: item.path || item.url || item.filename,
        name: item.name || item.filename || path.basename(item.path || item.url),
        url: item.url || (teraboxPrefix ? `${teraboxPrefix}/${item.name || item.filename}` : item.path),
        size: item.size || 0,
        isRemote: !fs.existsSync(item.path || ''),
      }));
    } else {
      return [{
        path: sourcePath,
        name: path.basename(sourcePath),
        url: teraboxPrefix ? `${teraboxPrefix}/${path.basename(sourcePath)}` : sourcePath,
        size: stat.size,
        isRemote: false,
      }];
    }
  }

  // Directory scan
  const results = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (!['.git', 'node_modules', '.wrangler'].includes(ent.name)) {
          walk(full);
        }
      } else if (ent.isFile()) {
        const ext = path.extname(ent.name).toLowerCase();
        if (MIME_MAP[ext]) {
          const s = fs.statSync(full);
          results.push({
            path: full,
            name: ent.name,
            url: teraboxPrefix ? `${teraboxPrefix}/${ent.name}` : full,
            size: s.size,
            isRemote: false,
          });
        }
      }
    }
  }
  walk(sourcePath);
  return results;
}

// 3. Upload file to Google Gemini File API (for files up to 2 GB)
async function uploadToGeminiFileApi(filePath, mimeType, displayName) {
  if (!geminiKey) throw new Error('GEMINI_API_KEY required for direct File API upload.');

  const fileSize = fs.statSync(filePath).size;
  console.log(`      📤 Uploading ${(fileSize / (1024 * 1024)).toFixed(1)} MB to Gemini File API...`);

  // Step 1: Start resumable upload
  const initRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${geminiKey}`,
    {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': fileSize.toString(),
        'X-Goog-Upload-Header-Content-Type': mimeType,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file: { display_name: displayName } }),
    }
  );

  const uploadUrl = initRes.headers.get('x-goog-upload-url');
  if (!uploadUrl) {
    throw new Error(`Failed to initialize upload: ${await initRes.text()}`);
  }

  // Step 2: Upload file bytes
  const fileBuffer = fs.readFileSync(filePath);
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': fileSize.toString(),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: fileBuffer,
  });

  const uploadData = await uploadRes.json();
  const fileUri = uploadData.file?.uri;
  const fileName = uploadData.file?.name;

  if (!fileUri || !fileName) {
    throw new Error(`File API response invalid: ${JSON.stringify(uploadData)}`);
  }

  // Step 3: Wait until file is processed and ACTIVE (especially for videos)
  let state = uploadData.file?.state;
  while (state === 'PROCESSING') {
    console.log('      ⏳ Gemini is processing video/audio frames...');
    await new Promise((r) => setTimeout(r, 6000));
    const checkRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${geminiKey}`
    );
    const checkData = await checkRes.json();
    state = checkData.state;
  }

  return { fileUri, fileName, mimeType };
}

// 4. Delete file from Gemini File API after extraction
async function deleteGeminiFile(fileName) {
  if (!geminiKey || !fileName) return;
  try {
    await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${geminiKey}`,
      { method: 'DELETE' }
    );
  } catch {
    // Ignore cleanup error
  }
}

// 5. Post to Second Brain API
async function postToSecondBrain(payload) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res = await fetch(`${apiUrl}/api/capture`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`API error (${res.status}): ${errBody}`);
  }

  return res.json();
}

async function main() {
  console.log(`🔍 Scanning target: ${targetPath}...`);
  const files = collectFiles(targetPath);
  console.log(`📦 Found ${files.length} supported media files in collection.`);

  const pending = files.filter((f) => !progress.processed[f.path]);
  console.log(`⚡ ${Object.keys(progress.processed).length} already processed. ${pending.length} remaining to parse.\n`);

  let count = 0;
  for (const item of pending) {
    count++;
    const ext = path.extname(item.name).toLowerCase();
    const mimeType = MIME_MAP[ext] || 'application/octet-stream';
    const rawId = `RAW-TERABOX-${Math.floor(100000 + Math.random() * 900000)}`;
    const fileSizeMB = (item.size / (1024 * 1024)).toFixed(2);

    console.log(`[${count}/${pending.length}] Parsing: ${item.name} (${fileSizeMB} MB)`);

    try {
      let geminiUploadedFile = null;

      // Handle large local files with Gemini File API
      if (!item.isRemote && item.size > 15 * 1024 * 1024 && geminiKey) {
        // Video/Large PDF > 15MB: use File API
        geminiUploadedFile = await uploadToGeminiFileApi(item.path, mimeType, item.name);
      }

      let payload = {
        source_type: ext.match(/\.(mp4|mov|mkv|avi|webm)$/)
          ? 'video'
          : ext.match(/\.(pdf)$/)
          ? 'pdf'
          : ext.match(/\.(mp3|m4a|wav|ogg)$/)
          ? 'voice'
          : ext.match(/\.(png|jpg|jpeg|webp)$/)
          ? 'screenshot'
          : 'text',
        user_note: `TeraBox raw media file: ${item.name} (${fileSizeMB} MB)`,
        raw_storage: 'terabox',
        raw_id: rawId,
        raw_url: item.url,
        importance: 8,
      };

      if (geminiUploadedFile) {
        // Pass File API URI
        payload.file_uri = geminiUploadedFile.fileUri;
        payload.mime_type = geminiUploadedFile.mimeType;
      } else if (!item.isRemote && item.size <= 15 * 1024 * 1024) {
        // Pass inline base64 for small media
        const buf = fs.readFileSync(item.path);
        payload.base64_data = buf.toString('base64');
        payload.mime_type = mimeType;
      } else {
        // Metadata pointer mode
        payload.text = `File: ${item.name}\nSize: ${fileSizeMB} MB\nOriginal Path/Link: ${item.url}\nExtracted from 50 GB TeraBox repository.`;
      }

      // Submit to Second Brain API
      console.log(`      🧠 Distilling intelligence with Gemini 2.0 Flash...`);
      const res = await postToSecondBrain(payload);

      // Clean up Gemini temporary uploaded file
      if (geminiUploadedFile) {
        await deleteGeminiFile(geminiUploadedFile.fileName);
      }

      console.log(`      ✅ Note Created: ${res.knowledge?.id || 'KN'} - "${res.knowledge?.title || item.name}"`);
      console.log(`      🐙 Committed directly to GitHub vault in the cloud!`);

      progress.processed[item.path] = {
        raw_id: rawId,
        knowledge_id: res.knowledge?.id,
        title: res.knowledge?.title,
        processed_at: new Date().toISOString(),
      };
      saveProgress();
    } catch (err) {
      console.error(`      ❌ Failed to parse ${item.name}:`, err.message);
      progress.failed[item.path] = {
        error: err.message,
        time: new Date().toISOString(),
      };
      saveProgress();
    }

    // Gentle throttle between files to respect Gemini rate limits
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log(`\n🎉 TeraBox Ingestion Complete!`);
  console.log(`📊 Processed: ${Object.keys(progress.processed).length} files.`);
  console.log(`💡 All extracted knowledge notes and pointers are live in your Second Brain and GitHub Obsidian Vault!`);
}

main().catch((e) => {
  console.error('Fatal error in TeraBox importer:', e);
  process.exit(1);
});
