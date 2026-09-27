import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const VAULT_DIR = path.resolve(ROOT_DIR, 'vault');

// Helper to load key=value pairs from a file
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

const targetPath = process.argv[2] || 'terabox-manifest.json';

if (process.argv.includes('--help')) {
  console.log(`
📦 TeraBox Deduplicated Knowledge Extractor & Note Generator
─────────────────────────────────────────────────────────────
Parses your TeraBox collection with multi-layer deduplication:
1. Exact & Fingerprint deduplication (eliminates duplicate files, copies, nested downloads)
2. Semantic deduplication (merges notes with identical/similar titles instead of creating duplicates)
3. Personal photo AI filter (ignores casual family photos to keep vault pristine)

Usage:
  node scripts/terabox-importer.mjs [manifest.json] [options]

Options:
  --type <type>        Filter by file type: 'pdf', 'screenshot', 'video', 'voice', or 'all' (default: all)
  --priority <level>   Filter by priority: 'P0', 'P1', 'P2', 'P3'
  --filter <keyword>   Filter items matching keyword in path or filename (case-insensitive)
  --limit <number>     Process only first N pending items
  --dry-run            Show duplicate analysis and matching items without calling Gemini
  --sync-github        Commit extracted notes directly to GitHub Obsidian vault
  --model <model>      Gemini model to use (default: gemini-2.5-flash)

Examples:
  node scripts/terabox-importer.mjs terabox-manifest.json --type pdf --limit 5
  node scripts/terabox-importer.mjs terabox-manifest.json --filter Ideas --limit 10
  node scripts/terabox-importer.mjs terabox-manifest.json --dry-run
`);
  process.exit(0);
}

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
const geminiModel = getOption('--model', 'gemini-2.5-flash');

const geminiKey = env.GEMINI_API_KEY;
if (!geminiKey && !isDryRun) {
  console.error('❌ Error: GEMINI_API_KEY is not configured in .env or api/.dev.vars');
  process.exit(1);
}

const PROGRESS_FILE = path.resolve(ROOT_DIR, 'terabox-progress.json');
let progress = { processed: {}, skipped_duplicate: {}, skipped_personal: {}, failed: {} };
if (fs.existsSync(PROGRESS_FILE)) {
  try {
    progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    if (!progress.skipped_duplicate) progress.skipped_duplicate = {};
  } catch (e) {
    console.warn('⚠️ Could not parse terabox-progress.json, starting fresh.');
  }
}

function saveProgress() {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf8');
}

// Find local SQLite DB path
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

