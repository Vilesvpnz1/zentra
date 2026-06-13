(function () {
  var loader = document.getElementById("loader");
  var canvas = document.getElementById("loader-canvas");
  var bar = document.getElementById("loader-bar");
  var barHead = document.getElementById("loader-bar-head");
  var barWrap = document.getElementById("loader-bar-wrap");
  var status = document.getElementById("loader-status");
  var percentEl = document.getElementById("loader-percent");
  var countEl = document.getElementById("loader-count");
  var stepsEl = document.getElementById("loader-steps");
  var enterBtn = document.getElementById("loader-enter");
  var versionGate = document.getElementById("version-gate");
  var versionOriginal = document.getElementById("version-original");
  var versionCine = document.getElementById("version-cine");
  var site = document.getElementById("site");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var EXIT_MS = reduced ? 280 : 900;
  var exiting = false;
  var skipped = false;
  var ready = false;
  var displayProgress = 0;
  var targetProgress = 0;
  var raf = 0;
  var animRaf = 0;
  var ctx = null;
  var particles = [];
  var stars = [];
  var comets = [];
  var arcs = [];
  var pulse = 0;
  var gameTotal = 0;

  function particlesEnabled() {
    if (document.body && document.body.classList.contains("fx-no-particles")) return false;
    var S = window.KritikalSettings;
    if (S && !S.get("particles")) return false;
    return true;
  }

  function syncLoaderCanvas() {
    if (!canvas) return;
    canvas.style.display = particlesEnabled() ? "block" : "none";
  }

  var tasks = {
    core: { weight: 10, label: "Booting core", done: false, partial: 0 },
    modules: { weight: 12, label: "Loading modules", done: false, partial: 0 },
    games: { weight: 36, label: "Fetching game library", done: false, partial: 0 },
    index: { weight: 24, label: "Building game index", done: false, partial: 0 },
    surface: { weight: 10, label: "Preparing interface", done: false, partial: 0 },
    finalize: { weight: 8, label: "Finalizing", done: false, partial: 0 },
  };

  var taskOrder = ["core", "modules", "games", "index", "surface", "finalize"];

  function getAccentRgb() {
    var accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#ffffff";
    if (accent.charAt(0) === "#" && accent.length >= 7) {
      return {
        r: parseInt(accent.slice(1, 3), 16),
        g: parseInt(accent.slice(3, 5), 16),
        b: parseInt(accent.slice(5, 7), 16),
      };
    }
    return { r: 255, g: 255, b: 255 };
  }

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

  function renderSteps() {
    if (!stepsEl) return;
    stepsEl.innerHTML = "";
    taskOrder.forEach(function (id) {
      var task = tasks[id];
      var li = document.createElement("li");
      li.className = "loader__step";
      if (task.done) li.classList.add("loader__step--done");
      else if ((task.partial || 0) > 0) li.classList.add("loader__step--active");
      var mark = document.createElement("span");
      mark.className = "loader__step-mark";
      mark.textContent = task.done ? "✓" : "○";
      var text = document.createElement("span");
      text.className = "loader__step-text";
      text.textContent = task.label;
      li.append(mark, text);
      stepsEl.appendChild(li);
    });
  }

  function setBar(progress) {
    var pct = Math.max(0, Math.min(100, Math.round(progress * 100)));
    if (bar) bar.style.width = pct + "%";
    if (barHead) barHead.style.left = pct + "%";
    if (barWrap) barWrap.setAttribute("aria-valuenow", String(pct));
    if (percentEl) percentEl.textContent = pct + "%";
  }

  function setCount(total) {
    gameTotal = total || 0;
    if (!countEl) return;
    if (gameTotal > 0) countEl.textContent = gameTotal.toLocaleString() + " games";
    else countEl.textContent = "";
  }

  function refreshUI() {
    targetProgress = computeTarget();
    if (status) {
      var label = activeLabel();
      if (status.textContent !== label) status.textContent = label;
    }
    renderSteps();
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

  function resizeCanvas() {
    if (!canvas) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seedScene() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    var n = Math.min(reduced ? 30 : 95, Math.floor((w * h) / 11000));
    particles = [];
    stars = [];
    comets = [];
    for (var i = 0; i < n; i++) {
      var angle = Math.random() * Math.PI * 2;
      var dist = Math.random() * Math.max(w, h) * 0.58;
      particles.push({
        angle: angle,
        dist: dist,
        speed: 0.0009 + Math.random() * 0.0028,
        r: Math.random() * 2.4 + 0.35,
        hue: Math.random() * 40,
        trail: 0.12 + Math.random() * 0.4,
      });
    }
    var starCount = Math.min(reduced ? 40 : 140, Math.floor((w * h) / 9000));
    for (var s = 0; s < starCount; s++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.4 + 0.2,
        twinkle: Math.random() * Math.PI * 2,
        speed: 0.002 + Math.random() * 0.006,
      });
    }
    if (!reduced) {
      for (var c = 0; c < 4; c++) {
        comets.push({
          x: Math.random() * w,
          y: Math.random() * h * 0.5,
          vx: 1.2 + Math.random() * 2.4,
          vy: 0.4 + Math.random() * 0.8,
          len: 40 + Math.random() * 90,
          life: Math.random(),
        });
      }
    }
    arcs = [];
    for (var j = 0; j < (reduced ? 2 : 6); j++) {
      arcs.push({
        radius: 70 + j * 48 + Math.random() * 24,
        speed: (j % 2 ? 1 : -1) * (0.0005 + j * 0.00028),
        width: 0.8 + j * 0.32,
        offset: Math.random() * Math.PI * 2,
      });
    }
  }

  function drawHexGrid(cx, cy, rgb, t) {
    if (reduced) return;
    var size = 26;
    var rows = Math.ceil(window.innerHeight / (size * 1.5)) + 2;
    var cols = Math.ceil(window.innerWidth / (size * 1.732)) + 2;
    ctx.strokeStyle = "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + (0.03 + displayProgress * 0.05) + ")";
    ctx.lineWidth = 0.6;
    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        var x = col * size * 1.732 + (row % 2 ? size * 0.866 : 0) + ((t * 0.008) % (size * 1.732));
        var y = row * size * 1.5 + ((t * 0.006) % (size * 1.5));
        var dx = x - cx;
        var dy = y - cy;
        var fade = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / (Math.max(window.innerWidth, window.innerHeight) * 0.55));
        if (fade < 0.05) continue;
        ctx.globalAlpha = fade * 0.35;
        ctx.beginPath();
        for (var k = 0; k < 6; k++) {
          var a = Math.PI / 3 * k + Math.PI / 6;
          var px = x + Math.cos(a) * size * 0.55;
          var py = y + Math.sin(a) * size * 0.55;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawFrame(t) {
    if (!ctx || !canvas || exiting) return;
    if (!particlesEnabled()) {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      return;
    }
    var w = window.innerWidth;
    var h = window.innerHeight;
    var cx = w * 0.5;
    var cy = h * 0.42;
    var rgb = getAccentRgb();
    pulse = (Math.sin(t * 0.002) + 1) * 0.5;
    ctx.clearRect(0, 0, w, h);
    var bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.68);
    bg.addColorStop(0, "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + (0.1 + pulse * 0.07 + displayProgress * 0.06) + ")");
    bg.addColorStop(0.42, "rgba(15, 10, 35, 0.38)");
    bg.addColorStop(1, "rgba(3, 3, 10, 0.94)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    drawHexGrid(cx, cy, rgb, t);
    stars.forEach(function (star) {
      star.twinkle += star.speed;
      var a = 0.15 + (Math.sin(star.twinkle) + 1) * 0.22;
      ctx.beginPath();
      ctx.fillStyle = "rgba(255,255,255," + a + ")";
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    });
    arcs.forEach(function (a, idx) {
      a.offset += a.speed * (1 + displayProgress * 0.85);
      ctx.beginPath();
      ctx.strokeStyle = "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + (0.1 + idx * 0.035 + pulse * 0.09) + ")";
      ctx.lineWidth = a.width;
      ctx.arc(cx, cy, a.radius + pulse * 8, a.offset, a.offset + Math.PI * 1.28);
      ctx.stroke();
    });
    comets.forEach(function (comet) {
      comet.x += comet.vx;
      comet.y += comet.vy;
      comet.life += 0.004;
      if (comet.x > w + 120 || comet.y > h + 80) {
        comet.x = -80 - Math.random() * 120;
        comet.y = Math.random() * h * 0.45;
        comet.life = 0;
      }
      var alpha = 0.15 + Math.sin(comet.life * Math.PI) * 0.35;
      ctx.beginPath();
      ctx.strokeStyle = "rgba(180,220,255," + alpha + ")";
      ctx.lineWidth = 1.5;
      ctx.moveTo(comet.x, comet.y);
      ctx.lineTo(comet.x - comet.len, comet.y - comet.len * 0.35);
      ctx.stroke();
    });
    particles.forEach(function (p) {
      p.angle += p.speed * (1.3 + displayProgress * 3.2);
      p.dist *= 0.9994;
      if (p.dist < 36) p.dist = Math.max(w, h) * 0.48 * Math.random();
      var x = cx + Math.cos(p.angle) * p.dist;
      var y = cy + Math.sin(p.angle) * p.dist * 0.72;
      var tx = cx + Math.cos(p.angle - p.trail) * (p.dist + 22);
      var ty = cy + Math.sin(p.angle - p.trail) * (p.dist + 22) * 0.72;
      ctx.beginPath();
      ctx.strokeStyle = "hsla(" + p.hue + ", 92%, 68%, " + (0.12 + displayProgress * 0.42) + ")";
      ctx.lineWidth = p.r * 0.65;
      ctx.moveTo(tx, ty);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.fillStyle = "hsla(" + p.hue + ", 96%, 72%, " + (0.4 + pulse * 0.3) + ")";
      ctx.arc(x, y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    if (displayProgress > 0.72) {
      var burst = (displayProgress - 0.72) / 0.28;
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.38 * burst);
      g.addColorStop(0, "rgba(255,255,255," + burst * 0.14 + ")");
      g.addColorStop(0.35, "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + burst * 0.22 + ")");
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  }

  function tickAnim() {
    if (skipped || exiting) return;
    displayProgress += (targetProgress - displayProgress) * 0.11;
    if (targetProgress - displayProgress < 0.001) displayProgress = targetProgress;
    setBar(displayProgress);
    drawFrame(performance.now());
    if (allDone() && displayProgress > 0.995 && !ready) {
      markReady();
    }
    animRaf = requestAnimationFrame(tickAnim);
  }

  function markReady() {
    if (ready || exiting || skipped) return;
    ready = true;
    loader.classList.add("loader--ready");
    loader.setAttribute("aria-busy", "false");
    setBar(1);
    if (status) status.textContent = "Ready";
    if (enterBtn) {
      enterBtn.hidden = false;
      enterBtn.disabled = false;
      enterBtn.focus();
    }
  }

  function showVersionGate() {
    if (!versionGate) {
      revealSite();
      return;
    }
    versionGate.hidden = false;
    requestAnimationFrame(function () {
      versionGate.classList.add("version-gate--visible");
      if (versionOriginal) versionOriginal.focus();
    });
  }

  function chooseOriginal() {
    if (!versionGate) {
      revealSite();
      return;
    }
    versionGate.classList.remove("version-gate--visible");
    setTimeout(function () {
      versionGate.hidden = true;
      revealSite();
    }, 280);
  }

  function chooseCine() {
    window.location.href = "/cine-cloud/";
  }

  function revealSite() {
    document.documentElement.classList.remove("loader-lock");
    if (site) {
      site.hidden = false;
      if (!reduced) site.classList.add("site--enter");
    }
    window.dispatchEvent(new CustomEvent("zentra-boot-complete"));
  }

  function removeLoader() {
    cancelAnimationFrame(raf);
    cancelAnimationFrame(animRaf);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("kritikal-settings", syncLoaderCanvas);
    if (loader) loader.remove();
  }

  function beginExit() {
    if (exiting || !loader) return;
    if (!ready && !skipped) return;
    exiting = true;
    setBar(1);
    if (status && !ready) status.textContent = "Ready";
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

  function onResize() {
    resizeCanvas();
    seedScene();
  }

  function skip() {
    if (skipped || exiting) return;
    skipped = true;
    exiting = true;
    revealSite();
    removeLoader();
  }

  function notifyReady() {
    setStep("finalize", { done: true, label: "Ready" });
  }

  window.ZentraLoader = {
    setStep: setStep,
    notifyReady: notifyReady,
    skip: skip,
  };

  function boot() {
    if (!loader || document.documentElement.classList.contains("cloak-full")) {
      skip();
      return;
    }
    setStep("core", { done: true });
    setStep("modules", { partial: 0.35 });
    refreshUI();
    resizeCanvas();
    seedScene();
    syncLoaderCanvas();
    window.addEventListener("resize", onResize);
    window.addEventListener("kritikal-settings", syncLoaderCanvas);
    renderSteps();
    animRaf = requestAnimationFrame(tickAnim);
    if (enterBtn) {
      enterBtn.hidden = true;
      enterBtn.disabled = true;
      enterBtn.addEventListener("click", beginExit);
    }
    if (versionOriginal) versionOriginal.addEventListener("click", chooseOriginal);
    if (versionCine) versionCine.addEventListener("click", chooseCine);
    document.addEventListener("keydown", function (e) {
      if (!ready || exiting) return;
      if (e.key === "Enter") {
        e.preventDefault();
        beginExit();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
