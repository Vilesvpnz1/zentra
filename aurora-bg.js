(function () {
  var canvas = document.getElementById("site-aurora-canvas");
  var site = document.getElementById("site");
  var ctx = null;
  var raf = 0;
  var mx = 0;
  var my = 0;
  var smx = 0;
  var smy = 0;
  var blobs = [];
  var stars = [];
  var ripples = [];
  var t0 = 0;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function hexToRgb(hex) {
    if (!hex) return { r: 183, g: 148, b: 255 };
    hex = hex.trim();
    if (hex.charAt(0) === "#") hex = hex.slice(1);
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (hex.length < 6) return { r: 183, g: 148, b: 255 };
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }

  function themeColors() {
    var root = getComputedStyle(document.documentElement);
    return {
      a: hexToRgb(root.getPropertyValue("--accent")),
      b: hexToRgb(root.getPropertyValue("--accent-cool")),
      c: hexToRgb(root.getPropertyValue("--accent-hot")),
    };
  }

  function enabled() {
    if (!canvas || !site || site.hidden || document.hidden) return false;
    if (document.body.classList.contains("fx-no-matrix")) return false;
    var S = window.KobranSettings;
    if (S && S.get("matrixGrid") === false) return false;
    return true;
  }

  function seed() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    blobs = [
      { x: w * 0.18, y: h * 0.22, r: Math.min(w, h) * 0.34, vx: 0.22, vy: 0.16, ph: 0 },
      { x: w * 0.78, y: h * 0.28, r: Math.min(w, h) * 0.28, vx: -0.18, vy: 0.2, ph: 1.4 },
      { x: w * 0.52, y: h * 0.72, r: Math.min(w, h) * 0.32, vx: 0.14, vy: -0.17, ph: 2.8 },
      { x: w * 0.82, y: h * 0.78, r: Math.min(w, h) * 0.24, vx: -0.12, vy: -0.14, ph: 4.1 },
    ];
    stars = [];
    var count = reduced ? 24 : Math.min(70, Math.floor((w * h) / 22000));
    for (var i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.3 + 0.25,
        tw: Math.random() * Math.PI * 2,
        sp: 0.003 + Math.random() * 0.008,
      });
    }
  }

  function resize() {
    if (!canvas) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx = canvas.getContext("2d", { alpha: true });
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function drawBlob(x, y, radius, rgb, alpha) {
    if (!ctx) return;
    var g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + alpha + ")");
    g.addColorStop(0.45, "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + (alpha * 0.35) + ")");
    g.addColorStop(1, "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + ",0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function frame(now) {
    raf = 0;
    if (!enabled() || !ctx) {
      if (canvas) canvas.style.display = "none";
      return;
    }
    canvas.style.display = "block";
    var w = window.innerWidth;
    var h = window.innerHeight;
    var t = (now - t0) * 0.001;
    var colors = themeColors();
    smx += (mx - smx) * 0.08;
    smy += (my - smy) * 0.08;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(3, 3, 10, 0.15)";
    ctx.fillRect(0, 0, w, h);

    stars.forEach(function (star) {
      star.tw += star.sp;
      var a = 0.12 + (Math.sin(star.tw) + 1) * 0.2;
      ctx.beginPath();
      ctx.fillStyle = "rgba(255,255,255," + a + ")";
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    });

    blobs.forEach(function (blob, i) {
      var pullX = (smx - blob.x) * 0.045;
      var pullY = (smy - blob.y) * 0.045;
      blob.x += blob.vx + pullX + Math.sin(t * 0.55 + blob.ph) * 0.35;
      blob.y += blob.vy + pullY + Math.cos(t * 0.48 + blob.ph) * 0.32;
      if (blob.x < -blob.r * 0.4) blob.x = w + blob.r * 0.2;
      if (blob.x > w + blob.r * 0.4) blob.x = -blob.r * 0.2;
      if (blob.y < -blob.r * 0.4) blob.y = h + blob.r * 0.2;
      if (blob.y > h + blob.r * 0.4) blob.y = -blob.r * 0.2;
      var rgb = i % 3 === 0 ? colors.a : i % 3 === 1 ? colors.b : colors.c;
      drawBlob(blob.x, blob.y, blob.r * (1 + Math.sin(t + blob.ph) * 0.08), rgb, 0.22 + Math.sin(t * 0.7 + blob.ph) * 0.06);
    });

    var spotR = Math.min(w, h) * (0.22 + Math.sin(t * 1.4) * 0.03);
    var spot = ctx.createRadialGradient(smx, smy, 0, smx, smy, spotR);
    spot.addColorStop(0, "rgba(" + colors.b.r + "," + colors.b.g + "," + colors.b.b + ",0.18)");
    spot.addColorStop(0.35, "rgba(" + colors.a.r + "," + colors.a.g + "," + colors.a.b + ",0.1)");
    spot.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = spot;
    ctx.fillRect(0, 0, w, h);

    ripples = ripples.filter(function (rip) {
      rip.age += 0.016;
      if (rip.age > 1.6) return false;
      var prog = rip.age / 1.6;
      var rr = rip.r + prog * Math.min(w, h) * 0.28;
      var alpha = (1 - prog) * 0.22;
      ctx.beginPath();
      ctx.strokeStyle = "rgba(" + colors.a.r + "," + colors.a.g + "," + colors.a.b + "," + alpha + ")";
      ctx.lineWidth = 2 - prog;
      ctx.arc(rip.x, rip.y, rr, 0, Math.PI * 2);
      ctx.stroke();
      return true;
    });

    if (!reduced) {
      ctx.globalCompositeOperation = "lighter";
      for (var band = 0; band < 3; band++) {
        var y = ((t * (28 + band * 8) + band * 120) % (h + 200)) - 100;
        var grad = ctx.createLinearGradient(0, y, w, y + 140);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(0.5, "rgba(" + colors.c.r + "," + colors.c.g + "," + colors.c.b + ",0.035)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, y - 70, w, 140);
      }
      ctx.globalCompositeOperation = "source-over";
    }

    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (!enabled()) {
      if (canvas) canvas.style.display = "none";
      stop();
      return;
    }
    if (!t0) t0 = performance.now();
    resize();
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function stop() {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  function sync() {
    if (enabled()) start();
    else {
      stop();
      if (canvas) canvas.style.display = "none";
    }
  }

  document.addEventListener("mousemove", function (e) {
    mx = e.clientX;
    my = e.clientY;
    if (enabled() && !raf) start();
  });

  document.addEventListener("click", function (e) {
    if (!enabled()) return;
    if (e.target.closest(".site__nav-link, button, a, input, select, textarea, .site__card")) return;
    ripples.push({ x: e.clientX, y: e.clientY, r: 8, age: 0 });
    if (ripples.length > 6) ripples.shift();
  });

  window.addEventListener("resize", function () {
    if (enabled()) resize();
  });

  window.addEventListener("kobran-settings", sync);

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else sync();
  });

  window.addEventListener("kobran-boot-complete", function () {
    t0 = performance.now();
    sync();
  });

  if (site) {
    var obs = new MutationObserver(sync);
    obs.observe(site, { attributes: true, attributeFilter: ["hidden"] });
  }

  window.KobranAuroraBg = { sync: sync };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sync);
  } else {
    sync();
  }
})();
