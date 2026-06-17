(function () {
  var grid = document.getElementById("apps-grid");
  var warmStarted = false;

  var proxy = "/app-viewer/apps/proxy/?embed=1&zentra=1#";

  var apps = [
    {
      id: "youtube",
      name: "YouTube",
      desc: "Watch, search, and browse YouTube inside Zentra",
      tag: "Media",
      accent: "#ff0033",
      url: proxy + "https://www.youtube.com/",
      icon: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="3" fill="currentColor" opacity="0.18"/><path d="M10 9.5v5l5-2.5-5-2.5z" fill="currentColor"/></svg>',
    },
    {
      id: "spotify",
      name: "Spotify",
      desc: "Stream music and playlists through the proxy",
      tag: "Media",
      accent: "#1db954",
      url: proxy + "https://open.spotify.com/",
      icon: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15"/><path d="M7 15c3.5-1 7.5-.5 10 1M7 12c4-1 8.5-.3 11 1.2M8 9c3.5-.8 7-.3 9 .8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    },
    {
      id: "discord",
      name: "Discord",
      desc: "Open Discord web for servers and voice chat",
      tag: "Social",
      accent: "#5865f2",
      url: proxy + "https://discord.com/app",
      icon: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M18.9 5.5A15 15 0 0 0 15.5 4l-.4.8a13 13 0 0 0-6.2 0L8.5 4A15 15 0 0 0 5.1 5.5 17 17 0 0 0 3 18.2l.1.1a16 16 0 0 0 4.9 2.5l.6-.9a11 11 0 0 1-2.4-1.2l.6-.3a8 8 0 0 0 7.4 0l.6.3a11 11 0 0 1-2.4 1.2l.6.9a16 16 0 0 0 4.9-2.5l.1-.1A17 17 0 0 0 18.9 5.5zM9.5 14.8c-.9 0-1.6-.8-1.6-1.7s.7-1.7 1.6-1.7 1.6.8 1.6 1.7-.7 1.7-1.6 1.7zm5 0c-.9 0-1.6-.8-1.6-1.7s.7-1.7 1.6-1.7 1.6.8 1.6 1.7-.7 1.7-1.6 1.7z" fill="currentColor"/></svg>',
    },
    {
      id: "tiktok",
      name: "TikTok",
      desc: "Scroll For You and creator profiles in browser",
      tag: "Social",
      accent: "#69c9d0",
      url: proxy + "https://www.tiktok.com/",
      icon: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M16.5 3c.6 3.1 2.6 5.2 5.5 5.5v3.8c-2 0-3.8-.6-5.5-1.7v7.4c0 4.2-3.4 7.6-7.6 7.6S1.3 18.2 1.3 14 4.7 6.4 8.9 6.4c.7 0 1.4.1 2 .3v3.9a4.2 4.2 0 0 0-2-.5c-2.3 0-4.2 1.9-4.2 4.2s1.9 4.2 4.2 4.2 4.2-1.9 4.2-4.2V3h3.4z" fill="currentColor"/></svg>',
    },
    {
      id: "instagram",
      name: "Instagram",
      desc: "Browse feed, reels, and profiles on the web",
      tag: "Social",
      accent: "#e1306c",
      url: proxy + "https://www.instagram.com/",
      icon: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="currentColor" opacity="0.15"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.4" cy="6.6" r="1.2" fill="currentColor"/></svg>',
    },
    {
      id: "snapchat",
      name: "Snapchat",
      desc: "Use Snapchat web for stories and chat",
      tag: "Social",
      accent: "#fffc00",
      url: proxy + "https://www.snapchat.com/",
      icon: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M12 2c-2.2 0-4.5.4-6.2 2.2-.9.9-1.5 2.1-1.7 3.4 1.1.3 2.1.8 3 1.4-.4-.9-.6-1.8-.6-2.8 0-.6.5-1 1-1s1 .4 1 1c0 2.2 1.8 4 4 4h.5C13 8.1 13 6.1 13 4.5 13 3.1 12.6 2 12 2z" fill="currentColor"/></svg>',
    },
    {
      id: "reddit",
      name: "Reddit",
      desc: "Read communities and threads without an app",
      tag: "Social",
      accent: "#ff4500",
      url: proxy + "https://www.reddit.com/",
      icon: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.12"/><circle cx="8.5" cy="11" r="1.2" fill="currentColor"/><circle cx="15.5" cy="11" r="1.2" fill="currentColor"/><path d="M8 14.5c1 .8 2.2 1.2 4 1.2s3-.4 4-1.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    },
    {
      id: "twitter",
      name: "X",
      desc: "Browse posts and trends on X in the browser",
      tag: "Social",
      accent: "#e7e9ea",
      url: proxy + "https://x.com/",
      icon: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M4 4l16 16M20 4L4 20" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    },
    {
      id: "chatgpt",
      name: "ChatGPT",
      desc: "Use ChatGPT for writing, ideas, and homework help",
      tag: "AI",
      accent: "#10a37f",
      url: proxy + "https://chatgpt.com/",
      icon: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M12 2a6.2 6.2 0 0 0-5.9 4.2 4.8 4.8 0 0 0-1.8 9.2 5.2 5.2 0 0 0 2.5 4.3 5.2 5.2 0 0 0 7.4 0 5.2 5.2 0 0 0 2.5-4.3 4.8 4.8 0 0 0-1.8-9.2A6.2 6.2 0 0 0 12 2z" fill="currentColor" opacity="0.9"/></svg>',
    },
    {
      id: "gauthai",
      name: "Gauth AI",
      desc: "Step by step math and homework answers",
      tag: "AI",
      accent: "#ff6b35",
      url: proxy + "https://www.gauthmath.com/",
      icon: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M12 2l8 4.5v9L12 20 4 15.5v-9L12 2z" fill="currentColor" opacity="0.2"/><path d="M11 8h2v5h-2V8zm0 6h2v2h-2v-2z" fill="currentColor"/></svg>',
    },
    {
      id: "google",
      name: "Google",
      desc: "Search the web when filters block Google directly",
      tag: "Tools",
      accent: "#4285f4",
      url: proxy + "https://www.google.com/",
      icon: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M12 2a10 10 0 1 0 4.2 19.1h-2.8v-2.4H12a7.6 7.6 0 1 1 2.2-5.4H12V10h6.5c.2 1 .3 2 .3 3a10 10 0 0 1-6.8 9z" fill="currentColor"/></svg>',
    },
    {
      id: "gmail",
      name: "Gmail",
      desc: "Check email in a tab that looks like school work",
      tag: "Tools",
      accent: "#ea4335",
      url: proxy + "https://mail.google.com/",
      icon: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M4 6h16v12H4V6zm0 0l8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    },
    {
      id: "drive",
      name: "Google Drive",
      desc: "Open docs and files stored in your Drive",
      tag: "School",
      accent: "#34a853",
      url: proxy + "https://drive.google.com/",
      icon: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M8 4h8l6 10H2L8 4z" fill="currentColor" opacity="0.2"/><path d="M8 4l4 7H2L8 4zm8 0l4 7h-8l4-7zm-4 7l4 10H6l4-10z" fill="currentColor"/></svg>',
    },
    {
      id: "classroom",
      name: "Google Classroom",
      desc: "Jump to Classroom assignments and streams",
      tag: "School",
      accent: "#1e8e3e",
      url: proxy + "https://classroom.google.com/",
      icon: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><rect x="4" y="6" width="16" height="12" rx="2" fill="currentColor" opacity="0.15"/><path d="M8 10h8M8 13h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    },
    {
      id: "docs",
      name: "Google Docs",
      desc: "Write and edit documents in the browser",
      tag: "School",
      accent: "#4285f4",
      url: proxy + "https://docs.google.com/document/",
      icon: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M7 3h7l5 5v13H7V3z" fill="currentColor" opacity="0.15"/><path d="M14 3v5h5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
    },
    {
      id: "canva",
      name: "Canva",
      desc: "Design posters, slides, and graphics online",
      tag: "Tools",
      accent: "#00c4cc",
      url: proxy + "https://www.canva.com/",
      icon: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.12"/><path d="M8 15c1-3 2.5-5 4-5s2 1 3 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    },
    {
      id: "netflix",
      name: "Netflix",
      desc: "Browse Netflix when you have an account signed in",
      tag: "Media",
      accent: "#e50914",
      url: proxy + "https://www.netflix.com/",
      icon: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M6 4l4 16 2-10 2 10 4-16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    },
    {
      id: "twitch",
      name: "Twitch",
      desc: "Watch live streams and VODs on Twitch",
      tag: "Media",
      accent: "#9146ff",
      url: proxy + "https://www.twitch.tv/",
      icon: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M4 4h16v12h-5l-3 3v-3H4V4zm4 3v6h2V7H8zm5 0v6h2V7h-2z" fill="currentColor"/></svg>',
    },
    {
      id: "pinterest",
      name: "Pinterest",
      desc: "Find inspiration boards and image ideas",
      tag: "Social",
      accent: "#e60023",
      url: proxy + "https://www.pinterest.com/",
      icon: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.12"/><path d="M12 8c-1.5 0-2.5 1-2.5 2.2 0 .8.4 1.4 1 1.7-.1.7-.3 1.6-.5 2.3-.7-.2-2.3-.9-2.3-3.4 0-2.2 1.7-4.2 4.8-4.2 2.6 0 4.2 1.5 4.2 3.6 0 2.4-1 4.2-2.6 4.2-.8 0-1.4-.7-1.2-1.5.2-.7.7-1.5.7-2 0-.5-.3-.9-.9-.9-1 0-1.8 1.4-1.8 3 0 1.1.4 1.8 1 1.8.3 0 .6-.2.8-.5l.2 1c-.3.6-1 1.2-2.2 1.2-1.8 0-3-1.6-3-3.7C7.5 9.8 9.5 8 12 8z" fill="currentColor"/></svg>',
    },
    {
      id: "wikipedia",
      name: "Wikipedia",
      desc: "Research topics with open encyclopedia articles",
      tag: "School",
      accent: "#ccc",
      url: proxy + "https://www.wikipedia.org/",
      icon: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M5 5h14v2l-4 12h-2L9 7H5V5zm7 0v14" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
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
