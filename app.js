(function () {
  const site = document.getElementById("site");
  const siteCanvas = document.getElementById("site-canvas");
  const logo = document.getElementById("site-logo");
  const gameSearch = document.getElementById("game-search");
  const gamesGrid = document.getElementById("games-grid");
  const gameEmpty = document.getElementById("game-empty");
  const gameCount = document.getElementById("game-count");
  const player = document.getElementById("game-player");
  const playerBack = document.getElementById("player-back");
  const playerTitle = document.getElementById("player-title");
  const playerFrame = document.getElementById("player-frame");
  const playerFs = document.getElementById("player-fs");
  const announcementsSection = document.getElementById("announcements");
  const announcementsList = document.getElementById("announcements-list");
  const announcementsEmpty = document.getElementById("announcements-empty");
  const changelogList = document.getElementById("changelog-list");
  const changelogEmpty = document.getElementById("changelog-empty");
  const viewGames = document.getElementById("view-games");
  const viewHub = document.getElementById("view-hub");
  const viewEntertainment = document.getElementById("view-entertainment");
  const viewApps = document.getElementById("view-apps");
  const viewMore = document.getElementById("view-more");
  const viewProfile = document.getElementById("view-profile");
  const viewAnnouncements = document.getElementById("view-announcements");
  const viewTutorial = document.getElementById("view-tutorial");
  const viewChangelog = document.getElementById("view-changelog");
  const viewChat = document.getElementById("view-chat");
  const viewTabCloak = document.getElementById("view-tab-cloak");
  const viewSettings = document.getElementById("view-settings");
  const navGames = document.getElementById("nav-games");
  const navAnnouncements = document.getElementById("nav-announcements");
  const navLinks = document.querySelectorAll(".site__nav-link[data-view]");
  const navChat = document.getElementById("nav-chat");

  let allGames = [];
  let filteredGames = [];
  let renderedCount = 0;
  let filterTimer = 0;
  let listObserver = null;
  let gridSentinel = null;
  const BATCH_SIZE = 64;
  const THUMB_WARM_AHEAD = 192;
  const THUMB_QUEUE_MAX = 96;
  let lazyThumbObserver = null;
  const warmedThumbs = new Set();
  const thumbQueue = [];
  let thumbQueueActive = 0;
  let activeGame = null;
  let activeView = "games";

  document.addEventListener("keydown", (e) => {
    if (player && !player.hidden && e.key === "Escape") {
      closePlayer();
    }
  });

  if (logo) {
    logo.addEventListener("click", (e) => {
      e.preventDefault();
      closePlayer();
      switchView("games");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function switchView(name) {
    if (name === "chat" && (!window.ZentraAuth || !window.ZentraAuth.isLoggedIn || !window.ZentraAuth.isLoggedIn())) {
      if (window.ZentraAuth && window.ZentraAuth.showGate) window.ZentraAuth.showGate();
      return;
    }
    activeView = name;
    navLinks.forEach(function (link) {
      const on = link.getAttribute("data-view") === name;
      link.classList.toggle("site__nav-link--active", on);
    });
    if (viewGames) viewGames.hidden = name !== "games";
    if (viewHub) viewHub.hidden = name !== "hub";
    if (viewEntertainment) viewEntertainment.hidden = name !== "entertainment";
    if (viewApps) viewApps.hidden = name !== "apps";
    if (viewMore) viewMore.hidden = name !== "more";
    if (viewProfile) viewProfile.hidden = name !== "profile";
    if (viewAnnouncements) viewAnnouncements.hidden = name !== "announcements";
    if (viewTutorial) viewTutorial.hidden = name !== "tutorial";
    if (viewChangelog) viewChangelog.hidden = name !== "changelog";
    if (viewChat) viewChat.hidden = name !== "chat";
    if (viewTabCloak) viewTabCloak.hidden = name !== "tab-cloak";
    if (viewSettings) viewSettings.hidden = name !== "settings";
    [viewGames, viewHub, viewEntertainment, viewApps, viewMore, viewProfile, viewAnnouncements, viewTutorial, viewChangelog, viewChat, viewTabCloak, viewSettings].forEach(function (view) {
      if (!view) return;
      view.classList.toggle("site__view--active", view.id === "view-" + name);
    });
    if (name === "announcements") renderAnnouncements();
    if (name === "changelog") renderChangelog();
    if (name === "hub" && window.KritikalHub) window.KritikalHub.render();
    if (name === "entertainment") {
      if (window.KritikalEntertainment) window.KritikalEntertainment.open("movies");
      else if (window.KritikalMovies) window.KritikalMovies.render();
    }
    if (name === "apps") {
      if (window.KritikalApps) {
        window.KritikalApps.render();
        window.KritikalApps.warm();
      }
    }
    if (name !== "apps" && window.KritikalApps && window.KritikalApps.close) {
      window.KritikalApps.close();
    }
    if (name === "more" && window.KritikalMore) window.KritikalMore.open("home");
    if (name === "profile" && window.ZentraProfile) window.ZentraProfile.refresh();
    if (name === "tab-cloak" && window.KritikalTabCloak) window.KritikalTabCloak.render();
    if (name === "tutorial" && window.ZentraGuide && window.ZentraGuide.onTutorialOpen) {
      window.ZentraGuide.onTutorialOpen();
    }
    if (window.ZentraNavGlider) {
      var activeLink = document.querySelector(".site__nav-link--active");
      if (activeLink) window.ZentraNavGlider.move(activeLink);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  navLinks.forEach(function (link) {
    link.addEventListener("click", function () {
      switchView(link.getAttribute("data-view"));
    });
  });

  function syncChatNav() {
    if (!navChat) return;
    var logged = window.ZentraAuth && window.ZentraAuth.isLoggedIn && window.ZentraAuth.isLoggedIn();
    navChat.hidden = !logged;
  }

  window.addEventListener("zentra-auth", syncChatNav);
  if (window.ZentraAuth && window.ZentraAuth.whenReady) {
    window.ZentraAuth.whenReady().then(syncChatNav);
  } else {
    syncChatNav();
  }

  var tutorialReplay = document.getElementById("tutorial-replay");
  if (tutorialReplay) {
    tutorialReplay.addEventListener("click", function () {
      switchView("games");
      if (window.ZentraGuide && window.ZentraGuide.start) {
        window.ZentraGuide.start(true);
      }
    });
  }

  if (location.hash === "#hub") switchView("hub");
  if (location.hash === "#entertainment" || location.hash === "#movies") {
    switchView("entertainment");
    if (window.KritikalEntertainment) window.KritikalEntertainment.open("movies");
  }
  if (location.hash === "#music") {
    switchView("entertainment");
    if (window.KritikalEntertainment) window.KritikalEntertainment.open("music");
  }
  if (location.hash === "#apps" || location.hash === "#youtube" || location.hash === "#tiktok" || location.hash === "#snapchat" || location.hash === "#chatgpt" || location.hash === "#instagram" || location.hash === "#gauthai") {
    switchView("apps");
    if (location.hash === "#youtube" && window.KritikalApps) window.KritikalApps.open("youtube");
    if (location.hash === "#tiktok" && window.KritikalApps) window.KritikalApps.open("tiktok");
    if (location.hash === "#snapchat" && window.KritikalApps) window.KritikalApps.open("snapchat");
    if (location.hash === "#chatgpt" && window.KritikalApps) window.KritikalApps.open("chatgpt");
    if (location.hash === "#instagram" && window.KritikalApps) window.KritikalApps.open("instagram");
    if (location.hash === "#gauthai" && window.KritikalApps) window.KritikalApps.open("gauthai");
  }
  if (location.hash === "#more" || location.hash === "#api" || location.hash === "#tools" || location.hash === "#ai") {
    switchView("more");
    if (window.KritikalMore) {
      if (location.hash === "#api" || location.hash === "#tools") window.KritikalMore.open("api");
      else if (location.hash === "#ai") window.KritikalMore.open("ai");
      else window.KritikalMore.open("home");
    }
  }
  if (location.hash === "#announcements") switchView("announcements");
  if (location.hash === "#tutorial") switchView("tutorial");
  if (location.hash === "#changelog") switchView("changelog");
  if (location.hash === "#chat") switchView("chat");
  if (location.hash === "#tab-cloak" || location.hash === "#cloak") switchView("tab-cloak");
  if (location.hash === "#settings") switchView("settings");

  function settingsOn() {
    var S = window.KritikalSettings;
    return S ? S.get.bind(S) : function () { return true; };
  }

  function syncAmbienceFromSettings() {
    var get = settingsOn();
    if (!site || site.hidden) return;
    if (document.body.classList.contains("fx-no-particles") || !get("particles")) {
      stopSiteAmbience();
      if (siteCanvas) siteCanvas.style.display = "none";
      return;
    }
    if (siteCanvas) siteCanvas.style.display = "";
    if (!siteAmbienceOn) startSiteAmbience();
  }

  window.addEventListener("kritikal-settings", syncAmbienceFromSettings);

  function hueFromId(id) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return h % 360;
  }

  function slugDash(id) {
    return String(id)
      .replace(/([a-z])(\d)/g, "$1-$2")
      .replace(/(\d)([a-z])/g, "$1-$2")
      .replace(/_/g, "-")
      .replace(/\./g, "-");
  }

  function coverUrl(game) {
    if (game && game.cover) return game.cover;
    return "/assets/thumbs/" + encodeURIComponent(String(game.id || "")) + ".png";
  }

  function drainThumbQueue() {
    if (thumbQueueActive >= THUMB_QUEUE_MAX || !thumbQueue.length) return;
    thumbQueue.sort(function (a, b) {
      return a.priority - b.priority;
    });
    while (thumbQueueActive < THUMB_QUEUE_MAX && thumbQueue.length) {
      const job = thumbQueue.shift();
      thumbQueueActive++;
      job.run(function () {
        thumbQueueActive--;
        drainThumbQueue();
      });
    }
  }

  function scheduleThumbLoad(priority, run) {
    if (priority < 200) {
      run(function () {});
      return;
    }
    thumbQueue.push({ priority: priority, run: run });
    drainThumbQueue();
  }

  function preloadCoverLinks(games, count) {
    if (!games || !games.length || !document.head) return;
    const end = Math.min(count || 20, games.length);
    for (let i = 0; i < end; i++) {
      const href = games[i] && games[i].cover;
      if (!href || warmedThumbs.has("link:" + href)) continue;
      warmedThumbs.add("link:" + href);
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = href;
      if (i < 8) link.setAttribute("fetchpriority", "high");
      document.head.appendChild(link);
    }
  }

  function warmThumbUrls(games, start, count) {
    if (!games || !games.length) return;
    const end = Math.min(start + count, games.length);
    for (let i = start; i < end; i++) {
      const href = games[i] && games[i].cover;
      if (!href || warmedThumbs.has(href)) continue;
      warmedThumbs.add(href);
      if (warmedThumbs.size > 1200) warmedThumbs.clear();
      const probe = new Image();
      probe.decoding = "async";
      if (i - start < 12) probe.fetchPriority = "high";
      probe.src = href;
    }
  }

  function getLazyThumbObserver() {
    if (lazyThumbObserver) return lazyThumbObserver;
    lazyThumbObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          const start = entry.target.__thumbStart;
          if (start) start();
          lazyThumbObserver.unobserve(entry.target);
          entry.target.__thumbStart = null;
        });
      },
      { rootMargin: "1600px 0px", threshold: 0.01 }
    );
    return lazyThumbObserver;
  }

  function bindCoverImage(thumb, game, index) {
    const href = coverUrl(game);
    const fallback = "/assets/thumbs/" + encodeURIComponent(String(game.id || "")) + ".png";
    const lowData = document.body && document.body.classList.contains("fx-low-data");
    const startLoad = function () {
      if (thumb.__thumbLoaded) return;
      thumb.__thumbLoaded = true;
      scheduleThumbLoad(index, function (done) {
        const img = document.createElement("img");
        img.className = "site__card-img";
        img.alt = "";
        img.width = lowData ? 180 : 320;
        img.height = lowData ? 180 : 320;
        img.decoding = index < 32 && !lowData ? "sync" : "async";
        img.loading = index < (lowData ? 20 : 72) ? "eager" : "lazy";
        if (!lowData && index < 32) img.fetchPriority = "high";
        else if (!lowData && index < 80) img.fetchPriority = "auto";
        img.addEventListener(
          "load",
          function () {
            thumb.classList.add("site__card-thumb--has-img");
            done();
          },
          { once: true }
        );
        img.addEventListener(
          "error",
          function () {
            if (img.src !== fallback && fallback !== href) {
              img.src = fallback;
              return;
            }
            img.remove();
            thumb.classList.remove("site__card-thumb--has-img");
            done();
          },
          { once: false }
        );
        thumb.prepend(img);
        img.src = href;
      });
    };
    if (index < (lowData ? 40 : 120)) {
      startLoad();
      return;
    }
    thumb.__thumbStart = startLoad;
    getLazyThumbObserver().observe(thumb);
  }

  function gameHasThumb(game) {
    if (game && game.hasThumb === true) return true;
    if (game && game.hasThumb === false) return false;
    if (game && game.cover) return true;
    return false;
  }

  function compareGamesByThumb(a, b) {
    const ah = gameHasThumb(a) ? 0 : 1;
    const bh = gameHasThumb(b) ? 0 : 1;
    if (ah !== bh) return ah - bh;
    return String(a.title || "").localeCompare(String(b.title || ""), undefined, { sensitivity: "base" });
  }

  function sortGamesByThumb(list) {
    return list.slice().sort(compareGamesByThumb);
  }

  function getFilteredGames() {
    const q = (gameSearch && gameSearch.value ? gameSearch.value : "").trim().toLowerCase();
    if (!q) return allGames;
    return allGames.filter(function (game) {
      return (game.search || "").includes(q);
    });
  }

  function resetGrid() {
    renderedCount = 0;
    if (listObserver) {
      listObserver.disconnect();
      listObserver = null;
    }
    if (gridSentinel) {
      gridSentinel.remove();
      gridSentinel = null;
    }
    if (gamesGrid) gamesGrid.innerHTML = "";
  }

  function ensureSentinel() {
    if (!gamesGrid || gridSentinel) return;
    gridSentinel = document.createElement("div");
    gridSentinel.className = "site__grid-sentinel";
    gridSentinel.setAttribute("aria-hidden", "true");
    gamesGrid.appendChild(gridSentinel);
  }

  function setupListObserver() {
    if (listObserver || !gridSentinel || renderedCount >= filteredGames.length) return;
    listObserver = new IntersectionObserver(
      function (entries) {
        if (entries.some(function (entry) {
          return entry.isIntersecting;
        })) {
          appendGameBatch();
        }
      },
      { rootMargin: "500px 0px" }
    );
    listObserver.observe(gridSentinel);
  }

  function createGameCard(game, index) {
    const card = document.createElement("article");
    card.className = "site__card site__card--ready";
    card.dataset.index = String(index);
    card.style.setProperty("--i", String(index % 24));
    card.tabIndex = 0;
    const thumb = document.createElement("div");
    thumb.className = "site__card-thumb";
    thumb.style.setProperty("--hue", String(hueFromId(game.id)));
    bindCoverImage(thumb, game, index);
    const play = document.createElement("span");
    play.className = "site__card-play";
    play.setAttribute("aria-hidden", "true");
    play.innerHTML = '<span class="site__card-play-btn"><span class="site__card-play-arrow" aria-hidden="true"></span><span class="site__card-play-label">Play</span></span>';
    const foot = document.createElement("div");
    foot.className = "site__card-foot";
    const title = document.createElement("h3");
    title.className = "site__card-title";
    title.textContent = game.title;
    foot.append(title);
    if (window.ZentraGameRatings && typeof window.ZentraGameRatings.mount === "function") {
      const rating = window.ZentraGameRatings.mount(card, game.id);
      if (rating) foot.append(rating);
    }
    const fav = document.createElement("button");
    fav.type = "button";
    fav.className = "site__card-fav";
    fav.setAttribute("aria-label", "Favorite");
    fav.dataset.gameId = game.id;
    if (window.ZentraLibrary && window.ZentraLibrary.isFavorite(game.id)) {
      fav.classList.add("site__card-fav--on");
      fav.textContent = "♥";
    } else {
      fav.textContent = "♡";
    }
    fav.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (!window.ZentraLibrary) return;
      window.ZentraLibrary.toggleFavorite(game.id).then(function () {
        var on = window.ZentraLibrary.isFavorite(game.id);
        fav.classList.toggle("site__card-fav--on", on);
        fav.textContent = on ? "♥" : "♡";
      });
    });
    thumb.append(play);
    card.append(thumb, foot, fav);
    return card;
  }

  function appendGameBatch() {
    if (!gamesGrid || renderedCount >= filteredGames.length) return;
    const end = Math.min(renderedCount + BATCH_SIZE, filteredGames.length);
    const frag = document.createDocumentFragment();
    for (let i = renderedCount; i < end; i++) {
      frag.appendChild(createGameCard(filteredGames[i], i));
    }
    ensureSentinel();
    gamesGrid.insertBefore(frag, gridSentinel);
    renderedCount = end;
    warmThumbUrls(filteredGames, renderedCount, THUMB_WARM_AHEAD);
    if (filteredGames.length > 0) {
      var ratio = renderedCount / filteredGames.length;
      loaderStep("index", {
        partial: 0.45 + ratio * 0.55,
        label: "Rendering " + renderedCount.toLocaleString() + " / " + filteredGames.length.toLocaleString() + " cards",
        games: allGames.length,
      });
    }
    if (renderedCount >= filteredGames.length && listObserver) {
      listObserver.disconnect();
      listObserver = null;
    } else {
      setupListObserver();
    }
  }

  function applyFilter() {
    filteredGames = getFilteredGames();
    resetGrid();
    const q = gameSearch && gameSearch.value ? gameSearch.value.trim() : "";
    if (gameEmpty) gameEmpty.hidden = filteredGames.length > 0 || !q;
    updateGameCount(filteredGames.length, allGames.length);
    loaderStep("index", {
      partial: 0.45,
      label: "Sorting " + filteredGames.length.toLocaleString() + " titles",
      games: allGames.length,
    });
    appendGameBatch();
  }

  function debouncedFilter() {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(applyFilter, 100);
  }

  function updateGameCount(visible, total) {
    if (!gameCount) return;
    if (visible === total) {
      gameCount.textContent = total.toLocaleString() + " games ready";
    } else {
      gameCount.textContent = visible.toLocaleString() + " of " + total.toLocaleString() + " games";
    }
  }

  if (gamesGrid) {
    gamesGrid.addEventListener("click", function (e) {
      const card = e.target.closest(".site__card");
      if (!card) return;
      const idx = parseInt(card.dataset.index, 10);
      if (!isNaN(idx) && filteredGames[idx]) openGame(filteredGames[idx]);
    });
    gamesGrid.addEventListener("keydown", function (e) {
      const card = e.target.closest(".site__card");
      if (!card) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const idx = parseInt(card.dataset.index, 10);
        if (!isNaN(idx) && filteredGames[idx]) openGame(filteredGames[idx]);
      }
    });
  }

  if (gameSearch) {
    gameSearch.addEventListener("input", debouncedFilter);
    gameSearch.addEventListener("search", applyFilter);
  }

  function resolveGameUrl(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    return (
      "/" +
      String(path)
        .replace(/^\/+/, "")
        .split("/")
        .map(function (part) {
          return encodeURIComponent(part);
        })
        .join("/")
    );
  }

  function isBlockedCdnUrl(url) {
    const u = String(url || "").toLowerCase();
    if (/cdn\.jsdelivr\.net\/gh\/3kh0\/3kh0-lite/i.test(u)) return true;
    if (/raw\.githack\.com\/3kh0\/3kh0-lite/i.test(u)) return true;
    if (/raw\.githubusercontent\.com\/3kh0\/3kh0-lite/i.test(u)) return true;
    return false;
  }

  function buildPlayUrl(game) {
    if (!game || !game.id) return "";
    return "/play.html?id=" + encodeURIComponent(game.id) + "&_=" + Date.now();
  }

  function loadGameInPlayer(game) {
    if (!playerFrame) return;
    playerFrame.onload = null;
    if (location.protocol === "file:") {
      playerFrame.src = String(game.path || "").replace(/^\/+/, "");
      return;
    }
    playerFrame.src = buildPlayUrl(game);
  }

  function openGame(game) {
    if (!player || !playerFrame || !game) return;
    activeGame = game;
    if (window.ZentraLibrary && window.ZentraLibrary.trackRecent) {
      window.ZentraLibrary.trackRecent(game.id);
    }
    if (playerTitle) playerTitle.textContent = game.title;
    player.hidden = false;
    document.documentElement.classList.add("player-open");
    loadGameInPlayer(game);
    playerBack && playerBack.focus();
  }

  function closePlayer() {
    if (!player || !playerFrame) return;
    activeGame = null;
    player.hidden = true;
    playerFrame.onload = null;
    playerFrame.src = "about:blank";
    document.documentElement.classList.remove("player-open");
    if (gameSearch) gameSearch.focus();
  }

  if (playerBack) playerBack.addEventListener("click", closePlayer);

  window.addEventListener("kritikal-cloak-on", function () {
    closePlayer();
  });

  window.addEventListener("kritikal-cloak-off", function () {});

  if (playerFs) {
    playerFs.addEventListener("click", () => {
      const wrap = document.querySelector(".player__frame-wrap");
      const el = wrap || playerFrame;
      if (!document.fullscreenElement) {
        if (el.requestFullscreen) el.requestFullscreen();
      } else if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    });
  }

  function loaderStep(id, update) {
    var L = window.ZentraLoader;
    if (!L) return;
    if (typeof L.setStep === "function") {
      L.setStep(id, update);
      return;
    }
    if (id === "finalize" && update && update.done && typeof L.notifyReady === "function") {
      L.notifyReady();
    }
  }

  function fetchGamesWithProgress(url) {
    loaderStep("games", { partial: 0.05, label: "Connecting to game library" });
    return fetch(url).then(function (res) {
      loaderStep("games", { partial: 0.18, label: "Receiving game data" });
      if (!res.ok) throw new Error("bad status");
      var total = parseInt(res.headers.get("content-length") || "0", 10);
      if (!total || !res.body || !res.body.getReader) {
        return res.json().then(function (data) {
          loaderStep("games", { done: true, label: "Game library synced", games: Array.isArray(data) ? data.length : 0 });
          return data;
        });
      }
      var reader = res.body.getReader();
      var chunks = [];
      var received = 0;
      function pump() {
        return reader.read().then(function (result) {
          if (result.done) {
            var merged = new Uint8Array(received);
            var offset = 0;
            chunks.forEach(function (chunk) {
              merged.set(chunk, offset);
              offset += chunk.length;
            });
            var text = new TextDecoder().decode(merged);
            var data = JSON.parse(text);
            loaderStep("games", { done: true, label: "Game library synced", games: Array.isArray(data) ? data.length : 0 });
            return data;
          }
          chunks.push(result.value);
          received += result.value.length;
          loaderStep("games", {
            partial: 0.18 + (received / total) * 0.82,
            label: "Downloading games " + Math.round((received / total) * 100) + "%",
          });
          return pump();
        });
      }
      return pump();
    });
  }

  function prefetchCovers(games, count) {
    preloadCoverLinks(games, Math.min(count || 96, 32));
    warmThumbUrls(games, 0, count || 120);
  }

  function loadGamesCatalog() {
    loaderStep("games", { partial: 0.05, label: "Connecting to game library" });
    const early = window.__ZENTRA_GAMES_FETCH;
    const chain = early
      ? early.then(function (res) {
          loaderStep("games", { partial: 0.18, label: "Receiving game data" });
          if (!res.ok) throw new Error("bad status");
          return res.json();
        })
      : fetchGamesWithProgress("/api/games");
    return chain.then(function (data) {
      loaderStep("games", { done: true, label: "Game library synced", games: Array.isArray(data) ? data.length : 0 });
      return data;
    });
  }

  function renderGames(games) {
    allGames = sortGamesByThumb(games);
    prefetchCovers(allGames, 120);
    loaderStep("index", { partial: 0.12, label: "Indexing " + (games.length || 0).toLocaleString() + " games" });
    applyFilter();
  }

  function notifyLoaderReady() {
    loaderStep("surface", { done: true, label: "Interface ready" });
    loaderStep("finalize", { done: true, label: "Ready" });
  }

  function initGames() {
    if (!gamesGrid) {
      notifyLoaderReady();
      return;
    }
    loaderStep("modules", { done: true, label: "Modules loaded" });
    loaderStep("surface", { partial: 0.4, label: "Wiring game grid" });
    const store = window.KritikalStore;
    if (store && typeof store.getGames === "function") {
      loadGamesCatalog()
        .then(function (data) {
          allGames = data;
          renderGames(allGames);
          window.dispatchEvent(new CustomEvent("zentra-games-ready", { detail: { games: allGames } }));
          loaderStep("index", { done: true, label: "Game index ready" });
          loaderStep("surface", { partial: 0.85, label: "Hydrating views" });
          notifyLoaderReady();
        })
        .catch(function () {
          fetchGamesWithProgress("games.json")
            .then(function (data) {
              allGames = data;
              renderGames(allGames);
              window.dispatchEvent(new CustomEvent("zentra-games-ready", { detail: { games: allGames } }));
              loaderStep("index", { done: true, label: "Game index ready" });
              loaderStep("surface", { partial: 0.85, label: "Hydrating views" });
              notifyLoaderReady();
            })
            .catch(function () {
              if (gameCount) gameCount.textContent = "index load failed";
              if (gameEmpty) {
                gameEmpty.hidden = false;
                gameEmpty.textContent = "Games list failed to load. Run npm start in the website folder.";
              }
              loaderStep("games", { done: true, label: "Using offline fallback" });
              loaderStep("index", { done: true, label: "Index unavailable" });
              notifyLoaderReady();
            });
        });
      return;
    }
    fetchGamesWithProgress("games.json")
      .then(function (data) {
        allGames = data;
        renderGames(allGames);
        window.dispatchEvent(new CustomEvent("zentra-games-ready", { detail: { games: allGames } }));
        loaderStep("index", { done: true, label: "Game index ready" });
        loaderStep("surface", { partial: 0.85, label: "Hydrating views" });
        notifyLoaderReady();
      })
      .catch(function () {
        if (gameCount) gameCount.textContent = "index load failed";
        if (gameEmpty) {
          gameEmpty.hidden = false;
          gameEmpty.textContent = "Games list failed to load.";
        }
        loaderStep("games", { done: true, label: "Library unavailable" });
        loaderStep("index", { done: true, label: "Index unavailable" });
        notifyLoaderReady();
      });
  }

  function renderAnnouncements() {
    const store = window.KritikalStore;
    if (!announcementsList || !store) return;
    store
      .getAnnouncements()
      .then(function (list) {
        announcementsList.innerHTML = "";
        if (announcementsEmpty) announcementsEmpty.hidden = list.length > 0;
        list.forEach(function (ann) {
          const card = document.createElement("article");
          card.className = "site__ann-card";
          if (ann.image) {
            const img = document.createElement("img");
            img.className = "site__ann-img";
            img.alt = "";
            img.loading = "lazy";
            img.src = ann.image;
            img.addEventListener("error", function () {
              img.remove();
            });
            card.append(img);
          }
          const body = document.createElement("div");
          body.className = "site__ann-body";
          const date = document.createElement("time");
          date.className = "site__ann-date";
          date.dateTime = ann.createdAt || "";
          date.textContent = store.formatDate(ann.createdAt);
          const title = document.createElement("h3");
          title.className = "site__ann-title";
          title.textContent = ann.title;
          body.append(date, title);
          if (ann.subtitle) {
            const sub = document.createElement("p");
            sub.className = "site__ann-sub";
            sub.textContent = ann.subtitle;
            body.append(sub);
          }
          if (ann.description) {
            const desc = document.createElement("p");
            desc.className = "site__ann-desc";
            desc.textContent = ann.description;
            body.append(desc);
          }
          card.append(body);
          announcementsList.append(card);
        });
      })
      .catch(function () {
        if (announcementsEmpty) {
          announcementsEmpty.hidden = false;
          announcementsEmpty.textContent = "Could not load announcements.";
        }
      });
  }

  function renderChangelog() {
    const store = window.KritikalStore;
    if (!changelogList || !store) return;
    store
      .getChangelog()
      .then(function (list) {
        changelogList.innerHTML = "";
        if (changelogEmpty) changelogEmpty.hidden = list.length > 0;
        list.forEach(function (entry) {
          const card = document.createElement("article");
          card.className = "site__ann-card";
          const body = document.createElement("div");
          body.className = "site__ann-body";
          const date = document.createElement("time");
          date.className = "site__ann-date";
          date.dateTime = entry.createdAt || "";
          date.textContent = store.formatDate(entry.createdAt);
          const title = document.createElement("h3");
          title.className = "site__ann-title";
          title.textContent = entry.title;
          body.append(date, title);
          if (entry.message) {
            const msg = document.createElement("p");
            msg.className = "site__ann-desc";
            msg.textContent = entry.message;
            body.append(msg);
          }
          card.append(body);
          changelogList.append(card);
        });
      })
      .catch(function () {
        if (changelogEmpty) {
          changelogEmpty.hidden = false;
          changelogEmpty.textContent = "Could not load changelog.";
        }
      });
  }

  initGames();
  loaderStep("surface", { partial: 0.55, label: "Loading announcements" });
  renderAnnouncements();

  let siteParticles = [];
  let siteRaf = 0;
  let siteCtx = null;
  let siteAmbienceOn = false;

  function resizeSiteCanvas() {
    if (!siteCanvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    siteCanvas.width = Math.floor(window.innerWidth * dpr);
    siteCanvas.height = Math.floor(window.innerHeight * dpr);
    siteCanvas.style.width = window.innerWidth + "px";
    siteCanvas.style.height = window.innerHeight + "px";
    siteCtx = siteCanvas.getContext("2d");
    if (siteCtx) siteCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seedSiteParticles() {
    const n = Math.min(18, Math.floor((window.innerWidth * window.innerHeight) / 45000));
    siteParticles = [];
    for (let i = 0; i < n; i++) {
      siteParticles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.8 + 0.3,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        hue: 240 + Math.random() * 60,
        a: Math.random() * 0.3 + 0.1,
      });
    }
  }

  function drawSiteParticles() {
    if (!siteCtx || !siteCanvas || !siteAmbienceOn) return;
    if (document.body.classList.contains("fx-no-particles")) {
      stopSiteAmbience();
      return;
    }
    var accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#b794ff";
    var rgb = { r: 183, g: 148, b: 255 };
    if (accent.charAt(0) === "#" && accent.length >= 7) {
      rgb.r = parseInt(accent.slice(1, 3), 16);
      rgb.g = parseInt(accent.slice(3, 5), 16);
      rgb.b = parseInt(accent.slice(5, 7), 16);
    }
    var strength = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--glow-strength")) || 0.55;
    siteCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const p of siteParticles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = window.innerWidth;
      if (p.x > window.innerWidth) p.x = 0;
      if (p.y < 0) p.y = window.innerHeight;
      if (p.y > window.innerHeight) p.y = 0;
      siteCtx.beginPath();
      siteCtx.fillStyle = "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + (p.a * (0.6 + strength * 0.8)) + ")";
      siteCtx.arc(p.x, p.y, p.r * (0.8 + strength * 0.5), 0, Math.PI * 2);
      siteCtx.fill();
    }
    siteRaf = requestAnimationFrame(drawSiteParticles);
  }

  function onSiteResize() {
    resizeSiteCanvas();
    seedSiteParticles();
  }

  function startSiteAmbience() {
    if (siteAmbienceOn || !siteCanvas) return;
    if (document.body.classList.contains("fx-no-particles") || !settingsOn()("particles")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      siteCanvas.style.display = "none";
      return;
    }
    siteCanvas.style.display = "";
    siteAmbienceOn = true;
    resizeSiteCanvas();
    seedSiteParticles();
    cancelAnimationFrame(siteRaf);
    siteRaf = requestAnimationFrame(drawSiteParticles);
    window.addEventListener("resize", onSiteResize);
  }

  function stopSiteAmbience() {
    siteAmbienceOn = false;
    cancelAnimationFrame(siteRaf);
    window.removeEventListener("resize", onSiteResize);
    siteParticles = [];
    if (siteCtx && siteCanvas) {
      siteCtx.clearRect(0, 0, siteCanvas.width, siteCanvas.height);
    }
  }

  window.addEventListener("zentra-boot-complete", function () {
    startSiteAmbience();
    if (window.ZentraNavGlider) {
      requestAnimationFrame(function () {
        window.ZentraNavGlider.init();
        var activeLink = document.querySelector(".site__nav-link--active");
        if (activeLink) window.ZentraNavGlider.move(activeLink);
      });
    }
  });

  var trailEl = document.getElementById("cursor-trail");
  var trailX = 0;
  var trailY = 0;
  var trailRaf = 0;

  function updateTrail() {
    if (!trailEl || document.body.classList.contains("fx-no-trail") || document.hidden) {
      if (trailEl) trailEl.hidden = true;
      trailRaf = 0;
      return;
    }
    trailEl.hidden = false;
    trailEl.style.transform = "translate(" + (trailX - 8) + "px," + (trailY - 8) + "px)";
    trailRaf = requestAnimationFrame(updateTrail);
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      cancelAnimationFrame(trailRaf);
      trailRaf = 0;
      if (trailEl) trailEl.hidden = true;
      stopSiteAmbience();
    } else {
      syncAmbienceFromSettings();
      if (trailEl && !document.body.classList.contains("fx-no-trail") && !trailRaf) {
        trailRaf = requestAnimationFrame(updateTrail);
      }
    }
  });

  document.addEventListener("mousemove", function (e) {
    trailX = e.clientX;
    trailY = e.clientY;
  });

  window.addEventListener("kritikal-settings", function () {
    syncAmbienceFromSettings();
    if (document.body.classList.contains("fx-no-trail")) {
      cancelAnimationFrame(trailRaf);
      trailRaf = 0;
      if (trailEl) trailEl.hidden = true;
    } else if (trailEl && !trailRaf) {
      trailEl.hidden = false;
      trailRaf = requestAnimationFrame(updateTrail);
    }
  });

  if (trailEl && !document.body.classList.contains("fx-no-trail")) {
    trailRaf = requestAnimationFrame(updateTrail);
  }

  window.ZentraApp = {
    switchView: switchView,
    getGames: function () {
      return allGames.slice();
    },
    openGameById: function (id) {
      var game = allGames.find(function (g) {
        return g.id === id;
      });
      if (!game) return;
      switchView("games");
      openGame(game);
    },
  };
})();
