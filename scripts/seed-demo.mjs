import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const API_DIR = path.resolve(ROOT_DIR, 'api');
const VAULT_DIR = path.resolve(ROOT_DIR, 'vault');
const SEED_SQL_PATH = path.resolve(__dirname, 'seed.sql');

const isRemote = process.argv.includes('--remote');
const targetEnv = isRemote ? '--remote' : '--local';

console.log(`\n🧠 Second Brain - Demo Seeder`);
console.log(`─────────────────────────────────────────────`);
console.log(`🎯 Target environment: ${isRemote ? 'Cloudflare Remote D1' : 'Local D1 SQLite'}`);

// 1. Seed D1 SQLite database
if (!fs.existsSync(SEED_SQL_PATH)) {
  console.error(`❌ seed.sql not found at: ${SEED_SQL_PATH}`);
  process.exit(1);
}

console.log(`📦 Seeding D1 database from scripts/seed.sql...`);
try {
  execSync(
    `npx wrangler d1 execute second_brain ${targetEnv} --file=../scripts/seed.sql`,
    {
      cwd: API_DIR,
      stdio: 'inherit',
      encoding: 'utf8',
    }
  );
  console.log(`✅ Successfully executed seed.sql on D1 (${targetEnv})`);
} catch (err) {
  console.error(`❌ Failed to execute seed SQL:`, err.message);
  process.exit(1);
}

// 2. Ensure Demo Markdown Notes exist in Obsidian Vault
console.log(`\n📓 Ensuring starter notes exist in Obsidian vault...`);

