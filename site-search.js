(function () {
  var input = document.getElementById("site-search-input");
  var panel = document.getElementById("site-search-panel");
  var list = document.getElementById("site-search-list");
  var root = document.getElementById("site-search");
  var index = [];
  var activeIndex = -1;
  var debounceTimer = 0;

  function push(item) {
    index.push(item);
  }

  function buildStaticIndex() {
    index = [];
    var pages = [
      { title: "Games", group: "Pages", keywords: "play game library", view: "games" },
      { title: "Hub", group: "Pages", keywords: "proxies extras", view: "hub" },
      { title: "Browser", group: "Pages", keywords: "web search duckduckgo browse internet surf", view: "browser" },
      { title: "Entertainment", group: "Pages", keywords: "movies music watch listen", view: "entertainment" },
      { title: "Movies", group: "Entertainment", keywords: "film watch vidking tmdb", view: "entertainment", sub: "movies" },
      { title: "Music", group: "Entertainment", keywords: "songs tracks audius player", view: "entertainment", sub: "music" },
      { title: "News", group: "Pages", keywords: "announcements updates news", view: "announcements" },
      { title: "Tutorial", group: "Pages", keywords: "guide help how to", view: "tutorial" },
      { title: "Chat", group: "Pages", keywords: "talk messages global", view: "chat" },
      { title: "Tab Cloaking", group: "Pages", keywords: "disguise favicon title google classroom drive discord cloak", view: "tab-cloak" },
      { title: "More", group: "Pages", keywords: "extra tools api proxies", view: "more", sub: "home" },
      { title: "Extra shit", group: "More", keywords: "more home extras", view: "more", sub: "home" },
      { title: "API", group: "More", keywords: "tools apis search deezer github", view: "more", sub: "api" },
      { title: "AI", group: "More", keywords: "chat groq openai api key llm", view: "more", sub: "ai" },
      { title: "Groq", group: "AI", keywords: "free ai groq llama chat", view: "more", sub: "ai" },
      { title: "Settings", group: "Pages", keywords: "preferences theme appearance", view: "settings" },
      { title: "Quick hide", group: "Features", keywords: "cloak classroom ctrl e lesson emergency", view: "games" },
    ];
    pages.forEach(function (page) {
      push({
        title: page.title,
        desc: page.group,
        group: page.group,
        haystack: (page.title + " " + page.keywords + " " + page.group).toLowerCase(),
        action: "view",
        view: page.view,
        sub: page.sub,
      });
    });

    var settings = [
      "Color theme",
      "Text size",
      "Glow intensity",
      "Text glow",
      "Always show nav labels",
      "Admin panel",
    ];
    settings.forEach(function (label) {
      push({
        title: label,
        desc: "Settings",
        group: "Settings",
        haystack: (label + " settings preference").toLowerCase(),
        action: "view",
        view: "settings",
      });
    });

    if (window.ZentraApiRegistry && window.ZentraApiRegistry.items) {
      window.ZentraApiRegistry.items.forEach(function (tool) {
        push({
          title: tool.name,
          desc: tool.section + " · API",
          group: "API Tools",
          haystack: (tool.name + " " + tool.desc + " " + tool.section + " api tool").toLowerCase(),
          action: "api",
          api: tool.id,
        });
      });
    }

    if (window.KritikalHub && window.KritikalHub.sections) {
      window.KritikalHub.sections.forEach(function (section) {
        section.items.forEach(function (item) {
          push({
            title: item.name,
            desc: section.title + " · Hub",
            group: "Hub",
            haystack: (item.name + " " + item.desc + " " + section.title + " hub").toLowerCase(),
            action: "link",
            href: item.href,
          });
        });
      });
    }
  }

  function addGames(games) {
    index = index.filter(function (item) {
      return item.action !== "game";
    });
    (games || []).forEach(function (game) {
      if (!game || !game.id) return;
      push({
        title: game.title || game.id,
        desc: "Game",
        group: "Games",
        haystack: (game.title + " " + game.id + " " + (game.search || "") + " game play").toLowerCase(),
        action: "game",
        id: game.id,
      });
    });
  }

  function addMovies(movies) {
    index = index.filter(function (item) {
      return item.action !== "movie";
    });
    (movies || []).forEach(function (movie) {
      if (!movie || !movie.title) return;
      push({
        title: movie.title,
        desc: "Movie · Entertainment",
        group: "Movies",
        haystack: (movie.title + " " + (movie.year || "") + " movie film watch entertainment").toLowerCase(),
        action: "movie",
        movieId: movie.id,
        movieTitle: movie.title,
      });
    });
  }

  function score(item, q) {
    var hay = item.haystack || "";
    if (hay.indexOf(q) === 0) return 100;
    if ((item.title || "").toLowerCase().indexOf(q) === 0) return 90;
    if (hay.indexOf(q) !== -1) return 70;
    var parts = q.split(/\s+/).filter(Boolean);
    var hits = 0;
    parts.forEach(function (part) {
      if (hay.indexOf(part) !== -1) hits += 1;
    });
    if (!parts.length) return 0;
    return hits / parts.length > 0.5 ? 40 + hits * 10 : 0;
  }

  function search(q) {
    var query = String(q || "").trim().toLowerCase();
    if (!query) return [];
    return index
      .map(function (item) {
        return { item: item, score: score(item, query) };
      })
      .filter(function (row) {
        return row.score > 0;
      })
      .sort(function (a, b) {
        return b.score - a.score;
      })
      .slice(0, 24)
      .map(function (row) {
        return row.item;
      });
  }

  function closePanel() {
    if (panel) panel.hidden = true;
    if (root) root.classList.remove("site-search--open");
    activeIndex = -1;
  }

  function openPanel() {
    if (panel) panel.hidden = false;
    if (root) root.classList.add("site-search--open");
  }

  function navigate(item) {
    if (!item) return;
    closePanel();
    if (input) input.blur();
    if (item.action === "view" && window.ZentraApp) {
      window.ZentraApp.switchView(item.view);
      if (item.view === "entertainment" && item.sub && window.KritikalEntertainment) {
        window.KritikalEntertainment.open(item.sub);
      }
      if (item.view === "more" && window.KritikalMore) {
        window.KritikalMore.open(item.sub || "home");
      }
      return;
    }
    if (item.action === "browse" && window.KritikalBrowser) {
      window.KritikalBrowser.search(item.query);
      return;
    }
    if (item.action === "api") {
      if (window.ZentraApp) window.ZentraApp.switchView("more");
      if (window.KritikalMore) window.KritikalMore.open("api");
      if (window.KritikalApi) window.KritikalApi.openApi(item.api);
      return;
    }
    if (item.action === "game" && window.ZentraApp) {
      window.ZentraApp.openGameById(item.id);
      return;
    }
    if (item.action === "movie") {
      if (window.ZentraApp) window.ZentraApp.switchView("entertainment");
      if (window.KritikalEntertainment) window.KritikalEntertainment.open("movies");
      if (window.KritikalMovies && window.KritikalMovies.play) {
        window.KritikalMovies.play({ id: item.movieId, title: item.movieTitle });
      }
      return;
    }
    if (item.action === "link" && item.href) {
      window.location.href = item.href;
    }
  }

  function renderResults(items) {
    if (!list) return;
    list.innerHTML = "";
    activeIndex = -1;
    if (!items.length) {
      list.innerHTML = '<li class="site-search__empty">No matches</li>';
      return;
    }
    var lastGroup = "";
    items.forEach(function (item, i) {
      var row = document.createElement("li");
      row.className = "site-search__item";
      row.dataset.index = String(i);
      row.innerHTML =
        '<span class="site-search__item-title">' +
        escapeHtml(item.title) +
        '</span><span class="site-search__item-desc">' +
        escapeHtml(item.desc || "") +
        "</span>";
      row.addEventListener("mousedown", function (e) {
        e.preventDefault();
        navigate(item);
      });
      list.appendChild(row);
    });
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function buildResultItems(q) {
    var query = String(q || "").trim();
    var items = search(query);
    if (query.length >= 2) {
      items.unshift({
        title: 'Search web for "' + query + '"',
        desc: "Browser · DuckDuckGo",
        group: "Browser",
        haystack: query,
        action: "browse",
        query: query,
      });
    }
    return items;
  }

  function runSearch() {
    if (!input) return;
    renderResults(buildResultItems(input.value));
    openPanel();
  }

  function highlightActive() {
    if (!list) return;
    var rows = list.querySelectorAll(".site-search__item");
    rows.forEach(function (row, i) {
      row.classList.toggle("site-search__item--active", i === activeIndex);
    });
    if (activeIndex >= 0 && rows[activeIndex]) {
      rows[activeIndex].scrollIntoView({ block: "nearest" });
    }
  }

  function currentItems() {
    return buildResultItems(input ? input.value : "");
  }

  if (input) {
    input.addEventListener("input", function () {
      clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(runSearch, 80);
    });
    input.addEventListener("focus", function () {
      runSearch();
    });
    input.addEventListener("keydown", function (e) {
      var items = currentItems();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, items.length - 1);
        highlightActive();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        highlightActive();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeIndex >= 0 && items[activeIndex]) navigate(items[activeIndex]);
        else if (items[0]) navigate(items[0]);
      } else if (e.key === "Escape") {
        closePanel();
        input.blur();
      }
    });
  }

  document.addEventListener("click", function (e) {
    if (!root || root.contains(e.target)) return;
    closePanel();
  });

  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (input) {
        input.focus();
        input.select();
        runSearch();
      }
    }
  });

  buildStaticIndex();

  fetch("/api/games")
    .then(function (res) {
      return res.json();
    })
    .then(function (games) {
      addGames(games);
    })
    .catch(function () {
      if (window.ZentraApp && window.ZentraApp.getGames) addGames(window.ZentraApp.getGames());
    });

  fetch("/api/movies/catalog?page=1&limit=500")
    .then(function (res) {
      return res.json();
    })
    .then(function (payload) {
      addMovies(Array.isArray(payload) ? payload : payload.movies || payload.data || []);
    })
    .catch(function () {});

  window.addEventListener("zentra-games-ready", function (e) {
    if (e.detail && e.detail.games) addGames(e.detail.games);
  });

  window.ZentraSearch = {
    refresh: buildStaticIndex,
    addGames: addGames,
  };
})();
