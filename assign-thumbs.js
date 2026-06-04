const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const ROOT = __dirname;
const GAMES_PATH = path.join(ROOT, "games.json");
const OUT_DIR = path.join(ROOT, "assets", "thumbs");
const UBG98_DIR = path.join(ROOT, "ubg98.github.io-gh-pages");
const OFFLINE_DIR = path.join(ROOT, "Offline-HTML-Games-Pack-master", "offline");
const TIMEOUT_MS = 4500;

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function slugFromPath(gamePath) {
  if (!/^https?:\/\//i.test(gamePath)) return "";
  const u = String(gamePath).replace(/\/+$/, "");
  return u.slice(u.lastIndexOf("/") + 1);
}

function hueFromId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

function escapeXml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function labelFromTitle(title, id) {
  const t = String(title || id || "Game").trim();
  return t.length > 22 ? t.slice(0, 20) + "…" : t;
}

function makeSvg(title, id) {
  const h = hueFromId(id);
  const h2 = (h + 38) % 360;
  const label = escapeXml(labelFromTitle(title, id));
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0%" stop-color="hsl(' +
    h +
    ',72%,48%)"/>' +
    '<stop offset="100%" stop-color="hsl(' +
    h2 +
    ',72%,32%)"/>' +
    "</linearGradient></defs>" +
    '<rect width="400" height="300" rx="18" fill="url(#g)"/>' +
    '<text x="200" y="158" fill="#fff" font-family="Segoe UI,Arial,sans-serif" font-size="28" font-weight="700" text-anchor="middle">' +
    label +
    "</text></svg>"
  );
}

function fetchBuffer(url, redirects) {
  redirects = redirects || 0;
  if (redirects > 4) return Promise.resolve(null);
  return new Promise(function (resolve) {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(
      url,
      {
        headers: { "User-Agent": "KritikalThumbBot/1.0", Accept: "image/*,*/*" },
        timeout: TIMEOUT_MS,
      },
      function (res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const next = res.headers.location.startsWith("http")
            ? res.headers.location
            : new URL(res.headers.location, url).href;
          res.resume();
          resolve(fetchBuffer(next, redirects + 1));
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          resolve(null);
          return;
        }
        const ct = String(res.headers["content-type"] || "");
        if (ct.includes("text/html") && !ct.includes("svg")) {
          res.resume();
          resolve(null);
          return;
        }
        const chunks = [];
        res.on("data", function (c) {
          chunks.push(c);
        });
        res.on("end", function () {
          const buf = Buffer.concat(chunks);
          if (buf.length < 80) {
            resolve(null);
            return;
          }
          resolve({ buf: buf, ct: ct, url: url });
        });
      }
    );
    req.on("error", function () {
      resolve(null);
    });
    req.on("timeout", function () {
      req.destroy();
      resolve(null);
    });
  });
}

function extFromContentType(ct, url) {
  const u = String(url || "").toLowerCase();
  if (u.endsWith(".png") || ct.includes("png")) return "png";
  if (u.endsWith(".jpg") || u.endsWith(".jpeg") || ct.includes("jpeg")) return "jpg";
  if (u.endsWith(".webp") || ct.includes("webp")) return "webp";
  if (u.endsWith(".gif") || ct.includes("gif")) return "gif";
  if (u.endsWith(".svg") || ct.includes("svg")) return "svg";
  if (u.endsWith(".ico") || ct.includes("icon") || ct.includes("octet-stream")) return "ico";
  return "png";
}

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
    /data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+/gi,
    /<img[^>]+src=["']([^"']+)["']/gi,
  ];
  for (let p = 0; p < patterns.length; p++) {
    const re = patterns[p];
    let m;
    let n = 0;
    while ((m = re.exec(html)) !== null && n < 40) {
      n++;
      const src = m[1] || m[0];
      if (!src || src.length < 50) continue;
      candidates.push({ src: src, score: scoreImage(src, src.length) });
    }
  }
  candidates.sort(function (a, b) {
    return b.score - a.score;
  });
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

function buildThumbIndex(games) {
  const map = new Map();
  games.forEach(function (g) {
    if (!g.image || !g.image.startsWith("assets/")) return;
    map.set(norm(g.id), g.image);
    const base = path.basename(g.image).replace(/\.[^.]+$/i, "");
    map.set(norm(base), g.image);
  });
  if (fs.existsSync(OUT_DIR)) {
    fs.readdirSync(OUT_DIR).forEach(function (f) {
      map.set(norm(f.replace(/\.[^.]+$/i, "")), "assets/thumbs/" + f);
    });
  }
  return map;
}

