import fs from 'fs';

const manifest = JSON.parse(fs.readFileSync('terabox-manifest.json', 'utf8'));
const now = new Date().toISOString();
const sqlLines = [];

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

for (const item of manifest) {
  const ext = (item.filename || '').split('.').pop().toLowerCase();
  let sourceType = 'raw_pointer';
  if (['mp4', 'mov', 'mkv', 'webm', 'avi'].includes(ext)) sourceType = 'video';
  else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) sourceType = 'screenshot';
  else if (['pdf'].includes(ext)) sourceType = 'pdf';
  else if (['mp3', 'm4a', 'wav', 'ogg'].includes(ext)) sourceType = 'voice';

  const rawId = item.fs_id ? `RAW-TERABOX-${item.fs_id}` : (item.raw_id || ('RAW-TERABOX-' + Math.floor(100000 + Math.random() * 900000)));
  const sourceId = item.fs_id ? `SRC-${item.fs_id}` : ('SRC-' + rawId.replace('RAW-TERABOX-', ''));
  const title = (item.filename || 'Untitled').replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim();
  const priority = item.priority || 'P1';
  const importance = priority === 'P0' ? 9 : (priority === 'P1' ? 7 : 5);

  sqlLines.push(
    `INSERT OR IGNORE INTO sources (id, raw_id, source_type, title, original_url, raw_storage, raw_url, file_size, captured_at, status, importance, priority, created_at) VALUES (${escapeSql(sourceId)}, ${escapeSql(rawId)}, ${escapeSql(sourceType)}, ${escapeSql(title)}, ${escapeSql(item.url)}, 'terabox', ${escapeSql(item.url)}, ${item.size || 0}, ${escapeSql(now)}, 'RECEIVED', ${importance}, ${escapeSql(priority)}, ${escapeSql(now)});`
  );
}

fs.writeFileSync('scripts/terabox-sources.sql', sqlLines.join('\n'), 'utf8');
console.log(`✅ Successfully generated ${sqlLines.length} SQL insert statements in scripts/terabox-sources.sql`);
