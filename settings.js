window.KritikalSettings = (function () {
  var STORAGE_KEY = "kritikal-settings-v1";

  var defaults = {
    theme: "green",
    glow: 55,
    fontSize: "md",
    crt: true,
    scanSweep: true,
    typingBg: true,
    typingSpeed: "medium",
    typingIntensity: "medium",
    particles: true,
    matrixGrid: true,
    compactGrid: false,
    skipBoot: false,
    textGlow: true,
    typingOpacity: 45,
    cursorTrail: true,
  };

  var themes = {
    green: {
      text: "#33ff66",
      textBright: "#7fff9a",
      accent: "#00ff41",
      accentHot: "#ffb000",
      accentCool: "#00ffff",
      muted: "#3d8f52",
      border: "rgba(0, 255, 65, 0.28)",
      borderDim: "rgba(0, 255, 65, 0.12)",
      glow: "rgba(0, 255, 65, 0.45)",
      scrollThumb: "#1a5c2a",
    },
    cyan: {
      text: "#33ffff",
      textBright: "#aaffff",
      accent: "#00e5ff",
      accentHot: "#ff6ec7",
      accentCool: "#88ff88",
      muted: "#3a8f8f",
      border: "rgba(0, 229, 255, 0.28)",
      borderDim: "rgba(0, 229, 255, 0.12)",
      glow: "rgba(0, 229, 255, 0.45)",
      scrollThumb: "#1a4a5c",
    },
    amber: {
      text: "#ffcc33",
      textBright: "#ffe066",
      accent: "#ffb000",
      accentHot: "#ff6633",
      accentCool: "#88ffaa",
      muted: "#8f7a3a",
      border: "rgba(255, 176, 0, 0.28)",
      borderDim: "rgba(255, 176, 0, 0.12)",
      glow: "rgba(255, 176, 0, 0.4)",
      scrollThumb: "#5c4a1a",
    },
    crimson: {
      text: "#ff4466",
      textBright: "#ff8899",
      accent: "#ff2244",
      accentHot: "#ffaa00",
      accentCool: "#ff88cc",
      muted: "#8f3a4a",
      border: "rgba(255, 34, 68, 0.28)",
      borderDim: "rgba(255, 34, 68, 0.12)",
      glow: "rgba(255, 34, 68, 0.4)",
      scrollThumb: "#5c1a2a",
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
    applyTheme(current.theme);
    root.style.setProperty("--glow-strength", String(current.glow / 100));
    root.style.setProperty("--typing-opacity", String(current.typingOpacity / 100));
    root.setAttribute("data-font", current.fontSize);
    body.classList.toggle("fx-no-crt", !current.crt);
    body.classList.toggle("fx-no-sweep", !current.scanSweep);
    body.classList.toggle("fx-no-glow", !current.textGlow);
    body.classList.toggle("fx-no-particles", !current.particles);
    body.classList.toggle("fx-no-matrix", !current.matrixGrid);
    body.classList.toggle("fx-no-typing", !current.typingBg);
    body.classList.toggle("fx-compact-grid", !!current.compactGrid);
    body.classList.toggle("fx-no-trail", !current.cursorTrail);
    root.setAttribute("data-typing-speed", current.typingSpeed);
    root.setAttribute("data-typing-intensity", current.typingIntensity);
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
        title: "theme.sys",
        items: [
          {
            key: "theme",
            label: "color scheme",
            type: "select",
            options: [
              { v: "green", l: "phosphor green" },
              { v: "cyan", l: "ice cyan" },
              { v: "amber", l: "amber alert" },
              { v: "crimson", l: "crimson ops" },
            ],
          },
          {
            key: "fontSize",
            label: "terminal font size",
            type: "select",
            options: [
              { v: "sm", l: "small (12px)" },
              { v: "md", l: "medium (14px)" },
              { v: "lg", l: "large (16px)" },
            ],
          },
          {
            key: "glow",
            label: "glow intensity",
            type: "range",
            min: 0,
            max: 100,
            step: 5,
            unit: "%",
          },
          {
            key: "textGlow",
            label: "text phosphor glow",
            type: "toggle",
          },
        ],
      },
      {
        title: "background.d",
        items: [
          {
            key: "typingBg",
            label: "hacker typing stream",
            type: "toggle",
          },
          {
            key: "typingSpeed",
            label: "typing speed",
            type: "select",
            options: [
              { v: "slow", l: "slow" },
              { v: "medium", l: "medium" },
              { v: "fast", l: "fast" },
            ],
          },
          {
            key: "typingIntensity",
            label: "stream density",
            type: "select",
            options: [
              { v: "low", l: "low" },
              { v: "medium", l: "medium" },
              { v: "high", l: "high" },
            ],
          },
          {
            key: "typingOpacity",
            label: "stream visibility",
            type: "range",
            min: 10,
            max: 90,
            step: 5,
            unit: "%",
          },
          {
            key: "particles",
            label: "node particles",
            type: "toggle",
          },
          {
            key: "matrixGrid",
            label: "grid overlay",
            type: "toggle",
          },
          {
            key: "cursorTrail",
            label: "cursor crosshair",
            type: "toggle",
          },
        ],
      },
      {
        title: "display.fx",
        items: [
          {
            key: "crt",
            label: "CRT scanlines",
            type: "toggle",
          },
          {
            key: "scanSweep",
            label: "scan beam sweep",
            type: "toggle",
          },
          {
            key: "compactGrid",
            label: "compact game grid",
            type: "toggle",
          },
        ],
      },
      {
        title: "boot.cfg",
        items: [
          {
            key: "skipBoot",
            label: "skip boot screen",
            type: "toggle",
          },
        ],
      },
    ];

    root.innerHTML = "";
    groups.forEach(function (group) {
      var section = document.createElement("section");
      section.className = "settings-group term-window";
      var bar = document.createElement("div");
      bar.className = "term-titlebar";
      bar.innerHTML =
        '<span class="term-dot term-dot--r"></span><span class="term-dot term-dot--y"></span><span class="term-dot term-dot--g"></span><span class="term-title">' +
        group.title +
        "</span>";
      section.appendChild(bar);
      var body = document.createElement("div");
      body.className = "term-body settings-group__body";
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
            adminUnlock.textContent = "unlock panel";
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
    el.textContent = "> applied @" + new Date().toLocaleTimeString();
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