function remoteCandidates(game) {
  const list = [];
  if (!/^https?:\/\//i.test(game.path)) return list;
  const base = String(game.path).replace(/\/+$/, "") + "/";
  list.push(base + "favicon.ico");
  list.push(base + "icon.png");
  list.push(base + "splash.png");
  list.push(base + "logo.png");
  return [...new Set(list)];
}

async function firstHit(urls) {
  const results = await Promise.all(
    urls.map(function (url) {
      return fetchBuffer(url).then(function (hit) {
        return hit ? { hit: hit, url: url } : null;
      });
    })
  );
  for (let i = 0; i < results.length; i++) {
    if (results[i]) return results[i];
  }
  return null;
}

async function assignThumbs() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const games = JSON.parse(fs.readFileSync(GAMES_PATH, "utf8"));
  const index = buildThumbIndex(games);
  let borrowed = 0;
  let downloaded = 0;
  let extracted = 0;
  let svgMade = 0;

  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    if (game.image && game.image.startsWith("assets/") && fs.existsSync(path.join(ROOT, game.image))) {
      continue;
    }

    const slug = slugFromPath(game.path);
    const keys = [norm(game.id), norm(slug), norm(String(game.file || "").replace(/\.html?$/i, ""))];
    let borrowedPath = "";
    for (let k = 0; k < keys.length; k++) {
      if (keys[k] && index.has(keys[k])) {
        borrowedPath = index.get(keys[k]);
        break;
      }
    }
    if (borrowedPath && fs.existsSync(path.join(ROOT, borrowedPath))) {
      game.image = borrowedPath;
      borrowed++;
      continue;
    }

    if (/^https?:\/\//i.test(game.path)) {
      const got = await firstHit(remoteCandidates(game));
      if (got && got.hit) {
        const ext = extFromContentType(got.hit.ct, got.url);
        const rel = "assets/thumbs/" + game.id + "." + ext;
        fs.writeFileSync(path.join(ROOT, rel), got.hit.buf);
        game.image = rel;
        index.set(norm(game.id), rel);
        downloaded++;
        continue;
      }
    }

    const localHtml = game.file
      ? fs.existsSync(path.join(OFFLINE_DIR, game.file))
        ? path.join(OFFLINE_DIR, game.file)
        : fs.existsSync(path.join(UBG98_DIR, game.file))
          ? path.join(UBG98_DIR, game.file)
          : null
      : null;
    if (localHtml) {
      const html = fs.readFileSync(localHtml, "utf8");
      const best = findBestImage(html);
      if (best && best.score >= 25 && best.src.startsWith("data:")) {
        const ext = extFromDataUri(best.src);
        const rel = "assets/thumbs/" + game.id + "." + ext;
        if (saveDataUri(best.src, path.join(ROOT, rel))) {
          game.image = rel;
          index.set(norm(game.id), rel);
          extracted++;
          continue;
        }
      }
    }

    const relSvg = "assets/thumbs/" + game.id + ".svg";
    const svgPath = path.join(ROOT, relSvg);
    if (!fs.existsSync(svgPath)) {
      fs.writeFileSync(svgPath, makeSvg(game.title, game.id), "utf8");
    }
    game.image = relSvg;
    index.set(norm(game.id), relSvg);
    svgMade++;
  }

  games.sort(function (a, b) {
    return a.title.localeCompare(b.title);
  });
  fs.writeFileSync(GAMES_PATH, JSON.stringify(games, null, 2), "utf8");
  fs.writeFileSync(
    path.join(ROOT, "games.js"),
    "window.KRITIKAL_GAMES=" + JSON.stringify(games) + ";",
    "utf8"
  );

  const withLocal = games.filter(function (g) {
    return g.image && g.image.startsWith("assets/") && fs.existsSync(path.join(ROOT, g.image));
  }).length;
  console.log(
    JSON.stringify({
      borrowed: borrowed,
      downloaded: downloaded,
      extracted: extracted,
      svgMade: svgMade,
      withLocal: withLocal,
      total: games.length,
    })
  );
}

assignThumbs().catch(function (err) {
  console.error(err);
  process.exit(1);
});
