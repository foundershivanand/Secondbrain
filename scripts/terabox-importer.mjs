import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import {
  SharedMemoryManager,
  MultiAiOrchestrator,
  classifyCategory,
  formatKnowledgeMarkdown,
  updateCategoryIndex
} from './ai-orchestrator.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const VAULT_DIR = path.resolve(ROOT_DIR, 'vault');
const KNOWLEDGE_DIR = path.resolve(VAULT_DIR, '01 Knowledge');

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

const firstArg = process.argv[2];
const targetPath = (firstArg && !firstArg.startsWith('--')) ? firstArg : 'terabox-manifest.json';

function getOption(flag, fallback = '') {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('--')) {
    return process.argv[idx + 1];
  }
  return fallback;
}

const filterType = getOption('--type', 'all').toLowerCase();
const filterPriority = getOption('--priority', '').toUpperCase();
const filterKeyword = getOption('--filter', '').toLowerCase();
const limitCount = parseInt(getOption('--limit', '0'), 10);
const isDryRun = process.argv.includes('--dry-run');
const syncGithub = process.argv.includes('--sync-github');

// Initialize Shared Memory & Multi-AI Orchestrator
const sharedMemory = new SharedMemoryManager();
const orchestrator = new MultiAiOrchestrator(env, sharedMemory);

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────
const PROGRESS_FILE = path.resolve(ROOT_DIR, 'terabox-progress.json');
let progress = { counter: 0, processed: {}, skipped_duplicate: {}, skipped_personal: {}, failed: {} };
if (fs.existsSync(PROGRESS_FILE)) {
  try {
    progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    if (progress.counter === undefined) progress.counter = 0;
    if (!progress.skipped_duplicate) progress.skipped_duplicate = {};
    if (!progress.skipped_personal) progress.skipped_personal = {};
    if (!progress.failed) progress.failed = {};
    if (!progress.processed) progress.processed = {};
  } catch (e) {
    console.warn('⚠️ Could not parse terabox-progress.json, starting fresh.');
  }
}

