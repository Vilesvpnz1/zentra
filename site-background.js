window.ZentraSiteBg = (function () {
  var STORAGE_KEY = "kritikal-settings-v1";
  var PRESETS = {
    eclipse: { label: "Eclipse", url: "/assets/backgrounds/eclipse.svg", animated: true },
    nebula: { label: "Nebula", url: "/assets/backgrounds/nebula.svg", animated: false },
    void: { label: "Deep void", url: "/assets/backgrounds/void.svg", animated: false },
    dawn: { label: "Dawn", url: "/assets/backgrounds/dawn.svg", animated: false },
    grid: { label: "Grid", url: "/assets/backgrounds/grid.svg", animated: false },
    custom: { label: "Custom URL", url: "", animated: false },
  };

  function readStored() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { background: "grid", backgroundUrl: "" };
      var parsed = JSON.parse(raw);
      return {
        background: parsed.background || "grid",
        backgroundUrl: parsed.backgroundUrl || "",
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

  function apply(stored) {
    stored = stored || readStored();
    var pack = resolveImage(stored);
    var root = document.documentElement;
    var layer = document.getElementById("zentra-bg");
    root.setAttribute("data-bg-preset", pack.preset);
    root.classList.toggle("zentra-bg--animated", pack.animated);
    if (layer) {
      layer.style.backgroundImage = pack.image ? 'url("' + pack.image.replace(/"/g, "\\22") + '")' : "";
    }
  }

  function sync() {
    var S = window.KritikalSettings;
    if (S && typeof S.getAll === "function") {
      var all = S.getAll();
      apply({ background: all.background, backgroundUrl: all.backgroundUrl });
      return;
    }
    apply();
  }

  window.addEventListener("kritikal-settings", sync);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sync);
  } else {
    sync();
  }

  return {
    presets: PRESETS,
    apply: apply,
    sync: sync,
    sanitizeUrl: sanitizeUrl,
  };
})();
