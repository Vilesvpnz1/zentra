(function () {
  var root = document.getElementById("k-browser");
  if (!root) return;

  var STORE_BOOKMARKS = "kritikal-browser-bookmarks";
  var STORE_HISTORY = "kritikal-browser-history";
  var STORE_SESSION = "kritikal-browser-session";
  var STORE_CLOSED = "kritikal-browser-closed";
  var LOAD_TIMEOUT_MS = 28000;
  var ZOOM_STEPS = [0.75, 0.85, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];

  var tabsEl = document.getElementById("k-browser-tabs");
  var backBtn = document.getElementById("k-browser-back");
  var forwardBtn = document.getElementById("k-browser-forward");
  var homeBtn = document.getElementById("k-browser-home");
  var form = document.getElementById("k-browser-form");
  var input = document.getElementById("k-browser-input");
  var clearBtn = document.getElementById("k-browser-clear");
  var refreshBtn = document.getElementById("k-browser-refresh");
  var devtoolsBtn = document.getElementById("k-browser-devtools");
  var duplicateBtn = document.getElementById("k-browser-duplicate");
  var fsBtn = document.getElementById("k-browser-fs");
  var closeBtn = document.getElementById("k-browser-close-tab");
  var bookmarkBtn = document.getElementById("k-browser-bookmark");
  var copyBtn = document.getElementById("k-browser-copy");
  var externalBtn = document.getElementById("k-browser-external");
  var zoomOutBtn = document.getElementById("k-browser-zoom-out");
  var zoomInBtn = document.getElementById("k-browser-zoom-in");
  var zoomLabelBtn = document.getElementById("k-browser-zoom-label");
  var frame = document.getElementById("k-browser-frame");
  var viewport = document.getElementById("k-browser-viewport");
  var start = document.getElementById("k-browser-start");
  var startSub = start ? start.querySelector(".k-browser__start-sub") : null;
  var startForm = document.getElementById("k-browser-start-form");
  var startInput = document.getElementById("k-browser-start-input");
  var quick = document.getElementById("k-browser-quick");
  var tiles = document.getElementById("k-browser-tiles");
  var clockEl = document.getElementById("k-browser-clock");
  var shell = document.getElementById("k-browser-shell");
  var loadBar = document.getElementById("k-browser-load");
  var secure = document.getElementById("k-browser-secure");
  var suggestEl = document.getElementById("k-browser-suggest");
  var statusBar = document.getElementById("k-browser-status");
  var statusHost = document.getElementById("k-browser-status-host");
  var statusMode = document.getElementById("k-browser-status-mode");
  var errorEl = document.getElementById("k-browser-error");
  var errorText = document.getElementById("k-browser-error-text");
  var errorRetry = document.getElementById("k-browser-error-retry");
  var errorOpen = document.getElementById("k-browser-error-open");
  var moreBtn = document.getElementById("k-browser-more");
  var menuEl = document.getElementById("k-browser-menu");

  var QUICK_LINKS = [
    { title: "YouTube", url: "https://www.youtube.com" },
    { title: "Roblox", url: "https://www.roblox.com" },
    { title: "Discord", url: "https://discord.com" },
    { title: "Cool Math", url: "https://www.coolmathgames.com" },
    { title: "Spotify", url: "https://open.spotify.com" },
    { title: "Twitch", url: "https://www.twitch.tv" },
    { title: "GitHub", url: "https://github.com" },
    { title: "Reddit", url: "https://www.reddit.com" },
  ];

  var tabs = [];
  var activeId = 0;
  var nextId = 1;
  var loading = false;
  var loadingTabId = 0;
  var loadTimer = 0;
  var clockTimer = 0;
  var suggestIndex = -1;
  var closedTabs = [];
  var browserReady = false;

  function engine() {
    if (window.KritikalSearchEngines && window.KritikalSearchEngines.current) {
      return window.KritikalSearchEngines.current();
    }
    return { id: "duckduckgo", home: "https://html.duckduckgo.com/html/", search: "https://html.duckduckgo.com/html/?q=", label: "DuckDuckGo" };
  }

  function homeUrl() {
    if (window.KritikalSearchEngines && window.KritikalSearchEngines.homeUrl) {
      return window.KritikalSearchEngines.homeUrl();
    }
    return "https://html.duckduckgo.com/html/";
  }

  function searchUrl(query) {
    if (window.KritikalSearchEngines && window.KritikalSearchEngines.searchUrl) {
      return window.KritikalSearchEngines.searchUrl(query);
    }
    var q = String(query || "").trim();
    if (!q) return "https://html.duckduckgo.com/html/";
    return "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(q);
  }

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }

  function bookmarks() {
    return readJson(STORE_BOOKMARKS, []);
  }

  function saveBookmarks(list) {
    writeJson(STORE_BOOKMARKS, list.slice(0, 48));
  }

  function historyList() {
    return readJson(STORE_HISTORY, []);
  }

  function pushHistory(entry) {
    if (!entry || !entry.url) return;
    var list = historyList().filter(function (item) {
      return item.url !== entry.url;
    });
    list.unshift({
      title: entry.title || hostLabel(entry.url) || entry.url,
      url: entry.url,
      at: Date.now(),
    });
    writeJson(STORE_HISTORY, list.slice(0, 80));
    renderStartTiles();
  }

  function isGoogleEngine() {
    var eng = engine();
    return !!(eng && eng.id === "google");
  }

  function isGoogleUrl(url) {
    try {
      return /\.google\./i.test(new URL(url).hostname);
    } catch (e) {
      return false;
    }
  }

  function shouldBypassProxy(url, devtools) {
    if (devtools) return false;
    return isGoogleEngine() && isGoogleUrl(url);
  }

  function proxied(url, devtools) {
    var src = "/api/browser/frame?u=" + encodeURIComponent(url);
    if (devtools) src += "&devtools=1";
    return src;
  }

  function frameSrc(url, bust, devtools) {
    var direct = shouldBypassProxy(url, devtools);
    var src = direct ? url : proxied(url, devtools);
    if (bust) src += (src.indexOf("?") > -1 ? "&" : "?") + "_t=" + Date.now();
    return src;
  }

  function frameTarget(url, bust, devtools) {
    try {
      return new URL(frameSrc(url, bust, devtools), location.origin).href;
    } catch (e) {
      return frameSrc(url, bust, devtools);
    }
  }

  function sameFrameTarget(current, target) {
    if (!current || !target) return false;
    try {
      return new URL(current, location.origin).href === new URL(target, location.origin).href;
    } catch (e) {
      return current === target;
    }
  }

  function trimTitle(text) {
    var t = String(text || "").trim();
    if (!t) return "New Tab";
    return t.length > 30 ? t.slice(0, 27) + "…" : t;
  }

  function isUrl(text) {
    var q = String(text || "").trim();
    if (!q) return false;
    if (/^https?:\/\//i.test(q)) return true;
    if (/^[\w-]+(\.[\w-]+)+([\/?#]|$)/.test(q)) return true;
    return false;
  }

  function queryToUrl(text) {
    var q = String(text || "").trim();
    if (!q) return homeUrl();
    if (/^https?:\/\//i.test(q)) return q;
    if (/^[\w-]+(\.[\w-]+)+([\/?#]|$)/.test(q)) return "https://" + q.replace(/^\/+/, "");
    return searchUrl(q);
  }

  function hostLabel(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch (e) {
      return "";
    }
  }

  function faviconUrl(url) {
    var host = hostLabel(url);
    if (!host) return "";
    return "https://www.google.com/s2/favicons?domain=" + encodeURIComponent(host) + "&sz=32";
  }

  function tabById(id) {
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].id === id) return tabs[i];
    }
    return null;
  }

  function sortedTabs() {
    return tabs.slice().sort(function (a, b) {
      if (!!a.pinned === !!b.pinned) return tabs.indexOf(a) - tabs.indexOf(b);
      return a.pinned ? -1 : 1;
    });
  }

  function setLoading(on, tabId) {
    loading = !!on;
    if (loadBar) loadBar.hidden = !loading;
    if (loading) startLoadTimer(tabId || activeId);
    else {
      clearLoadTimer();
      loadingTabId = 0;
    }
  }

  function startLoadTimer(tabId) {
    clearLoadTimer();
    loadingTabId = tabId || activeId;
    loadTimer = window.setTimeout(function () {
      if (!loading || loadingTabId !== activeId) return;
      var tab = tabById(activeId);
      if (!tab || !tab.url || !browserReady) return;
      showError("This page is taking too long to load.");
      setLoading(false);
    }, LOAD_TIMEOUT_MS);
  }

  function clearLoadTimer() {
    if (loadTimer) {
      window.clearTimeout(loadTimer);
      loadTimer = 0;
    }
  }

  function hideError() {
    if (!errorEl) return;
    errorEl.hidden = true;
    errorEl.setAttribute("hidden", "hidden");
  }

  function canShowError() {
    if (!browserReady) return false;
    var tab = tabById(activeId);
    return !!(tab && tab.url);
  }

  function showError(message) {
    if (!canShowError()) {
      hideError();
      return;
    }
    if (errorText) errorText.textContent = message || "This page could not be loaded.";
    if (errorEl) {
      errorEl.hidden = false;
      errorEl.removeAttribute("hidden");
    }
    setLoading(false);
  }

  function syncClear() {
    if (!clearBtn || !input) return;
    clearBtn.hidden = !input.value;
  }

  function isBookmarked(url) {
    return bookmarks().some(function (item) {
      return item.url === url;
    });
  }

  function syncBookmarkBtn(tab) {
    if (!bookmarkBtn) return;
    var on = !!(tab && tab.url && isBookmarked(tab.url));
    bookmarkBtn.classList.toggle("k-browser__btn--active", on);
    bookmarkBtn.title = on ? "Remove bookmark" : "Bookmark (Ctrl+D)";
  }

  function syncDevtoolsBtn(tab) {
    if (!devtoolsBtn) return;
    var on = !!(tab && tab.url && tab.devtools);
    devtoolsBtn.classList.toggle("k-browser__btn--active", on);
    devtoolsBtn.disabled = !tab || !tab.url;
  }

  function toggleDevtools() {
    var tab = tabById(activeId);
    if (!tab || !tab.url) return;
    tab.devtools = !tab.devtools;
    syncDevtoolsBtn(tab);
    syncStatus(tab);
    saveSession();
    if (!browserReady || !frame) return;
    hideError();
    setLoading(true, tab.id);
    frame.src = frameTarget(tab.url, true, tab.devtools);
  }

  function syncZoom(tab) {
    var zoom = tab && tab.zoom ? tab.zoom : 1;
    if (viewport) viewport.style.setProperty("--k-browser-zoom", String(zoom));
    if (zoomLabelBtn) zoomLabelBtn.textContent = Math.round(zoom * 100) + "%";
  }

  function syncStatus(tab) {
    if (!statusBar) return;
    if (!tab || !tab.url) {
      statusBar.hidden = true;
      return;
    }
    statusBar.hidden = false;
    if (statusHost) statusHost.textContent = hostLabel(tab.url) || tab.url;
    if (statusMode) {
      var proxiedLoad = !shouldBypassProxy(tab.url, tab.devtools);
      statusMode.textContent = proxiedLoad ? "Proxied" : "Direct";
      statusMode.className = "k-browser__status-mode" + (proxiedLoad ? "" : " k-browser__status-mode--direct");
    }
  }

  function syncChrome(tab, opts) {
    opts = opts || {};
    if (!tab) return;
    if (input) input.value = tab.omnibox || "";
    syncClear();
    syncBookmarkBtn(tab);
    syncDevtoolsBtn(tab);
    syncZoom(tab);
    syncStatus(tab);
    if (backBtn) backBtn.disabled = tab.historyIndex <= 0;
    if (forwardBtn) forwardBtn.disabled = tab.historyIndex >= tab.history.length - 1;
    if (secure) secure.hidden = !tab.url;
    var showStart = !tab.url;
    if (start) start.hidden = !showStart;
    if (viewport) viewport.hidden = showStart;
    if (showStart) {
      hideError();
      setLoading(false);
      clearLoadTimer();
      renderStartTiles();
      if (frame) {
        frame.hidden = true;
        frame.removeAttribute("src");
      }
      return;
    }
    if (start) start.hidden = true;
    if (viewport) viewport.hidden = false;
    if (frame) frame.hidden = false;
    if (!browserReady || opts.skipLoad) {
      hideError();
      return;
    }
    hideError();
    var target = frameTarget(tab.url, false, tab.devtools);
    if (frame && !sameFrameTarget(frame.src, target)) {
      setLoading(true, tab.id);
      frame.src = target;
    }
  }

  function focusBrowser() {
    browserReady = true;
    syncStartChrome();
    updateClock();
    hideSuggestions();
    hideMenu();
    var tab = tabById(activeId);
    if (tab) syncChrome(tab);
    else hideError();
  }

  function renderTabs() {
    if (!tabsEl) return;
    tabsEl.innerHTML = "";
    sortedTabs().forEach(function (tab) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "k-browser__tab" + (tab.id === activeId ? " k-browser__tab--active" : "") + (tab.pinned ? " k-browser__tab--pinned" : "");
      btn.dataset.id = String(tab.id);
      if (tab.url) {
        var icon = document.createElement("img");
        icon.className = "k-browser__tab-icon";
        icon.src = faviconUrl(tab.url);
        icon.alt = "";
        icon.width = 14;
        icon.height = 14;
        btn.appendChild(icon);
      }
      var label = document.createElement("span");
      label.className = "k-browser__tab-label";
      label.textContent = tab.title || "New Tab";
      var x = document.createElement("span");
      x.className = "k-browser__tab-close";
      x.setAttribute("aria-hidden", "true");
      x.textContent = "×";
      btn.append(label, x);
      btn.addEventListener("click", function (e) {
        if (e.target === x) closeTab(tab.id);
        else switchTab(tab.id);
      });
      btn.addEventListener("auxclick", function (e) {
        if (e.button === 1) {
          e.preventDefault();
          closeTab(tab.id);
        }
      });
      btn.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        tab.pinned = !tab.pinned;
        renderTabs();
        saveSession();
      });
      tabsEl.appendChild(btn);
    });
    var add = document.createElement("button");
    add.type = "button";
    add.className = "k-browser__add-tab";
    add.setAttribute("aria-label", "New tab");
    add.textContent = "+";
    add.addEventListener("click", function () {
      createTab("", "New Tab", "");
    });
    tabsEl.appendChild(add);
  }

  function createTab(url, title, omnibox, opts) {
    opts = opts || {};
    var tab = {
      id: nextId++,
      title: title || "New Tab",
      url: url || "",
      omnibox: omnibox || "",
      history: url ? [url] : [],
      historyIndex: url ? 0 : -1,
      pinned: !!opts.pinned,
      zoom: 1,
      devtools: false,
    };
    tabs.push(tab);
    switchTab(tab.id);
    saveSession();
    return tab;
  }

  function switchTab(id) {
    activeId = id;
    hideSuggestions();
    renderTabs();
    syncChrome(tabById(id));
  }

  function navigate(url, replace, omnibox) {
    var tab = tabById(activeId);
    if (!tab || !url) return;
    tab.url = url;
    if (omnibox != null) tab.omnibox = omnibox;
    else if (!tab.omnibox || replace) tab.omnibox = isUrl(tab.omnibox) ? tab.omnibox : hostLabel(url) || tab.omnibox;
    if (replace && tab.historyIndex >= 0) {
      tab.history[tab.historyIndex] = url;
    } else {
      if (tab.historyIndex < tab.history.length - 1) {
        tab.history = tab.history.slice(0, tab.historyIndex + 1);
      }
      tab.history.push(url);
      tab.historyIndex = tab.history.length - 1;
    }
    hideError();
    hideSuggestions();
    if (start) start.hidden = true;
    if (viewport) viewport.hidden = false;
    if (frame) {
      frame.hidden = false;
      setLoading(true, tab.id);
      frame.src = frameTarget(url, false, tab.devtools);
    }
    syncChrome(tab);
    saveSession();
  }

  function submitQuery(raw) {
    var tab = tabById(activeId);
    if (!tab) return;
    var url = queryToUrl(raw);
    var label = isUrl(raw) ? trimTitle(hostLabel(url) || raw) : trimTitle(raw) + " · " + (engine().label || "Search");
    tab.title = label;
    tab.omnibox = String(raw || "").trim();
    renderTabs();
    navigate(url, false);
  }

  function openUrl(url, title, omnibox) {
    var tab = tabById(activeId);
    if (!tab) return;
    if (!tab.url) {
      tab.title = title || trimTitle(hostLabel(url) || url);
      tab.omnibox = omnibox || hostLabel(url) || url;
      renderTabs();
      navigate(url, false);
      return;
    }
    createTab(url, title || trimTitle(hostLabel(url) || url), omnibox || hostLabel(url) || url);
  }

  function back() {
    var tab = tabById(activeId);
    if (!tab || tab.historyIndex <= 0) return;
    tab.historyIndex -= 1;
    tab.url = tab.history[tab.historyIndex];
    syncChrome(tab);
    if (frame) {
      setLoading(true, tab.id);
      frame.src = frameTarget(tab.url, false, tab.devtools);
    }
    saveSession();
  }

  function forward() {
    var tab = tabById(activeId);
    if (!tab || tab.historyIndex >= tab.history.length - 1) return;
    tab.historyIndex += 1;
    tab.url = tab.history[tab.historyIndex];
    syncChrome(tab);
    if (frame) {
      setLoading(true, tab.id);
      frame.src = frameTarget(tab.url, false, tab.devtools);
    }
    saveSession();
  }

  function goHome() {
    var tab = tabById(activeId);
    if (!tab) return;
    tab.title = "New Tab";
    tab.url = "";
    tab.omnibox = "";
    tab.history = [];
    tab.historyIndex = -1;
    hideError();
    hideSuggestions();
    if (frame) {
      frame.removeAttribute("src");
      frame.hidden = true;
    }
    if (viewport) viewport.hidden = true;
    if (start) start.hidden = false;
    if (startInput) startInput.value = "";
    if (input) input.value = "";
    syncClear();
    setLoading(false);
    renderTabs();
    syncStatus(tab);
    saveSession();
  }

  function closeTab(id) {
    var tab = tabById(id);
    if (!tab) return;
    closedTabs.unshift({
      title: tab.title,
      url: tab.url,
      omnibox: tab.omnibox,
      history: tab.history.slice(),
      historyIndex: tab.historyIndex,
      zoom: tab.zoom,
    });
    closedTabs = closedTabs.slice(0, 12);
    writeJson(STORE_CLOSED, closedTabs);
    if (tabs.length < 2) {
      goHome();
      return;
    }
    var idx = tabs.findIndex(function (t) {
      return t.id === id;
    });
    if (idx === -1) return;
    tabs.splice(idx, 1);
    if (activeId === id) {
      var next = tabs[Math.max(0, idx - 1)];
      switchTab(next.id);
    } else {
      renderTabs();
    }
    saveSession();
  }

  function reopenClosedTab() {
    if (!closedTabs.length) {
      closedTabs = readJson(STORE_CLOSED, []);
    }
    var item = closedTabs.shift();
    writeJson(STORE_CLOSED, closedTabs);
    if (!item) return;
    createTab(item.url || "", item.title || "New Tab", item.omnibox || "");
    var tab = tabById(activeId);
    if (tab && item.history && item.history.length) {
      tab.history = item.history.slice();
      tab.historyIndex = item.historyIndex >= 0 ? item.historyIndex : tab.history.length - 1;
      tab.url = tab.history[tab.historyIndex] || item.url || "";
      tab.zoom = item.zoom || 1;
      syncChrome(tab);
    }
  }

  function refresh(hard) {
    var tab = tabById(activeId);
    if (!tab || !tab.url || !frame) return;
    hideError();
    setLoading(true, tab.id);
    frame.src = frameTarget(tab.url, !!hard, tab.devtools);
  }

  function duplicateTab() {
    var tab = tabById(activeId);
    if (!tab) return;
    createTab(tab.url, tab.title, tab.omnibox);
  }

  function toggleFs() {
    if (!shell) return;
    var on = shell.classList.toggle("k-browser__shell--fs");
    if (fsBtn) fsBtn.setAttribute("aria-pressed", on ? "true" : "false");
    if (on && shell.requestFullscreen) shell.requestFullscreen().catch(function () {});
    else if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
  }

  function toggleBookmark() {
    var tab = tabById(activeId);
    if (!tab || !tab.url) return;
    var list = bookmarks();
    var idx = list.findIndex(function (item) {
      return item.url === tab.url;
    });
    if (idx >= 0) list.splice(idx, 1);
    else {
      list.unshift({
        title: tab.title || hostLabel(tab.url),
        url: tab.url,
        at: Date.now(),
      });
    }
    saveBookmarks(list);
    syncBookmarkBtn(tab);
    renderStartTiles();
  }

  function copyCurrentUrl() {
    var tab = tabById(activeId);
    if (!tab || !tab.url) return;
    var text = tab.url;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () {});
      return;
    }
    var tmp = document.createElement("textarea");
    tmp.value = text;
    document.body.appendChild(tmp);
    tmp.select();
    try {
      document.execCommand("copy");
    } catch (e) {}
    document.body.removeChild(tmp);
  }

  function openExternal(url) {
    var tab = tabById(activeId);
    var target = url || (tab && tab.url);
    if (!target) return;
    window.open(target, "_blank", "noopener,noreferrer");
  }

  function nearestZoom(current, direction) {
    var idx = ZOOM_STEPS.indexOf(current);
    if (idx === -1) {
      idx = ZOOM_STEPS.findIndex(function (z) {
        return z >= current;
      });
      if (idx === -1) idx = ZOOM_STEPS.length - 1;
    }
    idx += direction;
    if (idx < 0) idx = 0;
    if (idx >= ZOOM_STEPS.length) idx = ZOOM_STEPS.length - 1;
    return ZOOM_STEPS[idx];
  }

  function setZoom(value) {
    var tab = tabById(activeId);
    if (!tab) return;
    tab.zoom = value;
    syncZoom(tab);
    saveSession();
  }

  function changeZoom(direction) {
    var tab = tabById(activeId);
    if (!tab) return;
    setZoom(nearestZoom(tab.zoom || 1, direction));
  }

  function resetZoom() {
    setZoom(1);
  }

  function suggestionItems(query) {
    var q = String(query || "").trim().toLowerCase();
    if (!q) return [];
    var out = [];
    var seen = {};
    function push(item) {
      if (!item || !item.url || seen[item.url]) return;
      seen[item.url] = true;
      out.push(item);
    }
    bookmarks().forEach(function (item) {
      if ((item.title || "").toLowerCase().indexOf(q) >= 0 || (item.url || "").toLowerCase().indexOf(q) >= 0) {
        push({ type: "bookmark", title: item.title, url: item.url });
      }
    });
    historyList().forEach(function (item) {
      if ((item.title || "").toLowerCase().indexOf(q) >= 0 || (item.url || "").toLowerCase().indexOf(q) >= 0) {
        push({ type: "history", title: item.title, url: item.url });
      }
    });
    if (isUrl(q) || q.indexOf(".") >= 0) {
      push({ type: "url", title: q, url: queryToUrl(q) });
    } else if (q.length > 1) {
      push({ type: "search", title: 'Search "' + q + '"', url: searchUrl(q), raw: q });
    }
    return out.slice(0, 8);
  }

  function hideSuggestions() {
    suggestIndex = -1;
    if (suggestEl) {
      suggestEl.hidden = true;
      suggestEl.setAttribute("hidden", "hidden");
      suggestEl.innerHTML = "";
    }
  }

  function renderSuggestions(query) {
    if (!suggestEl || document.activeElement !== input) return;
    var items = suggestionItems(query);
    if (!items.length) {
      hideSuggestions();
      return;
    }
    suggestEl.innerHTML = "";
    items.forEach(function (item, index) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "k-browser__suggest-item";
      btn.dataset.index = String(index);
      var icon = document.createElement("img");
      icon.className = "k-browser__suggest-icon";
      icon.src = faviconUrl(item.url);
      icon.alt = "";
      var text = document.createElement("span");
      text.className = "k-browser__suggest-text";
      text.textContent = item.title;
      var sub = document.createElement("span");
      sub.className = "k-browser__suggest-sub";
      sub.textContent = hostLabel(item.url) || item.type;
      btn.append(icon, text, sub);
      btn.addEventListener("mousedown", function (e) {
        e.preventDefault();
        if (item.raw) submitQuery(item.raw);
        else openUrl(item.url, item.title, item.title);
        hideSuggestions();
      });
      suggestEl.appendChild(btn);
    });
    suggestEl.removeAttribute("hidden");
    suggestEl.hidden = false;
  }

  function applySuggestionSelection() {
    if (!suggestEl || suggestEl.hidden) return false;
    var btn = suggestEl.querySelector('[data-index="' + suggestIndex + '"]');
    if (!btn) return false;
    btn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    return true;
  }

  function moveSuggestion(delta) {
    if (!suggestEl || suggestEl.hidden) return;
    var count = suggestEl.children.length;
    if (!count) return;
    suggestIndex = (suggestIndex + delta + count) % count;
    Array.prototype.forEach.call(suggestEl.children, function (node, idx) {
      node.classList.toggle("k-browser__suggest-item--active", idx === suggestIndex);
    });
  }

  function renderStartTiles() {
    if (!tiles) return;
    var marks = bookmarks().slice(0, 10);
    var recent = historyList().slice(0, 10);
    tiles.innerHTML = "";
    if (!marks.length && !recent.length) {
      tiles.hidden = true;
      return;
    }
    tiles.hidden = false;
    if (marks.length) {
      var bTitle = document.createElement("h3");
      bTitle.className = "k-browser__tiles-title";
      bTitle.textContent = "Bookmarks";
      tiles.appendChild(bTitle);
      var bGrid = document.createElement("div");
      bGrid.className = "k-browser__tiles-grid";
      marks.forEach(function (item) {
        bGrid.appendChild(tileButton(item.title, item.url));
      });
      tiles.appendChild(bGrid);
    }
    if (recent.length) {
      var rTitle = document.createElement("h3");
      rTitle.className = "k-browser__tiles-title";
      rTitle.textContent = "Recent";
      tiles.appendChild(rTitle);
      var rGrid = document.createElement("div");
      rGrid.className = "k-browser__tiles-grid";
      recent.forEach(function (item) {
        rGrid.appendChild(tileButton(item.title, item.url));
      });
      tiles.appendChild(rGrid);
    }
  }

  function hideMenu() {
    if (!menuEl || !moreBtn) return;
    menuEl.hidden = true;
    moreBtn.setAttribute("aria-expanded", "false");
  }

  function toggleMenu() {
    if (!menuEl || !moreBtn) return;
    var open = menuEl.hidden;
    menuEl.hidden = !open;
    moreBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function tileButton(title, url) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "k-browser__tile";
    var icon = document.createElement("img");
    icon.className = "k-browser__tile-icon";
    icon.src = faviconUrl(url);
    icon.alt = "";
    icon.width = 28;
    icon.height = 28;
    var label = document.createElement("span");
    label.className = "k-browser__tile-label";
    label.textContent = trimTitle(title || hostLabel(url));
    btn.append(icon, label);
    btn.addEventListener("click", function () {
      hideMenu();
      openUrl(url, title, hostLabel(url));
    });
    return btn;
  }

  function renderQuickLinks() {
    if (!quick) return;
    quick.innerHTML = "";
    var title = document.createElement("h3");
    title.className = "k-browser__tiles-title";
    title.textContent = "Shortcuts";
    quick.appendChild(title);
    var grid = document.createElement("div");
    grid.className = "k-browser__tiles-grid k-browser__tiles-grid--quick";
    QUICK_LINKS.forEach(function (item) {
      grid.appendChild(tileButton(item.title, item.url));
    });
    quick.appendChild(grid);
  }

  function syncStartChrome() {
    var eng = engine();
    var label = eng.label || "Search";
    if (startSub) startSub.textContent = "Powered by " + label;
    if (startInput) startInput.placeholder = "Search " + label + "…";
    if (input) input.placeholder = "Search or enter URL";
    renderQuickLinks();
    renderStartTiles();
  }

  function updateClock() {
    if (!clockEl) return;
    var now = new Date();
    clockEl.textContent = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function saveSession() {
    writeJson(STORE_SESSION, {
      activeId: activeId,
      nextId: nextId,
      tabs: tabs.map(function (tab) {
        return {
          title: tab.title,
          url: tab.url,
          omnibox: tab.omnibox,
          history: tab.history,
          historyIndex: tab.historyIndex,
          pinned: !!tab.pinned,
          zoom: tab.zoom || 1,
          devtools: !!tab.devtools,
        };
      }),
    });
  }

  function restoreSession() {
    var data = readJson(STORE_SESSION, null);
    closedTabs = readJson(STORE_CLOSED, []);
    if (!data || !data.tabs || !data.tabs.length) return false;
    tabs = data.tabs.map(function (item, index) {
      return {
        id: index + 1,
        title: item.title || "New Tab",
        url: item.url || "",
        omnibox: item.omnibox || "",
        history: Array.isArray(item.history) ? item.history : item.url ? [item.url] : [],
        historyIndex: typeof item.historyIndex === "number" ? item.historyIndex : item.url ? 0 : -1,
        pinned: !!item.pinned,
        zoom: item.zoom || 1,
        devtools: !!item.devtools,
      };
    });
    nextId = tabs.length + 1;
    activeId = tabs[0].id;
    if (data.activeId && tabById(data.activeId)) activeId = data.activeId;
    return true;
  }

  function switchTabByOffset(offset) {
    if (tabs.length < 2) return;
    var idx = tabs.findIndex(function (t) {
      return t.id === activeId;
    });
    if (idx === -1) return;
    var next = tabs[(idx + offset + tabs.length) % tabs.length];
    switchTab(next.id);
  }

  function switchTabByNumber(num) {
    var idx = num - 1;
    if (idx < 0 || idx >= tabs.length) return;
    switchTab(tabs[idx].id);
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (applySuggestionSelection()) return;
      submitQuery(input ? input.value : "");
      hideSuggestions();
    });
  }

  if (startForm) {
    startForm.addEventListener("submit", function (e) {
      e.preventDefault();
      submitQuery(startInput ? startInput.value : "");
    });
  }

  if (input) {
    input.addEventListener("input", function () {
      syncClear();
      renderSuggestions(input.value);
    });
    input.addEventListener("focus", function () {
      renderSuggestions(input.value);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        moveSuggestion(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        moveSuggestion(-1);
      } else if (e.key === "Escape") {
        hideSuggestions();
      }
    });
    input.addEventListener("blur", function () {
      window.setTimeout(hideSuggestions, 120);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      if (input) {
        input.value = "";
        input.focus();
      }
      syncClear();
      hideSuggestions();
    });
  }

  if (homeBtn) homeBtn.addEventListener("click", goHome);
  if (backBtn) backBtn.addEventListener("click", back);
  if (forwardBtn) forwardBtn.addEventListener("click", forward);
  if (refreshBtn) refreshBtn.addEventListener("click", function () {
    refresh(false);
  });
  if (devtoolsBtn) devtoolsBtn.addEventListener("click", toggleDevtools);
  if (duplicateBtn) duplicateBtn.addEventListener("click", function () {
    hideMenu();
    duplicateTab();
  });
  if (bookmarkBtn) bookmarkBtn.addEventListener("click", toggleBookmark);
  if (moreBtn) moreBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    toggleMenu();
  });
  if (copyBtn) copyBtn.addEventListener("click", function () {
    hideMenu();
    copyCurrentUrl();
  });
  if (externalBtn) externalBtn.addEventListener("click", function () {
    hideMenu();
    openExternal();
  });
  if (zoomOutBtn) zoomOutBtn.addEventListener("click", function () {
    changeZoom(-1);
  });
  if (zoomInBtn) zoomInBtn.addEventListener("click", function () {
    changeZoom(1);
  });
  if (zoomLabelBtn) zoomLabelBtn.addEventListener("click", resetZoom);
  if (fsBtn) fsBtn.addEventListener("click", toggleFs);
  if (closeBtn) closeBtn.addEventListener("click", function () {
    closeTab(activeId);
  });
  if (errorRetry) errorRetry.addEventListener("click", function () {
    hideError();
    refresh(true);
  });
  if (errorOpen) errorOpen.addEventListener("click", function () {
    openExternal();
  });

  document.addEventListener("click", function (e) {
    if (!menuEl || menuEl.hidden) return;
    if (e.target === moreBtn || (moreBtn && moreBtn.contains(e.target))) return;
    if (menuEl.contains(e.target)) return;
    hideMenu();
  });

  if (frame) {
    frame.addEventListener("load", function () {
      var tab = tabById(activeId);
      if (!tab || !tab.url) {
        setLoading(false);
        return;
      }
      setLoading(false);
      hideError();
      try {
        var doc = frame.contentDocument;
        if (doc && doc.title) {
          tab.title = trimTitle(doc.title);
          renderTabs();
          pushHistory({ title: tab.title, url: tab.url });
          saveSession();
        }
      } catch (err) {
        pushHistory({ title: tab.title, url: tab.url });
      }
    });
  }

  document.addEventListener("fullscreenchange", function () {
    if (!shell) return;
    if (!document.fullscreenElement) shell.classList.remove("k-browser__shell--fs");
  });

  document.addEventListener("keydown", function (e) {
    if (!document.body.classList.contains("site--browser-open")) return;
    var key = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && key === "t") {
      e.preventDefault();
      createTab("", "New Tab", "");
    }
    if ((e.ctrlKey || e.metaKey) && key === "w") {
      e.preventDefault();
      closeTab(activeId);
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === "t") {
      e.preventDefault();
      reopenClosedTab();
    }
    if ((e.ctrlKey || e.metaKey) && key === "r") {
      e.preventDefault();
      refresh(!!e.shiftKey);
    }
    if ((e.ctrlKey || e.metaKey) && key === "l") {
      e.preventDefault();
      if (input) {
        input.focus();
        input.select();
      }
    }
    if ((e.ctrlKey || e.metaKey) && key === "d") {
      e.preventDefault();
      toggleBookmark();
    }
    if ((e.ctrlKey || e.metaKey) && key === "tab") {
      e.preventDefault();
      switchTabByOffset(e.shiftKey ? -1 : 1);
    }
    if ((e.ctrlKey || e.metaKey) && /^[1-9]$/.test(key)) {
      e.preventDefault();
      switchTabByNumber(parseInt(key, 10));
    }
    if ((e.ctrlKey || e.metaKey) && (key === "=" || key === "+")) {
      e.preventDefault();
      changeZoom(1);
    }
    if ((e.ctrlKey || e.metaKey) && key === "-") {
      e.preventDefault();
      changeZoom(-1);
    }
    if ((e.ctrlKey || e.metaKey) && key === "0") {
      e.preventDefault();
      resetZoom();
    }
    if (key === "f12") {
      e.preventDefault();
      toggleDevtools();
    }
  });

  if (!restoreSession()) createTab("", "New Tab", "");
  else {
    renderTabs();
    syncChrome(tabById(activeId), { skipLoad: true });
  }
  syncStartChrome();
  updateClock();
  clockTimer = window.setInterval(updateClock, 30000);

  window.KritikalBrowser = {
    open: function (query) {
      focusBrowser();
      if (query) {
        var tab = tabById(activeId);
        if (!tab) tab = createTab("", "New Tab", "");
        if (startInput) startInput.value = query;
        if (input) input.value = query;
        submitQuery(query);
        return;
      }
      if (tabById(activeId) && !tabById(activeId).url) return;
      createTab("", "New Tab", "");
    },
    search: function (query) {
      if (window.ZentraApp && window.ZentraApp.switchView) window.ZentraApp.switchView("browser");
      window.KritikalBrowser.open(query);
    },
  };
})();
