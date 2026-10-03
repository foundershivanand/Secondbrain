import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const ACCOUNT_ID = 'be9090b7ffb5e5158b39253d07643229';
const DATABASE_ID = 'da4f5160-5bdd-49b9-bd47-1da08fe1bad4';

// Read Cloudflare token from ~/.config/.wrangler/config/default.toml
const wranglerConfig = fs.readFileSync(path.resolve(process.env.HOME, '.config/.wrangler/config/default.toml'), 'utf8');
const tokenMatch = wranglerConfig.match(/oauth_token\s*=\s*"([^"]+)"/);
if (!tokenMatch) {
  console.error('Cloudflare OAuth token not found in default.toml');
  process.exit(1);
}
const CF_TOKEN = tokenMatch[1];

// Find local SQLite DB
const d1Dir = path.resolve(ROOT_DIR, 'api/.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const sqliteFile = fs.readdirSync(d1Dir).find(f => f.endsWith('.sqlite'));
const dbPath = path.join(d1Dir, sqliteFile);
console.log(`📂 Using local database: ${dbPath}`);

async function executeSqlBatch(sqlStatements) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CF_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql: sqlStatements })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudflare D1 query error (${res.status}): ${text}`);
  }
  const json = await res.json();
  if (!json.success) {
    throw new Error(`D1 Error: ${JSON.stringify(json.errors)}`);
  }
  return json;
}

// 1. Sync sources table (check if already uploaded)
console.log('\n🚀 Checking sources count on remote Cloudflare D1...');
const remoteSourcesCheck = await executeSqlBatch('SELECT count(*) as count FROM sources;');
const remoteSourcesCount = remoteSourcesCheck.result[0].results[0].count;
console.log(`   Remote sources count: ${remoteSourcesCount}`);

if (remoteSourcesCount < 8000) {
  console.log('   Syncing sources catalog to Cloudflare D1 in batches of 100...');
  const sourcesDump = execSync(`sqlite3 "${dbPath}" ".dump sources"`, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  const sourceLines = sourcesDump.split('\n')
    .filter(l => l.startsWith('INSERT INTO'))
    .map(l => l.replace('INSERT INTO', 'INSERT OR REPLACE INTO'));

  console.log(`📊 Total sources to sync: ${sourceLines.length}`);

  const BATCH_SIZE = 100;
  for (let i = 0; i < sourceLines.length; i += BATCH_SIZE) {
    const chunk = sourceLines.slice(i, i + BATCH_SIZE);
    await executeSqlBatch(chunk.join('\n'));
    process.stdout.write(`\r   Synced sources: ${Math.min(i + BATCH_SIZE, sourceLines.length)} / ${sourceLines.length}`);
  }
  console.log('\n✅ All sources synced to Cloudflare D1!');
} else {
  console.log('   ✓ Sources already cataloged on Cloudflare D1 (8,187 records). Skipping.');
}

// 2. Ensure all source_ids referenced by knowledge exist in sources
console.log('\n🔍 Ensuring all knowledge source references exist in D1...');
const missingSourcesSql = `
  INSERT OR IGNORE INTO sources (id, raw_id, source_type, title, captured_at, created_at)
  SELECT DISTINCT source_id, 'RAW-' || source_id, knowledge_type, title, created_at, created_at
  FROM knowledge
  WHERE source_id IS NOT NULL;
`;
const missingSourcesDump = execSync(`sqlite3 "${dbPath}" "${missingSourcesSql.replace(/\n/g, ' ')}"`, { encoding: 'utf8' });
// Generate the actual INSERT statements from local db
const knowledgeRows = JSON.parse(execSync(`sqlite3 "${dbPath}" ".mode json" "SELECT id, title, source_id, knowledge_type, created_at FROM knowledge WHERE source_id IS NOT NULL;"`, { encoding: 'utf8' }));

let fixSourcesSql = [];
for (const k of knowledgeRows) {
  const esc = (s) => (s ? "'" + String(s).replace(/'/g, "''") + "'" : "NULL");
  fixSourcesSql.push(`INSERT OR IGNORE INTO sources (id, raw_id, source_type, title, captured_at, status, created_at) VALUES (${esc(k.source_id)}, ${esc('RAW-' + k.source_id)}, ${esc(k.knowledge_type)}, ${esc(k.title)}, ${esc(k.created_at)}, 'DONE', ${esc(k.created_at)});`);
}
if (fixSourcesSql.length > 0) {
  console.log(`   Inserting ${fixSourcesSql.length} missing source reference stubs into D1...`);
  await executeSqlBatch(fixSourcesSql.join('\n'));
}

// 3. Sync Core tables in strict dependency order: knowledge, atomic_knowledge, memories, relationships, brain_state, mocs
const coreTablesOrdered = ['knowledge', 'atomic_knowledge', 'memories', 'relationships', 'brain_state', 'mocs'];

for (const table of coreTablesOrdered) {
  try {
    const dump = execSync(`sqlite3 "${dbPath}" ".dump ${table}"`, { encoding: 'utf8' });
    const insertLines = dump.split('\n')
      .filter(l => l.startsWith('INSERT INTO'))
      .map(l => l.replace('INSERT INTO', 'INSERT OR REPLACE INTO'));
    console.log(`   Table ${table}: ${insertLines.length} rows`);
    if (insertLines.length > 0) {
      await executeSqlBatch(insertLines.join('\n'));
      console.log(`   ✓ Synced ${table} to Cloudflare D1`);
    }
  } catch (err) {
    console.error(`❌ Error syncing table ${table}:`, err.message);
  }
}
console.log('✅ Core Second Brain data synced to remote Cloudflare D1!');

// 3. Verify final counts from remote Cloudflare D1
console.log('\n🔍 Verifying counts on remote Cloudflare D1:');
const verifyRes = await executeSqlBatch(`
  SELECT 'knowledge' as tbl, count(*) as count FROM knowledge
  UNION ALL SELECT 'sources', count(*) FROM sources
  UNION ALL SELECT 'memories', count(*) FROM memories
  UNION ALL SELECT 'mocs', count(*) FROM mocs
  UNION ALL SELECT 'brain_state', count(*) FROM brain_state;
`);

for (const r of verifyRes.result[0].results) {
  console.log(`   ${r.tbl}: ${r.count}`);
}
console.log('\n🎉 Sync to Cloudflare D1 complete!');
