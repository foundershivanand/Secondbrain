import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VAULT_DIR = path.resolve(__dirname, '../vault');

const envPath = path.resolve(__dirname, '../.env');
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

const DEFAULT_API = process.env.API_BASE_URL || 'https://second-brain-api.fitt.workers.dev';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'secondbrain_dev_secret';

async function syncVault(apiBaseUrl = DEFAULT_API) {
  console.log(`📡 Fetching Obsidian vault notes from ${apiBaseUrl}...`);
  try {
    const res = await fetch(`${apiBaseUrl}/api/export/vault`, {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch vault: ${res.statusText}`);
    }
    const data = await res.json();
    console.log(`📦 Found ${data.totalNotes || 0} notes in Second Brain.`);

    for (const file of data.files || []) {
      const fullPath = path.join(VAULT_DIR, file.path);
      const folder = path.dirname(fullPath);
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
      }
      fs.writeFileSync(fullPath, file.content, 'utf8');
      console.log(`  ✓ Synced: ${file.path}`);
    }

    console.log('✅ Obsidian Vault sync complete!');
  } catch (err) {
    console.error('❌ Vault sync error:', err.message);
    console.log('Ensure your Cloudflare Worker is running on port 8787.');
  }
}

syncVault(process.argv[2]);