function saveProgress() {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf8');
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL SQLITE HELPER
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
  } catch (err) {
    // Ignore error
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LOAD MANIFEST & FINGERPRINT DEDUPLICATION
// ─────────────────────────────────────────────────────────────────────────────
if (!fs.existsSync(targetPath)) {
  console.error(`❌ Manifest file not found: ${targetPath}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
console.log(`\n================================================================`);
console.log(`📦 TeraBox Intelligent Multi-AI Knowledge Extractor`);
console.log(`================================================================`);
console.log(`Manifest loaded: ${manifest.length} total entries from ${targetPath}.`);
console.log(`Shared Multi-AI Memory: Connected (Gemini Flash, Grok, Claude, Copilot/Free)`);

function normalizeName(name) {
  return name.toLowerCase()
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
for (const item of manifest) {
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
      const aIsNested = (a.path || '').includes('/Download/TeraBox/');
      const bIsNested = (b.path || '').includes('/Download/TeraBox/');
      if (aIsNested !== bIsNested) return aIsNested ? 1 : -1;
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

console.log(`🛡️  Deduplication Summary:`);
console.log(`   - Total Manifest Items: ${manifest.length}`);
console.log(`   - Canonical Unique Media Items: ${canonicalMap.size}`);
console.log(`   - Redundant Duplicate Files Eliminated: ${duplicateOf.size}\n`);

// ─────────────────────────────────────────────────────────────────────────────
// FILTERING
// ─────────────────────────────────────────────────────────────────────────────
let items = Array.from(canonicalMap.values()).filter(item => {
  const filename = item.filename || item.name || '';
  const ext = filename.split('.').pop().toLowerCase();
  const pathLower = (item.path || '').toLowerCase();
  const nameLower = filename.toLowerCase();

  let type = 'other';
  if (['mp4', 'mov', 'mkv', 'webm', 'avi'].includes(ext)) type = 'video';
  else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) type = 'screenshot';
  else if (['pdf'].includes(ext)) type = 'pdf';
  else if (['mp3', 'm4a', 'wav', 'ogg'].includes(ext)) type = 'voice';

  if (filterType !== 'all') {
    if (filterType === 'video' && type !== 'video') return false;
    if (filterType === 'screenshot' && type !== 'screenshot') return false;
    if (filterType === 'pdf' && type !== 'pdf') return false;
    if (filterType === 'voice' && type !== 'voice') return false;
  }

  if (filterPriority && (item.priority || '').toUpperCase() !== filterPriority) {
    return false;
  }

  if (filterKeyword) {
    if (!nameLower.includes(filterKeyword) && !pathLower.includes(filterKeyword)) {
      return false;
    }
  }

  return true;
});

const pending = items.filter(item => {
  const key = item.fs_id ? String(item.fs_id) : (item.url || item.path);
  return !progress.processed[key] && !progress.skipped_personal[key] && !progress.skipped_duplicate[key];
});

console.log(`🎯 Filtered Set: ${items.length} unique items | ⚡ Pending to extract: ${pending.length} items`);
console.log(`📊 Current Numbering Counter: #${progress.counter}\n`);

if (isDryRun) {
  console.log(`[DRY RUN] First 5 pending items to be extracted:`);
  console.log(JSON.stringify(pending.slice(0, 5), null, 2));
  process.exit(0);
}

const toProcess = limitCount > 0 ? pending.slice(0, limitCount) : pending;
if (toProcess.length === 0) {
  console.log(`✅ All items have been processed or deduplicated!`);
  process.exit(0);
}

// ─────────────────────────────────────────────────────────────────────────────
// GITHUB SYNC HELPER (Optional cloud vault backup)
// ─────────────────────────────────────────────────────────────────────────────
async function commitToGitHub(filePath, content, message) {
  const token = env.GITHUB_TOKEN;
  const owner = env.GITHUB_OWNER || 'sh15aa';
  const repo = env.GITHUB_REPO || 'mysecondbrain';
  const branch = env.GITHUB_BRANCH || 'main';

  if (!token || !owner) return null;

  const cleanPath = filePath.replace(/^\/+/, '');
  const prefix = env.GITHUB_PATH_PREFIX ? `${env.GITHUB_PATH_PREFIX.replace(/^\/+|\/+$/g, '')}/` : 'vault/';
  const fullPath = cleanPath.startsWith(prefix) ? cleanPath : `${prefix}${cleanPath}`;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${fullPath}`;

  try {
    let existingSha;
    const checkRes = await fetch(`${url}?ref=${branch}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Second-Brain-Importer'
      }
    });
    if (checkRes.ok) {
      const checkData = await checkRes.json();
      existingSha = checkData.sha;
    }

    const base64Content = Buffer.from(content).toString('base64');
    const putRes = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Second-Brain-Importer'
      },
      body: JSON.stringify({
        message: message || `vault: add ${fullPath}`,
        content: base64Content,
        branch,
        ...(existingSha ? { sha: existingSha } : {})
      })
    });

    if (putRes.ok) {
      const putData = await putRes.json();
      return putData.commit?.sha?.slice(0, 7);
    }
  } catch (err) {}
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXTRACTION LOOP WITH NUMBERING & FOLDERS
// ─────────────────────────────────────────────────────────────────────────────
console.log(`🚀 Starting extraction of ${toProcess.length} items...\n`);

let processedInRun = 0;

