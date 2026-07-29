(function () {
  const STORAGE_KEY = "kobran-cloak-stage";
  const SITE_TITLE = "Kobran";
  const CLOAK_TITLE = "Lesson 4.2: Graphing Linear Equations | Algebra I";
  const cloakEl = document.getElementById("study-cloak");
  const dateEl = document.getElementById("study-cloak-date");
  const loader = document.getElementById("loader");
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

  function hideLoaderForCloak() {
    if (!active) return;
    if (window.KobranLoader) window.KobranLoader.skip();
    else {
      document.documentElement.classList.remove("loader-lock");
      if (loader) {
        loader.hidden = true;
        loader.remove();
      }
      if (site) site.hidden = false;
    }
  }

  function applyCloak(options) {
    options = options || {};
    document.documentElement.classList.toggle("cloak-full", active);
    if (cloakEl) {
      cloakEl.hidden = !active;
      cloakEl.classList.toggle("study-cloak--open", active);
      cloakEl.setAttribute("aria-hidden", active ? "false" : "true");
    }
    document.title = active ? CLOAK_TITLE : SITE_TITLE;
    if (options.persist !== false) saveActive();
    if (active) {
      hideLoaderForCloak();
      updateStudyDate();
      if (options.notify !== false) {
        window.dispatchEvent(new CustomEvent("kobran-cloak-on"));
      }
    } else if (options.notify !== false) {
      window.dispatchEvent(new CustomEvent("kobran-cloak-off"));
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

  window.KobranCloak = {
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
