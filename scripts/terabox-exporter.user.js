// ==UserScript==
// @name         TeraBox Knowledge Vault Manifest Exporter
// @namespace    https://secondbrain.local
// @version      1.0
// @description  Adds a prominent Blue Download Button to export terabox-manifest.json
// @author       Second Brain
// @match        https://*.terabox.app/*
// @match        https://*.terabox.com/*
// @match        https://*.1024terabox.com/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  function initButton() {
    if (document.getElementById('tb-blue-exporter-btn')) return;

    var btn = document.createElement('button');
    btn.id = 'tb-blue-exporter-btn';
    btn.textContent = '📥 Extract TeraBox Manifest';
    btn.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999999;padding:16px 28px;background:#2563eb;color:#fff;font-size:16px;font-weight:bold;border-radius:12px;border:3px solid #fff;cursor:pointer;box-shadow:0 8px 30px rgba(37,99,235,0.7);';

    btn.onclick = async function() {
      btn.textContent = 'Scanning TeraBox...';
      btn.disabled = true;

      var MEDIA_EXT = {
        mp4: 1, mov: 1, mkv: 1, webm: 1, avi: 1, '3gp': 1, flv: 1,
        png: 1, jpg: 1, jpeg: 1, webp: 1, gif: 1, bmp: 1, heic: 1,
        pdf: 1,
        mp3: 1, m4a: 1, wav: 1, ogg: 1, aac: 1, flac: 1
      };
      var SKIP_DIRS = {
        node_modules: 1, '.git': 1, '.wrangler': 1, dist: 1, build: 1,
        '.vscode': 1, vendor: 1, __pycache__: 1, '.idea': 1, target: 1
      };

      var all = [], seen = {};
      async function crawl(dir) {
        if (seen[dir]) return;
        seen[dir] = true;

        var parts = dir.split('/').filter(Boolean);
        var folderName = parts[parts.length - 1] || '';
        if (SKIP_DIRS[folderName.toLowerCase()]) return;

        var page = 1, more = true;
        while (more) {
          try {
            var res = await (await fetch('/api/list?dir=' + encodeURIComponent(dir) + '&order=name&desc=0&num=1000&page=' + page)).json();
            if (!res.list || !res.list.length) break;
            for (var f of res.list) {
              if (f.isdir) {
                await crawl(f.path);
              } else {
                var ext = (f.server_filename || '').split('.').pop().toLowerCase();
                if (!MEDIA_EXT[ext]) continue;

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
            btn.textContent = 'Found ' + all.length + ' Media Files (Scanning...)';
            if (res.list.length < 1000) more = false; else page++;
          } catch(e) {
            break;
          }
        }
      }

      await crawl('/');

      btn.disabled = false;
      btn.textContent = 'Download ' + all.length + ' Files (terabox-manifest.json)';

      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' }));
      a.download = 'terabox-manifest.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function() { document.body.removeChild(a); }, 1500);
    };

    document.body.appendChild(btn);
  }

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initButton);
  } else {
    initButton();
  }
  setTimeout(initButton, 2000);
})();
