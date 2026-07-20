(function () {
  var STORAGE_ACTIVE = "kritikal-tab-cloak-active";
  var STORAGE_CUSTOM = "kritikal-tab-cloak-custom";
  var STORAGE_TITLE = "kritikal-tab-cloak-title";
  var STORAGE_ICON = "kritikal-tab-cloak-icon";
  var SITE_TITLE = "Kritikal";
  var SITE_ICON = "/favicon.svg";

  var presets = [
    { id: "google", name: "Google", domain: "www.google.com", title: "Google" },
    { id: "google-search", name: "Google Search", domain: "www.google.com", title: "Google Search" },
    { id: "google-docs", name: "Google Docs", domain: "docs.google.com", title: "Google Docs" },
    { id: "google-slides", name: "Google Slides", domain: "slides.google.com", title: "Google Slides" },
    { id: "google-sheets", name: "Google Sheets", domain: "sheets.google.com", title: "Google Sheets" },
    { id: "google-drive", name: "Google Drive", domain: "drive.google.com", title: "My Drive - Google Drive" },
    { id: "gmail", name: "Gmail", domain: "mail.google.com", title: "Gmail" },
    { id: "google-classroom", name: "Google Classroom", domain: "classroom.google.com", title: "Classes" },
    { id: "google-meet", name: "Google Meet", domain: "meet.google.com", title: "Google Meet" },
    { id: "google-calendar", name: "Google Calendar", domain: "calendar.google.com", title: "Google Calendar" },
    { id: "google-forms", name: "Google Forms", domain: "forms.google.com", title: "Google Forms" },
    { id: "google-sites", name: "Google Sites", domain: "sites.google.com", title: "Google Sites" },
    { id: "google-keep", name: "Google Keep", domain: "keep.google.com", title: "Google Keep" },
    { id: "youtube", name: "YouTube", domain: "www.youtube.com", title: "YouTube" },
    { id: "discord", name: "Discord", domain: "discord.com", title: "Discord | Friends" },
    { id: "teams", name: "Microsoft Teams", domain: "teams.microsoft.com", title: "Microsoft Teams" },
    { id: "outlook", name: "Outlook", domain: "outlook.live.com", title: "Outlook" },
    { id: "onedrive", name: "OneDrive", domain: "onedrive.live.com", title: "OneDrive" },
    { id: "word-online", name: "Word Online", domain: "word.cloud.microsoft.com", title: "Word" },
    { id: "excel-online", name: "Excel Online", domain: "excel.cloud.microsoft.com", title: "Excel" },
    { id: "powerpoint-online", name: "PowerPoint", domain: "powerpoint.cloud.microsoft.com", title: "PowerPoint" },
    { id: "sharepoint", name: "SharePoint", domain: "www.sharepoint.com", title: "SharePoint" },
    { id: "bing", name: "Bing", domain: "www.bing.com", title: "Search - Microsoft Bing" },
    { id: "wikipedia", name: "Wikipedia", domain: "en.wikipedia.org", title: "Wikipedia, the free encyclopedia" },
    { id: "khan-academy", name: "Khan Academy", domain: "www.khanacademy.org", title: "Khan Academy" },
    { id: "canvas", name: "Canvas LMS", domain: "www.instructure.com", title: "Dashboard" },
    { id: "schoology", name: "Schoology", domain: "www.schoology.com", title: "Home | Schoology" },
    { id: "clever", name: "Clever", domain: "clever.com", title: "Clever | Portal" },
    { id: "edpuzzle", name: "Edpuzzle", domain: "edpuzzle.com", title: "Edpuzzle" },
    { id: "quizizz", name: "Quizizz", domain: "quizizz.com", title: "Quizizz" },
    { id: "blooket", name: "Blooket", domain: "www.blooket.com", title: "Blooket" },
    { id: "kahoot", name: "Kahoot!", domain: "kahoot.com", title: "Kahoot!" },
    { id: "nearpod", name: "Nearpod", domain: "nearpod.com", title: "Nearpod" },
    { id: "ixl", name: "IXL", domain: "www.ixl.com", title: "IXL | Math, Language Arts, Science, and Social Studies" },
    { id: "desmos", name: "Desmos", domain: "www.desmos.com", title: "Desmos | Graphing Calculator" },
    { id: "duolingo", name: "Duolingo", domain: "www.duolingo.com", title: "Duolingo" },
    { id: "powerschool", name: "PowerSchool", domain: "www.powerschool.com", title: "PowerSchool" },
    { id: "notion", name: "Notion", domain: "www.notion.so", title: "Notion" },
    { id: "canva", name: "Canva", domain: "www.canva.com", title: "Canva" },
    { id: "figma", name: "Figma", domain: "www.figma.com", title: "Figma" },
    { id: "github", name: "GitHub", domain: "github.com", title: "GitHub" },
    { id: "stackoverflow", name: "Stack Overflow", domain: "stackoverflow.com", title: "Stack Overflow" },
    { id: "spotify", name: "Spotify", domain: "open.spotify.com", title: "Spotify - Web Player" },
    { id: "netflix", name: "Netflix", domain: "www.netflix.com", title: "Netflix" },
    { id: "twitch", name: "Twitch", domain: "www.twitch.tv", title: "Twitch" },
    { id: "reddit", name: "Reddit", domain: "www.reddit.com", title: "Reddit - Dive into anything" },
    { id: "twitter", name: "X / Twitter", domain: "x.com", title: "X" },
    { id: "instagram", name: "Instagram", domain: "www.instagram.com", title: "Instagram" },
    { id: "tiktok", name: "TikTok", domain: "www.tiktok.com", title: "TikTok" },
    { id: "snapchat", name: "Snapchat", domain: "www.snapchat.com", title: "Snapchat" },
    { id: "pinterest", name: "Pinterest", domain: "www.pinterest.com", title: "Pinterest" },
    { id: "amazon", name: "Amazon", domain: "www.amazon.com", title: "Amazon.com" },
    { id: "ebay", name: "eBay", domain: "www.ebay.com", title: "eBay" },
    { id: "weather", name: "Weather.com", domain: "weather.com", title: "National and Local Weather Forecast" },
    { id: "cnn", name: "CNN", domain: "www.cnn.com", title: "CNN - Breaking News" },
    { id: "bbc", name: "BBC News", domain: "www.bbc.com", title: "BBC News" },
    {
      id: "new-tab",
      name: "New Tab",
      icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Ccircle cx='24' cy='24' r='22' fill='%23e8eaed'/%3E%3Cpath fill='none' d='M24 14v20M14 24h20' stroke='%235f6368' stroke-width='3' stroke-linecap='round'/%3E%3C/svg%3E",
      title: "New Tab",
    },
    { id: "chrome-settings", name: "Chrome Settings", domain: "www.google.com", title: "Settings - Google Chrome" },
    { id: "zoom", name: "Zoom", domain: "zoom.us", title: "Zoom" },
    { id: "slack", name: "Slack", domain: "slack.com", title: "Slack" },
    { id: "dropbox", name: "Dropbox", domain: "www.dropbox.com", title: "Dropbox" },
    { id: "trello", name: "Trello", domain: "trello.com", title: "Trello" },
    { id: "code-org", name: "Code.org", domain: "studio.code.org", title: "Code.org" },
    { id: "scratch", name: "Scratch", domain: "scratch.mit.edu", title: "Scratch - Imagine, Program, Share" },
    { id: "coolmath", name: "Coolmath Games", domain: "www.coolmathgames.com", title: "Coolmath Games" },
    { id: "poki", name: "Poki", domain: "poki.com", title: "Poki - Free Online Games" },
    { id: "crazygames", name: "CrazyGames", domain: "www.crazygames.com", title: "Free Online Games on CrazyGames" },
    { id: "newgrounds", name: "Newgrounds", domain: "www.newgrounds.com", title: "Newgrounds.com" },
    { id: "roblox", name: "Roblox", domain: "www.roblox.com", title: "Roblox" },
    { id: "minecraft", name: "Minecraft", domain: "www.minecraft.net", title: "Minecraft Official Site" },
    { id: "apple", name: "Apple", domain: "www.apple.com", title: "Apple" },
    { id: "drive-old", name: "Drive (classic)", domain: "drive.google.com", title: "Home - Google Drive" },
    { id: "classroom-old", name: "Classroom (classic)", domain: "classroom.google.com", title: "Home - Classroom" },
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

  function cloakIconUrl(cloak) {
    if (!cloak) return SITE_ICON;
    var icon = String(cloak.icon || "").trim();
    if (icon.indexOf("data:") === 0) return icon;
    if (icon && /^https?:\/\//i.test(icon)) return "/api/cloak-icon?u=" + encodeURIComponent(icon);
    if (icon && icon.indexOf("/") === 0) return icon;
    if (cloak.domain) return "/api/cloak-icon?d=" + encodeURIComponent(cloak.domain);
    return SITE_ICON;
  }

  function tabIconUrl(cloak) {
    if (!cloak) return SITE_ICON;
    var icon = String(cloak.icon || "").trim();
    if (icon.indexOf("data:") === 0) return icon;
    if (cloak.domain) {
      return "https://www.google.com/s2/favicons?domain=" + encodeURIComponent(cloak.domain) + "&sz=64";
    }
    if (icon && /^https?:\/\//i.test(icon)) return icon;
    if (icon && icon.indexOf("/") === 0) return icon;
    return SITE_ICON;
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
    var links = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
    links.forEach(function (el) {
      el.parentNode.removeChild(el);
    });
    var link = document.getElementById("kritikal-cloak-favicon");
    if (!link) {
      link = document.createElement("link");
      link.id = "kritikal-cloak-favicon";
      link.rel = "icon";
      document.head.insertBefore(link, document.head.firstChild);
    }
    link.href = url;
    if (url.indexOf("data:image/svg") !== -1 || url === SITE_ICON || /\.svg(\?|$)/i.test(url)) {
      link.type = "image/svg+xml";
    } else {
      link.type = "image/png";
    }
  }

  function persistCloakMeta(cloak) {
    try {
      if (!cloak) {
        localStorage.removeItem(STORAGE_TITLE);
        localStorage.removeItem(STORAGE_ICON);
        return;
      }
      localStorage.setItem(STORAGE_TITLE, cloak.title || "");
      localStorage.setItem(STORAGE_ICON, tabIconUrl(cloak));
    } catch (e) {}
  }

  function resetTabCloak() {
    document.title = SITE_TITLE;
    setFavicon(SITE_ICON);
    persistCloakMeta(null);
  }

  function applyTabCloak(cloak, persist) {
    if (!cloak) {
      activeId = null;
      if (persist !== false) {
        try {
          localStorage.removeItem(STORAGE_ACTIVE);
        } catch (e) {}
        persistCloakMeta(null);
      }
      if (!document.documentElement.classList.contains("cloak-full")) {
        resetTabCloak();
      }
      return;
    }
    activeId = cloak.id;
    var icon = tabIconUrl(cloak);
    if (persist !== false) {
      try {
        localStorage.setItem(STORAGE_ACTIVE, cloak.id);
      } catch (e) {}
      persistCloakMeta(cloak);
    }
    if (document.documentElement.classList.contains("cloak-full")) return;
    document.title = cloak.title;
    setFavicon(icon);
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

  function attachCloakIcon(img, cloak) {
    var primary = cloakIconUrl(cloak);
    img.src = primary;
    img.onerror = function () {
      if (img.dataset.fallback !== "1" && cloak.domain) {
        img.dataset.fallback = "1";
        img.src = "https://www.google.com/s2/favicons?domain=" + encodeURIComponent(cloak.domain) + "&sz=64";
        return;
      }
      img.onerror = null;
      img.src = SITE_ICON;
    };
  }

  function renderCloakCard(cloak, grid, isActive) {
    var card = document.createElement("button");
    card.type = "button";
    card.className = "cloak-pick" + (isActive ? " cloak-pick--active" : "");
    var img = document.createElement("img");
    img.className = "cloak-pick__icon";
    img.alt = "";
    img.width = 40;
    img.height = 40;
    img.loading = "lazy";
    attachCloakIcon(img, cloak);
    var name = document.createElement("span");
    name.className = "cloak-pick__name";
    name.textContent = cloak.name;
    var title = document.createElement("span");
    title.className = "cloak-pick__title";
    title.textContent = cloak.title;
    card.appendChild(img);
    card.appendChild(name);
    card.appendChild(title);
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
      var hay = (cloak.name + " " + cloak.title + " " + cloak.id + " " + (cloak.domain || "")).toLowerCase();
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
    noneBtn.innerHTML = '<span class="cloak-pick__icon cloak-pick__icon--none" aria-hidden="true">✕</span><span class="cloak-pick__name">None</span><span class="cloak-pick__title">back to normal tab</span>';
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
      '<input type="text" id="cloak-custom-name" class="cloak-form__input" maxlength="40" placeholder="what u call it" autocomplete="off" />' +
      '<label class="cloak-form__label" for="cloak-custom-icon">Icon URL</label>' +
      '<input type="url" id="cloak-custom-icon" class="cloak-form__input" placeholder="https://…" autocomplete="off" spellcheck="false" />' +
      '<label class="cloak-form__label" for="cloak-custom-title">Tab title</label>' +
      '<input type="text" id="cloak-custom-title" class="cloak-form__input" maxlength="120" placeholder="what shows in the tab" autocomplete="off" />' +
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
        var img = document.createElement("img");
        img.className = "cloak-pick__icon";
        img.alt = "";
        img.width = 40;
        img.height = 40;
        img.loading = "lazy";
        attachCloakIcon(img, cloak);
        var name = document.createElement("span");
        name.className = "cloak-pick__name";
        name.textContent = cloak.name;
        var title = document.createElement("span");
        title.className = "cloak-pick__title";
        title.textContent = cloak.title;
        card.appendChild(img);
        card.appendChild(name);
        card.appendChild(title);
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
    abBtn.textContent = "open in about:blank now";
    abBtn.addEventListener("click", function () {
      if (!openAboutBlank(location.href)) {
        abBtn.textContent = "popup blocked. allow popups and try again";
        setTimeout(function () {
          abBtn.textContent = "open in about:blank now";
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
      if (cloak) applyTabCloak(cloak, true);
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
