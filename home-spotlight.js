(function () {
  var gotdCard = document.getElementById("home-gotd-card");
  var gotdDate = document.getElementById("home-gotd-date");
  var randomBtn = document.getElementById("home-random-btn");
  var randomResult = document.getElementById("home-random-result");
  var stage = document.getElementById("home-random-stage");
  var stageTrack = document.getElementById("home-random-stage-track");
  var games = [];
  var slideGames = [];

  function formatToday() {
    var d = new Date();
    return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  }

  function dayIndex(total) {
    if (!total) return 0;
    var d = new Date();
    var seed = d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate();
    return seed % total;
  }

  function playable(list) {
    return list.filter(function (g) {
      return g && g.id && g.title;
    });
  }

  function thumbUrl(game) {
    if (game.cover) return game.cover;
    if (game.image) {
      if (/^https?:\/\//i.test(game.image)) return game.image;
      return "/" + String(game.image).replace(/^\/+/, "");
    }
    return "/api/thumb/" + encodeURIComponent(game.id) + ".png";
  }

  function openGame(game) {
    if (!game) return;
    if (window.ZentraApp && window.ZentraApp.openGameById) {
      window.ZentraApp.openGameById(game.id);
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function buildSlideList(pool) {
    if (pool.length <= 24) return pool.slice();
    var out = [];
    var step = pool.length / 24;
    for (var i = 0; i < 24; i++) {
      out.push(pool[Math.floor(i * step)]);
    }
    return out;
  }

  function buildMiniCard(game, index) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "home-random-mini game-card";
    btn.style.setProperty("--i", String(index % 12));
    btn.innerHTML =
      '<span class="home-random-mini__thumb">' +
      '<img src="' +
      thumbUrl(game) +
      '" alt="" loading="lazy" decoding="async" />' +
      "</span>" +
      '<span class="home-random-mini__title">' +
      escapeHtml(game.title) +
      "</span>";
    btn.addEventListener("click", function () {
      openGame(game);
    });
    var img = btn.querySelector("img");
    if (img) {
      img.addEventListener("error", function () {
        img.src = "/api/thumb/" + encodeURIComponent(game.id) + ".png";
      });
    }
    return btn;
  }

  function appendCards(track, list) {
    list.forEach(function (game, i) {
      track.appendChild(buildMiniCard(game, i));
    });
  }

  function renderStage(list) {
    if (!stage || !stageTrack) return;
    var pool = playable(list);
    if (pool.length < 2) {
      stage.hidden = true;
      stageTrack.innerHTML = "";
      slideGames = [];
      return;
    }
    slideGames = buildSlideList(pool);
    stage.hidden = false;
    stageTrack.innerHTML = "";
    appendCards(stageTrack, slideGames);
    appendCards(stageTrack, slideGames);
  }

  function renderGotd(list) {
    if (!gotdCard) return;
    var pool = playable(list);
    if (!pool.length) {
      gotdCard.hidden = true;
      return;
    }
    var game = pool[dayIndex(pool.length)];
    gotdCard.hidden = false;
    gotdCard.innerHTML =
      '<span class="home-gotd-card__thumb">' +
      '<img src="' +
      thumbUrl(game) +
      '" alt="" loading="eager" decoding="async" />' +
      '<span class="home-gotd-card__play" aria-hidden="true">Play</span>' +
      "</span>" +
      '<span class="home-gotd-card__meta">' +
      '<span class="home-gotd-card__label">Today\'s pick</span>' +
      '<span class="home-gotd-card__title">' +
      escapeHtml(game.title) +
      "</span>" +
      '<span class="home-gotd-card__cta">Launch game</span>' +
      "</span>";
    gotdCard.onclick = function () {
      openGame(game);
    };
    var img = gotdCard.querySelector("img");
    if (img) {
      img.addEventListener("error", function () {
        img.src = "/api/thumb/" + encodeURIComponent(game.id) + ".png";
      });
    }
    if (gotdDate) gotdDate.textContent = formatToday();
  }

  function pickRandom() {
    var pool = playable(games);
    if (!pool.length) return;
    var game = pool[Math.floor(Math.random() * pool.length)];
    if (randomResult) {
      randomResult.hidden = false;
      randomResult.textContent = "Rolling…";
    }
    setTimeout(function () {
      if (randomResult) {
        randomResult.textContent = "Picked: " + game.title;
      }
      openGame(game);
    }, 420);
  }

  function hydrate(list) {
    games = Array.isArray(list) ? list : [];
    renderGotd(games);
    renderStage(games);
  }

  if (randomBtn) {
    randomBtn.addEventListener("click", pickRandom);
  }

  window.addEventListener("zentra-games-ready", function (e) {
    hydrate((e.detail && e.detail.games) || []);
  });

  if (window.ZentraApp && window.ZentraApp.getGames) {
    var existing = window.ZentraApp.getGames();
    if (existing.length) hydrate(existing);
  }
})();
