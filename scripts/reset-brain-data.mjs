import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const VAULT_DIR = path.resolve(ROOT_DIR, 'vault');

console.log('🧹 ============================================================');
console.log('🧹 Second Brain Reset: Clearing Data, Notes & Memory');
console.log('🧹 ============================================================');

// 1. Remove all old notes in vault/01 Knowledge
const knowledgeDir = path.join(VAULT_DIR, '01 Knowledge');
if (fs.existsSync(knowledgeDir)) {
  const entries = fs.readdirSync(knowledgeDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(knowledgeDir, entry.name);
    if (entry.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else if (entry.name.endsWith('.md')) {
      fs.unlinkSync(fullPath);
    }
  }
}

// Recreate clean structured category directories in 01 Knowledge matching canonical taxonomy
const CATEGORIES = [
  'YouTube',
  'Content, Reels & Creative Media',
  'Artificial Intelligence & LLMs',
  'AI Agents & Autonomous Systems',
  'Digital Wellness & Screen Time',
  'Hardware & Embedded IoT',
  'Mobile Apps & UI Design',
  'Academics & Education',
  'History, Governance & Politics',
  'Business, Startups & SaaS',
  'Software Architecture & Backend',
  'Cinema, Storytelling & Film',
  'Psychology & Mental Models',
  'Health, Fitness & Physiology',
  'Finance, Wealth & Crypto',
  'Productivity & Personal Systems',
  'General Knowledge & Reference'
];

for (const cat of CATEGORIES) {
  const catPath = path.join(knowledgeDir, cat);
  fs.mkdirSync(catPath, { recursive: true });
  const indexContent = `# ${cat}\n\n*Curated collection of knowledge notes from user captures and YouTube sync.*\n\n| # | Note Title | Type | Core Concept | Source Link |\n|---|---|---|---|---|\n`;
  fs.writeFileSync(path.join(catPath, '_Index.md'), indexContent, 'utf8');
}
console.log(`✅ Cleared and initialized 12 categorized knowledge folders in vault/01 Knowledge.`);

// 2. Clear Topics / MOCs
const topicsDir = path.join(VAULT_DIR, '02 Topics');
if (fs.existsSync(topicsDir)) {
  for (const file of fs.readdirSync(topicsDir)) {
    if (file.endsWith('.md')) {
      fs.unlinkSync(path.join(topicsDir, file));
    }
  }
  fs.writeFileSync(path.join(topicsDir, '.gitkeep'), '', 'utf8');
}
console.log(`✅ Cleared old MOC notes in vault/02 Topics.`);

// 3. Reset Memories
const memoriesDir = path.join(VAULT_DIR, '06 Memories');
if (fs.existsSync(memoriesDir)) {
  for (const file of fs.readdirSync(memoriesDir)) {
    if (file.startsWith('Daily Brief')) {
      fs.unlinkSync(path.join(memoriesDir, file));
    }
  }
}

const sharedMemoryContent = `# Shared Multi-AI Brain Memory (Gemini • Grok • Claude • Copilot)

This blackboard memory context is shared dynamically across all AI models to enable collaborative cross-note synthesis, shared topic taxonomy, and joint reasoning.

## Active Discovered Topics
- [[Artificial Intelligence]]
- [[System Architecture]]

## Collaborative Insights
- User uploads and YouTube liked videos form the continuous stream of inputs.
- Notes are structured with YAML frontmatter, atomic ideas, insights, and actionable items.

## Provider Sync Status
- **Gemini Flash:** Online (Primary Knowledge Extractor)
- **Grok (xAI):** Standby / Quota Failover
- **Claude:** Standby / Deep Reasoning Synthesizer
- **Copilot / Free Providers:** Standby / Quota-Proof Fallback
`;
fs.writeFileSync(path.join(memoriesDir, 'Shared Memory.md'), sharedMemoryContent, 'utf8');
console.log(`✅ Reset vault/06 Memories and created Shared Memory context.`);

// 4. Reset Ideas & Sources
const ideasDir = path.join(VAULT_DIR, '07 Ideas');
if (fs.existsSync(ideasDir)) {
  fs.writeFileSync(path.join(ideasDir, 'Content & Publishing Ideas.md'), '# Content & Publishing Ideas\n\n*Fresh ideas generated from extracted knowledge.*\n', 'utf8');
  fs.writeFileSync(path.join(ideasDir, 'Product & SaaS Opportunities.md'), '# Product & SaaS Opportunities\n\n*SaaS opportunities identified across captures.*\n', 'utf8');
}

const sourcesDir = path.join(VAULT_DIR, '09 Sources');
if (fs.existsSync(sourcesDir)) {
  fs.writeFileSync(path.join(sourcesDir, 'Sources Catalog.md'), '# Sources Catalog\n\n*Master inventory of external raw inputs and pointers.*\n', 'utf8');
}

// 5. Reset Dashboard
const dashboardContent = `# 🧠 Second Brain Master Dashboard

Welcome to your unified Second Brain knowledge repository.

## 📊 Knowledge Collections
- [[01 - AI & Autonomous Systems/_Index|01 • AI & Autonomous Systems]]
- [[02 - Business, Startups & SaaS/_Index|02 • Business, Startups & SaaS]]
- [[03 - Mobile Apps & UI-UX Design/_Index|03 • Mobile Apps & UI-UX Design]]
- [[04 - Tech, Engineering & DevOps/_Index|04 • Tech, Engineering & DevOps]]
- [[05 - Digital Wellness & Habit Systems/_Index|05 • Digital Wellness & Habit Systems]]
- [[06 - Content, Reels & Creative Media/_Index|06 • Content, Reels & Creative Media]]
- [[07 - Cinema, Storytelling & Arts/_Index|07 • Cinema, Storytelling & Arts]]
- [[08 - Psychology, Mindset & Philosophy/_Index|08 • Psychology, Mindset & Philosophy]]
- [[09 - Academics, Education & Research/_Index|09 • Academics, Education & Research]]
- [[10 - Governance, History & Legal/_Index|10 • Governance, History & Legal]]
- [[11 - Finance, Wealth & Operations/_Index|11 • Finance, Wealth & Operations]]
- [[12 - General Knowledge & Reference/_Index|12 • General Knowledge & Reference]]

## 🤖 Multi-AI Memory Architecture
- [[Shared Memory|Multi-AI Shared Working Memory]]
- [[Principles|Guiding Principles]]
`;
fs.writeFileSync(path.join(VAULT_DIR, 'Dashboard.md'), dashboardContent, 'utf8');

// 6. Reset SQLite DB
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
if (sqliteDbPath) {
  try {
    const cleanSql = `
      BEGIN TRANSACTION;
      DELETE FROM knowledge;
      DELETE FROM atomic_knowledge;
      DELETE FROM relationships;
      DELETE FROM memories;
      DELETE FROM processing_jobs;
      DELETE FROM brain_state;
      DELETE FROM mocs;
      DELETE FROM sources WHERE raw_storage = 'terabox';
      COMMIT;
    `;
    execSync(`sqlite3 "${sqliteDbPath}" "${cleanSql.replace(/"/g, '\\"')}"`, { stdio: 'pipe' });
    console.log(`✅ SQLite D1 database cleaned.`);
  } catch (err) {
    console.error('⚠️ Error cleaning SQLite database:', err.message);
  }
}

console.log('🎉 Reset complete! User uploads and YouTube sync architecture active.');
