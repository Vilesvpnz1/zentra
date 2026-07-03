(function () {
  var deferred = null;
  var btn = null;

  function isStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  }

  function isMobile() {
    return window.matchMedia("(max-width: 900px), (pointer: coarse)").matches;
  }

  function ensureButton() {
    if (btn || !isMobile() || isStandalone()) return;
    btn = document.createElement("button");
    btn.type = "button";
    btn.id = "kritikal-pwa-install";
    btn.textContent = "Install app";
    btn.style.cssText =
      "position:fixed;bottom:16px;right:16px;z-index:9999;padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.14);background:rgba(18,18,18,0.92);color:#fff;font:500 13px/1.2 Inter,system-ui,sans-serif;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,0.35);display:none;";
    btn.addEventListener("click", function () {
      if (!deferred) return;
      deferred.prompt();
      deferred.userChoice.finally(function () {
        deferred = null;
        btn.style.display = "none";
      });
    });
    document.body.appendChild(btn);
  }

  function paint() {
    ensureButton();
    if (!btn) return;
    btn.style.display = deferred && !isStandalone() ? "block" : "none";
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/kritikal/sw.js", { scope: "/kritikal/" }).catch(function () {});
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    paint();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", paint);
  } else {
    paint();
  }
})();
