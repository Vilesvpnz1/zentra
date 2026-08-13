window.KobranPwa = (function () {
  var deferred = null;
  var enabled = true;

  function isStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  }

  function isMobile() {
    return window.matchMedia("(max-width: 900px), (pointer: coarse)").matches;
  }

  function killWorkers() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .getRegistrations()
      .then(function (regs) {
        return Promise.all(
          regs.map(function (reg) {
            return reg.unregister().catch(function () {});
          })
        );
      })
      .catch(function () {});
    if (window.caches && caches.keys) {
      caches.keys().then(function (keys) {
        return Promise.all(
          keys.map(function (key) {
            return caches.delete(key);
          })
        );
      }).catch(function () {});
    }
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

  killWorkers();

  return {
    bindInstallButton: bindInstallButton,
    isStandalone: isStandalone,
    isMobile: isMobile,
  };
})();
