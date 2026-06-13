(function () {
  var VIDKING = "https://www.vidking.net/embed/movie/";
  var CATALOG = [];
  var catalogReady = false;
  var grid = document.getElementById("movies-grid");
  var search = document.getElementById("movies-search");
  var empty = document.getElementById("movies-empty");
  var player = document.getElementById("movies-player");
  var frame = document.getElementById("movies-player-frame");
  var playerTitle = document.getElementById("movies-player-title");
  var playerBack = document.getElementById("movies-player-back");
  var playerFs = document.getElementById("movies-player-fs");
  var filterTimer = 0;

  function embedUrl(id) {
    return VIDKING + encodeURIComponent(String(id)) + "?color=ffffff&autoPlay=true";
  }

  function playMovie(movie) {
    if (!player || !frame || !movie) return;
    var title = movie.title || "Movie " + movie.id;
    if (playerTitle) playerTitle.textContent = title;
    player.hidden = false;
    frame.src = embedUrl(movie.id);
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
    playMovie({ id: id, title: "TMDB #" + id });
  }

  function hueFromId(id) {
    var s = String(id);
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h % 360;
  }

  function searchQuery() {
    return search && search.value ? search.value.trim() : "";
  }

  function isTmdbQuery(q) {
    return /^\d+$/.test(q);
  }

  function filteredList() {
    var q = searchQuery().toLowerCase();
    if (!q) return CATALOG.slice();
    if (isTmdbQuery(q)) {
      var id = parseInt(q, 10);
      var hit = CATALOG.filter(function (movie) {
        return movie.id === id;
      });
      if (hit.length) return hit;
      return [{ id: id, title: "TMDB #" + id, year: "", poster: "" }];
    }
    return CATALOG.filter(function (movie) {
      return (
        movie.title.toLowerCase().indexOf(q) !== -1 ||
        String(movie.id).indexOf(q) !== -1 ||
        String(movie.year).indexOf(q) !== -1
      );
    });
  }

  function posterUrl(movie) {
    if (!movie.poster) return "";
    return "https://image.tmdb.org/t/p/w342/" + String(movie.poster).replace(/^\/+/, "");
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
    var src = posterUrl(movie);
    if (src) {
      var img = document.createElement("img");
      img.className = "site__card-img";
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
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
    meta.textContent = (movie.year ? movie.year + " · " : "") + "TMDB " + movie.id;
    foot.append(title, meta);
    thumb.appendChild(play);
    card.append(thumb, foot);
    return card;
  }

  function renderGrid() {
    if (!grid) return;
    var list = filteredList();
    grid.innerHTML = "";
    if (empty) empty.hidden = list.length > 0;
    list.forEach(function (movie, index) {
      grid.appendChild(createCard(movie, index));
    });
  }

  function debouncedRender() {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(renderGrid, 120);
  }

  function loadCatalog() {
    if (catalogReady && CATALOG.length) {
      renderGrid();
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
        renderGrid();
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
      var list = filteredList();
      if (!isNaN(idx) && list[idx]) playMovie(list[idx]);
    });
    grid.addEventListener("keydown", function (e) {
      var card = e.target.closest(".movies-card");
      if (!card) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        var idx = parseInt(card.dataset.index, 10);
        var list = filteredList();
        if (!isNaN(idx) && list[idx]) playMovie(list[idx]);
      }
    });
  }

  if (search) {
    search.addEventListener("input", debouncedRender);
    search.addEventListener("search", renderGrid);
    search.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      var q = searchQuery();
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
