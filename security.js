const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DEFAULT_OPTS = {
  dataDir: path.join(__dirname, "data"),
  trustProxy: true,
};

const CONFIG = {
  globalWindowMs: 60000,
  globalMax: 600,
  apiWindowMs: 60000,
  apiMax: 240,
  staticWindowMs: 60000,
  staticMax: 900,
  burstWindowMs: 10000,
  burstMax: 140,
  concurrentMax: 160,
  loginWindowMs: 900000,
  loginMaxFails: 8,
  loginLockMs: 900000,
  violationWindowMs: 300000,
  violationBanThreshold: 12,
  tempBanMs: 900000,
  severeBanMs: 86400000,
  maxUrlLength: 4096,
  maxBodyDefault: 262144,
  maxBodyImport: 52428800,
  stressGlobalMax: 800,
  stressBurstMax: 40,
};

const SUSPICIOUS_PATH =
  /(?:\.\.[\/\\]|%2e%2e|%252e|\/\.env|\/\.git|<script|union\s+select|\/etc\/passwd|wget\s|curl\s|%00|\\x00|\/wp-admin|\/phpmyadmin|\.php\b|\.asp\b)/i;

const SUSPICIOUS_UA = /(?:sqlmap|nikto|masscan|nmap|acunetix|havij|zgrab)/i;

const BLOCKED_PATH_PREFIXES = [
  "/data/",
  "/node_modules/",
  "/package.json",
  "/package-lock.json",
  "/server.js",
  "/security.js",
  "/launch-resolve.js",
];

let ipBlocksPath = "";
let ipState = new Map();
let permanentBlocks = new Set();
let loginFails = new Map();
let totalRecent = [];
let stressMode = false;
let cleanupTimer = null;
var blocksMongoCol = null;
var blocksMongoEnabled = false;

function readBlocksFile() {
  if (!ipBlocksPath) return;
  try {
    const raw = JSON.parse(fs.readFileSync(ipBlocksPath, "utf8"));
    const ips = Array.isArray(raw.ips) ? raw.ips : Array.isArray(raw) ? raw : [];
    permanentBlocks = new Set(
      ips
        .map(function (x) {
          return typeof x === "string" ? x : x && x.ip;
        })
        .filter(Boolean)
    );
  } catch (e) {
    permanentBlocks = new Set();
  }
}

function saveBlocksFile() {
  if (!ipBlocksPath) return;
  var payload = { ips: Array.from(permanentBlocks), updatedAt: Date.now() };
  fs.mkdirSync(path.dirname(ipBlocksPath), { recursive: true });
  fs.writeFileSync(ipBlocksPath, JSON.stringify(payload, null, 2), "utf8");
  if (blocksMongoEnabled && blocksMongoCol) {
    blocksMongoCol
      .updateOne(
        { _id: "ip_blocks" },
        { $set: { data: payload, updatedAt: Date.now() } },
        { upsert: true }
      )
      .catch(function () {});
  }
}

async function bindBlocksMongo(db) {
  if (!db) return false;
  blocksMongoCol = db.collection("security_store");
  blocksMongoEnabled = true;
  var doc = null;
  try {
    doc = await blocksMongoCol.findOne({ _id: "ip_blocks" });
  } catch (e) {
    blocksMongoEnabled = false;
    blocksMongoCol = null;
    return false;
  }
  var remote = doc && doc.data ? doc.data : null;
  var remoteIps = remote && Array.isArray(remote.ips) ? remote.ips : null;
  if (remoteIps && remoteIps.length) {
    permanentBlocks = new Set(
      remoteIps
        .map(function (x) {
          return typeof x === "string" ? x : x && x.ip;
        })
        .filter(Boolean)
    );
    if (ipBlocksPath) {
      fs.mkdirSync(path.dirname(ipBlocksPath), { recursive: true });
      fs.writeFileSync(
        ipBlocksPath,
        JSON.stringify({ ips: Array.from(permanentBlocks), updatedAt: Date.now() }, null, 2),
        "utf8"
      );
    }
  } else if (permanentBlocks.size) {
    await blocksMongoCol.updateOne(
      { _id: "ip_blocks" },
      {
        $set: {
          data: { ips: Array.from(permanentBlocks), updatedAt: Date.now() },
          updatedAt: Date.now(),
        },
      },
      { upsert: true }
    );
  }
  return true;
}

function normalizeIp(raw) {
  let ip = String(raw || "unknown").trim();
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  if (ip.length > 64) ip = ip.slice(0, 64);
  return ip || "unknown";
}

function isLocalIp(ip) {
  ip = normalizeIp(ip);
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost" || ip === "unknown") return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  return false;
}

