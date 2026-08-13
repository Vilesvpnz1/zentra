(function () {
  var loader = document.getElementById("loader");
  var status = document.getElementById("loader-status");
  var versionGate = document.getElementById("version-gate");
  var versionKobran = document.getElementById("version-kobran");
  var versionKritikal = document.getElementById("version-kritikal");
  var site = document.getElementById("site");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var EXIT_MS = reduced ? 260 : 720;
  var AUTO_MS = reduced ? 280 : 720;
  var exiting = false;
  var skipped = false;
  var ready = false;
  var autoTimer = 0;
  var failsafeTimer = 0;
  var gameTotal = 0;

  var tasks = {
    core: { weight: 10, label: "Booting", done: false, partial: 0 },
    modules: { weight: 12, label: "Loading modules", done: false, partial: 0 },
    games: { weight: 36, label: "Fetching games", done: false, partial: 0 },
    index: { weight: 24, label: "Building index", done: false, partial: 0 },
    surface: { weight: 10, label: "Preparing UI", done: false, partial: 0 },
    finalize: { weight: 8, label: "Finishing", done: false, partial: 0 },
  };

  var taskOrder = ["core", "modules", "games", "index", "surface", "finalize"];

  function computeTarget() {
    var total = 0;
    var done = 0;
    taskOrder.forEach(function (id) {
      var task = tasks[id];
      total += task.weight;
      if (task.done) done += task.weight;
      else done += task.weight * (task.partial || 0);
    });
    return total ? done / total : 0;
  }

  function activeLabel() {
    for (var i = taskOrder.length - 1; i >= 0; i--) {
      var task = tasks[taskOrder[i]];
      if (task.done || (task.partial || 0) > 0) return task.label;
    }
    return tasks.core.label;
  }

  function allDone() {
    return taskOrder.every(function (id) {
      return tasks[id].done;
    });
  }

  function setCount(total) {
    gameTotal = total || 0;
  }

  function refreshUI() {
    if (!status) return;
    var label = activeLabel();
    if (gameTotal > 0) label += " · " + gameTotal.toLocaleString() + " games";
    if (status.textContent !== label) status.textContent = label;
    if (allDone() && computeTarget() >= 1 && !ready) markReady();
  }

  function setStep(id, update) {
    if (!tasks[id]) return;
    update = update || {};
    if (update.label) tasks[id].label = update.label;
    if (update.partial !== undefined) tasks[id].partial = Math.max(0, Math.min(1, update.partial));
    if (update.done) {
      tasks[id].done = true;
      tasks[id].partial = 1;
    }
    if (update.games !== undefined) setCount(update.games);
    refreshUI();
  }

  function markReady() {
    if (ready || exiting || skipped) return;
    ready = true;
    clearTimeout(failsafeTimer);
    if (loader) {
      loader.classList.add("loader--ready");
      loader.setAttribute("aria-busy", "false");
    }
    if (status) status.textContent = "Ready";
    clearTimeout(autoTimer);
    autoTimer = setTimeout(beginExit, AUTO_MS);
  }

  function showVersionGate() {
    if (!versionGate) {
      showAuthGate();
      return;
    }
    versionGate.hidden = false;
    requestAnimationFrame(function () {
      versionGate.classList.add("version-gate--visible");
      if (versionKobran) versionKobran.focus();
    });
  }

  function showAuthGate() {
    function proceed() {
      if (window.KobranAuth && window.KobranAuth.isLoggedIn && window.KobranAuth.isLoggedIn()) {
        revealSite();
        return;
      }
      if (window.KobranAuth && window.KobranAuth.hasGuestVisit && window.KobranAuth.hasGuestVisit()) {
        if (window.KobranAuth.setGuestMode) window.KobranAuth.setGuestMode();
        revealSite();
        return;
      }
      if (window.KobranAuth && window.KobranAuth.showGate) {
        window.KobranAuth.showGate();
        return;
      }
      revealSite();
    }
    if (window.KobranAuth && window.KobranAuth.ready && window.KobranAuth.ready()) {
      proceed();
      return;
    }
    if (window.KobranAuth && window.KobranAuth.refresh) {
      window.KobranAuth.refresh().then(proceed);
      return;
    }
    proceed();
  }

  function chooseKobran() {
    if (!versionGate) {
      showAuthGate();
      return;
    }
    versionGate.classList.remove("version-gate--visible");
    setTimeout(function () {
      versionGate.hidden = true;
      showAuthGate();
    }, 280);
  }

  function chooseKritikal() {
    window.location.href = "/kritikal/";
  }

  function finishReveal() {
    document.documentElement.classList.remove("loader-lock");
    if (site) {
      site.hidden = false;
      if (!reduced) site.classList.add("site--enter");
    }
    window.dispatchEvent(new CustomEvent("kobran-boot-complete"));
  }

  function showPerfGate() {
    var gate = document.getElementById("perf-gate");
    if (!gate) {
      finishReveal();
      return;
    }
    gate.hidden = false;
    requestAnimationFrame(function () {
      gate.classList.add("perf-gate--visible");
    });
  }

  function revealSite() {
    var S = window.KobranSettings;
    if (S && typeof S.needsPerformancePrompt === "function" && S.needsPerformancePrompt()) {
      showPerfGate();
      return;
    }
    finishReveal();
  }

  function bindPerfGate() {
    var gate = document.getElementById("perf-gate");
    if (!gate) return;
    var fullBtn = document.getElementById("perf-full");
    var liteBtn = document.getElementById("perf-lite");
    function pick(lite) {
      if (window.KobranSettings && window.KobranSettings.markPerformancePromptDone) {
        window.KobranSettings.markPerformancePromptDone(lite);
      }
      gate.classList.remove("perf-gate--visible");
      setTimeout(function () {
        gate.hidden = true;
        finishReveal();
      }, 220);
    }
    if (fullBtn) fullBtn.addEventListener("click", function () { pick(false); });
    if (liteBtn) liteBtn.addEventListener("click", function () { pick(true); });
  }

  function removeLoader() {
    clearTimeout(autoTimer);
    clearTimeout(failsafeTimer);
    if (loader) loader.remove();
  }

  function beginExit() {
    if (exiting || !loader) return;
    if (!ready && !skipped) return;
    exiting = true;
    clearTimeout(failsafeTimer);
    if (reduced) {
      removeLoader();
      showVersionGate();
      return;
    }
    loader.classList.add("loader--exit");
    setTimeout(function () {
      removeLoader();
      showVersionGate();
    }, EXIT_MS);
  }

  function skip() {
    if (skipped || exiting) return;
    skipped = true;
    exiting = true;
    clearTimeout(failsafeTimer);
    removeLoader();
    showAuthGate();
  }

  function notifyReady() {
    setStep("finalize", { done: true, label: "Ready" });
  }

  window.KobranLoader = {
    setStep: setStep,
    notifyReady: notifyReady,
    skip: skip,
    afterAuth: revealSite,
  };

  function boot() {
    if (!loader || document.documentElement.classList.contains("cloak-full")) {
      skip();
      return;
    }
    setStep("core", { done: true });
    setStep("modules", { partial: 0.35 });
    refreshUI();
    if (versionKobran) versionKobran.addEventListener("click", chooseKobran);
    if (versionKritikal) versionKritikal.addEventListener("click", chooseKritikal);
    bindPerfGate();
    clearTimeout(failsafeTimer);
    failsafeTimer = setTimeout(function () {
      if (ready || skipped || exiting) return;
      taskOrder.forEach(function (id) {
        if (!tasks[id].done) setStep(id, { done: true, label: tasks[id].label });
      });
    }, 10000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
