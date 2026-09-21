# 🧠 Second Brain Knowledge Engine

> **The Core Architectural Decision:**
> Your Second Brain does **NOT** store 100 GB+ of raw media inside Obsidian or Cloudflare D1.
> Raw files stay wherever they already live (TeraBox, Telegram, Google Drive, YouTube, Discord, Local disk).
> Your system stores the **compressed knowledge, metadata, atomic concepts, relationships, provenance, and a pointer back to the original**.

This architecture keeps your database fast, scalable, and completely free within Cloudflare D1's 500 MB free tier, while giving you the practical experience of infinite memory.

---

## 🏗 System Architecture

```text
                         ┌──────────────────────┐
                         │     YOU / MOBILE     │
                         │ Android / Web / PC   │
                         └──────────┬───────────┘
                                    │
                    ┌───────────────┼────────────────┐
                    │               │                │
                    ▼               ▼                ▼
               Telegram          Web App          Obsidian
               Capture           PWA              Vault
                    │               │                │
                    └───────────────┼────────────────┘
                                    ▼
                         ┌─────────────────────┐
                         │   CLOUD API         │
                         │ Cloudflare Worker   │
                         └──────────┬──────────┘
                                    │
                     ┌──────────────┼──────────────┐
                     ▼              ▼              ▼
                  D1 DB          Gemini        Job Queue
               metadata/RAG       AI             / Cron
                     │              │
                     │              ▼
                     │       ┌──────────────┐
                     │       │ AI PROCESSOR │
                     │       └──────┬───────┘
                     │              │
                     ▼              ▼
              ┌─────────────┐  ┌──────────────┐
              │ Knowledge   │  │ Memory       │
              │ Graph       │  │ Consolidator │
              └──────┬──────┘  └──────┬───────┘
                     │                │
                     └────────┬───────┘
                              ▼
                     ┌─────────────────┐
                     │ Obsidian .md    │
                     │ Knowledge Vault │
                     └─────────────────┘

RAW FILES
────────────────────────────────────────────────────
Telegram / Google Drive / TeraBox / Discord / YouTube
                         │
                         │ pointer only
                         ▼
              Second Brain Knowledge
```

---

## ⚡ Tech Stack

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Mobile Capture** | Telegram Bot (`@BotFather`) | Instant capture of text, screenshots, voice notes, links |
| **Web App** | React + Vite + Tailwind PWA | Primary workspace & mobile-installable interface |
| **Cloud Backend** | Cloudflare Workers | Edge API, webhook verification, CORS, Cron router |
| **Database** | Cloudflare D1 (SQLite) | Compressed knowledge, atomic items, memories, pointers |
| **AI Extraction & Chat** | Google Gemini API (Structured JSON) | Multimodal extraction, reasoning lineage, memory evaluation |
| **Knowledge Notes** | Obsidian Markdown (`.md`) | Local-first, portable file vault with `[[WikiLinks]]` |
| **Scheduled Agent** | Cloudflare Cron (`0 2 * * *`) | Nightly memory deduplication, conflict checking & consolidation |
| **Raw Storage** | TeraBox / Drive / Telegram / S3 | Unmodified 100 GB+ media storage (external pointers) |

---

## 📁 Repository Structure

```text
secondbrain/
├── api/                          # Cloudflare Worker Backend
│   ├── wrangler.toml             # Worker config, D1 bindings, Cron triggers
│   ├── schema.sql                # Cloudflare D1 SQL schema (sources, knowledge, etc.)
│   └── src/
│       ├── index.ts              # HTTP router & scheduled cron handler
│       ├── ai/                   # Gemini API client, prompts, Memory Consolidation Agent
│       ├── db/                   # Typed D1 queries and data access layer
│       ├── pipeline/             # Ingestion pipeline, Obsidian markdown generator, retrieval
│       ├── routes/               # capture, telegram, chat, search, memories, export, importers
│       └── utils/                # Security sanitization, SHA-256 deduplication, CORS
│
├── web/                          # React + Vite PWA
│   ├── src/
│   │   ├── components/           # Navbar, CaptureModal, KnowledgeCard, CitationCard
│   │   ├── pages/                # BrainChat, Inbox, Knowledge, TopicsGraph, IdeasFactory, Memories, Sources, Settings
│   │   └── services/api.ts       # Typed API client
│   └── public/manifest.webmanifest
│
├── vault/                        # Obsidian Vault Structure
│   ├── 00 Inbox/
│   ├── 01 Knowledge/
│   ├── 02 Topics/
│   ├── 03 Projects/
│   ├── 04 People/
│   ├── 05 Resources/
│   ├── 06 Memories/
│   ├── 07 Ideas/
│   ├── 08 Decisions/
│   ├── 09 Sources/
│   └── 99 System/
│
└── scripts/                      # Setup scripts, D1 seed data, and vault sync utility
```

