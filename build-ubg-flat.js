const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const SOURCE = path.join(ROOT, "kritikal-UBG-main");
const OUT = path.join(ROOT, "zentra-ubg");

const SKIP_PREFIXES = [
  ".github",
  "fetured-games",
  "chat",
  "updates",
  "events",
  "support",
  "landing",
  "pages",
  "browser-mode",
  "invite",
  "request-dmca",
  "assets/thumbs",
  "active/active",
];

const SKIP_ROOT_FILES = new Set([
  "index.html",
  "script-home-page.js",
  "assets-homepage.js",
  "const-welcome-annc.js",
  "sitemap.xml",
]);

const CASE_ALIASES = {
  "Kobran.png": "kobran.png",
  "Kobran_transparent.png": "kobran_transparent.png",
  "apple_gameclicker_Kobran.png": "apple_gameclicker_kobran.png",
};

function shouldSkip(rel) {
  const norm = rel.replace(/\\/g, "/");
  for (let i = 0; i < SKIP_PREFIXES.length; i++) {
    const prefix = SKIP_PREFIXES[i];
    if (norm === prefix || norm.startsWith(prefix + "/")) return true;
  }
  if (!norm.includes("/") && SKIP_ROOT_FILES.has(norm)) return true;
  return false;
}

function toFlatName(rel) {
  const p = rel.replace(/\\/g, "/");
  if (!p.includes("/")) return p;
  return p.replace(/\//g, "__");
}

function walk(dir, base, files) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const rel = base ? base + "/" + entry.name : entry.name;
    if (entry.isDirectory()) {
      if (!shouldSkip(rel)) walk(path.join(dir, entry.name), rel, files);
      continue;
    }
    if (shouldSkip(rel)) continue;
    files.push({
      rel: rel.replace(/\\/g, "/"),
      abs: path.join(dir, entry.name),
    });
  }
}

function build() {
  if (!fs.existsSync(SOURCE)) {
    console.error("Missing source folder: " + SOURCE);
    process.exit(1);
  }
  if (fs.existsSync(OUT)) {
    for (const name of fs.readdirSync(OUT)) {
      fs.unlinkSync(path.join(OUT, name));
    }
  } else {
    fs.mkdirSync(OUT, { recursive: true });
  }

  const files = [];
  walk(SOURCE, "", files);
  const manifest = { version: 2, count: 0, files: {}, aliases: {} };
  const used = new Map();

  files.sort(function (a, b) {
    return a.rel.localeCompare(b.rel);
  });

  for (let i = 0; i < files.length; i++) {
    let flat = toFlatName(files[i].rel);
    if (used.has(flat)) {
      let n = 2;
      while (used.has(flat + "__" + n)) n++;
      flat = flat + "__" + n;
    }
    used.set(flat, files[i].rel);
    manifest.files[files[i].rel] = flat;
    fs.copyFileSync(files[i].abs, path.join(OUT, flat));
  }

  const aliasKeys = Object.keys(CASE_ALIASES);
  for (let i = 0; i < aliasKeys.length; i++) {
    const from = aliasKeys[i];
    const to = CASE_ALIASES[from];
    if (manifest.files[to]) {
      manifest.aliases[from] = manifest.files[to];
    }
  }

  manifest.count = files.length;
  fs.writeFileSync(path.join(OUT, "ubg-manifest.json"), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(OUT, "_manifest.json"), JSON.stringify(manifest, null, 2));
  console.log("Built zentra-ubg: " + manifest.count + " files");
  console.log("Output: " + OUT);
}

build();
