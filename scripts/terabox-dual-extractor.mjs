import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import {
  SharedMemoryManager,
  MultiAiOrchestrator,
  classifyCategory
} from './ai-orchestrator.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const VAULT_DIR = path.resolve(ROOT_DIR, 'vault');
const TERABOX_DIR = path.resolve(VAULT_DIR, 'terabox');
const IMAGES_DIR = path.resolve(TERABOX_DIR, 'images');
const VIDEOS_DIR = path.resolve(TERABOX_DIR, 'videos');

// ─────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT LOADER
// ─────────────────────────────────────────────────────────────────────────────
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const rootEnv = loadEnvFile(path.resolve(ROOT_DIR, '.env'));
const devVars = loadEnvFile(path.resolve(ROOT_DIR, 'api/.dev.vars'));
const env = { ...rootEnv, ...devVars, ...process.env };

function getOption(flag, fallback = '') {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('--')) {
    return process.argv[idx + 1];
  }
  return fallback;
}

const targetManifest = getOption('--manifest', path.resolve(ROOT_DIR, 'terabox-manifest.json'));
const limitImages = parseInt(getOption('--limit-images', '10'), 10);
const limitVideos = parseInt(getOption('--limit-videos', '10'), 10);
const isDryRun = process.argv.includes('--dry-run');

