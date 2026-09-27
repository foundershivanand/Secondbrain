(async function() {
  console.log("Scanning TeraBox library...");
  var allFiles = [];
  var processedDirs = {};

  async function fetchDirectory(dir) {
    if (processedDirs[dir]) return;
    processedDirs[dir] = true;
    console.log("Scanning folder: " + dir);
    var page = 1;
    var hasMore = true;

    while (hasMore) {
      var url = "/api/list?dir=" + encodeURIComponent(dir) + "&order=name&desc=0&num=1000&page=" + page;
      var res = await fetch(url);
      var data = await res.json();
      if (data.errno !== 0 || !data.list || data.list.length === 0) {
        break;
      }

      for (var i = 0; i < data.list.length; i++) {
        var item = data.list[i];
        if (item.isdir === 1) {
          await fetchDirectory(item.path);
        } else {
          var rawId = "RAW-TERABOX-" + Math.floor(100000 + Math.random() * 900000);
          var pathLower = (item.path || "").toLowerCase();
          var priority = "P1";
          if (pathLower.indexOf("p0") !== -1 || pathLower.indexOf("urgent") !== -1 || pathLower.indexOf("agent") !== -1) {
            priority = "P0";
          } else if (pathLower.indexOf("archive") !== -1 || pathLower.indexOf("backup") !== -1) {
            priority = "P3";
          }

          allFiles.push({
            raw_id: rawId,
            filename: item.server_filename,
            name: item.server_filename,
            storage: "terabox",
            path: item.path,
            size: item.size || 0,
            priority: priority,
            fs_id: item.fs_id,
            url: window.location.origin + "/main?path=" + encodeURIComponent(item.path)
          });
        }
      }

      if (data.list.length < 1000) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }

  await fetchDirectory("/");
  window.teraboxManifest = allFiles;

  console.log("Scan complete! Found " + allFiles.length + " files. Triggering download popup...");

  function triggerDownload() {
    var blob = new Blob([JSON.stringify(allFiles, null, 2)], { type: "application/json" });
    var dlUrl = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = dlUrl;
    a.download = "terabox-manifest.json";
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
      document.body.removeChild(a);
      URL.revokeObjectURL(dlUrl);
    }, 1000);
  }

  // Trigger browser download popup automatically
  triggerDownload();

  // Also add fallback button in top-right corner if browser blocked popup
  var oldBtn = document.getElementById("terabox-dl-btn");
  if (oldBtn) oldBtn.remove();

  var btn = document.createElement("button");
  btn.id = "terabox-dl-btn";
  btn.textContent = "Download " + allFiles.length + " Files (terabox-manifest.json)";
  btn.style.position = "fixed";
  btn.style.top = "20px";
  btn.style.right = "20px";
  btn.style.zIndex = "9999999";
  btn.style.padding = "16px 24px";
  btn.style.backgroundColor = "#7c3aed";
  btn.style.color = "#ffffff";
  btn.style.fontSize = "16px";
  btn.style.fontWeight = "bold";
  btn.style.borderRadius = "10px";
  btn.style.border = "2px solid #ffffff";
  btn.style.cursor = "pointer";
  btn.style.boxShadow = "0 8px 24px rgba(0,0,0,0.5)";
  btn.onclick = triggerDownload;

  document.body.appendChild(btn);
  console.log("DONE! Found " + allFiles.length + " files.");
})();
