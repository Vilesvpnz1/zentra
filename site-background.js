window.KobranSiteBg = (function () {
  var STORAGE_KEY = "kobran-settings-v1";
  var PRESETS = {
    eclipse: { label: "Eclipse", url: "/assets/backgrounds/eclipse.svg", animated: true },
    nebula: { label: "Nebula", url: "/assets/backgrounds/nebula.svg", animated: false },
    void: { label: "Deep void", url: "/assets/backgrounds/void.svg", animated: false },
    dawn: { label: "Dawn", url: "/assets/backgrounds/dawn.svg", animated: false },
    grid: { label: "Grid", url: "/assets/backgrounds/grid.svg", animated: false },
    custom: { label: "Custom URL", url: "", animated: false },
  };

  var CURATED_WALLPAPERS = [
    {
      id: "samurai-bloom",
      label: "Samurai Bloom",
      url: "https://i.redd.it/tacuww7vhvaf1.jpeg",
      thumb: "https://i.redd.it/tacuww7vhvaf1.jpeg",
    },
    {
      id: "alien-ridge",
      label: "Alien Ridge",
      url: "https://images2.alphacoders.com/783/783391.png",
      thumb: "https://images2.alphacoders.com/783/783391.png",
    },
    {
      id: "moon-lake",
      label: "Moon Lake",
      url: "https://www.designyourway.net/blog/wp-content/uploads/2018/01/3d-Desktop-Backgrounds.jpg",
      thumb: "https://www.designyourway.net/blog/wp-content/uploads/2018/01/3d-Desktop-Backgrounds.jpg",
    },
    {
      id: "neon-city",
      label: "Neon City",
      url: "https://wallpaperaccess.com/full/627165.jpg",
      thumb: "https://wallpaperaccess.com/full/627165.jpg",
    },
  ];

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function resolveDimensions(stored) {
    var width = Number(stored.backgroundWidth);
    var height = Number(stored.backgroundHeight);
    if (isNaN(width) && stored.backgroundScale != null) width = Number(stored.backgroundScale);
    if (isNaN(height) && stored.backgroundScale != null) height = Number(stored.backgroundScale);
    return {
      width: clamp(isNaN(width) ? 100 : width, 25, 400),
      height: clamp(isNaN(height) ? 100 : height, 25, 400),
    };
  }

  function readStored() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { background: "grid", backgroundUrl: "" };
      var parsed = JSON.parse(raw);
      return {
        background: parsed.background || "grid",
        backgroundUrl: parsed.backgroundUrl || "",
        backgroundFit: parsed.backgroundFit || "cover",
        backgroundWidth: parsed.backgroundWidth,
        backgroundHeight: parsed.backgroundHeight,
        backgroundScale: parsed.backgroundScale,
        backgroundPosX: parsed.backgroundPosX,
        backgroundPosY: parsed.backgroundPosY,
        backgroundOpacity: parsed.backgroundOpacity,
        backgroundBlur: parsed.backgroundBlur,
        backgroundDim: parsed.backgroundDim,
      };
    } catch (e) {
      return { background: "grid", backgroundUrl: "" };
    }
  }

  function sanitizeUrl(url) {
    var u = String(url || "").trim();
    if (/^data:image\//i.test(u)) return u.slice(0, 950000);
    if (!/^https?:\/\//i.test(u)) return "";
    return u.slice(0, 1200);
  }

  function resolveImage(stored) {
    var preset = stored.background || "grid";
    if (preset === "custom") {
      var custom = sanitizeUrl(stored.backgroundUrl);
      return { preset: custom ? "custom" : "grid", image: custom || PRESETS.grid.url, animated: false };
    }
    var meta = PRESETS[preset] || PRESETS.grid;
    return { preset: preset, image: meta.url, animated: !!meta.animated };
  }

  function computeBackgroundSize(fit, width, height) {
    var dims = resolveDimensions({ backgroundWidth: width, backgroundHeight: height });
    var w = dims.width;
    var h = dims.height;
    fit = fit || "cover";
    if (fit === "tile") {
      if (w === h) return w + "%";
      return w + "% " + h + "%";
    }
    if (fit === "stretch") return w + "% " + h + "%";
    if (fit === "contain") {
      if (w === 100 && h === 100) return "contain";
      return w + "% " + h + "%";
    }
    if (w === 100 && h === 100) return "cover";
    return w + "% " + h + "%";
  }

  function applyAdjustments(layer, stored, isCustom) {
    if (!layer) return;
    if (!isCustom) {
      layer.style.backgroundSize = "";
      layer.style.backgroundPosition = "";
      layer.style.backgroundRepeat = "";
      layer.style.opacity = "";
      layer.style.filter = "";
      return;
    }
    var fit = stored.backgroundFit || "cover";
    var dims = resolveDimensions(stored);
    var posX = Number(stored.backgroundPosX);
    var posY = Number(stored.backgroundPosY);
    var opacity = Number(stored.backgroundOpacity);
    var blur = Number(stored.backgroundBlur) || 0;
    if (isNaN(posX)) posX = 50;
    if (isNaN(posY)) posY = 50;
    if (isNaN(opacity)) opacity = 100;
    layer.style.backgroundSize = computeBackgroundSize(fit, dims.width, dims.height);
    layer.style.backgroundPosition = clamp(posX, 0, 100) + "% " + clamp(posY, 0, 100) + "%";
    layer.style.backgroundRepeat = fit === "tile" ? "repeat" : "no-repeat";
    layer.style.opacity = String(clamp(opacity, 10, 100) / 100);
    layer.style.filter = blur > 0 ? "blur(" + clamp(blur, 0, 20) + "px)" : "";
  }

  function applyDim(stored) {
    var layer = document.getElementById("kobran-bg-dim");
    if (!layer) return;
    var dim = Number(stored.backgroundDim);
    if (isNaN(dim)) dim = 34;
    dim = clamp(dim, 0, 80);
    document.documentElement.style.setProperty("--bg-dim-opacity", String(dim / 100));
  }

  function apply(stored) {
    stored = stored || readStored();
    var pack = resolveImage(stored);
    var root = document.documentElement;
    var layer = document.getElementById("kobran-bg");
    root.setAttribute("data-bg-preset", pack.preset);
    root.classList.toggle("kobran-bg--animated", pack.animated);
    if (layer) {
      layer.style.backgroundImage = pack.image ? 'url("' + pack.image.replace(/"/g, "\\22") + '")' : "";
      applyAdjustments(layer, stored, pack.preset === "custom");
    }
    applyDim(stored);
  }

  function sync() {
    var S = window.KobranSettings;
    if (S && typeof S.getAll === "function") {
      apply(S.getAll());
      return;
    }
    apply();
  }

  function previewAdjustments(stored) {
    var layer = document.getElementById("kobran-bg");
    if (!layer) return;
    var pack = resolveImage(stored);
    if (pack.preset !== "custom") return;
    layer.style.backgroundImage = pack.image ? 'url("' + pack.image.replace(/"/g, "\\22") + '")' : "";
    applyAdjustments(layer, stored, true);
  }

  window.addEventListener("kobran-settings", sync);

  var resizeTimer = 0;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(sync, 100);
  });

  window.addEventListener("orientationchange", function () {
    setTimeout(sync, 150);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sync);
  } else {
    sync();
  }

  return {
    presets: PRESETS,
    curatedWallpapers: CURATED_WALLPAPERS,
    apply: apply,
    sync: sync,
    previewAdjustments: previewAdjustments,
    sanitizeUrl: sanitizeUrl,
    computeBackgroundSize: computeBackgroundSize,
    defaults: {
      backgroundFit: "cover",
      backgroundWidth: 100,
      backgroundHeight: 100,
      backgroundPosX: 50,
      backgroundPosY: 50,
      backgroundOpacity: 100,
      backgroundBlur: 0,
      backgroundDim: 34,
    },
  };
})();
