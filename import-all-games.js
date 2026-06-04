const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const GAMES_PATH = path.join(ROOT, "games.json");
const UBG98_DIR = path.join(ROOT, "ubg98.github.io-gh-pages");
const OFFLINE_DIR = path.join(ROOT, "Offline-HTML-Games-Pack-master", "offline");
const UBG98_INDEX = path.join(UBG98_DIR, "assets", "js", "games.json");
const OFFLINE_PREFIX = "Offline-HTML-Games-Pack-master/offline/";
const UBG98_PREFIX = "ubg98.github.io-gh-pages/";

function normKey(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/[^a-z0-9]/g, "")
    .replace(/ubg98|ubg44|ubg89|ubg17/g, "")
    .replace(/unblockedz?/g, "");
}

function slugId(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "game";
}

function buildSearch(game) {
  return [game.id, game.title, game.file, game.path]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function cleanTitle(raw) {
  return String(raw || "")
    .replace(/\s*-\s*ubg\d+/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleFromHtml(html, fallback) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (m) {
    const t = cleanTitle(m[1].replace(/\|.*$/, "").replace(/unblocked/gi, "").trim());
    if (t) return t;
  }
  return fallback;
}

function extractIframeSrc(html) {
  const m1 = html.match(/<iframe[^>]*id\s*=\s*["']gameFrame["'][^>]*src\s*=\s*["']([^"']+)["']/i);
  if (m1) return m1[1].trim();
  const m2 = html.match(/<iframe[^>]*src\s*=\s*["']([^"']+)["'][^>]*id\s*=\s*["']gameFrame["']/i);
  if (m2) return m2[1].trim();
  const m3 = html.match(/<iframe[^>]*src\s*=\s*["']([^"']+)["']/i);
  return m3 ? m3[1].trim() : "";
}

function isBadEmbed(url) {
  const u = String(url || "").toLowerCase();
  if (!u || !/^https?:\/\//i.test(u)) return true;
  if (u.endsWith("/ubg98/") || u.endsWith("/ubg98")) return true;
  if (/cdn\.jsdelivr\.net\/gh\/3kh0\/3kh0-lite/i.test(u)) return true;
  if (/raw\.githack\.com\/3kh0\/3kh0-lite/i.test(u)) return true;
  if (/raw\.githubusercontent\.com\/3kh0\/3kh0-lite/i.test(u)) return true;
  return false;
}

function pickGamePath(iframeSrc, localRel) {
  if (!isBadEmbed(iframeSrc)) return iframeSrc;
  return localRel;
}

function uniqueGameId(base, ids) {
  let id = slugId(base);
  if (!ids.has(id)) return id;
  let n = 2;
  while (ids.has(id + n)) n++;
  return id + n;
}

function isCategoryPage(name) {
  const n = String(name || "").toLowerCase();
  if (n === "index.html") return true;
  if (/-games\.html$/.test(n)) return true;
  return false;
}

function isGameHtml(name) {
  const n = String(name || "").toLowerCase();
  if (!/\.html?$/.test(n)) return false;
  if (isCategoryPage(n)) return false;
  return /unblocked/.test(n) || !/-games\./.test(n);
}

function walkHtmlFiles(dir, baseDir, out) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  items.forEach(function (item) {
    const abs = path.join(dir, item.name);
    if (item.isDirectory()) {
      walkHtmlFiles(abs, baseDir, out);
      return;
    }
    if (!isGameHtml(item.name)) return;
    const rel = path.relative(baseDir, abs).replace(/\\/g, "/");
    out.push(rel);
  });
}

function tryAddGame(state, entry) {
  const title = entry.title;
  const file = entry.file;
  const gamePath = entry.path;
  const pathLower = String(gamePath || "").toLowerCase();
  const fileBase = String(file || "").replace(/\.html?$/i, "");
  const keys = [normKey(title), normKey(fileBase), normKey(slugId(title)), normKey(entry.idHint || title)];

  if (pathLower && state.knownPaths.has(pathLower)) return false;
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] && state.knownKeys.has(keys[i])) return false;
  }

  const id = uniqueGameId(entry.idHint || title || fileBase, state.ids);
  state.ids.add(id);
  keys.forEach(function (k) {
    if (k) state.knownKeys.add(k);
  });
  if (pathLower) state.knownPaths.add(pathLower);

  state.games.push({
    id: id,
    file: file,
    title: title,
    path: gamePath,
    search: buildSearch({ id: id, title: title, file: file, path: gamePath }),
    image: "",
  });
  return true;
}

const games = [];
const state = {
  games: games,
  ids: new Set(),
  knownKeys: new Set(),
  knownPaths: new Set(),
};
let offlineAdded = 0;
let ubgCatalogAdded = 0;
let ubgLocalAdded = 0;

const offlineFiles = [];
walkHtmlFiles(OFFLINE_DIR, OFFLINE_DIR, offlineFiles);
offlineFiles.forEach(function (rel) {
  const abs = path.join(OFFLINE_DIR, rel);
  let html = "";
  try {
    html = fs.readFileSync(abs, "utf8");
  } catch (e) {
    return;
  }
  const fallback = rel
    .replace(/\.html?$/i, "")
    .replace(/[/_-]+/g, " ")
    .trim();
  const title = titleFromHtml(html, fallback);
  const gamePath = OFFLINE_PREFIX + rel.replace(/\\/g, "/");
  if (
    tryAddGame(state, {
      title: title,
      file: rel.replace(/\\/g, "/"),
      path: gamePath,
      idHint: path.basename(rel, path.extname(rel)),
    })
  ) {
    offlineAdded++;
  }
});

if (fs.existsSync(UBG98_INDEX)) {
  const ubgIndex = JSON.parse(fs.readFileSync(UBG98_INDEX, "utf8"));
  const items = Array.isArray(ubgIndex.games) ? ubgIndex.games : [];
  items.forEach(function (item) {
    const link = String(item.link || "").replace(/^\//, "");
    if (!link || isCategoryPage(link)) return;
    const htmlPath = path.join(UBG98_DIR, link);
    if (!fs.existsSync(htmlPath)) return;
    const html = fs.readFileSync(htmlPath, "utf8");
    const iframeSrc = extractIframeSrc(html);
    const title = cleanTitle(item.title) || titleFromHtml(html, link.replace(/\.html?$/i, ""));
    const localRel = UBG98_PREFIX + link.replace(/\\/g, "/");
    const gamePath = pickGamePath(iframeSrc, localRel);
    if (
      tryAddGame(state, {
        title: title,
        file: link,
        path: gamePath,
        idHint: title,
      })
    ) {
      ubgCatalogAdded++;
    }
  });
}

if (fs.existsSync(UBG98_DIR)) {
  const localFiles = [];
  walkHtmlFiles(UBG98_DIR, UBG98_DIR, localFiles);
  localFiles.forEach(function (rel) {
    const abs = path.join(UBG98_DIR, rel);
    const html = fs.readFileSync(abs, "utf8");
    const iframeSrc = extractIframeSrc(html);
    if (!iframeSrc && !/<iframe/i.test(html)) return;
    const title = titleFromHtml(html, rel.replace(/\.html?$/i, "").replace(/-/g, " "));
    const localRel = UBG98_PREFIX + rel.replace(/\\/g, "/");
    const gamePath = pickGamePath(iframeSrc, localRel);
    if (
      tryAddGame(state, {
        title: title,
        file: rel.replace(/\\/g, "/"),
        path: gamePath,
        idHint: rel.replace(/\.html?$/i, ""),
      })
    ) {
      ubgLocalAdded++;
    }
  });
}

games.sort(function (a, b) {
  return a.title.localeCompare(b.title);
});

fs.writeFileSync(GAMES_PATH, JSON.stringify(games, null, 2), "utf8");
fs.writeFileSync(path.join(ROOT, "games.js"), "window.KRITIKAL_GAMES=" + JSON.stringify(games) + ";", "utf8");

console.log(
  JSON.stringify({
    offlineAdded: offlineAdded,
    ubgCatalogAdded: ubgCatalogAdded,
    ubgLocalAdded: ubgLocalAdded,
    total: games.length,
  })
);
