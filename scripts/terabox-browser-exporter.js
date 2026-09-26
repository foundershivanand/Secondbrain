/**
 * 📦 TeraBox 1-Click Browser Console Manifest Exporter
 * 
 * HOW TO USE:
 * 1. Log into your TeraBox account in Google Chrome, Brave, Edge, or Firefox:
 *    https://www.terabox.app/main or https://www.terabox.com/main
 * 2. Open Developer Tools (Press F12 or Right Click -> Inspect -> Console).
 * 3. Copy and paste this entire script into the Console and press Enter.
 * 4. It will recursively scan all your folders, find all 1000s of videos,
 *    screenshots, and PDFs, and automatically download `terabox-manifest.json`!
 * 5. You can then drop `terabox-manifest.json` into your Second Brain web app
 *    (Settings -> Import Manifest) or run:
 *    node scripts/terabox-importer.mjs terabox-manifest.json
 */

(async function exportTeraBoxManifest() {
  console.log("🚀 Starting automated TeraBox file cataloging...");
  
  const allFiles = [];
  const processedDirs = new Set();

  async function fetchDirectory(dir = "/") {
    if (processedDirs.has(dir)) return;
    processedDirs.add(dir);

    console.log(`📂 Scanning folder: ${dir}`);
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const apiUrl = `/api/list?dir=${encodeURIComponent(dir)}&order=name&desc=0&num=1000&page=${page}`;
      try {
        const res = await fetch(apiUrl);
        if (!res.ok) break;
        const data = await res.json();

        if (data.errno !== 0 || !data.list || data.list.length === 0) {
          hasMore = false;
          break;
        }

        for (const item of data.list) {
          if (item.isdir === 1) {
            await fetchDirectory(item.path);
          } else {
            const rawIdNum = Math.floor(100000 + Math.random() * 900000);
            const ext = (item.server_filename || "").split(".").pop()?.toLowerCase();
            
            // Auto-detect priority based on keyword
            let priority = "P1";
            const lower = (item.path || "").toLowerCase();
            if (lower.includes("p0") || lower.includes("urgent") || lower.includes("agent") || lower.includes("current")) {
              priority = "P0";
            } else if (lower.includes("archive") || lower.includes("backup")) {
              priority = "P3";
            }

            allFiles.push({
              raw_id: `RAW-TERABOX-${rawIdNum}`,
              filename: item.server_filename,
              name: item.server_filename,
              storage: "terabox",
              path: item.path,
              size: item.size || 0,
              priority: priority,
              fs_id: item.fs_id,
              url: window.location.origin + "/main?path=" + encodeURIComponent(item.path),
            });
          }
        }

        if (data.list.length < 1000) {
          hasMore = false;
        } else {
          page++;
        }
      } catch (err) {
        console.error(`Error reading ${dir}:`, err);
        hasMore = false;
      }
    }
  }

  await fetchDirectory("/");

  console.log(`\n🎉 Scan complete! Cataloged ${allFiles.length} files.`);
  
  if (allFiles.length === 0) {
    console.warn("⚠️ No files found or API structure differed. Ensure you are on https://www.terabox.app/main while logged in.");
    return;
  }

  // Trigger file download
  const blob = new Blob([JSON.stringify(allFiles, null, 2)], { type: "application/json" });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = `terabox-manifest-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);

  console.log(`💾 Saved to Downloads as: terabox-manifest-${new Date().toISOString().slice(0, 10)}.json`);
  console.log(`⚡ Next step: Upload this file in your Second Brain Web App (Settings -> Import Manifest) or run:`);
  console.log(`   node scripts/terabox-importer.mjs ~/Downloads/terabox-manifest-...json`);
})();
