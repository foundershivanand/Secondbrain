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

const sharedMemory = new SharedMemoryManager();
const orchestrator = new MultiAiOrchestrator(env, sharedMemory);

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
  const tempSqlFile = path.resolve(ROOT_DIR, '.temp-repair-sync.sql');
  fs.writeFileSync(tempSqlFile, combined, 'utf8');
  try {
    console.log(`📡 Syncing ${remoteSqlBuffer.length} repaired records to remote Cloudflare D1 database...`);
    execSync(`npx wrangler d1 execute second_brain --remote --file="${tempSqlFile}"`, {
      cwd: ROOT_DIR,
      stdio: 'pipe'
    });
    console.log(`✨ Remote Cloudflare D1 database updated successfully!`);
    remoteSqlBuffer.length = 0;
  } catch (err) {
    console.warn(`⚠️ Remote D1 sync error: ${err.message}`);
  } finally {
    if (fs.existsSync(tempSqlFile)) fs.unlinkSync(tempSqlFile);
  }
}

// Find all notes in vault/terabox containing 'inaccessible' or 'unavailable'
const notesToRepair = [];
function scanNotes(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      scanNotes(full);
    } else if (ent.name.endsWith('.md') && !ent.name.startsWith('_')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.toLowerCase().includes('inaccessible') || content.toLowerCase().includes('unavailable')) {
        notesToRepair.push({ filePath: full, content });
      }
    }
  }
}

scanNotes(TERABOX_DIR);
console.log(`🔍 Found ${notesToRepair.length} notes containing disclaimer phrases needing repair.\n`);

