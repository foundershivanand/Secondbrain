import fs from 'fs';
import path from 'path';

/**
 * CLI Tool: Scans any local directory or external drive (e.g. 100 GB collection)
 * Generates an M0 Raw Pointer manifest and optionally posts it directly to Second Brain!
 *
 * Usage:
 *   node scripts/scan-raw-storage.mjs /path/to/media-folder [storage_name] [--upload]
 *
 * Example:
 *   node scripts/scan-raw-storage.mjs /media/backup/2026 terabox --upload
 */

const targetDir = process.argv[2];
const storageName = process.argv[3] || 'local';
const shouldUpload = process.argv.includes('--upload');
const apiBaseUrl = process.env.API_URL || 'http://127.0.0.1:8787';

if (!targetDir) {
  console.log(`
🧠 Second Brain - 100 GB Raw Storage Scanner
─────────────────────────────────────────────
Scans your existing video, screenshot, PDF, and audio library,
creating permanent pointers without copying or moving gigabytes of media.

Usage:
  node scripts/scan-raw-storage.mjs <directory_path> [storage_name] [--upload]

Arguments:
  <directory_path>  Path to your 100 GB media library or folder
  [storage_name]    Storage provider label: 'terabox' | 'google_drive' | 'telegram' | 'discord' | 'local' (default: local)
  --upload          Automatically upload the manifest to your Cloudflare Worker backend

Examples:
  node scripts/scan-raw-storage.mjs /home/shiva/Videos terabox
  node scripts/scan-raw-storage.mjs /mnt/external-drive/AI-Archive google_drive --upload
`);
  process.exit(0);
}

const SUPPORTED_EXTENSIONS = new Set([
  '.mp4', '.mov', '.mkv', '.webm', '.avi',
  '.png', '.jpg', '.jpeg', '.webp',
  '.pdf',
  '.mp3', '.m4a', '.wav', '.ogg',
  '.txt', '.md'
]);

function walkDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    console.error(`❌ Directory not found: ${dir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      if (!['.git', 'node_modules', '.wrangler'].includes(file.name)) {
        walkDir(fullPath, fileList);
      }
    } else if (file.isFile()) {
      const ext = path.extname(file.name).toLowerCase();
      if (SUPPORTED_EXTENSIONS.has(ext)) {
        const stats = fs.statSync(fullPath);
        fileList.push({
          fullPath,
          name: file.name,
          size: stats.size,
          mtime: stats.mtime,
          ext,
        });
      }
    }
  }
  return fileList;
}

console.log(`🔍 Scanning directory: ${targetDir}...`);
const rawFiles = walkDir(targetDir);
console.log(`📦 Found ${rawFiles.length} media files.`);

if (rawFiles.length === 0) {
  console.log('No supported media files found.');
  process.exit(0);
}

const manifestItems = rawFiles.map((f, idx) => {
  const rawIdNum = Math.floor(100000 + Math.random() * 900000);
  const rawId = `RAW-${rawIdNum}`;
  const cleanTitle = f.name
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]/g, ' ')
    .trim();

  // Infer priority based on filename and folder
  let priority = 'P1';
  const lower = f.fullPath.toLowerCase();
  if (lower.includes('p0') || lower.includes('project') || lower.includes('agent') || lower.includes('current')) {
    priority = 'P0';
  } else if (lower.includes('learn') || lower.includes('tutorial') || lower.includes('ai') || lower.includes('saas')) {
    priority = 'P1';
  } else if (lower.includes('archive') || lower.includes('random')) {
    priority = 'P3';
  }

  return {
    raw_id: rawId,
    filename: f.name,
    storage: storageName,
    url: f.fullPath.startsWith('http') ? f.fullPath : `file://${f.fullPath}`,
    size: f.size,
    priority,
    title: cleanTitle,
    summary: `Raw media file located in ${storageName}: ${f.name}`,
  };
});

const outputPath = path.resolve(process.cwd(), 'raw-manifest.json');
fs.writeFileSync(outputPath, JSON.stringify(manifestItems, null, 2), 'utf8');
console.log(`✅ Manifest saved to: ${outputPath} (${manifestItems.length} items cataloged)`);

// Summary of priorities
const pCounts = manifestItems.reduce((acc, curr) => {
  acc[curr.priority] = (acc[curr.priority] || 0) + 1;
  return acc;
}, {});
console.log(`📊 Ingestion Priority Breakdown: P0=${pCounts['P0'] || 0}, P1=${pCounts['P1'] || 0}, P2=${pCounts['P2'] || 0}, P3=${pCounts['P3'] || 0}`);

if (shouldUpload) {
  console.log(`📡 Uploading manifest to Second Brain (${apiBaseUrl}/api/manifest/import)...`);
  fetch(`${apiBaseUrl}/api/manifest/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(manifestItems),
  })
    .then((res) => res.json())
    .then((data) => {
      console.log('🎉 Successfully imported into Second Brain!', data.message);
    })
    .catch((err) => {
      console.error('❌ Failed to upload manifest:', err.message);
      console.log('Ensure Cloudflare Worker is running (`npm run dev:api`).');
    });
} else {
  console.log('\n💡 Tip: Run with `--upload` or paste `raw-manifest.json` into the web app Sources screen to start progressive ingestion!');
}
