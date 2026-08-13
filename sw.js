var CACHE = "kobran-shell-v7";
var SHELL = ["/", "/index.html", "/assets/kobran-logo.webp"];

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
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf("/api/") === 0) return;
  if (/\.(?:css|js)(?:$|\?)/i.test(url.pathname + url.search) || url.searchParams.has("v")) {
    event.respondWith(
      fetch(event.request).catch(function () {
        return caches.match(event.request);
      })
    );
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then(function (res) {
        if (res && res.status === 200 && res.type === "basic") {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) {
            cache.put(event.request, copy);
          });
        }
        return res;
      })
      .catch(function () {
        return caches.match(event.request).then(function (hit) {
          if (hit) return hit;
          var p = url.pathname.toLowerCase();
          if (/\.(css|js|mjs|json|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|mp3|mp4|webm|wasm)$/i.test(p)) {
            return Response.error();
          }
          return caches.match("/");
        });
      })
  );
});