// Load manifest
if (!fs.existsSync(targetPath)) {
  console.error(`❌ Manifest file not found: ${targetPath}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
console.log(`\n================================================================`);
console.log(`📦 TeraBox Intelligent Deduplication & Note Generator`);
console.log(`================================================================`);
console.log(`Loaded ${manifest.length} total entries from ${targetPath}.\n`);

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 1: FILE & MEDIA FINGERPRINT DEDUPLICATION
// ─────────────────────────────────────────────────────────────────────────────
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

// Group all files by fingerprint
const fingerprintGroups = {};
for (const item of manifest) {
  const fp = getFingerprint(item);
  if (!fingerprintGroups[fp]) fingerprintGroups[fp] = [];
  fingerprintGroups[fp].push(item);
}

// Elect canonical items: prefer shorter paths, original names without "copy" or "(1)"
const canonicalMap = new Map(); // key -> canonicalItem
const duplicateOf = new Map();  // itemKey -> canonicalItem

for (const fp in fingerprintGroups) {
  const group = fingerprintGroups[fp];
  if (group.length === 1) {
    const item = group[0];
    const key = item.fs_id ? String(item.fs_id) : (item.url || item.path);
    canonicalMap.set(key, item);
  } else {
    // Sort items to pick the best original
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

console.log(`🛡️  Deduplication Analysis:`);
console.log(`   - Total Files in Manifest: ${manifest.length}`);
console.log(`   - Unique Canonical Media Files: ${canonicalMap.size}`);
console.log(`   - Redundant Duplicate Files Eliminated: ${duplicateOf.size} (copies, duplicate uploads, nested downloads)`);

// Auto-mark duplicates in SQLite
if (sqliteDbPath && duplicateOf.size > 0) {
  let dupeUpdates = [];
  for (const [dupeKey, { dupe, canonical }] of duplicateOf.entries()) {
    if (!progress.skipped_duplicate[dupeKey]) {
      const canonicalKey = canonical.fs_id ? String(canonical.fs_id) : (canonical.url || canonical.path);
      progress.skipped_duplicate[dupeKey] = {
        canonical_fs_id: canonical.fs_id,
        canonical_filename: canonical.filename,
        path: dupe.path,
        url: dupe.url,
        time: new Date().toISOString()
      };
      const dupeUrl = (dupe.url || '').replace(/'/g, "''");
      const canonTitle = (canonical.filename || '').replace(/'/g, "''");
      dupeUpdates.push(`UPDATE sources SET status = 'DUPLICATE', title = 'Duplicate of: ' || '${canonTitle}' WHERE raw_url = '${dupeUrl}';`);
    }
  }
  if (dupeUpdates.length > 0) {
    try {
      execSync(`(echo "BEGIN TRANSACTION;"; echo "${dupeUpdates.join('\n')}"; echo "COMMIT;") | sqlite3 "${sqliteDbPath}"`, { stdio: 'pipe' });
    } catch {}
    saveProgress();
  }
}

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

console.log(`\n🎯 Filtered Canonical Set (type: ${filterType}, priority: ${filterPriority || 'any'}, keyword: "${filterKeyword || 'none'}"): ${items.length} unique items`);

const alreadyDone = Object.keys(progress.processed).length;
const alreadySkippedPersonal = Object.keys(progress.skipped_personal).length;
const alreadySkippedDupe = Object.keys(progress.skipped_duplicate).length;
console.log(`📊 Progress: ${alreadyDone} notes created | ${alreadySkippedDupe} duplicates eliminated | ${alreadySkippedPersonal} personal media skipped`);

const pending = items.filter(item => {
  const key = item.fs_id ? String(item.fs_id) : (item.url || item.path);
  return !progress.processed[key] && !progress.skipped_personal[key] && !progress.skipped_duplicate[key];
});

console.log(`⚡ Remaining pending to process: ${pending.length} items\n`);

if (isDryRun) {
  console.log(`[DRY RUN] Showing first 5 unique canonical items:`);
  console.log(JSON.stringify(pending.slice(0, 5), null, 2));
  process.exit(0);
}

const toProcess = limitCount > 0 ? pending.slice(0, limitCount) : pending;
if (toProcess.length === 0) {
  console.log(`✅ All matching items have already been processed or deduplicated!`);
  process.exit(0);
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 2: INDEX EXISTING VAULT NOTES FOR SEMANTIC DEDUPLICATION
// ─────────────────────────────────────────────────────────────────────────────
const existingTitles = new Map(); // normTitle -> { knowledgeId, filePath }
const knowledgeFolder = path.join(VAULT_DIR, '01 Knowledge');
if (fs.existsSync(knowledgeFolder)) {
  const noteFiles = fs.readdirSync(knowledgeFolder).filter(f => f.endsWith('.md'));
  for (const file of noteFiles) {
    const full = path.join(knowledgeFolder, file);
    const content = fs.readFileSync(full, 'utf8');
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const idMatch = content.match(/^id:\s*(.+)$/m);
    if (titleMatch) {
      const norm = normalizeName(titleMatch[1]);
      existingTitles.set(norm, {
        knowledgeId: idMatch ? idMatch[1].trim() : file.replace(/\.md$/, ''),
        filePath: full,
        filename: file
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GEMINI SYSTEM PROMPT (WITH PERSONAL FILTER & DEDUPLICATION)
// ─────────────────────────────────────────────────────────────────────────────
const EXTRACTION_PROMPT = `You are the Knowledge Extraction Engine for a personal Second Brain.
Analyze the provided source file metadata, filename, path context, and link.

PERSONAL PHOTO & CASUAL MEDIA NOISE RULE:
If the source is a casual personal photograph, family picture, selfie, vacation snapshot, food picture, or random family media that DOES NOT contain technical diagrams, UI mockups, text notes, book pages, educational tutorials, or conceptual knowledge:
Set "is_personal_media": true, "should_skip_note": true, "title": "Personal Media - Ignored", "core_idea": "Personal photograph without knowledge or text content."

Otherwise, extract high-density, structured knowledge into strictly valid JSON matching this schema:
{
  "title": "Clean concise conceptual title for the note",
  "source_type": "pdf | video | screenshot | voice | text",
  "core_idea": "2-3 sentence fundamental essence of what this file represents",
  "key_information": ["Bullet 1", "Bullet 2", "Bullet 3"],
  "atomic_knowledge": [
    {
      "statement": "Self-contained atomic statement or principle",
      "type": "CONCEPT | FACT | CLAIM | ACTION | INSIGHT",
      "confidence": 0.95
    }
  ],
  "insights": ["Strategic insight or takeaway"],
  "actions": ["Actionable step or todo if applicable"],
  "topics": ["Topic1", "Topic2"],
  "entities": ["Entity1", "Tool2"],
  "why_saved": "Why this file was saved and its value in the knowledge vault",
  "what_changed": "How this shifts prior beliefs or expands mental models",
  "is_personal_media": false,
  "should_skip_note": false
}`;

async function callGemini(metaText) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: metaText }] }],
      systemInstruction: { parts: [{ text: EXTRACTION_PROMPT }] },
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error [${res.status}]: ${errText}`);
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Empty response from Gemini');
  return JSON.parse(rawText);
}

