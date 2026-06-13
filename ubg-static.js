const fs = require("fs");
const path = require("path");

function resolveBloxRoot(siteRoot) {
  siteRoot = path.resolve(siteRoot);
  const exact = path.join(siteRoot, "kritikal-UBG-main");
  if (fs.existsSync(exact)) return exact;
  try {
    const names = fs.readdirSync(siteRoot);
    for (let i = 0; i < names.length; i++) {
      if (names[i].toLowerCase() === "kritikal-ubg-main") {
        return path.join(siteRoot, names[i]);
      }
    }
  } catch (e) {}
  return exact;
}

function resolveUnderSiteRoot(siteRoot, relPath) {
  const cleaned = String(relPath || "").replace(/^\/+/, "").split("?")[0];
  let abs = path.join(siteRoot, cleaned);
  if (fs.existsSync(abs)) return abs;
  const head = cleaned.split(/[/\\]/)[0];
  if (head && head.toLowerCase() === "kritikal-ubg-main") {
    const bloxRoot = resolveBloxRoot(siteRoot);
    const tail = cleaned.slice(head.length).replace(/^[/\\]+/, "");
    abs = path.join(bloxRoot, tail);
  }
  return abs;
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

function safeJoin(root, rel) {
  const cleaned = String(rel || "").replace(/^\/+/, "").split("?")[0];
  const full = path.normalize(path.join(root, cleaned));
  if (!full.startsWith(root)) return null;
  return full;
}

function resolveUbgFile(bloxRoot, urlPath) {
  let p = String(urlPath || "").split("?")[0];
  if (!p || p === "/") return null;
  if (p.endsWith("/")) p += "index.html";
  let abs = safeJoin(bloxRoot, p);
  if (abs && fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs;
  if (!path.extname(p)) {
    abs = safeJoin(bloxRoot, p + "/index.html");
    if (abs && fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs;
  }
  return null;
}

function createUbgStatic(bloxRoot) {
  bloxRoot = path.resolve(bloxRoot);
  return function ubgStatic(req, res, next) {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    const raw = String(req.path || "");
    const lower = raw.toLowerCase();
    if (lower.startsWith("/api/") || lower.startsWith("/admin")) return next();
    if (MAIN_ONLY.has(lower)) return next();
    const fp = resolveUbgFile(bloxRoot, raw);
    if (!fp) return next();
    if (lower.endsWith(".html") || lower.endsWith(".js") || lower.endsWith(".json")) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    }
    res.sendFile(fp);
  };
}

function createUbgShellHandler(bloxRoot) {
  bloxRoot = path.resolve(bloxRoot);
  return function ubgShell(req, res) {
    res.sendFile(path.join(bloxRoot, "index.html"));
  };
}

module.exports = {
  resolveBloxRoot: resolveBloxRoot,
  resolveUnderSiteRoot: resolveUnderSiteRoot,
  createUbgStatic: createUbgStatic,
  createUbgShellHandler: createUbgShellHandler,
};
