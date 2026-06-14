(function () {
  var grid = document.getElementById("music-grid");
  var search = document.getElementById("music-search");
  var empty = document.getElementById("music-empty");
  var status = document.getElementById("music-status");
  var tracks = [];
  var activeId = null;
  var filterTimer = 0;
  var loading = false;
  var loadingMore = false;
  var mode = "feed";
  var searchQuery = "";
  var searchOffset = 0;
  var feedPage = 0;
  var hasMore = false;
  var renderedCount = 0;
  var listObserver = null;
  var gridSentinel = null;
  var loadMoreBtn = null;
  var BATCH_SIZE = 72;

  function setStatus(text, show) {
    if (!status) return;
    status.hidden = !show;
    status.textContent = text || "";
  }

  function artworkUrl(track) {
    if (!track || !track.artwork) return "";
    return track.artwork["150x150"] || track.artwork["480x480"] || track.artwork["1000x1000"] || "";
  }

  function formatDuration(ms) {
    if (!ms || ms < 1) return "";
    var total = Math.floor(ms / 1000);
    var m = Math.floor(total / 60);
    var s = total % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
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
    if (loadMoreBtn) {
      loadMoreBtn.remove();
      loadMoreBtn = null;
    }
    if (grid) grid.innerHTML = "";
  }

  function ensureSentinel() {
    if (!grid || gridSentinel) return;
    gridSentinel = document.createElement("div");
    gridSentinel.className = "site__grid-sentinel music-grid__sentinel";
    gridSentinel.setAttribute("aria-hidden", "true");
    grid.appendChild(gridSentinel);
  }

  function ensureLoadMore() {
    if (!grid || loadMoreBtn || !hasMore) return;
    loadMoreBtn = document.createElement("button");
    loadMoreBtn.type = "button";
    loadMoreBtn.className = "music-load-more";
    loadMoreBtn.textContent = loadingMore ? "Loading more…" : "Load more tracks";
    loadMoreBtn.disabled = loadingMore;
    loadMoreBtn.addEventListener("click", function () {
      if (loadingMore || !hasMore) return;
      if (mode === "search") fetchSearch(searchQuery, searchOffset, true);
      else fetchFeed(true);
    });
    grid.appendChild(loadMoreBtn);
  }

  function setupListObserver() {
    if (listObserver || !gridSentinel || renderedCount >= tracks.length) return;
    listObserver = new IntersectionObserver(
      function (entries) {
        if (entries.some(function (entry) {
          return entry.isIntersecting;
        })) {
          appendBatch();
        }
      },
      { rootMargin: "600px 0px" }
    );
    listObserver.observe(gridSentinel);
  }

  function createCard(track, index) {
    var card = document.createElement("article");
    card.className = "music-card site__card site__card--ready";
    card.role = "listitem";
    card.tabIndex = 0;
    card.dataset.index = String(index);
    card.dataset.trackId = String(track.id);
    if (String(track.id) === String(activeId)) card.classList.add("music-card--active");
    card.style.setProperty("--i", String(index % 24));
    var thumb = document.createElement("div");
    thumb.className = "site__card-thumb music-card__thumb";
    var src = artworkUrl(track);
    if (src) {
      var img = document.createElement("img");
      img.className = "site__card-img";
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      if (index < 12) img.fetchPriority = "high";
      img.src = src;
      img.addEventListener("load", function () {
        thumb.classList.add("site__card-thumb--has-img");
      });
      img.addEventListener("error", function () {
        img.remove();
      });
      thumb.appendChild(img);
    }
    var play = document.createElement("span");
    play.className = "site__card-play";
    play.setAttribute("aria-hidden", "true");
    play.innerHTML = '<span class="site__card-play-btn"><span class="site__card-play-arrow" aria-hidden="true"></span><span class="site__card-play-label">Play</span></span>';
    var foot = document.createElement("div");
    foot.className = "site__card-foot";
    var title = document.createElement("h3");
    title.className = "site__card-title";
    title.textContent = track.title;
    var meta = document.createElement("p");
    meta.className = "music-card__meta";
    meta.textContent = (track.user && track.user.name ? track.user.name : "Unknown") + (track.duration ? " · " + formatDuration(track.duration) : "");
    foot.append(title, meta);
    thumb.appendChild(play);
    card.append(thumb, foot);
    return card;
  }

  function appendBatch() {
    if (!grid || renderedCount >= tracks.length) return;
    var end = Math.min(renderedCount + BATCH_SIZE, tracks.length);
    var frag = document.createDocumentFragment();
    for (var i = renderedCount; i < end; i++) {
      frag.appendChild(createCard(tracks[i], i));
    }
    ensureSentinel();
    if (loadMoreBtn && loadMoreBtn.parentNode === grid) {
      grid.insertBefore(frag, loadMoreBtn);
    } else {
      grid.insertBefore(frag, gridSentinel);
    }
    renderedCount = end;
    if (renderedCount >= tracks.length) {
      if (listObserver) {
        listObserver.disconnect();
        listObserver = null;
      }
      ensureLoadMore();
    } else {
      setupListObserver();
    }
  }

  function mergeTracks(batch) {
    var seen = {};
    tracks.forEach(function (track) {
      seen[String(track.id)] = true;
    });
    batch.forEach(function (track) {
      if (!track || track.id == null || seen[String(track.id)]) return;
      seen[String(track.id)] = true;
      tracks.push(track);
    });
  }

  function renderGrid() {
    if (!grid) return;
    resetGridDom();
    if (empty) empty.hidden = tracks.length > 0 || loading;
    if (!tracks.length) return;
    setStatus(tracks.length.toLocaleString() + " tracks ready", !loading && tracks.length > 200);
    appendBatch();
    ensureLoadMore();
  }

  function debouncedSearch() {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(function () {
      var q = search && search.value ? search.value.trim() : "";
      if (q.length >= 1) fetchSearch(q, 0, false);
      else fetchFeed(false);
    }, 220);
  }

  function fetchFeed(append) {
    mode = "feed";
    searchQuery = "";
    searchOffset = 0;
    if (append) {
      loadingMore = true;
      if (loadMoreBtn) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.textContent = "Loading more…";
      }
    } else {
      feedPage = 0;
      loading = true;
      hasMore = false;
      setStatus("Loading tracks…", true);
      if (empty) empty.hidden = true;
    }
    fetch("/api/music/feed?page=" + encodeURIComponent(String(feedPage)))
      .then(function (res) {
        if (!res.ok) throw new Error("bad status");
        return res.json();
      })
      .then(function (payload) {
        var batch = Array.isArray(payload.data) ? payload.data : [];
        hasMore = !!payload.hasMore;
        if (append) {
          mergeTracks(batch);
          feedPage += 1;
          loadingMore = false;
          if (loadMoreBtn) {
            loadMoreBtn.disabled = false;
            loadMoreBtn.textContent = "Load more tracks";
          }
          if (!hasMore && loadMoreBtn) {
            loadMoreBtn.remove();
            loadMoreBtn = null;
          }
          appendBatch();
          ensureLoadMore();
          setStatus(tracks.length.toLocaleString() + " tracks ready", tracks.length > 200);
        } else {
          tracks = batch;
          feedPage = 1;
          loading = false;
          renderGrid();
          if (!tracks.length && empty) {
            empty.hidden = false;
            empty.textContent = "Could not load music.";
          }
        }
      })
      .catch(function () {
        loading = false;
        loadingMore = false;
        if (!append) {
          tracks = [];
          renderGrid();
          if (empty) {
            empty.hidden = false;
            empty.textContent = "Could not load music.";
          }
        } else if (loadMoreBtn) {
          loadMoreBtn.disabled = false;
          loadMoreBtn.textContent = "Load more tracks";
        }
      });
  }

  function fetchSearch(q, offset, append) {
    mode = "search";
    searchQuery = q;
    if (append) {
      loadingMore = true;
      if (loadMoreBtn) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.textContent = "Loading more…";
      }
    } else {
      loading = true;
      searchOffset = 0;
      hasMore = false;
      setStatus("Searching…", true);
      if (empty) empty.hidden = true;
    }
    fetch("/api/music/search?q=" + encodeURIComponent(q) + "&offset=" + encodeURIComponent(String(offset || 0)) + "&limit=100")
      .then(function (res) {
        if (!res.ok) throw new Error("bad status");
        return res.json();
      })
      .then(function (payload) {
        var batch = Array.isArray(payload.data) ? payload.data : [];
        hasMore = !!payload.hasMore;
        if (append) {
          mergeTracks(batch);
          searchOffset = offset + 100;
          loadingMore = false;
          if (loadMoreBtn) {
            loadMoreBtn.disabled = false;
            loadMoreBtn.textContent = "Load more tracks";
          }
          if (!hasMore && loadMoreBtn) {
            loadMoreBtn.remove();
            loadMoreBtn = null;
          }
          appendBatch();
          ensureLoadMore();
          setStatus(tracks.length.toLocaleString() + " tracks ready", tracks.length > 80);
        } else {
          tracks = batch;
          searchOffset = 100;
          loading = false;
          renderGrid();
          if (!tracks.length && empty) {
            empty.hidden = false;
            empty.textContent = "No tracks found. Try another search.";
          }
        }
      })
      .catch(function () {
        loading = false;
        loadingMore = false;
        if (!append) {
          tracks = [];
          renderGrid();
          if (empty) {
            empty.hidden = false;
            empty.textContent = "Search failed.";
          }
        } else if (loadMoreBtn) {
          loadMoreBtn.disabled = false;
          loadMoreBtn.textContent = "Load more tracks";
        }
      });
  }

  function playIndex(idx) {
    if (isNaN(idx) || !tracks[idx]) return;
    if (window.ZentraMusicPlayer) window.ZentraMusicPlayer.playTrack(tracks[idx], tracks, idx);
  }

  if (grid) {
    grid.addEventListener("click", function (e) {
      var card = e.target.closest(".music-card");
      if (!card) return;
      playIndex(parseInt(card.dataset.index, 10));
    });
    grid.addEventListener("keydown", function (e) {
      var card = e.target.closest(".music-card");
      if (!card) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        playIndex(parseInt(card.dataset.index, 10));
      }
    });
  }

  if (search) {
    search.addEventListener("input", debouncedSearch);
    search.addEventListener("search", debouncedSearch);
  }

  window.KritikalMusic = {
    render: function () {
      if (!tracks.length) fetchFeed(false);
      else renderGrid();
    },
    syncActive: function (id) {
      activeId = id;
      if (!grid) return;
      grid.querySelectorAll(".music-card").forEach(function (card) {
        card.classList.toggle("music-card--active", card.dataset.trackId === String(id));
      });
    }
  };
})();
