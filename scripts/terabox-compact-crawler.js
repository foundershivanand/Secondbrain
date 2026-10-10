(async function() {
  var all = [], seen = {}, btn = document.createElement('button');
  btn.id = 'terabox-blue-btn';
  btn.innerText = 'Scanning TeraBox...';
  btn.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999999;padding:16px 28px;background:#2563eb;color:#fff;font-size:16px;font-weight:bold;border-radius:12px;border:3px solid #fff;cursor:pointer;box-shadow:0 8px 30px rgba(37,99,235,0.6)';
  document.body.appendChild(btn);

  async function crawl(dir) {
    if (seen[dir]) return;
    seen[dir] = true;
    var page = 1, more = true;
    while (more) {
      var r = await fetch('/api/list?dir=' + encodeURIComponent(dir) + '&order=name&desc=0&num=1000&page=' + page);
      var j = await r.json();
      if (!j.list || j.list.length === 0) break;
      for (var f of j.list) {
        if (f.isdir === 1) {
          await crawl(f.path);
        } else {
          all.push({
            raw_id: 'RAW-TERABOX-' + (f.fs_id || Math.floor(Math.random() * 1e6)),
            filename: f.server_filename,
            name: f.server_filename,
            storage: 'terabox',
            path: f.path,
            size: f.size || 0,
            priority: 'P1',
            fs_id: f.fs_id,
            url: location.origin + '/main?path=' + encodeURIComponent(f.path)
          });
        }
      }
      btn.innerText = 'Found ' + all.length + ' files (Scanning...)';
      if (j.list.length < 1000) more = false; else page++;
    }
  }

  await crawl('/');
  btn.innerText = 'Download ' + all.length + ' Files (terabox-manifest.json)';
  btn.onclick = function() {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' }));
    a.download = 'terabox-manifest.json';
    a.click();
  };
  btn.click();
})();
