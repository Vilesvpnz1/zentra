(function () {
  var recentWrap = document.getElementById("library-recent-wrap");
  var favWrap = document.getElementById("library-fav-wrap");
  var recentRow = document.getElementById("library-recent-row");
  var favRow = document.getElementById("library-fav-row");
  var gamesById = {};

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function thumbUrl(game) {
    if (!game) return "";
    if (game.cover) return game.cover;
    if (game.image) {
      if (/^https?:\/\//i.test(game.image)) return game.image;
      return "/" + String(game.image).replace(/^\/+/, "");
    }
    return "/api/thumb/" + encodeURIComponent(game.id) + ".png";
  }

  function indexGames(list) {
    gamesById = {};
    (list || []).forEach(function (g) {
      if (g && g.id) gamesById[g.id] = g;
    });
  }

  function buildChip(game) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "library-chip";
    btn.innerHTML =
      '<img src="' +
      esc(thumbUrl(game)) +
      '" alt="" width="44" height="44" loading="lazy" decoding="async" />' +
      "<span>" +
      esc(game.title) +
      "</span>";
    btn.addEventListener("click", function () {
      if (window.KobranApp && window.KobranApp.openGameById) window.KobranApp.openGameById(game.id);
    });
    var img = btn.querySelector("img");
    if (img) {
      img.addEventListener("error", function () {
        img.src = "/api/thumb/" + encodeURIComponent(game.id) + ".png";
      });
    }
    return btn;
  }

  function renderRow(rowEl, wrapEl, ids) {
    if (!rowEl || !wrapEl) return;
    rowEl.innerHTML = "";
    var items = [];
    (ids || []).forEach(function (id) {
      var gid = typeof id === "string" ? id : id && id.id;
      if (gid && gamesById[gid]) items.push(gamesById[gid]);
    });
    if (!items.length) {
      wrapEl.hidden = true;
      return;
    }
    wrapEl.hidden = false;
    items.slice(0, 12).forEach(function (game) {
      rowEl.appendChild(buildChip(game));
    });
  }

  function render(lib) {
    lib = lib || (window.KobranLibrary && window.KobranLibrary.snapshot ? window.KobranLibrary.snapshot() : null);
    if (!lib) return;
    renderRow(recentRow, recentWrap, (lib.recent || []).map(function (r) { return r.id; }));
    renderRow(favRow, favWrap, lib.favorites || []);
  }

  window.addEventListener("kobran-games-ready", function (e) {
    indexGames((e.detail && e.detail.games) || []);
    if (window.KobranLibrary && window.KobranLibrary.init) {
      window.KobranLibrary.init().then(render);
    }
  });

  window.addEventListener("kobran-library", function (e) {
    render((e.detail && e.detail) || null);
  });

  if (window.KobranApp && window.KobranApp.getGames) {
    var existing = window.KobranApp.getGames();
    if (existing.length) {
      indexGames(existing);
      if (window.KobranLibrary && window.KobranLibrary.init) window.KobranLibrary.init().then(render);
    }
  }
})();
