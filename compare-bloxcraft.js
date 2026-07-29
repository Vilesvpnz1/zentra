const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname);
const EXISTING = JSON.parse(fs.readFileSync(path.join(ROOT, "games.json"), "utf8"));
const BLOX = JSON.parse(
  fs.readFileSync(path.join(ROOT, "Bloxcraft-UBG-main", "games", "games.json"), "utf8")
);
const BLOX_DIR = path.join(ROOT, "Bloxcraft-UBG-main");
const KR_DIR = path.join(ROOT, "kritikal-UBG-main");

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function viewFromUrl(url) {
  const m = String(url || "").match(/[?&]view=([^&]+)/);
  return m ? decodeURIComponent(m[1]).replace(/^\/+/, "") : "";
}

const existingTitles = new Set(EXISTING.map((g) => norm(g.title)));
const existingPaths = new Set(
  EXISTING.map((g) => norm(String(g.path || "").replace(/^kritikal-UBG-main\//i, "")))
);
const existingFiles = new Set(
  EXISTING.map((g) => norm(String(g.file || "")))
);

const missing = [];
const dup = [];
BLOX.forEach(function (item) {
  const view = viewFromUrl(item.url);
  if (!view.startsWith("gameFiles/") && !view.startsWith("refined-beta/")) return;
  const rel = view + "/index.html";
  const abs = path.join(BLOX_DIR, rel);
  if (!fs.existsSync(abs)) return;
  const nTitle = norm(item.name);
  const nPath = norm(view);
  const nFile = norm(rel);
  if (existingTitles.has(nTitle) || existingPaths.has(nPath) || existingFiles.has(nFile)) {
    dup.push(item.name);
    return;
  }
  const krAbs = path.join(KR_DIR, rel);
  if (fs.existsSync(krAbs)) {
    dup.push(item.name + " (in zentra-ubg files)");
    return;
  }
  missing.push({ name: item.name, view: view, img: item.img, rel: rel });
});

const gf = path.join(BLOX_DIR, "gameFiles");
const dirs = fs.readdirSync(gf).filter(function (d) {
  return fs.existsSync(path.join(gf, d, "index.html"));
});
const extraDirs = dirs.filter(function (d) {
  const view = "gameFiles/" + d;
  const nTitle = norm(d.replace(/-/g, " "));
  const nPath = norm(view);
  if (existingPaths.has(nPath)) return false;
  if (BLOX.some(function (b) { return norm(viewFromUrl(b.url)) === nPath; })) return false;
  const kr = path.join(KR_DIR, view, "index.html");
  if (fs.existsSync(kr)) return false;
  return true;
});

console.log(
  JSON.stringify(
    {
      bloxCatalog: BLOX.length,
      existing: EXISTING.length,
      missingFromCatalog: missing.length,
      extraGameFileDirs: extraDirs.length,
      sampleMissing: missing.slice(0, 15).map((m) => m.name),
      sampleExtra: extraDirs.slice(0, 15),
    },
    null,
    2
  )
);
