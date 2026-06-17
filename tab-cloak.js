(function () {
  var STORAGE_ACTIVE = "kritikal-tab-cloak-active";
  var STORAGE_CUSTOM = "kritikal-tab-cloak-custom";
  var SITE_TITLE = "Zentra";
  var SITE_ICON = "/favicon.svg";

  var presets = [
    { id: "google", name: "Google", icon: "https://www.google.com/favicon.ico", title: "Google" },
    { id: "google-search", name: "Google Search", icon: "https://www.google.com/favicon.ico", title: "Google Search" },
    { id: "google-docs", name: "Google Docs", icon: "https://ssl.gstatic.com/docs/documents/images/kix-favicon-2023.ico", title: "Google Docs" },
    { id: "google-slides", name: "Google Slides", icon: "https://ssl.gstatic.com/docs/presentations/images/favicon-2023.ico", title: "Google Slides" },
    { id: "google-sheets", name: "Google Sheets", icon: "https://ssl.gstatic.com/docs/spreadsheets/favicon3.ico", title: "Google Sheets" },
    { id: "google-drive", name: "Google Drive", icon: "https://ssl.gstatic.com/images/branding/product/2x/drive_2020q4_48dp.png", title: "My Drive - Google Drive" },
    { id: "gmail", name: "Gmail", icon: "https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico", title: "Gmail" },
    { id: "google-classroom", name: "Google Classroom", icon: "https://classroom.google.com/favicon.ico", title: "Classes" },
    { id: "google-meet", name: "Google Meet", icon: "https://meet.google.com/favicon.ico", title: "Google Meet" },
    { id: "google-calendar", name: "Google Calendar", icon: "https://calendar.google.com/googlecalendar/images/favicons_2020q4/calendar_31.ico", title: "Google Calendar" },
    { id: "google-forms", name: "Google Forms", icon: "https://ssl.gstatic.com/docs/spreadsheets/forms/favicon_qp2.png", title: "Google Forms" },
    { id: "google-sites", name: "Google Sites", icon: "https://ssl.gstatic.com/atari/images/public/favicon.ico", title: "Google Sites" },
    { id: "google-keep", name: "Google Keep", icon: "https://keep.google.com/favicon.ico", title: "Google Keep" },
    { id: "youtube", name: "YouTube", icon: "https://www.youtube.com/s/desktop/favicon_48x48.png", title: "YouTube" },
    { id: "discord", name: "Discord", icon: "https://discord.com/assets/favicon.ico", title: "Discord | Friends" },
    { id: "teams", name: "Microsoft Teams", icon: "https://statics.teams.cdn.office.net/evergreen-assets/safelinks/teams_16.png", title: "Microsoft Teams" },
    { id: "outlook", name: "Outlook", icon: "https://outlook.live.com/favicon.ico", title: "Outlook" },
    { id: "onedrive", name: "OneDrive", icon: "https://onedrive.live.com/favicon.ico", title: "OneDrive" },
    { id: "word-online", name: "Word Online", icon: "https://res.cdn.office.net/assets/mail/pwa/v1/pngs/outlook_app_icon_128.png", title: "Word" },
    { id: "excel-online", name: "Excel Online", icon: "https://res.cdn.office.net/assets/mail/pwa/v1/pngs/outlook_app_icon_128.png", title: "Excel" },
    { id: "powerpoint-online", name: "PowerPoint", icon: "https://res.cdn.office.net/assets/mail/pwa/v1/pngs/outlook_app_icon_128.png", title: "PowerPoint" },
    { id: "sharepoint", name: "SharePoint", icon: "https://static2.sharepointonline.com/files/fabric/assets/brand-icons/product/png/sharepoint_48x1.png", title: "SharePoint" },
    { id: "bing", name: "Bing", icon: "https://www.bing.com/sa/simg/favicon-trans-bg-blue-mg.ico", title: "Search - Microsoft Bing" },
    { id: "wikipedia", name: "Wikipedia", icon: "https://en.wikipedia.org/static/favicon/wikipedia.ico", title: "Wikipedia, the free encyclopedia" },
    { id: "khan-academy", name: "Khan Academy", icon: "https://cdn.kastatic.org/images/favicon.ico", title: "Khan Academy" },
    { id: "canvas", name: "Canvas LMS", icon: "https://www.instructure.com/favicon.ico", title: "Dashboard" },
    { id: "schoology", name: "Schoology", icon: "https://asset-cdn.schoology.com/sites/all/themes/schoology_theme/favicon.ico", title: "Home | Schoology" },
    { id: "clever", name: "Clever", icon: "https://clever.com/favicon.ico", title: "Clever | Portal" },
    { id: "edpuzzle", name: "Edpuzzle", icon: "https://edpuzzle.com/favicon.ico", title: "Edpuzzle" },
    { id: "quizizz", name: "Quizizz", icon: "https://quizizz.com/favicon.ico", title: "Quizizz" },
    { id: "blooket", name: "Blooket", icon: "https://www.blooket.com/favicon.ico", title: "Blooket" },
    { id: "kahoot", name: "Kahoot!", icon: "https://kahoot.com/favicon.ico", title: "Kahoot!" },
    { id: "nearpod", name: "Nearpod", icon: "https://nearpod.com/favicon.ico", title: "Nearpod" },
    { id: "ixl", name: "IXL", icon: "https://www.ixl.com/favicon.ico", title: "IXL | Math, Language Arts, Science, and Social Studies" },
    { id: "desmos", name: "Desmos", icon: "https://www.desmos.com/assets/img/apps/scientific/favicon.ico", title: "Desmos | Graphing Calculator" },
    { id: "duolingo", name: "Duolingo", icon: "https://d35aaqx5ub95lt.cloudfront.net/favicon.ico", title: "Duolingo" },
    { id: "powerschool", name: "PowerSchool", icon: "https://www.powerschool.com/favicon.ico", title: "PowerSchool" },
    { id: "notion", name: "Notion", icon: "https://www.notion.so/images/favicon.ico", title: "Notion" },
    { id: "canva", name: "Canva", icon: "https://static.canva.com/static/images/favicon.ico", title: "Canva" },
    { id: "figma", name: "Figma", icon: "https://static.figma.com/app/icon/1/favicon.ico", title: "Figma" },
    { id: "github", name: "GitHub", icon: "https://github.githubassets.com/favicons/favicon.svg", title: "GitHub" },
    { id: "stackoverflow", name: "Stack Overflow", icon: "https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico", title: "Stack Overflow" },
    { id: "spotify", name: "Spotify", icon: "https://open.spotify.com/favicon.ico", title: "Spotify - Web Player" },
    { id: "netflix", name: "Netflix", icon: "https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2023.ico", title: "Netflix" },
    { id: "twitch", name: "Twitch", icon: "https://static.twitchcdn.net/assets/favicon-32e29e96d7d319916fbf.png", title: "Twitch" },
    { id: "reddit", name: "Reddit", icon: "https://www.redditstatic.com/shreddit/assets/favicon/64x64.png", title: "Reddit - Dive into anything" },
    { id: "twitter", name: "X / Twitter", icon: "https://abs.twimg.com/responsive-web/client-web/icon-ios.77d25eba.png", title: "X" },
    { id: "instagram", name: "Instagram", icon: "https://static.cdninstagram.com/rsrc.php/v3/yI/r/VsNE-OHk_8a.png", title: "Instagram" },
    { id: "tiktok", name: "TikTok", icon: "https://www.tiktok.com/favicon.ico", title: "TikTok" },
    { id: "snapchat", name: "Snapchat", icon: "https://www.snapchat.com/favicon.ico", title: "Snapchat" },
    { id: "pinterest", name: "Pinterest", icon: "https://www.pinterest.com/favicon.ico", title: "Pinterest" },
    { id: "amazon", name: "Amazon", icon: "https://www.amazon.com/favicon.ico", title: "Amazon.com" },
    { id: "ebay", name: "eBay", icon: "https://www.ebay.com/favicon.ico", title: "eBay" },
    { id: "weather", name: "Weather.com", icon: "https://weather.com/favicon.ico", title: "National and Local Weather Forecast" },
    { id: "cnn", name: "CNN", icon: "https://www.cnn.com/favicon.ico", title: "CNN - Breaking News" },
    { id: "bbc", name: "BBC News", icon: "https://www.bbc.com/favicon.ico", title: "BBC News" },
    { id: "new-tab", name: "New Tab", icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Ccircle cx='24' cy='24' r='22' fill='%23e8eaed'/%3E%3Cpath fill='%235f6368' d='M24 14v20M14 24h20' stroke='%235f6368' stroke-width='3' stroke-linecap='round'/%3E%3C/svg%3E", title: "New Tab" },
    { id: "chrome-settings", name: "Chrome Settings", icon: "https://www.google.com/chrome/static/images/favicons/favicon-32x32.png", title: "Settings - Google Chrome" },
    { id: "zoom", name: "Zoom", icon: "https://st1.zoom.us/zoom.ico", title: "Zoom" },
    { id: "slack", name: "Slack", icon: "https://a.slack-edge.com/80588/marketing/img/meta/favicon-32.png", title: "Slack" },
    { id: "dropbox", name: "Dropbox", icon: "https://cfl.dropboxstatic.com/static/images/favicon-vflUeLeeY.ico", title: "Dropbox" },
    { id: "trello", name: "Trello", icon: "https://trello.com/favicon.ico", title: "Trello" },
    { id: "code-org", name: "Code.org", icon: "https://studio.code.org/favicon.ico", title: "Code.org" },
    { id: "scratch", name: "Scratch", icon: "https://scratch.mit.edu/favicon.ico", title: "Scratch - Imagine, Program, Share" },
    { id: "coolmath", name: "Coolmath Games", icon: "https://www.coolmathgames.com/favicon.ico", title: "Coolmath Games" },
    { id: "poki", name: "Poki", icon: "https://poki.com/favicon.ico", title: "Poki - Free Online Games" },
    { id: "crazygames", name: "CrazyGames", icon: "https://www.crazygames.com/favicon.ico", title: "Free Online Games on CrazyGames" },
    { id: "newgrounds", name: "Newgrounds", icon: "https://www.newgrounds.com/favicon.ico", title: "Newgrounds.com" },
    { id: "roblox", name: "Roblox", icon: "https://www.roblox.com/favicon.ico", title: "Roblox" },
    { id: "minecraft", name: "Minecraft", icon: "https://www.minecraft.net/etc.clientlibs/minecraft/clientlibs/main/resources/favicon.ico", title: "Minecraft Official Site" },
    { id: "apple", name: "Apple", icon: "https://www.apple.com/favicon.ico", title: "Apple" },
    { id: "drive-old", name: "Drive (classic)", icon: "https://preview.redd.it/google-drives-new-logo-doesnt-even-look-like-a-google-app-v0-y8zdkuency3h1.png?auto=webp&s=c4f0c5e1de8327f5a91f65ae058930a9bc1107bb", title: "Home - Google Drive" },
    { id: "classroom-old", name: "Classroom (classic)", icon: "https://play-lh.googleusercontent.com/PNYNq4kPt-oJMEJb91DUYgsjMl9Ubx5KHP5c1UglZJd8FQWv0xvRL3mZdTvicuhaF0yQm00lV7RN0eAxUbkvQw", title: "Home - Classroom" },
  ];

  var presetGroups = [
    { id: "google", label: "Google", ids: ["google", "google-search", "google-docs", "google-slides", "google-sheets", "google-drive", "gmail", "google-classroom", "google-meet", "google-calendar", "google-forms", "google-sites", "google-keep", "youtube", "drive-old", "classroom-old"] },
    { id: "microsoft", label: "Microsoft", ids: ["teams", "outlook", "onedrive", "word-online", "excel-online", "powerpoint-online", "sharepoint", "bing"] },
    { id: "school", label: "School & learning", ids: ["wikipedia", "khan-academy", "canvas", "schoology", "clever", "edpuzzle", "quizizz", "blooket", "kahoot", "nearpod", "ixl", "desmos", "duolingo", "powerschool", "code-org", "scratch"] },
    { id: "social", label: "Social & media", ids: ["discord", "spotify", "netflix", "twitch", "reddit", "twitter", "instagram", "tiktok", "snapchat", "pinterest"] },
    { id: "tools", label: "Tools & work", ids: ["notion", "canva", "figma", "github", "stackoverflow", "zoom", "slack", "dropbox", "trello", "new-tab", "chrome-settings"] },
    { id: "other", label: "Other sites", ids: ["amazon", "ebay", "weather", "cnn", "bbc", "coolmath", "poki", "crazygames", "newgrounds", "roblox", "minecraft", "apple"] },
  ];

  var activeId = null;
  var customCloaks = [];
  var antiHandler = null;

  function settingsGet(key) {
    var S = window.KritikalSettings;
    return S ? S.get(key) : false;
  }

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }

  function findCloak(id) {
    if (!id || id === "none") return null;
    var i;
    for (i = 0; i < presets.length; i++) {
      if (presets[i].id === id) return presets[i];
    }
    for (i = 0; i < customCloaks.length; i++) {
      if (customCloaks[i].id === id) return customCloaks[i];
    }
    return null;
  }

  function setFavicon(url) {
    var links = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
    if (!links.length) {
      var link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
      links = [link];
    }
    links.forEach(function (el) {
      el.href = url;
      if (url.indexOf(".svg") !== -1) el.type = "image/svg+xml";
      else el.removeAttribute("type");
    });
  }

  function resetTabCloak() {
    document.title = SITE_TITLE;
    setFavicon(SITE_ICON);
  }

  function applyTabCloak(cloak, persist) {
    if (!cloak) {
      activeId = null;
      if (persist !== false) {
        try {
          localStorage.removeItem(STORAGE_ACTIVE);
        } catch (e) {}
      }
      if (!document.documentElement.classList.contains("cloak-full")) {
        resetTabCloak();
      }
      return;
    }
    activeId = cloak.id;
    if (persist !== false) {
      try {
        localStorage.setItem(STORAGE_ACTIVE, cloak.id);
      } catch (e) {}
    }
    if (document.documentElement.classList.contains("cloak-full")) return;
    document.title = cloak.title;
    setFavicon(cloak.icon);
  }

  function loadState() {
    activeId = null;
    try {
      activeId = localStorage.getItem(STORAGE_ACTIVE);
    } catch (e) {}
    customCloaks = readJson(STORAGE_CUSTOM, []);
    if (!Array.isArray(customCloaks)) customCloaks = [];
  }

  function syncAntiClose() {
    if (antiHandler) {
      window.removeEventListener("beforeunload", antiHandler);
      antiHandler = null;
    }
  }

  function openAboutBlank(url) {
    var win = window.open();
    if (!win) return false;
    var frame = win.document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.top = "0";
    frame.style.left = "0";
    frame.style.width = "100%";
    frame.style.height = "100%";
    frame.style.border = "none";
    frame.src = url || location.href;
    win.document.body.style.margin = "0";
    win.document.body.appendChild(frame);
    return true;
  }

  function runAutoCloakIfNeeded() {
    if (!settingsGet("autoCloak")) return;
    if (sessionStorage.getItem("kritikal-auto-cloak-ran") === "1") return;
    sessionStorage.setItem("kritikal-auto-cloak-ran", "1");
    openAboutBlank(location.href);
  }

  function makeId() {
    return "custom-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function saveCustomCloak(name, icon, title) {
    name = String(name || "").trim();
    icon = String(icon || "").trim();
    title = String(title || "").trim();
    if (!name || !icon || !title) return null;
    var entry = { id: makeId(), name: name, icon: icon, title: title };
    customCloaks.push(entry);
    writeJson(STORAGE_CUSTOM, customCloaks);
    return entry;
  }

  function removeCustomCloak(id) {
    customCloaks = customCloaks.filter(function (c) {
      return c.id !== id;
    });
    writeJson(STORAGE_CUSTOM, customCloaks);
    if (activeId === id) applyTabCloak(null);
  }

  function renderCloakCard(cloak, grid, isActive) {
    var card = document.createElement("button");
    card.type = "button";
    card.className = "cloak-pick" + (isActive ? " cloak-pick--active" : "");
    card.innerHTML =
      '<img class="cloak-pick__icon" src="' +
      cloak.icon.replace(/"/g, "&quot;") +
      '" alt="" width="40" height="40" loading="lazy" />' +
      '<span class="cloak-pick__name">' +
      cloak.name +
      "</span>" +
      '<span class="cloak-pick__title">' +
      cloak.title +
      "</span>";
    card.addEventListener("click", function () {
      applyTabCloak(cloak);
      renderUI();
    });
    grid.appendChild(card);
  }

  function renderUI() {
    var root = document.getElementById("tab-cloak-root");
    if (!root) return;
    root.innerHTML = "";

    var searchWrap = document.createElement("div");
    searchWrap.className = "cloak-search-wrap";
    searchWrap.innerHTML =
      '<input type="search" id="cloak-preset-search" class="cloak-form__input" placeholder="Search disguises…" autocomplete="off" spellcheck="false" />';
    root.appendChild(searchWrap);
    var searchInput = document.getElementById("cloak-preset-search");
    var searchQuery = "";

    function matchesSearch(cloak) {
      if (!searchQuery) return true;
      var hay = (cloak.name + " " + cloak.title + " " + cloak.id).toLowerCase();
      return hay.indexOf(searchQuery) !== -1;
    }

    function onSearchInput() {
      searchQuery = String(searchInput.value || "").trim().toLowerCase();
      renderPresetSections();
    }

    if (searchInput) {
      searchInput.addEventListener("input", onSearchInput);
    }

    var presetMap = {};
    presets.forEach(function (c) {
      presetMap[c.id] = c;
    });

    var presetsHost = document.createElement("div");
    presetsHost.className = "cloak-presets-host";
    root.appendChild(presetsHost);

    function renderPresetSections() {
      presetsHost.innerHTML = "";
      var anyVisible = false;
      presetGroups.forEach(function (group) {
        var items = [];
        group.ids.forEach(function (id) {
          var cloak = presetMap[id];
          if (cloak && matchesSearch(cloak)) items.push(cloak);
        });
        if (!items.length) return;
        anyVisible = true;
        var section = document.createElement("section");
        section.className = "cloak-section glass-panel";
        section.innerHTML = '<h3 class="cloak-section__title">' + group.label + "</h3>";
        var body = document.createElement("div");
        body.className = "glass-panel__body cloak-section__body";
        var grid = document.createElement("div");
        grid.className = "cloak-grid";
        items.forEach(function (cloak) {
          renderCloakCard(cloak, grid, activeId === cloak.id);
        });
        body.appendChild(grid);
        section.appendChild(body);
        presetsHost.appendChild(section);
      });
      if (!anyVisible && searchQuery) {
        presetsHost.innerHTML = '<p class="cloak-empty">No disguises match your search.</p>';
      }
    }

    renderPresetSections();

    var noneSection = document.createElement("section");
    noneSection.className = "cloak-section glass-panel";
    noneSection.innerHTML = '<h3 class="cloak-section__title">Reset</h3>';
    var noneBody = document.createElement("div");
    noneBody.className = "glass-panel__body cloak-section__body";
    var noneGrid = document.createElement("div");
    noneGrid.className = "cloak-grid";
    var noneBtn = document.createElement("button");
    noneBtn.type = "button";
    noneBtn.className = "cloak-pick cloak-pick--none" + (!activeId ? " cloak-pick--active" : "");
    noneBtn.innerHTML = '<span class="cloak-pick__icon cloak-pick__icon--none" aria-hidden="true">✕</span><span class="cloak-pick__name">None</span><span class="cloak-pick__title">Reset tab title and icon</span>';
    noneBtn.addEventListener("click", function () {
      applyTabCloak(null);
      renderUI();
    });
    noneGrid.appendChild(noneBtn);
    noneBody.appendChild(noneGrid);
    noneSection.appendChild(noneBody);
    root.appendChild(noneSection);

    var customSection = document.createElement("section");
    customSection.className = "cloak-section glass-panel";
    customSection.innerHTML = '<h3 class="cloak-section__title">Your own</h3>';
    var customBody = document.createElement("div");
    customBody.className = "glass-panel__body cloak-section__body";

    var form = document.createElement("form");
    form.className = "cloak-form";
    form.innerHTML =
      '<label class="cloak-form__label" for="cloak-custom-name">Name</label>' +
      '<input type="text" id="cloak-custom-name" class="cloak-form__input" maxlength="40" placeholder="What you call it" autocomplete="off" />' +
      '<label class="cloak-form__label" for="cloak-custom-icon">Icon URL</label>' +
      '<input type="url" id="cloak-custom-icon" class="cloak-form__input" placeholder="https://…" autocomplete="off" spellcheck="false" />' +
      '<label class="cloak-form__label" for="cloak-custom-title">Tab title</label>' +
      '<input type="text" id="cloak-custom-title" class="cloak-form__input" maxlength="120" placeholder="What shows in the tab bar" autocomplete="off" />' +
      '<button type="submit" class="cloak-form__btn">Save disguise</button>';
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var nameEl = document.getElementById("cloak-custom-name");
      var iconEl = document.getElementById("cloak-custom-icon");
      var titleEl = document.getElementById("cloak-custom-title");
      var entry = saveCustomCloak(nameEl.value, iconEl.value, titleEl.value);
      if (!entry) return;
      nameEl.value = "";
      iconEl.value = "";
      titleEl.value = "";
      applyTabCloak(entry);
      renderUI();
    });
    customBody.appendChild(form);

    if (customCloaks.length) {
      var customGrid = document.createElement("div");
      customGrid.className = "cloak-grid cloak-grid--custom";
      customCloaks.forEach(function (cloak) {
        var wrap = document.createElement("div");
        wrap.className = "cloak-pick-wrap";
        var card = document.createElement("button");
        card.type = "button";
        card.className = "cloak-pick" + (activeId === cloak.id ? " cloak-pick--active" : "");
        card.innerHTML =
          '<img class="cloak-pick__icon" src="' +
          cloak.icon.replace(/"/g, "&quot;") +
          '" alt="" width="40" height="40" loading="lazy" />' +
          '<span class="cloak-pick__name">' +
          cloak.name +
          "</span>" +
          '<span class="cloak-pick__title">' +
          cloak.title +
          "</span>";
        card.addEventListener("click", function () {
          applyTabCloak(cloak);
          renderUI();
        });
        var del = document.createElement("button");
        del.type = "button";
        del.className = "cloak-pick__del";
        del.setAttribute("aria-label", "Remove " + cloak.name);
        del.textContent = "Remove";
        del.addEventListener("click", function (e) {
          e.stopPropagation();
          removeCustomCloak(cloak.id);
          renderUI();
        });
        wrap.appendChild(card);
        wrap.appendChild(del);
        customGrid.appendChild(wrap);
      });
      customBody.appendChild(customGrid);
    }

    customSection.appendChild(customBody);
    root.appendChild(customSection);

    var abBtn = document.createElement("button");
    abBtn.type = "button";
    abBtn.className = "cloak-ab-btn";
    abBtn.textContent = "Open site in about:blank now";
    abBtn.addEventListener("click", function () {
      if (!openAboutBlank(location.href)) {
        abBtn.textContent = "Popup blocked — allow popups and try again";
        setTimeout(function () {
          abBtn.textContent = "Open site in about:blank now";
        }, 2800);
      }
    });
    root.appendChild(abBtn);
  }

  window.KritikalTabCloak = {
    applyEarly: function () {
      loadState();
      var cloak = findCloak(activeId);
      if (cloak) applyTabCloak(cloak, false);
    },
    init: function () {
      loadState();
      var cloak = findCloak(activeId);
      if (cloak) applyTabCloak(cloak, false);
      syncAntiClose();
      runAutoCloakIfNeeded();
      renderUI();
    },
    render: renderUI,
    getActive: function () {
      return findCloak(activeId);
    },
  };

  loadState();
  syncAntiClose();

  window.addEventListener("kritikal-cloak-on", function () {
    var cloak = findCloak(activeId);
    if (cloak) applyTabCloak(cloak, false);
  });

  window.addEventListener("kritikal-cloak-off", function () {
    var cloak = findCloak(activeId);
    if (cloak) applyTabCloak(cloak, false);
    else resetTabCloak();
  });

  window.addEventListener("kritikal-settings", function () {
    syncAntiClose();
    runAutoCloakIfNeeded();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      window.KritikalTabCloak.init();
    });
  } else {
    window.KritikalTabCloak.init();
  }
})();
