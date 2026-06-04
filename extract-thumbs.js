const fs = require("fs");
const path = require("path");

const offlineDir = path.join(__dirname, "Offline-HTML-Games-Pack-master", "offline");
const outDir = path.join(__dirname, "assets", "thumbs");
const gamesPath = path.join(__dirname, "games.json");

function scoreImage(src, len) {
  if (len < 600) return 0;
  if (len > 800000) return 8;
  const head = src.slice(0, 250).toLowerCase();
  if (/favicon|16x16|32x32/.test(head)) return 15;
  if (/splash|logo|cover|thumb|banner|poster|icon|apple-touch/.test(head)) return 90;
  if (/png|jpeg|jpg|webp/.test(head)) return 45 + Math.min(35, Math.floor(len / 6000));
  return 30;
}

function findBestImage(html) {
  const candidates = [];
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/gi,
    /url\(\s*["']?(data:image\/[^"')]+)["']?\s*\)/gi,
    /data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+/gi,
    /<img[^>]+src=["']([^"']+)["']/gi,
    /<link[^>]+rel=["'][^"']*(?:icon|apple-touch-icon)[^"']*["'][^>]*href=["']([^"']+)["']/gi,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*(?:icon|apple-touch-icon)/gi,
  ];

  for (const re of patterns) {
    let m;
    let n = 0;
    while ((m = re.exec(html)) !== null && n < 80) {
      n++;
      const src = m[1] || m[0];
      if (!src || src.length < 50) continue;
      const len = src.length;
      let s = scoreImage(src, len);
      if (src.startsWith("data:")) s += 5;
      if (/\.(png|jpg|jpeg|webp|gif)(\?|$)/i.test(src)) s += 10;
      candidates.push({ src, score: s });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] || null;
}

function extFromDataUri(src) {
  const m = src.match(/^data:image\/(png|jpeg|jpg|webp|gif)/i);
  if (!m) return "png";
  const t = m[1].toLowerCase();
  return t === "jpeg" || t === "jpg" ? "jpg" : t;
}

function saveDataUri(src, outPath) {
  const m = src.match(/^data:image\/[^;]+;base64,(.+)$/);
  if (!m) return false;
  fs.writeFileSync(outPath, Buffer.from(m[1], "base64"));
  return true;
}

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const games = JSON.parse(fs.readFileSync(gamesPath, "utf8"));
let saved = 0;

for (const game of games) {
  if (game.image && game.image.startsWith("assets/") && fs.existsSync(path.join(__dirname, game.image))) {
    continue;
  }

  const htmlPath = path.join(offlineDir, game.file);
  if (!fs.existsSync(htmlPath)) continue;

  const stat = fs.statSync(htmlPath);
  const chunk = 6 * 1024 * 1024;
  let html = "";
  if (stat.size <= chunk * 2) {
    html = fs.readFileSync(htmlPath, "utf8");
  } else {
    const fd = fs.openSync(htmlPath, "r");
    const head = Buffer.alloc(chunk);
    const tail = Buffer.alloc(chunk);
    fs.readSync(fd, head, 0, chunk, 0);
    fs.readSync(fd, tail, 0, chunk, stat.size - chunk);
    fs.closeSync(fd);
    html = head.toString("utf8") + tail.toString("utf8");
  }

  const best = findBestImage(html);
  if (!best || best.score < 25) continue;

  let src = best.src;
  if (src.startsWith("data:")) {
    const ext = extFromDataUri(src);
    const rel = "assets/thumbs/" + game.id + "." + ext;
    if (saveDataUri(src, path.join(__dirname, rel))) {
      game.image = rel;
      saved++;
    }
  } else if (!src.includes("://") && !src.startsWith("/")) {
    const relPath = path.join(offlineDir, src.split("?")[0]);
    if (fs.existsSync(relPath)) {
      const ext = path.extname(relPath) || ".png";
      const rel = "assets/thumbs/" + game.id + ext;
      fs.copyFileSync(relPath, path.join(__dirname, rel));
      game.image = rel;
      saved++;
    }
  }
}

fs.writeFileSync(gamesPath, JSON.stringify(games));
fs.writeFileSync(path.join(__dirname, "games.js"), "window.KRITIKAL_GAMES=" + JSON.stringify(games) + ";");
const total = games.filter((g) => g.image && g.image.startsWith("assets/")).length;
console.log("new saved", saved, "total local", total);
