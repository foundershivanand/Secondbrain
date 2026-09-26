/**
 * 📦 TeraBox 1-Click Browser Console Manifest Exporter (Enhanced with Bypass)
 * 
 * HOW TO USE:
 * 1. Log into your TeraBox account in Google Chrome, Brave, Edge, or Firefox:
 *    https://www.terabox.app/main or https://www.terabox.com/main
 * 2. Open Developer Tools (Press F12 or Right Click -> Inspect -> Console).
 * 3. Copy and paste this entire script into the Console and press Enter.
 * 4. It will:
 *    - Create a big purple "📥 Click to Download" button on the screen (bypasses browser download blockers).
 *    - Automatically copy the entire JSON to your clipboard (you can just Ctrl+V into a file).
 *    - Save it to `window.teraboxManifest` so you never lose the scan.
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

  // 1. Save to global window so it is never lost in memory
  window.teraboxManifest = allFiles;

  // 2. Try copying straight to OS clipboard
  try {
    copy(JSON.stringify(allFiles, null, 2));
    console.log("📋 SUCCESS: Entire JSON has also been copied to your clipboard!");
  } catch (e) {
    // ignore clipboard permission error if copy() is restricted
  }

  // 3. Create a prominent on-screen button (bypasses browser popup/download blockers)
  const existingBtn = document.getElementById("terabox-download-btn");
  if (existingBtn) existingBtn.remove();

  const btn = document.createElement("button");
  btn.id = "terabox-download-btn";
  btn.innerHTML = `📥 Click to Download <b>${allFiles.length} files</b> (terabox-manifest.json)`;
  btn.style.cssText = "position:fixed;top:25px;right:25px;z-index:9999999;padding:16px 26px;background:#7c3aed;color:#ffffff;font-size:16px;font-family:sans-serif;font-weight:bold;border-radius:12px;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,0.7);border:2px solid #ffffff;animation:pulse 2s infinite;";
  
  btn.onclick = () => {
    const blob = new Blob([JSON.stringify(allFiles, null, 2)], { type: "application/json" });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `terabox-manifest-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  };

  document.body.appendChild(btn);

  // 4. Also attempt automatic trigger
  btn.click();

  console.log("👉 If your browser blocked the automatic download, click the purple button in the top-right corner of your screen!");
})();