const demoNotes = [
  {
    path: '01 Knowledge/KN-00182 - AI Agent Memory Architecture.md',
    content: `---
id: KN-00182
type: knowledge
source_type: video
importance: 9
confidence: 0.94
topics:
  - AI
  - Agents
  - Memory
  - RAG
source_id: SRC-00182
created_at: 2026-09-21T12:00:00.000Z
---

# AI Agent Memory Architecture

## Core Idea

AI agents should retrieve relevant memory rather than loading
all historical context into every prompt.

## Key Information

- Memory can be represented as structured knowledge.
- Retrieval provides relevant context.
- Long-term memory should be selectively consolidated.

## Atomic Knowledge

### Retrieval reduces context requirements

Retrieval allows an AI system to select relevant historical
information instead of inserting the entire knowledge base
into every prompt.

**Type:** \`CONCEPT\` | **Confidence:** 94%

### Storage and reasoning separation

Decoupling storage from reasoning enables massive scaling without
hitting LLM context limits or driving up inference costs.

**Type:** \`FACT\` | **Confidence:** 92%

## Insights

- A second brain can separate storage from reasoning.
- Digital hoarding is solved by atomic compression and provenance pointers.

## Actions

- [ ] Implement retrieval before generating AI responses.
- [ ] Schedule nightly memory consolidation agent.

## Important Timestamps

- \`00:03:12\` — Explanation of RAG
- \`00:11:48\` — Agent memory architecture
- \`00:24:16\` — Product implementation example
- \`00:37:42\` — Common failure modes

## Product & SaaS Opportunities

- 💡 Autonomous Second Brain capture bot for Telegram
- 💡 Hierarchical memory retrieval service for autonomous agents

## Related Topics

- [[AI]]
- [[AI Agents]]
- [[Memory]]
- [[RAG]]

## Why I Saved This

Relevant to the Second Brain and AI Agent architecture.

## What Changed

Strengthens the decision to use hierarchical retrieval instead of full-context stuffing.

## Original Source

[Open original video](https://youtube.com/watch?v=sample-agent-architecture)
`
  },
  {
    path: '01 Knowledge/KN-00183 - Frictionless SaaS Onboarding UX Pattern.md',
    content: `---
id: KN-00183
type: knowledge
source_type: screenshot
importance: 8
confidence: 0.92
topics:
  - SaaS
  - UX
  - Product
  - Conversion
source_id: SRC-00183
created_at: 2026-09-21T09:16:00.000Z
---

# Frictionless SaaS Onboarding UX Pattern

## Core Idea

Instant time-to-value with deferred authentication yields significantly higher activation rates.

## Key Information

- Allow users to immediately test the core feature before signing up.
- Save state in localStorage until action requires persistence.

## Atomic Knowledge

### Immediate interaction before signup

Immediate interaction before signup dramatically increases user retention.

**Type:** \`INSIGHT\` | **Confidence:** 92%

## Insights

- Users abandon apps when hit with a login wall before seeing value.

## Actions

- [ ] Implement immediate quick capture on Second Brain without blocking for credentials.

## Related Topics

- [[SaaS]]
- [[UX]]
- [[Product]]
- [[Conversion]]

## My Thoughts

Our mobile capture PWA should allow immediate capturing without forcing credentials upfront.

## Why I Saved This

Valuable pattern for the Product Factory and mobile capture PWA.

## What Changed

Shifted registration to post-capture confirmation rather than pre-entry.

## Original Source

telegram://file/tg-file-98214
`
  },
  {
    path: '01 Knowledge/KN-00184 - Decoupled Storage & Reasoning Architecture.md',
    content: `---
id: KN-00184
type: knowledge
source_type: raw_pointer
importance: 9
confidence: 0.96
topics:
  - Architecture
  - Cloudflare D1
  - Cost Optimization
  - Knowledge Management
source_id: SRC-00184
created_at: 2026-09-21T11:05:00.000Z
---

# Decoupled Storage & Reasoning Architecture

## Core Idea

Separating the 100 GB+ media layer from the knowledge index allows massive scalability on zero-cost tiers.

## Key Information

- Raw files stay in TeraBox, Telegram, Drive, or YouTube.
- D1 stores structured knowledge, atomic ideas, and relationships.
- Pointers link knowledge back to the original source.

## Atomic Knowledge

### Free tier scalability

Cloudflare D1 free limits of 500 MB are more than sufficient for thousands of compressed atomic notes.

**Type:** \`FACT\` | **Confidence:** 98%

## Insights

- Digital hoarding is solved by atomic compression and provenance pointers.

## Actions

- [ ] Never upload raw 10 GB videos to Cloudflare Workers or D1.
- [ ] Always maintain raw_storage and raw_url pointers in sources table.

## Related Topics

- [[Architecture]]
- [[Cloudflare D1]]
- [[Cost Optimization]]
- [[Knowledge Management]]

## My Thoughts

Never migrate 100 GB into Obsidian or D1. Keep raw pointers intact and store only 2-10 KB knowledge notes.

## Why I Saved This

Foundational principle for keeping the personal Second Brain free, fast, and durable.

## What Changed

Confirmed that raw media stays external while compressed notes live in D1 and Obsidian.

## Original Source

[Open original source](https://terabox.com/s/sample-paper)
`
  }
];

for (const note of demoNotes) {
  const noteFullPath = path.join(VAULT_DIR, note.path);
  const noteDir = path.dirname(noteFullPath);
  if (!fs.existsSync(noteDir)) {
    fs.mkdirSync(noteDir, { recursive: true });
  }
  if (!fs.existsSync(noteFullPath)) {
    fs.writeFileSync(noteFullPath, note.content, 'utf8');
    console.log(`  ✓ Created note: ${note.path}`);
  } else {
    console.log(`  ✓ Note already exists: ${note.path}`);
  }
}

console.log(`\n🎉 Seed completed successfully!`);
console.log(`  • D1 Database populated with starter knowledge, sources, memories, and brain state.`);
console.log(`  • Obsidian Vault populated in ./vault.`);
console.log(`\nNext steps:`);
console.log(`  1. npm run dev:api    (Start Cloudflare Worker API on port 8787)`);
console.log(`  2. npm run dev:web    (Start React PWA frontend on port 5173)\n`);