---

## 🚀 Quickstart (Local Development)

### 1. Initialize Local Database
```bash
npm run db:init:local
npm run seed
```

### 2. Start Cloudflare Worker Backend
In one terminal:
```bash
npm run dev:api
```
The backend starts at `http://127.0.0.1:8787`.

### 3. Start Web App Frontend
In a second terminal:
```bash
npm run dev:web
```
Open `http://localhost:5173` in your browser. The frontend will proxy `/api` calls directly to your Worker.

---

## ☁️ Production Cloudflare Deployment

### 1. Create Cloudflare D1 Database
Log into Cloudflare:
```bash
cd api
npx wrangler login
npx wrangler d1 create second_brain
```
Wrangler will output your `database_id`. Paste it into `api/wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "second_brain"
database_id = "YOUR_ACTUAL_D1_DATABASE_ID"
```

### 2. Run Database Schema on Remote D1
```bash
npx wrangler d1 execute second_brain --remote --file=./schema.sql
```

### 3. Set Cloudflare Secrets
Store your private keys securely on Cloudflare:
```bash
# 1. Gemini API Key (from Google AI Studio)
npx wrangler secret put GEMINI_API_KEY

# 2. Telegram Bot Token (from @BotFather)
npx wrangler secret put TELEGRAM_BOT_TOKEN

# 3. Telegram Webhook Secret Token (choose a strong random secret)
npx wrangler secret put TELEGRAM_SECRET_TOKEN

# 4. Optional API Auth Token (to protect your web API routes)
npx wrangler secret put AUTH_TOKEN
```

### 4. Deploy Worker Backend
```bash
npx wrangler deploy
```
Your backend will be live at `https://second-brain-api.<your-subdomain>.workers.dev`.

### 5. Register Telegram Webhook
Run this command to bind your Telegram bot to your Cloudflare Worker:
```bash
curl -F "url=https://YOUR_WORKER_URL/api/telegram/webhook" \
     -F "secret_token=YOUR_SECRET_TOKEN" \
     https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook
```
Now send any message, screenshot, YouTube link, or voice note to your Telegram bot!

### 6. Deploy Web App to Cloudflare Pages
```bash
cd web
npm run build
npx wrangler pages deploy dist --project-name=second-brain-web
```

---

## 🧠 The Brain's Memory Hierarchy

```text
M0 — RAW
     screenshots / videos / PDFs / Telegram chats (External storage)
     │
     ▼
M1 — SOURCE SUMMARY
     what this source contains & why you saved it
     │
     ▼
M2 — ATOMIC KNOWLEDGE
     individual modular ideas & claims with confidence scores
     │
     ▼
M3 — TOPIC KNOWLEDGE
     conceptual clusters ([[AI Agents]], [[SaaS]], [[Memory Systems]])
     │
     ▼
M4 — PERSONAL MEMORY
     durable facts, life decisions, architectural principles (Nightly Consolidation)
     │
     ▼
M5 — CURRENT CONTEXT
     dynamically retrieved knowledge synthesized with source provenance
```

---

## 🔍 Provenance & Reasoning Lineage

Every answer in the **Brain Chat** interface includes:
1. **Source Citations:** Exact reference to the source note and raw file pointer.
2. **Timestamps:** Video and audio timestamps (e.g. `00:12:42 — Agent Memory Architecture`).
3. **"Why did I save this?":** Preserves your original intent and context.
4. **"What changed?":** Tracks how your beliefs and architectural decisions evolve over time.

---

## 🔄 Nightly Memory Consolidation Agent

The Worker includes a Cloudflare Cron Trigger (`crons = ["0 2 * * *"]`).
Every night at 2:00 AM UTC, the consolidation agent:
1. Evaluates candidate memories queued throughout the day.
2. Tests against transient noise vs durable mental models.
3. Detects duplicates, contradictions, and superseded beliefs.
4. Promotes durable facts to permanent memory (`status = 'DURABLE'`).
5. You can also run it on-demand anytime from the **Memories** screen!

---

## 📥 Historical Importers

In the **Settings** screen:
- **AI Chat Exports:** Import `conversations.json` from ChatGPT, Claude, or Gemini. Extracts only durable decisions and reusable concepts without flooding your vault with debugging chatter.
- **YouTube History:** Upload `watch-history.json` from Google Takeout. Automatically filters learning and technical videos and ingests them with priority.

---

## 📝 Syncing to Obsidian

Open Obsidian and select the `vault/` folder as your vault location.
To sync fresh notes generated by the Cloudflare Worker directly to your disk:
```bash
npm run sync:vault
```
All notes include YAML frontmatter, atomic knowledge blocks, and `[[WikiLinks]]` for graph visualization.
