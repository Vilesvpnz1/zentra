window.ZentraSiteConfig = (function () {
  var state = { features: {} };

  function load() {
    return fetch("/api/site/features", { credentials: "same-origin" })
      .then(function (res) {
        return res.ok ? res.json() : { features: {} };
      })
      .then(function (data) {
        state.features = (data && data.features) || {};
        window.dispatchEvent(new CustomEvent("zentra-site-config", { detail: state }));
        return state;
      })
      .catch(function () {
        window.dispatchEvent(new CustomEvent("zentra-site-config", { detail: state }));
        return state;
      });
  }

  function feature(key, fallback) {
    if (typeof state.features[key] === "boolean") return state.features[key];
    return fallback !== false;
  }

  load();

  return {
    load: load,
    get: function () {
      return state;
    },
    feature: feature,
  };
})();
