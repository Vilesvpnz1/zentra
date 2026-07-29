window.KobranSettings = (function () {
  var STORAGE_KEY = "kobran-settings-v1";

  var defaults = {
    theme: "green",
    customAccent: "#a78bfa",
    background: "grid",
    backgroundUrl: "",
    backgroundFit: "cover",
    backgroundWidth: 100,
    backgroundHeight: 100,
    backgroundPosX: 50,
    backgroundPosY: 50,
    backgroundOpacity: 100,
    backgroundBlur: 0,
    backgroundDim: 34,
    performanceMode: false,
    lowDataMode: false,
    lyricsEnabled: true,
    performancePromptDone: false,
    glow: 55,
    fontSize: "md",
    crt: false,
    scanSweep: false,
    typingBg: false,
    typingSpeed: "medium",
    typingIntensity: "medium",
    particles: false,
    matrixGrid: false,
    compactGrid: false,
    textGlow: false,
    typingOpacity: 40,
    cursorTrail: false,
    navLabelsAlways: false,
    navAutoReveal: true,
    autoCloak: false,
    antiClose: false,
    searchEngine: "duckduckgo",
  };

  var themePresets = [
    { id: "green", label: "Monochrome", swatch: ["#ffffff", "#d4d4d4", "#737373"] },
    { id: "cyan", label: "Aurora cyan", swatch: ["#7dd3fc", "#38bdf8", "#0e7490"] },
    { id: "amber", label: "Solar gold", swatch: ["#fde68a", "#fbbf24", "#92400e"] },
    { id: "crimson", label: "Eclipse rose", swatch: ["#fda4af", "#fb7185", "#9f1239"] },
  ];

  var themes = {
    green: {
      text: "#d4d4d4",
      textBright: "#ffffff",
      accent: "#ffffff",
      accentHot: "#e5e5e5",
      accentCool: "#a3a3a3",
      muted: "#888888",
      border: "rgba(255, 255, 255, 0.12)",
      borderDim: "rgba(255, 255, 255, 0.06)",
      glow: "rgba(255, 255, 255, 0.08)",
      scrollThumb: "#333333",
    },
    cyan: {
      text: "#d4e4e8",
      textBright: "#ffffff",
      accent: "#e0f2fe",
      accentHot: "#bae6fd",
      accentCool: "#7dd3fc",
      muted: "#7a9098",
      border: "rgba(125, 211, 252, 0.18)",
      borderDim: "rgba(125, 211, 252, 0.08)",
      glow: "rgba(125, 211, 252, 0.1)",
      scrollThumb: "#1e3a44",
    },
    amber: {
      text: "#e8e0d4",
      textBright: "#ffffff",
      accent: "#fef3c7",
      accentHot: "#fde68a",
      accentCool: "#d6d3d1",
      muted: "#9a9080",
      border: "rgba(253, 230, 138, 0.16)",
      borderDim: "rgba(253, 230, 138, 0.08)",
      glow: "rgba(253, 230, 138, 0.08)",
      scrollThumb: "#44403c",
    },
    crimson: {
      text: "#e8d4dc",
      textBright: "#ffffff",
      accent: "#fecdd3",
      accentHot: "#fda4af",
      accentCool: "#d4d4d8",
      muted: "#9a8088",
      border: "rgba(253, 164, 175, 0.16)",
      borderDim: "rgba(253, 164, 175, 0.08)",
      glow: "rgba(253, 164, 175, 0.08)",
      scrollThumb: "#44222c",
    },
  };

  var current = {};

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        current = Object.assign({}, defaults, parsed);
        if (!themes[current.theme] && current.theme !== "custom") current.theme = defaults.theme;
        current.customAccent = normalizeHex(current.customAccent) || defaults.customAccent;
        if (current.backgroundWidth == null && current.backgroundScale != null) {
          current.backgroundWidth = current.backgroundScale;
        }
        if (current.backgroundHeight == null && current.backgroundScale != null) {
          current.backgroundHeight = current.backgroundScale;
        }
        if (current.backgroundWidth == null) current.backgroundWidth = defaults.backgroundWidth;
        if (current.backgroundHeight == null) current.backgroundHeight = defaults.backgroundHeight;
        if (current.searchEngine && window.KobranSearchEngines && window.KobranSearchEngines.get) {
          if (!window.KobranSearchEngines.engines[current.searchEngine]) current.searchEngine = defaults.searchEngine;
        }
        if (!current.searchEngine) current.searchEngine = defaults.searchEngine;
        return;
      }
    } catch (e) {}
    current = clone(defaults);
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch (e) {}
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function hexToRgb(hex) {
    hex = String(hex || "").trim().replace(/^#/, "");
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (!/^[0-9a-f]{6}$/i.test(hex)) return null;
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }

  function rgbToHex(r, g, b) {
    return (
      "#" +
      [r, g, b]
        .map(function (c) {
          return clamp(Math.round(c), 0, 255).toString(16).padStart(2, "0");
        })
        .join("")
    );
  }

  function mixRgb(a, b, t) {
    return {
      r: a.r + (b.r - a.r) * t,
      g: a.g + (b.g - a.g) * t,
      b: a.b + (b.b - a.b) * t,
    };
  }

  function normalizeHex(hex) {
    var rgb = hexToRgb(hex);
    return rgb ? rgbToHex(rgb.r, rgb.g, rgb.b) : "";
  }

  function deriveThemeFromAccent(hex) {
    var rgb = hexToRgb(hex);
    if (!rgb) return themes.green;
    var white = { r: 255, g: 255, b: 255 };
    var gray = { r: 136, g: 136, b: 136 };
    var textBase = { r: 212, g: 212, b: 212 };
    var accent = mixRgb(rgb, white, 0.22);
    var accentHot = mixRgb(rgb, white, 0.42);
    var accentCool = mixRgb(rgb, white, 0.08);
    var text = mixRgb(rgb, textBase, 0.18);
    var muted = mixRgb(rgb, gray, 0.55);
    var scroll = mixRgb(rgb, { r: 20, g: 20, b: 20 }, 0.72);
    return {
      text: rgbToHex(text.r, text.g, text.b),
      textBright: "#ffffff",
      accent: rgbToHex(accent.r, accent.g, accent.b),
      accentHot: rgbToHex(accentHot.r, accentHot.g, accentHot.b),
      accentCool: rgbToHex(accentCool.r, accentCool.g, accentCool.b),
      muted: rgbToHex(muted.r, muted.g, muted.b),
      border: "rgba(" + Math.round(accent.r) + ", " + Math.round(accent.g) + ", " + Math.round(accent.b) + ", 0.18)",
      borderDim: "rgba(" + Math.round(accent.r) + ", " + Math.round(accent.g) + ", " + Math.round(accent.b) + ", 0.08)",
      glow: "rgba(" + Math.round(accent.r) + ", " + Math.round(accent.g) + ", " + Math.round(accent.b) + ", 0.1)",
      scrollThumb: rgbToHex(scroll.r, scroll.g, scroll.b),
    };
  }

  function applyThemeVars(root, t) {
    root.style.setProperty("--text", t.text);
    root.style.setProperty("--text-bright", t.textBright);
    root.style.setProperty("--accent", t.accent);
    root.style.setProperty("--accent-hot", t.accentHot);
    root.style.setProperty("--accent-cool", t.accentCool);
    root.style.setProperty("--muted", t.muted);
    root.style.setProperty("--border", t.border);
    root.style.setProperty("--border-dim", t.borderDim);
    root.style.setProperty("--glow-color", t.glow);
    root.style.setProperty("--scroll-thumb", t.scrollThumb);
  }

  function applyTheme(name) {
    var root = document.documentElement;
    var t;
    if (name === "custom") {
      t = deriveThemeFromAccent(current.customAccent || defaults.customAccent);
      root.setAttribute("data-theme", "custom");
    } else {
      t = themes[name] || themes.green;
      root.setAttribute("data-theme", name);
    }
    applyThemeVars(root, t);
  }

  function apply() {
    var root = document.documentElement;
    var body = document.body;
    if (!body) return;
    var lite = !!current.performanceMode;
    var lowData = !!current.lowDataMode;
    applyTheme(current.theme);
    var dim = clamp(Number(current.backgroundDim) || 0, 0, 80);
    root.style.setProperty("--bg-dim-opacity", String(dim / 100));
    root.style.setProperty("--glow-strength", String((lite || lowData ? 20 : current.glow) / 100));
    root.style.setProperty("--typing-opacity", String(current.typingOpacity / 100));
    root.setAttribute("data-font", current.fontSize);
    root.setAttribute("data-typing-speed", current.typingSpeed);
    root.setAttribute("data-typing-intensity", current.typingIntensity);
    body.classList.toggle("fx-performance", lite);
    body.classList.toggle("fx-low-data", lowData);
    body.classList.toggle("music-lyrics-off", !current.lyricsEnabled);
    body.classList.toggle("fx-no-crt", lite || lowData || !current.crt);
    body.classList.toggle("fx-no-sweep", lite || lowData || !current.scanSweep);
    body.classList.toggle("fx-text-glow", !lite && !lowData && !!current.textGlow);
    body.classList.toggle("fx-no-glow", lite || lowData || !current.textGlow);
    body.classList.toggle("fx-no-particles", lite || lowData || !current.particles);
    body.classList.toggle("fx-no-matrix", lite || lowData || !current.matrixGrid);
    body.classList.toggle("fx-no-typing", lite || lowData || !current.typingBg);
    body.classList.toggle("fx-no-orbit", lite || lowData || !current.typingBg);
    body.classList.toggle("fx-compact-grid", !!current.compactGrid);
    body.classList.toggle("fx-no-trail", lite || lowData || !current.cursorTrail);
    body.classList.toggle("fx-no-cursor-glow", lite || lowData || !current.cursorTrail);
    body.classList.toggle("fx-nav-labels-always", !!current.navLabelsAlways);
    root.setAttribute("data-nav-auto-reveal", current.navAutoReveal ? "1" : "0");
    if (window.KobranTypingBg && typeof window.KobranTypingBg.refresh === "function") {
      window.KobranTypingBg.refresh();
    }
    if (window.KobranOrbitFx && typeof window.KobranOrbitFx.sync === "function") {
      window.KobranOrbitFx.sync();
    }
    if (window.KobranAuroraBg && typeof window.KobranAuroraBg.sync === "function") {
      window.KobranAuroraBg.sync();
    }
    if (window.KobranNavDock && typeof window.KobranNavDock.syncAutoReveal === "function") {
      window.KobranNavDock.syncAutoReveal();
    }
    if (window.KobranSiteBg && typeof window.KobranSiteBg.sync === "function") {
      window.KobranSiteBg.sync();
    }
    window.dispatchEvent(new CustomEvent("kobran-settings", { detail: clone(current) }));
  }

  function get(key) {
    return current[key];
  }

  function getAll() {
    return clone(current);
  }

  function set(key, value) {
    current[key] = value;
    save();
    apply();
  }

  function reset() {
    current = clone(defaults);
    save();
    apply();
  }

  function bindSettingsUI() {
    var root = document.getElementById("settings-root");
    if (!root) return;

    var groups = [
      {
        title: "Appearance",
        items: [
          {
            key: "theme",
            label: "Color theme",
            type: "theme",
          },
          {
            key: "fontSize",
            label: "Text size",
            type: "select",
            options: [
              { v: "sm", l: "Small" },
              { v: "md", l: "Medium" },
              { v: "lg", l: "Large" },
            ],
          },
          {
            key: "glow",
            label: "Glow intensity",
            type: "range",
            min: 0,
            max: 100,
            step: 5,
            unit: "%",
          },
          {
            key: "textGlow",
            label: "Text glow",
            type: "toggle",
          },
        ],
      },
      {
        title: "Navigation",
        items: [
          {
            key: "navLabelsAlways",
            label: "Always show nav labels",
            type: "toggle",
          },
          {
            key: "navAutoReveal",
            label: "Nav auto reveal",
            desc: "opens when ur mouse gets near the dock",
            type: "toggle",
            danger: true,
          },
        ],
      },
      {
        title: "Cloaking",
        items: [
          {
            key: "autoCloak",
            label: "Auto Cloaking",
            desc: "opens the site in about:blank on load",
            type: "toggle",
            danger: true,
          },
        ],
      },
      {
        title: "Browser",
        items: [
          {
            key: "searchEngine",
            label: "Search engine",
            desc: "what browser uses when u search",
            type: "select",
            options: (function () {
              if (window.KobranSearchEngines && window.KobranSearchEngines.list) {
                return window.KobranSearchEngines.list().map(function (engine) {
                  return { v: engine.id, l: engine.label };
                });
              }
              return [
                { v: "duckduckgo", l: "DuckDuckGo" },
                { v: "google", l: "Google" },
                { v: "bing", l: "Bing" },
                { v: "brave", l: "Brave Search" },
              ];
            })(),
          },
        ],
      },
      {
        title: "Music",
        items: [
          {
            key: "lyricsEnabled",
            label: "Lyrics overlay",
            desc: "show lyrics if we find a match",
            type: "toggle",
          },
        ],
      },
      {
        title: "Performance",
        items: [
          {
            key: "performanceMode",
            label: "Lite mode",
            desc: "kills heavy effects if ur device is struggling",
            type: "toggle",
          },
          {
            key: "lowDataMode",
            label: "Low data mode",
            desc: "smaller thumbs, less motion",
            type: "toggle",
          },
        ],
      },
    ];

    root.innerHTML = "";
    groups.forEach(function (group) {
      var section = document.createElement("section");
      section.className = "settings-group glass-panel";
      var head = document.createElement("h3");
      head.className = "settings-group__title";
      head.textContent = group.title;
      section.appendChild(head);
      var body = document.createElement("div");
      body.className = "glass-panel__body settings-group__body";
      group.items.forEach(function (item) {
        body.appendChild(buildControl(item));
      });
      section.appendChild(body);
      root.appendChild(section);
    });
    bindBackgroundUI(root);
    bindMobileUI(root);
  }

  function bindMobileUI(root) {
    if (!root) return;
    var section = document.createElement("section");
    section.className = "settings-group glass-panel";
    var head = document.createElement("h3");
    head.className = "settings-group__title";
    head.textContent = "Mobile";
    section.appendChild(head);
    var body = document.createElement("div");
    body.className = "glass-panel__body settings-group__body";
    var lead = document.createElement("p");
    lead.className = "settings-pwa__lead";
    lead.textContent = "Install Kobran on your phone for a full screen app icon and quicker launch.";
    body.appendChild(lead);
    var installBtn = document.createElement("button");
    installBtn.type = "button";
    installBtn.className = "settings-bg__apply settings-pwa__install";
    installBtn.id = "settings-pwa-install";
    installBtn.textContent = "Install app";
    installBtn.hidden = true;
    body.appendChild(installBtn);
    section.appendChild(body);
    root.appendChild(section);
    if (window.KobranPwa && typeof window.KobranPwa.bindInstallButton === "function") {
      window.KobranPwa.bindInstallButton(installBtn);
    }
  }

  function resetBackgroundAdjustments() {
    var d = (window.KobranSiteBg && window.KobranSiteBg.defaults) || {
      backgroundFit: "cover",
      backgroundWidth: 100,
      backgroundHeight: 100,
      backgroundPosX: 50,
      backgroundPosY: 50,
      backgroundOpacity: 100,
      backgroundBlur: 0,
      backgroundDim: 34,
    };
    current.backgroundFit = d.backgroundFit;
    current.backgroundWidth = d.backgroundWidth;
    current.backgroundHeight = d.backgroundHeight;
    current.backgroundPosX = d.backgroundPosX;
    current.backgroundPosY = d.backgroundPosY;
    current.backgroundOpacity = d.backgroundOpacity;
    current.backgroundBlur = d.backgroundBlur;
    current.backgroundDim = d.backgroundDim;
  }

  function hasCustomBackground() {
    return current.background === "custom" && !!String(current.backgroundUrl || "").trim();
  }

  function devicePreviewRatio() {
    var w = Math.max(window.innerWidth || 360, 280);
    var h = Math.max(window.innerHeight || 640, 400);
    return clamp(w / h, 0.42, 2.5);
  }

  function syncPreviewFrameAspect(frame) {
    var ratio = devicePreviewRatio();
    var ratioText = ratio.toFixed(4);
    document.documentElement.style.setProperty("--bg-preview-ratio", ratioText);
    if (frame) frame.style.aspectRatio = ratioText;
  }

  function refreshBackgroundPreviewLayout() {
    var previewFrame = document.getElementById("settings-bg-preview-frame");
    var resizeBox = document.getElementById("settings-bg-resize-box");
    if (!previewFrame) return;
    syncPreviewFrameAspect(previewFrame);
    if (!hasCustomBackground()) return;
    pushBackgroundPreview(previewFrame);
    if (resizeBox) layoutBackgroundResizeBox(previewFrame, resizeBox);
  }

  var bgPreviewResizeBound = false;
  var bgPreviewObserver = null;

  function bindBackgroundPreviewResize() {
    if (bgPreviewResizeBound) return;
    bgPreviewResizeBound = true;
    var resizeTimer = 0;
    function scheduleRefresh() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(refreshBackgroundPreviewLayout, 80);
    }
    window.addEventListener("resize", scheduleRefresh);
    window.addEventListener("orientationchange", function () {
      setTimeout(refreshBackgroundPreviewLayout, 140);
    });
    if (typeof ResizeObserver !== "undefined") {
      bgPreviewObserver = new ResizeObserver(function () {
        scheduleRefresh();
      });
    }
  }

  function watchBackgroundPreviewFrame(frame) {
    if (!frame || !bgPreviewObserver) return;
    bgPreviewObserver.disconnect();
    bgPreviewObserver.observe(frame);
  }

  function layoutBackgroundResizeBox(frame, box) {
    if (!frame || !box) return;
    var rect = frame.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    var width = Number(current.backgroundWidth) || 100;
    var height = Number(current.backgroundHeight) || 100;
    var posX = Number(current.backgroundPosX);
    var posY = Number(current.backgroundPosY);
    if (isNaN(posX)) posX = 50;
    if (isNaN(posY)) posY = 50;
    var imgW = (width / 100) * rect.width;
    var imgH = (height / 100) * rect.height;
    var left = (posX / 100) * (rect.width - imgW);
    var top = (posY / 100) * (rect.height - imgH);
    box.style.left = left + "px";
    box.style.top = top + "px";
    box.style.width = Math.max(24, imgW) + "px";
    box.style.height = Math.max(24, imgH) + "px";
  }

  function posFromBoxEdges(left, top, imgW, imgH, frameW, frameH) {
    var posX = frameW === imgW ? 50 : clamp((left / (frameW - imgW)) * 100, 0, 100);
    var posY = frameH === imgH ? 50 : clamp((top / (frameH - imgH)) * 100, 0, 100);
    return { x: Math.round(posX), y: Math.round(posY) };
  }

  function applyBackgroundDragState(root, previewFrame, resizeBox) {
    save();
    if (window.KobranSiteBg && window.KobranSiteBg.previewAdjustments) {
      window.KobranSiteBg.previewAdjustments(current);
    }
    syncBackgroundAdjustSliders();
    pushBackgroundPreview(previewFrame);
    layoutBackgroundResizeBox(previewFrame, resizeBox);
  }

  function pushBackgroundPreview(el) {
    if (!el || !hasCustomBackground()) return;
    var url = current.backgroundUrl;
    var fit = current.backgroundFit || "cover";
    var width = Number(current.backgroundWidth) || 100;
    var height = Number(current.backgroundHeight) || 100;
    var posX = Number(current.backgroundPosX);
    var posY = Number(current.backgroundPosY);
    var opacity = Number(current.backgroundOpacity);
    var blur = Number(current.backgroundBlur) || 0;
    if (isNaN(posX)) posX = 50;
    if (isNaN(posY)) posY = 50;
    if (isNaN(opacity)) opacity = 100;
    var size =
      window.KobranSiteBg && window.KobranSiteBg.computeBackgroundSize
        ? window.KobranSiteBg.computeBackgroundSize(fit, width, height)
        : "cover";
    el.style.backgroundImage = 'url("' + String(url).replace(/"/g, "\\22") + '")';
    el.style.backgroundSize = size;
    el.style.backgroundPosition = clamp(posX, 0, 100) + "% " + clamp(posY, 0, 100) + "%";
    el.style.backgroundRepeat = fit === "tile" ? "repeat" : "no-repeat";
    el.style.opacity = String(clamp(opacity, 10, 100) / 100);
    el.style.filter = blur > 0 ? "blur(" + clamp(blur, 0, 20) + "px)" : "";
  }

  function updateBackgroundAdjustments(partial, root) {
    Object.keys(partial).forEach(function (key) {
      current[key] = partial[key];
    });
    save();
    if (window.KobranSiteBg && window.KobranSiteBg.previewAdjustments) {
      window.KobranSiteBg.previewAdjustments(current);
    }
    syncBackgroundUI(root);
    flashStatus();
  }

  function escAttr(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function applyWallpaperUrl(url, root) {
    var clean =
      window.KobranSiteBg && window.KobranSiteBg.sanitizeUrl
        ? window.KobranSiteBg.sanitizeUrl(url)
        : String(url || "").trim();
    if (!clean) return;
    current.background = "custom";
    current.backgroundUrl = clean;
    resetBackgroundAdjustments();
    save();
    apply();
    syncBackgroundUI(root);
    flashStatus();
  }

  function createWallpaperCard(item, root, activeUrl) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "settings-bg__option settings-wallpaper__option";
    btn.dataset.wallpaperUrl = item.url;
    if (activeUrl && current.background === "custom" && current.backgroundUrl === item.url) {
      btn.classList.add("settings-bg__option--active");
    }
    var thumb = item.thumb || item.url;
    btn.innerHTML =
      '<span class="settings-bg__thumb"><img src="' +
      escAttr(thumb) +
      '" alt="" width="160" height="100" loading="lazy" decoding="async" /></span><span class="settings-bg__label">' +
      escAttr(item.label || "Wallpaper") +
      "</span>";
    btn.addEventListener("click", function () {
      applyWallpaperUrl(item.url, root);
      var input = document.getElementById("set-background-url");
      if (input) input.value = item.url;
    });
    return btn;
  }

  function renderWallpaperGrid(host, items, root, emptyText) {
    if (!host) return;
    host.innerHTML = "";
    if (!items || !items.length) {
      host.innerHTML =
        '<p class="settings-wallpaper__empty">' +
        escAttr(emptyText || "No matches for that search. Try nature, city, space, or anime.") +
        "</p>";
      return;
    }
    var grid = document.createElement("div");
    grid.className = "settings-bg__grid settings-wallpaper__grid";
    items.forEach(function (item) {
      grid.appendChild(createWallpaperCard(item, root, true));
    });
    host.appendChild(grid);
  }

  function bindBackgroundUI(root) {
    if (!root) return;
    var presets = (window.KobranSiteBg && window.KobranSiteBg.presets) || {
      eclipse: { label: "Eclipse", url: "/assets/backgrounds/eclipse.svg" },
      nebula: { label: "Nebula", url: "/assets/backgrounds/nebula.svg" },
      void: { label: "Deep void", url: "/assets/backgrounds/void.svg" },
      dawn: { label: "Dawn", url: "/assets/backgrounds/dawn.svg" },
      grid: { label: "Grid", url: "/assets/backgrounds/grid.svg" },
    };
    var section = document.createElement("section");
    section.className = "settings-group glass-panel";
    var head = document.createElement("h3");
    head.className = "settings-group__title";
    head.textContent = "Background";
    section.appendChild(head);
    var body = document.createElement("div");
    body.className = "glass-panel__body settings-group__body settings-bg";
    var grid = document.createElement("div");
    grid.className = "settings-bg__grid";
    Object.keys(presets).forEach(function (key) {
      if (key === "custom") return;
      var meta = presets[key];
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "settings-bg__option";
      btn.dataset.bg = key;
      if (current.background === key) btn.classList.add("settings-bg__option--active");
      btn.innerHTML =
        '<span class="settings-bg__thumb"><img src="' +
        meta.url +
        '" alt="" width="160" height="100" loading="lazy" decoding="async" /></span><span class="settings-bg__label">' +
        meta.label +
        "</span>";
      btn.addEventListener("click", function () {
        set("background", key);
        set("backgroundUrl", "");
        resetBackgroundAdjustments();
        save();
        apply();
        syncBackgroundUI(root);
        flashStatus();
      });
      grid.appendChild(btn);
    });
    body.appendChild(grid);

    var dimWrap = document.createElement("div");
    dimWrap.className = "settings-bg__adjust-range settings-bg__dim-row";
    var dimCap = document.createElement("label");
    dimCap.className = "settings-bg__adjust-label";
    dimCap.setAttribute("for", "set-bg-backgroundDim");
    dimCap.textContent = "Dim overlay";
    var dimRow = document.createElement("div");
    dimRow.className = "settings-bg__adjust-range";
    var dimRange = document.createElement("input");
    dimRange.type = "range";
    dimRange.className = "settings-bg__adjust-input";
    dimRange.id = "set-bg-backgroundDim";
    dimRange.min = "0";
    dimRange.max = "80";
    dimRange.step = "1";
    dimRange.value = String(current.backgroundDim || 0);
    var dimOut = document.createElement("span");
    dimOut.className = "settings-bg__adjust-val";
    dimOut.id = "set-bg-backgroundDim-val";
    dimOut.textContent = String(current.backgroundDim || 0) + "%";
    dimRange.addEventListener("input", function () {
      var val = Number(dimRange.value);
      dimOut.textContent = val + "%";
      current.backgroundDim = val;
      save();
      apply();
      flashStatus();
    });
    dimRow.append(dimRange, dimOut);
    dimWrap.append(dimCap, dimRow);
    body.appendChild(dimWrap);

    var wallpaperTitle = document.createElement("p");
    wallpaperTitle.className = "settings-wallpaper__heading";
    wallpaperTitle.textContent = "Wallpapers";
    body.appendChild(wallpaperTitle);

    var curatedHost = document.createElement("div");
    curatedHost.className = "settings-wallpaper__curated";
    curatedHost.id = "settings-wallpaper-curated";
    body.appendChild(curatedHost);

    var curated =
      (window.KobranSiteBg && window.KobranSiteBg.curatedWallpapers) || [];
    renderWallpaperGrid(curatedHost, curated, root);

    var searchLead = document.createElement("p");
    searchLead.className = "settings-wallpaper__lead";
    searchLead.textContent =
      "Search for hundreds of free wallpapers from across the web here.";
    body.appendChild(searchLead);

    var searchWrap = document.createElement("div");
    searchWrap.className = "settings-wallpaper__search";
    var searchInput = document.createElement("input");
    searchInput.type = "search";
    searchInput.className = "settings-bg__input settings-wallpaper__search-input";
    searchInput.id = "settings-wallpaper-search";
    searchInput.placeholder = "Search wallpapers";
    searchInput.autocomplete = "off";
    searchInput.spellcheck = false;
    var searchBtn = document.createElement("button");
    searchBtn.type = "button";
    searchBtn.className = "settings-bg__apply";
    searchBtn.textContent = "Search";
    var surpriseBtn = document.createElement("button");
    surpriseBtn.type = "button";
    surpriseBtn.className = "settings-bg__apply settings-bg__apply--ghost settings-wallpaper__surprise";
    surpriseBtn.textContent = "Surprise me";
    surpriseBtn.addEventListener("click", function () {
      surpriseBtn.disabled = true;
      surpriseBtn.textContent = "Picking…";
      fetch("/api/wallpapers/surprise")
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          if (data && data.item && data.item.url) applyWallpaperUrl(data.item.url, root);
        })
        .catch(function () {})
        .finally(function () {
          surpriseBtn.disabled = false;
          surpriseBtn.textContent = "Surprise me";
        });
    });
    searchWrap.append(searchInput, searchBtn, surpriseBtn);
    body.appendChild(searchWrap);

    var resultsHost = document.createElement("div");
    resultsHost.className = "settings-wallpaper__results";
    resultsHost.id = "settings-wallpaper-results";
    body.appendChild(resultsHost);

    var searchPage = 1;
    var searchQuery = "";
    var searchBusy = false;

    function runWallpaperSearch(page) {
      var q = searchInput.value.trim();
      if (!q || searchBusy) return;
      searchBusy = true;
      searchQuery = q;
      searchPage = page || 1;
      resultsHost.innerHTML = '<p class="settings-wallpaper__loading">Searching wallpapers…</p>';
      fetch("/api/wallpapers/search?q=" + encodeURIComponent(q) + "&page=" + searchPage)
        .then(function (res) {
          return res.json().then(function (data) {
            return { ok: res.ok, data: data };
          });
        })
        .then(function (pack) {
          var data = pack.data || {};
          if (!pack.ok || data.error) {
            resultsHost.innerHTML =
              '<p class="settings-wallpaper__empty">Wallpaper search is temporarily unavailable. Try again in a moment.</p>';
            return;
          }
          renderWallpaperGrid(
            resultsHost,
            data.items || [],
            root,
            'No matches for "' + q + '". Try nature, neon city, anime, or space.'
          );
          if (data.items && data.items.length) {
            var meta = document.createElement("p");
            meta.className = "settings-wallpaper__meta";
            var totalText =
              data.total && data.total > data.items.length
                ? Number(data.total).toLocaleString() + " wallpapers available"
                : data.items.length + " wallpapers found";
            meta.textContent = "Showing " + data.items.length + " · " + totalText;
            resultsHost.appendChild(meta);
          }
        })
        .catch(function () {
          resultsHost.innerHTML = '<p class="settings-wallpaper__empty">Could not search wallpapers. Try again.</p>';
        })
        .finally(function () {
          searchBusy = false;
        });
    }

    searchBtn.addEventListener("click", function () {
      runWallpaperSearch(1);
    });
    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        runWallpaperSearch(1);
      }
    });

    var customWrap = document.createElement("div");
    customWrap.className = "settings-bg__custom";
    var input = document.createElement("input");
    input.type = "url";
    input.className = "settings-bg__input";
    input.id = "set-background-url";
    input.placeholder = "Paste image URL (https://...)";
    input.value = current.backgroundUrl || "";
    var applyBtn = document.createElement("button");
    applyBtn.type = "button";
    applyBtn.className = "settings-bg__apply";
    applyBtn.textContent = "Apply URL";
    function applyCustomUrl() {
      var url = window.KobranSiteBg && window.KobranSiteBg.sanitizeUrl
        ? window.KobranSiteBg.sanitizeUrl(input.value)
        : input.value.trim();
      if (!url) return;
      applyWallpaperUrl(url, root);
    }
    applyBtn.addEventListener("click", applyCustomUrl);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        applyCustomUrl();
      }
    });
    customWrap.append(input, applyBtn);
    body.appendChild(customWrap);
    var uploadWrap = document.createElement("div");
    uploadWrap.className = "settings-bg__custom";
    var fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.className = "settings-bg__file";
    fileInput.id = "set-background-file";
    var uploadBtn = document.createElement("button");
    uploadBtn.type = "button";
    uploadBtn.className = "settings-bg__apply settings-bg__apply--ghost";
    uploadBtn.textContent = "Upload image";
    uploadBtn.addEventListener("click", function () {
      fileInput.click();
    });
    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      if (file.size > 900000) {
        flashStatus();
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        var url = String(reader.result || "");
        if (!url) return;
        applyWallpaperUrl(url, root);
      };
      reader.readAsDataURL(file);
    });
    uploadWrap.append(uploadBtn, fileInput);
    body.appendChild(uploadWrap);

    var adjust = document.createElement("div");
    adjust.className = "settings-bg__adjust";
    adjust.id = "settings-bg-adjust";
    adjust.hidden = !hasCustomBackground();

    var adjustTitle = document.createElement("p");
    adjustTitle.className = "settings-bg__adjust-title";
    adjustTitle.textContent = "Image adjuster";
    adjust.appendChild(adjustTitle);

    var preview = document.createElement("div");
    preview.className = "settings-bg__preview";
    preview.id = "settings-bg-preview";
    var previewFrame = document.createElement("div");
    previewFrame.className = "settings-bg__preview-frame";
    previewFrame.id = "settings-bg-preview-frame";
    var resizeBox = document.createElement("div");
    resizeBox.className = "settings-bg__resize-box";
    resizeBox.id = "settings-bg-resize-box";
    resizeBox.innerHTML =
      '<span class="settings-bg__resize-handle settings-bg__resize-handle--e" data-resize="e" aria-hidden="true"></span>' +
      '<span class="settings-bg__resize-handle settings-bg__resize-handle--s" data-resize="s" aria-hidden="true"></span>' +
      '<span class="settings-bg__resize-handle settings-bg__resize-handle--se" data-resize="se" aria-hidden="true"></span>';
    previewFrame.appendChild(resizeBox);
    var previewHint = document.createElement("span");
    previewHint.className = "settings-bg__preview-hint";
    previewHint.textContent = "Drag to move · edges to resize";
    preview.append(previewFrame, previewHint);
    adjust.appendChild(preview);

    var fitRow = document.createElement("div");
    fitRow.className = "settings-bg__fit-row";
    ["cover", "contain", "stretch", "tile"].forEach(function (mode) {
      var fitBtn = document.createElement("button");
      fitBtn.type = "button";
      fitBtn.className = "settings-bg__fit-btn";
      fitBtn.dataset.fit = mode;
      fitBtn.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
      if ((current.backgroundFit || "cover") === mode) fitBtn.classList.add("settings-bg__fit-btn--active");
      fitBtn.addEventListener("click", function () {
        updateBackgroundAdjustments({ backgroundFit: mode }, root);
      });
      fitRow.appendChild(fitBtn);
    });
    adjust.appendChild(fitRow);

    var adjustControls = document.createElement("div");
    adjustControls.className = "settings-bg__adjust-grid";

    function addAdjustSlider(key, label, min, max, step, unit) {
      var wrap = document.createElement("label");
      wrap.className = "settings-bg__adjust-field";
      var cap = document.createElement("span");
      cap.className = "settings-bg__adjust-label";
      cap.textContent = label;
      var row = document.createElement("div");
      row.className = "settings-bg__adjust-range";
      var range = document.createElement("input");
      range.type = "range";
      range.className = "settings-bg__adjust-input";
      range.id = "set-bg-" + key;
      range.min = String(min);
      range.max = String(max);
      range.step = String(step);
      range.value = String(current[key]);
      var out = document.createElement("span");
      out.className = "settings-bg__adjust-val";
      out.id = "set-bg-" + key + "-val";
      out.textContent = current[key] + (unit || "");
      range.addEventListener("input", function () {
        var val = Number(range.value);
        out.textContent = val + (unit || "");
        current[key] = val;
        save();
        if (window.KobranSiteBg && window.KobranSiteBg.previewAdjustments) {
          window.KobranSiteBg.previewAdjustments(current);
        }
        pushBackgroundPreview(previewFrame);
        layoutBackgroundResizeBox(previewFrame, resizeBox);
        flashStatus();
      });
      row.append(range, out);
      wrap.append(cap, row);
      adjustControls.appendChild(wrap);
    }

    addAdjustSlider("backgroundWidth", "Width", 25, 400, 5, "%");
    addAdjustSlider("backgroundHeight", "Height", 25, 400, 5, "%");
    addAdjustSlider("backgroundPosX", "Position X", 0, 100, 1, "%");
    addAdjustSlider("backgroundPosY", "Position Y", 0, 100, 1, "%");
    addAdjustSlider("backgroundOpacity", "Opacity", 10, 100, 1, "%");
    addAdjustSlider("backgroundBlur", "Blur", 0, 20, 1, "px");
    adjust.appendChild(adjustControls);

    var resetAdjustBtn = document.createElement("button");
    resetAdjustBtn.type = "button";
    resetAdjustBtn.className = "settings-bg__apply settings-bg__apply--ghost";
    resetAdjustBtn.textContent = "Reset image adjustments";
    resetAdjustBtn.addEventListener("click", function () {
      resetBackgroundAdjustments();
      save();
      apply();
      syncBackgroundUI(root);
      flashStatus();
    });
    adjust.appendChild(resetAdjustBtn);
    body.appendChild(adjust);

    var dragMode = "";
    var dragX = 0;
    var dragY = 0;
    var dragPosX = 50;
    var dragPosY = 50;
    var dragWidth = 100;
    var dragHeight = 100;
    var dragBoxLeft = 0;
    var dragBoxTop = 0;

    previewFrame.addEventListener("pointerdown", function (e) {
      if (!hasCustomBackground()) return;
      var handle = e.target.closest("[data-resize]");
      if (handle) {
        dragMode = handle.getAttribute("data-resize") || "";
      } else if (e.target === resizeBox || resizeBox.contains(e.target)) {
        dragMode = "pan";
      } else {
        dragMode = "pan-bg";
      }
      dragX = e.clientX;
      dragY = e.clientY;
      dragPosX = Number(current.backgroundPosX) || 50;
      dragPosY = Number(current.backgroundPosY) || 50;
      dragWidth = Number(current.backgroundWidth) || 100;
      dragHeight = Number(current.backgroundHeight) || 100;
      var rect = previewFrame.getBoundingClientRect();
      var imgW = (dragWidth / 100) * rect.width;
      var imgH = (dragHeight / 100) * rect.height;
      dragBoxLeft = (dragPosX / 100) * (rect.width - imgW);
      dragBoxTop = (dragPosY / 100) * (rect.height - imgH);
      previewFrame.setPointerCapture(e.pointerId);
      previewFrame.classList.add("settings-bg__preview-frame--dragging");
      if (dragMode === "e" || dragMode === "s" || dragMode === "se") {
        previewFrame.classList.add("settings-bg__preview-frame--resizing");
      }
      e.preventDefault();
    });
    previewFrame.addEventListener("pointermove", function (e) {
      if (!dragMode) return;
      var rect = previewFrame.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      var dx = e.clientX - dragX;
      var dy = e.clientY - dragY;
      var pointerLeft = e.clientX - rect.left;
      var pointerTop = e.clientY - rect.top;
      var imgW = (dragWidth / 100) * rect.width;
      var imgH = (dragHeight / 100) * rect.height;
      var left = dragBoxLeft;
      var top = dragBoxTop;

      if (dragMode === "pan") {
        left = dragBoxLeft + dx;
        top = dragBoxTop + dy;
        var pos = posFromBoxEdges(left, top, imgW, imgH, rect.width, rect.height);
        current.backgroundPosX = pos.x;
        current.backgroundPosY = pos.y;
      } else if (dragMode === "pan-bg") {
        current.backgroundPosX = Math.round(clamp(dragPosX - (dx / rect.width) * 100, 0, 100));
        current.backgroundPosY = Math.round(clamp(dragPosY - (dy / rect.height) * 100, 0, 100));
      } else if (dragMode === "e") {
        imgW = clamp(pointerLeft - dragBoxLeft, rect.width * 0.25, rect.width * 4);
        current.backgroundWidth = Math.round(clamp((imgW / rect.width) * 100, 25, 400));
        var posE = posFromBoxEdges(dragBoxLeft, dragBoxTop, imgW, imgH, rect.width, rect.height);
        current.backgroundPosX = posE.x;
        current.backgroundPosY = posE.y;
      } else if (dragMode === "s") {
        imgH = clamp(pointerTop - dragBoxTop, rect.height * 0.25, rect.height * 4);
        current.backgroundHeight = Math.round(clamp((imgH / rect.height) * 100, 25, 400));
        var posS = posFromBoxEdges(dragBoxLeft, dragBoxTop, imgW, imgH, rect.width, rect.height);
        current.backgroundPosX = posS.x;
        current.backgroundPosY = posS.y;
      } else if (dragMode === "se") {
        imgW = clamp(pointerLeft - dragBoxLeft, rect.width * 0.25, rect.width * 4);
        imgH = clamp(pointerTop - dragBoxTop, rect.height * 0.25, rect.height * 4);
        current.backgroundWidth = Math.round(clamp((imgW / rect.width) * 100, 25, 400));
        current.backgroundHeight = Math.round(clamp((imgH / rect.height) * 100, 25, 400));
        var posSe = posFromBoxEdges(dragBoxLeft, dragBoxTop, imgW, imgH, rect.width, rect.height);
        current.backgroundPosX = posSe.x;
        current.backgroundPosY = posSe.y;
      }

      applyBackgroundDragState(root, previewFrame, resizeBox);
    });
    function endDrag(e) {
      if (!dragMode) return;
      dragMode = "";
      previewFrame.classList.remove("settings-bg__preview-frame--dragging");
      previewFrame.classList.remove("settings-bg__preview-frame--resizing");
      if (e && previewFrame.hasPointerCapture(e.pointerId)) {
        previewFrame.releasePointerCapture(e.pointerId);
      }
      flashStatus();
    }
    previewFrame.addEventListener("pointerup", endDrag);
    previewFrame.addEventListener("pointercancel", endDrag);

    requestAnimationFrame(function () {
      syncPreviewFrameAspect(previewFrame);
      pushBackgroundPreview(previewFrame);
      layoutBackgroundResizeBox(previewFrame, resizeBox);
      bindBackgroundPreviewResize();
      watchBackgroundPreviewFrame(previewFrame);
    });

    var hint = document.createElement("p");
    hint.className = "settings-bg__hint";
    hint.textContent = "Grid is the default. Paste a link or upload an image, then use the adjuster to fine-tune it.";
    body.appendChild(hint);
    section.appendChild(body);
    root.appendChild(section);
  }

  function syncBackgroundAdjustSliders() {
    ["backgroundWidth", "backgroundHeight", "backgroundPosX", "backgroundPosY", "backgroundOpacity", "backgroundBlur", "backgroundDim"].forEach(function (key) {
      var range = document.getElementById("set-bg-" + key);
      var out = document.getElementById("set-bg-" + key + "-val");
      if (!range || document.activeElement === range) return;
      range.value = String(current[key]);
      if (out) {
        out.textContent =
          current[key] +
          (key === "backgroundBlur" ? "px" : "%");
      }
    });
    var dimTop = document.getElementById("set-bg-backgroundDim");
    var dimTopOut = document.getElementById("set-bg-backgroundDim-val");
    if (dimTop && document.activeElement !== dimTop) {
      dimTop.value = String(current.backgroundDim || 0);
      if (dimTopOut) dimTopOut.textContent = String(current.backgroundDim || 0) + "%";
    }
    document.querySelectorAll(".settings-bg__fit-btn").forEach(function (btn) {
      btn.classList.toggle("settings-bg__fit-btn--active", btn.dataset.fit === (current.backgroundFit || "cover"));
    });
  }

  function syncBackgroundUI(root) {
    if (!root) root = document.getElementById("settings-root");
    if (!root) return;
    root.querySelectorAll(".settings-bg__option").forEach(function (btn) {
      var active = current.background === btn.dataset.bg;
      btn.classList.toggle("settings-bg__option--active", active);
    });
    root.querySelectorAll(".settings-wallpaper__option").forEach(function (btn) {
      var url = btn.dataset.wallpaperUrl || "";
      var active = current.background === "custom" && current.backgroundUrl === url;
      btn.classList.toggle("settings-bg__option--active", active);
    });
    var input = document.getElementById("set-background-url");
    if (input && document.activeElement !== input) input.value = current.backgroundUrl || "";
    var adjust = document.getElementById("settings-bg-adjust");
    if (adjust) adjust.hidden = !hasCustomBackground();
    var previewFrame = document.getElementById("settings-bg-preview-frame");
    var resizeBox = document.getElementById("settings-bg-resize-box");
    if (previewFrame) syncPreviewFrameAspect(previewFrame);
    if (previewFrame) pushBackgroundPreview(previewFrame);
    if (previewFrame && resizeBox) layoutBackgroundResizeBox(previewFrame, resizeBox);
    syncBackgroundAdjustSliders();
  }

  function bindAdminPanel() {
    var resetBtn = document.getElementById("settings-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        reset();
        var root = document.getElementById("settings-root");
        syncUI(root);
      });
    }
  }

  function buildThemeControl(item) {
    var row = document.createElement("div");
    row.className = "settings-row settings-row--theme";
    row.dataset.key = item.key;
    var label = document.createElement("label");
    label.className = "settings-label";
    label.textContent = item.label;
    row.appendChild(label);

    var grid = document.createElement("div");
    grid.className = "settings-theme__grid";
    themePresets.forEach(function (preset) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "settings-theme__option";
      btn.dataset.theme = preset.id;
      if (current.theme === preset.id) btn.classList.add("settings-theme__option--active");
      var swatch = document.createElement("span");
      swatch.className = "settings-theme__swatch";
      swatch.style.background =
        "linear-gradient(135deg, " + preset.swatch[0] + " 0%, " + preset.swatch[1] + " 52%, " + preset.swatch[2] + " 100%)";
      var name = document.createElement("span");
      name.className = "settings-theme__name";
      name.textContent = preset.label;
      btn.append(swatch, name);
      btn.addEventListener("click", function () {
        set("theme", preset.id);
        syncThemeUI(row);
        flashStatus();
      });
      grid.appendChild(btn);
    });
    row.appendChild(grid);

    var custom = document.createElement("div");
    custom.className = "settings-theme__custom";
    var customBtn = document.createElement("button");
    customBtn.type = "button";
    customBtn.className = "settings-theme__option settings-theme__option--custom";
    customBtn.dataset.theme = "custom";
    if (current.theme === "custom") customBtn.classList.add("settings-theme__option--active");
    var customSwatch = document.createElement("span");
    customSwatch.className = "settings-theme__swatch settings-theme__swatch--custom";
    var customHex = normalizeHex(current.customAccent || defaults.customAccent) || defaults.customAccent;
    customSwatch.style.background = "linear-gradient(135deg, " + customHex + " 0%, " + customHex + "dd 100%)";
    var customName = document.createElement("span");
    customName.className = "settings-theme__name";
    customName.textContent = "Custom";
    customBtn.append(customSwatch, customName);
    customBtn.addEventListener("click", function () {
      set("theme", "custom");
      syncThemeUI(row);
      flashStatus();
    });

    var pickerWrap = document.createElement("div");
    pickerWrap.className = "settings-theme__picker";
    var colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.className = "settings-theme__color";
    colorInput.id = "set-theme-color";
    colorInput.value = customHex;
    var hexInput = document.createElement("input");
    hexInput.type = "text";
    hexInput.className = "settings-theme__hex";
    hexInput.id = "set-theme-hex";
    hexInput.placeholder = "#a78bfa";
    hexInput.value = customHex;
    hexInput.maxLength = 7;
    hexInput.spellcheck = false;

    function applyCustomHex(raw, fromPicker) {
      var hex = normalizeHex(raw);
      if (!hex) {
        hexInput.value = normalizeHex(current.customAccent || defaults.customAccent) || defaults.customAccent;
        return;
      }
      current.customAccent = hex;
      current.theme = "custom";
      if (!fromPicker) colorInput.value = hex;
      if (fromPicker) hexInput.value = hex;
      customSwatch.style.background = "linear-gradient(135deg, " + hex + " 0%, " + hex + "dd 100%)";
      save();
      apply();
      syncThemeUI(row);
      flashStatus();
    }

    colorInput.addEventListener("input", function () {
      applyCustomHex(colorInput.value, true);
    });
    hexInput.addEventListener("change", function () {
      applyCustomHex(hexInput.value, false);
    });
    hexInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        applyCustomHex(hexInput.value, false);
      }
    });

    pickerWrap.append(colorInput, hexInput);
    custom.append(customBtn, pickerWrap);
    row.appendChild(custom);
    return row;
  }

  function syncThemeUI(row) {
    if (!row) {
      row = document.querySelector('.settings-row[data-key="theme"]');
    }
    if (!row) return;
    var activeTheme = current.theme;
    var hex = normalizeHex(current.customAccent || defaults.customAccent) || defaults.customAccent;
    row.querySelectorAll(".settings-theme__option").forEach(function (btn) {
      btn.classList.toggle("settings-theme__option--active", btn.dataset.theme === activeTheme);
    });
    var swatch = row.querySelector(".settings-theme__swatch--custom");
    if (swatch) swatch.style.background = "linear-gradient(135deg, " + hex + " 0%, " + hex + "dd 100%)";
    var colorInput = row.querySelector(".settings-theme__color");
    var hexInput = row.querySelector(".settings-theme__hex");
    if (colorInput && document.activeElement !== colorInput) colorInput.value = hex;
    if (hexInput && document.activeElement !== hexInput) hexInput.value = hex;
  }

  function buildControl(item) {
    if (item.type === "theme") return buildThemeControl(item);
    var row = document.createElement("div");
    row.className = "settings-row" + (item.desc ? " settings-row--desc" : "");
    row.dataset.key = item.key;
    if (item.danger) row.dataset.danger = "1";
    var labelWrap = document.createElement("div");
    labelWrap.className = "settings-label-wrap";
    var label = document.createElement("label");
    label.className = "settings-label";
    label.textContent = item.label;
    label.setAttribute("for", "set-" + item.key);
    labelWrap.appendChild(label);
    if (item.desc) {
      var desc = document.createElement("p");
      desc.className = "settings-desc";
      desc.textContent = item.desc;
      labelWrap.appendChild(desc);
    }
    row.appendChild(labelWrap);
    var val = current[item.key];
    if (item.type === "toggle") {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "settings-toggle" +
        (val ? " settings-toggle--on" : "") +
        (item.danger ? " settings-toggle--danger" : "");
      btn.id = "set-" + item.key;
      btn.setAttribute("aria-pressed", String(!!val));
      btn.innerHTML = '<span class="settings-toggle__track"><span class="settings-toggle__knob"></span></span><span class="settings-toggle__text">' + (val ? "ON" : "OFF") + "</span>";
      btn.addEventListener("click", function () {
        set(item.key, !get(item.key));
        syncControl(row, item);
        flashStatus();
      });
      row.appendChild(btn);
    } else if (item.type === "select") {
      var sel = document.createElement("select");
      sel.className = "settings-select";
      sel.id = "set-" + item.key;
      item.options.forEach(function (opt) {
        var o = document.createElement("option");
        o.value = opt.v;
        o.textContent = opt.l;
        if (opt.v === val) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener("change", function () {
        set(item.key, sel.value);
        flashStatus();
      });
      row.appendChild(sel);
    } else if (item.type === "range") {
      var wrap = document.createElement("div");
      wrap.className = "settings-range";
      var range = document.createElement("input");
      range.type = "range";
      range.className = "settings-range__input";
      range.id = "set-" + item.key;
      range.min = item.min;
      range.max = item.max;
      range.step = item.step;
      range.value = val;
      var out = document.createElement("span");
      out.className = "settings-range__val";
      out.textContent = val + (item.unit || "");
      range.addEventListener("input", function () {
        out.textContent = range.value + (item.unit || "");
        set(item.key, Number(range.value));
        flashStatus();
      });
      wrap.append(range, out);
      row.appendChild(wrap);
    }
    return row;
  }

  function syncControl(row, item) {
    if (item.type === "theme") {
      syncThemeUI(row);
      return;
    }
    var val = current[item.key];
    if (item.type === "toggle") {
      var btn = row.querySelector(".settings-toggle");
      if (!btn) return;
      btn.classList.toggle("settings-toggle--on", !!val);
      if (row.dataset.danger === "1") btn.classList.add("settings-toggle--danger");
      btn.setAttribute("aria-pressed", String(!!val));
      var txt = btn.querySelector(".settings-toggle__text");
      if (txt) txt.textContent = val ? "ON" : "OFF";
    } else if (item.type === "select") {
      var sel = row.querySelector("select");
      if (sel) sel.value = val;
    } else if (item.type === "range") {
      var range = row.querySelector('input[type="range"]');
      var out = row.querySelector(".settings-range__val");
      if (range) range.value = val;
      if (out) out.textContent = val + (item.unit || "");
    }
  }

  function syncUI(root) {
    if (!root) root = document.getElementById("settings-root");
    if (!root) return;
    root.querySelectorAll(".settings-row").forEach(function (row) {
      var key = row.dataset.key;
      if (!key) return;
      if (key === "theme") {
        syncThemeUI(row);
        return;
      }
      var itemType = row.querySelector(".settings-toggle")
        ? "toggle"
        : row.querySelector("select")
          ? "select"
          : "range";
      syncControl(row, { key: key, type: itemType, unit: key === "glow" || key === "typingOpacity" ? "%" : "" });
    });
    syncBackgroundUI(root);
  }

  function flashStatus() {
    var el = document.getElementById("settings-status");
    if (!el) return;
    el.textContent = "Applied at " + new Date().toLocaleTimeString();
  }

  function initUI() {
    bindBackgroundPreviewResize();
    bindSettingsUI();
    bindAdminPanel();
    refreshBackgroundPreviewLayout();
  }

  load();
  apply();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initUI);
  } else {
    initUI();
  }

  return {
    get: get,
    getAll: getAll,
    set: set,
    reset: reset,
    apply: apply,
    defaults: clone(defaults),
    markPerformancePromptDone: function (lite) {
      current.performancePromptDone = true;
      current.performanceMode = !!lite;
      save();
      apply();
    },
    needsPerformancePrompt: function () {
      return !current.performancePromptDone;
    },
  };
})();
