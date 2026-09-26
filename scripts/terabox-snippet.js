(async function() {
  console.log("Starting TeraBox media scanner (ignoring node_modules and code files)...");

  var ALLOWED_EXT = {
    "mp4": true, "mov": true, "mkv": true, "webm": true, "avi": true,
    "png": true, "jpg": true, "jpeg": true, "webp": true,
    "pdf": true,
    "mp3": true, "m4a": true, "wav": true, "ogg": true
  };

  var IGNORE_DIRS = {
    "node_modules": true,
    ".git": true,
    ".wrangler": true,
    "dist": true,
    "build": true,
    ".vscode": true,
    "vendor": true,
    "__pycache__": true,
    ".idea": true,
    "target": true
  };

  var allFiles = [];
  var visitedDirs = {};

  async function scanDir(dir) {
    if (visitedDirs[dir]) return;
    visitedDirs[dir] = true;

    var parts = dir.split("/");
    var folderName = parts[parts.length - 1] || parts[parts.length - 2] || "";
    if (IGNORE_DIRS[folderName.toLowerCase()]) {
      console.log("Skipping ignored folder: " + dir);
      return;
    }

    console.log("Scanning folder: " + dir);
    var page = 1;
    var hasMore = true;

    while (hasMore) {
      var endpoint = "/api/list?dir=" + encodeURIComponent(dir) + "&order=name&desc=0&num=1000&page=" + page;
      var response = await fetch(endpoint);
      var json = await response.json();

      if (json.errno !== 0 || !json.list || json.list.length === 0) {
        break;
      }

      for (var i = 0; i < json.list.length; i++) {
        var entry = json.list[i];

        if (entry.isdir === 1) {
          var subName = entry.server_filename || "";
          if (!IGNORE_DIRS[subName.toLowerCase()]) {
            await scanDir(entry.path);
          }
        } else {
          var filename = entry.server_filename || "";
          var dotIdx = filename.lastIndexOf(".");
          var ext = dotIdx !== -1 ? filename.substring(dotIdx + 1).toLowerCase() : "";

          // Only keep allowed media: videos, screenshots, pdfs, audio
          if (!ALLOWED_EXT[ext]) {
            continue;
          }

          var rawId = "RAW-TERABOX-" + Math.floor(100000 + Math.random() * 900000);
          var lowerPath = (entry.path || "").toLowerCase();
          var priority = "P1";
          if (lowerPath.indexOf("p0") !== -1 || lowerPath.indexOf("urgent") !== -1 || lowerPath.indexOf("agent") !== -1) {
            priority = "P0";
          } else if (lowerPath.indexOf("archive") !== -1 || lowerPath.indexOf("backup") !== -1) {
            priority = "P3";
          }

          allFiles.push({
            raw_id: rawId,
            filename: filename,
            name: filename,
            storage: "terabox",
            path: entry.path,
            size: entry.size || 0,
            priority: priority,
            fs_id: entry.fs_id,
            url: window.location.origin + "/main?path=" + encodeURIComponent(entry.path)
          });
        }
      }

      if (json.list.length < 1000) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }

  await scanDir("/");
  window.teraboxManifest = allFiles;

  try {
    copy(JSON.stringify(allFiles, null, 2));
    console.log("Manifest copied to clipboard!");
  } catch (e) {}

  var prevBtn = document.getElementById("tb-dl-btn");
  if (prevBtn) prevBtn.remove();

  var btn = document.createElement("button");
  btn.id = "tb-dl-btn";
  btn.textContent = "Download " + allFiles.length + " Media Files (terabox-manifest.json)";
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

  btn.onclick = function() {
    var blob = new Blob([JSON.stringify(allFiles, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "terabox-manifest.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  document.body.appendChild(btn);
  console.log("FINISHED! Found " + allFiles.length + " media files (filtered out code/node_modules).");
  console.log("Click the purple button at top right to download.");
})();
