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

If Obsidian is already installed on your PC:
1. Open **Obsidian**.
2. On the welcome screen, click **"Open folder as vault"** (or click the vault switcher icon at the bottom left).
3. Navigate to and select this exact folder:
   ```text
   /home/shiva/secondbrain/vault
   ```
4. Click **Open**.

*(If you need to install Obsidian on Linux, run: `sudo snap install obsidian --classic` or download the AppImage from [obsidian.md](https://obsidian.md)).*

#### What you will see immediately:
- **`01 Knowledge/`**: All your distilled AI notes (e.g. `KN-979049 - AI Study Case.md`, `KN-537603 - Intouch Appointment Letter.md`).
- **`02 Topics/`**: Topic hubs and Maps of Content (MOCs).
- **`06 Memories/`**: Your durable principles, goals, preferences, and mental models.
- **Interactive Graph View**: Press `Ctrl + G` to view your connected knowledge graph with real-time links between topics, entities, and sources.

---

### Option B: Mobile Setup (Android / iPhone) via GitHub Sync

Your Cloudflare Worker and Importer automatically commit all created notes to your private GitHub repository: [`sh15aa/mysecondbrain`](https://github.com/sh15aa/mysecondbrain).

To have your entire Second Brain on your phone:

1. **Install Obsidian on your phone**:
   - Download **Obsidian** from the Google Play Store or Apple App Store.
2. **Install the Git Sync Plugin**:
   - Open Obsidian on your phone ➔ Go to **Settings ➔ Community Plugins** ➔ Turn off Safe Mode.
   - Search for **Obsidian Git** (or **Remotely Save**) and click **Install** then **Enable**.
3. **Configure GitHub Sync**:
   - In the **Obsidian Git** plugin settings:
     - Set **Repository URL**: `https://github.com/sh15aa/mysecondbrain.git`
     - Enter your GitHub username: `sh15aa`
     - Paste your GitHub Personal Access Token (PAT) from your [`.env`](file:///home/shiva/secondbrain/.env) file.
     - Set **Auto-pull interval**: `5` minutes (automatically pulls new notes created by AI).
4. **Done!**
   - Whenever you capture photos or import TeraBox files on your PC or through the web app, your phone's Obsidian vault pulls the new notes automatically.

---

## 🌐 3. How to Run & Use the Web App

The Second Brain includes a full-featured web app with a visual Topics Graph, Brain Chat, Inbox, and Quick Capture.

### Starting the Application:
Run the two dev servers in separate terminal tabs:

```bash
# Terminal 1: Start Cloudflare Worker API Backend
npm run dev:api

# Terminal 2: Start React Frontend
npm run dev:web
```

- **Open on your PC:** [http://localhost:5173](http://localhost:5173)
- **Open on your Phone (Same Wi-Fi):** `http://<YOUR_PC_LOCAL_IP>:5173`
  *(Find your IP by running `hostname -I` in terminal)*.

### Adding 5–10 Photos from Your Phone via Web UI:
1. Open the Web App on your phone.
2. Tap the purple **`+ Quick Capture`** button in the top navigation.
3. Switch to the **Screenshot / Image** tab.
4. Tap the upload area: your phone gallery will open, allowing you to select **multiple photos at once**.
5. Tap **`Extract from X Photos (AI Vision)`**.
6. The AI will:
   - Analyze diagrams, text, code, or UX ideas using Gemini Vision.
   - Automatically filter out family/casual photos (marked as *Personal Photo - Skipped*).
   - Check for duplicates.
   - Write the markdown note to `vault/01 Knowledge/` and commit to GitHub.

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
