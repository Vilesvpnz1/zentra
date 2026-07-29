window.KobranSiteConfig = (function () {
  var state = { features: {}, layout: { hubSections: {}, hubItems: {}, nav: {} } };

  function load() {
    return fetch("/api/site/features", { credentials: "same-origin" })
      .then(function (res) {
        return res.ok ? res.json() : { features: {}, layout: {} };
      })
      .then(function (data) {
        state.features = (data && data.features) || {};
        state.layout = (data && data.layout) || { hubSections: {}, hubItems: {}, nav: {} };
        if (!state.layout.hubSections) state.layout.hubSections = {};
        if (!state.layout.hubItems) state.layout.hubItems = {};
        if (!state.layout.nav) state.layout.nav = {};
        window.dispatchEvent(new CustomEvent("kobran-site-config", { detail: state }));
        return state;
      })
      .catch(function () {
        window.dispatchEvent(new CustomEvent("kobran-site-config", { detail: state }));
        return state;
      });
  }

  function feature(key, fallback) {
    if (typeof state.features[key] === "boolean") return state.features[key];
    return fallback !== false;
  }

  function layoutVisible(bucket, key) {
    if (!bucket || !key) return true;
    var group = state.layout && state.layout[bucket];
    if (!group || typeof group[key] !== "boolean") return true;
    return group[key];
  }

  load();

  return {
    load: load,
    whenReady: function () {
      return load();
    },
    get: function () {
      return state;
    },
    feature: feature,
    layoutVisible: layoutVisible,
  };
})();
