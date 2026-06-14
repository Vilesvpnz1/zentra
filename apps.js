(function () {
  var grid = document.getElementById("apps-grid");
  var player = document.getElementById("apps-player");
  var frame = document.getElementById("apps-player-frame");
  var titleEl = document.getElementById("apps-player-title");
  var backBtn = document.getElementById("apps-player-back");
  var fsBtn = document.getElementById("apps-player-fs");
  var preloadDone = false;

  var apps = [
    {
      id: "youtube",
      name: "YouTube",
      desc: "Full YouTube home, search, and watch through Zentra",
      tag: "Media",
      accent: "#ff0033",
      icon:
        '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="3" fill="currentColor" opacity="0.18"/><path d="M10 9.5v5l5-2.5-5-2.5z" fill="currentColor"/></svg>',
      proxy: "/apps-proxy.html#https://www.youtube.com/",
    },
  ];

  function appProxyUrl(app) {
    return app.proxy;
  }

  function injectWarmHints() {
    if (document.getElementById("apps-warm-hints")) return;
    var head = document.head;
    if (!head) return;
    var wrap = document.createElement("div");
    wrap.id = "apps-warm-hints";
    wrap.hidden = true;
    var hints = [
      { rel: "preconnect", href: "https://www.youtube.com" },
      { rel: "dns-prefetch", href: "https://www.youtube.com" },
      { rel: "prefetch", href: "/apps-proxy.html" },
      { rel: "preload", href: "/sail/scram/scramjet.all.js", as: "script" },
      { rel: "preload", href: "/sail/baremux/index.js", as: "script" },
    ];
    hints.forEach(function (hint) {
      var link = document.createElement("link");
      link.rel = hint.rel;
      link.href = hint.href;
      if (hint.as) link.as = hint.as;
      if (hint.rel === "preconnect") link.crossOrigin = "";
      wrap.appendChild(link);
    });
    head.appendChild(wrap);
  }

  function preloadDefaultApp() {
    if (preloadDone || !frame || !apps.length) return;
    preloadDone = true;
    injectWarmHints();
    if (!frame.getAttribute("loading")) frame.setAttribute("loading", "eager");
    if (!frame.getAttribute("fetchpriority")) frame.setAttribute("fetchpriority", "high");
    frame.src = appProxyUrl(apps[0]);
  }

  function resolveProxy(url) {
    try {
      return new URL(url, window.location.origin).href;
    } catch (e) {
      return url;
    }
  }

  function openApp(app) {
    if (!player || !frame || !app) return;
    if (titleEl) titleEl.textContent = app.name;
    player.hidden = false;
    var url = appProxyUrl(app);
    var resolved = resolveProxy(url);
    if (frame.src !== resolved) frame.src = url;
    player.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function closePlayer() {
    if (!player) return;
    player.hidden = true;
  }

  function renderGrid() {
    if (!grid) return;
    grid.innerHTML = "";
    apps.forEach(function (app, index) {
      var card = document.createElement("button");
      card.type = "button";
      card.className = "apps-card";
      card.style.setProperty("--i", String(index % 16));
      if (app.accent) card.style.setProperty("--apps-accent", app.accent);
      card.innerHTML =
        '<span class="apps-card__shine" aria-hidden="true"></span>' +
        '<span class="apps-card__icon">' +
        (app.icon || "") +
        "</span>" +
        '<span class="apps-card__tag">' +
        app.tag +
        '</span><span class="apps-card__title">' +
        app.name +
        '</span><span class="apps-card__desc">' +
        app.desc +
        "</span>";
      card.addEventListener("click", function () {
        openApp(app);
      });
      grid.appendChild(card);
    });
    preloadDefaultApp();
  }

  if (backBtn) backBtn.addEventListener("click", closePlayer);
  if (fsBtn) {
    fsBtn.addEventListener("click", function () {
      var wrap = document.querySelector(".apps-player__frame-wrap");
      var el = wrap || frame;
      if (!el) return;
      if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen();
      else if (document.exitFullscreen) document.exitFullscreen();
    });
  }

  window.KritikalApps = {
    render: renderGrid,
    warm: preloadDefaultApp,
    open: function (id) {
      renderGrid();
      for (var i = 0; i < apps.length; i++) {
        if (apps[i].id === id) {
          openApp(apps[i]);
          return;
        }
      }
    },
    close: closePlayer,
  };

  renderGrid();
})();
