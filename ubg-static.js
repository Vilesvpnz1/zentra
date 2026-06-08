const fs = require("fs");
const path = require("path");

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
  createUbgStatic: createUbgStatic,
  createUbgShellHandler: createUbgShellHandler,
};
