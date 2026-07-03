(function () {
  var dock = document.getElementById("music-dock");
  var art = document.getElementById("music-dock-art");
  var titleEl = document.getElementById("music-dock-title");
  var artistEl = document.getElementById("music-dock-artist");
  var metaEl = dock ? dock.querySelector(".music-dock__meta") : null;
  var btnPrev = document.getElementById("music-btn-prev");
  var btnPlay = document.getElementById("music-btn-play");
  var btnPlayMini = document.getElementById("music-btn-play-mini");
  var btnStop = document.getElementById("music-btn-stop");
  var btnNext = document.getElementById("music-btn-next");
  var btnLoop = document.getElementById("music-btn-loop");
  var btnRestart = document.getElementById("music-btn-restart");
  var btnLyrics = document.getElementById("music-btn-lyrics");
  var lyricsPanel = document.getElementById("music-lyrics");
  var lyricsLine = document.getElementById("music-lyrics-line");
  var btnVolDown = document.getElementById("music-vol-down");
  var btnVolUp = document.getElementById("music-vol-up");
  var volRange = document.getElementById("music-volume");
  var btnMinimize = document.getElementById("music-dock-minimize");
  var btnClose = document.getElementById("music-dock-close");
  var dockInner = document.getElementById("music-dock-inner");
  var audio = document.getElementById("music-audio");
  var queue = [];
  var index = -1;
  var volume = 0.8;
  var minimized = false;
  var loopTrack = false;
  var lyricsOpen = false;
  var lyricsEnabled = true;
  var lyricsPlain = "";
  var lyricsFetchId = 0;
  var dragging = false;
  var dragMoved = false;
  var dragX = 0;
  var dragY = 0;
  var startX = 0;
  var startY = 0;
  var startLeft = 0;
  var startTop = 0;

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function pinDockPosition() {
    if (!dock || dock.dataset.pinned === "1") return;
    var rect = dock.getBoundingClientRect();
    dock.style.left = rect.left + "px";
    dock.style.top = rect.top + "px";
    dock.style.bottom = "auto";
    dock.style.transform = "none";
    dock.style.width = rect.width + "px";
    dock.dataset.pinned = "1";
    dock.classList.add("music-dock--pinned");
  }

  function resetDockPosition() {
    if (!dock) return;
    dock.style.left = "";
    dock.style.top = "";
    dock.style.bottom = "";
    dock.style.transform = "";
    dock.style.width = "";
    dock.dataset.pinned = "";
    dock.classList.remove("music-dock--pinned");
  }

  function onDragStart(clientX, clientY) {
    if (!dock || dock.hidden) return;
    pinDockPosition();
    dragging = true;
    dragMoved = false;
    dragX = clientX;
    dragY = clientY;
    startX = clientX;
    startY = clientY;
    startLeft = parseFloat(dock.style.left) || 0;
    startTop = parseFloat(dock.style.top) || 0;
    dock.classList.add("music-dock--dragging");
  }

  function onDragMove(clientX, clientY) {
    if (!dragging || !dock) return;
    if (Math.abs(clientX - startX) > 3 || Math.abs(clientY - startY) > 3) dragMoved = true;
    var dx = clientX - dragX;
    var dy = clientY - dragY;
    var maxLeft = Math.max(8, window.innerWidth - dock.offsetWidth - 8);
    var maxTop = Math.max(8, window.innerHeight - dock.offsetHeight - 8);
    dock.style.left = clamp(startLeft + dx, 8, maxLeft) + "px";
    dock.style.top = clamp(startTop + dy, 8, maxTop) + "px";
  }

  function onDragEnd() {
    if (!dragging) return;
    var moved = dragMoved;
    dragging = false;
    if (dock) dock.classList.remove("music-dock--dragging");
    if (moved) {
      window.setTimeout(function () {
        dragMoved = false;
      }, 100);
    }
  }

  function trackArtwork(track) {
    if (!track || !track.artwork) return "";
    return track.artwork["480x480"] || track.artwork["150x150"] || track.artwork["1000x1000"] || "";
  }

  function syncLoopButton() {
    if (!btnLoop) return;
    btnLoop.classList.toggle("music-dock__btn--loop-on", loopTrack);
    btnLoop.setAttribute("aria-pressed", String(!!loopTrack));
  }

  function syncPlayButton() {
    var label = audio && !audio.paused ? "Pause" : "Play";
    if (btnPlay) btnPlay.textContent = label;
    if (btnPlayMini) btnPlayMini.textContent = label;
  }

  function setVolume(val) {
    volume = Math.max(0, Math.min(1, val));
    if (audio) audio.volume = volume;
    if (volRange) volRange.value = String(Math.round(volume * 100));
  }

  function setMinimized(on) {
    minimized = !!on;
    if (dock) dock.classList.toggle("music-dock--minimized", minimized);
    document.documentElement.classList.toggle("music-dock-minimized", minimized);
    if (btnMinimize) {
      btnMinimize.textContent = minimized ? "+" : "−";
      btnMinimize.setAttribute("aria-label", minimized ? "Expand player" : "Minimize player");
    }
  }

  function showDock(show) {
    if (!dock) return;
    dock.hidden = !show;
    document.documentElement.classList.toggle("music-dock-open", show && !minimized);
    document.documentElement.classList.toggle("music-dock-minimized", show && minimized);
    if (!show) setMinimized(false);
  }

  function lyricsAllowed() {
    if (!lyricsEnabled) return false;
    if (window.ZentraSiteConfig && typeof window.ZentraSiteConfig.feature === "function") {
      return window.ZentraSiteConfig.feature("lyricsOverlay", true);
    }
    return true;
  }

  function setLyricsOpen(open) {
    lyricsOpen = !!open;
    if (btnLyrics) {
      btnLyrics.setAttribute("aria-pressed", lyricsOpen ? "true" : "false");
      btnLyrics.classList.toggle("music-dock__btn--lyrics-on", lyricsOpen);
    }
    if (lyricsPanel) lyricsPanel.hidden = !lyricsOpen || !lyricsPlain;
    document.documentElement.classList.toggle("music-lyrics-open", lyricsOpen && !!lyricsPlain);
  }

  function paintLyricsButton() {
    if (!btnLyrics) return;
    var show = lyricsAllowed() && !!lyricsPlain;
    btnLyrics.hidden = !show;
    if (!show) setLyricsOpen(false);
  }

  function loadLyrics(track) {
    lyricsPlain = "";
    paintLyricsButton();
    if (!track || !lyricsAllowed()) return;
    var title = track.title || "";
    var artist = track.user && track.user.name ? track.user.name : "";
    if (!title) return;
    var fetchId = ++lyricsFetchId;
    var url =
      "https://lrclib.net/api/get?track_name=" +
      encodeURIComponent(title) +
      "&artist_name=" +
      encodeURIComponent(artist);
    fetch(url)
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .then(function (data) {
        if (fetchId !== lyricsFetchId) return;
        var text = (data && (data.plainLyrics || data.syncedLyrics)) || "";
        lyricsPlain = String(text).trim();
        if (lyricsLine) {
          lyricsLine.textContent = lyricsPlain || "No lyrics found for this track.";
        }
        paintLyricsButton();
        if (lyricsPlain && lyricsOpen) setLyricsOpen(true);
      })
      .catch(function () {
        if (fetchId !== lyricsFetchId) return;
        lyricsPlain = "";
        paintLyricsButton();
      });
  }

  function updateMeta(track) {
    if (titleEl) titleEl.textContent = track && track.title ? track.title : "Not playing";
    if (artistEl) artistEl.textContent = track && track.user && track.user.name ? track.user.name : "";
    if (art) {
      var src = trackArtwork(track);
      if (src) {
        art.src = src;
        art.hidden = false;
      } else {
        art.removeAttribute("src");
        art.hidden = true;
      }
    }
    if (!track) {
      lyricsPlain = "";
      paintLyricsButton();
      setLyricsOpen(false);
      if (lyricsLine) lyricsLine.textContent = "Lyrics will show here when available.";
      return;
    }
    loadLyrics(track);
  }

  function streamUrl(track) {
    if (!track || track.id == null) return "";
    return "/api/music/stream/" + encodeURIComponent(String(track.id));
  }

  function playAt(i) {
    if (!queue.length || !audio) return;
    if (i < 0) i = 0;
    if (i >= queue.length) i = queue.length - 1;
    index = i;
    var track = queue[index];
    updateMeta(track);
    showDock(true);
    audio.src = streamUrl(track);
    audio.play().catch(function () {
      syncPlayButton();
    });
    syncPlayButton();
    if (window.KritikalMusic && window.KritikalMusic.syncActive) window.KritikalMusic.syncActive(track.id);
  }

  function playTrack(track, list, startIndex) {
    queue = Array.isArray(list) && list.length ? list.slice() : track ? [track] : [];
    if (!queue.length) return;
    var idx = typeof startIndex === "number" ? startIndex : queue.findIndex(function (t) {
      return String(t.id) === String(track.id);
    });
    playAt(idx >= 0 ? idx : 0);
  }

  function togglePlay() {
    if (!audio) return;
    if (!audio.src) {
      if (queue.length && index >= 0) playAt(index);
      return;
    }
    if (audio.paused) audio.play().catch(function () {});
    else audio.pause();
    syncPlayButton();
  }

  function stopPlayback() {
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    syncPlayButton();
  }

  function restartTrack() {
    if (!audio) return;
    audio.currentTime = 0;
    if (audio.paused) audio.play().catch(function () {});
    syncPlayButton();
  }

  function closePlayer() {
    if (!audio) return;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    queue = [];
    index = -1;
    showDock(false);
    resetDockPosition();
    updateMeta(null);
    if (window.KritikalMusic && window.KritikalMusic.syncActive) window.KritikalMusic.syncActive(null);
  }

  if (btnPrev) {
    btnPrev.addEventListener("click", function () {
      if (index > 0) playAt(index - 1);
    });
  }
  if (btnNext) {
    btnNext.addEventListener("click", function () {
      if (index < queue.length - 1) playAt(index + 1);
    });
  }
  if (btnPlay) btnPlay.addEventListener("click", togglePlay);
  if (btnPlayMini) btnPlayMini.addEventListener("click", togglePlay);
  if (btnStop) btnStop.addEventListener("click", stopPlayback);
  if (btnRestart) btnRestart.addEventListener("click", restartTrack);
  if (btnLoop) {
    btnLoop.addEventListener("click", function () {
      loopTrack = !loopTrack;
      syncLoopButton();
    });
  }
  if (btnClose) btnClose.addEventListener("click", closePlayer);
  if (btnLyrics) {
    btnLyrics.addEventListener("click", function () {
      if (!lyricsPlain) return;
      setLyricsOpen(!lyricsOpen);
    });
  }
  if (btnMinimize) {
    btnMinimize.addEventListener("click", function () {
      setMinimized(!minimized);
      if (dock && !dock.hidden) {
        document.documentElement.classList.toggle("music-dock-open", !minimized);
      }
    });
  }
  if (metaEl) {
    metaEl.addEventListener("click", function () {
      if (dragMoved) return;
      if (minimized) {
        setMinimized(false);
        document.documentElement.classList.add("music-dock-open");
      }
    });
  }
  if (art) {
    art.addEventListener("click", function () {
      if (dragMoved) return;
      if (minimized) {
        setMinimized(false);
        document.documentElement.classList.add("music-dock-open");
      }
    });
  }
  if (dockInner) {
    dockInner.addEventListener("mousedown", function (e) {
      if (e.target.closest("button, input")) return;
      onDragStart(e.clientX, e.clientY);
      e.preventDefault();
    });
    dockInner.addEventListener(
      "touchstart",
      function (e) {
        if (e.target.closest("button, input")) return;
        var touch = e.touches[0];
        if (!touch) return;
        onDragStart(touch.clientX, touch.clientY);
      },
      { passive: true }
    );
  }
  document.addEventListener("mousemove", function (e) {
    onDragMove(e.clientX, e.clientY);
  });
  document.addEventListener("mouseup", onDragEnd);
  document.addEventListener(
    "touchmove",
    function (e) {
      if (!dragging) return;
      var touch = e.touches[0];
      if (!touch) return;
      onDragMove(touch.clientX, touch.clientY);
    },
    { passive: true }
  );
  document.addEventListener("touchend", onDragEnd);
  document.addEventListener("touchcancel", onDragEnd);
  window.addEventListener("resize", function () {
    if (!dock || dock.dataset.pinned !== "1") return;
    var maxLeft = Math.max(8, window.innerWidth - dock.offsetWidth - 8);
    var maxTop = Math.max(8, window.innerHeight - dock.offsetHeight - 8);
    dock.style.left = clamp(parseFloat(dock.style.left) || 8, 8, maxLeft) + "px";
    dock.style.top = clamp(parseFloat(dock.style.top) || 8, 8, maxTop) + "px";
  });
  if (btnVolDown) {
    btnVolDown.addEventListener("click", function () {
      setVolume(volume - 0.08);
    });
  }
  if (btnVolUp) {
    btnVolUp.addEventListener("click", function () {
      setVolume(volume + 0.08);
    });
  }
  if (volRange) {
    volRange.addEventListener("input", function () {
      setVolume(parseInt(volRange.value, 10) / 100);
    });
  }
  if (audio) {
    audio.addEventListener("play", syncPlayButton);
    audio.addEventListener("pause", syncPlayButton);
    audio.addEventListener("ended", function () {
      if (loopTrack && index >= 0) {
        playAt(index);
        return;
      }
      if (index < queue.length - 1) playAt(index + 1);
      else syncPlayButton();
    });
  }

  setVolume(volume);
  syncLoopButton();

  window.addEventListener("kritikal-settings", function (e) {
    var detail = e.detail || {};
    lyricsEnabled = detail.lyricsEnabled !== false;
    document.body.classList.toggle("music-lyrics-off", !lyricsEnabled);
    if (!lyricsEnabled) setLyricsOpen(false);
    paintLyricsButton();
    if (lyricsEnabled && index >= 0 && queue[index]) loadLyrics(queue[index]);
  });

  window.addEventListener("zentra-site-config", function (e) {
    var features = e.detail && e.detail.features;
    if (features && features.lyricsOverlay === false) {
      setLyricsOpen(false);
      paintLyricsButton();
    }
  });

  window.ZentraMusicPlayer = {
    playTrack: playTrack,
    close: closePlayer,
    stop: stopPlayback,
    getCurrentId: function () {
      return index >= 0 && queue[index] ? queue[index].id : null;
    }
  };
})();