function isStaticAsset(reqPath) {
  const p = String(reqPath || "").split("?")[0];
  if (p === "/" || p === "/index.html" || p === "/chat.html" || p === "/play.html" || p === "/lesson-play.html") {
    return true;
  }
  return /\.(?:css|js|mjs|map|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|babylon|html?|json|txt|mp3|ogg|wav|wasm)$/i.test(
    p
  );
}

function isBootstrapApiPath(reqPath) {
  const p = String(reqPath || "").split("?")[0];
  return (
    p === "/api/games" ||
    p === "/api/announcements" ||
    p === "/api/changelog" ||
    p === "/api/auth/session" ||
    p === "/api/user/library" ||
    p === "/api/featured/game" ||
    p === "/api/block-status" ||
    p.startsWith("/api/thumb/")
  );
}

function isGameRoute(reqPath) {
  const p = String(reqPath || "").split("?")[0];
  return p === "/play.html" || p === "/lesson-play.html" || /^\/api\/game-launch\//.test(p) || p === "/api/game-frame";
}

function getClientIp(req) {
  if (req._kobranIp) return req._kobranIp;
  let ip = "";
  if (req.app && req.app.get("trust proxy")) {
    ip = normalizeIp(req.ip || "");
  }
  if (!ip || ip === "unknown") {
    const fwd = req.headers["x-forwarded-for"];
    if (fwd) ip = normalizeIp(String(fwd).split(",")[0].trim());
  }
  if (!ip || ip === "unknown") {
    ip = normalizeIp(req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "");
  }
  req._kobranIp = ip;
  return ip;
}

function getIpRecord(ip) {
  let rec = ipState.get(ip);
  if (!rec) {
    rec = {
      global: [],
      api: [],
      static: [],
      burst: [],
      violations: [],
      bannedUntil: 0,
      concurrent: 0,
    };
    ipState.set(ip, rec);
  }
  return rec;
}

function pruneWindow(arr, windowMs, now) {
  while (arr.length && arr[0] < now - windowMs) arr.shift();
}

function countWindow(arr, windowMs, now) {
  pruneWindow(arr, windowMs, now);
  return arr.length;
}

function pushWindow(arr, now) {
  arr.push(now);
}

function isIpBanned(ip) {
  if (isLocalIp(ip)) return false;
  if (permanentBlocks.has(ip)) return true;
  const rec = ipState.get(ip);
  return rec && rec.bannedUntil > Date.now();
}

function banIp(ip, durationMs, permanent) {
  ip = normalizeIp(ip);
  if (isLocalIp(ip)) return;
  if (permanent) {
    permanentBlocks.add(ip);
    saveBlocksFile();
  }
  const rec = getIpRecord(ip);
  rec.bannedUntil = Math.max(rec.bannedUntil, Date.now() + durationMs);
}

function recordViolation(ip, weight) {
  ip = normalizeIp(ip);
  if (isLocalIp(ip)) return;
  const now = Date.now();
  const rec = getIpRecord(ip);
  rec.violations.push(now);
  pruneWindow(rec.violations, CONFIG.violationWindowMs, now);
  const w = weight || 1;
  for (let i = 1; i < w; i++) rec.violations.push(now);
  if (rec.violations.length >= CONFIG.violationBanThreshold) {
    banIp(ip, CONFIG.severeBanMs, false);
    rec.violations.length = 0;
  } else if (rec.violations.length >= Math.floor(CONFIG.violationBanThreshold / 2)) {
    banIp(ip, CONFIG.tempBanMs, false);
  }
}

function rateLimitHit(rec, key, windowMs, max, now) {
  const arr = rec[key];
  pruneWindow(arr, windowMs, now);
  if (arr.length >= max) return true;
  pushWindow(arr, now);
  return false;
}

function updateStressMode(now) {
  pruneWindow(totalRecent, 1000, now);
  const prev = stressMode;
  stressMode = totalRecent.length > CONFIG.stressGlobalMax;
  return stressMode && !prev;
}

function isBlockedPath(reqPath) {
  const p = String(reqPath || "").toLowerCase().split("?")[0];
  if (!p || p.length > CONFIG.maxUrlLength) return true;
  for (let i = 0; i < BLOCKED_PATH_PREFIXES.length; i++) {
    if (p === BLOCKED_PATH_PREFIXES[i] || p.startsWith(BLOCKED_PATH_PREFIXES[i])) return true;
  }
  if (p.includes("..")) return true;
  return false;
}

function isSuspiciousRequest(req) {
  const url = String(req.originalUrl || req.url || "");
  if (url.length > CONFIG.maxUrlLength) return true;
  if (SUSPICIOUS_PATH.test(url)) return true;
  const ua = String(req.headers["user-agent"] || "");
  if (ua && SUSPICIOUS_UA.test(ua)) return true;
  const host = String(req.headers.host || "");
  if (host.length > 256) return true;
  return false;
}

