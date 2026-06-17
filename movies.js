(function () {
  var VIDKING_MOVIE = "https://www.vidking.net/embed/movie/";
  var VIDKING_TV = "https://www.vidking.net/embed/tv/";
  var CATALOG = [];
  var catalogReady = false;
  var filteredMovies = [];
  var renderedCount = 0;
  var listObserver = null;
  var gridSentinel = null;
  var BATCH_SIZE = 96;
  var grid = document.getElementById("movies-grid");
  var search = document.getElementById("movies-search");
  var empty = document.getElementById("movies-empty");
  var status = document.getElementById("movies-status");
  var player = document.getElementById("movies-player");
  var frame = document.getElementById("movies-player-frame");
  var playerTitle = document.getElementById("movies-player-title");
  var playerBack = document.getElementById("movies-player-back");
  var playerFs = document.getElementById("movies-player-fs");
  var filterTimer = 0;
  var searchMode = false;
  var searchPage = 1;
  var searchLoading = false;
  var searchQuery = "";
  var searchHasMore = false;

  function embedUrl(movie) {
    var id = encodeURIComponent(String(movie.id));
    var qs = "?color=ffffff&autoPlay=true";
    if (movie.type === "tv") {
      return VIDKING_TV + id + "/1/1" + qs + "&episodeSelector=true&nextEpisode=true";
    }
    return VIDKING_MOVIE + id + qs;
  }

  function playMovie(movie) {
    if (!player || !frame || !movie) return;
    var title = movie.title || (movie.type === "tv" ? "TV Show" : "Movie") + " " + movie.id;
    if (playerTitle) playerTitle.textContent = title;
    player.hidden = false;
    frame.src = embedUrl(movie);
    player.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function closePlayer() {
    if (!player || !frame) return;
    player.hidden = true;
    frame.src = "about:blank";
  }

  function playById(raw) {
    var id = parseInt(String(raw || "").trim(), 10);
    if (!id || id < 1) return;
    playMovie({ id: id, title: "TMDB #" + id, type: "movie" });
  }

  function hueFromId(id) {
    var s = String(id);
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h % 360;
  }

  function searchQueryText() {
    return search && search.value ? search.value.trim() : "";
  }

  function isTmdbQuery(q) {
    return /^\d+$/.test(q);
  }

  function setStatus(text, show) {
    if (!status) return;
    status.hidden = !show;
    status.textContent = text || "";
  }

  function posterUrl(movie) {
    if (!movie.poster) return "";
    return "https://image.tmdb.org/t/p/w185/" + String(movie.poster).replace(/^\/+/, "");
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

  function renderAllBatches() {
    while (renderedCount < filteredMovies.length) {
      appendBatch();
    }
  }

  function setupListObserver() {
    if (listObserver || !gridSentinel || renderedCount >= filteredMovies.length) return;
    listObserver = new IntersectionObserver(
      function (entries) {
        if (entries.some(function (entry) {
          return entry.isIntersecting;
        })) {
          appendBatch();
        }
      },
      { rootMargin: "900px 0px" }
    );
    listObserver.observe(gridSentinel);
  }

  function createCard(movie, index) {
    var card = document.createElement("article");
    card.className = "movies-card site__card site__card--ready";
    card.role = "listitem";
    card.tabIndex = 0;
    card.dataset.index = String(index);
    card.style.setProperty("--i", String(index % 24));
    var thumb = document.createElement("div");
    thumb.className = "site__card-thumb movies-card__thumb";
    thumb.style.setProperty("--hue", String(hueFromId(movie.id)));
    var initial = document.createElement("span");
    initial.className = "movies-card__initial";
    initial.textContent = (movie.title || "?").charAt(0).toUpperCase();
    thumb.appendChild(initial);
    if (movie.type === "tv") {
      var badge = document.createElement("span");
      badge.className = "movies-card__badge";
      badge.textContent = "TV";
      thumb.appendChild(badge);
    }
    var src = posterUrl(movie);
    if (src) {
      var img = document.createElement("img");
      img.className = "site__card-img";
      img.alt = "";
      img.loading = index < 32 ? "eager" : "lazy";
      img.decoding = "async";
      if (index < 16) img.fetchPriority = "high";
      img.src = src;
      img.addEventListener("error", function () {
        img.remove();
        thumb.classList.remove("site__card-thumb--has-img");
      });
      img.addEventListener("load", function () {
        thumb.classList.add("site__card-thumb--has-img");
        if (initial.parentNode) initial.remove();
      });
      thumb.classList.add("site__card-thumb--has-img");
      thumb.appendChild(img);
    }
    var play = document.createElement("span");
    play.className = "site__card-play";
    play.setAttribute("aria-hidden", "true");
    play.innerHTML = '<span class="site__card-play-btn"><span class="site__card-play-arrow" aria-hidden="true"></span><span class="site__card-play-label">Watch</span></span>';
    var foot = document.createElement("div");
    foot.className = "site__card-foot";
    var title = document.createElement("h3");
    title.className = "site__card-title";
    title.textContent = movie.title;
    var meta = document.createElement("p");
    meta.className = "movies-card__meta";
    var kind = movie.type === "tv" ? "TV" : "Movie";
    meta.textContent = (movie.year ? movie.year + " · " : "") + kind + " · " + movie.id;
    foot.append(title, meta);
    thumb.appendChild(play);
    card.append(thumb, foot);
    return card;
  }

  function appendBatch() {
    if (!grid || renderedCount >= filteredMovies.length) return;
    var end = Math.min(renderedCount + BATCH_SIZE, filteredMovies.length);
    var frag = document.createDocumentFragment();
    for (var i = renderedCount; i < end; i++) {
      frag.appendChild(createCard(filteredMovies[i], i));
    }
    ensureSentinel();
    grid.insertBefore(frag, gridSentinel);
    renderedCount = end;
    if (renderedCount >= filteredMovies.length) {
      if (listObserver) {
        listObserver.disconnect();
        listObserver = null;
      }
    } else {
      setupListObserver();
    }
  }

  function renderGrid() {
    if (!grid) return;
    resetGridDom();
    if (empty) empty.hidden = filteredMovies.length > 0 || searchLoading;
    if (!filteredMovies.length) {
      setStatus("", false);
      return;
    }
    setStatus(filteredMovies.length.toLocaleString() + " titles ready", filteredMovies.length > 48);
    if (searchMode) renderAllBatches();
    else appendBatch();
  }

  function mergeResults(batch) {
    var seen = {};
    filteredMovies.forEach(function (movie) {
      seen[String(movie.type || "movie") + ":" + movie.id] = true;
    });
    batch.forEach(function (movie) {
      if (!movie || movie.id == null) return;
      var key = String(movie.type || "movie") + ":" + movie.id;
      if (seen[key]) return;
      seen[key] = true;
      filteredMovies.push(movie);
    });
  }

  function filterLocal(q) {
    var needle = q.toLowerCase();
    if (isTmdbQuery(q)) {
      var id = parseInt(q, 10);
      var hit = CATALOG.filter(function (movie) {
        return movie.id === id;
      });
      if (hit.length) return hit;
      return [{ id: id, title: "TMDB #" + id, year: "", poster: "", type: "movie" }];
    }
    return CATALOG.filter(function (movie) {
      return (
        movie.title.toLowerCase().indexOf(needle) !== -1 ||
        String(movie.id).indexOf(needle) !== -1 ||
        String(movie.year).indexOf(needle) !== -1
      );
    });
  }

  function fetchSearchPage(q, page, append) {
    if (!append) {
      searchLoading = true;
      searchMode = true;
      searchQuery = q;
      searchPage = 1;
      filteredMovies = [];
      setStatus("Searching…", true);
      if (empty) empty.hidden = true;
      resetGridDom();
    }
    fetch("/api/movies/search?q=" + encodeURIComponent(q) + "&page=" + encodeURIComponent(String(page)))
      .then(function (res) {
        if (!res.ok) throw new Error("bad status");
        return res.json();
      })
      .then(function (payload) {
        var batch = Array.isArray(payload.data) ? payload.data : [];
        mergeResults(batch);
        searchHasMore = !!payload.hasMore;
        searchPage = page;
        if (searchHasMore && page < 40) {
          fetchSearchPage(q, page + 1, true);
          return;
        }
        searchLoading = false;
        renderGrid();
        if (!filteredMovies.length && empty) {
          empty.hidden = false;
          empty.textContent = "No movies or TV shows found. Try another search.";
        }
      })
      .catch(function () {
        if (!append) {
          filteredMovies = filterLocal(q);
          searchLoading = false;
          renderGrid();
          if (!filteredMovies.length && empty) {
            empty.hidden = false;
            empty.textContent = "Search failed.";
          }
        } else {
          searchLoading = false;
          renderGrid();
        }
      });
  }

  function debouncedRender() {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(function () {
      var q = searchQueryText();
      if (!q) {
        searchMode = false;
        filteredMovies = CATALOG.slice();
        renderGrid();
        return;
      }
      fetchSearchPage(q, 1, false);
    }, 180);
  }

  function loadCatalog() {
    if (catalogReady && CATALOG.length) {
      if (!searchQueryText()) {
        filteredMovies = CATALOG.slice();
        renderGrid();
      }
      return Promise.resolve();
    }
    return fetch("/api/movies/catalog")
      .then(function (res) {
        if (!res.ok) throw new Error("bad status");
        return res.json();
      })
      .catch(function () {
        return fetch("movies-catalog.json").then(function (res) {
          if (!res.ok) throw new Error("bad status");
          return res.json();
        });
      })
      .then(function (data) {
        CATALOG = Array.isArray(data) ? data : [];
        catalogReady = true;
        if (!searchQueryText()) {
          filteredMovies = CATALOG.slice();
          renderGrid();
        }
      })
      .catch(function () {
        if (empty) {
          empty.hidden = false;
          empty.textContent = "Movie catalog failed to load.";
        }
      });
  }

  if (grid) {
    grid.addEventListener("click", function (e) {
      var card = e.target.closest(".movies-card");
      if (!card) return;
      var idx = parseInt(card.dataset.index, 10);
      if (!isNaN(idx) && filteredMovies[idx]) playMovie(filteredMovies[idx]);
    });
    grid.addEventListener("keydown", function (e) {
      var card = e.target.closest(".movies-card");
      if (!card) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        var idx = parseInt(card.dataset.index, 10);
        if (!isNaN(idx) && filteredMovies[idx]) playMovie(filteredMovies[idx]);
      }
    });
  }

  if (search) {
    search.addEventListener("input", debouncedRender);
    search.addEventListener("search", debouncedRender);
    search.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      var q = searchQueryText();
      if (isTmdbQuery(q)) {
        e.preventDefault();
        playById(q);
      }
    });
  }

  if (playerBack) playerBack.addEventListener("click", closePlayer);

  if (playerFs) {
    playerFs.addEventListener("click", function () {
      var wrap = document.querySelector(".movies-player__frame-wrap");
      var el = wrap || frame;
      if (!el) return;
      if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen();
      else if (document.exitFullscreen) document.exitFullscreen();
    });
  }

  window.KritikalMovies = {
    render: function () {
      loadCatalog();
    },
    play: playMovie,
    close: closePlayer
  };

  loadCatalog();
})();
