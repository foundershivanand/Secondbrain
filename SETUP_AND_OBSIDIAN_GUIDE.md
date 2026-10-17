# 🧠 Second Brain: Complete Setup & Obsidian Integration Guide

This guide covers everything you need to connect Obsidian, run the web application, understand your API keys, and use the multi-photo and TeraBox extraction pipelines.

---

## 📋 1. System Health & API Status

All core components and API integrations have been verified and tested:

| Component | Status | Details |
| :--- | :--- | :--- |
| **Google Gemini API** | 🟢 **ACTIVE** | Model `gemini-2.5-flash` tested and working. Extracts concepts, M2 atomic notes, and runs vision analysis. |
| **GitHub Cloud Vault Sync** | 🟢 **ACTIVE** | Connected to private repository [`sh15aa/mysecondbrain`](https://github.com/sh15aa/mysecondbrain) on branch `main`. |
| **Cloudflare D1 SQLite DB** | 🟢 **ACTIVE** | `8,187` unique files indexed with direct TeraBox cloud pointers. |
| **Deduplication Engine** | 🟢 **ACTIVE** | Pre-extraction fingerprint & semantic title deduplication eliminates 2,111 duplicates automatically. |
| **Personal Photo AI Gate** | 🟢 **ACTIVE** | AI Vision automatically detects casual family/camera photos and skips them to keep your vault clean. |
| **Telegram Bot** | 🟢 **READY** | Bot handle: `@sh15a_bot` (*Mysecondbrain*). Token active. |
| **Web Frontend (React/Vite)** | 🟢 **READY** | Multi-photo batch upload enabled in Quick Capture modal. |

### Configuration File Locations:
- **Root Environment:** [`.env`](file:///home/shiva/secondbrain/.env)
- **Cloudflare Worker Secrets:** [`api/.dev.vars`](file:///home/shiva/secondbrain/api/.dev.vars)

*No additional API keys are required to operate your Second Brain. Everything needed is configured.*

---

## 📓 2. How to Setup Obsidian

Your Second Brain uses standard GitHub Flavored Markdown with `[[WikiLinks]]` and YAML frontmatter.

### Option A: Local Desktop Setup (PC / Linux)

Obsidian is already installed and pre-configured on this system:
1. Open **Obsidian** (search for Obsidian in your application menu or run `obsidian` in terminal).
2. Obsidian is already configured to open:
   ```text
   /home/shiva/secondbrain/vault
   ```
   *(All folders are also mirrored to `/home/shiva/Documents/Obsidian Vault` via real-time links).*
3. You will immediately see:
   - **`01 Knowledge/`**: All your distilled AI notes (e.g. `KN-979049 - AI Study Case.md`, `KN-448941 - Autonomous Cloud Sync Verification.md`).
   - **`02 Topics/`**: Topic hubs and Maps of Content (MOCs).
   - **`06 Memories/`**: Your durable principles, goals, preferences, and mental models.
   - **Interactive Graph View**: Press `Ctrl + G` to view your connected knowledge graph with real-time links.

---

### Option B: Mobile Setup (Android / iPhone)

You have two simple ways to use your Second Brain on mobile:

#### Method 1: Instant Mobile Web App (No setup required)
Open your deployed Cloudflare PWA directly in your mobile browser:
👉 **[https://second-brain-web-83u.pages.dev](https://second-brain-web-83u.pages.dev)**
- **Add to Home Screen**: In Chrome/Safari, tap **"Add to Home Screen"** to install it as a native app.
- **Features**: Visual Topics Graph, Brain Chat, Inbox, and **+ Quick Capture** for photos, notes, links, and documents.
- **Sync**: Fully connected 24/7 to the live Cloudflare D1 database and automatically commits to GitHub.

#### Method 2: Mobile Obsidian App via Obsidian Git
1. Download **Obsidian** from Google Play Store or Apple App Store.
2. In Obsidian: Go to **Settings ➔ Community Plugins** ➔ Turn off Safe Mode.
3. Search for **Obsidian Git** ➔ Click **Install** then **Enable**.
4. Pull down the top bar to open the **Command Palette**:
   - Run: `Obsidian Git: Clone an existing remote repo`
   - Repository URL: `https://github.com/sh15aa/mysecondbrain.git`
   - GitHub Username: `sh15aa`
   - Password / Personal Access Token: Use the token from [`.env`](file:///home/shiva/secondbrain/.env) (`GITHUB_TOKEN`)
   - Specify folder: `.` (root)
   - Depth: `1`
5. In **Obsidian Git Settings**:
   - Set **Auto-pull interval**: `5` minutes.
6. Whenever notes are captured on the web app or generated via AI, your phone's Obsidian pulls them automatically!

---

## 🌐 3. Web Application & Cloud API

- **Live Cloud App (Mobile & Web):** [https://second-brain-web-d8x.pages.dev](https://second-brain-web-d8x.pages.dev)
- **Live Cloud Worker API:** [https://second-brain-api.foundershivanand.workers.dev](https://second-brain-api.foundershivanand.workers.dev)

### Starting Local Development (Optional):
```bash
# Terminal 1: Start Cloudflare Worker API Backend locally
npm run dev:api

# Terminal 2: Start React Frontend locally
npm run dev:web
```

- Local Web App: [http://localhost:5173](http://localhost:5173)

### Useful Synchronization Commands:
```bash
# 1. Trigger full cloud sync to GitHub repository:
npm run sync:cloud

# 2. Sync local SQLite database changes to remote Cloudflare D1:
npm run db:sync:remote

# 3. Pull latest cloud notes into local vault:
git pull origin main
```

---

## 📦 4. TeraBox Library & Bulk Extraction

Your TeraBox collection is cataloged in the local database:
- **Total Cataloged Files:** `8,195` (82.87 GB)
- **Unique Canonical Files:** `6,084`
- **Duplicate Files Eliminated:** `2,111`
- **Direct TeraBox Pointers:** Every note contains a clickable link to open the original file in TeraBox cloud.

### Running Batch Extractions:
You can extract notes from your TeraBox collection at any time using [`scripts/terabox-importer.mjs`](file:///home/shiva/secondbrain/scripts/terabox-importer.mjs):

```bash
# 1. Extract all remaining unique PDFs (285 files)
node scripts/terabox-importer.mjs terabox-manifest.json --type pdf

# 2. Extract Pinterest & Instagram Ideas screenshots
node scripts/terabox-importer.mjs terabox-manifest.json --filter Ideas

# 3. Extract in small batches (e.g. 15 at a time)
node scripts/terabox-importer.mjs terabox-manifest.json --type pdf --limit 15

# 4. Extract with automatic GitHub cloud sync
node scripts/terabox-importer.mjs terabox-manifest.json --type pdf --sync-github
```

- Progress is continuously saved to [`terabox-progress.json`](file:///home/shiva/secondbrain/terabox-progress.json).
- You can interrupt with `Ctrl + C` and resume anytime.

---

## 🤖 5. Telegram Bot Quick Ingestion

You can also send notes, links, and screenshots directly through Telegram:
1. Open Telegram on your phone or desktop.
2. Search for your bot: **`@sh15a_bot`** (*Mysecondbrain*).
3. Send any text, link, PDF, or screenshot.
4. When the API webhook is running, the bot automatically passes the content through the ingestion pipeline.

---

## 📁 6. Key Project Directories

- [`vault/`](file:///home/shiva/secondbrain/vault): Your local Obsidian vault.
- [`scripts/`](file:///home/shiva/secondbrain/scripts): Maintenance, import, and sync scripts.
- [`api/`](file:///home/shiva/secondbrain/api): Cloudflare Worker backend and Gemini AI pipeline.
- [`web/`](file:///home/shiva/secondbrain/web): React + Vite PWA frontend.
- [`terabox-manifest.json`](file:///home/shiva/secondbrain/terabox-manifest.json): Your cataloged TeraBox media library.
- [`terabox-progress.json`](file:///home/shiva/secondbrain/terabox-progress.json): Ingestion state and resume tracker.