function sendBlocked(res, code, retryAfter) {
  if (retryAfter) res.setHeader("Retry-After", String(Math.ceil(retryAfter / 1000)));
  res.setHeader("Cache-Control", "no-store");
  res.status(code).json({ error: code === 429 ? "rate_limited" : "blocked" });
}

function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(self), camera=(self)");
  var p = String(req.path || "");
  var lower = p.toLowerCase();
  if (/\.(css|js|mjs|map|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf|mp3|mp4|webm|wasm)(\?|$)/i.test(lower)) {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  }
  next();
}

function pathGuard(req, res, next) {
  if (isBlockedPath(req.path)) {
    recordViolation(getClientIp(req), 2);
    return res.status(404).end();
  }
  next();
}

const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"]);

function shield(req, res, next) {
  if (!ALLOWED_METHODS.has(req.method)) {
    return res.status(405).end();
  }
  const ip = getClientIp(req);
  if (isLocalIp(ip)) return next();
  const now = Date.now();
  const pathOnly = String(req.path || "");
  const staticGet = req.method === "GET" && isStaticAsset(pathOnly);
  const bootstrapGet = req.method === "GET" && isBootstrapApiPath(pathOnly);
  const gameRoute = isGameRoute(pathOnly);
  const chatApi = pathOnly.startsWith("/api/chat/");
  const authApi = pathOnly.startsWith("/api/auth/");
  const lowRiskGet = staticGet || bootstrapGet || gameRoute || chatApi || authApi;

  if (!lowRiskGet) {
    pushWindow(totalRecent, now);
    updateStressMode(now);
  }

  if (isIpBanned(ip)) {
    if (staticGet) {
      return next();
    }
    return sendBlocked(res, 403);
  }

  if (isSuspiciousRequest(req)) {
    recordViolation(ip, 2);
    return res.status(400).end();
  }

  const rec = getIpRecord(ip);
  const globalMax = stressMode ? Math.floor(CONFIG.globalMax / 2) : CONFIG.globalMax;
  const burstMax = stressMode ? CONFIG.stressBurstMax : CONFIG.burstMax;
  const skipBurst = lowRiskGet;

  if (!lowRiskGet && rateLimitHit(rec, "global", CONFIG.globalWindowMs, globalMax, now)) {
    return sendBlocked(res, 429, CONFIG.globalWindowMs);
  }

  if (!skipBurst && rateLimitHit(rec, "burst", CONFIG.burstWindowMs, burstMax, now)) {
    return sendBlocked(res, 429, CONFIG.burstWindowMs);
  }

  if (!lowRiskGet && rec.concurrent >= CONFIG.concurrentMax) {
    return sendBlocked(res, 503, 5000);
  }

  if (!lowRiskGet) {
    rec.concurrent += 1;
  }
  let released = false;
  function release() {
    if (released) return;
    released = true;
    if (!lowRiskGet) rec.concurrent = Math.max(0, rec.concurrent - 1);
  }
  res.on("finish", release);
  res.on("close", release);

  const longScan = pathOnly === "/api/admin/games/scan-fetch";
  const hardTimeout = setTimeout(function () {
    if (!res.headersSent) {
      res.status(503).json({ error: "timeout" });
    }
    if (!res.writableEnded) {
      try {
        res.end();
      } catch (e) {}
    }
    release();
  }, longScan ? 120000 : 45000);
  res.on("finish", function () {
    clearTimeout(hardTimeout);
  });
  res.on("close", function () {
    clearTimeout(hardTimeout);
  });

  next();
}

function apiRateLimit(req, res, next) {
  const ip = getClientIp(req);
  if (isLocalIp(ip)) return next();
  const now = Date.now();
  const rec = getIpRecord(ip);
  const pathOnly = String(req.path || "");
  if (/^\/game-launch\//.test(pathOnly) || pathOnly === "/game-frame") {
    return next();
  }
  if (pathOnly === "/admin/games/scan-fetch") {
    return next();
  }
  if (pathOnly.startsWith("/chat/") || pathOnly.startsWith("/auth/")) {
    return next();
  }
  const max = stressMode ? Math.floor(CONFIG.apiMax / 2) : CONFIG.apiMax;
  if (rateLimitHit(rec, "api", CONFIG.apiWindowMs, max, now)) {
    return sendBlocked(res, 429, CONFIG.apiWindowMs);
  }
  next();
}

function staticRateLimit(req, res, next) {
  const ip = getClientIp(req);
  if (isLocalIp(ip)) return next();
  const pathOnly = String(req.path || "");
  if (pathOnly.startsWith("/assets/thumbs/") || pathOnly.startsWith("/api/thumb/")) return next();
  const now = Date.now();
  const rec = getIpRecord(ip);
  const max = stressMode ? Math.floor(CONFIG.staticMax / 2) : CONFIG.staticMax;
  if (rateLimitHit(rec, "static", CONFIG.staticWindowMs, max, now)) {
    return sendBlocked(res, 429, CONFIG.staticWindowMs);
  }
  next();
}

