#!/usr/bin/env node

/**
 * YouTube Sync CLI Helper
 * Triggers YouTube Liked Videos & Playlist ingestion into Second Brain Obsidian Vault
 *
 * Usage:
 *   node scripts/sync-youtube.mjs
 *   node scripts/sync-youtube.mjs --playlist PLxxx --limit 10
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = (match[2] || '').trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value;
    }
  }
}

const API_BASE = process.env.API_BASE_URL || 'https://second-brain-api.fitt.workers.dev';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'secondbrain_dev_secret';

const args = process.argv.slice(2);
let playlistId = null;
let limit = 10;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--playlist' && args[i + 1]) {
    playlistId = args[i + 1];
    i++;
  } else if (args[i] === '--limit' && args[i + 1]) {
    limit = parseInt(args[i + 1], 10);
    i++;
  }
}

async function main() {
  console.log('🎬 Second Brain - YouTube Liked & Playlist Syncer');
  console.log(`Connecting to: ${API_BASE}`);

  // 1. Fetch current status
  try {
    const statusRes = await fetch(`${API_BASE}/api/youtube/status`, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    });
    if (statusRes.ok) {
      const status = await statusRes.json();
      console.log('\n📊 YouTube Sync Status:');
      console.log(`  - Connected: ${status.connected ? '✅ Yes' : '❌ No'}`);
      console.log(`  - Mode: ${status.mode}`);
      console.log(`  - OAuth Configured: ${status.oauthConfigured ? 'Yes' : 'No'}`);
      console.log(`  - Refresh Token Available: ${status.hasRefreshToken ? 'Yes' : 'No'}`);
      console.log(`  - Playlist ID: ${status.playlistId || 'None'}`);
      console.log(`  - Total YouTube Sources in Brain: ${status.totalSyncedCount}`);
      if (status.lastSync) {
        console.log(`  - Last Sync: ${status.lastSync.lastSyncAt} (Ingested: ${status.lastSync.newIngested}, Skipped: ${status.lastSync.skippedCount})`);
      }
    }
  } catch (err) {
    console.warn('Could not query status:', err.message);
  }

  // 2. Trigger Sync
  console.log(`\n🚀 Triggering YouTube sync (limit: ${limit}${playlistId ? `, playlist: ${playlistId}` : ''})...`);
  try {
    const syncRes = await fetch(`${API_BASE}/api/youtube/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify({
        limit,
        playlist_id: playlistId,
      }),
    });

    const data = await syncRes.json();
    if (!syncRes.ok) {
      console.error(`\n❌ Sync Failed (${syncRes.status}):`, data.error || data.message);
      process.exit(1);
    }

    console.log(`\n✅ ${data.message}`);
    console.log(`  Mode: ${data.mode}`);
    console.log(`  Total Found: ${data.totalFound}`);
    console.log(`  New Notes Added: ${data.newIngested}`);
    console.log(`  Skipped (Already Indexed): ${data.skippedCount}`);

    if (data.syncedNotes && data.syncedNotes.length > 0) {
      console.log('\n📝 Newly Created Knowledge Notes:');
      for (const note of data.syncedNotes) {
        console.log(`  ✨ [${note.id}] ${note.title}`);
        if (note.core_idea) console.log(`     Core Idea: ${note.core_idea.slice(0, 80)}...`);
      }
    }
  } catch (err) {
    console.error('Network error during sync:', err.message);
    process.exit(1);
  }
}

main();
