(function () {
  var glow = document.getElementById("cursor-glow");
  var aurora = null;
  var orbitLayer = null;
  var navTrack = document.querySelector(".site__nav-track");
  var navDock = document.getElementById("nav-dock");
  var glider = null;
  var dockHideTimer = 0;
  var dockPinned = false;
  var dockHover = false;
  var dockTouch = "ontouchstart" in window;
  var dockAmount = dockTouch ? 1 : 0;
  var dockTarget = dockTouch ? 1 : 0;
  var dockAnimRaf = 0;
  var dockManual = null;
  var dockToggleBtn = null;
  var dockGliderQueued = false;
  var mx = 0;
  var my = 0;
  var gx = 0;
  var gy = 0;
  var ax = 0;
  var ay = 0;
  var motionRaf = 0;
  var tiltEnabled = true;
  var motionEnabled = true;
  var cursorFxEnabled = true;

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function readSettings() {
    var S = window.KritikalSettings;
    if (!S) {
      return { cursorTrail: true, glow: 55, matrixGrid: true, navAutoReveal: true };
    }
    return {
      cursorTrail: !!S.get("cursorTrail"),
      glow: Number(S.get("glow")) || 55,
      matrixGrid: S.get("matrixGrid") !== false,
      navAutoReveal: S.get("navAutoReveal") !== false,
    };
  }

  function navAutoRevealOn() {
    return readSettings().navAutoReveal;
  }

  function auroraActive() {
    var s = readSettings();
    return !!(aurora && motionEnabled && s.matrixGrid && !document.body.classList.contains("fx-no-matrix"));
  }

  function needsMotionLoop() {
    return (cursorFxEnabled && glow) || auroraActive();
  }

  function startMotionLoop() {
    if (motionRaf || !motionEnabled || !needsMotionLoop()) return;
    motionRaf = requestAnimationFrame(tickMotion);
  }

  function syncFx() {
    var s = readSettings();
    cursorFxEnabled = s.cursorTrail && !document.body.classList.contains("fx-no-cursor-glow");
    if (glow) {
      glow.hidden = !cursorFxEnabled;
      glow.style.opacity = "";
    }
    if (!needsMotionLoop() && motionRaf) {
      cancelAnimationFrame(motionRaf);
      motionRaf = 0;
    } else {
      startMotionLoop();
    }
  }

  function initNavGlider() {
    if (!navTrack || glider) return;
    glider = document.createElement("span");
    glider.className = "site__nav-glider";
    glider.setAttribute("aria-hidden", "true");
    navTrack.appendChild(glider);
    var active = navTrack.querySelector(".site__nav-link--active");
    if (active) moveGlider(active);
  }

  var dockLabelTimers = [];
  var dockLabelGen = 0;
  var navLabelsPinned = false;

  function navLabelsAlwaysOn() {
    var S = window.KritikalSettings;
    return !!(S && S.get("navLabelsAlways"));
  }

  function prefersReducedNavMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function initNavLabels() {
    if (!navTrack) return;
    navTrack.querySelectorAll(".site__nav-label").forEach(function (el) {
      if (!el.dataset.full) el.dataset.full = (el.textContent || "").trim();
    });
    if (!navLabelsAlwaysOn()) resetNavLabelEls();
  }

  function clearNavLabelTimers() {
    dockLabelTimers.forEach(function (id) {
      clearTimeout(id);
    });
    dockLabelTimers = [];
  }

  function queueNavTimer(fn, ms) {
    var id = setTimeout(fn, ms);
    dockLabelTimers.push(id);
    return id;
  }

  function refreshNavGliderSoon() {
    requestAnimationFrame(function () {
      var active = navTrack && navTrack.querySelector(".site__nav-link--active");
      if (active && glider) moveGlider(active);
    });
  }

  function resetNavLabelEls() {
    if (!navTrack) return;
    navTrack.querySelectorAll(".site__nav-label").forEach(function (el) {
      el.textContent = "";
      el.classList.remove("site__nav-label--typing", "site__nav-label--done");
    });
  }

  function showNavLabelsInstant() {
    if (!navTrack || !navDock) return;
    clearNavLabelTimers();
    dockLabelGen += 1;
    navDock.classList.add("site__nav-dock--labels");
    navTrack.querySelectorAll(".site__nav-link").forEach(function (link) {
      var el = link.querySelector(".site__nav-label");
      if (!el) return;
      var full = el.dataset.full || "";
      el.textContent = full;
      el.classList.remove("site__nav-label--typing");
      el.classList.add("site__nav-label--done");
    });
    refreshNavGliderSoon();
  }

  function hideNavLabels() {
    if (!navDock || navLabelsAlwaysOn() || navLabelsPinned) return;
    clearNavLabelTimers();
    dockLabelGen += 1;
    navDock.classList.remove("site__nav-dock--labels");
    resetNavLabelEls();
    refreshNavGliderSoon();
  }

  function startNavTypewriter() {
    if (!navTrack || !navDock) return;
    if (navLabelsAlwaysOn()) {
      showNavLabelsInstant();
      return;
    }
    clearNavLabelTimers();
    dockLabelGen += 1;
    var gen = dockLabelGen;
    navDock.classList.add("site__nav-dock--labels");
    resetNavLabelEls();
    var links = navTrack.querySelectorAll(".site__nav-link");
    var reduced = prefersReducedNavMotion();
    var stagger = reduced ? 0 : 55;
    var charDelay = reduced ? 0 : 38;
    var doneCount = 0;
    links.forEach(function (link, linkIndex) {
      var el = link.querySelector(".site__nav-label");
      if (!el) return;
      var full = el.dataset.full || "";
      queueNavTimer(function () {
        if (gen !== dockLabelGen) return;
        if (!full) {
          el.classList.add("site__nav-label--done");
          doneCount += 1;
          if (doneCount === links.length) refreshNavGliderSoon();
          return;
        }
        if (reduced) {
          el.textContent = full;
          el.classList.add("site__nav-label--done");
          doneCount += 1;
          if (doneCount === links.length) refreshNavGliderSoon();
          return;
        }
        el.classList.add("site__nav-label--typing");
        var i = 0;
        function typeChar() {
          if (gen !== dockLabelGen) return;
          el.textContent = full.slice(0, i);
          if (i < full.length) {
            i += 1;
            queueNavTimer(typeChar, charDelay + (i % 3 === 0 ? 12 : 0));
            if (i % 2 === 0) refreshNavGliderSoon();
            return;
          }
          el.classList.remove("site__nav-label--typing");
          el.classList.add("site__nav-label--done");
          doneCount += 1;
          refreshNavGliderSoon();
        }
        typeChar();
      }, linkIndex * stagger);
    });
  }

  function syncNavLabels() {
    navLabelsPinned = navLabelsAlwaysOn();
    if (navLabelsPinned) showNavLabelsInstant();
    else hideNavLabels();
  }

  function moveGlider(btn) {
    if (!glider || !btn || !navTrack) return;
    var trackRect = navTrack.getBoundingClientRect();
    var rect = btn.getBoundingClientRect();
    glider.style.width = rect.width + "px";
    glider.style.height = rect.height + "px";
    glider.style.transform = "translate(" + (rect.left - trackRect.left) + "px," + (rect.top - trackRect.top) + "px)";
    glider.style.opacity = "1";
  }

  window.ZentraNavGlider = {
    move: moveGlider,
    init: initNavGlider,
  };

  function applyDockVisuals() {
    if (!navDock) return;
    navDock.style.setProperty("--dock-open", dockAmount.toFixed(4));
    navDock.classList.toggle("site__nav-dock--open", dockAmount > 0.55);
    if (dockToggleBtn) {
      dockToggleBtn.setAttribute("aria-expanded", dockAmount > 0.45 ? "true" : "false");
    }
    if (dockAmount > 0.72 && glider && !dockGliderQueued) {
      dockGliderQueued = true;
      requestAnimationFrame(function () {
        dockGliderQueued = false;
        var active = navTrack && navTrack.querySelector(".site__nav-link--active");
        if (active) moveGlider(active);
      });
    }
  }

  function computeDockTarget(clientX, clientY) {
    if (dockManual === false) return 0;
    if (dockManual === true) return 1;
    if (dockTouch || dockPinned || dockHover) return 1;
    if (!navAutoRevealOn()) return 0;
    var site = document.getElementById("site");
    if (site && site.hidden) return 0;
    var shell = navDock && navDock.querySelector(".site__nav-dock-shell");
    if (shell) {
      var rect = shell.getBoundingClientRect();
      if (
        clientX >= rect.left - 36 &&
        clientX <= rect.right + 36 &&
        clientY >= rect.top - 28 &&
        clientY <= rect.bottom + 28
      ) {
        return 1;
      }
    }
    var fromBottom = window.innerHeight - clientY;
    if (fromBottom <= 64) return 1;
    if (fromBottom >= 168) return 0;
    return 1 - (fromBottom - 64) / 104;
  }

  function tickDockAnim() {
    dockAnimRaf = 0;
    if (!dockTouch && !dockPinned) {
      dockTarget = computeDockTarget(mx, my);
    }
    var delta = dockTarget - dockAmount;
    if (Math.abs(delta) > 0.002) {
      dockAmount += delta * (delta > 0 ? 0.11 : 0.08);
      if (dockAmount < 0) dockAmount = 0;
      if (dockAmount > 1) dockAmount = 1;
      applyDockVisuals();
      dockAnimRaf = requestAnimationFrame(tickDockAnim);
      return;
    }
    dockAmount = dockTarget;
    applyDockVisuals();
  }

  function startDockAnim() {
    if (!dockAnimRaf) dockAnimRaf = requestAnimationFrame(tickDockAnim);
  }

  function setDockOpen(open, pin) {
    if (pin !== undefined) dockPinned = !!pin;
    if (dockTouch) {
      dockTarget = 1;
      dockAmount = 1;
      applyDockVisuals();
      return;
    }
    if (open) {
      dockTarget = 1;
      clearTimeout(dockHideTimer);
    } else if (!dockPinned) {
      dockTarget = computeDockTarget(mx, my);
      scheduleDockClose();
    }
    startDockAnim();
  }

  function scheduleDockClose() {
    if (dockPinned || dockHover || dockTouch) return;
    clearTimeout(dockHideTimer);
    dockHideTimer = setTimeout(function () {
      dockHideTimer = 0;
      if (!dockPinned && !dockHover) {
        dockTarget = computeDockTarget(mx, my);
        startDockAnim();
      }
    }, 520);
  }

  function checkDockProximity(clientX, clientY) {
    if (!navDock || dockTouch || !navAutoRevealOn()) return;
    mx = clientX;
    my = clientY;
    dockTarget = computeDockTarget(clientX, clientY);
    if (dockTarget > 0.02) clearTimeout(dockHideTimer);
    startDockAnim();
  }

  function snapDockOpen() {
    dockPinned = true;
    dockTarget = 1;
    dockAmount = 1;
    clearTimeout(dockHideTimer);
    applyDockVisuals();
    refreshNavGliderSoon();
  }

  function measureNavTabsRect(pad) {
    pad = pad || 8;
    if (!navTrack) return null;
    var links = navTrack.querySelectorAll(".site__nav-link");
    if (!links.length) return null;
    var top = Infinity;
    var left = Infinity;
    var right = -Infinity;
    var bottom = -Infinity;
    var valid = false;
    links.forEach(function (link) {
      var r = link.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      valid = true;
      top = Math.min(top, r.top);
      left = Math.min(left, r.left);
      right = Math.max(right, r.right);
      bottom = Math.max(bottom, r.bottom);
    });
    if (!valid) return null;
    return {
      top: top - pad,
      left: left - pad,
      width: right - left + pad * 2,
      height: bottom - top + pad * 2,
      bottom: bottom + pad,
    };
  }

  function toggleDockManual() {
    if (dockAmount > 0.45 || dockManual === true) {
      dockManual = false;
      dockTarget = 0;
      dockPinned = false;
    } else {
      dockManual = true;
      dockTarget = 1;
      dockPinned = true;
      startNavTypewriter();
    }
    clearTimeout(dockHideTimer);
    if (dockToggleBtn) {
      dockToggleBtn.setAttribute("aria-expanded", dockManual === true || dockAmount > 0.45 ? "true" : "false");
    }
    startDockAnim();
  }

  function initDockToggle() {
    if (!navDock || dockToggleBtn) return;
    dockToggleBtn = document.getElementById("nav-dock-toggle");
    if (!dockToggleBtn) {
      var shell = navDock.querySelector(".site__nav-dock-shell");
      if (!shell) return;
      dockToggleBtn = document.createElement("button");
      dockToggleBtn.type = "button";
      dockToggleBtn.className = "site__nav-dock-toggle";
      dockToggleBtn.id = "nav-dock-toggle";
      dockToggleBtn.setAttribute("aria-label", "Toggle navigation");
      dockToggleBtn.setAttribute("aria-expanded", "false");
      dockToggleBtn.innerHTML =
        '<svg class="site__nav-dock-toggle-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
      shell.insertBefore(dockToggleBtn, shell.firstChild);
    }
    dockToggleBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      toggleDockManual();
    });
  }

  function syncAutoReveal() {
    if (navAutoRevealOn()) {
      dockManual = null;
      dockPinned = false;
      dockTarget = computeDockTarget(mx, my);
    } else {
      dockManual = false;
      dockPinned = false;
      dockTarget = 0;
      hideNavLabels();
    }
    if (dockToggleBtn) {
      dockToggleBtn.setAttribute("aria-expanded", dockAmount > 0.45 ? "true" : "false");
    }
    startDockAnim();
  }

  window.ZentraNavDock = {
    open: function (pin) {
      dockManual = true;
      dockPinned = pin !== false;
      dockTarget = 1;
      clearTimeout(dockHideTimer);
      if (dockToggleBtn) dockToggleBtn.setAttribute("aria-expanded", "true");
      startDockAnim();
    },
    close: function () {
      dockManual = false;
      dockPinned = false;
      dockTarget = 0;
      if (dockToggleBtn) dockToggleBtn.setAttribute("aria-expanded", "false");
      scheduleDockClose();
      startDockAnim();
    },
    snapOpen: snapDockOpen,
    measureTabsRect: measureNavTabsRect,
    syncAutoReveal: syncAutoReveal,
  };

  window.ZentraOrbitFx = {
    sync: syncFx,
  };

  function tickMotion() {
    if (!motionEnabled) {
      motionRaf = 0;
      return;
    }

    var keepGoing = false;
    var s = readSettings();

    if (cursorFxEnabled && glow) {
      gx = lerp(gx, mx, 0.12);
      gy = lerp(gy, my, 0.12);
      var size = 280 + (s.glow / 100) * 160;
      glow.style.transform = "translate(" + (gx - size * 0.5) + "px," + (gy - size * 0.5) + "px)";
      keepGoing = true;
    }

    if (orbitLayer && !document.body.classList.contains("fx-no-orbit")) {
      var px = (mx / window.innerWidth - 0.5) * 24;
      var py = (my / window.innerHeight - 0.5) * 16;
      orbitLayer.style.transform = "translate(" + px + "px," + py + "px)";
    }

    if (auroraActive()) {
      var nx = mx / window.innerWidth - 0.5;
      var ny = my / window.innerHeight - 0.5;
      var targetX = nx * 88;
      var targetY = ny * 64;
      ax = lerp(ax, targetX, 0.1);
      ay = lerp(ay, targetY, 0.1);
      aurora.style.transform = "translate3d(" + ax + "px," + ay + "px,0) scale(" + (1 + Math.abs(nx) * 0.06) + ") rotate(" + (nx * 1.2) + "deg)";
      aurora.style.setProperty("--mx", String(nx * 100));
      aurora.style.setProperty("--my", String(ny * 100));
      keepGoing = true;
    } else if (aurora) {
      aurora.style.transform = "";
      aurora.style.removeProperty("--mx");
      aurora.style.removeProperty("--my");
    }

    if (keepGoing && needsMotionLoop()) {
      motionRaf = requestAnimationFrame(tickMotion);
    } else {
      motionRaf = 0;
    }
  }

  document.addEventListener("mousemove", function (e) {
    mx = e.clientX;
    my = e.clientY;
    checkDockProximity(mx, my);
    startMotionLoop();
  });

  if (navDock) {
    navDock.addEventListener("mouseenter", function () {
      dockHover = true;
      dockTarget = 1;
      clearTimeout(dockHideTimer);
      startDockAnim();
      startNavTypewriter();
    });
    navDock.addEventListener("mouseleave", function () {
      dockHover = false;
      dockTarget = computeDockTarget(mx, my);
      scheduleDockClose();
      startDockAnim();
      hideNavLabels();
    });
  }

  document.addEventListener("mouseover", function (e) {
    if (!tiltEnabled) return;
    var card = e.target.closest(".site__card");
    if (!card) return;
    card.classList.add("site__card--hover");
  });

  document.addEventListener("mousemove", function (e) {
    if (!tiltEnabled) return;
    var card = e.target.closest(".site__card.site__card--hover");
    if (!card) return;
    var rect = card.getBoundingClientRect();
    var x = (e.clientX - rect.left) / rect.width - 0.5;
    var y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.setProperty("--tilt-x", String(y * -10));
    card.style.setProperty("--tilt-y", String(x * 10));
  });

  document.addEventListener("mouseout", function (e) {
    var card = e.target.closest(".site__card");
    if (!card) return;
    if (card.contains(e.relatedTarget)) return;
    card.classList.remove("site__card--hover");
    card.style.removeProperty("--tilt-x");
    card.style.removeProperty("--tilt-y");
  });

  window.addEventListener("kritikal-settings", function () {
    syncFx();
    syncNavLabels();
    syncAutoReveal();
  });

  document.addEventListener("click", function (e) {
    var link = e.target.closest(".site__nav-link");
    if (link && glider) {
      dockTarget = 1;
      clearTimeout(dockHideTimer);
      startDockAnim();
      requestAnimationFrame(function () {
        moveGlider(link);
      });
    }
  });

  window.addEventListener("resize", function () {
    var active = navTrack && navTrack.querySelector(".site__nav-link--active");
    if (active) moveGlider(active);
  });

  motionEnabled = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  tiltEnabled = motionEnabled;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initDockToggle();
      initNavLabels();
      initNavGlider();
      syncFx();
      syncNavLabels();
      applyDockVisuals();
      startDockAnim();
    });
  } else {
    initDockToggle();
    initNavLabels();
    initNavGlider();
    syncFx();
    syncNavLabels();
    applyDockVisuals();
    startDockAnim();
  }

  var site = document.getElementById("site");
  if (site) {
    var obs = new MutationObserver(function () {
      if (!site.hidden) initNavGlider();
    });
    obs.observe(site, { attributes: true, attributeFilter: ["hidden"] });
  }
})();