function adminLoginGuard(req, res, next) {
  const ip = getClientIp(req);
  const now = Date.now();
  let bucket = loginFails.get(ip);
  if (!bucket) {
    bucket = { fails: [], lockUntil: 0 };
    loginFails.set(ip, bucket);
  }
  pruneWindow(bucket.fails, CONFIG.loginWindowMs, now);
  if (bucket.lockUntil > now) {
    return sendBlocked(res, 429, bucket.lockUntil - now);
  }
  next();
}

function registerLoginFailure(ip) {
  const now = Date.now();
  let bucket = loginFails.get(ip);
  if (!bucket) {
    bucket = { fails: [], lockUntil: 0 };
    loginFails.set(ip, bucket);
  }
  pushWindow(bucket.fails, now);
  pruneWindow(bucket.fails, CONFIG.loginWindowMs, now);
  if (bucket.fails.length >= CONFIG.loginMaxFails) {
    bucket.lockUntil = now + CONFIG.loginLockMs;
    recordViolation(ip, 3);
  }
}

function registerLoginSuccess(ip) {
  loginFails.delete(ip);
}

function createBodyParsers(express) {
  const jsonDefault = express.json({ limit: CONFIG.maxBodyDefault });
  const jsonLarge = express.json({ limit: CONFIG.maxBodyImport });
  const jsonChat = express.json({ limit: 1500000 });
  return function bodyParser(req, res, next) {
    if (req.method === "POST" && req.path === "/api/admin/games/import") {
      return jsonLarge(req, res, next);
    }
    if (
      req.method === "POST" &&
      (req.path === "/api/chat/lobby/messages" || /^\/api\/chat\/sessions\/[^/]+\/messages$/.test(req.path))
    ) {
      return jsonChat(req, res, next);
    }
    return jsonDefault(req, res, next);
  };
}

function cleanup() {
  const now = Date.now();
  ipState.forEach(function (rec, ip) {
    pruneWindow(rec.global, CONFIG.globalWindowMs, now);
    pruneWindow(rec.api, CONFIG.apiWindowMs, now);
    pruneWindow(rec.static, CONFIG.staticWindowMs, now);
    pruneWindow(rec.burst, CONFIG.burstWindowMs, now);
    pruneWindow(rec.violations, CONFIG.violationWindowMs, now);
    if (
      rec.bannedUntil < now &&
      !rec.global.length &&
      !rec.api.length &&
      !rec.static.length &&
      !rec.burst.length &&
      rec.concurrent === 0
    ) {
      ipState.delete(ip);
    }
  });
  loginFails.forEach(function (bucket, ip) {
    pruneWindow(bucket.fails, CONFIG.loginWindowMs, now);
    if (bucket.lockUntil < now && !bucket.fails.length) loginFails.delete(ip);
  });
  pruneWindow(totalRecent, 5000, now);
}

function attachSecurity(app, opts) {
  opts = Object.assign({}, DEFAULT_OPTS, opts || {});
  ipBlocksPath = path.join(opts.dataDir, "ip-blocks.json");
  readBlocksFile();

  if (opts.trustProxy) {
    app.set("trust proxy", process.env.RENDER || process.env.NODE_ENV === "production" ? true : 1);
  }
  app.disable("x-powered-by");

  app.use(securityHeaders);
  app.use(pathGuard);
  app.use(shield);
  app.use(createBodyParsers(require("express")));

  if (!cleanupTimer) {
    cleanupTimer = setInterval(cleanup, 60000);
    if (cleanupTimer.unref) cleanupTimer.unref();
  }

  return {
    apiRateLimit: apiRateLimit,
    staticRateLimit: staticRateLimit,
    adminLoginGuard: adminLoginGuard,
    registerLoginFailure: registerLoginFailure,
    registerLoginSuccess: registerLoginSuccess,
    getClientIp: getClientIp,
    isIpBanned: isIpBanned,
    banIp: banIp,
    blockIpPermanent: function (ip) {
      banIp(normalizeIp(ip), 0, true);
    },
    unblockIp: function (ip) {
      ip = normalizeIp(ip);
      permanentBlocks.delete(ip);
      saveBlocksFile();
      const rec = ipState.get(ip);
      if (rec) rec.bannedUntil = 0;
    },
    listBlockedIps: function () {
      const temp = [];
      ipState.forEach(function (rec, ip) {
        if (rec.bannedUntil > Date.now()) temp.push({ ip: ip, until: rec.bannedUntil, type: "temp" });
      });
      return {
        permanent: Array.from(permanentBlocks),
        temporary: temp,
        stressMode: stressMode,
      };
    },
    bindMongo: bindBlocksMongo,
  };
}

module.exports = { attachSecurity, CONFIG: CONFIG };
