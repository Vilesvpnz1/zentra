window.KritikalSearchEngines = (function () {
  var DEFAULT_ID = "duckduckgo";

  var ENGINES = {
    duckduckgo: {
      id: "duckduckgo",
      label: "DuckDuckGo",
      home: "https://html.duckduckgo.com/html/",
      search: "https://html.duckduckgo.com/html/?q=",
    },
    google: {
      id: "google",
      label: "Google",
      home: "https://www.google.com/webhp?igu=1",
      search: "https://www.google.com/search?gbv=1&igu=1&q=",
    },
    bing: {
      id: "bing",
      label: "Bing",
      home: "https://www.bing.com/",
      search: "https://www.bing.com/search?q=",
    },
    brave: {
      id: "brave",
      label: "Brave Search",
      home: "https://search.brave.com/",
      search: "https://search.brave.com/search?q=",
    },
    yahoo: {
      id: "yahoo",
      label: "Yahoo",
      home: "https://search.yahoo.com/",
      search: "https://search.yahoo.com/search?p=",
    },
    ecosia: {
      id: "ecosia",
      label: "Ecosia",
      home: "https://www.ecosia.org/",
      search: "https://www.ecosia.org/search?q=",
    },
    startpage: {
      id: "startpage",
      label: "Startpage",
      home: "https://www.startpage.com/",
      search: "https://www.startpage.com/sp/search?query=",
    },
    qwant: {
      id: "qwant",
      label: "Qwant",
      home: "https://www.qwant.com/",
      search: "https://www.qwant.com/?q=",
    },
  };

  function list() {
    return Object.keys(ENGINES).map(function (id) {
      return ENGINES[id];
    });
  }

  function get(id) {
    return ENGINES[id] || ENGINES[DEFAULT_ID];
  }

  function readSetting() {
    if (window.KritikalSettings && window.KritikalSettings.get) {
      var v = window.KritikalSettings.get("searchEngine");
      if (v && ENGINES[v]) return v;
    }
    return DEFAULT_ID;
  }

  function current() {
    return get(readSetting());
  }

  function homeUrl(id) {
    return get(id || readSetting()).home;
  }

  function searchUrl(query, id) {
    var engine = get(id || readSetting());
    var q = String(query || "").trim();
    if (!q) return engine.home;
    return engine.search + encodeURIComponent(q);
  }

  return {
    defaultId: DEFAULT_ID,
    engines: ENGINES,
    list: list,
    get: get,
    current: current,
    homeUrl: homeUrl,
    searchUrl: searchUrl,
    readSetting: readSetting,
  };
})();
