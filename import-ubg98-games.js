const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const GAMES_PATH = path.join(ROOT, "games.json");
const UBG98_DIR = path.join(ROOT, "ubg98.github.io-gh-pages");
const UBG98_INDEX = path.join(UBG98_DIR, "assets", "js", "games.json");

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

function extractIframeSrc(html) {
  const m1 = html.match(/<iframe[^>]*id\s*=\s*["']gameFrame["'][^>]*src\s*=\s*["']([^"']+)["']/i);
  if (m1) return m1[1].trim();
  const m2 = html.match(/<iframe[^>]*src\s*=\s*["']([^"']+)["'][^>]*id\s*=\s*["']gameFrame["']/i);
  if (m2) return m2[1].trim();
  const m3 = html.match(/<iframe[^>]*src\s*=\s*["']([^"']+)["']/i);
  return m3 ? m3[1].trim() : "";
}

function uniqueGameId(base, ids) {
  let id = slugId(base);
  if (!ids.has(id)) return id;
  let n = 2;
  while (ids.has(id + n)) n++;
  return id + n;
}

const existing = JSON.parse(fs.readFileSync(GAMES_PATH, "utf8"));
const knownKeys = new Set();
const knownPaths = new Set();

existing.forEach(function (g) {
  knownKeys.add(normKey(g.id));
  knownKeys.add(normKey(g.title));
  if (g.file) knownKeys.add(normKey(g.file.replace(/\.html$/i, "")));
  if (g.path) {
    knownPaths.add(String(g.path).toLowerCase());
    const base = path.basename(String(g.path)).replace(/\.html$/i, "");
    knownKeys.add(normKey(base));
    const ext = String(g.path).match(/\/([^/]+)\/?$/);
    if (ext) knownKeys.add(normKey(ext[1]));
  }
});

const ubgIndex = JSON.parse(fs.readFileSync(UBG98_INDEX, "utf8"));
const items = Array.isArray(ubgIndex.games) ? ubgIndex.games : [];
const ids = new Set(existing.map(function (g) {
  return g.id;
}));
const added = [];
const skipped = [];

items.forEach(function (item) {
  const link = String(item.link || "").replace(/^\//, "");
  if (!link) {
    skipped.push({ title: item.title, reason: "no link" });
    return;
  }
  const file = link;
  const htmlPath = path.join(UBG98_DIR, file);
  if (!fs.existsSync(htmlPath)) {
    skipped.push({ title: item.title, reason: "missing html" });
    return;
  }
  const html = fs.readFileSync(htmlPath, "utf8");
  const iframeSrc = extractIframeSrc(html);
  const title = cleanTitle(item.title) || cleanTitle(extractIframeSrc(html)) || file.replace(/\.html$/i, "");
  const fileBase = file.replace(/\.html$/i, "");
  const keyCandidates = [normKey(title), normKey(fileBase), normKey(slugId(title))];
  const gamePath = iframeSrc || "ubg98.github.io-gh-pages/" + file.replace(/\\/g, "/");
  const pathLower = gamePath.toLowerCase();

  if (knownPaths.has(pathLower)) {
    skipped.push({ title: title, reason: "duplicate path" });
    return;
  }
  let dup = false;
  for (let i = 0; i < keyCandidates.length; i++) {
    if (knownKeys.has(keyCandidates[i])) {
      dup = true;
      break;
    }
  }
  if (dup) {
    skipped.push({ title: title, reason: "duplicate game" });
    return;
  }

  const id = uniqueGameId(title, ids);
  ids.add(id);
  keyCandidates.forEach(function (k) {
    if (k) knownKeys.add(k);
  });
  knownPaths.add(pathLower);

  const entry = {
    id: id,
    file: file,
    title: title,
    path: gamePath,
    search: buildSearch({ id: id, title: title, file: file, path: gamePath }),
    image: "",
  };
  added.push(entry);
  existing.push(entry);
});

existing.sort(function (a, b) {
  return a.title.localeCompare(b.title);
});

fs.writeFileSync(GAMES_PATH, JSON.stringify(existing, null, 2), "utf8");
fs.writeFileSync(
  path.join(ROOT, "games.js"),
  "window.KRITIKAL_GAMES=" + JSON.stringify(existing) + ";",
  "utf8"
);

console.log("Added:", added.length);
console.log("Skipped:", skipped.length);
console.log("Total games:", existing.length);
