(function () {
  var grid = document.getElementById("apps-grid");
  var shell = document.querySelector(".apps-shell");
  var player = document.getElementById("apps-player");
  var playerTitle = document.getElementById("apps-player-title");
  var playerBack = document.getElementById("apps-player-back");
  var playerFs = document.getElementById("apps-player-fs");
  var playerMount = document.getElementById("apps-player-mount");
  var playerLoader = document.getElementById("apps-player-loader");
  var playerLoaderText = document.getElementById("apps-player-loader-text");
  var warmStarted = false;
  var activeApp = null;

  var proxy = "/sail/embed/?embed=1#";

  function favicon(domain) {
    return (
      '<img class="apps-card__icon-img" src="https://www.google.com/s2/favicons?domain=' +
      encodeURIComponent(domain) +
      '&sz=128" width="32" height="32" alt="" loading="eager" decoding="async" />'
    );
  }

  var apps = [
    {
      id: "youtube",
      name: "YouTube",
      desc: "Watch, search, and browse YouTube inside Zentra",
      tag: "Media",
      accent: "#ff0033",
      domain: "youtube.com",
      url: proxy + "https://www.youtube.com/",
    },
    {
      id: "spotify",
      name: "Spotify",
      desc: "Stream music and playlists through the proxy",
      tag: "Media",
      accent: "#1db954",
      domain: "open.spotify.com",
      url: proxy + "https://open.spotify.com/",
    },
    {
      id: "discord",
      name: "Discord",
      desc: "Open Discord web for servers and voice chat",
      tag: "Social",
      accent: "#5865f2",
      domain: "discord.com",
      url: proxy + "https://discord.com/app",
    },
    {
      id: "tiktok",
      name: "TikTok",
      desc: "Scroll For You and creator profiles in browser",
      tag: "Social",
      accent: "#69c9d0",
      domain: "tiktok.com",
      url: proxy + "https://www.tiktok.com/",
    },
    {
      id: "instagram",
      name: "Instagram",
      desc: "Browse feed, reels, and profiles on the web",
      tag: "Social",
      accent: "#e1306c",
      domain: "instagram.com",
      url: proxy + "https://www.instagram.com/",
    },
    {
      id: "snapchat",
      name: "Snapchat",
      desc: "Use Snapchat web for stories and chat",
      tag: "Social",
      accent: "#fffc00",
      domain: "snapchat.com",
      url: proxy + "https://www.snapchat.com/",
    },
    {
      id: "reddit",
      name: "Reddit",
      desc: "Read communities and threads without an app",
      tag: "Social",
      accent: "#ff4500",
      domain: "reddit.com",
      url: proxy + "https://www.reddit.com/",
    },
    {
      id: "twitter",
      name: "X",
      desc: "Browse posts and trends on X in the browser",
      tag: "Social",
      accent: "#e7e9ea",
      domain: "x.com",
      url: proxy + "https://x.com/",
    },
    {
      id: "chatgpt",
      name: "ChatGPT",
      desc: "Use ChatGPT for writing, ideas, and homework help",
      tag: "AI",
      accent: "#10a37f",
      domain: "chatgpt.com",
      url: proxy + "https://chatgpt.com/",
    },
    {
      id: "gauthai",
      name: "Gauth AI",
      desc: "Step by step math and homework answers",
      tag: "AI",
      accent: "#ff6b35",
      domain: "gauthmath.com",
      url: proxy + "https://www.gauthmath.com/",
    },
    {
      id: "google",
      name: "Google",
      desc: "Search the web when filters block Google directly",
      tag: "Tools",
      accent: "#4285f4",
      domain: "google.com",
      url: proxy + "https://www.google.com/",
    },
    {
      id: "gmail",
      name: "Gmail",
      desc: "Check email in a tab that looks like school work",
      tag: "Tools",
      accent: "#ea4335",
      domain: "mail.google.com",
      url: proxy + "https://mail.google.com/",
    },
    {
      id: "drive",
      name: "Google Drive",
      desc: "Open docs and files stored in your Drive",
      tag: "School",
      accent: "#34a853",
      domain: "drive.google.com",
      url: proxy + "https://drive.google.com/",
    },
    {
      id: "classroom",
      name: "Google Classroom",
      desc: "Jump to Classroom assignments and streams",
      tag: "School",
      accent: "#1e8e3e",
      domain: "classroom.google.com",
      url: proxy + "https://classroom.google.com/",
    },
    {
      id: "docs",
      name: "Google Docs",
      desc: "Write and edit documents in the browser",
      tag: "School",
      accent: "#4285f4",
      domain: "docs.google.com",
      url: proxy + "https://docs.google.com/document/",
    },
    {
      id: "canva",
      name: "Canva",
      desc: "Design posters, slides, and graphics online",
      tag: "Tools",
      accent: "#00c4cc",
      domain: "canva.com",
      url: proxy + "https://www.canva.com/",
    },
    {
      id: "netflix",
      name: "Netflix",
      desc: "Browse Netflix when you have an account signed in",
      tag: "Media",
      accent: "#e50914",
      domain: "netflix.com",
      url: proxy + "https://www.netflix.com/",
    },
    {
      id: "twitch",
      name: "Twitch",
      desc: "Watch live streams and VODs on Twitch",
      tag: "Media",
      accent: "#9146ff",
      domain: "twitch.tv",
      url: proxy + "https://www.twitch.tv/",
    },
    {
      id: "pinterest",
      name: "Pinterest",
      desc: "Find inspiration boards and image ideas",
      tag: "Social",
      accent: "#e60023",
      domain: "pinterest.com",
      url: proxy + "https://www.pinterest.com/",
    },
    {
      id: "wikipedia",
      name: "Wikipedia",
      desc: "Research topics with open encyclopedia articles",
      tag: "School",
      accent: "#ccc",
      domain: "wikipedia.org",
      url: proxy + "https://www.wikipedia.org/",
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
      { rel: "dns-prefetch", href: "https://www.youtube.com" },
      { rel: "dns-prefetch", href: "https://www.tiktok.com" },
      { rel: "dns-prefetch", href: "https://www.snapchat.com" },
      { rel: "dns-prefetch", href: "https://chatgpt.com" },
      { rel: "dns-prefetch", href: "https://www.instagram.com" },
      { rel: "prefetch", href: "/sail/embed/?embed=1" },
      { rel: "dns-prefetch", href: "https://www.gauthmath.com" },
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
      navigator.serviceWorker.register("/sail/sw.js", { scope: "/" }).catch(function () {
        navigator.serviceWorker.register("/sail/sw.js", { scope: "/sail/" }).catch(function () {});
      });
    }
  }

  function closePlayer() {}

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
        favicon(app.domain) +
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

  if (playerBack) {
    playerBack.addEventListener("click", function () {
      window.location.hash = "#apps";
      window.location.pathname = "/";
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
    close: closePlayer,
  };
})();