function generateMarkdown(knowledgeId, extraction, item, duplicates = []) {
  const sanitizedTitle = (extraction.title || item.filename || 'Untitled')
    .replace(/[\\/:*?"<>|]/g, '-')
    .trim();
  const filename = `${knowledgeId} - ${sanitizedTitle}.md`;

  const yamlTopics = (extraction.topics || []).map(t => `  - ${t}`).join('\n');
  const keyInfoBullets = (extraction.key_information || []).map(k => `- ${k}`).join('\n');
  const atomicBlocks = (extraction.atomic_knowledge || []).map((ak, idx) => {
    const heading = ak.statement.split('.')[0] || `Atomic Idea #${idx + 1}`;
    return `### ${heading}\n\n${ak.statement}\n\n**Type:** \`${ak.type}\` | **Confidence:** ${Math.round((ak.confidence || 0.9) * 100)}%`;
  }).join('\n\n');
  const insightsBullets = (extraction.insights || []).map(i => `- ${i}`).join('\n');
  const actionsBullets = (extraction.actions || []).map(a => `- [ ] ${a}`).join('\n');
  const topicLinks = (extraction.topics || []).map(t => `- [[${t}]]`).join('\n');

  let duplicatesSection = '';
  if (duplicates.length > 0) {
    const dupeLines = duplicates.map(d => `- [${d.filename}](${d.url}) (\`${d.path}\`)`).join('\n');
    duplicatesSection = `\n### Alternate / Duplicate Pointers in TeraBox\n${dupeLines}\n`;
  }

  const content = `---
id: ${knowledgeId}
type: knowledge
source_type: ${extraction.source_type || 'pointer'}
raw_id: RAW-TERABOX-${item.fs_id || 'POINTER'}
storage: terabox
raw_url: "${item.url}"
file_size: ${item.size || 0}
priority: ${item.priority || 'P1'}
topics:
${yamlTopics || '  - Uncategorized'}
source_id: SRC-${item.fs_id || 'POINTER'}
created: ${new Date().toISOString().slice(0, 10)}
---

# ${extraction.title || item.filename}

## Core Idea

${extraction.core_idea || 'Knowledge capture pointer.'}

## Key Information

${keyInfoBullets || '- No specific bullet points recorded.'}

## Atomic Knowledge

${atomicBlocks || 'No atomic items extracted.'}

## Insights

${insightsBullets || '- Direct knowledge capture.'}

## Actions

${actionsBullets || '- [ ] Review original file in TeraBox when needed'}

## Related Topics

${topicLinks || '- [[Inbox]]'}

---

## Provenance & Raw Media Pointer
- **Storage:** TeraBox Cloud
- **File Name:** \`${item.filename}\`
- **Original Path:** \`${item.path}\`
- **File Size:** ${( (item.size || 0) / (1024 * 1024) ).toFixed(2)} MB
- **Direct Link:** [Open in TeraBox](${item.url})
${duplicatesSection}`;

  return { filename, content };
}

// GitHub Commit Helper
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
  } catch (err) {
    // Ignore GitHub sync error
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION LOOP
// ─────────────────────────────────────────────────────────────────────────────
console.log(`🚀 Processing ${toProcess.length} items with Gemini ${geminiModel}...\n`);

let count = 0;
for (const item of toProcess) {
  count++;
  const key = item.fs_id ? String(item.fs_id) : (item.url || item.path);
  const sizeMB = ((item.size || 0) / (1024 * 1024)).toFixed(2);
  const fp = getFingerprint(item);
  const group = fingerprintGroups[fp] || [];
  const duplicates = group.filter(x => (x.fs_id ? String(x.fs_id) : x.path) !== key);

  console.log(`[${count}/${toProcess.length}] Processing: ${item.filename} (${sizeMB} MB, ${item.priority || 'P1'})`);
  if (duplicates.length > 0) {
    console.log(`   🔗 Linked with ${duplicates.length} duplicate file(s) in TeraBox`);
  }

  const metaText = `File Name: ${item.filename}
Path: ${item.path}
Size: ${sizeMB} MB
Storage: TeraBox
URL: ${item.url}
Priority: ${item.priority || 'P1'}`;

  try {
    const extraction = await callGemini(metaText);

    // 1. Personal photo filter
    if (extraction.is_personal_media || extraction.should_skip_note) {
      console.log(`   ⏭️  Skipped personal/family photo (vault kept clean)`);
      progress.skipped_personal[key] = {
        title: extraction.title,
        path: item.path,
        time: new Date().toISOString()
      };
      if (item.fs_id) {
        executeSql(`UPDATE sources SET status = 'IGNORED_PERSONAL_MEDIA' WHERE raw_id = 'RAW-TERABOX-${item.fs_id}' OR id = 'SRC-${item.fs_id}';`);
      }
      saveProgress();
      await new Promise(r => setTimeout(r, 1200));
      continue;
    }

    // 2. Semantic title deduplication
    const normTitle = normalizeName(extraction.title || item.filename);
    const existing = existingTitles.get(normTitle);

    if (existing) {
      console.log(`   🔁 Duplicate topic/note detected: "${extraction.title}"`);
      console.log(`      ↳ Merging pointer into existing note [${existing.filename}]`);

      // Append pointer to existing markdown note
      try {
        let noteContent = fs.readFileSync(existing.filePath, 'utf8');
        const appendPointer = `- **Additional Pointer:** [${item.filename}](${item.url}) (\`${item.path}\`)\n`;
        if (!noteContent.includes(item.url)) {
          noteContent += `\n${appendPointer}`;
          fs.writeFileSync(existing.filePath, noteContent, 'utf8');
        }
      } catch {}

      // Update SQLite source
      const now = new Date().toISOString();
      executeSql(`
        UPDATE sources SET status = 'DONE', title = '${(extraction.title || '').replace(/'/g, "''")}', processed_at = '${now}' WHERE raw_id = 'RAW-TERABOX-${item.fs_id}' OR id = 'SRC-${item.fs_id}';
      `);

      progress.processed[key] = {
        knowledge_id: existing.knowledgeId,
        title: extraction.title,
        merged_into: existing.filename,
        time: now
      };
      saveProgress();
      await new Promise(r => setTimeout(r, 1200));
      continue;
    }

    // 3. New unique knowledge note creation
    const knowledgeId = `KN-${item.fs_id ? String(item.fs_id).slice(-6) : Math.floor(100000 + Math.random() * 900000)}`;
    const { filename, content } = generateMarkdown(knowledgeId, extraction, item, duplicates);

    // Save locally to Obsidian Vault
    if (!fs.existsSync(knowledgeFolder)) fs.mkdirSync(knowledgeFolder, { recursive: true });
    const localFilePath = path.join(knowledgeFolder, filename);
    fs.writeFileSync(localFilePath, content, 'utf8');

    // Register title in semantic index
    existingTitles.set(normTitle, {
      knowledgeId,
      filePath: localFilePath,
      filename
    });

    // Update SQLite database
    const now = new Date().toISOString();
    const sourceId = `SRC-${item.fs_id || 'POINTER'}`;
    const escapeSql = (s) => s ? "'" + String(s).replace(/'/g, "''") + "'" : "NULL";

    executeSql(`
      INSERT OR REPLACE INTO knowledge (id, source_id, title, knowledge_type, core_idea, key_information, insights, my_thought, actionable_items, topics, entities, tags, confidence, importance, why_saved, what_changed, markdown_path, created_at, updated_at)
      VALUES (${escapeSql(knowledgeId)}, ${escapeSql(sourceId)}, ${escapeSql(extraction.title)}, ${escapeSql(extraction.source_type || 'pointer')}, ${escapeSql(extraction.core_idea)}, ${escapeSql(JSON.stringify(extraction.key_information || []))}, ${escapeSql(JSON.stringify(extraction.insights || []))}, NULL, ${escapeSql(JSON.stringify(extraction.actions || []))}, ${escapeSql(JSON.stringify(extraction.topics || []))}, ${escapeSql(JSON.stringify(extraction.entities || []))}, '[]', 0.95, 7, ${escapeSql(extraction.why_saved || '')}, ${escapeSql(extraction.what_changed || '')}, ${escapeSql('01 Knowledge/' + filename)}, ${escapeSql(now)}, ${escapeSql(now)});
      UPDATE sources SET status = 'DONE', title = ${escapeSql(extraction.title)}, processed_at = ${escapeSql(now)} WHERE raw_id = 'RAW-TERABOX-${item.fs_id}' OR id = '${sourceId}';
    `);

    // Sync to GitHub if requested
    let ghCommit = '';
    if (syncGithub) {
      const sha = await commitToGitHub(`01 Knowledge/${filename}`, content, `vault: add ${extraction.title}`);
      if (sha) ghCommit = ` (GitHub: ${sha})`;
    }

    console.log(`   ✅ Note Created: ${knowledgeId} - "${extraction.title}"${ghCommit}`);

    progress.processed[key] = {
      knowledge_id: knowledgeId,
      title: extraction.title,
      filename,
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

  // Gentle throttle
  await new Promise(r => setTimeout(r, 1200));
}

console.log(`\n🎉 Batch processing completed!`);
console.log(`📊 Notes Created: ${Object.keys(progress.processed).length}`);
console.log(`🛡️  Exact Duplicates Eliminated: ${Object.keys(progress.skipped_duplicate).length}`);
console.log(`🚫 Personal Photos Ignored: ${Object.keys(progress.skipped_personal).length}`);
console.log(`📁 Local notes saved in: ${knowledgeFolder}`);