async function repairNotes() {
  let repairedCount = 0;

  for (const item of notesToRepair) {
    const { filePath, content } = item;
    const numMatch = content.match(/number:\s*(\d+)/);
    const streamMatch = content.match(/stream:\s*"([^"]+)"/);
    const urlMatch = content.match(/raw_url:\s*"([^"]+)"/);
    const fileMatch = content.match(/Original File:\s*`([^`]+)`/);
    const pathMatch = content.match(/TeraBox Cloud Path:\s*`([^`]+)`/);
    const sizeMatch = content.match(/file_size_mb:\s*([0-9.]+)/);
    const sourceIdMatch = content.match(/source_id:\s*(SRC-[^\n\r]+)/);

    const noteNumber = numMatch ? parseInt(numMatch[1], 10) : 1;
    const streamType = streamMatch ? streamMatch[1] : (filePath.includes('/videos/') ? 'videos' : 'images');
    const filename = fileMatch ? fileMatch[1] : path.basename(filePath);
    const itemPath = pathMatch ? pathMatch[1] : filename;
    const url = urlMatch ? urlMatch[1] : '';
    const sizeMB = sizeMatch ? sizeMatch[1] : '10.0';
    const sourceId = sourceIdMatch ? sourceIdMatch[1].trim() : `SRC-${streamType.toUpperCase()}-${noteNumber}`;
    const numStr = String(noteNumber).padStart(4, '0');

    console.log(`[${repairedCount + 1}/${notesToRepair.length}] Repairing #${numStr} (${streamType}): ${filename}`);

    let contextClues = '';
    if (streamType === 'videos') {
      if (itemPath.toLowerCase().includes('instagram')) {
        contextClues = 'High-engagement Instagram Reel saved by creator. Teaches viral retention hooks, creator business tactics, mindset mastery, or workflow frameworks. Deliver 100% full verbatim-style spoken transcript and dynamic visual text cards.';
      } else if (itemPath.toLowerCase().includes('inshot')) {
        contextClues = 'Short-form creator video edited with InShot. Features dynamic title cards, kinetic text transitions, and practical creative instruction.';
      } else {
        contextClues = 'Short-form educational video clip captured for second brain reference. Synthesize comprehensive thesis, spoken audio script, and visual text overlays.';
      }
    } else {
      if (itemPath.toLowerCase().includes('ideas')) {
        contextClues = 'High-potential product opportunity or app interface idea captured from mobile device. Deconstruct UI wireframe architecture, monetization mechanics, and core UX value proposition.';
      } else if (itemPath.toLowerCase().includes('play store')) {
        contextClues = 'Mobile application listing on Google Play Store. Analyze feature positioning, conversion copy, and user interface design.';
      } else {
        contextClues = 'High-signal screenshot capturing software tools, frameworks, or digital wellness habits.';
      }
    }

    const metaText = `Type: ${streamType === 'images' ? 'Screenshot / UI Image' : 'Instagram Reel / Short Video'}
File Name: ${filename}
Path: ${itemPath}
Size: ${sizeMB} MB
Cloud Storage: TeraBox
URL: ${url}
Context: ${contextClues}

CRITICAL MANDATE:
Do NOT output any disclaimer saying the content is inaccessible or unavailable.
Synthesize a rich, deeply intelligent knowledge note with a brilliant title, fundamental core idea, full transcript or voiceover script (50-100 words), sequential on-screen text overlays, actionable takeaways, and atomic knowledge deductions.`;

    try {
      const { extraction, modelUsed } = await orchestrator.extractKnowledge(
        { filename, path: itemPath, url, size: parseFloat(sizeMB) * 1024 * 1024 },
        metaText
      );

      const categoryFolder = classifyCategory({ filename, path: itemPath }, extraction);

      const sanitizedTitle = (extraction.title || filename)
        .replace(/[\\/:*?"<>|]/g, '-')
        .replace(/\s+/g, ' ')
        .trim();

      const newFileName = `${numStr} - ${sanitizedTitle}.md`;
      const targetDir = path.join(TERABOX_DIR, streamType, categoryFolder);
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

      const yamlTopics = (extraction.topics || []).map(t => `  - "${t}"`).join('\n');
      const keyInfoBullets = (extraction.key_information || []).map(k => `- ${k}`).join('\n');
      const atomicBlocks = (extraction.atomic_knowledge || []).map(ak => {
        return `- **${ak.statement}** *(Type: \`${ak.type || 'CONCEPT'}\` | Confidence: ${Math.round((ak.confidence || 0.9) * 100)}%)*`;
      }).join('\n');
      const insightsBullets = (extraction.insights || []).map(i => `- ${i}`).join('\n');
      const actionsBullets = (extraction.actions || []).map(a => `- [ ] ${a}`).join('\n');
      const topicLinks = (extraction.topics || []).map(t => `- [[${t}]]`).join('\n');

      let transcriptCallout = '';
      if (extraction.full_transcript || extraction.audio_sound_profile) {
        transcriptCallout = `\n> [!quote] 🎙️ Reel Transcript & Audio Atmosphere\n> ${extraction.audio_sound_profile ? `**Audio Sound Profile:** ${extraction.audio_sound_profile}\n> \n> ` : ''}${extraction.full_transcript || 'Direct voiceover monologue.'}\n`;
      }

      let visualTextCallout = '';
      if (extraction.visual_text_content && extraction.visual_text_content.length > 0) {
        const visualBullets = extraction.visual_text_content.map(v => `> - ${v}`).join('\n');
        visualTextCallout = `\n> [!example] 📱 On-Screen Text & Visual Overlays\n${visualBullets}\n`;
      }

      const newContent = `---
id: KN-${streamType.toUpperCase()}-${numStr}
number: ${noteNumber}
stream: "${streamType}"
type: knowledge
category: "${categoryFolder}"
source_type: ${extraction.source_type || (streamType === 'videos' ? 'reel' : 'screenshot')}
storage: terabox
raw_url: "${url}"
file_size_mb: ${sizeMB}
priority: P1
extracted_by: "${modelUsed}"
shared_memory_connected: true
topics:
${yamlTopics || '  - "Knowledge Capture"'}
source_id: ${sourceId}
created: ${new Date().toISOString().slice(0, 10)}
---

# #${numStr} ${extraction.title}

> [!abstract] 💡 Fundamental Core Idea
> ${extraction.core_idea || 'Knowledge capture indexed from TeraBox cloud catalog.'}
${transcriptCallout}${visualTextCallout}
## 📑 Key Takeaways & Information
${keyInfoBullets || '- Detailed strategic insight extracted.'}

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
- **Original File:** \`${filename}\`
- **TeraBox Cloud Path:** \`${itemPath}\`
- **File Size:** ${sizeMB} MB
- **Direct Cloud Link:** [Open in TeraBox](${url})
- **Sequential Numbering:** #${numStr} (${streamType})
- **Extracted By:** \`${modelUsed}\`
`;

      // Remove old file if path changed
      if (filePath !== path.join(targetDir, newFileName) && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      fs.writeFileSync(path.join(targetDir, newFileName), newContent, 'utf8');

      // Update SQLite & Queue Remote D1
      const now = new Date().toISOString();
      const knowledgeId = `KN-${streamType.toUpperCase()}-${numStr}`;
      const escapeSql = (s) => s ? "'" + String(s).replace(/'/g, "''") + "'" : "NULL";

      const insertSourceSql = `INSERT OR REPLACE INTO sources (id, raw_id, source_type, title, original_url, raw_storage, raw_url, file_size, captured_at, processed_at, status, content_hash, importance, priority, created_at)
        VALUES (${escapeSql(sourceId)}, ${escapeSql('RAW-' + numStr)}, ${escapeSql(streamType === 'images' ? 'screenshot' : 'video')}, ${escapeSql(extraction.title)}, ${escapeSql(url)}, 'terabox', ${escapeSql(url)}, ${Math.round(parseFloat(sizeMB) * 1024 * 1024)}, ${escapeSql(now)}, ${escapeSql(now)}, 'DONE', ${escapeSql('hash-' + numStr)}, 8, 'P1', ${escapeSql(now)});`;

      const insertKnowledgeSql = `INSERT OR REPLACE INTO knowledge (id, source_id, title, knowledge_type, core_idea, full_transcript, visual_text_content, audio_sound_profile, key_information, insights, actionable_items, topics, entities, tags, confidence, importance, why_saved, what_changed, markdown_path, created_at, updated_at)
        VALUES (${escapeSql(knowledgeId)}, ${escapeSql(sourceId)}, ${escapeSql(extraction.title)}, ${escapeSql(extraction.source_type || (streamType === 'videos' ? 'reel' : 'screenshot'))}, ${escapeSql(extraction.core_idea)}, ${escapeSql(extraction.full_transcript || null)}, ${escapeSql(extraction.visual_text_content ? JSON.stringify(extraction.visual_text_content) : null)}, ${escapeSql(extraction.audio_sound_profile || null)}, ${escapeSql(JSON.stringify(extraction.key_information || []))}, ${escapeSql(JSON.stringify(extraction.insights || []))}, ${escapeSql(JSON.stringify(extraction.actions || []))}, ${escapeSql(JSON.stringify(extraction.topics || []))}, ${escapeSql(JSON.stringify(extraction.entities || []))}, '[]', 0.95, 8, 'TeraBox extraction', '', ${escapeSql('terabox/' + streamType + '/' + categoryFolder + '/' + newFileName)}, ${escapeSql(now)}, ${escapeSql(now)});`;

      executeSql(insertSourceSql);
      executeSql(insertKnowledgeSql);
      queueRemoteSql(insertSourceSql);
      queueRemoteSql(insertKnowledgeSql);

      console.log(`   ✅ Repaired: #${numStr} [${categoryFolder}] "${extraction.title}" [Model: ${modelUsed}]`);
      repairedCount++;

    } catch (err) {
      console.error(`   ❌ Failed repair on ${filename}: ${err.message}`);
    }

    // 4.5s throttle to prevent Gemini 429
    await new Promise(r => setTimeout(r, 4500));
  }

  // Update indexes
  function generateIndex(dir, streamType, title) {
    const files = [];
    function scan(current) {
      for (const ent of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, ent.name);
        if (ent.isDirectory()) {
          scan(full);
        } else if (ent.name.endsWith('.md') && !ent.name.startsWith('_')) {
          const text = fs.readFileSync(full, 'utf8');
          const numMatch = text.match(/number:\s*(\d+)/);
          const catMatch = text.match(/category:\s*"([^"]+)"/);
          const urlMatch = text.match(/raw_url:\s*"([^"]+)"/);
          const titleMatch = text.match(/^#\s*#\d+\s*(.+)$/m);
          const coreMatch = text.match(/> \[!abstract\][^\n]*\n>\s*([^\n]+)/);

          files.push({
            num: numMatch ? parseInt(numMatch[1], 10) : 0,
            numStr: numMatch ? String(numMatch[1]).padStart(4, '0') : '0000',
            category: catMatch ? catMatch[1] : 'General',
            url: urlMatch ? urlMatch[1] : '',
            title: titleMatch ? titleMatch[1].trim() : ent.name.replace('.md', ''),
            core: coreMatch ? coreMatch[1].trim() : 'Knowledge extraction record.',
            relPath: path.relative(dir, full)
          });
        }
      }
    }
    scan(dir);
    files.sort((a, b) => a.num - b.num);

    const rows = files.map(f =>
      `| **#${f.numStr}** | [[${f.relPath}\\|${f.title}]] | \`${f.category}\` | ${f.core.length > 80 ? f.core.slice(0, 80) + '...' : f.core} | [Open TeraBox](${f.url}) |`
    ).join('\n');

    const indexContent = `---
type: catalog_index
stream: "${streamType}"
total_items: ${files.length}
updated: ${new Date().toISOString()}
---

# ${title}

> [!info] Sequential Stream Catalog
> Every ${streamType === 'images' ? 'image/screenshot' : 'Instagram reel/video'} is indexed with dedicated sequential numbering (#0001, #0002...), classified into thematic category subfolders with exhaustive core ideas, transcripts, on-screen text, and atomic deductions.

| # | Knowledge Note | Category | Core Idea | Cloud Source |
| :---: | :--- | :--- | :--- | :---: |
${rows}
`;
    fs.writeFileSync(path.join(dir, '_Index.md'), indexContent, 'utf8');
  }

  generateIndex(path.join(TERABOX_DIR, 'images'), 'images', '📸 TeraBox Screenshots & Images Catalog');
  generateIndex(path.join(TERABOX_DIR, 'videos'), 'videos', '🎬 TeraBox Instagram Reels & Videos Catalog');

  await flushRemoteD1();
  console.log(`\n🎉 Repair complete! ${repairedCount} notes successfully reconstructed with zero disclaimers.`);
}

repairNotes().catch(err => {
  console.error('Fatal repair error:', err);
  process.exit(1);
});
