(function () {
  var SOURCES = [
    {
      id: "vidsrc-to",
      label: "VidSrc",
      movie: function (id) {
        return "https://vidsrc.to/embed/movie/" + id;
      },
      tv: function (id, s, e) {
        return "https://vidsrc.to/embed/tv/" + id + "/" + s + "/" + e;
      },
    },
    {
      id: "vidsrc-xyz",
      label: "VidSrc XYZ",
      movie: function (id) {
        return "https://vidsrc.xyz/embed/movie?tmdb=" + id;
      },
      tv: function (id, s, e) {
        return "https://vidsrc.xyz/embed/tv?tmdb=" + id + "&season=" + s + "&episode=" + e;
      },
    },
    {
      id: "vidsrc-cc",
      label: "VidSrc CC",
      movie: function (id) {
        return "https://vidsrc.cc/v2/embed/movie/" + id;
      },
      tv: function (id, s, e) {
        return "https://vidsrc.cc/v2/embed/tv/" + id + "/" + s + "/" + e;
      },
    },
    {
      id: "vidking",
      label: "VidKing",
      movie: function (id) {
        return "https://www.vidking.net/embed/movie/" + id + "?color=ffffff&autoPlay=true";
      },
      tv: function (id, s, e) {
        return (
          "https://www.vidking.net/embed/tv/" +
          id +
          "/" +
          s +
          "/" +
          e +
          "?color=ffffff&autoPlay=true&episodeSelector=true&nextEpisode=true"
        );
      },
    },
  ];
  var CATALOG = [];
  var catalogReady = false;
  var catalogPage = 1;
  var catalogHasMore = true;
  var catalogLoading = false;
  var catalogPrefetching = false;
  var catalogTotal = 0;
  var filteredMovies = [];
  var renderedCount = 0;
  var listObserver = null;
  var gridSentinel = null;
  var BATCH_SIZE = 48;
  var CATALOG_PAGE_SIZE = 250;
  var grid = document.getElementById("movies-grid");
  var rowsContainer = document.getElementById("movies-rows");
  var search = document.getElementById("movies-search");
  var empty = document.getElementById("movies-empty");
  var status = document.getElementById("movies-status");
  var player = document.getElementById("movies-player");
  var frame = document.getElementById("movies-player-frame");
  var playerTitle = document.getElementById("movies-player-title");
  var playerBack = document.getElementById("movies-player-back");
  var playerFs = document.getElementById("movies-player-fs");
  var playerControls = document.getElementById("movies-player-controls");
  var sourceSelect = document.getElementById("movies-source");
  var seasonSelect = document.getElementById("movies-season");
  var episodeSelect = document.getElementById("movies-episode");
  var seasonWrap = document.getElementById("movies-season-wrap");
  var episodeWrap = document.getElementById("movies-episode-wrap");
  var hero = document.querySelector("#ent-panel-movies .movies-hero");
  var heroTitle = document.querySelector("#ent-panel-movies .movies-hero__title");
  var heroMeta = document.getElementById("movies-hero-meta");
  var heroDesc = document.querySelector("#ent-panel-movies .movies-hero__desc");
  var heroPlay = document.getElementById("movies-hero-play");
  var heroInfo = document.getElementById("movies-hero-info");
  var moviesPanel = document.getElementById("ent-panel-movies");
  var nfProfileBtn = document.getElementById("nf-header-profile");
  var nfAvatarEl = document.getElementById("nf-header-avatar");
  var filterTimer = 0;
  var searchMode = false;
  var searchPage = 1;
  var searchLoading = false;
  var searchQuery = "";
  var searchHasMore = false;
  var activeMovie = null;
  var activeSeason = 1;
  var activeEpisode = 1;
  var activeSource = 0;
  var seasonMeta = [];
  var featuredMovie = null;
  var nfThumbSeq = 0;
  var WATCH_HISTORY_KEY = "kobran-ent-watch-history";
  var tvHydrating = false;

  function hasEntProfile() {
    return !!(window.KobranEntAccess && window.KobranEntAccess.hasProfile());
  }

  function requireEntProfile() {
    if (hasEntProfile()) return true;
    if (window.KobranEntAccess) window.KobranEntAccess.requireProfile();
    return false;
  }

  function isTvItem(movie) {
    return !!(movie && String(movie.type || "").toLowerCase() === "tv");
  }

  function tvRowItems() {
    var all = filteredMovies.filter(isTvItem);
    var withPoster = all.filter(function (movie) {
      return !!movie.poster;
    });
    var pool = withPoster.length >= 8 ? withPoster : all;
    return pool.slice(0, 24);
  }

  function readWatchHistory() {
    try {
      var raw = localStorage.getItem(WATCH_HISTORY_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function saveWatchHistory(list) {
    try {
      localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(list || []));
    } catch (e) {}
  }

  function addWatchHistory(movie) {
    if (!movie || movie.id == null) return;
    var key = movieKey(movie);
    var next = readWatchHistory().filter(function (row) {
      return row && row.key && row.key !== key;
    });
    next.unshift({
      key: key,
      at: Date.now(),
      movie: {
        id: movie.id,
        type: movie.type || "movie",
        title: movie.title || "",
        year: movie.year || "",
        poster: movie.poster || "",
        backdrop: movie.backdrop || "",
      },
    });
    saveWatchHistory(next.slice(0, 120));
  }

  function continueWatchingItems() {
    var history = readWatchHistory();
    if (!history.length) return [];
    var out = [];
    for (var i = 0; i < history.length; i++) {
      var row = history[i];
      if (!row || !row.key) continue;
      var movie = findMovieByKey(row.key) || row.movie || null;
      if (!movie || movie.id == null) continue;
      if (!movie.type) movie.type = "movie";
      out.push(movie);
      if (out.length >= 60) break;
    }
    return out;
  }

  function hydrateTvRowPosters(items) {
    if (tvHydrating || !Array.isArray(items) || !items.length) return;
    tvHydrating = true;
    var pool = items.slice(0, 42);
    Promise.all(
      pool.map(function (movie) {
        return fetch("/api/movies/lookup/" + encodeURIComponent(String(movie.id)))
          .then(function (res) {
            if (!res.ok) throw new Error("bad");
            return res.json();
          })
          .then(function (data) {
            if (!data || Number(data.id) !== Number(movie.id)) return false;
            var changed = false;
            if (data.poster && data.poster !== movie.poster) {
              movie.poster = data.poster;
              changed = true;
            }
            if (data.backdrop && data.backdrop !== movie.backdrop) {
              movie.backdrop = data.backdrop;
              changed = true;
            }
            if (data.title && data.title !== movie.title) movie.title = data.title;
            if (data.year && data.year !== movie.year) movie.year = data.year;
            return changed;
          })
          .catch(function () {
            return false;
          });
      })
    )
      .then(function (changedFlags) {
        if (changedFlags.some(Boolean) && rowsContainer && isStandaloneMovies()) renderRows();
      })
      .finally(function () {
        tvHydrating = false;
      });
  }

  function countTvInCatalog() {
    var n = 0;
    for (var i = 0; i < CATALOG.length; i++) {
      if (isTvItem(CATALOG[i])) n++;
    }
    return n;
  }

  function currentSource() {
    return SOURCES[activeSource] || SOURCES[0];
  }

  function embedUrl(movie, season, episode) {
    var id = encodeURIComponent(String(movie.id));
    var src = currentSource();
    if (movie.type === "tv") {
      return src.tv(id, season || 1, episode || 1);
    }
    return src.movie(id);
  }

  function fillSourceSelect() {
    if (!sourceSelect) return;
    sourceSelect.innerHTML = "";
    SOURCES.forEach(function (src, idx) {
      var opt = document.createElement("option");
      opt.value = String(idx);
      opt.textContent = src.label;
      if (idx === activeSource) opt.selected = true;
      sourceSelect.appendChild(opt);
    });
  }

  function fillSeasonSelect() {
    if (!seasonSelect) return;
    seasonSelect.innerHTML = "";
    var list = seasonMeta.length
      ? seasonMeta
      : [{ season: 1, episodes: 30 }];
    list.forEach(function (row) {
      var opt = document.createElement("option");
      opt.value = String(row.season);
      opt.textContent = "S" + row.season;
      if (row.season === activeSeason) opt.selected = true;
      seasonSelect.appendChild(opt);
    });
  }

  function episodesForSeason(season) {
    var found = seasonMeta.find(function (row) {
      return row.season === season;
    });
    return found && found.episodes ? found.episodes : 30;
  }

  function fillEpisodeSelect() {
    if (!episodeSelect) return;
    episodeSelect.innerHTML = "";
    var count = Math.max(1, episodesForSeason(activeSeason));
    if (activeEpisode > count) activeEpisode = 1;
    for (var i = 1; i <= count; i++) {
      var opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = "E" + i;
      if (i === activeEpisode) opt.selected = true;
      episodeSelect.appendChild(opt);
    }
  }

  function applyEmbed() {
    if (!frame || !activeMovie) return;
    frame.src = embedUrl(activeMovie, activeSeason, activeEpisode);
  }

  function loadTvMeta(movie) {
    seasonMeta = [];
    activeSeason = 1;
    activeEpisode = 1;
    fillSeasonSelect();
    fillEpisodeSelect();
    return fetch("/api/movies/tv/" + encodeURIComponent(String(movie.id)))
      .then(function (res) {
        if (!res.ok) throw new Error("bad");
        return res.json();
      })
      .then(function (payload) {
        var seasons = Array.isArray(payload.seasons) ? payload.seasons : [];
        if (seasons.length) {
          seasonMeta = seasons
            .map(function (row) {
              return {
                season: Number(row.season) || 1,
                episodes: Math.max(1, Number(row.episodes) || 1),
              };
            })
            .filter(function (row) {
              return row.season > 0;
            });
          if (!seasonMeta.length) seasonMeta = [{ season: 1, episodes: 30 }];
          activeSeason = seasonMeta[0].season;
          activeEpisode = 1;
          fillSeasonSelect();
          fillEpisodeSelect();
        }
      })
      .catch(function () {});
  }

  function playMovie(movie) {
    if (!player || !frame || !movie) return;
    if (!requireEntProfile()) return;
    addWatchHistory(movie);
    activeMovie = movie;
    activeSource = 0;
    activeSeason = 1;
    activeEpisode = 1;
    var title = movie.title || (movie.type === "tv" ? "TV Show" : "Movie") + " " + movie.id;
    if (playerTitle) playerTitle.textContent = title;
    fillSourceSelect();
    if (playerControls) playerControls.hidden = false;
    var isTv = movie.type === "tv";
    if (seasonWrap) seasonWrap.hidden = !isTv;
    if (episodeWrap) episodeWrap.hidden = !isTv;
    if (isTv) {
      fillSeasonSelect();
      fillEpisodeSelect();
      loadTvMeta(movie);
    }
    player.hidden = false;
    applyEmbed();
    player.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function closePlayer() {
    if (!player || !frame) return;
    player.hidden = true;
    frame.src = "about:blank";
    activeMovie = null;
    if (playerControls) playerControls.hidden = true;
  }

  function findCatalogType(id) {
    var hit = CATALOG.find(function (item) {
      return Number(item.id) === id;
    });
    if (hit && hit.type) return hit.type;
    var fromFiltered = filteredMovies.find(function (item) {
      return Number(item.id) === id;
    });
    if (fromFiltered && fromFiltered.type) return fromFiltered.type;
    return "";
  }

  function playById(raw) {
    var id = parseInt(String(raw || "").trim(), 10);
    if (!id || id < 1) return;
    var type = findCatalogType(id) || "movie";
    fetch("/api/movies/lookup/" + encodeURIComponent(String(id)))
      .then(function (res) {
        if (!res.ok) throw new Error("bad");
        return res.json();
      })
      .then(function (item) {
        if (item && item.id) playMovie(item);
        else playMovie({ id: id, title: "TMDB #" + id, type: type });
      })
      .catch(function () {
        playMovie({ id: id, title: "TMDB #" + id, type: type });
      });
  }

  if (sourceSelect) {
    sourceSelect.addEventListener("change", function () {
      activeSource = parseInt(sourceSelect.value, 10) || 0;
      applyEmbed();
    });
  }
  if (seasonSelect) {
    seasonSelect.addEventListener("change", function () {
      activeSeason = parseInt(seasonSelect.value, 10) || 1;
      fillEpisodeSelect();
      applyEmbed();
    });
  }
  if (episodeSelect) {
    episodeSelect.addEventListener("change", function () {
      activeEpisode = parseInt(episodeSelect.value, 10) || 1;
      applyEmbed();
    });
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

  function updateStatus() {
    setStatus("", false);
  }

  function featuredBackdrop(movie) {
    if (!movie) return "";
    if (movie.backdrop) return "https://image.tmdb.org/t/p/w1280/" + String(movie.backdrop).replace(/^\/+/, "");
    if (movie.poster) return "https://image.tmdb.org/t/p/w1280/" + String(movie.poster).replace(/^\/+/, "");
    return "";
  }

  function formatRuntime(minutes) {
    var mins = parseInt(minutes, 10) || 0;
    if (mins < 1) return "";
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    if (h && m) return h + "h " + m + "m";
    if (h) return h + "h";
    return m + "m";
  }

  function trimOverview(text, max) {
    var raw = String(text || "").replace(/\s+/g, " ").trim();
    if (!raw) return "";
    if (raw.length <= max) return raw;
    return raw.slice(0, max).replace(/\s+\S*$/, "") + "…";
  }

  function isStandaloneMovies() {
    if (document.body.classList.contains("ent-standalone-movies")) return true;
    try {
      return (window.location.hash || "").toLowerCase() === "#movies";
    } catch (e) {
      return false;
    }
  }

  function movieKey(movie) {
    return String(movie.type || "movie") + ":" + movie.id;
  }

  function findMovieByKey(key) {
    if (!key) return null;
    var hit = filteredMovies.find(function (movie) {
      return movieKey(movie) === key;
    });
    if (hit) return hit;
    return (
      CATALOG.find(function (movie) {
        return movieKey(movie) === key;
      }) || null
    );
  }

  function featuredMeta(movie) {
    if (!movie) return "";
    var parts = [];
    parts.push(movie.type === "tv" ? "Series" : "Movie");
    if (movie.year) parts.push(String(movie.year));
    var runtime = formatRuntime(movie.runtime);
    if (runtime) parts.push(runtime);
    parts.push(movie.type === "tv" ? "TV-MA" : "TV-14");
    return parts.join(" • ");
  }
  function featuredSummary(movie) {
    if (!movie) return "";
    if (movie.overview) return trimOverview(movie.overview, 220);
    var kind = movie.type === "tv" ? "series" : "movie";
    return "Stream this " + kind + " instantly on Kobran.";
  }

  function userInitials(name) {
    var raw = String(name || "?").trim();
    if (!raw) return "?";
    var parts = raw.split(/\s+/);
    if (parts.length >= 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    return raw.charAt(0).toUpperCase();
  }

  function syncMoviesBackdrop(url) {
    if (!moviesPanel || !url) return;
    moviesPanel.style.setProperty("--nf-backdrop", "url('" + String(url).replace(/'/g, "%27") + "')");
  }

  function syncNfHeaderAccount() {
    if (!nfProfileBtn) return;
    var authed = window.KobranAuth && window.KobranAuth.isLoggedIn && window.KobranAuth.isLoggedIn();
    nfProfileBtn.hidden = !authed;
    if (!authed || !nfAvatarEl) return;
    var user = window.KobranAuth.user ? window.KobranAuth.user() : null;
    if (!user) {
      nfProfileBtn.hidden = true;
      return;
    }
    nfAvatarEl.textContent = "";
    nfAvatarEl.classList.remove("nf-header__avatar--img");
    if (user.avatar) {
      var img = document.createElement("img");
      img.className = "nf-header__avatar-img";
      img.alt = "";
      img.src = user.avatar;
      nfAvatarEl.appendChild(img);
      nfAvatarEl.classList.add("nf-header__avatar--img");
      return;
    }
    nfAvatarEl.textContent = userInitials(user.displayName || user.username);
  }

  function chooseFeatured(list) {
    if (!Array.isArray(list) || !list.length) return null;
    var withPoster = list.filter(function (movie) {
      return movie && movie.poster;
    });
    var pool = (withPoster.length ? withPoster : list).slice(0, Math.min(100, withPoster.length || list.length));
    if (!pool.length) return list[0] || null;
    var recent = pool.filter(function (movie) {
      var year = parseInt(movie.year, 10) || 0;
      return year >= 2016;
    });
    var pickFrom = recent.length >= 8 ? recent : pool;
    return pickFrom[Math.floor(Math.random() * pickFrom.length)] || pool[0] || null;
  }

  function applyFeatured(movie) {
    if (!movie) return;
    featuredMovie = movie;
    if (heroTitle) heroTitle.textContent = String(movie.title || "Featured");
    if (heroMeta) heroMeta.textContent = featuredMeta(movie);
    if (heroDesc) heroDesc.textContent = featuredSummary(movie);
    if (hero) {
      var bg = featuredBackdrop(movie);
      hero.style.backgroundImage = bg
        ? "linear-gradient(90deg, rgba(12,0,2,.94) 0%, rgba(12,0,2,.5) 48%, rgba(12,0,2,.1) 100%)," +
          "linear-gradient(180deg, rgba(229,9,20,.12) 0%, rgba(0,0,0,.78) 100%)," +
          "url('" + bg.replace(/'/g, "%27") + "')"
        : "";
      hero.style.backgroundSize = "cover, cover, cover";
      hero.style.backgroundPosition = "center, center, center 22%";
      if (bg) syncMoviesBackdrop(bg);
    }
  }

  function enrichFeatured(movie) {
    if (!movie || movie.id == null) return;
    fetch("/api/movies/lookup/" + encodeURIComponent(String(movie.id)))
      .then(function (res) {
        if (!res.ok) throw new Error("bad");
        return res.json();
      })
      .then(function (data) {
        if (!data || Number(data.id) !== Number(movie.id)) return;
        if (data.title) movie.title = data.title;
        if (data.year) movie.year = data.year;
        if (data.poster) movie.poster = data.poster;
        if (data.backdrop) movie.backdrop = data.backdrop;
        if (data.overview) movie.overview = data.overview;
        if (data.runtime) movie.runtime = data.runtime;
        if (data.type) movie.type = data.type;
        applyFeatured(movie);
      })
      .catch(function () {});
  }

  function setFeatured(movie) {
    if (!movie) return;
    applyFeatured(movie);
    enrichFeatured(movie);
  }

  function posterSources(movie, hiRes) {
    if (!movie || movie.id == null) return { primary: "", fallback: "" };
    var type = movie.type === "tv" ? "tv" : "movie";
    var proxy = "/api/movies/poster/" + type + "/" + encodeURIComponent(String(movie.id));
    var posterPath = movie.poster ? String(movie.poster).replace(/^\/+/, "") : "";
    var backdropPath = movie.backdrop ? String(movie.backdrop).replace(/^\/+/, "") : "";
    if (hiRes && backdropPath) {
      return {
        primary: "https://image.tmdb.org/t/p/w780/" + backdropPath,
        fallback: posterPath ? "https://image.tmdb.org/t/p/w500/" + posterPath : proxy,
      };
    }
    if (posterPath) {
      return {
        primary: "https://image.tmdb.org/t/p/" + (hiRes ? "w500" : "w185") + "/" + posterPath,
        fallback: proxy,
      };
    }
    return { primary: proxy, fallback: "" };
  }

  function resetRowsDom() {
    if (rowsContainer) rowsContainer.innerHTML = "";
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
    resetRowsDom();
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
        if (renderedCount < filteredMovies.length) {
          appendBatch();
          return;
        }
        if (!searchMode && catalogHasMore && !catalogLoading) {
          loadCatalogPage(true);
        }
      },
      { rootMargin: "1600px 0px" }
    );
    listObserver.observe(gridSentinel);
  }

  function createCard(movie, index, options) {
    options = options || {};
    var standalone = isStandaloneMovies();
    var locked = standalone && !hasEntProfile();
    var card = document.createElement("article");
    card.className = standalone ? "nf-card movies-card" : "movies-card site__card site__card--ready";
    if (locked) card.classList.add("nf-card--locked");
    card.role = "listitem";
    card.tabIndex = 0;
    card.dataset.index = String(index);
    card.dataset.movieKey = movieKey(movie);
    card.style.setProperty("--i", String(index % 24));
    var thumb = document.createElement("div");
    thumb.className = "site__card-thumb movies-card__thumb nf-card__thumb";
    if (options.portrait) thumb.classList.add("nf-card__thumb--portrait");
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
    var sources = posterSources(movie, standalone);
    var thumbIndex = nfThumbSeq++;
    if (window.KobranEntThumb && sources.primary) {
      window.KobranEntThumb.bindCover(
        thumb,
        thumbIndex,
        sources.primary,
        sources.fallback,
        standalone
          ? {
              width: options.portrait ? 300 : 380,
              height: options.portrait ? 450 : 214,
              sizes: options.portrait ? "188px" : "188px",
              eager: true,
            }
          : null
      );
    }
    if (options.progress) {
      var progress = document.createElement("div");
      progress.className = "nf-card__progress";
      var fill = document.createElement("span");
      fill.style.width = String(18 + (hueFromId(movie.id) % 62)) + "%";
      progress.appendChild(fill);
      thumb.appendChild(progress);
    }
    if (options.recent) {
      var recent = document.createElement("span");
      recent.className = "nf-card__recent";
      recent.textContent = "Recently Added";
      thumb.appendChild(recent);
    }
    if (options.top10 && index % 3 === 0) {
      var top = document.createElement("span");
      top.className = "nf-card__top10";
      top.textContent = "TOP 10";
      thumb.appendChild(top);
    }
    if (standalone) {
      if (!locked) {
        var playOverlay = document.createElement("button");
        playOverlay.type = "button";
        playOverlay.className = "nf-card__play";
        playOverlay.setAttribute("aria-label", "Play " + (movie.title || "title"));
        playOverlay.innerHTML =
          '<span class="nf-card__play-ring" aria-hidden="true"><span class="nf-card__play-icon"><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5.5v13l10-6.5z"></path></svg></span></span>';
        playOverlay.addEventListener("click", function (e) {
          e.stopPropagation();
          playMovie(movie);
        });
        thumb.appendChild(playOverlay);
      }
      card.appendChild(thumb);
      return card;
    }
    var play = document.createElement("span");
    play.className = "site__card-play";
    play.setAttribute("aria-hidden", "true");
    play.innerHTML =
      '<span class="site__card-play-btn"><span class="site__card-play-arrow" aria-hidden="true"></span><span class="site__card-play-label">Watch</span></span>';
    var foot = document.createElement("div");
    foot.className = "site__card-foot";
    var title = document.createElement("h3");
    title.className = "site__card-title";
    title.textContent = movie.title;
    var meta = document.createElement("p");
    meta.className = "movies-card__meta";
    var kindLegacy = movie.type === "tv" ? "TV" : "Movie";
    meta.textContent = (movie.year ? movie.year + " · " : "") + kindLegacy + " · " + movie.id;
    foot.append(title, meta);
    thumb.appendChild(play);
    card.append(thumb, foot);
    return card;
  }

  function buildRow(title, items, options) {
    if (!items.length) return null;
    options = options || {};
    var section = document.createElement("section");
    section.className = "nf-row";
    var head = document.createElement("div");
    head.className = "nf-row__head";
    var heading = document.createElement("h4");
    heading.className = "nf-row__title";
    heading.textContent = title;
    head.appendChild(heading);
    var track = document.createElement("div");
    track.className = "nf-row__track movies-grid";
    track.setAttribute("role", "list");
    items.forEach(function (movie, idx) {
      track.appendChild(
        createCard(movie, idx, {
          portrait: !!options.portrait,
          progress: !!options.progress,
          recent: !!options.recent,
          top10: !!options.top10,
        })
      );
    });
    section.append(head, track);
    return section;
  }

  function buildContinueEmptyRow() {
    var section = document.createElement("section");
    section.className = "nf-row";
    var head = document.createElement("div");
    head.className = "nf-row__head";
    var heading = document.createElement("h4");
    heading.className = "nf-row__title";
    heading.textContent = "Continue Watching";
    head.appendChild(heading);
    var body = document.createElement("div");
    body.className = "nf-row__empty";
    body.textContent = "Nothing yet. Watch something";
    section.append(head, body);
    return section;
  }

  function renderRows() {
    if (!rowsContainer) return;
    rowsContainer.innerHTML = "";
    nfThumbSeq = 0;
    if (empty) empty.hidden = filteredMovies.length > 0 || searchLoading || catalogLoading;
    if (!filteredMovies.length) {
      setStatus(catalogLoading ? "Loading titles…" : "", catalogLoading);
      return;
    }
    if (!featuredMovie || filteredMovies.indexOf(featuredMovie) === -1) {
      setFeatured(chooseFeatured(filteredMovies));
    }
    updateStatus();
    var continueItems = continueWatchingItems();
    var tvItems = tvRowItems().slice(0, 96);
    hydrateTvRowPosters(tvItems);
    var rows = searchMode
      ? [buildRow("Search Results", filteredMovies)]
      : [
          continueItems.length ? buildRow("Continue Watching", continueItems, { progress: true }) : buildContinueEmptyRow(),
          buildRow("Today's Top Picks for You", filteredMovies.slice(48, 120), { recent: true, top10: true }),
          buildRow("TV Dramas", tvItems, { portrait: true }),
          buildRow(
            "Popular Movies",
            filteredMovies.filter(function (movie) {
              return movie.type !== "tv";
            }).slice(0, 120)
          ),
        ];
    rows.forEach(function (row) {
      if (row) rowsContainer.appendChild(row);
    });
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
    setupListObserver();
  }

  function renderGrid() {
    if (isStandaloneMovies() && rowsContainer) {
      resetGridDom();
      renderRows();
      return;
    }
    if (!grid) return;
    resetGridDom();
    if (empty) empty.hidden = filteredMovies.length > 0 || searchLoading || catalogLoading;
    if (!filteredMovies.length) {
      setStatus(catalogLoading ? "Loading titles…" : "", catalogLoading);
      return;
    }
    if (!featuredMovie || filteredMovies.indexOf(featuredMovie) === -1) {
      setFeatured(chooseFeatured(filteredMovies));
    }
    updateStatus();
    if (searchMode) renderAllBatches();
    else appendBatch();
  }

  function syncAfterCatalogLoad(append) {
    if (searchQueryText()) return;
    filteredMovies = CATALOG.slice();
    updateStatus();
    if (isStandaloneMovies() && rowsContainer) {
      renderRows();
      if (countTvInCatalog() < 12 && catalogHasMore && !catalogLoading) {
        loadCatalogPage(true);
      }
      prefetchCatalog();
      return;
    }
    if (!append || renderedCount === 0) {
      renderGrid();
    } else if (renderedCount < filteredMovies.length) {
      appendBatch();
    } else {
      setupListObserver();
    }
    prefetchCatalog();
  }

  function prefetchCatalog() {
    if (catalogPrefetching || !catalogHasMore || catalogLoading || searchQueryText()) return;
    catalogPrefetching = true;
    function step() {
      if (!catalogHasMore || catalogLoading || searchQueryText()) {
        catalogPrefetching = false;
        return;
      }
      loadCatalogPage(true).then(function () {
        if (catalogHasMore) {
          setTimeout(step, 80);
        } else {
          catalogPrefetching = false;
        }
      });
    }
    step();
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

  function mergeCatalog(batch) {
    var seen = {};
    CATALOG.forEach(function (movie) {
      seen[String(movie.type || "movie") + ":" + movie.id] = true;
    });
    batch.forEach(function (movie) {
      if (!movie || movie.id == null) return;
      var key = String(movie.type || "movie") + ":" + movie.id;
      if (seen[key]) return;
      seen[key] = true;
      CATALOG.push(movie);
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
        prefetchCatalog();
        return;
      }
      fetchSearchPage(q, 1, false);
    }, 180);
  }

  function loadCatalogPage(append) {
    if (catalogLoading) return Promise.resolve();
    if (!append) {
      catalogPage = 1;
      catalogHasMore = true;
      CATALOG = [];
      catalogReady = false;
      filteredMovies = [];
      resetGridDom();
      setStatus("Loading titles…", true);
    }
    if (!catalogHasMore) return Promise.resolve();
    catalogLoading = true;
    return fetch(
      "/api/movies/catalog?page=" + encodeURIComponent(String(catalogPage)) + "&limit=" + encodeURIComponent(String(CATALOG_PAGE_SIZE))
    )
      .then(function (res) {
        if (!res.ok) throw new Error("bad status");
        return res.json();
      })
      .then(function (payload) {
        var batch = Array.isArray(payload.data) ? payload.data : Array.isArray(payload) ? payload : [];
        catalogHasMore = payload.hasMore != null ? !!payload.hasMore : false;
        catalogTotal = payload.total || CATALOG.length + batch.length;
        mergeCatalog(batch);
        catalogPage += 1;
        catalogReady = true;
        catalogLoading = false;
        syncAfterCatalogLoad(append);
      })
      .catch(function () {
        catalogLoading = false;
        if (!CATALOG.length) {
          return fetch("movies-catalog.json")
            .then(function (res) {
              if (!res.ok) throw new Error("bad status");
              return res.json();
            })
            .then(function (data) {
              CATALOG = Array.isArray(data) ? data : [];
              catalogReady = true;
              catalogHasMore = false;
              catalogTotal = CATALOG.length;
              syncAfterCatalogLoad(false);
            });
        }
      })
      .catch(function () {
        if (empty) {
          empty.hidden = false;
          empty.textContent = "Movie catalog failed to load.";
        }
      });
  }

  function loadCatalog() {
    if (catalogReady && CATALOG.length && !searchQueryText()) {
      filteredMovies = CATALOG.slice();
      renderGrid();
      prefetchCatalog();
      return Promise.resolve();
    }
    return loadCatalogPage(false);
  }

  function handleCardActivate(card) {
    if (!card) return;
    if (card.classList.contains("nf-card--locked")) {
      requireEntProfile();
      return;
    }
    var key = card.dataset.movieKey;
    var movie = key ? findMovieByKey(key) : null;
    if (!movie) {
      var idx = parseInt(card.dataset.index, 10);
      if (!isNaN(idx) && filteredMovies[idx]) movie = filteredMovies[idx];
    }
    if (movie) playMovie(movie);
  }

  function bindCardEvents(container) {
    if (!container) return;
    container.addEventListener("click", function (e) {
      var card = e.target.closest(".movies-card");
      if (!card) return;
      handleCardActivate(card);
    });
    container.addEventListener("keydown", function (e) {
      var card = e.target.closest(".movies-card");
      if (!card) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleCardActivate(card);
      }
    });
  }

  bindCardEvents(grid);
  bindCardEvents(rowsContainer);

  if (nfProfileBtn) {
    nfProfileBtn.addEventListener("click", function () {
      if (!window.KobranAuth || !window.KobranAuth.isLoggedIn || !window.KobranAuth.isLoggedIn()) return;
      window.location.hash = "#profile";
    });
  }

  window.addEventListener("kobran-auth", function () {
    syncNfHeaderAccount();
    if (rowsContainer && isStandaloneMovies() && filteredMovies.length) renderRows();
  });
  if (window.KobranAuth && window.KobranAuth.whenReady) {
    window.KobranAuth.whenReady().then(syncNfHeaderAccount).catch(function () {
      syncNfHeaderAccount();
    });
  } else {
    syncNfHeaderAccount();
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

  if (heroPlay) {
    heroPlay.addEventListener("click", function () {
      if (!requireEntProfile()) return;
      if (featuredMovie) playMovie(featuredMovie);
    });
  }
  if (heroInfo) {
    heroInfo.addEventListener("click", function () {
      var target = rowsContainer || grid;
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  window.KobranMovies = {
    render: function () {
      syncNfHeaderAccount();
      setFeatured(chooseFeatured(CATALOG.length ? CATALOG : filteredMovies));
      loadCatalog();
      if (rowsContainer && isStandaloneMovies()) renderRows();
    },
    play: playMovie,
    close: closePlayer,
  };

  loadCatalog();
})();
