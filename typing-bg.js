window.KritikalTypingBg = (function () {
  var canvas = null;
  var ctx = null;
  var raf = 0;
  var running = false;
  var columns = [];
  var lastTick = 0;

  var lines = [
    "> ssh -o StrictHostKeyChecking=no root@gateway",
    "$ nmap -sS -Pn 10.0.0.0/24",
    "[OK] proxy tunnel established",
    "[OK] dns leak protection active",
    "decrypting payload stream...",
    "injecting game module into memory",
    "bypassing content filter [████████░░] 82%",
    "wget -q --no-check-certificate ./payload.bin",
    "iptables -A FORWARD -j ACCEPT",
    "tor: built circuit 3-hop complete",
    "openssl s_client -connect host:443",
    "root@kritikal:~# ./stealth.sh --quiet",
    "export HTTP_PROXY=socks5://127.0.0.1:9050",
    "hashing session token sha256...",
    "systemctl stop logging.service",
    "ping -c 1 8.8.8.8 && echo route clear",
    "stealth_module: cloak active",
    "firewall: all ports stealthed",
    "index: payloads mounted",
    "chmod +x ./enter.sh && ./enter.sh",
    "cat /etc/shadow | head -1",
    "tcpdump -i eth0 -n port 443",
    "mount -o loop game.img /mnt/play",
  ];

  var speedMap = { slow: 70, medium: 32, fast: 14 };
  var intensityMap = { low: 0.28, medium: 0.48, high: 0.72 };

  function pickLine() {
    return lines[Math.floor(Math.random() * lines.length)];
  }

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
    var accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#00ff41";
    if (accent.charAt(0) === "#" && accent.length >= 7) {
      return {
        r: parseInt(accent.slice(1, 3), 16),
        g: parseInt(accent.slice(3, 5), 16),
        b: parseInt(accent.slice(5, 7), 16),
      };
    }
    return { r: 0, g: 255, b: 65 };
  }

  function initColumns() {
    columns = [];
    var s = getSettings();
    var intensity = intensityMap[s.typingIntensity] || 0.48;
    var count = Math.max(5, Math.floor((window.innerWidth / 220) * intensity * 3));
    var gap = window.innerWidth / count;
    for (var i = 0; i < count; i++) {
      columns.push({
        x: gap * i + 8,
        y: Math.random() * window.innerHeight * 0.6,
        history: [],
        text: pickLine(),
        idx: 0,
        wait: Math.floor(Math.random() * 30),
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
    initColumns();
  }

  function tick(now) {
    if (!running || !ctx || !canvas) return;
    if (!shouldRun() || document.hidden) {
      stop();
      return;
    }
    var s = getSettings();
    var interval = speedMap[s.typingSpeed] || 32;
    if (now - lastTick < interval) {
      raf = requestAnimationFrame(tick);
      return;
    }
    lastTick = now;
    var rgb = getAccentRgb();
    var baseAlpha = (s.typingOpacity / 100) * 0.9;
    var lineH = 15;
    var blink = Math.floor(now / 480) % 2 === 0;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.font = '11px "JetBrains Mono", Consolas, monospace';
    columns.forEach(function (col, ci) {
      if (col.wait > 0) {
        col.wait -= 1;
      } else {
        col.idx += 1;
        if (col.idx >= col.text.length + 12) {
          col.history.unshift(col.text);
          if (col.history.length > 14) col.history.pop();
          col.text = pickLine();
          col.idx = 0;
          col.y += lineH;
          col.wait = 6 + Math.floor(Math.random() * 18);
          if (col.y > window.innerHeight - 40) {
            col.y = 40 + Math.random() * 80;
            col.history = [];
          }
        }
      }
      var drawY = col.y;
      col.history.forEach(function (line, hi) {
        var fade = Math.max(0.08, 0.55 - hi * 0.04);
        ctx.fillStyle = "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + (baseAlpha * fade) + ")";
        ctx.fillText(line, col.x, drawY - (hi + 1) * lineH);
      });
      var partial = col.text.slice(0, Math.min(col.idx, col.text.length));
      var cursor = col.idx < col.text.length && blink ? "_" : "";
      ctx.fillStyle = "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + baseAlpha + ")";
      ctx.fillText(partial + cursor, col.x, drawY);
    });
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
