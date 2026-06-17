window.ZentraLibrary = (function () {
  var LOCAL_KEY = "zentra-library-local";
  var state = { favorites: [], recent: [], authed: false };
  var ready = null;

  function readLocal() {
    try {
      var raw = localStorage.getItem(LOCAL_KEY);
      if (!raw) return { favorites: [], recent: [] };
      var parsed = JSON.parse(raw);
      return {
        favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
        recent: Array.isArray(parsed.recent) ? parsed.recent : [],
      };
    } catch (e) {
      return { favorites: [], recent: [] };
    }
  }

  function writeLocal() {
    try {
      localStorage.setItem(
        LOCAL_KEY,
        JSON.stringify({ favorites: state.favorites, recent: state.recent })
      );
    } catch (e) {}
  }

  function apply(data) {
    state.favorites = Array.isArray(data.favorites) ? data.favorites.slice() : [];
    state.recent = Array.isArray(data.recent) ? data.recent : [];
    state.authed = !!data.authed;
    writeLocal();
    window.dispatchEvent(new CustomEvent("zentra-library", { detail: snapshot() }));
  }

  function snapshot() {
    return {
      favorites: state.favorites.slice(),
      recent: state.recent.slice(),
      authed: state.authed,
    };
  }

  function load() {
    return fetch("/api/user/library", { credentials: "same-origin", cache: "no-store" })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (data && data.authed) {
          apply(data);
          return snapshot();
        }
        apply(readLocal());
        return snapshot();
      })
      .catch(function () {
        apply(readLocal());
        return snapshot();
      });
  }

  function isFavorite(gameId) {
    return state.favorites.indexOf(String(gameId)) !== -1;
  }

  function toggleFavorite(gameId) {
    var id = String(gameId || "").trim();
    if (!id) return Promise.resolve(snapshot());
    if (state.authed) {
      return fetch("/api/user/library/favorite", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: id }),
      })
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          if (data && data.library) apply(Object.assign({ authed: true }, data.library));
          return snapshot();
        })
        .catch(function () {
          return toggleLocalFavorite(id);
        });
    }
    return Promise.resolve(toggleLocalFavorite(id));
  }

  function toggleLocalFavorite(id) {
    var idx = state.favorites.indexOf(id);
    if (idx === -1) state.favorites.unshift(id);
    else state.favorites.splice(idx, 1);
    if (state.favorites.length > 120) state.favorites.length = 120;
    writeLocal();
    window.dispatchEvent(new CustomEvent("zentra-library", { detail: snapshot() }));
    return snapshot();
  }

  function trackRecent(gameId) {
    var id = String(gameId || "").trim();
    if (!id) return Promise.resolve(snapshot());
    state.recent = state.recent.filter(function (r) {
      return r.id !== id;
    });
    state.recent.unshift({ id: id, ts: Date.now() });
    if (state.recent.length > 24) state.recent.length = 24;
    writeLocal();
    window.dispatchEvent(new CustomEvent("zentra-library", { detail: snapshot() }));
    if (!state.authed) return Promise.resolve(snapshot());
    return fetch("/api/user/library/recent", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId: id }),
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (data && data.library) apply(Object.assign({ authed: true }, data.library));
        return snapshot();
      })
      .catch(function () {
        return snapshot();
      });
  }

  function mergeOnLogin() {
    var local = readLocal();
    if (!local.favorites.length && !local.recent.length) return load();
    return fetch("/api/user/library", {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(local),
    })
      .then(function () {
        return load();
      })
      .catch(function () {
        return load();
      });
  }

  function init() {
    if (!ready) ready = load();
    return ready;
  }

  window.addEventListener("zentra-auth", function () {
    if (window.ZentraAuth && window.ZentraAuth.isLoggedIn()) mergeOnLogin();
    else apply(readLocal());
  });

  return {
    init: init,
    load: load,
    snapshot: snapshot,
    isFavorite: isFavorite,
    toggleFavorite: toggleFavorite,
    trackRecent: trackRecent,
  };
})();
