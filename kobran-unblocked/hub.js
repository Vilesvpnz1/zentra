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
  var scriptText =
    'loadstring(game:HttpGet("https://raw.githubusercontent.com/zzdislol/kobran-hub/refs/heads/main/kobran.lua",true))';

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

  function showKey(key) {
    if (!keyResult || !keyValue) return;
    keyValue.textContent = key;
    keyResult.hidden = false;
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
      if (!keepQuery) params.delete("keydone");
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

  if (generateBtn) {
    generateBtn.addEventListener("click", function () {
      generateBtn.disabled = true;
      setStatus("starting key gen...", null);
      fetch("/api/kobran/key/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  function finishClaim() {
    var claimId = readClaimId();
    setStatus("checking ur key...", null);
    if (generateBtn) generateBtn.disabled = true;
    fetch("/api/kobran/key/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claimId: claimId }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { res: res, data: data };
        });
      })
      .then(function (pack) {
        if (!pack.res.ok || !pack.data || !pack.data.ok) {
          setStatus((pack.data && pack.data.message) || "couldnt claim key.", "error");
          if (generateBtn) generateBtn.disabled = false;
          return;
        }
        clearClaimId();
        showKey(pack.data.key);
        if (generateBtn) generateBtn.disabled = false;
      })
      .catch(function () {
        setStatus("network error claiming key.", "error");
        if (generateBtn) generateBtn.disabled = false;
      });
  }

  var params = new URLSearchParams(location.search);
  var keyDone = params.get("keydone") === "1";
  if (keyDone) {
    setTab("key", true);
    finishClaim();
    if (history.replaceState) {
      params.delete("keydone");
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
