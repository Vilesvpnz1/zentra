(function () {
  var STORAGE_ACTIVE = "kritikal-tab-cloak-active";
  var STORAGE_CUSTOM = "kritikal-tab-cloak-custom";
  var SITE_TITLE = "Zentra";
  var SITE_ICON = "/favicon.svg";

  var presets = [
    {
      id: "google",
      name: "Google",
      icon: "https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png",
      title: "Google",
    },
    {
      id: "discord",
      name: "Discord.com",
      icon: "https://www.svgrepo.com/show/353655/discord-icon.svg",
      title: "Discord - Group Chat That's All Fun & Games",
    },
    {
      id: "drive",
      name: "Google Drive",
      icon: "https://preview.redd.it/google-drives-new-logo-doesnt-even-look-like-a-google-app-v0-y8zdkuency3h1.png?auto=webp&s=c4f0c5e1de8327f5a91f65ae058930a9bc1107bb",
      title: "Home Google Drive",
    },
    {
      id: "classroom",
      name: "Google Classroom",
      icon: "https://play-lh.googleusercontent.com/PNYNq4kPt-oJMEJb91DUYgsjMl9Ubx5KHP5c1UglZJd8FQWv0xvRL3mZdTvicuhaF0yQm00lV7RN0eAxUbkvQw",
      title: "Home - Classroom",
    },
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
    var antiClose = !!settingsGet("antiClose");
    if (antiHandler) {
      window.removeEventListener("beforeunload", antiHandler);
      antiHandler = null;
    }
    if (!antiClose) return;
    antiHandler = function (e) {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", antiHandler);
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

    var presetsSection = document.createElement("section");
    presetsSection.className = "cloak-section glass-panel";
    presetsSection.innerHTML = '<h3 class="cloak-section__title">Pick a disguise</h3>';
    var presetGrid = document.createElement("div");
    presetGrid.className = "cloak-grid";
    presets.forEach(function (cloak) {
      renderCloakCard(cloak, presetGrid, activeId === cloak.id);
    });
    var noneBtn = document.createElement("button");
    noneBtn.type = "button";
    noneBtn.className = "cloak-pick cloak-pick--none" + (!activeId ? " cloak-pick--active" : "");
    noneBtn.innerHTML = '<span class="cloak-pick__icon cloak-pick__icon--none" aria-hidden="true">✕</span><span class="cloak-pick__name">None</span><span class="cloak-pick__title">Reset tab title and icon</span>';
    noneBtn.addEventListener("click", function () {
      applyTabCloak(null);
      renderUI();
    });
    presetGrid.appendChild(noneBtn);
    var presetBody = document.createElement("div");
    presetBody.className = "glass-panel__body cloak-section__body";
    presetBody.appendChild(presetGrid);
    presetsSection.appendChild(presetBody);
    root.appendChild(presetsSection);

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
