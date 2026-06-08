(function () {
  const welcome = document.getElementById("welcome");
  const enterBtn = document.getElementById("welcome-enter");
  const site = document.getElementById("site");
  const canvas = document.getElementById("welcome-canvas");
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
  const viewAnnouncements = document.getElementById("view-announcements");
  const viewChangelog = document.getElementById("view-changelog");
  const viewChat = document.getElementById("view-chat");
  const viewAbout = document.getElementById("view-about");
  const viewSettings = document.getElementById("view-settings");
  const navGames = document.getElementById("nav-games");
  const navAnnouncements = document.getElementById("nav-announcements");
  const navLinks = document.querySelectorAll(".site__nav-link[data-view]");

  let allGames = [];
  let filteredGames = [];
  let renderedCount = 0;
  let filterTimer = 0;
  let listObserver = null;
  let gridSentinel = null;
  const BATCH_SIZE = 60;
  let activeGame = null;
  let activeView = "games";

  function dismissWelcome() {
    if (!welcome || welcome.classList.contains("welcome--exit")) return;
    document.documentElement.classList.remove("welcome-lock");
    welcome.classList.add("welcome--exit");
    welcome.setAttribute("aria-hidden", "true");
    if (site) site.hidden = false;
    startSiteAmbience();
    const removeWelcome = () => {
      welcome.remove();
      stopParticles();
    };
    welcome.addEventListener("transitionend", removeWelcome, { once: true });
    setTimeout(removeWelcome, 900);
  }

  if (enterBtn) enterBtn.addEventListener("click", dismissWelcome);

  document.addEventListener("keydown", (e) => {
    if (player && !player.hidden && e.key === "Escape") {
      closePlayer();
      return;
    }
    if (e.key === "Enter" && welcome && !welcome.classList.contains("welcome--exit")) {
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      dismissWelcome();
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
    activeView = name;
    navLinks.forEach(function (link) {
      const on = link.getAttribute("data-view") === name;
      link.classList.toggle("site__nav-link--active", on);
    });
    if (viewGames) viewGames.hidden = name !== "games";
    if (viewHub) viewHub.hidden = name !== "hub";
    if (viewAnnouncements) viewAnnouncements.hidden = name !== "announcements";
    if (viewChangelog) viewChangelog.hidden = name !== "changelog";
    if (viewChat) viewChat.hidden = name !== "chat";
    if (viewAbout) viewAbout.hidden = name !== "about";
    if (viewSettings) viewSettings.hidden = name !== "settings";
    [viewGames, viewHub, viewAnnouncements, viewChangelog, viewChat, viewAbout, viewSettings].forEach(function (view) {
      if (!view) return;
      view.classList.toggle("site__view--active", view.id === "view-" + name);
    });
    if (name === "announcements") renderAnnouncements();
    if (name === "changelog") renderChangelog();
    if (name === "hub" && window.KritikalHub) window.KritikalHub.render();
    if (name === "chat" && window.KritikalChat) window.KritikalChat.start();
    else if (window.KritikalChat) window.KritikalChat.stop();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  navLinks.forEach(function (link) {
    link.addEventListener("click", function () {
      switchView(link.getAttribute("data-view"));
    });
  });

  if (location.hash === "#hub") switchView("hub");
  if (location.hash === "#announcements") switchView("announcements");
  if (location.hash === "#changelog") switchView("changelog");
  if (location.hash === "#chat") switchView("chat");
  if (location.hash === "#about") switchView("about");
  if (location.hash === "#settings") switchView("settings");

  function settingsOn() {
    var S = window.KritikalSettings;
    return S ? S.get.bind(S) : function () { return true; };
  }

  function syncAmbienceFromSettings() {
    var get = settingsOn();
    if (canvas) {
      if (get("particles") && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        canvas.style.display = "";
        if (!particlesOn) startParticles();
      } else {
        stopParticles();
        canvas.style.display = "none";
      }
    }
    if (site && !site.hidden) {
      if (get("particles") && !siteAmbienceOn) startSiteAmbience();
      else if (!get("particles") && siteAmbienceOn) stopSiteAmbience();
    }
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

  function coverSources(game) {
    if (game.image) return [game.image];
    const id = game.id;
    const dash = slugDash(id);
    return ["assets/thumbs/" + id + ".png", "assets/thumbs/" + dash + ".png"];
  }

  function bindCoverImage(thumb, game) {
    const sources = coverSources(game);
    const img = document.createElement("img");
    img.className = "site__card-img";
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    let idx = 0;
    const tryNext = () => {
      if (idx >= sources.length) {
        img.remove();
        thumb.classList.remove("site__card-thumb--has-img");
        return;
      }
      img.src = sources[idx++];
    };
    img.addEventListener("error", tryNext);
    img.addEventListener("load", () => {
      thumb.classList.add("site__card-thumb--has-img");
    });
    thumb.classList.add("site__card-thumb--has-img");
    thumb.prepend(img);
    tryNext();
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

  function createGameCard(game, index, instant) {
    const card = document.createElement("article");
    card.className = "site__card" + (instant ? " site__card--ready" : "");
    card.dataset.index = String(index);
    card.style.setProperty("--i", String(index % 24));
    card.tabIndex = 0;
    const thumb = document.createElement("div");
    thumb.className = "site__card-thumb";
    thumb.style.setProperty("--hue", String(hueFromId(game.id)));
    bindCoverImage(thumb, game);
    const shine = document.createElement("span");
    shine.className = "site__card-shine";
    shine.setAttribute("aria-hidden", "true");
    const play = document.createElement("span");
    play.className = "site__card-play";
    play.setAttribute("aria-hidden", "true");
    play.innerHTML = '<span class="site__card-play-ring"></span><span class="site__card-play-icon">[RUN]</span>';
    const foot = document.createElement("div");
    foot.className = "site__card-foot";
    const title = document.createElement("h3");
    title.className = "site__card-title";
    title.textContent = game.title;
    foot.append(title);
    thumb.append(shine, play);
    card.append(thumb, foot);
    return card;
  }

  function appendGameBatch() {
    if (!gamesGrid || renderedCount >= filteredGames.length) return;
    const instant = renderedCount > 0;
    const end = Math.min(renderedCount + BATCH_SIZE, filteredGames.length);
    const frag = document.createDocumentFragment();
    for (let i = renderedCount; i < end; i++) {
      frag.appendChild(createGameCard(filteredGames[i], i, instant));
    }
    ensureSentinel();
    gamesGrid.insertBefore(frag, gridSentinel);
    renderedCount = end;
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
    appendGameBatch();
  }

  function debouncedFilter() {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(applyFilter, 120);
  }

  function updateGameCount(visible, total) {
    if (!gameCount) return;
    if (visible === total) {
      gameCount.textContent = "indexed: " + total + " payloads";
    } else {
      gameCount.textContent = "filtered: " + visible + "/" + total;
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
    if (window.KritikalChat) window.KritikalChat.stop();
  });

  window.addEventListener("kritikal-cloak-off", function () {
    if (activeView === "chat" && window.KritikalChat) window.KritikalChat.start();
  });

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

  function renderGames(games) {
    allGames = games;
    applyFilter();
  }

  function initGames() {
    if (!gamesGrid) return;
    const store = window.KritikalStore;
    if (store && typeof store.getGames === "function") {
      store
        .getGames()
        .then(function (data) {
          allGames = data;
          renderGames(allGames);
        })
        .catch(function () {
          fetch("games.json")
            .then(function (res) {
              if (!res.ok) throw new Error("bad status");
              return res.json();
            })
            .then(function (data) {
              allGames = data;
              renderGames(allGames);
            })
            .catch(function () {
              if (gameCount) gameCount.textContent = "index load failed";
              if (gameEmpty) {
                gameEmpty.hidden = false;
                gameEmpty.textContent = "Games list failed to load. Run npm start in the website folder.";
              }
            });
        });
      return;
    }
    fetch("games.json")
      .then(function (res) {
        if (!res.ok) throw new Error("bad status");
        return res.json();
      })
      .then(function (data) {
        allGames = data;
        renderGames(allGames);
      })
      .catch(function () {
        if (gameCount) gameCount.textContent = "index load failed";
        if (gameEmpty) {
          gameEmpty.hidden = false;
          gameEmpty.textContent = "Games list failed to load.";
        }
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
  renderAnnouncements();

  let particles = [];
  let siteParticles = [];
  let raf = 0;
  let siteRaf = 0;
  let ctx = null;
  let siteCtx = null;
  let siteAmbienceOn = false;
  let particlesOn = false;

  function resizeCanvas() {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seedParticles() {
    const n = Math.min(45, Math.floor((window.innerWidth * window.innerHeight) / 20000));
    particles = [];
    for (let i = 0; i < n; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 2.2 + 0.4,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        hue: 115 + Math.random() * 40,
        a: Math.random() * 0.4 + 0.2,
      });
    }
  }

  function drawParticles() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = window.innerWidth;
      if (p.x > window.innerWidth) p.x = 0;
      if (p.y < 0) p.y = window.innerHeight;
      if (p.y > window.innerHeight) p.y = 0;
      ctx.beginPath();
      ctx.fillStyle = "hsla(" + p.hue + ", 90%, 55%, 0.5)";
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    raf = requestAnimationFrame(drawParticles);
  }

  function startParticles() {
    if (!canvas) return;
    if (!settingsOn()("particles")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (particlesOn) return;
    particlesOn = true;
    resizeCanvas();
    seedParticles();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(drawParticles);
    window.addEventListener("resize", onResize);
  }

  function onResize() {
    resizeCanvas();
    seedParticles();
  }

  function stopParticles() {
    particlesOn = false;
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize);
    particles = [];
  }

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
    const n = Math.min(30, Math.floor((window.innerWidth * window.innerHeight) / 28000));
    siteParticles = [];
    for (let i = 0; i < n; i++) {
      siteParticles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.8 + 0.3,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        hue: 100 + Math.random() * 50,
        a: Math.random() * 0.3 + 0.1,
      });
    }
  }

  function drawSiteParticles() {
    if (!siteCtx || !siteCanvas || !siteAmbienceOn) return;
    siteCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const p of siteParticles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = window.innerWidth;
      if (p.x > window.innerWidth) p.x = 0;
      if (p.y < 0) p.y = window.innerHeight;
      if (p.y > window.innerHeight) p.y = 0;
      siteCtx.beginPath();
      siteCtx.fillStyle = "hsla(" + p.hue + ", 85%, 50%, " + p.a + ")";
      siteCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
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
    if (!settingsOn()("particles")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      siteCanvas.style.display = "none";
      return;
    }
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
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    if (canvas) canvas.style.display = "none";
  } else if (settingsOn()("particles")) {
    startParticles();
  }

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
    if (document.body.classList.contains("fx-no-trail")) {
      cancelAnimationFrame(trailRaf);
      if (trailEl) trailEl.hidden = true;
    } else if (!trailRaf) {
      trailRaf = requestAnimationFrame(updateTrail);
    }
  });

  if (trailEl && !document.body.classList.contains("fx-no-trail")) {
    trailRaf = requestAnimationFrame(updateTrail);
  }

  function maybeSkipBoot() {
    var S = window.KritikalSettings;
    if (S && S.get("skipBoot") && welcome && !welcome.classList.contains("welcome--exit")) {
      setTimeout(dismissWelcome, 120);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", maybeSkipBoot);
  } else {
    maybeSkipBoot();
  }
})();
