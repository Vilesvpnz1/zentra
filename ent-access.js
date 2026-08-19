(function () {
  var toast = null;
  var toastTimer = null;

  function hasProfile() {
    return !!(window.KobranAuth && window.KobranAuth.isLoggedIn && window.KobranAuth.isLoggedIn());
  }

  function ensureToast() {
    if (toast) return toast;
    toast = document.createElement("div");
    toast.className = "ent-access-toast";
    toast.setAttribute("role", "alert");
    toast.hidden = true;
    document.body.appendChild(toast);
    return toast;
  }

  function warnProfile() {
    var el = ensureToast();
    el.textContent = "Create a Kobran profile to watch movies or listen to music.";
    el.hidden = false;
    el.classList.add("ent-access-toast--show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove("ent-access-toast--show");
      setTimeout(function () {
        el.hidden = true;
      }, 220);
    }, 4200);
  }

  function requireProfile() {
    if (hasProfile()) return true;
    warnProfile();
    if (window.KobranAuth && window.KobranAuth.showGate) window.KobranAuth.showGate("signup");
    return false;
  }

  window.KobranEntAccess = {
    hasProfile: hasProfile,
    requireProfile: requireProfile,
    warnProfile: warnProfile,
  };
})();
