window.KritikalTypingBg = (function () {
  var canvas = null;
  var ctx = null;
  var raf = 0;
  var running = false;
  var orbits = [];
  var stars = [];
  var lastTick = 0;

  var speedMap = { slow: 0.003, medium: 0.006, fast: 0.012 };
  var intensityMap = { low: 3, medium: 5, high: 8 };

  function getSettings() {
    var S = window.KritikalSettings;
    if (!S) {
      return { typingBg: true, typingSpeed: "medium", typingIntensity: "medium", typingOpacity: 45 };
    }
    return {
      typingBg: S.get("typingBg"),
      typingSpeed: S.get("typingSpeed"),
      typingIntensity: S.get("typingIntensity"),
      typingOpacity: S.get("typingOpacity"),
    };
  }

  function shouldRun() {
    var s = getSettings();
    if (!s.typingBg) return false;
    if (document.body.classList.contains("fx-no-typing")) return false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    return true;
  }

  function getAccentRgb() {
    var accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#8b5cf6";
    if (accent.charAt(0) === "#" && accent.length >= 7) {
      return {
        r: parseInt(accent.slice(1, 3), 16),
        g: parseInt(accent.slice(3, 5), 16),
        b: parseInt(accent.slice(5, 7), 16),
      };
    }
    return { r: 139, g: 92, b: 246 };
  }

  function initScene() {
    orbits = [];
    stars = [];
    var s = getSettings();
    var count = intensityMap[s.typingIntensity] || 5;
    var cx = window.innerWidth * 0.5;
    var cy = window.innerHeight * 0.45;
    for (var i = 0; i < count; i++) {
      orbits.push({
        cx: cx + (Math.random() - 0.5) * window.innerWidth * 0.4,
        cy: cy + (Math.random() - 0.5) * window.innerHeight * 0.3,
        rx: 60 + Math.random() * (120 + i * 40),
        ry: 20 + Math.random() * (40 + i * 12),
        angle: Math.random() * Math.PI * 2,
        speed: (0.4 + Math.random() * 0.6) * (i % 2 === 0 ? 1 : -1),
        dot: Math.random() * Math.PI * 2,
        dots: 1 + Math.floor(Math.random() * 2),
      });
    }
    var starCount = Math.floor((window.innerWidth * window.innerHeight) / 12000);
    for (var j = 0; j < starCount; j++) {
      stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.2 + 0.2,
        tw: Math.random() * Math.PI * 2,
      });
    }
  }

  function resize() {
    if (!canvas) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initScene();
  }

  function drawOrbit(o, rgb, alpha, speed) {
    ctx.save();
    ctx.translate(o.cx, o.cy);
    ctx.rotate(o.angle);
    ctx.strokeStyle = "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + (alpha * 0.35) + ")";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, o.rx, o.ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (var d = 0; d < o.dots; d++) {
      var t = o.dot + d * (Math.PI * 2 / Math.max(1, o.dots));
      var px = Math.cos(t) * o.rx;
      var py = Math.sin(t) * o.ry;
      ctx.beginPath();
      ctx.fillStyle = "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + alpha + ")";
      ctx.arc(px, py, 2 + d * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 8;
      ctx.shadowColor = "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + ",0.6)";
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
    o.angle += speed * o.speed * 0.015;
    o.dot += speed * 1.8;
  }

  function tick(now) {
    if (!running || !ctx || !canvas) return;
    if (!shouldRun() || document.hidden) {
      stop();
      return;
    }
    var s = getSettings();
    var speed = speedMap[s.typingSpeed] || 0.006;
    var baseAlpha = (s.typingOpacity / 100) * 0.85;
    var rgb = getAccentRgb();
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    stars.forEach(function (st) {
      st.tw += 0.02;
      var a = baseAlpha * (0.3 + Math.sin(st.tw) * 0.15);
      ctx.beginPath();
      ctx.fillStyle = "rgba(255,255,255," + a + ")";
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fill();
    });
    orbits.forEach(function (o) {
      drawOrbit(o, rgb, baseAlpha, speed);
    });
    lastTick = now;
    raf = requestAnimationFrame(tick);
  }

  function start() {
    canvas = document.getElementById("typing-bg");
    if (!canvas) return;
    if (!shouldRun()) {
      canvas.style.display = "none";
      return;
    }
    canvas.style.display = "block";
    running = true;
    resize();
    lastTick = 0;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", onResize);
  }

  function onResize() {
    resize();
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize);
    if (canvas && ctx) ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    if (canvas) canvas.style.display = "none";
  }

  function refresh() {
    stop();
    if (shouldRun()) start();
  }

  window.addEventListener("kritikal-settings", refresh);

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else if (shouldRun()) start();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  return { start: start, stop: stop, refresh: refresh };
})();
