(function () {
  var CLAIM_KEY = "kobran-hub-key-claim";
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

  function showKey(key, expiresAt, label) {
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
    setStatus("heres ur key. copy it before u leave.", "ok");
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
      id === "games" || id === "features" || id === "key" || id === "showcase" ? id : "script";
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

  fetch("/api/kobran/key/config")
    .then(function (res) {
      return res.json();
    })
    .then(function (data) {
      if (data && data.keyDurationLabel) {
        durationLabel = data.keyDurationLabel;
        if (keyCopyText) {
          keyCopyText.textContent =
            "hit generate key, finish the ad steps, then u get brought back here with ur key. keys last " +
            durationLabel +
            ".";
        }
      }
    })
    .catch(function () {});

  if (generateBtn) {
    generateBtn.addEventListener("click", function () {
      generateBtn.disabled = true;
      setStatus("starting key gen...", null);
      fetch("/api/kobran/key/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: "{}",
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { res: res, data: data };
          });
        })
        .then(function (pack) {
          if (!pack.res.ok || !pack.data || !pack.data.ok) {
            setStatus((pack.data && pack.data.message) || "couldnt start key gen.", "error");
            generateBtn.disabled = false;
            return;
          }
          if (pack.data.keyDurationLabel) durationLabel = pack.data.keyDurationLabel;
          writeClaimId(pack.data.claimId);
          setStatus("sending u to the ad page. finish it and ull come back here.", null);
          window.location.href = pack.data.linkvertiseUrl;
        })
        .catch(function () {
          setStatus("network error starting key gen.", "error");
          generateBtn.disabled = false;
        });
    });
  }

  function finishClaim(token) {
    var claimId = readClaimId();
    if (!token) {
      window.location.href = "/api/kobran/key/complete";
      return;
    }
    setStatus("checking ur key...", null);
    if (generateBtn) generateBtn.disabled = true;
    fetch("/api/kobran/key/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ claimId: claimId, token: token }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { res: res, data: data };
        });
      })
      .then(function (pack) {
        if (!pack.res.ok || !pack.data || !pack.data.ok) {
          if (pack.data && (pack.data.error === "bad_token" || pack.data.error === "not_verified" || pack.data.error === "claim_mismatch")) {
            window.location.href = "/api/kobran/key/complete";
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
      missing: "no pending key found. hit generate key first, then finish the ad.",
      ad: "finish the ad first. closing it and skipping wont work.",
      wait: "too fast. finish the ad steps then try again.",
    };
    setStatus(map[code] || "couldnt verify the ad. generate a new key.", "error");
  }

  var params = new URLSearchParams(location.search);
  var keyDone = params.get("keydone") === "1";
  var keyErr = params.get("keyerr");
  var redeemToken = params.get("t") || "";
  if (keyDone || keyErr) {
    setTab("key", true);
    if (keyDone) finishClaim(redeemToken);
    else showKeyError(keyErr);
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
      hash === "showcase"
    ) {
      setTab(hash);
    }
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
