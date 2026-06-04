(function () {
  const STORAGE_KEY = "kritikal-cloak-stage";
  const SITE_TITLE = "kritikal@root:~";
  const CLOAK_TITLE = "Lesson 4.2: Graphing Linear Equations | Algebra I";
  const cloakEl = document.getElementById("study-cloak");
  const dateEl = document.getElementById("study-cloak-date");
  const welcome = document.getElementById("welcome");
  const site = document.getElementById("site");
  let active = false;

  function loadActive() {
    try {
      var n = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
      return n >= 1;
    } catch (e) {
      return false;
    }
  }

  function saveActive() {
    try {
      localStorage.setItem(STORAGE_KEY, active ? "1" : "0");
    } catch (e) {}
  }

  function updateStudyDate() {
    if (!dateEl) return;
    dateEl.textContent = new Date().toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function hideWelcomeForCloak() {
    if (!welcome || !active) return;
    document.documentElement.classList.remove("welcome-lock");
    welcome.classList.add("welcome--exit");
    welcome.setAttribute("aria-hidden", "true");
    welcome.hidden = true;
    if (site) site.hidden = false;
  }

  function applyCloak(options) {
    options = options || {};
    document.documentElement.classList.toggle("cloak-full", active);
    if (cloakEl) {
      cloakEl.hidden = !active;
      cloakEl.setAttribute("aria-hidden", active ? "false" : "true");
    }
    document.title = active ? CLOAK_TITLE : SITE_TITLE;
    if (options.persist !== false) saveActive();
    if (active) {
      hideWelcomeForCloak();
      updateStudyDate();
      if (options.notify !== false) {
        window.dispatchEvent(new CustomEvent("kritikal-cloak-on"));
      }
    } else if (options.notify !== false) {
      window.dispatchEvent(new CustomEvent("kritikal-cloak-off"));
    }
  }

  function toggleCloak() {
    active = !active;
    applyCloak({ persist: true, notify: true });
  }

  document.addEventListener("keydown", function (e) {
    if (!e.ctrlKey || e.key.toLowerCase() !== "e") return;
    if (e.altKey || e.metaKey || e.shiftKey) return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    e.preventDefault();
    toggleCloak();
  });

  if (cloakEl) {
    cloakEl.addEventListener("click", function (e) {
      if (e.target.closest("a")) e.preventDefault();
    });
  }

  window.KritikalCloak = {
    isActive: function () {
      return active;
    },
    reset: function () {
      active = false;
      applyCloak({ persist: true, notify: true });
    },
  };

  active = loadActive();
  applyCloak({ persist: false, notify: active });
  updateStudyDate();
})();
