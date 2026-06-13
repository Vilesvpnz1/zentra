window.KritikalSettings = (function () {
  var STORAGE_KEY = "kritikal-settings-v1";

  var defaults = {
    theme: "green",
    glow: 55,
    fontSize: "md",
    crt: false,
    scanSweep: false,
    typingBg: true,
    typingSpeed: "medium",
    typingIntensity: "medium",
    particles: true,
    matrixGrid: true,
    compactGrid: false,
    textGlow: false,
    typingOpacity: 40,
    cursorTrail: false,
    navLabelsAlways: false,
  };

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

  function applyTheme(name) {
    var t = themes[name] || themes.green;
    var root = document.documentElement;
    root.setAttribute("data-theme", name);
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

  function apply() {
    var root = document.documentElement;
    var body = document.body;
    if (!body) return;
    applyTheme(current.theme);
    root.style.setProperty("--glow-strength", String(current.glow / 100));
    root.style.setProperty("--typing-opacity", String(current.typingOpacity / 100));
    root.setAttribute("data-font", current.fontSize);
    root.setAttribute("data-typing-speed", current.typingSpeed);
    root.setAttribute("data-typing-intensity", current.typingIntensity);
    body.classList.toggle("fx-no-crt", !current.crt);
    body.classList.toggle("fx-no-sweep", !current.scanSweep);
    body.classList.toggle("fx-text-glow", !!current.textGlow);
    body.classList.toggle("fx-no-glow", !current.textGlow);
    body.classList.toggle("fx-no-particles", !current.particles);
    body.classList.toggle("fx-no-matrix", !current.matrixGrid);
    body.classList.toggle("fx-no-typing", !current.typingBg);
    body.classList.toggle("fx-no-orbit", !current.typingBg);
    body.classList.toggle("fx-compact-grid", !!current.compactGrid);
    body.classList.toggle("fx-no-trail", !current.cursorTrail);
    body.classList.toggle("fx-no-cursor-glow", !current.cursorTrail);
    body.classList.toggle("fx-nav-labels-always", !!current.navLabelsAlways);
    if (window.KritikalTypingBg && typeof window.KritikalTypingBg.refresh === "function") {
      window.KritikalTypingBg.refresh();
    }
    if (window.ZentraOrbitFx && typeof window.ZentraOrbitFx.sync === "function") {
      window.ZentraOrbitFx.sync();
    }
    if (window.ZentraAuroraBg && typeof window.ZentraAuroraBg.sync === "function") {
      window.ZentraAuroraBg.sync();
    }
    window.dispatchEvent(new CustomEvent("kritikal-settings", { detail: clone(current) }));
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
            type: "select",
            options: [
              { v: "green", l: "Monochrome" },
              { v: "cyan", l: "Aurora cyan" },
              { v: "amber", l: "Solar gold" },
              { v: "crimson", l: "Eclipse rose" },
            ],
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
        title: "Orbit background",
        items: [
          {
            key: "typingBg",
            label: "Animated orbits",
            type: "toggle",
          },
          {
            key: "typingSpeed",
            label: "Orbit speed",
            type: "select",
            options: [
              { v: "slow", l: "Slow" },
              { v: "medium", l: "Medium" },
              { v: "fast", l: "Fast" },
            ],
          },
          {
            key: "typingIntensity",
            label: "Orbit density",
            type: "select",
            options: [
              { v: "low", l: "Low" },
              { v: "medium", l: "Medium" },
              { v: "high", l: "High" },
            ],
          },
          {
            key: "typingOpacity",
            label: "Background visibility",
            type: "range",
            min: 10,
            max: 90,
            step: 5,
            unit: "%",
          },
          {
            key: "particles",
            label: "Floating particles",
            type: "toggle",
          },
          {
            key: "matrixGrid",
            label: "Interactive background",
            type: "toggle",
          },
          {
            key: "cursorTrail",
            label: "Cursor glow",
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
        ],
      },
      {
        title: "Display",
        items: [
          {
            key: "crt",
            label: "Scanline overlay",
            type: "toggle",
          },
          {
            key: "scanSweep",
            label: "Light sweep",
            type: "toggle",
          },
          {
            key: "compactGrid",
            label: "Compact game grid",
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
  }

  function bindAdminPanel() {
    var resetBtn = document.getElementById("settings-reset");
    var adminBtn = document.getElementById("settings-admin-toggle");
    var adminGate = document.getElementById("settings-admin-gate");
    var adminForm = document.getElementById("settings-admin-form");
    var adminInput = document.getElementById("settings-admin-key");
    var adminError = document.getElementById("settings-admin-error");
    var adminUnlock = document.getElementById("settings-admin-unlock");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        reset();
        var root = document.getElementById("settings-root");
        syncUI(root);
      });
    }
    if (!adminBtn || !adminGate || !adminForm || !adminInput) return;
    function toggleAdminGate() {
      adminGate.hidden = !adminGate.hidden;
      if (adminError) adminError.hidden = true;
      if (!adminGate.hidden) {
        adminInput.value = "";
        adminInput.focus();
      }
    }
    adminBtn.addEventListener("click", function () {
      var store = window.KritikalStore;
      if (store && typeof store.checkSession === "function") {
        store
          .checkSession()
          .then(function (data) {
            if (data && data.authed) {
              location.href = "/admin/";
              return;
            }
            toggleAdminGate();
          })
          .catch(function () {
            toggleAdminGate();
          });
        return;
      }
      toggleAdminGate();
    });
    adminForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var store = window.KritikalStore;
      if (!store || typeof store.login !== "function") return;
      if (adminError) adminError.hidden = true;
      if (adminUnlock) {
        adminUnlock.disabled = true;
        adminUnlock.textContent = "checking…";
      }
      store
        .login(adminInput.value)
        .then(function () {
          location.href = "/admin/";
        })
        .catch(function () {
          if (adminError) adminError.hidden = false;
          if (adminUnlock) {
            adminUnlock.disabled = false;
            adminUnlock.textContent = "Unlock panel";
          }
        });
    });
  }

  function buildControl(item) {
    var row = document.createElement("div");
    row.className = "settings-row";
    row.dataset.key = item.key;
    var label = document.createElement("label");
    label.className = "settings-label";
    label.textContent = item.label;
    label.setAttribute("for", "set-" + item.key);
    row.appendChild(label);
    var val = current[item.key];
    if (item.type === "toggle") {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "settings-toggle" + (val ? " settings-toggle--on" : "");
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
    var val = current[item.key];
    if (item.type === "toggle") {
      var btn = row.querySelector(".settings-toggle");
      if (!btn) return;
      btn.classList.toggle("settings-toggle--on", !!val);
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
      var itemType = row.querySelector(".settings-toggle")
        ? "toggle"
        : row.querySelector("select")
          ? "select"
          : "range";
      syncControl(row, { key: key, type: itemType, unit: key === "glow" || key === "typingOpacity" ? "%" : "" });
    });
  }

  function flashStatus() {
    var el = document.getElementById("settings-status");
    if (!el) return;
    el.textContent = "Applied at " + new Date().toLocaleTimeString();
  }

  function initUI() {
    bindSettingsUI();
    bindAdminPanel();
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
  };
})();
