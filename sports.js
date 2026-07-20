(function () {
  var grid = document.getElementById("sports-grid");
  var search = document.getElementById("sports-search");
  var empty = document.getElementById("sports-empty");
  var status = document.getElementById("sports-status");
  var player = document.getElementById("sports-player");
  var video = document.getElementById("sports-player-video");
  var frame = document.getElementById("sports-player-frame");
  var scoreboard = document.getElementById("sports-player-scoreboard");
  var playerTitle = document.getElementById("sports-player-title");
  var playerBack = document.getElementById("sports-player-back");
  var playerFs = document.getElementById("sports-player-fs");
  var items = [];
  var filtered = [];
  var renderedCount = 0;
  var listObserver = null;
  var gridSentinel = null;
  var page = 1;
  var feedTotal = 0;
  var hasMore = false;
  var loading = false;
  var loadingMore = false;
  var filterTimer = 0;
  var BATCH_SIZE = 72;
  var hlsScriptPromise = null;
  var hlsInstance = null;
  var playGen = 0;

  function fetchJson(url, timeoutMs) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () {
      ctrl.abort();
    }, timeoutMs || 45000);
    return fetch(url, { signal: ctrl.signal })
      .then(function (res) {
        clearTimeout(timer);
        if (!res.ok) throw new Error("bad status");
        return res.json();
      })
      .catch(function (err) {
        clearTimeout(timer);
        throw err;
      });
  }

  function setStatus(text, show) {
    if (!status) return;
    status.hidden = !show;
    status.textContent = text || "";
  }

  function updateStatus() {
    var label = filtered.length.toLocaleString();
    if (feedTotal > filtered.length) label += " of " + feedTotal.toLocaleString();
    setStatus(label + " events", filtered.length > 0);
  }

  function resetGridDom() {
    renderedCount = 0;
    if (listObserver) {
      listObserver.disconnect();
      listObserver = null;
    }
    if (gridSentinel) {
      gridSentinel.remove();
      gridSentinel = null;
    }
    if (grid) grid.innerHTML = "";
  }

  function ensureSentinel() {
    if (!grid || gridSentinel) return;
    gridSentinel = document.createElement("div");
    gridSentinel.className = "site__grid-sentinel";
    gridSentinel.setAttribute("aria-hidden", "true");
    grid.appendChild(gridSentinel);
  }

  function setupListObserver() {
    if (!gridSentinel) return;
    if (listObserver) listObserver.disconnect();
    listObserver = new IntersectionObserver(
      function (entries) {
        if (
          !entries.some(function (entry) {
            return entry.isIntersecting;
          })
        ) {
          return;
        }
        if (renderedCount < filtered.length) {
          appendBatch();
          return;
        }
        if (hasMore && !loadingMore) fetchPage(true);
      },
      { rootMargin: "1400px 0px" }
    );
    listObserver.observe(gridSentinel);
  }

  function logoSources(item) {
    if (!item || !item.logo) return { primary: "", fallback: "" };
    var direct = String(item.logo).trim();
    if (!direct) return { primary: "", fallback: "" };
    return { primary: direct, fallback: "/api/sports/logo?url=" + encodeURIComponent(direct) };
  }

  function createCard(item, index) {
    var card = document.createElement("article");
    card.className = "sports-card site__card site__card--ready";
    card.role = "listitem";
    card.tabIndex = 0;
    card.dataset.index = String(index);
    card.style.setProperty("--i", String(index % 24));
    var thumb = document.createElement("div");
    thumb.className = "site__card-thumb sports-card__thumb";
    thumb.style.setProperty("--hue", String((index * 37) % 360));
    var initial = document.createElement("span");
    initial.className = "movies-card__initial";
    initial.textContent = (item.title || "?").charAt(0).toUpperCase();
    thumb.appendChild(initial);
    var sources = logoSources(item);
    if (window.KritikalEntThumb && sources.primary) {
      window.KritikalEntThumb.bindCover(thumb, index, sources.primary, sources.fallback);
    }
    var play = document.createElement("span");
    play.className = "site__card-play";
    play.setAttribute("aria-hidden", "true");
    var label = item.kind === "youtube" || item.kind === "stream" ? "Watch" : "Open";
    play.innerHTML =
      '<span class="site__card-play-btn"><span class="site__card-play-arrow" aria-hidden="true"></span><span class="site__card-play-label">' +
      label +
      "</span></span>";
    var foot = document.createElement("div");
    foot.className = "site__card-foot";
    var title = document.createElement("h3");
    title.className = "site__card-title";
    title.textContent = item.title;
    var meta = document.createElement("p");
    meta.className = "movies-card__meta";
    meta.textContent = item.subtitle || item.category || "Sports";
    foot.append(title, meta);
    thumb.appendChild(play);
    card.append(thumb, foot);
    return card;
  }

  function appendBatch() {
    if (!grid || renderedCount >= filtered.length) return;
    var end = Math.min(renderedCount + BATCH_SIZE, filtered.length);
    var frag = document.createDocumentFragment();
    for (var i = renderedCount; i < end; i++) {
      frag.appendChild(createCard(filtered[i], i));
    }
    ensureSentinel();
    grid.insertBefore(frag, gridSentinel);
    renderedCount = end;
    setupListObserver();
  }

  function renderGrid() {
    if (!grid) return;
    resetGridDom();
    if (empty) empty.hidden = filtered.length > 0 || loading;
    if (!filtered.length) {
      setStatus(loading ? "loading sports…" : "", loading);
      return;
    }
    updateStatus();
    appendBatch();
  }

  function mergeItems(batch) {
    var seen = {};
    items.forEach(function (item) {
      seen[item.id] = true;
    });
    batch.forEach(function (item) {
      if (!item || !item.id || seen[item.id]) return;
      seen[item.id] = true;
      items.push(item);
    });
  }

  function prefetchFeed() {
    if (!hasMore || loadingMore || loading) return;
    fetchPage(true);
  }

  function fetchPage(append) {
    if (loading || loadingMore) return;
    var q = search && search.value ? search.value.trim() : "";
    if (append) {
      loadingMore = true;
      page += 1;
    } else {
      loading = true;
      page = 1;
      items = [];
      filtered = [];
      hasMore = false;
      feedTotal = 0;
      setStatus("loading sports…", true);
      if (empty) empty.hidden = true;
    }
    var url =
      "/api/sports/feed?page=" + encodeURIComponent(String(page)) + "&limit=120" + (q ? "&q=" + encodeURIComponent(q) : "");
    fetchJson(url)
      .then(function (payload) {
        var batch = Array.isArray(payload.data) ? payload.data : [];
        hasMore = !!payload.hasMore;
        feedTotal = payload.total || items.length + batch.length;
        if (append) {
          mergeItems(batch);
          filtered = items.slice();
          loadingMore = false;
          updateStatus();
          appendBatch();
          if (hasMore) prefetchFeed();
        } else {
          items = batch.slice();
          filtered = items.slice();
          loading = false;
          renderGrid();
          if (!filtered.length && empty) {
            empty.hidden = false;
            empty.textContent = "nothing matched. try another search.";
          }
          if (hasMore) prefetchFeed();
        }
      })
      .catch(function () {
        loading = false;
        loadingMore = false;
        setStatus("", false);
        if (items.length) {
          renderGrid();
          return;
        }
        if (empty) {
          empty.hidden = false;
          empty.textContent = "sports feed failed. try again later.";
        }
      });
  }

  function debouncedSearch() {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(function () {
      fetchPage(false);
    }, 200);
  }

  function loadHls() {
    if (window.Hls) return Promise.resolve(window.Hls);
    if (hlsScriptPromise) return hlsScriptPromise;
    hlsScriptPromise = new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.15/dist/hls.min.js";
      script.onload = function () {
        resolve(window.Hls);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return hlsScriptPromise;
  }

  function stopPlayback() {
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }
    if (video) {
      video.onerror = null;
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.hidden = true;
    }
    if (frame) {
      frame.src = "about:blank";
      frame.hidden = true;
    }
    if (scoreboard) {
      scoreboard.innerHTML = "";
      scoreboard.hidden = true;
    }
  }

  function esc(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function showScoreboard(item) {
    if (!scoreboard) return;
    scoreboard.hidden = false;
    var home = item.homeTeam || "Home";
    var away = item.awayTeam || "Away";
    var hs = item.homeScore !== undefined && item.homeScore !== "" ? item.homeScore : "—";
    var as = item.awayScore !== undefined && item.awayScore !== "" ? item.awayScore : "—";
    var meta = [item.league || item.category, item.status, item.eventDate, item.eventTime].filter(Boolean).join(" · ");
    scoreboard.innerHTML =
      '<div class="sports-scoreboard">' +
      '<div class="sports-scoreboard__row">' +
      '<span class="sports-scoreboard__team">' +
      esc(home) +
      "</span>" +
      '<span class="sports-scoreboard__score">' +
      esc(hs) +
      "</span>" +
      "</div>" +
      '<div class="sports-scoreboard__row">' +
      '<span class="sports-scoreboard__team">' +
      esc(away) +
      "</span>" +
      '<span class="sports-scoreboard__score">' +
      esc(as) +
      "</span>" +
      "</div>" +
      (meta ? '<p class="sports-scoreboard__meta">' + esc(meta) + "</p>" : "") +
      "</div>";
  }

  function playStream(item, gen) {
    if (!video || !item.url) return;
    video.hidden = false;
    var playUrl = "/api/sports/proxy?url=" + encodeURIComponent(item.url);
    var isHls = /\.m3u8(\?|$)/i.test(item.url);
    if (isHls) {
      loadHls()
        .then(function (Hls) {
          if (gen !== playGen) return;
          if (Hls && Hls.isSupported()) {
            hlsInstance = new Hls({ enableWorker: true, lowLatencyMode: true });
            hlsInstance.loadSource(playUrl);
            hlsInstance.attachMedia(video);
            hlsInstance.on(Hls.Events.MANIFEST_PARSED, function () {
              if (gen !== playGen) return;
              video.play().catch(function () {});
            });
            hlsInstance.on(Hls.Events.ERROR, function (_event, data) {
              if (gen !== playGen || !data || !data.fatal) return;
              stopPlayback();
              showScoreboard(item);
              if (playerTitle) playerTitle.textContent = (item.title || "Match") + " · stream unavailable";
            });
          } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = playUrl;
            video.play().catch(function () {});
          } else {
            showScoreboard(item);
          }
        })
        .catch(function () {
          if (gen !== playGen) return;
          showScoreboard(item);
        });
      return;
    }
    video.src = playUrl;
    video.play().catch(function () {});
  }

  function playItem(item) {
    if (!player || !item) return;
    if (playerTitle) playerTitle.textContent = item.title || "Match";
    player.hidden = false;
    stopPlayback();
    playGen += 1;
    var gen = playGen;
    if (item.kind === "youtube" && item.url && frame) {
      frame.hidden = false;
      frame.src = item.url;
    } else if (item.kind === "stream" && item.url) {
      playStream(item, gen);
    } else {
      showScoreboard(item);
    }
    player.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function closePlayer() {
    if (!player) return;
    player.hidden = true;
    stopPlayback();
  }

  if (grid) {
    grid.addEventListener("click", function (e) {
      var card = e.target.closest(".sports-card");
      if (!card) return;
      var idx = parseInt(card.dataset.index, 10);
      if (!isNaN(idx) && filtered[idx]) playItem(filtered[idx]);
    });
    grid.addEventListener("keydown", function (e) {
      var card = e.target.closest(".sports-card");
      if (!card) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        var idx = parseInt(card.dataset.index, 10);
        if (!isNaN(idx) && filtered[idx]) playItem(filtered[idx]);
      }
    });
  }

  if (search) {
    search.addEventListener("input", debouncedSearch);
    search.addEventListener("search", debouncedSearch);
  }

  if (playerBack) playerBack.addEventListener("click", closePlayer);

  if (playerFs) {
    playerFs.addEventListener("click", function () {
      var wrap = document.querySelector(".sports-player__frame-wrap");
      var el = wrap || video || frame;
      if (!el) return;
      if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen();
      else if (document.exitFullscreen) document.exitFullscreen();
    });
  }

  window.KritikalSports = {
    render: function () {
      if (!items.length) fetchPage(false);
      else renderGrid();
    },
    close: closePlayer,
  };
})();
