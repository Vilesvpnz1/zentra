const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const ROOT = __dirname;
const GAMES_PATH = path.join(ROOT, "games.json");
const THUMBS_DIR = path.join(ROOT, "assets", "thumbs");
const BLOX_DIR = path.join(ROOT, "kritikal-ubg-main");
const BLOX_PREFIX = "kritikal-ubg-main/";
const CATALOG_PATH = path.join(BLOX_DIR, "games", "games.json");
const TIMEOUT_MS = 8000;

function slugId(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "game";
}

function uniqueGameId(base, ids) {
  let id = slugId(base);
  if (!ids.has(id)) return id;
  let n = 2;
  while (ids.has(id + n)) n++;
  return id + n;
}

function buildSearch(game) {
  return [game.id, game.title, game.file, game.path]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function viewFromUrl(url) {
  const m = String(url || "").match(/[?&]view=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

function localIndexFromView(view) {
  const v = String(view || "").replace(/^\/+/, "");
  if (!v) return "";
  return BLOX_PREFIX + v.replace(/\/+$/, "") + "/index.html";
}

function titleFromHtml(html, fallback) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (m) {
    const t = m[1]
      .replace(/\|.*$/, "")
      .replace(/Kritikal\s*ubg\s*-?\s*/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    if (t) return t;
  }
  return fallback;
}

function resolveImgUrl(img) {
  const raw = String(img || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return raw;
  return "/" + raw;
}

function fetchBuffer(url, redirects) {
  redirects = redirects || 0;
  if (redirects > 5) return Promise.resolve(null);
  return new Promise(function (resolve) {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(
      url,
      {
        headers: { "User-Agent": "KritikalImport/1.0", Accept: "image/*,*/*" },
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
        const chunks = [];
        res.on("data", function (c) {
          chunks.push(c);
        });
        res.on("end", function () {
          const buf = Buffer.concat(chunks);
          if (buf.length < 40) {
            resolve(null);
            return;
          }
          resolve({ buf: buf, ct: String(res.headers["content-type"] || ""), url: url });
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
  if (u.endsWith(".ico") || ct.includes("icon")) return "ico";
  return "png";
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

function makeSvg(title, id) {
  const h = hueFromId(id);
  const h2 = (h + 38) % 360;
  const label = escapeXml(String(title || id).slice(0, 20));
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

function readLocalImage(imgUrl) {
  const rel = String(imgUrl || "").replace(/^\/+/, "");
  const abs = path.join(BLOX_DIR, rel);
  if (!fs.existsSync(abs)) return null;
  try {
    const buf = fs.readFileSync(abs);
    if (buf.length < 40) return null;
    return { buf: buf, ct: "", url: abs };
  } catch (e) {
    return null;
  }
}

async function saveThumb(id, title, img) {
  if (!fs.existsSync(THUMBS_DIR)) fs.mkdirSync(THUMBS_DIR, { recursive: true });
  const imgUrl = resolveImgUrl(img);
  let hit = null;
  if (imgUrl.startsWith("http")) {
    hit = await fetchBuffer(imgUrl);
  } else if (imgUrl) {
    hit = readLocalImage(imgUrl);
  }
  if (hit && hit.buf) {
    const ext = extFromContentType(hit.ct, imgUrl || hit.url);
    const rel = "assets/thumbs/" + id + "." + ext;
    fs.writeFileSync(path.join(ROOT, rel), hit.buf);
    return rel;
  }
  const relSvg = "assets/thumbs/" + id + ".svg";
  const svgPath = path.join(ROOT, relSvg);
  if (!fs.existsSync(svgPath)) fs.writeFileSync(svgPath, makeSvg(title, id), "utf8");
  return relSvg;
}

function collectGameFileDirs() {
  const dirs = [];
  const gf = path.join(BLOX_DIR, "gameFiles");
  if (fs.existsSync(gf)) {
    fs.readdirSync(gf).forEach(function (name) {
      if (fs.existsSync(path.join(gf, name, "index.html"))) dirs.push("gameFiles/" + name);
    });
  }
  const rb = path.join(BLOX_DIR, "refined-beta");
  if (fs.existsSync(rb)) {
    fs.readdirSync(rb).forEach(function (name) {
      if (name === "index.html" || name === "landing") return;
      if (fs.existsSync(path.join(rb, name, "index.html"))) dirs.push("refined-beta/" + name);
    });
  }
  return dirs;
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  const entries = [];
  const seenPaths = new Set();
  const ids = new Set();

  catalog.forEach(function (item) {
    const view = viewFromUrl(item.url);
    if (!view.startsWith("/")) return;
    const gamePath = localIndexFromView(view);
    const abs = path.join(ROOT, gamePath);
    if (!fs.existsSync(abs)) return;
    const pathKey = gamePath.toLowerCase();
    if (seenPaths.has(pathKey)) return;
    seenPaths.add(pathKey);
    const file = gamePath.replace(BLOX_PREFIX, "");
    let html = "";
    try {
      html = fs.readFileSync(abs, "utf8");
    } catch (e) {
      return;
    }
    const title = item.name || titleFromHtml(html, path.basename(file, path.extname(file)));
    const id = uniqueGameId(title, ids);
    ids.add(id);
    entries.push({
      id: id,
      file: file,
      title: title,
      path: gamePath,
      img: item.img || "",
      search: "",
    });
  });

  collectGameFileDirs().forEach(function (relDir) {
    const gamePath = BLOX_PREFIX + relDir + "/index.html";
    const pathKey = gamePath.toLowerCase();
    if (seenPaths.has(pathKey)) return;
    seenPaths.add(pathKey);
    const abs = path.join(ROOT, gamePath);
    let html = "";
    try {
      html = fs.readFileSync(abs, "utf8");
    } catch (e) {
      return;
    }
    const fallback = relDir.split("/").pop().replace(/-/g, " ");
    const title = titleFromHtml(html, fallback);
    const id = uniqueGameId(relDir.split("/").pop(), ids);
    ids.add(id);
    entries.push({
      id: id,
      file: relDir + "/index.html",
      title: title,
      path: gamePath,
      img: "",
      search: "",
    });
  });

  let downloaded = 0;
  let svgMade = 0;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const rel = await saveThumb(e.id, e.title, e.img);
    e.image = rel;
    delete e.img;
    e.search = buildSearch(e);
    if (rel.endsWith(".svg")) svgMade++;
    else downloaded++;
  }

  entries.sort(function (a, b) {
    return a.title.localeCompare(b.title);
  });

  fs.writeFileSync(GAMES_PATH, JSON.stringify(entries, null, 2), "utf8");
  fs.writeFileSync(path.join(ROOT, "games.js"), "window.KRITIKAL_GAMES=" + JSON.stringify(entries) + ";", "utf8");

  console.log(
    JSON.stringify({
      total: entries.length,
      thumbsDownloaded: downloaded,
      thumbsSvg: svgMade,
    })
  );
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
