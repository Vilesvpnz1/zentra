var CACHE = "kobran-shell-v10";
var SHELL = ["/assets/kobran-logo.webp"];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(SHELL).catch(function () {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) {
            return key !== CACHE;
          })
          .map(function (key) {
            return caches.delete(key);
          })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf("/api/") === 0) return;

  var path = url.pathname.toLowerCase();
  if (
    path.indexOf("/assets/thumbs/") === 0 ||
    /\.(?:png|jpe?g|gif|webp|svg|ico|woff2?|ttf|mp3|mp4|webm|wasm)(?:$|\?)/i.test(path + url.search)
  ) {
    return;
  }

  var isHtml = path === "/" || path === "/index.html" || /\.html$/i.test(path);
  if (isHtml) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" }).catch(function () {
        return caches.match(event.request);
      })
    );
    return;
  }

  if (/\.(?:css|js)(?:$|\?)/i.test(path + url.search)) {
    event.respondWith(
      fetch(event.request).catch(function () {
        return caches.match(event.request);
      })
    );
  }
});