for (const item of toProcess) {
  processedInRun++;
  const key = item.fs_id ? String(item.fs_id) : (item.url || item.path);
  const sizeMB = ((item.size || 0) / (1024 * 1024)).toFixed(2);
  const fp = getFingerprint(item);
  const group = fingerprintGroups[fp] || [];
  const duplicates = group.filter(x => (x.fs_id ? String(x.fs_id) : x.path) !== key);

  console.log(`[${processedInRun}/${toProcess.length}] Processing: ${item.filename} (${sizeMB} MB)`);

  const metaText = `File Name: ${item.filename}
Path: ${item.path}
Size: ${sizeMB} MB
Storage: TeraBox Cloud
URL: ${item.url}
Priority: ${item.priority || 'P1'}`;

  try {
    // 1. Multi-AI Knowledge Extraction
    const { extraction, modelUsed } = await orchestrator.extractKnowledge(item, metaText);

    // 2. Personal photo / noise filter
    if (extraction.is_personal_media || extraction.should_skip_note) {
      console.log(`   ⏭️ Skipped personal/family photo (vault kept pristine)`);
      progress.skipped_personal[key] = {
        title: extraction.title,
        path: item.path,
        time: new Date().toISOString()
      };
      if (item.fs_id) {
        executeSql(`UPDATE sources SET status = 'IGNORED_PERSONAL_MEDIA' WHERE raw_id = 'RAW-TERABOX-${item.fs_id}' OR id = 'SRC-${item.fs_id}';`);
      }
      saveProgress();
      await new Promise(r => setTimeout(r, 800));
      continue;
    }

    // 3. Assign Sequential Number (1, 2, 3, 4...)
    progress.counter += 1;
    const noteNumber = progress.counter;

    // 4. Classify into Curated Thematic Folder
    const categoryFolder = classifyCategory(item, extraction);
    const categoryFolderPath = path.join(KNOWLEDGE_DIR, categoryFolder);
    if (!fs.existsSync(categoryFolderPath)) {
      fs.mkdirSync(categoryFolderPath, { recursive: true });
    }

    // 5. Generate Aesthetic Obsidian Markdown with Callouts
    const { filename, content, numStr } = formatKnowledgeMarkdown(
      noteNumber,
      extraction,
      item,
      categoryFolder,
      modelUsed,
      duplicates
    );

    // 6. Write Note into Categorized Folder
    const noteFilePath = path.join(categoryFolderPath, filename);
    fs.writeFileSync(noteFilePath, content, 'utf8');

    // 7. Update Category _Index.md Catalog Table
    updateCategoryIndex(
      categoryFolderPath,
      numStr,
      extraction.title || item.filename,
      extraction.source_type || 'media',
      extraction.core_idea,
      item.url
    );

    // 8. Update Multi-AI Shared Memory
    sharedMemory.recordExtraction(modelUsed, extraction, noteNumber, categoryFolder);

    // 9. Update SQLite Database
    const now = new Date().toISOString();
    const sourceId = `SRC-${item.fs_id || numStr}`;
    const knowledgeId = `KN-${numStr}`;
    const escapeSql = (s) => s ? "'" + String(s).replace(/'/g, "''") + "'" : "NULL";

    executeSql(`
      INSERT OR REPLACE INTO knowledge (id, source_id, title, knowledge_type, core_idea, full_transcript, visual_text_content, audio_sound_profile, key_information, insights, my_thought, actionable_items, topics, entities, tags, confidence, importance, why_saved, what_changed, markdown_path, created_at, updated_at)
      VALUES (${escapeSql(knowledgeId)}, ${escapeSql(sourceId)}, ${escapeSql(extraction.title)}, ${escapeSql(extraction.source_type || 'media_pointer')}, ${escapeSql(extraction.core_idea)}, ${escapeSql(extraction.full_transcript || null)}, ${escapeSql(extraction.visual_text_content ? JSON.stringify(extraction.visual_text_content) : null)}, ${escapeSql(extraction.audio_sound_profile || null)}, ${escapeSql(JSON.stringify(extraction.key_information || []))}, ${escapeSql(JSON.stringify(extraction.insights || []))}, NULL, ${escapeSql(JSON.stringify(extraction.actions || []))}, ${escapeSql(JSON.stringify(extraction.topics || []))}, ${escapeSql(JSON.stringify(extraction.entities || []))}, '[]', 0.95, 7, ${escapeSql(extraction.why_saved || '')}, ${escapeSql(extraction.what_changed || '')}, ${escapeSql('01 Knowledge/' + categoryFolder + '/' + filename)}, ${escapeSql(now)}, ${escapeSql(now)});
      UPDATE sources SET status = 'DONE', title = ${escapeSql(extraction.title)}, processed_at = ${escapeSql(now)} WHERE raw_id = 'RAW-TERABOX-${item.fs_id}' OR id = '${sourceId}';
    `);

    // 10. Optional GitHub sync
    let ghCommit = '';
    if (syncGithub) {
      const sha = await commitToGitHub(`01 Knowledge/${categoryFolder}/${filename}`, content, `vault: add #${numStr} ${extraction.title}`);
      if (sha) ghCommit = ` (GitHub: ${sha})`;
    }

    console.log(`   ✅ Note Created: #${numStr} [${categoryFolder}] "${extraction.title}" [AI: ${modelUsed}]${ghCommit}`);

    progress.processed[key] = {
      note_number: noteNumber,
      knowledge_id: knowledgeId,
      title: extraction.title,
      category: categoryFolder,
      filename,
      model: modelUsed,
      time: now
    };
    saveProgress();

  } catch (err) {
    console.error(`   ❌ Failed: ${item.filename} -> ${err.message}`);
    progress.failed[key] = {
      error: err.message,
      time: new Date().toISOString()
    };
    saveProgress();
  }

  // Throttle to respect free API rate limits
  await new Promise(r => setTimeout(r, 2000));
}

console.log(`\n================================================================`);
console.log(`🎉 Batch Execution Completed!`);
console.log(`================================================================`);
console.log(`Total Notes Numbered & Created: ${progress.counter}`);
console.log(`Exact Duplicates Eliminated: ${Object.keys(progress.skipped_duplicate).length}`);
console.log(`Personal Photos Filtered Out: ${Object.keys(progress.skipped_personal).length}`);
console.log(`Multi-AI Shared Memory: Synchronized in vault/06 Memories/Shared Memory.md`);
