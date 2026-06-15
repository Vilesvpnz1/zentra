(function () {
  var grid = document.getElementById("apps-grid");
  var warmStarted = false;

  var apps = [
    {
      id: "youtube",
      name: "YouTube",
      desc: "Full YouTube home, search, and watch through Zentra",
      tag: "Media",
      accent: "#ff0033",
      url: "/app-viewer/apps/proxy/?embed=1&zentra=1#https://www.youtube.com/",
      icon:
        '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="3" fill="currentColor" opacity="0.18"/><path d="M10 9.5v5l5-2.5-5-2.5z" fill="currentColor"/></svg>',
    },
    {
      id: "tiktok",
      name: "TikTok",
      desc: "Browse TikTok For You and profiles through Zentra",
      tag: "Social",
      accent: "#69c9d0",
      url: "/app-viewer/apps/proxy/?embed=1&zentra=1#https://www.tiktok.com/",
      icon:
        '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M16.5 3c.6 3.1 2.6 5.2 5.5 5.5v3.8c-2 0-3.8-.6-5.5-1.7v7.4c0 4.2-3.4 7.6-7.6 7.6S1.3 18.2 1.3 14 4.7 6.4 8.9 6.4c.7 0 1.4.1 2 .3v3.9a4.2 4.2 0 0 0-2-.5c-2.3 0-4.2 1.9-4.2 4.2s1.9 4.2 4.2 4.2 4.2-1.9 4.2-4.2V3h3.4z" fill="currentColor"/></svg>',
    },
    {
      id: "snapchat",
      name: "Snapchat",
      desc: "Open Snapchat web and stories through Zentra",
      tag: "Social",
      accent: "#fffc00",
      url: "/app-viewer/apps/proxy/?embed=1&zentra=1#https://www.snapchat.com/",
      icon:
        '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M12 2c-2.2 0-4.5.4-6.2 2.2-.9.9-1.5 2.1-1.7 3.4 1.1.3 2.1.8 3 1.4-.4-.9-.6-1.8-.6-2.8 0-.6.5-1 1-1s1 .4 1 1c0 2.2 1.8 4 4 4h.5C13 8.1 13 6.1 13 4.5 13 3.1 12.6 2 12 2zm-8.5 6.5c-.3 1.6-.1 3.3.6 4.8-.8.2-1.6.6-2.2 1.1-.5.4-.4 1 .2 1.1 1 .2 2 .5 2.9.9-.6.9-1 2-1 3.1 0 .6.5 1 1 1h13c.6 0 1-.4 1-1 0-1.1-.4-2.2-1-3.1.9-.4 1.9-.7 2.9-.9.6-.1.7-.7.2-1.1-.6-.5-1.4-.9-2.2-1.1.7-1.5.9-3.2.6-4.8-1 .8-2.2 1.4-3.5 1.7-.3 1.9-2 3.3-4 3.3s-3.7-1.4-4-3.3c-1.3-.3-2.5-.9-3.5-1.7z" fill="currentColor"/></svg>',
    },
    {
      id: "chatgpt",
      name: "ChatGPT",
      desc: "Use ChatGPT in your browser through Zentra",
      tag: "AI",
      accent: "#10a37f",
      url: "/app-viewer/apps/proxy/?embed=1&zentra=1#https://chatgpt.com/",
      icon:
        '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M12 2a6.2 6.2 0 0 0-5.9 4.2 4.8 4.8 0 0 0-1.8 9.2 5.2 5.2 0 0 0 2.5 4.3 5.2 5.2 0 0 0 7.4 0 5.2 5.2 0 0 0 2.5-4.3 4.8 4.8 0 0 0-1.8-9.2A6.2 6.2 0 0 0 12 2zm0 2.2c1.1 0 2.1.4 2.9 1.1-.8.2-1.6.5-2.3.9A4.8 4.8 0 0 0 7.3 9.5c0 .5.1 1 .2 1.5A6.2 6.2 0 0 1 12 4.2zm-4.8 6.8c0-1.7 1.1-3.2 2.7-3.8.7 1.5 2.2 2.5 3.9 2.6-.2.8-.3 1.6-.3 2.4 0 .4 0 .8.1 1.2-.9-.3-1.7-.8-2.4-1.4a3.8 3.8 0 0 1-2-1zm9.6 0a3.8 3.8 0 0 1-2 1c-.7.6-1.5 1.1-2.4 1.4.1-.4.1-.8.1-1.2 0-.8-.1-1.6-.3-2.4 1.7-.1 3.2-1.1 3.9-2.6 1.6.6 2.7 2.1 2.7 3.8z" fill="currentColor"/></svg>',
    },
    {
      id: "instagram",
      name: "Instagram",
      desc: "Browse Instagram feed and reels through Zentra",
      tag: "Social",
      accent: "#e1306c",
      url: "/app-viewer/apps/proxy/?embed=1&zentra=1#https://www.instagram.com/",
      icon:
        '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="currentColor" opacity="0.15"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.4" cy="6.6" r="1.2" fill="currentColor"/></svg>',
    },
    {
      id: "gauthai",
      name: "Gauth AI",
      desc: "Homework help and AI answers through Zentra",
      tag: "AI",
      accent: "#ff6b35",
      url: "/app-viewer/apps/proxy/?embed=1&zentra=1#https://www.gauthmath.com/",
      icon:
        '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M12 2l8 4.5v9L12 20 4 15.5v-9L12 2zm0 2.2L6 7.4v7.2l6 3.4 6-3.4V7.4l-6-3.2zM11 8h2v5h-2V8zm0 6h2v2h-2v-2z" fill="currentColor"/></svg>',
    },
  ];

  function injectWarmHints() {
    if (document.getElementById("apps-warm-hints")) return;
    var head = document.head;
    if (!head) return;
    var wrap = document.createElement("div");
    wrap.id = "apps-warm-hints";
    wrap.hidden = true;
    var hints = [
      { rel: "preconnect", href: "https://www.youtube.com", crossOrigin: "" },
      { rel: "preconnect", href: "https://www.tiktok.com" },
      { rel: "preconnect", href: "https://www.snapchat.com" },
      { rel: "preconnect", href: "https://chatgpt.com" },
      { rel: "preconnect", href: "https://www.instagram.com" },
      { rel: "preconnect", href: "https://www.gauthmath.com" },
      { rel: "dns-prefetch", href: "https://www.youtube.com" },
      { rel: "dns-prefetch", href: "https://www.tiktok.com" },
      { rel: "dns-prefetch", href: "https://www.snapchat.com" },
      { rel: "dns-prefetch", href: "https://chatgpt.com" },
      { rel: "dns-prefetch", href: "https://www.instagram.com" },
      { rel: "dns-prefetch", href: "https://www.gauthmath.com" },
      { rel: "prefetch", href: "/app-viewer/apps/proxy/?embed=1&zentra=1" },
      { rel: "preload", href: "/sail/scram/scramjet.all.js", as: "script" },
      { rel: "preload", href: "/sail/baremux/index.js", as: "script" },
    ];
    hints.forEach(function (hint) {
      var link = document.createElement("link");
      link.rel = hint.rel;
      link.href = hint.href;
      if (hint.as) link.as = hint.as;
      if (hint.crossOrigin !== undefined) link.crossOrigin = hint.crossOrigin;
      wrap.appendChild(link);
    });
    head.appendChild(wrap);
  }

  function warm() {
    if (warmStarted) return;
    warmStarted = true;
    injectWarmHints();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sail/sw.js").catch(function () {});
    }
  }

  function openApp(app) {
    if (!app) return;
    warm();
    window.location.assign(app.url);
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
      card.addEventListener("mouseenter", warm, { once: true });
      card.addEventListener("focus", warm, { once: true });
      card.addEventListener("click", function () {
        openApp(app);
      });
      grid.appendChild(card);
    });
  }

  var navApps = document.getElementById("nav-apps");
  if (navApps) {
    navApps.addEventListener("mouseenter", warm, { once: true });
    navApps.addEventListener("focus", warm, { once: true });
  }

  injectWarmHints();
  renderGrid();

  window.KritikalApps = {
    render: renderGrid,
    warm: warm,
    open: function (id) {
      renderGrid();
      warm();
      for (var i = 0; i < apps.length; i++) {
        if (apps[i].id === id) {
          openApp(apps[i]);
          return;
        }
      }
    },
    close: function () {},
  };
})();
