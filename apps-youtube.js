(function () {
  var defaultWs = "wss://wisp.classroom.lat/";
  var fallbackWs = [
    "wss://wisp.mercurywork.shop/",
    "wss://wisp.unlimited.web.id/",
    "wss://wisp.rubynetwork.net/",
  ];
  var currentWs = localStorage.getItem("proxy-ws") || defaultWs;
  var booted = false;
  var bootPromise = null;
  var scramjet = null;
  var activeFrame = null;
  var connection = null;

  function normalizeYouTube(url) {
    try {
      var parsed = new URL(url);
      var host = parsed.hostname.replace(/^www\./, "").replace(/^m\./, "");
      if (host === "youtube.com" || host === "youtu.be") {
        parsed.hostname = "www.youtube.com";
        parsed.protocol = "https:";
        return parsed.toString();
      }
    } catch (e) {}
    return url;
  }

  function initScramjet() {
    if (scramjet) return scramjet;
    var loaded = $scramjetLoadController();
    scramjet = new loaded.ScramjetController({
      files: {
        all: "/sail/scram/scramjet.all.js",
        wasm: "/sail/scram/scramjet.wasm.wasm",
        sync: "/sail/scram/scramjet.sync.js",
      },
      prefix: "/sail/go/",
    });
    scramjet.init();
    return scramjet;
  }

  async function pickTransport() {
    var candidates = [currentWs];
    for (var i = 0; i < fallbackWs.length; i++) {
      if (fallbackWs[i] !== currentWs) candidates.push(fallbackWs[i]);
    }
    for (var j = 0; j < candidates.length; j++) {
      try {
        await connection.setTransport("/sail/libcurl/index.mjs", [{ websocket: candidates[j] }]);
        currentWs = candidates[j];
        return;
      } catch (e) {}
    }
    await connection.setTransport("/sail/libcurl/index.mjs", [{ websocket: defaultWs }]);
    currentWs = defaultWs;
  }

  function boot() {
    if (booted) return Promise.resolve();
    if (bootPromise) return bootPromise;
    bootPromise = (async function () {
      try {
        await window.__scramjetIdbReady;
      } catch (e) {}
      connection = new BareMux.BareMuxConnection("/sail/baremux/worker.js");
      await navigator.serviceWorker.register("/sail/sw.js");
      await navigator.serviceWorker.ready;
      await pickTransport();
      initScramjet();
      booted = true;
    })().catch(function (err) {
      bootPromise = null;
      booted = false;
      throw err;
    });
    return bootPromise;
  }

  function waitFrameLoad(frameEl, timeoutMs) {
    return new Promise(function (resolve) {
      var done = false;
      function finish() {
        if (done) return;
        done = true;
        resolve();
      }
      frameEl.addEventListener("load", finish, { once: true });
      setTimeout(finish, timeoutMs || 20000);
    });
  }

  function openUrl(url, mount) {
    if (!mount) return Promise.reject(new Error("missing_mount"));
    var target = normalizeYouTube(url || "https://www.youtube.com/");
    return boot().then(function () {
      mount.querySelectorAll(".apps-player__proxy-frame").forEach(function (node) {
        node.remove();
      });
      if (activeFrame && activeFrame.frame && activeFrame.frame.parentNode === mount) {
        activeFrame.go(target);
        return waitFrameLoad(activeFrame.frame);
      }
      activeFrame = scramjet.createFrame();
      var el = activeFrame.frame;
      el.className = "apps-player__proxy-frame";
      el.title = "App";
      el.setAttribute("loading", "eager");
      el.setAttribute("fetchpriority", "high");
      el.setAttribute(
        "allow",
        "fullscreen *; autoplay *; encrypted-media *; picture-in-picture *; clipboard-read *; clipboard-write *"
      );
      el.setAttribute("allowfullscreen", "");
      mount.appendChild(el);
      activeFrame.go(target);
      return waitFrameLoad(el);
    });
  }

  window.ZentraAppsProxy = {
    boot: boot,
    open: openUrl,
  };
})();