// Ensure folder structure
[TERABOX_DIR, IMAGES_DIR, VIDEOS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Symlink terabox at project root for convenience
const rootSymlink = path.resolve(ROOT_DIR, 'terabox');
if (!fs.existsSync(rootSymlink)) {
  try {
    fs.symlinkSync(path.relative(ROOT_DIR, TERABOX_DIR), rootSymlink, 'dir');
  } catch (e) {
    // Ignore symlink failure
  }
}

// Initialize Shared Memory & Multi-AI Orchestrator
const sharedMemory = new SharedMemoryManager();
const orchestrator = new MultiAiOrchestrator(env, sharedMemory);

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────
const PROGRESS_FILE = path.resolve(ROOT_DIR, 'terabox-progress.json');
let progress = {
  images: { counter: 0, processed: {}, skipped_duplicate: {}, skipped_personal: {}, failed: {} },
  videos: { counter: 0, processed: {}, skipped_duplicate: {}, skipped_personal: {}, failed: {} }
};

if (fs.existsSync(PROGRESS_FILE)) {
  try {
    const raw = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    if (raw.images && raw.videos) {
      progress = raw;
    } else if (raw.counter !== undefined) {
      // Migrate legacy flat structure
      progress.images.counter = 0;
      progress.videos.counter = 0;
    }
  } catch (e) {
    console.warn('⚠️ Could not parse terabox-progress.json, starting fresh.');
  }
}

function saveProgress() {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf8');
}

// ─────────────────────────────────────────────────────────────────────────────
// SQLITE & REMOTE D1 SYNC HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function getSqliteDbPath() {
  try {
    const d1Dir = path.resolve(ROOT_DIR, 'api/.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
    if (!fs.existsSync(d1Dir)) return null;
    const files = fs.readdirSync(d1Dir);
    const sqliteFile = files.find(f => f.endsWith('.sqlite'));
    return sqliteFile ? path.join(d1Dir, sqliteFile) : null;
  } catch {
    return null;
  }
}
const sqliteDbPath = getSqliteDbPath();

function executeSql(sql) {
  if (!sqliteDbPath) return;
  try {
    const escaped = sql.replace(/"/g, '\\"');
    execSync(`sqlite3 "${sqliteDbPath}" "${escaped}"`, { stdio: 'pipe' });
  } catch (err) {}
}

const remoteSqlBuffer = [];
function queueRemoteSql(sql) {
  remoteSqlBuffer.push(sql);
}

async function flushRemoteD1() {
  if (remoteSqlBuffer.length === 0) return;
  const combined = remoteSqlBuffer.join('\n');
  const tempSqlFile = path.resolve(ROOT_DIR, '.temp-sync.sql');
  fs.writeFileSync(tempSqlFile, combined, 'utf8');
  try {
    console.log(`📡 Syncing ${remoteSqlBuffer.length} records to remote Cloudflare D1 database...`);
    execSync(`npx wrangler d1 execute second_brain --remote --file="${tempSqlFile}"`, {
      cwd: ROOT_DIR,
      stdio: 'pipe'
    });
    console.log(`✨ Remote Cloudflare D1 database updated successfully!`);
    remoteSqlBuffer.length = 0;
  } catch (err) {
    console.warn(`⚠️ Remote D1 sync deferred: ${err.message}`);
  } finally {
    if (fs.existsSync(tempSqlFile)) fs.unlinkSync(tempSqlFile);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LOAD MANIFEST & FINGERPRINT DEDUPLICATION
// ─────────────────────────────────────────────────────────────────────────────
if (!fs.existsSync(targetManifest)) {
  console.error(`❌ Manifest file not found: ${targetManifest}`);
  process.exit(1);
}

const rawManifest = JSON.parse(fs.readFileSync(targetManifest, 'utf8'));
console.log(`\n================================================================`);
console.log(`📦 TeraBox Dual-Stream Knowledge Extractor (Images & Reels)`);
console.log(`================================================================`);
console.log(`Manifest loaded: ${rawManifest.length} total entries.`);
console.log(`Shared Multi-AI Memory: Connected`);

function normalizeName(name) {
  return (name || '').toLowerCase()
    .replace(/\.[^/.]+$/, '')
    .replace(/\s*copy(\s*copy)*\s*/gi, '')
    .replace(/\s*\(\d+\)\s*/g, '')
    .replace(/[-_.]+/g, ' ')
    .trim();
}

function getFingerprint(item) {
  const filename = item.filename || item.name || '';
  const ext = path.extname(filename).toLowerCase();
  const clean = normalizeName(filename);
  if (item.size && item.size > 0) {
    return `size_${item.size}_${ext}`;
  }
  return `name_${clean}_${ext}`;
}

const fingerprintGroups = {};
for (const item of rawManifest) {
  const fp = getFingerprint(item);
  if (!fingerprintGroups[fp]) fingerprintGroups[fp] = [];
  fingerprintGroups[fp].push(item);
}

const canonicalMap = new Map();
const duplicateOf = new Map();

for (const fp in fingerprintGroups) {
  const group = fingerprintGroups[fp];
  if (group.length === 1) {
    const item = group[0];
    const key = item.fs_id ? String(item.fs_id) : (item.url || item.path);
    canonicalMap.set(key, item);
  } else {
    group.sort((a, b) => {
      const aName = a.filename || a.name || '';
      const bName = b.filename || b.name || '';
      const aIsCopy = /copy|\(\d+\)/i.test(aName);
      const bIsCopy = /copy|\(\d+\)/i.test(bName);
      if (aIsCopy !== bIsCopy) return aIsCopy ? 1 : -1;
      return (a.path || '').length - (b.path || '').length;
    });

    const canonical = group[0];
    const canonicalKey = canonical.fs_id ? String(canonical.fs_id) : (canonical.url || canonical.path);
    canonicalMap.set(canonicalKey, canonical);

    for (let i = 1; i < group.length; i++) {
      const dupe = group[i];
      const dupeKey = dupe.fs_id ? String(dupe.fs_id) : (dupe.url || dupe.path);
      duplicateOf.set(dupeKey, { dupe, canonical });
    }
  }
}

const canonicalItems = Array.from(canonicalMap.values());

// Filter images: screenshots, ideas, useful pictures
const allImages = canonicalItems.filter(item => {
  const fn = (item.filename || item.name || '').toLowerCase();
  const ext = fn.split('.').pop();
  const p = (item.path || '').toLowerCase();
  const isImgExt = ['png', 'jpg', 'jpeg', 'webp'].includes(ext);
  const isKnowledgeDir = ['screenshots', 'ideas', 'useful'].some(k => p.includes(k)) || fn.includes('screenshot');
  return isImgExt && isKnowledgeDir;
});

// Filter reels/videos: Instagram reels and short movies
const allVideos = canonicalItems.filter(item => {
  const fn = (item.filename || item.name || '').toLowerCase();
  const ext = fn.split('.').pop();
  const p = (item.path || '').toLowerCase();
  const isVidExt = ['mp4', 'mov', 'webm'].includes(ext);
  const isReelDir = ['/instagram', '/movies/inshot', '/movies', '/import2'].some(k => p.includes(k)) || fn.includes('vid_');
  return isVidExt && isReelDir;
});

const pendingImages = allImages.filter(item => {
  const key = item.fs_id ? String(item.fs_id) : (item.url || item.path);
  return !progress.images.processed[key] && !progress.images.skipped_personal[key] && !progress.images.skipped_duplicate[key];
});

const pendingVideos = allVideos.filter(item => {
  const key = item.fs_id ? String(item.fs_id) : (item.url || item.path);
  return !progress.videos.processed[key] && !progress.videos.skipped_personal[key] && !progress.videos.skipped_duplicate[key];
});

console.log(`🖼️  Canonical Knowledge Images: ${allImages.length} | Pending: ${pendingImages.length} | Current Counter: #${progress.images.counter}`);
console.log(`🎬 Canonical Instagram Reels & Videos: ${allVideos.length} | Pending: ${pendingVideos.length} | Current Counter: #${progress.videos.counter}\n`);

const imagesToProcess = limitImages > 0 ? pendingImages.slice(0, limitImages) : pendingImages;
const videosToProcess = limitVideos > 0 ? pendingVideos.slice(0, limitVideos) : pendingVideos;

if (isDryRun) {
  console.log(`[DRY RUN] Would process ${imagesToProcess.length} images and ${videosToProcess.length} reels.`);
  process.exit(0);
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTE FORMATTING HELPER
// ─────────────────────────────────────────────────────────────────────────────
function formatMarkdown(streamType, noteNumber, extraction, item, categoryFolder, modelName, duplicates = []) {
  const numStr = String(noteNumber).padStart(4, '0');
  const sanitizedTitle = (extraction.title || item.filename || 'Untitled')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  const filename = `${numStr} - ${sanitizedTitle}.md`;
  const sizeMB = ((item.size || 0) / (1024 * 1024)).toFixed(2);
  const now = new Date().toISOString().slice(0, 10);

  const yamlTopics = (extraction.topics || []).map(t => `  - "${t}"`).join('\n');
  const keyInfoBullets = (extraction.key_information || []).map(k => `- ${k}`).join('\n');

  const atomicBlocks = (extraction.atomic_knowledge || []).map(ak => {
    return `- **${ak.statement}** *(Type: \`${ak.type || 'CONCEPT'}\` | Confidence: ${Math.round((ak.confidence || 0.9) * 100)}%)*`;
  }).join('\n');

  const insightsBullets = (extraction.insights || []).map(i => `- ${i}`).join('\n');
  const actionsBullets = (extraction.actions || []).map(a => `- [ ] ${a}`).join('\n');
  const topicLinks = (extraction.topics || []).map(t => `- [[${t}]]`).join('\n');

  let duplicatesSection = '';
  if (duplicates.length > 0) {
    const dupeLines = duplicates.map(d => `- [${d.filename}](${d.url}) (\`${d.path}\`)`).join('\n');
    duplicatesSection = `\n- **Duplicate / Alternate Pointers:**\n${dupeLines}`;
  }

  let transcriptCallout = '';
  if (extraction.full_transcript || extraction.audio_sound_profile) {
    transcriptCallout = `\n> [!quote] 🎙️ Reel Transcript & Audio Atmosphere\n> ${extraction.audio_sound_profile ? `**Audio Sound Profile:** ${extraction.audio_sound_profile}\n> \n> ` : ''}${extraction.full_transcript || 'No spoken voice transcript.'}\n`;
  }

  let visualTextCallout = '';
  if (extraction.visual_text_content && extraction.visual_text_content.length > 0) {
    const visualBullets = extraction.visual_text_content.map(v => `> - ${v}`).join('\n');
    visualTextCallout = `\n> [!example] 📱 On-Screen Text & Visual Overlays\n${visualBullets}\n`;
  }

  const content = `---
id: KN-${streamType.toUpperCase()}-${numStr}
number: ${noteNumber}
stream: "${streamType}"
type: knowledge
category: "${categoryFolder}"
source_type: ${extraction.source_type || streamType}
storage: terabox
raw_url: "${item.url}"
file_size_mb: ${sizeMB}
priority: ${item.priority || 'P1'}
extracted_by: "${modelName}"
shared_memory_connected: true
topics:
${yamlTopics || '  - "Knowledge Capture"'}
source_id: SRC-${streamType.toUpperCase()}-${item.fs_id || numStr}
created: ${now}
---

# #${numStr} ${extraction.title}

> [!abstract] 💡 Fundamental Core Idea
> ${extraction.core_idea || 'Knowledge capture indexed from TeraBox cloud catalog.'}
${transcriptCallout}${visualTextCallout}
## 📑 Key Takeaways & Information
${keyInfoBullets || '- No specific itemized points extracted.'}

## ⚛️ Atomic Knowledge Deductions
${atomicBlocks || '- **Core Axiom:** Systemic knowledge preservation allows structured retrieval.'}

## 🔭 Strategic Insights & Mental Models
${insightsBullets || '- Preserving media pointers retains visual clarity without local storage penalty.'}

## ✅ Actionable Implementation Items
${actionsBullets || '- [ ] Review media asset when executing related work.'}

## 🏷️ Connected Topics & Concept Map
${topicLinks || '- [[Second Brain]]'}

---
## 📦 TeraBox Cloud Provenance
- **Original File:** \`${item.filename}\`
- **TeraBox Cloud Path:** \`${item.path}\`
- **File Size:** ${sizeMB} MB
- **Direct Cloud Link:** [Open in TeraBox](${item.url})
- **Sequential Numbering:** #${numStr} (${streamType})
- **Extracted By:** \`${modelName}\`${duplicatesSection}
`;

  return { filename, content, numStr, sanitizedTitle };
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALOG INDEX HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function updateStreamIndex(streamDir, streamType, notesList) {
  const title = streamType === 'images' ? '📸 TeraBox Screenshots & Images Catalog' : '🎬 TeraBox Instagram Reels & Videos Catalog';
  const rows = notesList.map(n => 
    `| **#${n.numStr}** | [[${n.categoryFolder}/${n.filename}\\|${n.title}]] | \`${n.categoryFolder}\` | ${n.coreIdea.slice(0, 90)}... | [TeraBox](${n.url}) |`
  ).join('\n');

  const content = `---
type: catalog_index
stream: "${streamType}"
total_items: ${notesList.length}
updated: ${new Date().toISOString()}
---

# ${title}

> [!info] Sequential Stream Catalog
> Every ${streamType === 'images' ? 'image/screenshot' : 'Instagram reel/video'} is indexed with dedicated sequential numbering (#0001, #0002...), classified into thematic category subfolders with exhaustive core ideas, transcripts, on-screen text, and atomic deductions.

| # | Knowledge Note | Category | Core Idea | Cloud Source |
| :---: | :--- | :--- | :--- | :---: |
${rows || '| - | *No items extracted yet* | - | - | - |'}
`;

  fs.writeFileSync(path.join(streamDir, '_Index.md'), content, 'utf8');
}

function updateMasterDashboard() {
  const totalImg = progress.images.counter;
  const totalVid = progress.videos.counter;
  const content = `---
type: dashboard
title: "TeraBox Knowledge Extraction Dashboard"
total_images_extracted: ${totalImg}
total_videos_extracted: ${totalVid}
updated: ${new Date().toISOString()}
---

# 📦 TeraBox Knowledge System

> [!abstract] Dual-Stream Architecture
> The 100 GB library is extracted into two dedicated streams organized under \`vault/terabox/\`:
> - 📸 **[[images/_Index|Images & Screenshots]]** (Current count: **${totalImg}** notes)
> - 🎬 **[[videos/_Index|Instagram Reels & Videos]]** (Current count: **${totalVid}** notes)
> Each stream maintains its own independent sequential numbering (#0001, #0002...) and categorizes each note into curated thematic subfolders.

## 🗂️ Streams Quick Navigation
- **[[images/_Index|Browse All Extracted Images]]**
- **[[videos/_Index|Browse All Extracted Reels & Videos]]**

## 📊 Status & Controls
- **Images Progress:** ${totalImg} notes extracted
- **Videos Progress:** ${totalVid} notes extracted
- **Operation State:** Paused and awaiting user continuation command
`;
  fs.writeFileSync(path.join(TERABOX_DIR, '_Index.md'), content, 'utf8');
  fs.writeFileSync(path.join(TERABOX_DIR, 'README.md'), content, 'utf8');
}

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTE EXTRACTION STREAM
// ─────────────────────────────────────────────────────────────────────────────
async function processStream(streamType, itemsList) {
  const streamDir = streamType === 'images' ? IMAGES_DIR : VIDEOS_DIR;
  const streamProgress = progress[streamType];
  const streamName = streamType === 'images' ? 'Images / Screenshots' : 'Instagram Reels / Videos';

  console.log(`\n================================================================`);
  console.log(`▶️ Processing ${itemsList.length} ${streamName}`);
  console.log(`================================================================`);

  const createdNotes = [];

  for (let i = 0; i < itemsList.length; i++) {
    const item = itemsList[i];
    const key = item.fs_id ? String(item.fs_id) : (item.url || item.path);
    const sizeMB = ((item.size || 0) / (1024 * 1024)).toFixed(2);
    const fp = getFingerprint(item);
    const group = fingerprintGroups[fp] || [];
    const duplicates = group.filter(x => (x.fs_id ? String(x.fs_id) : x.path) !== key);

    console.log(`[${i + 1}/${itemsList.length}] ${streamType === 'images' ? '📸' : '🎬'} ${item.filename} (${sizeMB} MB)`);

    const metaText = `Type: ${streamType === 'images' ? 'Screenshot / UI Image' : 'Instagram Reel / Short Video'}
File Name: ${item.filename}
Path: ${item.path}
Size: ${sizeMB} MB
Storage: TeraBox Cloud
URL: ${item.url}
Priority: ${item.priority || 'P1'}
Context: ${item.path.includes('Instagram') ? 'Instagram Reel video clip' : 'Knowledge screenshot / Idea capture'}`;

    try {
      // 1. Multi-AI Knowledge Extraction
      const { extraction, modelUsed } = await orchestrator.extractKnowledge(item, metaText);

      // 2. Personal photo filter
      if (extraction.is_personal_media || extraction.should_skip_note) {
        console.log(`   ⏭️ Skipped personal snapshot (vault kept clean)`);
        streamProgress.skipped_personal[key] = {
          title: extraction.title,
          path: item.path,
          time: new Date().toISOString()
        };
        saveProgress();
        await new Promise(r => setTimeout(r, 600));
        continue;
      }

      // 3. Assign Sequential Number (1, 2, 3...)
      streamProgress.counter += 1;
      const noteNumber = streamProgress.counter;

      // 4. Classify Category
      const categoryFolder = classifyCategory(item, extraction);
      const categoryPath = path.join(streamDir, categoryFolder);
      if (!fs.existsSync(categoryPath)) fs.mkdirSync(categoryPath, { recursive: true });

      // 5. Generate Markdown
      const { filename, content, numStr, sanitizedTitle } = formatMarkdown(
        streamType,
        noteNumber,
        extraction,
        item,
        categoryFolder,
        modelUsed,
        duplicates
      );

      // 6. Write Note
      const noteFilePath = path.join(categoryPath, filename);
      fs.writeFileSync(noteFilePath, content, 'utf8');

      // 7. Record in shared memory
      sharedMemory.recordExtraction(modelUsed, extraction, noteNumber, `${streamType}/${categoryFolder}`);

      // 8. Queue DB insertion
      const now = new Date().toISOString();
      const sourceId = `SRC-${streamType.toUpperCase()}-${item.fs_id || numStr}`;
      const knowledgeId = `KN-${streamType.toUpperCase()}-${numStr}`;
      const escapeSql = (s) => s ? "'" + String(s).replace(/'/g, "''") + "'" : "NULL";

      const insertSourceSql = `INSERT OR REPLACE INTO sources (id, raw_id, source_type, title, original_url, raw_storage, raw_url, file_size, captured_at, processed_at, status, content_hash, importance, priority, created_at)
        VALUES (${escapeSql(sourceId)}, ${escapeSql('RAW-' + (item.fs_id || numStr))}, ${escapeSql(streamType === 'images' ? 'screenshot' : 'video')}, ${escapeSql(extraction.title)}, ${escapeSql(item.url)}, 'terabox', ${escapeSql(item.url)}, ${item.size || 0}, ${escapeSql(now)}, ${escapeSql(now)}, 'DONE', ${escapeSql(fp)}, 8, 'P1', ${escapeSql(now)});`;

      const insertKnowledgeSql = `INSERT OR REPLACE INTO knowledge (id, source_id, title, knowledge_type, core_idea, full_transcript, visual_text_content, audio_sound_profile, key_information, insights, actionable_items, topics, entities, tags, confidence, importance, why_saved, what_changed, markdown_path, created_at, updated_at)
        VALUES (${escapeSql(knowledgeId)}, ${escapeSql(sourceId)}, ${escapeSql(extraction.title)}, ${escapeSql(extraction.source_type || streamType)}, ${escapeSql(extraction.core_idea)}, ${escapeSql(extraction.full_transcript || null)}, ${escapeSql(extraction.visual_text_content ? JSON.stringify(extraction.visual_text_content) : null)}, ${escapeSql(extraction.audio_sound_profile || null)}, ${escapeSql(JSON.stringify(extraction.key_information || []))}, ${escapeSql(JSON.stringify(extraction.insights || []))}, ${escapeSql(JSON.stringify(extraction.actions || []))}, ${escapeSql(JSON.stringify(extraction.topics || []))}, ${escapeSql(JSON.stringify(extraction.entities || []))}, '[]', 0.95, 8, 'TeraBox extraction', '', ${escapeSql('terabox/' + streamType + '/' + categoryFolder + '/' + filename)}, ${escapeSql(now)}, ${escapeSql(now)});`;

      executeSql(insertSourceSql);
      executeSql(insertKnowledgeSql);
      queueRemoteSql(insertSourceSql);
      queueRemoteSql(insertKnowledgeSql);

      console.log(`   ✅ Note Created: #${numStr} [${categoryFolder}] "${extraction.title}" [AI: ${modelUsed}]`);

      streamProgress.processed[key] = {
        note_number: noteNumber,
        knowledge_id: knowledgeId,
        title: extraction.title,
        category: categoryFolder,
        filename,
        model: modelUsed,
        time: now
      };
      saveProgress();

      createdNotes.push({
        numStr,
        filename,
        title: extraction.title,
        categoryFolder,
        coreIdea: extraction.core_idea || '',
        url: item.url
      });

    } catch (err) {
      console.error(`   ❌ Failed: ${item.filename} -> ${err.message}`);
      streamProgress.failed[key] = { error: err.message, time: new Date().toISOString() };
      saveProgress();
    }

    // Rate limit throttle
    await new Promise(r => setTimeout(r, 1500));
  }

  // Update stream index
  const allStreamNotes = Object.values(streamProgress.processed).map(p => ({
    numStr: String(p.note_number).padStart(4, '0'),
    filename: p.filename,
    title: p.title,
    categoryFolder: p.category,
    coreIdea: 'Extracted note',
    url: ''
  })).sort((a, b) => parseInt(a.numStr, 10) - parseInt(b.numStr, 10));

  updateStreamIndex(streamDir, streamType, allStreamNotes);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  // Step 1: Process Images
  await processStream('images', imagesToProcess);

  // Step 2: Process Videos
  await processStream('videos', videosToProcess);

  // Step 3: Update Master Dashboard
  updateMasterDashboard();

  // Step 4: Sync to Remote Cloudflare D1
  await flushRemoteD1();

  console.log(`\n================================================================`);
  console.log(`🎉 Batch Execution Completed!`);
  console.log(`================================================================`);
  console.log(`📸 Images Extracted: ${progress.images.counter}`);
  console.log(`🎬 Reels Extracted: ${progress.videos.counter}`);
  console.log(`🗂️ Stored under: vault/terabox/images/ and vault/terabox/videos/`);
  console.log(`⏸️ System is now paused and ready for user review.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
