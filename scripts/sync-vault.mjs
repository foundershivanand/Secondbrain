import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VAULT_DIR = path.resolve(__dirname, '../vault');

async function syncVault(apiBaseUrl = 'http://127.0.0.1:8787') {
  console.log(`📡 Fetching Obsidian vault notes from ${apiBaseUrl}...`);
  try {
    const res = await fetch(`${apiBaseUrl}/api/export/vault`);
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
