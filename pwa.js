window.KobranPwa = (function () {
  var deferred = null;
  var enabled = true;
  var scope = "/";
  var swPath = "/sw.js";

  function isStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  }

  function isMobile() {
    return window.matchMedia("(max-width: 900px), (pointer: coarse)").matches;
  }

  function register() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.getRegistration(scope).then(function (existing) {
      var target = swPath + "?v=10";
      if (existing && existing.active && String(existing.active.scriptURL || "").indexOf("sw.js") !== -1) {
        return existing.update().catch(function () {});
      }
      return navigator.serviceWorker.register(target, { scope: scope });
    }).catch(function () {});
  }

  function bindInstallButton(btn) {
    if (!btn) return;
    function paint() {
      var show = enabled && isMobile() && !isStandalone() && !!deferred;
      btn.hidden = !show;
      btn.disabled = !deferred;
    }
    btn.addEventListener("click", function () {
      if (!deferred) return;
      deferred.prompt();
      deferred.userChoice.finally(function () {
        deferred = null;
        paint();
      });
    });
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      deferred = e;
      paint();
    });
    window.addEventListener("kobran-site-config", function (ev) {
      var features = ev.detail && ev.detail.features;
      if (features && typeof features.pwaInstall === "boolean") {
        enabled = features.pwaInstall;
        paint();
      }
    });
    paint();
  }

  register();

  return {
    bindInstallButton: bindInstallButton,
    isStandalone: isStandalone,
    isMobile: isMobile,
  };
})();
