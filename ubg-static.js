const fs = require("fs");
const path = require("path");

const FLAT_DIR = "zentra-ubg";
const NESTED_DIR = "kritikal-UBG-main";
const MANIFEST_NAMES = ["ubg-manifest.json", "_manifest.json"];

let flatManifestCacheByRoot = new Map();

function loadFlatManifest(flatRoot) {
  flatRoot = path.resolve(flatRoot);
  if (flatManifestCacheByRoot.has(flatRoot)) {
    return flatManifestCacheByRoot.get(flatRoot);
  }
  const manifestPath = findManifestPath(flatRoot);
  if (!manifestPath) return null;
  const data = readJson(manifestPath);
  if (!data || !data.files) return null;
  const lower = {};
  const keys = Object.keys(data.files);
  for (let i = 0; i < keys.length; i++) {
    lower[keys[i].toLowerCase()] = data.files[keys[i]];
  }
  const entry = { data: data, lower: lower };
  flatManifestCacheByRoot.set(flatRoot, entry);
  return entry;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (e) {
    return null;
  }
}

function findManifestPath(flatRoot) {
  for (let i = 0; i < MANIFEST_NAMES.length; i++) {
    const candidate = path.join(flatRoot, MANIFEST_NAMES[i]);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}
function hasFlatBundleFiles(flatRoot) {
  return (
    fs.existsSync(path.join(flatRoot, "games__index.html")) ||
    fs.existsSync(path.join(flatRoot, "apps__index.html"))
  );
}

function dirHasNestedUbg(dir) {
  return (
    fs.existsSync(path.join(dir, "games", "index.html")) ||
    fs.existsSync(path.join(dir, "apps", "index.html"))
  );
}

function bundleRootScore(dir) {
  let score = 0;
  if (findManifestPath(dir)) score += 100;
  if (fs.existsSync(path.join(dir, "games__index.html"))) score += 50;
  if (fs.existsSync(path.join(dir, "apps__index.html"))) score += 10;
  if (fs.existsSync(path.join(dir, "games", "index.html"))) score += 40;
  if (fs.existsSync(path.join(dir, "apps", "index.html"))) score += 8;
  try {
    score += Math.min(20, fs.readdirSync(dir).filter(function (n) {
      return fs.statSync(path.join(dir, n)).isFile();
    }).length / 20);
  } catch (e) {}
  return score;
}

function collectBundleRoots(siteRoot) {
  siteRoot = path.resolve(siteRoot);
  const candidates = [];
  if (process.env.ZENTRA_UBG_DIR) candidates.push(process.env.ZENTRA_UBG_DIR);
  candidates.push(path.join(siteRoot, FLAT_DIR));
  candidates.push(siteRoot);
  candidates.push(path.join(siteRoot, "..", FLAT_DIR));
  candidates.push(resolveNestedRoot(siteRoot));

  const seen = new Set();
  const roots = [];
  for (let i = 0; i < candidates.length; i++) {
    const dir = path.resolve(String(candidates[i] || ""));
    if (seen.has(dir)) continue;
    if (!fs.existsSync(dir)) continue;
    const usable =
      findManifestPath(dir) ||
      hasFlatBundleFiles(dir) ||
      dirHasNestedUbg(dir);
    if (!usable) continue;
    seen.add(dir);
    roots.push(dir);
  }

  roots.sort(function (a, b) {
    return bundleRootScore(b) - bundleRootScore(a);
  });
  return roots;
}

function resolveFlatRoot(siteRoot) {
  const roots = collectBundleRoots(siteRoot);
  for (let i = 0; i < roots.length; i++) {
    if (findManifestPath(roots[i]) || hasFlatBundleFiles(roots[i])) return roots[i];
  }
  return null;
}

function resolveNestedRoot(siteRoot) {
  siteRoot = path.resolve(siteRoot);
  const exact = path.join(siteRoot, NESTED_DIR);
  if (fs.existsSync(exact)) return exact;
  try {
    const names = fs.readdirSync(siteRoot);
    for (let i = 0; i < names.length; i++) {
      if (names[i].toLowerCase() === NESTED_DIR.toLowerCase()) {
        return path.join(siteRoot, names[i]);
      }
    }
  } catch (e) {}
  return exact;
}

function resolveBloxRoot(siteRoot) {
  const roots = collectBundleRoots(siteRoot);
  if (roots.length) return roots[0];
  return resolveNestedRoot(siteRoot);
}

function isFlatBundle(root) {
  root = path.resolve(root);
  return Boolean(findManifestPath(root) || hasFlatBundleFiles(root));
}

function normalizeRelPath(relPath) {
  let p = String(relPath || "")
    .replace(/^\/+/, "")
    .split("?")[0]
    .replace(/\\/g, "/");
  try {
    p = decodeURIComponent(p);
  } catch (e) {}
  return p;
}

function toFlatName(rel) {
  const p = String(rel || "").replace(/\\/g, "/");
  if (!p.includes("/")) return p;
  return p.replace(/\//g, "__");
}

function candidateRelPaths(urlPath) {
  let p = normalizeRelPath(urlPath);
  const out = [];
  function add(v) {
    if (v && out.indexOf(v) === -1) out.push(v);
  }
  if (!p) return out;
  add(p);
  if (p.endsWith("/")) add(p + "index.html");
  if (!path.extname(p)) {
    add(p.replace(/\/+$/, "") + "/index.html");
    add(p.replace(/\/+$/, "") + ".html");
  }
  return out;
}

function flatFileExists(flatRoot, flatName) {
  if (!flatName) return null;
  const abs = path.join(flatRoot, flatName);
  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs;
  return null;
}

function lookupManifestFlatName(manifestEntry, relKey) {
  if (!manifestEntry) return null;
  const manifest = manifestEntry.data;
  if (manifest.files[relKey]) return manifest.files[relKey];
  if (manifest.aliases && manifest.aliases[relKey]) return manifest.aliases[relKey];
  if (manifestEntry.lower && manifestEntry.lower[relKey.toLowerCase()]) {
    return manifestEntry.lower[relKey.toLowerCase()];
  }
  return null;
}

function resolveFlatEncoded(flatRoot, relKey) {
  let fp = flatFileExists(flatRoot, toFlatName(relKey));
  if (fp) return fp;
  fp = flatFileExists(flatRoot, toFlatName(relKey.toLowerCase()));
  if (fp) return fp;
  if (!relKey.includes("/")) {
    fp = flatFileExists(flatRoot, relKey.toLowerCase());
    if (fp) return fp;
  }
  return null;
}

function resolveFlatFile(flatRoot, urlPath) {
  flatRoot = path.resolve(flatRoot);
  const manifestEntry = loadFlatManifest(flatRoot);
  const keys = candidateRelPaths(urlPath);
  for (let i = 0; i < keys.length; i++) {
    const flatName = lookupManifestFlatName(manifestEntry, keys[i]);
    if (flatName) {
      const abs = flatFileExists(flatRoot, flatName);
      if (abs) return abs;
    }
    const encoded = resolveFlatEncoded(flatRoot, keys[i]);
    if (encoded) return encoded;
  }
  return null;
}

function safeJoin(root, rel) {
  const cleaned = normalizeRelPath(rel);
  const full = path.normalize(path.join(root, cleaned));
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (full !== root && !full.startsWith(rootWithSep)) return null;
  return full;
}

function resolveNestedFile(nestedRoot, urlPath) {
  let p = String(urlPath || "").split("?")[0];
  if (!p || p === "/") return null;
  if (p.endsWith("/")) p += "index.html";
  p = p.replace(/^\/+/, "");
  let abs = safeJoin(nestedRoot, p);
  if (abs && fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs;
  if (!path.extname(p)) {
    abs = safeJoin(nestedRoot, p + "/index.html");
    if (abs && fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs;
  }
  abs = safeJoin(nestedRoot, p.toLowerCase());
  if (abs && fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs;
  if (!path.extname(p)) {
    abs = safeJoin(nestedRoot, p.toLowerCase() + "/index.html");
    if (abs && fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs;
  }
  return null;
}

function resolveFromRoot(root, urlPath) {
  root = path.resolve(root);
  if (isFlatBundle(root)) {
    const flat = resolveFlatFile(root, urlPath);
    if (flat) return flat;
  }
  return resolveNestedFile(root, urlPath);
}

function resolveUbgFile(siteRoot, urlPath) {
  const roots = collectBundleRoots(siteRoot);
  for (let i = 0; i < roots.length; i++) {
    const fp = resolveFromRoot(roots[i], urlPath);
    if (fp) return fp;
  }
  const nested = resolveNestedRoot(siteRoot);
  if (roots.indexOf(nested) === -1 && fs.existsSync(nested)) {
    return resolveFromRoot(nested, urlPath);
  }
  return null;
}

function missingHint(siteRoot, urlPath) {
  const keys = candidateRelPaths(urlPath);
  let rel = keys.length ? keys[keys.length - 1] : normalizeRelPath(urlPath);
  if (!rel) rel = normalizeRelPath(urlPath);
  return {
    rel: rel,
    flat: toFlatName(rel),
    nested: rel.indexOf("/") === -1 && !path.extname(rel) ? rel + "/index.html" : rel,
  };
}

function resolveUnderSiteRoot(siteRoot, relPath) {
  const cleaned = normalizeRelPath(relPath);
  const fp = resolveUbgFile(siteRoot, cleaned);
  if (fp) return fp;
  let abs = path.join(path.resolve(siteRoot), cleaned);
  if (fs.existsSync(abs)) return abs;
  abs = path.join(path.resolve(siteRoot), cleaned.toLowerCase());
  if (fs.existsSync(abs)) return abs;
  const head = cleaned.split("/")[0];
  if (head && head.toLowerCase() === NESTED_DIR.toLowerCase()) {
    const nestedRoot = resolveNestedRoot(siteRoot);
    const tail = cleaned.slice(head.length).replace(/^\/+/, "");
    abs = path.join(nestedRoot, tail);
  }
  return abs;
}

function getBundleStatus(siteRoot) {
  siteRoot = path.resolve(siteRoot);
  const roots = collectBundleRoots(siteRoot);
  const primary = roots[0] || resolveNestedRoot(siteRoot);
  const checks = [
    { path: "/games/", rel: "games/index.html", flat: "games__index.html" },
    { path: "/apps/", rel: "apps/index.html", flat: "apps__index.html" },
    { path: "/featured-games/", rel: "featured-games/index.html", flat: "featured-games__index.html" },
    { path: "/sail/", rel: "sail/index.html", flat: "sail__index.html" },
  ];
  const pages = checks.map(function (item) {
    return {
      path: item.path,
      ok: Boolean(resolveUbgFile(siteRoot, item.path)),
      needFlat: item.flat,
      needNested: item.rel,
    };
  });
  return {
    siteRoot: siteRoot,
    primaryRoot: primary,
    flat: isFlatBundle(primary),
    roots: roots.map(function (dir) {
      return {
        dir: dir,
        score: bundleRootScore(dir),
        manifest: Boolean(findManifestPath(dir)),
        flatGames: fs.existsSync(path.join(dir, "games__index.html")),
        nestedGames: fs.existsSync(path.join(dir, "games", "index.html")),
        fileCount: (function () {
          try {
            return fs.readdirSync(dir).filter(function (n) {
              return fs.statSync(path.join(dir, n)).isFile();
            }).length;
          } catch (e) {
            return 0;
          }
        })(),
      };
    }),
    pages: pages,
  };
}

const UBG_ROUTE_PREFIXES = [
  "/games",
  "/apps",
  "/assets",
  "/sail",
  "/vms",
  "/featured-games",
  "/fetured-games",
  "/ultimate-game-stash",
  "/proxy-select",
  "/minecraft-tools",
  "/refined-beta",
  "/gamefiles",
  "/partners",
  "/terms",
  "/privacy-policy",
  "/chat",
  "/updates",
  "/support",
  "/landing",
  "/pages",
  "/invite",
  "/browser-mode",
  "/iframe-sites",
  "/app-viewer",
  "/events",
  "/request-dmca",
  "/active",
  "/tools",
  "/404.html",
  "/kobran.png",
  "/kobran_transparent.png",
];

function isUbgRoute(urlPath) {
  const p = String(urlPath || "")
    .toLowerCase()
    .split("?")[0];
  if (!p || p === "/") return false;
  for (let i = 0; i < UBG_ROUTE_PREFIXES.length; i++) {
    const prefix = UBG_ROUTE_PREFIXES[i];
    if (p === prefix || p.startsWith(prefix + "/")) return true;
  }
  if (/^\/(?:1f3ae|39e50783014f84b22616ad0a139b1e54|apple_gameclicker|assets_|gamepage_banner|poki|gamebanana|gamecookie|gameitem|game-|homepage_|kobran|magic_tiles|partnership_page|planet-clicker|playerhead|slime-io|tiny_asset|ubghub|yellow_car|zodiac|zombie_head|chrome-dino|cookie-clicker|discord|easyfunofggs|gaming_banner|google|item_book|maze_game|nowgg|youtube|clock|main_home|main-injection|navbarsettings|the-annc|the-ban-appeals)/i.test(p)) {
    return true;
  }
  return false;
}

const MAIN_ONLY = new Set([
  "/",
  "/index.html",
  "/app.js",
  "/styles.css",
  "/cloak.js",
  "/settings.js",
  "/play.html",
  "/lesson-play.html",
  "/games.json",
  "/games.js",
  "/store.js",
  "/favicon.svg",
  "/chat.js",
  "/launch-resolve.js",
  "/game-frame-proxy.js",
]);

function sendUbgFile(fp, req, res) {
  const lower = String(req.path || "").toLowerCase();
  if (lower === "/sail/sw.js" || lower.endsWith("/sail/sw.js")) {
    res.setHeader("Service-Worker-Allowed", "/");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  }
  if (lower.endsWith(".html") || lower.endsWith(".js") || lower.endsWith(".json") || lower.endsWith(".mjs")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  }
  res.sendFile(fp);
}

function createUbgStatic(siteRoot) {
  siteRoot = path.resolve(siteRoot);
  return function ubgStatic(req, res, next) {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    const raw = String(req.path || "");
    const lower = raw.toLowerCase();
    if (lower.startsWith("/api/") || lower.startsWith("/admin")) return next();
    if (MAIN_ONLY.has(lower)) return next();
    if (!isUbgRoute(raw) && !path.extname(raw)) return next();
    const fp = resolveUbgFile(siteRoot, raw);
    if (!fp) return next();
    sendUbgFile(fp, req, res);
  };
}

function serveUbgRequest(siteRoot, req, res) {
  const fp = resolveUbgFile(siteRoot, req.path);
  if (fp) {
    sendUbgFile(fp, req, res);
    return true;
  }
  return false;
}

module.exports = {
  FLAT_DIR: FLAT_DIR,
  NESTED_DIR: NESTED_DIR,
  resolveFlatRoot: resolveFlatRoot,
  resolveBloxRoot: resolveBloxRoot,
  collectBundleRoots: collectBundleRoots,
  resolveUnderSiteRoot: resolveUnderSiteRoot,
  resolveUbgFile: resolveUbgFile,
  isFlatBundle: isFlatBundle,
  isUbgRoute: isUbgRoute,
  missingHint: missingHint,
  getBundleStatus: getBundleStatus,
  createUbgStatic: createUbgStatic,
  serveUbgRequest: serveUbgRequest,
};
