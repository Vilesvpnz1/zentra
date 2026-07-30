(function () {
  var CLAIM_KEY = "kobran-hub-key-claim";
  var SAVED_KEY = "kobran-hub-saved-key";
  var root = document.getElementById("hub-about");
  var openBtn = document.getElementById("hub-about-open");
  var closeBtn = document.getElementById("hub-about-close");
  var backdrop = document.getElementById("hub-about-backdrop");
  var tabs = document.querySelectorAll("[data-hub-tab]");
  var views = document.querySelectorAll("[data-hub-view]");
  var copyBtn = document.getElementById("hub-script-copy");
  var codeEl = document.getElementById("hub-script-code");
  var generateBtn = document.getElementById("hub-key-generate");
  var keyResult = document.getElementById("hub-key-result");
  var keyValue = document.getElementById("hub-key-value");
  var keyCopyBtn = document.getElementById("hub-key-copy-btn");
  var keyStatus = document.getElementById("hub-key-status");
  var keyMeta = document.getElementById("hub-key-meta");
  var keyCopyText = document.getElementById("hub-key-blurb");
  var scriptText =
    'loadstring(game:HttpGet("https://raw.githubusercontent.com/zzdislol/kobran-hub/refs/heads/main/kobran.lua",true))';
  var durationLabel = "24 hours";

  function setStatus(text, kind) {
    if (!keyStatus) return;
    if (!text) {
      keyStatus.hidden = true;
      keyStatus.textContent = "";
      keyStatus.classList.remove("is-error", "is-ok");
      return;
    }
    keyStatus.hidden = false;
    keyStatus.textContent = text;
    keyStatus.classList.toggle("is-error", kind === "error");
    keyStatus.classList.toggle("is-ok", kind === "ok");
  }

  function formatExpiry(expiresAt) {
    try {
      return new Date(expiresAt).toLocaleString();
    } catch (e) {
      return "";
    }
  }

  function readSavedKey() {
    try {
      var raw = localStorage.getItem(SAVED_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || !data.key) return null;
      if (data.expiresAt && Date.now() > Number(data.expiresAt)) {
        localStorage.removeItem(SAVED_KEY);
        return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  }

  function writeSavedKey(key, expiresAt, label) {
    try {
      localStorage.setItem(
        SAVED_KEY,
        JSON.stringify({
          key: key,
          expiresAt: expiresAt || 0,
          label: label || durationLabel,
          savedAt: Date.now(),
        })
      );
    } catch (e) {}
  }

  function showKey(key, expiresAt, label, restored) {
    if (!keyResult || !keyValue) return;
    keyValue.textContent = key;
    keyResult.hidden = false;
    var dur = label || durationLabel;
    if (keyMeta) {
      keyMeta.hidden = false;
      keyMeta.textContent = expiresAt
        ? "valid for " + dur + " · expires " + formatExpiry(expiresAt)
        : "valid for " + dur;
    }
    writeSavedKey(key, expiresAt, dur);
    setStatus(
      restored ? "heres ur saved key. still valid." : "heres ur key. copy it before u leave.",
      "ok"
    );
  }

  function restoreSavedKey() {
    var saved = readSavedKey();
    if (!saved) return false;
    showKey(saved.key, saved.expiresAt, saved.label || durationLabel, true);
    return true;
  }

  function readClaimId() {
    try {
      return localStorage.getItem(CLAIM_KEY) || sessionStorage.getItem(CLAIM_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  function writeClaimId(id) {
    try {
      localStorage.setItem(CLAIM_KEY, id);
    } catch (e) {}
    try {
      sessionStorage.setItem(CLAIM_KEY, id);
    } catch (e) {}
  }

  function clearClaimId() {
    try {
      localStorage.removeItem(CLAIM_KEY);
    } catch (e) {}
    try {
      sessionStorage.removeItem(CLAIM_KEY);
    } catch (e) {}
  }

  function copyText(text, btn) {
    function done(ok) {
      if (!btn) return;
      var prev = btn.getAttribute("data-label") || btn.textContent;
      btn.setAttribute("data-label", prev);
      btn.textContent = ok ? "Copied" : "Copy failed";
      setTimeout(function () {
        btn.textContent = btn.getAttribute("data-label") || "Copy";
      }, 1400);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          done(true);
        },
        function () {
          done(false);
        }
      );
      return;
    }
    try {
      var area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      done(document.execCommand("copy"));
      document.body.removeChild(area);
    } catch (err) {
      done(false);
    }
  }

  function setTab(id, keepQuery) {
    var next =
      id === "games" ||
      id === "features" ||
      id === "key" ||
      id === "support" ||
      id === "showcase"
        ? id
        : "script";
    views.forEach(function (view) {
      var on = view.getAttribute("data-hub-view") === next;
      view.classList.toggle("is-active", on);
      view.hidden = !on;
    });
    tabs.forEach(function (tab) {
      tab.classList.toggle("is-active", tab.getAttribute("data-hub-tab") === next);
    });
    if (history.replaceState) {
      var params = new URLSearchParams(location.search);
      if (!keepQuery) {
        params.delete("keydone");
        params.delete("keyerr");
        params.delete("t");
      }
      var q = params.toString();
      var path = location.pathname + (q ? "?" + q : "") + (next === "script" ? "#script" : "#" + next);
      history.replaceState(null, "", path);
    }
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function (e) {
      if (tab.tagName === "A") e.preventDefault();
      setTab(tab.getAttribute("data-hub-tab"));
    });
  });

  if (copyBtn && codeEl) {
    copyBtn.addEventListener("click", function () {
      copyText((codeEl.textContent || scriptText).trim(), copyBtn);
    });
  }

  if (keyCopyBtn && keyValue) {
    keyCopyBtn.addEventListener("click", function () {
      copyText((keyValue.textContent || "").trim(), keyCopyBtn);
    });
  }

  var KEY_API = "https://zentra-mhkl.onrender.com/api/kobran/key";

  function keyApi(path, query) {
    var url = KEY_API + path;
    var q = [];
    if (query) {
      Object.keys(query).forEach(function (k) {
        if (query[k] == null || query[k] === "") return;
        q.push(encodeURIComponent(k) + "=" + encodeURIComponent(String(query[k])));
      });
    }
    if (q.length) url += (url.indexOf("?") >= 0 ? "&" : "?") + q.join("&");
    return url;
  }

  function fetchJson(url, options) {
    return fetch(url, options).then(function (res) {
      return res.text().then(function (text) {
        var data = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch (e) {
          data = null;
        }
        return { res: res, data: data, text: text };
      });
    });
  }

  fetchJson(keyApi("/config"), { method: "GET", cache: "no-store", credentials: "include" })
    .then(function (pack) {
      var data = pack.data;
      if (data && data.keyDurationLabel) {
        durationLabel = data.keyDurationLabel;
        if (keyCopyText) {
          keyCopyText.textContent =
            "hit generate key, finish the work.ink steps, then u get brought back here with ur key. keys last " +
            durationLabel +
            ". first device that uses the key in the script locks it so others cant use it.";
        }
      }
    })
    .catch(function () {});

  if (generateBtn) {
    generateBtn.addEventListener("click", function () {
      generateBtn.disabled = true;
      setStatus("starting key gen...", null);
      fetchJson(keyApi("/start", { origin: location.origin }), {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      })
        .then(function (pack) {
          if (!pack.res.ok || !pack.data || !pack.data.ok) {
            setStatus(
              (pack.data && pack.data.message) ||
                (pack.res.status ? "couldnt start key gen (" + pack.res.status + ")." : "couldnt start key gen."),
              "error"
            );
            generateBtn.disabled = false;
            return;
          }
          if (pack.data.keyDurationLabel) durationLabel = pack.data.keyDurationLabel;
          writeClaimId(pack.data.claimId);
          setStatus("sending u to work.ink. finish the steps and ull come back here.", null);
          window.location.href = pack.data.workinkUrl || pack.data.linkvertiseUrl;
        })
        .catch(function () {
          setStatus("network error starting key gen. hard refresh and try again.", "error");
          generateBtn.disabled = false;
        });
    });
  }

  function finishClaim(token) {
    var claimId = readClaimId();
    if (!token) {
      window.location.href = keyApi("/complete");
      return;
    }
    setStatus("checking ur key...", null);
    if (generateBtn) generateBtn.disabled = true;
    fetchJson(keyApi("/claim"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ claimId: claimId, token: token }),
    })
      .then(function (pack) {
        if (!pack.res.ok || !pack.data || !pack.data.ok) {
          if (pack.data && (pack.data.error === "bad_token" || pack.data.error === "not_verified" || pack.data.error === "claim_mismatch")) {
            window.location.href = keyApi("/complete", { claimId: claimId });
            return;
          }
          setStatus((pack.data && pack.data.message) || "couldnt claim key.", "error");
          if (generateBtn) generateBtn.disabled = false;
          return;
        }
        clearClaimId();
        showKey(pack.data.key, pack.data.expiresAt, pack.data.keyDurationLabel);
        if (generateBtn) generateBtn.disabled = false;
      })
      .catch(function () {
        setStatus("network error claiming key.", "error");
        if (generateBtn) generateBtn.disabled = false;
      });
  }

  function showKeyError(code) {
    var map = {
      missing: "no pending key found. hit generate key first, then finish the work.ink steps.",
      steps: "finish the work.ink steps first. closing it and skipping wont work.",
      verify: "couldnt verify work.ink. generate a new key and try again.",
      wait: "too fast. finish the work.ink steps then try again.",
      ad: "finish the work.ink steps first. closing it and skipping wont work.",
    };
    setStatus(map[code] || "couldnt verify. generate a new key.", "error");
  }

  var params = new URLSearchParams(location.search);
  var keyDone = params.get("keydone") === "1";
  var keyErr = params.get("keyerr");
  var redeemToken = params.get("t") || "";
  if (keyDone || keyErr) {
    setTab("key", true);
    if (keyDone) finishClaim(redeemToken);
    else {
      showKeyError(keyErr);
      restoreSavedKey();
    }
    if (history.replaceState) {
      params.delete("keydone");
      params.delete("keyerr");
      params.delete("t");
      var clean = location.pathname + (params.toString() ? "?" + params.toString() : "") + "#key";
      history.replaceState(null, "", clean);
    }
  } else {
    var hash = (location.hash || "").replace(/^#/, "");
    if (
      hash === "games" ||
      hash === "features" ||
      hash === "script" ||
      hash === "key" ||
      hash === "support" ||
      hash === "showcase"
    ) {
      setTab(hash);
    }
    restoreSavedKey();
  }

  if (!root || !openBtn) return;

  function openAbout() {
    root.hidden = false;
    requestAnimationFrame(function () {
      root.classList.add("hub-about--open");
    });
    document.body.classList.add("hub-about-lock");
    if (closeBtn) closeBtn.focus();
  }

  function closeAbout() {
    root.classList.remove("hub-about--open");
    document.body.classList.remove("hub-about-lock");
    setTimeout(function () {
      if (!root.classList.contains("hub-about--open")) root.hidden = true;
    }, 220);
    openBtn.focus();
  }

  openBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    openAbout();
  });
  if (closeBtn) closeBtn.addEventListener("click", closeAbout);
  if (backdrop) backdrop.addEventListener("click", closeAbout);
  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && root.classList.contains("hub-about--open")) closeAbout();
  });
})();
