// ==UserScript==
// @name         Second Brain - YouTube Automatic Watch & Like History Sync
// @namespace    https://second-brain-api.foundershivanand.workers.dev/
// @version      1.1.0
// @description  Automatically sync watched and liked YouTube videos to your Second Brain Obsidian Vault with AI-extracted atomic ideas and summaries.
// @author       Second Brain
// @match        https://www.youtube.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      second-brain-api.foundershivanand.workers.dev
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // --- Configuration ---
  const API_ENDPOINT = 'https://second-brain-api.foundershivanand.workers.dev/api/capture';
  const AUTH_TOKEN = 'secondbrain_dev_secret';
  const MIN_WATCH_SECONDS = 30; // Minimum seconds watched before auto-syncing

  let currentVideoId = null;
  let watchTimer = null;
  let secondsWatched = 0;
  let hasSyncedCurrentVideo = false;

  function getVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('v');
  }

  function getVideoTitle() {
    const titleEl = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #title h1 yt-formatted-string, ytd-watch-metadata h1');
    return titleEl ? titleEl.textContent.trim() : document.title.replace(' - YouTube', '').trim();
  }

  function getChannelName() {
    const channelEl = document.querySelector('#owner #channel-name a, ytd-channel-name a, #channel-name a');
    return channelEl ? channelEl.textContent.trim() : '';
  }

  function showToast(message, isSuccess = true) {
    let toast = document.getElementById('sb-sync-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'sb-sync-toast';
      toast.style.position = 'fixed';
      toast.style.bottom = '24px';
      toast.style.right = '24px';
      toast.style.zIndex = '999999';
      toast.style.padding = '12px 18px';
      toast.style.borderRadius = '12px';
      toast.style.fontSize = '13px';
      toast.style.fontWeight = '600';
      toast.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      toast.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(168, 85, 247, 0.4)';
      toast.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
      toast.style.transform = 'translateY(100px)';
      toast.style.opacity = '0';
      document.body.appendChild(toast);
    }

    toast.style.background = isSuccess ? '#0f172a' : '#450a0a';
    toast.style.color = isSuccess ? '#c084fc' : '#fca5a5';
    toast.style.border = isSuccess ? '1px solid #9333ea' : '1px solid #dc2626';
    toast.innerHTML = message;

    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';

    setTimeout(() => {
      toast.style.transform = 'translateY(100px)';
      toast.style.opacity = '0';
    }, 4500);
  }

  function syncVideo(videoId, title, channel, isLiked = false) {
    const syncedKey = isLiked ? `sb_liked_${videoId}` : `sb_synced_${videoId}`;
    if (localStorage.getItem(syncedKey)) {
      console.log(`[Second Brain] Video already synced: ${videoId}`);
      return;
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const badge = isLiked ? '👍 Liked Video' : '👀 Watched Video';
    showToast(`🧠 <b>Second Brain:</b> Extracting ideas from ${badge} <i>"${title.slice(0, 25)}..."</i>`);

    const payload = JSON.stringify({
      source_type: 'youtube',
      url: videoUrl,
      title: title,
      user_note: channel
        ? `Channel: ${channel} (${isLiked ? 'Liked on YouTube' : 'Watched on YouTube'})`
        : (isLiked ? 'Liked on YouTube' : 'Watched on YouTube'),
      importance: isLiked ? 8 : 7,
    });

    GM_xmlhttpRequest({
      method: 'POST',
      url: API_ENDPOINT,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      data: payload,
      onload: function (response) {
        if (response.status >= 200 && response.status < 300) {
          localStorage.setItem(syncedKey, 'true');
          localStorage.setItem(`sb_synced_${videoId}`, 'true');
          hasSyncedCurrentVideo = true;
          showToast(`✅ <b>Second Brain:</b> Synced & added to Obsidian vault!`, true);
          console.log(`[Second Brain] Successfully synced video ${videoId} to Obsidian vault.`);
        } else {
          console.error('[Second Brain] Sync error:', response.responseText);
        }
      },
      onerror: function (err) {
        console.error('[Second Brain] Network error syncing video:', err);
      }
    });
  }

  function handleVideoWatch() {
    const videoId = getVideoId();
    if (!videoId) return;

    if (videoId !== currentVideoId) {
      currentVideoId = videoId;
      secondsWatched = 0;
      hasSyncedCurrentVideo = Boolean(localStorage.getItem(`sb_synced_${videoId}`));

      if (watchTimer) clearInterval(watchTimer);

      if (!hasSyncedCurrentVideo) {
        watchTimer = setInterval(() => {
          const videoEl = document.querySelector('video');
          if (videoEl && !videoEl.paused && !videoEl.ended) {
            secondsWatched++;
            if (secondsWatched >= MIN_WATCH_SECONDS && !hasSyncedCurrentVideo) {
              hasSyncedCurrentVideo = true;
              clearInterval(watchTimer);
              const title = getVideoTitle();
              const channel = getChannelName();
              syncVideo(currentVideoId, title, channel, false);
            }
          }
        }, 1000);
      }
    }
  }

  // Detect when user clicks the "Like" thumbs-up button on YouTube
  function setupLikeButtonListener() {
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (!target) return;

      const likeBtn = target.closest('like-button-view-model button, ytd-like-button-renderer button, button[aria-label*="like" i], button[aria-label*="Like" i]');
      if (likeBtn) {
        setTimeout(() => {
          const isPressed = likeBtn.getAttribute('aria-pressed') === 'true' ||
                            likeBtn.classList.contains('style-default-active') ||
                            likeBtn.closest('like-button-view-model')?.querySelector('[aria-pressed="true"]');
          if (isPressed) {
            const videoId = getVideoId();
            if (videoId) {
              const title = getVideoTitle();
              const channel = getChannelName();
              console.log(`[Second Brain] Like clicked on video ${videoId}: "${title}"`);
              syncVideo(videoId, title, channel, true);
            }
          }
        }, 400);
      }
    }, true);
  }

  // Initialize listeners
  window.addEventListener('yt-navigate-finish', handleVideoWatch);
  window.addEventListener('load', handleVideoWatch);
  setInterval(handleVideoWatch, 2500);
  setupLikeButtonListener();

  console.log('🧠 [Second Brain] YouTube Watch & Like Sync Active.');
})();
