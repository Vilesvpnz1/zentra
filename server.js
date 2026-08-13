require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const http = require("http");
const https = require("https");
const zlib = require("zlib");

express.static.mime.define({ "application/json": ["babylon"] });

const ROOT = __dirname;
const DEFAULT_DATA_DIR = path.join(ROOT, "data");
const DATA_DIR = path.resolve(
  String(process.env.DATA_DIR || process.env.KOBRAN_DATA_DIR || DEFAULT_DATA_DIR).trim() || DEFAULT_DATA_DIR
);
try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (e) {}
function seedPersistentDataDir() {
  if (path.resolve(DATA_DIR) === path.resolve(DEFAULT_DATA_DIR)) return;
  if (!fs.existsSync(DEFAULT_DATA_DIR)) return;
  var names;
  try {
    names = fs.readdirSync(DEFAULT_DATA_DIR);
  } catch (e) {
    return;
  }
  names.forEach(function (name) {
    if (!name || name === "." || name === "..") return;
    var from = path.join(DEFAULT_DATA_DIR, name);
    var to = path.join(DATA_DIR, name);
    try {
      if (!fs.statSync(from).isFile()) return;
      if (fs.existsSync(to)) return;
      fs.copyFileSync(from, to);
    } catch (e) {}
  });
}
seedPersistentDataDir();
const GAMES_PATH = path.join(ROOT, "games.json");
const THUMBS_DIR = (function () {
  var fromEnv = String(process.env.THUMBS_DIR || "").trim();
  if (fromEnv) return path.resolve(fromEnv);
  if (path.resolve(DATA_DIR) !== path.resolve(DEFAULT_DATA_DIR)) {
    return path.join(DATA_DIR, "thumbs");
  }
  return path.join(ROOT, "assets", "thumbs");
})();
try {
  fs.mkdirSync(THUMBS_DIR, { recursive: true });
} catch (e) {}
const MOVIES_CATALOG_PATH = path.join(ROOT, "movies-catalog.json");
const TV_CATALOG_PATH = path.join(ROOT, "tv-catalog.json");
const MUSIC_CATALOG_PATH = path.join(ROOT, "music-catalog.json");
const POSTER_CACHE_PATH = path.join(DATA_DIR, "poster-cache.json");
const OVERRIDES_PATH = path.join(DATA_DIR, "overrides.json");
const ANNOUNCEMENTS_PATH = path.join(DATA_DIR, "announcements.json");
const CHANGELOG_PATH = path.join(DATA_DIR, "changelog.json");
const CHANGELOG_SEED_PATH = path.join(ROOT, "changelog.seed.json");
const CHAT_PATH = path.join(DATA_DIR, "chat.json");
const BLACKLIST_PATH = path.join(DATA_DIR, "blacklist.json");
const ADMIN_KEY = String(process.env.ADMIN_KEY || "").trim();
const TMDB_API_KEY = String(process.env.TMDB_API_KEY || "").trim();
const SECRET_MENU_CODE = String(process.env.SECRET_MENU_CODE || "").trim();
const SECRET_MENU_SLUG = String(process.env.SECRET_MENU_SLUG || "code-37829767").trim();
const MAX_CHAT_MESSAGES = 400;
const PORT = process.env.PORT || 3080;
const OFFLINE_DIR = path.join(ROOT, "Offline-HTML-Games-Pack-master", "offline");
const IMPORTED_DIR = path.join(OFFLINE_DIR, "imported");
const { resolveLaunchTargets } = require("./launch-resolve");
const { createGameFrameHandler } = require("./game-frame-proxy");
const { createBrowseFrameHandler, createBrowseAssetHandler } = require("./browse-proxy");
const { attachSecurity } = require("./security");
const { attachApiTools } = require("./api-tools");
const { attachWallpaperApi } = require("./wallpaper-api");
const { attachSiteFeatures } = require("./site-features");
const { attachAiChat } = require("./ai-providers");
const { attachThumbHandler, buildThumbIndex } = require("./thumb-handler");
const { hasLikelyThumb, pickCoverUrl, reloadThumbMap } = require("./thumb-resolve");
const ubgStatic = require("./ubg-static");
const { createUserAuth } = require("./user-auth");
const { createChatStore } = require("./chat-store");
const { createChatHub } = require("./chat-hub");
const { createChatSessions } = require("./chat-sessions");
const { attachChatWebSocket } = require("./chat-ws");
const { createUserLibrary } = require("./user-library-store");
const { createFeaturedSchedule } = require("./featured-schedule");
const { createKritikalRaccoonAuth } = require("./lumina-raccoon-auth");
const { createKobranKeySystem } = require("./kobran-key-system");
const mongo = require("./mongo");
const siteMongo = mongo.createDocStore("site_content");

const app = express();
const sec = attachSecurity(app, { dataDir: DATA_DIR, trustProxy: true });
app.use("/api", sec.apiRateLimit);
const kobranKeys = createKobranKeySystem({
  root: ROOT,
  dataDir: DATA_DIR,
  getClientIp: function (req) {
    return sec.getClientIp(req);
  },
});

try {
  const { attachVisitLogger } = require("./visit-logger");
  attachVisitLogger(app, { getClientIp: sec.getClientIp });
} catch (e) {}

function readJson(filePath, fallback) {
  try {
    var text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function loadBaseGames() {
  return readJson(GAMES_PATH, []);
}

function loadOverrides() {
  return readJson(OVERRIDES_PATH, {});
}

function saveOverrides(obj) {
  writeJson(OVERRIDES_PATH, obj);
  siteMongo.save("overrides", obj || {});
  invalidateGamesApiCache();
}

function loadAnnouncements() {
  return readJson(ANNOUNCEMENTS_PATH, []);
}

function saveAnnouncements(list) {
  writeJson(ANNOUNCEMENTS_PATH, list);
  siteMongo.save("announcements", Array.isArray(list) ? list : []);
}

function loadChangelog() {
  const list = readJson(CHANGELOG_PATH, null);
  if (Array.isArray(list) && list.length) return list;
  const seed = readJson(CHANGELOG_SEED_PATH, []);
  return Array.isArray(seed) ? seed : [];
}

function saveChangelog(list) {
  writeJson(CHANGELOG_PATH, list);
  siteMongo.save("changelog", Array.isArray(list) ? list : []);
}

function saveBlacklistToDisk(arr) {
  writeJson(BLACKLIST_PATH, arr);
  siteMongo.save("blacklist", Array.isArray(arr) ? arr : []);
}

function saveGamesList(games) {
  writeJson(GAMES_PATH, games);
  fs.writeFileSync(path.join(ROOT, "games.js"), "window.KRITIKAL_GAMES=" + JSON.stringify(games) + ";", "utf8");
  siteMongo.save("games", Array.isArray(games) ? games : []);
  invalidateGamesApiCache();
}

async function bindSiteMongo(db) {
  return siteMongo.bind(db, [
    {
      id: "announcements",
      getLocal: function () {
        return loadAnnouncements();
      },
      hasLocal: function (data) {
        return Array.isArray(data) && data.length > 0;
      },
      hasRemote: function (data) {
        return Array.isArray(data) && data.length > 0;
      },
      applyRemote: function (data) {
        writeJson(ANNOUNCEMENTS_PATH, data);
      },
    },
    {
      id: "changelog",
      getLocal: function () {
        return loadChangelog();
      },
      hasLocal: function (data) {
        return Array.isArray(data) && data.length > 0;
      },
      hasRemote: function (data) {
        return Array.isArray(data) && data.length > 0;
      },
      applyRemote: function (data) {
        writeJson(CHANGELOG_PATH, data);
      },
    },
    {
      id: "overrides",
      getLocal: function () {
        return loadOverrides();
      },
      hasLocal: function (data) {
        return !!(data && typeof data === "object" && Object.keys(data).length);
      },
      hasRemote: function (data) {
        return !!(data && typeof data === "object" && Object.keys(data).length);
      },
      applyRemote: function (data) {
        writeJson(OVERRIDES_PATH, data);
        invalidateGamesApiCache();
      },
    },
    {
      id: "games",
      getLocal: function () {
        return loadBaseGames();
      },
      hasLocal: function (data) {
        return Array.isArray(data) && data.length > 0;
      },
      hasRemote: function (data) {
        return Array.isArray(data) && data.length > 0;
      },
      applyRemote: function (data) {
        writeJson(GAMES_PATH, data);
        fs.writeFileSync(path.join(ROOT, "games.js"), "window.KRITIKAL_GAMES=" + JSON.stringify(data) + ";", "utf8");
        invalidateGamesApiCache();
      },
    },
    {
      id: "blacklist",
      getLocal: function () {
        return loadBlacklistFromDisk();
      },
      hasLocal: function (data) {
        return Array.isArray(data) && data.length > 0;
      },
      hasRemote: function (data) {
        return Array.isArray(data) && data.length > 0;
      },
      applyRemote: function (data) {
        writeJson(BLACKLIST_PATH, data);
      },
    },
  ]);
}

let thumbFileIndex = buildThumbIndex(THUMBS_DIR);
let gamesApiJson = null;
let gamesApiGzip = null;
let gamesApiEtag = null;

function invalidateGamesApiCache() {
  gamesApiJson = null;
  gamesApiGzip = null;
  gamesApiEtag = null;
}

function refreshThumbIndex() {
  thumbFileIndex = buildThumbIndex(THUMBS_DIR);
  reloadThumbMap();
  invalidateGamesApiCache();
}

function localKobranCoverUrl(game) {
  const gamePath = String((game && game.path) || "");
  const m = gamePath.match(/^kritikal-UBG-main\/(gamefiles|refined-beta)\/([^/]+)\/index\.html$/i);
  if (!m) return "";
  const root = path.join(ROOT, "kritikal-UBG-main", m[1], m[2]);
  const names = ["cover.png", "cover.jpg", "cover.webp", "icon.png", "splash.png", "thumb.png", "logo.png"];
  for (let i = 0; i < names.length; i++) {
    const fp = path.join(root, names[i]);
    try {
      if (fs.existsSync(fp) && fs.statSync(fp).isFile() && fs.statSync(fp).size > 80) {
        return "/" + gamePath.replace(/\/index\.html$/i, "/" + names[i]);
      }
    } catch (e) {}
  }
  return "";
}

function thumbUrlForGame(game) {
  const id = String(game.id || "");
  const hit = thumbFileIndex.get(id);
  if (hit) return "/assets/thumbs/" + id + hit.ext;
  const localCover = localKobranCoverUrl(game);
  if (localCover) return localCover;
  const image = String(game.image || "").trim();
  if (image.startsWith("/assets/thumbs/")) return image;
  if (image.startsWith("assets/thumbs/")) return "/" + image;
  return "/assets/thumbs/" + encodeURIComponent(id) + ".png";
}

function buildGamesApiPayload() {
  return getMergedGames().map(function (game) {
    const hasThumb = !!thumbFileIndex.get(String(game.id || "")) || hasLikelyThumb(game);
    return {
      id: game.id,
      title: game.title,
      path: game.path,
      file: game.file,
      search: game.search,
      cover: thumbUrlForGame(game),
      hasThumb: hasThumb,
    };
  });
}

function getGamesApiJson() {
  if (!gamesApiJson) {
    gamesApiJson = JSON.stringify(buildGamesApiPayload());
    gamesApiEtag = '"' + crypto.createHash("md5").update(gamesApiJson).digest("hex") + '"';
    gamesApiGzip = null;
  }
  return gamesApiJson;
}

function getGamesApiGzip() {
  if (!gamesApiGzip) {
    gamesApiGzip = zlib.gzipSync(getGamesApiJson());
  }
  return gamesApiGzip;
}

function seedJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) writeJson(filePath, fallback);
}

seedJson(CHAT_PATH, { revision: 0, messagesByChannel: {} });
seedJson(BLACKLIST_PATH, []);
seedJson(CHANGELOG_PATH, []);

const chatHub = createChatHub({ dataDir: DATA_DIR });
const chatStore = createChatStore({ dataDir: DATA_DIR, maxMessages: MAX_CHAT_MESSAGES });
const chatSessions = createChatSessions({ dataDir: DATA_DIR });
const userLibrary = createUserLibrary({ dataDir: DATA_DIR });
const featuredSchedule = createFeaturedSchedule({ dataDir: DATA_DIR });
const slowModeLast = new Map();
const userAuth = createUserAuth({
  dataDir: DATA_DIR,
  chatHub: chatHub,
  onProfileUpdate: function (user) {
    chatStore.syncUserProfile(user.id, {
      name: user.displayName || user.username,
      avatar: user.avatar || "",
    });
  },
});
const kritikalRaccoonAuth = createKritikalRaccoonAuth({
  dataPath: path.join(DATA_DIR, "lumina-raccoon-accounts.json"),
});
kritikalRaccoonAuth.attach(app);
const chatRateBuckets = new Map();

function getPanelContext(req) {
  const user = userAuth.getSessionUser(req);
  if (!user) return null;
  const access = userAuth.getPanelAccess(user);
  if (!access) return null;
  return { user: user, access: access };
}

function denyInsufficient(res) {
  return res.status(403).json({
    error: "insufficient_permissions",
    message: "insufficient permissions loser",
  });
}

function requirePanelChat(req, res, next) {
  const ctx = getPanelContext(req);
  if (!ctx) return res.status(401).json({ error: "login_required" });
  req.panelUser = ctx.user;
  req.panelAccess = ctx.access;
  next();
}

function requirePanelFull(req, res, next) {
  const ctx = getPanelContext(req);
  if (!ctx) return res.status(401).json({ error: "login_required" });
  if (ctx.access.level !== "full") return denyInsufficient(res);
  req.panelUser = ctx.user;
  req.panelAccess = ctx.access;
  next();
}

function requirePanelMod(req, res, next) {
  const ctx = getPanelContext(req);
  if (!ctx) return res.status(401).json({ error: "login_required" });
  req.panelUser = ctx.user;
  req.panelAccess = ctx.access;
  next();
}

function requireChannelPanel(req, res, channelId) {
  const ch = chatStore.getChannel(channelId);
  if (!ch) {
    res.status(404).json({ error: "not_found" });
    return false;
  }
  if (!chatStore.canRead(ch, req.panelUser)) {
    denyInsufficient(res);
    return false;
  }
  return true;
}

const requireAuth = requirePanelFull;

function normalizeAuthorKey(value) {
  const s = String(value || "").trim();
  if (!s || s.length > 120) return "";
  return s;
}

function normalizeChatName(value) {
  return String(value || "")
    .trim()
    .slice(0, 40);
}

function normalizeChatText(value) {
  return String(value || "")
    .trim()
    .slice(0, 500);
}

function normalizeHwid(value) {
  return String(value || "")
    .trim()
    .slice(0, 160);
}

function getDeviceHwid(req) {
  return (
    normalizeHwid(req.headers["x-device-hwid"]) ||
    normalizeHwid(req.body && req.body.deviceHwid) ||
    normalizeHwid(req.query && req.query.deviceHwid)
  );
}

function loadBlacklistFromDisk() {
  const data = readJson(BLACKLIST_PATH, []);
  if (!Array.isArray(data)) return [];
  return data
    .map(function (row) {
      return {
        hwid: normalizeHwid(row && row.hwid),
        chatBlocked: Boolean(row && row.chatBlocked),
        siteBlocked: Boolean(row && row.siteBlocked),
        updatedTs:
          typeof (row && row.updatedTs) === "number" && Number.isFinite(row.updatedTs)
            ? row.updatedTs
            : Date.now(),
      };
    })
    .filter(function (row) {
      return row.hwid;
    });
}

function getBlacklistState(hwid) {
  if (!hwid) return { chatBlocked: false, siteBlocked: false };
  const row = loadBlacklistFromDisk().find(function (x) {
    return x.hwid === hwid;
  });
  if (!row) return { chatBlocked: false, siteBlocked: false };
  return {
    chatBlocked: Boolean(row.chatBlocked),
    siteBlocked: Boolean(row.siteBlocked),
  };
}

function slowModeOk(userId, seconds) {
  if (!userId || !seconds) return { ok: true };
  const last = slowModeLast.get(userId) || 0;
  const now = Date.now();
  const wait = seconds * 1000 - (now - last);
  if (wait > 0) return { ok: false, retryAfterSeconds: Math.ceil(wait / 1000) };
  return { ok: true };
}

function markSlowMode(userId) {
  if (!userId) return;
  slowModeLast.set(userId, Date.now());
}

function chatRateLimitOk(userId) {
  const now = Date.now();
  const windowMs = 60000;
  const max = 20;
  let arr = chatRateBuckets.get(userId);
  if (!arr) return true;
  while (arr.length && arr[0] < now - windowMs) arr.shift();
  return arr.length < max;
}

function markChatRate(userId) {
  const now = Date.now();
  const windowMs = 60000;
  let arr = chatRateBuckets.get(userId);
  if (!arr) {
    arr = [];
    chatRateBuckets.set(userId, arr);
  }
  while (arr.length && arr[0] < now - windowMs) arr.shift();
  arr.push(now);
}

function denyIfSiteBlocked(req, res, next) {
  if (getBlacklistState(getDeviceHwid(req)).siteBlocked) {
    return res.status(403).json({ error: "site_blocked" });
  }
  next();
}

function denyIfChatBlocked(req, res, next) {
  const state = getBlacklistState(getDeviceHwid(req));
  if (state.siteBlocked) return res.status(403).json({ error: "site_blocked" });
  if (state.chatBlocked) return res.status(403).json({ error: "chat_blocked" });
  next();
}

function mergeGame(base, override) {
  if (!override) return Object.assign({}, base);
  const merged = Object.assign({}, base, override);
  merged.id = base.id;
  return merged;
}

function getMergedGames() {
  const base = loadBaseGames();
  const overrides = loadOverrides();
  return base.map(function (g) {
    return mergeGame(g, overrides[g.id]);
  });
}

function buildSearch(game) {
  return [game.id, game.title, game.file, game.path]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function slugId(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "game";
}

function titleFromHtml(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : "";
}

function uniqueGameId(base, games) {
  let id = slugId(base);
  const ids = new Set(games.map(function (g) {
    return g.id;
  }));
  if (!ids.has(id)) return id;
  let n = 2;
  while (ids.has(id + "-" + n)) n++;
  return id + "-" + n;
}

function resolveImportedGamePath(game) {
  if (!game || !game.file) return null;
  const file = String(game.file).replace(/\\/g, "/");
  if (!file.startsWith("imported/")) return null;
  const base = path.basename(file);
  if (!/^[a-z0-9-]+\.html$/i.test(base)) return null;
  const fp = path.join(IMPORTED_DIR, base);
  const resolved = path.resolve(fp);
  const root = path.resolve(IMPORTED_DIR);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) return null;
  return resolved;
}

function removeImportedGameFile(game) {
  const fp = resolveImportedGamePath(game);
  if (!fp || !fs.existsSync(fp)) return;
  try {
    fs.unlinkSync(fp);
  } catch (e) {}
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(";").forEach(function (part) {
    const i = part.indexOf("=");
    if (i === -1) return;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    out[k] = decodeURIComponent(v);
  });
  return out;
}

userAuth.attachRoutes(app);

app.use("/api/", function (req, res, next) {
  const p = String(req.path || "");
  if (
    p.startsWith("/admin/") ||
    p === "/block-status" ||
    p.startsWith("/chat/") ||
    p.startsWith("/auth/")
  ) {
    return next();
  }
  denyIfSiteBlocked(req, res, next);
});

app.get("/api/block-status", function (req, res) {
  const hwid = getDeviceHwid(req);
  const state = getBlacklistState(hwid);
  res.json({
    hwid: hwid,
    chatBlocked: Boolean(state.chatBlocked),
    siteBlocked: Boolean(state.siteBlocked),
  });
});

function setKobranKeyCors(req, res) {
  var origin = String((req && req.headers && req.headers.origin) || "").trim();
  if (
    origin === "https://kobran.flashhub.net" ||
    origin === "https://zentra-mhkl.onrender.com" ||
    /^https?:\/\/localhost(?::\d+)?$/i.test(origin) ||
    /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i.test(origin)
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Device-Hwid");
  res.setHeader("Vary", "Origin");
}

function publicOrigin(req) {
  var fromQuery = String((req.query && req.query.origin) || "").trim();
  if (/^https?:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(fromQuery)) return fromQuery.replace(/\/$/, "");
  var host = String(req.headers["x-forwarded-host"] || req.headers.host || "")
    .split(",")[0]
    .trim();
  if (!host) return "";
  var proto = String(req.headers["x-forwarded-proto"] || "https")
    .split(",")[0]
    .trim();
  if (proto !== "http" && proto !== "https") proto = "https";
  return proto + "://" + host;
}

function startKobranKey(req, res) {
  setKobranKeyCors(req, res);
  try {
    const result = kobranKeys.startClaim(sec.getClientIp(req), res, publicOrigin(req));
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  } catch (e) {
    if (!res.headersSent) {
      res.status(500).json({ ok: false, error: "start_failed", message: "couldnt start key gen." });
    }
  }
}

app.options("/api/kobran/key/config", function (req, res) {
  setKobranKeyCors(req, res);
  res.status(204).end();
});

app.get("/api/kobran/key/config", function (req, res) {
  setKobranKeyCors(req, res);
  res.json(kobranKeys.getPublicConfig());
});

app.options("/api/kobran/key/start", function (req, res) {
  setKobranKeyCors(req, res);
  res.status(204).end();
});
app.get("/api/kobran/key/start", startKobranKey);
app.post("/api/kobran/key/start", startKobranKey);

app.get("/api/kobran/key/complete", function (req, res) {
  Promise.resolve(kobranKeys.completeClaim(req, res)).catch(function () {
    if (!res.headersSent) res.redirect(302, "/kobranhub/?keyerr=verify#key");
  });
});

app.options("/api/kobran/key/claim", function (req, res) {
  setKobranKeyCors(req, res);
  res.status(204).end();
});

app.post("/api/kobran/key/claim", function (req, res) {
  setKobranKeyCors(req, res);
  const claimId = req.body && req.body.claimId;
  const token = req.body && req.body.token;
  const result = kobranKeys.claimKey(claimId, token);
  if (!result.ok) {
    return res.status(400).json(result);
  }
  kobranKeys.clearClaimCookie(res);
  res.json(result);
});

function sendKobranValidate(req, res) {
  const key =
    (req.body && req.body.key) ||
    (req.query && req.query.key) ||
    "";
  const hwid =
    (req.body && (req.body.hwid || req.body.deviceHwid)) ||
    (req.query && (req.query.hwid || req.query.deviceHwid)) ||
    getDeviceHwid(req) ||
    "";
  const result = kobranKeys.validateKey({
    key: key,
    hwid: hwid,
    ip: sec.getClientIp(req),
  });
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Device-Hwid");
  if (!result.ok) {
    var status = 400;
    if (result.error === "invalid" || result.error === "expired") status = 403;
    if (result.error === "hwid_mismatch") status = 403;
    return res.status(status).json(result);
  }
  res.json(result);
}

app.options("/api/kobran/key/validate", function (req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Device-Hwid");
  res.status(204).end();
});

app.get("/api/kobran/key/validate", sendKobranValidate);
app.post("/api/kobran/key/validate", sendKobranValidate);

app.get("/api/admin/kobran-hub", requireAuth, function (req, res) {
  res.json(kobranKeys.getAdminSnapshot());
});

app.post("/api/admin/kobran-hub/settings", requireAuth, function (req, res) {
  const result = kobranKeys.updateSettingsAdmin(req.body || {});
  if (!result.ok) return res.status(400).json(result);
  res.json(result);
});

app.post("/api/admin/kobran-hub/keys", requireAuth, function (req, res) {
  const result = kobranKeys.createKeyAdmin(req.body || {});
  if (!result.ok) return res.status(400).json(result);
  res.json(result);
});

app.get("/api/admin/kobran-hub/keys/export", requireAuth, function (req, res) {
  try {
    const result = kobranKeys.exportKeysAdmin();
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="kobran-hub-keys-' + Date.now() + '.json"'
    );
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: "export_failed", message: "couldnt export keys." });
  }
});

app.post("/api/admin/kobran-hub/keys/import", requireAuth, function (req, res) {
  try {
    const result = kobranKeys.importKeysAdmin(req.body || {});
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: "import_failed", message: "couldnt import keys." });
  }
});

app.put("/api/admin/kobran-hub/keys/:id", requireAuth, function (req, res) {
  const result = kobranKeys.updateKeyAdmin(req.params.id, req.body || {});
  if (!result.ok) {
    if (result.error === "not_found") return res.status(404).json(result);
    return res.status(400).json(result);
  }
  res.json(result);
});

app.delete("/api/admin/kobran-hub/keys/:id", requireAuth, function (req, res) {
  const result = kobranKeys.deleteKeyAdmin(req.params.id);
  if (!result.ok) return res.status(404).json(result);
  res.json(result);
});

app.get("/api/chat/channels", denyIfChatBlocked, function (req, res) {
  const user = userAuth.getSessionUser(req);
  res.json(chatStore.listChannels(user));
});

app.get("/api/chat/channels/:channelId/messages", denyIfChatBlocked, function (req, res) {
  const channelId = String(req.params.channelId || "").trim();
  const channel = chatStore.getChannel(channelId);
  const user = userAuth.getSessionUser(req);
  if (!channel || !chatStore.canRead(channel, user)) {
    return res.status(404).json({ error: "not_found" });
  }
  const clientRev = req.query && req.query.rev;
  const canManage = user && chatHub.userCan(user, "manageMessages");
  const serverCfg = chatHub.getServer();
  const pack = chatStore.getMessages(
    channelId,
    user && user.id,
    clientRev,
    canManage,
    serverCfg.pinnedMessageId
  );
  res.setHeader("X-Chat-Revision", String(pack.revision));
  if (pack.unchanged) return res.status(204).end();
  res.json({ messages: pack.messages, pinned: pack.pinned || null });
});

app.post("/api/chat/channels/:channelId/messages", denyIfChatBlocked, userAuth.requireUser, function (req, res) {
  const channelId = String(req.params.channelId || "").trim();
  const user = userAuth.getSessionUser(req);
  const text = normalizeChatText(req.body && req.body.text);
  if (!text) return res.status(400).json({ error: "missing_fields" });
  if (!chatHub.userCan(user, "sendMessages")) {
    return res.status(403).json({ error: "forbidden" });
  }
  if (chatHub.isMuted(user.id)) {
    return res.status(403).json({ error: "muted" });
  }
  const slowCfg = chatHub.getServer();
  const slowCheck = slowModeOk(user.id, Number(slowCfg.slowModeSeconds) || 0);
  if (!slowCheck.ok) {
    return res.status(429).json({ error: "slow_mode", retryAfterSeconds: slowCheck.retryAfterSeconds });
  }
  if (!chatRateLimitOk(user.id)) {
    return res.status(429).json({ error: "rate_limited", retryAfterSeconds: 60 });
  }
  const result = chatStore.addMessage(channelId, user, text, getDeviceHwid(req));
  if (result.error === "not_found") return res.status(404).json({ error: "not_found" });
  if (result.error === "forbidden") return res.status(403).json({ error: "forbidden" });
  if (result.error === "empty") return res.status(400).json({ error: "empty" });
  markChatRate(user.id);
  markSlowMode(user.id);
  res.setHeader("X-Chat-Revision", String(chatStore.revision()));
  res.status(201).json({ id: result.message.id, ts: result.message.ts });
});

app.delete("/api/chat/channels/:channelId/messages/:id", denyIfChatBlocked, userAuth.requireUser, function (req, res) {
  const user = userAuth.getSessionUser(req);
  const channelId = String(req.params.channelId || "").trim();
  const id = String(req.params.id || "").trim();
  let result = chatStore.deleteMessage(channelId, id, user);
  if (result.error === "forbidden" && chatHub.userCan(user, "manageMessages")) {
    result = chatStore.adminDeleteMessage(channelId, id);
  }
  if (result.error === "not_found") return res.status(404).json({ error: "not_found" });
  if (result.error === "forbidden") return res.status(403).json({ error: "forbidden" });
  res.setHeader("X-Chat-Revision", String(chatStore.revision()));
  res.json({ ok: true });
});

app.get("/api/chat/settings", denyIfChatBlocked, function (req, res) {
  res.json(chatHub.getServerPublic());
});

app.get("/api/chat/server", denyIfChatBlocked, function (req, res) {
  res.json(chatHub.getServerPublic());
});

app.get("/api/chat/online", denyIfChatBlocked, function (req, res) {
  res.json(chatHub.listOnline());
});

app.post("/api/chat/presence", denyIfChatBlocked, function (req, res) {
  const user = userAuth.getSessionUser(req);
  if (user) chatHub.touchPresence(user);
  res.json({ ok: true, authed: !!user, online: chatHub.listOnline().length });
});

app.get("/api/chat/lobby/messages", denyIfChatBlocked, userAuth.requireUser, function (req, res) {
  res.json(chatSessions.getLobbyMessages(100));
});

app.post("/api/chat/lobby/messages", denyIfChatBlocked, userAuth.requireUser, function (req, res) {
  const user = userAuth.getSessionUser(req);
  if (!chatRateLimitOk(user.id)) {
    return res.status(429).json({ error: "rate_limited" });
  }
  const result = chatSessions.addLobbyMessage(user, (req.body || {}).text, (req.body || {}).image);
  if (result.error) return res.status(400).json({ error: result.error });
  markChatRate(user.id);
  res.json(result);
});

app.post("/api/chat/sessions", denyIfChatBlocked, userAuth.requireUser, function (req, res) {
  const user = userAuth.getSessionUser(req);
  const result = chatSessions.createSession(user, (req.body || {}).mode);
  res.json(result);
});

app.post("/api/chat/sessions/join", denyIfChatBlocked, userAuth.requireUser, function (req, res) {
  const user = userAuth.getSessionUser(req);
  const result = chatSessions.joinSession((req.body || {}).code, user);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
});

app.post("/api/chat/sessions/leave", denyIfChatBlocked, userAuth.requireUser, function (req, res) {
  const user = userAuth.getSessionUser(req);
  const sessionId = String((req.body || {}).sessionId || "");
  const result = chatSessions.leaveSession(sessionId, user.id);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
});

app.post("/api/chat/sessions/end", denyIfChatBlocked, userAuth.requireUser, function (req, res) {
  const user = userAuth.getSessionUser(req);
  const sessionId = String((req.body || {}).sessionId || "");
  const result = chatSessions.endSession(sessionId, user.id);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
});

app.get("/api/chat/sessions/:id", denyIfChatBlocked, userAuth.requireUser, function (req, res) {
  const user = userAuth.getSessionUser(req);
  const result = chatSessions.getSessionMessages(String(req.params.id || ""), user.id);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
});

app.post("/api/chat/sessions/:id/messages", denyIfChatBlocked, userAuth.requireUser, function (req, res) {
  const user = userAuth.getSessionUser(req);
  if (!chatRateLimitOk(user.id)) {
    return res.status(429).json({ error: "rate_limited" });
  }
  const result = chatSessions.addSessionMessage(String(req.params.id || ""), user, (req.body || {}).text, (req.body || {}).image);
  if (result.error) return res.status(400).json({ error: result.error });
  markChatRate(user.id);
  res.json(result);
});

app.get("/api/user/library", function (req, res) {
  const user = userAuth.getSessionUser(req);
  if (!user) return res.json({ favorites: [], recent: [], authed: false });
  const lib = userLibrary.getLibrary(user.id);
  res.json({ favorites: lib.favorites, recent: lib.recent, authed: true });
});

app.post("/api/user/library/favorite", userAuth.requireUser, function (req, res) {
  const user = userAuth.getSessionUser(req);
  const gameId = req.body && req.body.gameId;
  const result = userLibrary.toggleFavorite(user.id, gameId);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
});

app.post("/api/user/library/recent", userAuth.requireUser, function (req, res) {
  const user = userAuth.getSessionUser(req);
  const gameId = req.body && req.body.gameId;
  const result = userLibrary.pushRecent(user.id, gameId);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
});

app.put("/api/user/library", userAuth.requireUser, function (req, res) {
  const user = userAuth.getSessionUser(req);
  const result = userLibrary.mergeLibrary(user.id, req.body || {});
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
});

app.get("/api/featured/game", function (req, res) {
  const active = featuredSchedule.activeAt(Date.now());
  if (active) {
    return res.json({ scheduled: true, gameId: active.gameId, label: active.label || "", startAt: active.startAt, endAt: active.endAt });
  }
  res.json({ scheduled: false });
});

app.get("/api/games", function (req, res) {
  getGamesApiJson();
  if (gamesApiEtag && req.headers["if-none-match"] === gamesApiEtag) {
    res.status(304).end();
    return;
  }
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=600, stale-while-revalidate=3600");
  if (gamesApiEtag) res.setHeader("ETag", gamesApiEtag);
  const accept = String(req.headers["accept-encoding"] || "");
  if (accept.includes("gzip")) {
    res.setHeader("Content-Encoding", "gzip");
    res.setHeader("Vary", "Accept-Encoding");
    res.send(getGamesApiGzip());
    return;
  }
  res.send(getGamesApiJson());
});

function audiusRequest(apiPath, query, res) {
  var qs = query && Object.keys(query).length ? "?" + new URLSearchParams(query).toString() : "";
  var url = "https://discoveryprovider.audius.co/v1" + apiPath + qs;
  https
    .get(url, { headers: { Accept: "application/json", "User-Agent": "Kobran/1.0" } }, function (upstream) {
      var chunks = [];
      upstream.on("data", function (chunk) {
        chunks.push(chunk);
      });
      upstream.on("end", function () {
        res.status(upstream.statusCode || 502);
        res.setHeader("Content-Type", "application/json");
        res.send(Buffer.concat(chunks));
      });
    })
    .on("error", function () {
      res.status(502).json({ error: "Music service unavailable" });
    });
}

function audiusFetchJson(apiPath, query) {
  return new Promise(function (resolve, reject) {
    var qs = query && Object.keys(query).length ? "?" + new URLSearchParams(query).toString() : "";
    var url = "https://discoveryprovider.audius.co/v1" + apiPath + qs;
    https
      .get(url, { headers: { Accept: "application/json", "User-Agent": "Kobran/1.0" } }, function (upstream) {
        var chunks = [];
        upstream.on("data", function (chunk) {
          chunks.push(chunk);
        });
        upstream.on("end", function () {
          try {
            var parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            if (upstream.statusCode && upstream.statusCode >= 400) reject(new Error("upstream"));
            else resolve(parsed);
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("error", reject);
  });
}

function dedupeTracks(list) {
  var seen = {};
  var out = [];
  (list || []).forEach(function (track) {
    if (!track || track.id == null || seen[String(track.id)]) return;
    seen[String(track.id)] = true;
    out.push(track);
  });
  return out;
}

function httpsFetchJson(url, redirectCount) {
  redirectCount = redirectCount || 0;
  return new Promise(function (resolve, reject) {
    https
      .get(url, { headers: { Accept: "application/json", "User-Agent": "Kobran/1.0" } }, function (upstream) {
        if (
          redirectCount < 5 &&
          upstream.statusCode &&
          [301, 302, 307, 308].indexOf(upstream.statusCode) !== -1 &&
          upstream.headers.location
        ) {
          var next = upstream.headers.location;
          if (next.indexOf("http") !== 0) {
            try {
              next = new URL(next, url).href;
            } catch (e) {
              return reject(e);
            }
          }
          upstream.resume();
          return httpsFetchJson(next, redirectCount + 1).then(resolve).catch(reject);
        }
        var chunks = [];
        upstream.on("data", function (chunk) {
          chunks.push(chunk);
        });
        upstream.on("end", function () {
          try {
            var parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            if (upstream.statusCode && upstream.statusCode >= 400) reject(new Error("upstream"));
            else resolve(parsed);
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("error", reject);
  });
}

function httpsFetchText(url, redirectCount) {
  redirectCount = redirectCount || 0;
  return new Promise(function (resolve, reject) {
    https
      .get(
        url,
        {
          headers: {
            Accept: "text/html,application/json,*/*",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          },
        },
        function (upstream) {
          if (
            redirectCount < 5 &&
            upstream.statusCode &&
            [301, 302, 307, 308].indexOf(upstream.statusCode) !== -1 &&
            upstream.headers.location
          ) {
            var next = upstream.headers.location;
            if (next.indexOf("http") !== 0) {
              try {
                next = new URL(next, url).href;
              } catch (e) {
                return reject(e);
              }
            }
            upstream.resume();
            return httpsFetchText(next, redirectCount + 1).then(resolve).catch(reject);
          }
          var chunks = [];
          upstream.on("data", function (chunk) {
            chunks.push(chunk);
          });
          upstream.on("end", function () {
            if (upstream.statusCode && upstream.statusCode >= 400) reject(new Error("upstream"));
            else resolve(Buffer.concat(chunks).toString("utf8"));
          });
        }
      )
      .on("error", reject);
  });
}

var AUDIUS_GENRES = [
  "Electronic",
  "Hip-Hop",
  "Pop",
  "Rock",
  "R&B",
  "Alternative",
  "Country",
  "Latin",
  "Jazz",
  "Classical",
  "Soul",
  "Metal",
  "Folk",
  "Blues",
  "Soundtrack",
  "Lo-Fi",
  "House",
  "Techno",
  "Trap",
  "Indie",
  "Dance",
  "Ambient",
  "Disco",
  "Reggae",
  "Punk",
  "Afrobeats",
  "K-Pop",
  "Gospel",
  "Drum & Bass",
  "Trance",
];

var ARCHIVE_QUERIES = [
  "collection:etree AND mediatype:audio",
  "collection:netlabels AND mediatype:audio",
  "collection:opensource_audio",
  "mediatype:audio AND format:(MP3) AND downloads:[100 TO *]",
  "collection:folkscanomy_music AND mediatype:audio",
  "collection:78rpm AND mediatype:audio",
  "mediatype:audio AND \"live concert\"",
  "mediatype:audio AND \"full album\"",
  "collection:audio_bookspoetry AND mediatype:audio",
  "mediatype:audio AND subject:(rock OR pop OR jazz OR blues OR metal)",
];

function fetchAudiusQuickFeed() {
  return Promise.all([
    audiusFetchJson("/tracks/trending", { limit: "100", app_name: "Kobran" }),
    audiusFetchJson("/tracks/trending/underground", { limit: "100", app_name: "Kobran" }).catch(function () {
      return { data: [] };
    }),
  ]).then(function (results) {
    var merged = [];
    results.forEach(function (payload) {
      if (payload && Array.isArray(payload.data)) merged = merged.concat(payload.data);
    });
    return merged;
  });
}

function fetchAudiusMegaFeed() {
  var jobs = [
    audiusFetchJson("/tracks/trending", { limit: "100", app_name: "Kobran" }),
    audiusFetchJson("/tracks/trending/underground", { limit: "100", app_name: "Kobran" }).catch(function () {
      return { data: [] };
    }),
    audiusFetchJson("/playlists/trending", { limit: "50", app_name: "Kobran" }).catch(function () {
      return { data: [] };
    }),
  ];
  AUDIUS_GENRES.forEach(function (genre) {
    jobs.push(
      audiusFetchJson("/tracks/trending", { limit: "50", genre: genre, app_name: "Kobran" }).catch(function () {
        return { data: [] };
      })
    );
  });
  return Promise.all(jobs).then(function (results) {
    var merged = [];
    var playlistJobs = [];
    results.forEach(function (payload, idx) {
      if (!payload || !Array.isArray(payload.data)) return;
      if (idx === 2) {
        payload.data.slice(0, 30).forEach(function (playlist) {
          if (!playlist || playlist.id == null) return;
          playlistJobs.push(
            audiusFetchJson("/playlists/" + encodeURIComponent(String(playlist.id)) + "/tracks", {
              limit: "35",
              app_name: "Kobran",
            }).catch(function () {
              return { data: [] };
            })
          );
        });
        return;
      }
      merged = merged.concat(payload.data);
    });
    if (!playlistJobs.length) return merged;
    return Promise.all(playlistJobs).then(function (playlistResults) {
      playlistResults.forEach(function (payload) {
        if (payload && Array.isArray(payload.data)) merged = merged.concat(payload.data);
      });
      return merged;
    });
  });
}

function fetchAudiusOffsetFeed(page) {
  var offset = String(Math.max(page, 1) * 100);
  var jobs = [
    audiusFetchJson("/tracks/trending", { limit: "100", offset: offset, app_name: "Kobran" }).catch(function () {
      return { data: [] };
    }),
    audiusFetchJson("/tracks/trending/underground", { limit: "100", offset: offset, app_name: "Kobran" }).catch(function () {
      return { data: [] };
    }),
  ];
  var genres = AUDIUS_GENRES.slice((page * 5) % AUDIUS_GENRES.length, ((page * 5) % AUDIUS_GENRES.length) + 8);
  genres.forEach(function (genre) {
    jobs.push(
      audiusFetchJson("/tracks/trending", {
        limit: "40",
        offset: String(Math.max(page - 1, 0) * 40),
        genre: genre,
        app_name: "Kobran",
      }).catch(function () {
        return { data: [] };
      })
    );
  });
  return Promise.all(jobs).then(function (results) {
    var merged = [];
    results.forEach(function (payload) {
      if (payload && Array.isArray(payload.data)) merged = merged.concat(payload.data);
    });
    return merged;
  });
}

function archiveMetadataTracks(identifier, title, creator) {
  return httpsFetchJson("https://archive.org/metadata/" + encodeURIComponent(identifier))
    .then(function (meta) {
      var files = (meta.files || []).filter(function (file) {
        if (!file || !file.name) return false;
        if (/\.(torrent|xml|png|jpe?g|gif|sqlite|log|cue|sfv|ffp|md5)$/i.test(file.name)) return false;
        return file.format === "VBR MP3" || file.format === "MP3" || /\.mp3$/i.test(file.name);
      });
      return files.slice(0, 3).map(function (file) {
        return {
          id: "archive:" + identifier + "::" + file.name,
          title: title || identifier,
          user: { name: creator || "Internet Archive" },
          artwork: { "480x480": "https://archive.org/services/img/" + identifier },
          duration: Math.round((parseFloat(file.length) || 0) * 1000),
          _source: "archive",
        };
      });
    })
    .catch(function () {
      return [];
    });
}

function fetchArchiveTracks(page, query) {
  var q = query || ARCHIVE_QUERIES[page % ARCHIVE_QUERIES.length];
  var archivePage = Math.floor(page / ARCHIVE_QUERIES.length) + 1;
  var url =
    "https://archive.org/advancedsearch.php?q=" +
    encodeURIComponent(q) +
    "&fl[]=identifier,title,creator&rows=28&page=" +
    archivePage +
    "&output=json";
  return httpsFetchJson(url)
    .then(function (payload) {
      var docs = payload && payload.response && Array.isArray(payload.response.docs) ? payload.response.docs : [];
      return Promise.all(
        docs.slice(0, 22).map(function (doc) {
          return archiveMetadataTracks(doc.identifier, doc.title, doc.creator);
        })
      ).then(function (groups) {
        var merged = [];
        groups.forEach(function (group) {
          merged = merged.concat(group);
        });
        return merged;
      });
    })
    .catch(function () {
      return [];
    });
}

function searchArchiveTracks(query, page) {
  var q = "mediatype:audio AND (" + query + ")";
  var url =
    "https://archive.org/advancedsearch.php?q=" +
    encodeURIComponent(q) +
    "&fl[]=identifier,title,creator&rows=24&page=" +
    (page + 1) +
    "&output=json";
  return httpsFetchJson(url)
    .then(function (payload) {
      var docs = payload && payload.response && Array.isArray(payload.response.docs) ? payload.response.docs : [];
      return Promise.all(
        docs.slice(0, 18).map(function (doc) {
          return archiveMetadataTracks(doc.identifier, doc.title, doc.creator);
        })
      ).then(function (groups) {
        var merged = [];
        groups.forEach(function (group) {
          merged = merged.concat(group);
        });
        return merged;
      });
    })
    .catch(function () {
      return [];
    });
}

var cachedMoviesCatalog = null;
var cachedTvCatalog = null;
var cachedMusicCatalog = null;
var moviesCatalogMtime = 0;
var tvCatalogMtime = 0;
var musicCatalogMtime = 0;
var musicFeedCache = { payload: null, at: 0 };
var MUSIC_FEED_CACHE_MS = 300000;

function getMusicCatalog() {
  try {
    var stat = fs.statSync(MUSIC_CATALOG_PATH);
    if (!cachedMusicCatalog || stat.mtimeMs !== musicCatalogMtime) {
      cachedMusicCatalog = readJson(MUSIC_CATALOG_PATH, []);
      musicCatalogMtime = stat.mtimeMs;
    }
  } catch (e) {
  if (!cachedMusicCatalog) cachedMusicCatalog = readJson(MUSIC_CATALOG_PATH, []);
  }
  return cachedMusicCatalog;
}

function getTvCatalog() {
  try {
    var stat = fs.statSync(TV_CATALOG_PATH);
    if (!cachedTvCatalog || stat.mtimeMs !== tvCatalogMtime) {
      cachedTvCatalog = readJson(TV_CATALOG_PATH, []);
      tvCatalogMtime = stat.mtimeMs;
    }
  } catch (e) {
  if (!cachedTvCatalog) cachedTvCatalog = readJson(TV_CATALOG_PATH, []);
  }
  return cachedTvCatalog;
}

function getMoviesCatalog() {
  try {
    var stat = fs.statSync(MOVIES_CATALOG_PATH);
    if (!cachedMoviesCatalog || stat.mtimeMs !== moviesCatalogMtime) {
      cachedMoviesCatalog = readJson(MOVIES_CATALOG_PATH, []);
      moviesCatalogMtime = stat.mtimeMs;
    }
  } catch (e) {
    if (!cachedMoviesCatalog) cachedMoviesCatalog = readJson(MOVIES_CATALOG_PATH, []);
  }
  return cachedMoviesCatalog;
}

function mapTmdbSearchItem(item) {
  if (!item || !item.id) return null;
  if (item.media_type === "movie") {
    return {
      id: item.id,
      title: item.title || item.name || "Movie",
      year: item.release_date ? String(item.release_date).slice(0, 4) : "",
      poster: item.poster_path ? String(item.poster_path).replace(/^\/+/, "") : "",
      type: "movie",
    };
  }
  if (item.media_type === "tv") {
    return {
      id: item.id,
      title: item.name || item.title || "TV Show",
      year: item.first_air_date ? String(item.first_air_date).slice(0, 4) : "",
      poster: item.poster_path ? String(item.poster_path).replace(/^\/+/, "") : "",
      type: "tv",
    };
  }
  return null;
}

function filterCatalogByQuery(items, q, defaultType) {
  if (!q) return items.slice();
  var needle = q.toLowerCase();
  return items.filter(function (item) {
    if (!item) return false;
    return (
      String(item.title || "")
        .toLowerCase()
        .indexOf(needle) !== -1 ||
      String(item.id).indexOf(needle) !== -1 ||
      String(item.year || "").indexOf(needle) !== -1
    );
  }).map(function (item) {
    return Object.assign({ type: item.type || defaultType || "movie" }, item);
  });
}

function dedupeMediaList(list) {
  var seen = {};
  var out = [];
  list.forEach(function (item) {
    if (!item || item.id == null) return;
    var key = String(item.type || "movie") + ":" + String(item.id);
    if (seen[key]) return;
    seen[key] = true;
    out.push(item);
  });
  return out;
}

var posterCache = readJson(POSTER_CACHE_PATH, {});
var posterPending = {};
var posterScrapeQueue = [];
var posterScrapeActive = 0;
var POSTER_SCRAPE_MAX = 5;
var posterScrapeDelay = 0;

function drainPosterScrapeQueue() {
  while (posterScrapeActive < POSTER_SCRAPE_MAX && posterScrapeQueue.length) {
    var job = posterScrapeQueue.shift();
    posterScrapeActive++;
    var wait = Math.max(0, job.runAt - Date.now());
    setTimeout(function () {
      scrapeTmdbPoster(job.type, job.id)
        .then(function (poster) {
          job.resolve(poster);
        })
        .catch(function (err) {
          job.reject(err);
        })
        .finally(function () {
          posterScrapeActive--;
          drainPosterScrapeQueue();
        });
    }, wait);
  }
}

function queueScrapePoster(type, id) {
  return new Promise(function (resolve, reject) {
    posterScrapeDelay += 220;
    posterScrapeQueue.push({
      type: type,
      id: id,
      resolve: resolve,
      reject: reject,
      runAt: Date.now() + posterScrapeDelay,
    });
    drainPosterScrapeQueue();
  });
}

function savePosterCache() {
  writeJson(POSTER_CACHE_PATH, posterCache);
}

function posterCacheKey(type, id) {
  return String(type || "movie") + ":" + String(id);
}

function findPosterInCatalog(type, id) {
  var lists =
    type === "tv"
      ? [getTvCatalog()]
      : [getMoviesCatalog(), getTvCatalog()];
  for (var i = 0; i < lists.length; i++) {
    var list = lists[i] || [];
    for (var j = 0; j < list.length; j++) {
      var item = list[j];
      if (!item || item.id !== id) continue;
      if (item.poster) return String(item.poster).replace(/^\/+/, "");
    }
  }
  return "";
}

function scrapeTmdbPoster(type, id) {
  var slug = type === "tv" ? "tv" : "movie";
  return httpsFetchText("https://www.themoviedb.org/" + slug + "/" + encodeURIComponent(String(id))).then(function (html) {
    var og = html.match(/property="og:image" content="([^"]+)"/i);
    if (!og || !og[1]) return "";
    var pathMatch = og[1].match(/\/t\/p\/w\d+\/(.+)$/i);
    return pathMatch ? pathMatch[1] : "";
  });
}

function resolvePosterPath(type, id) {
  var key = posterCacheKey(type, id);
  if (posterCache[key]) return Promise.resolve(posterCache[key]);
  if (posterPending[key]) return posterPending[key];
  var fromCatalog = findPosterInCatalog(type, id);
  if (fromCatalog) {
    posterCache[key] = fromCatalog;
    savePosterCache();
    return Promise.resolve(fromCatalog);
  }
  posterPending[key] = (function () {
    var chain;
    if (TMDB_API_KEY) {
      var apiType = type === "tv" ? "tv" : "movie";
      chain = httpsFetchJson(
        "https://api.themoviedb.org/3/" +
          apiType +
          "/" +
          encodeURIComponent(String(id)) +
          "?api_key=" +
          encodeURIComponent(TMDB_API_KEY)
      )
        .then(function (payload) {
          var poster = payload && payload.poster_path ? String(payload.poster_path).replace(/^\/+/, "") : "";
          if (poster) return poster;
          return queueScrapePoster(type, id);
        })
        .catch(function () {
          return queueScrapePoster(type, id);
        });
    } else {
      chain = queueScrapePoster(type, id);
    }
    return chain
      .then(function (poster) {
        if (poster) {
          posterCache[key] = poster;
          savePosterCache();
        }
        delete posterPending[key];
        return poster;
      })
      .catch(function (err) {
        delete posterPending[key];
        throw err;
      });
  })();
  return posterPending[key];
}

function getMergedMediaCatalog() {
  var movies = (getMoviesCatalog() || []).map(function (item) {
    return Object.assign({ type: item.type || "movie" }, item);
  });
  var tv = (getTvCatalog() || []).map(function (item) {
    return Object.assign({ type: "tv" }, item);
  });
  return dedupeMediaList(movies.concat(tv));
}

var sportsFeedCache = { feed: null, at: 0, build: 5 };
var sportsIptvCache = { channels: null, streams: null, logos: null, iptvAt: 0 };
var SPORTS_FEED_CACHE_MS = 900000;
var SPORTS_LEAGUE_IDS = [
  4328, 4335, 4387, 4391, 4424, 4380, 4370, 4346, 4480, 4443, 4331, 4332, 4334, 4393, 4406, 4429, 4472, 4481,
];
var SPORTS_TYPES = [
  "Soccer",
  "Basketball",
  "American Football",
  "Baseball",
  "Ice Hockey",
  "MMA",
  "Tennis",
  "Golf",
  "Motorsport",
  "Boxing",
];

function extractYoutubeId(url) {
  if (!url) return "";
  var m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
  return m ? m[1] : "";
}

function mapSportsDbEvent(row) {
  if (!row || !row.idEvent) return null;
  var video = String(row.strVideo || "").trim();
  var yt = extractYoutubeId(video);
  var stream = isPlayableSportsUrl(video) ? video : "";
  var home = row.strHomeTeam || "Home";
  var away = row.strAwayTeam || "Away";
  var score = "";
  if (row.intHomeScore != null && row.intAwayScore != null && String(row.intHomeScore) !== "" && String(row.intAwayScore) !== "") {
    score = String(row.intHomeScore) + " - " + String(row.intAwayScore);
  }
  var status = String(row.strStatus || "").trim();
  var bits = [row.strLeague || row.strSport || "Sports"];
  if (score) bits.push(score);
  else if (status) bits.push(status);
  if (row.dateEvent) bits.push(row.dateEvent);
  var kind = yt ? "youtube" : stream ? "stream" : "event";
  return {
    id: "sdb:" + row.idEvent,
    title: home + " vs " + away,
    subtitle: bits.join(" · "),
    logo: row.strThumb || row.strPoster || row.strBanner || "",
    url: yt ? "https://www.youtube.com/embed/" + yt + "?rel=0" : stream,
    watchUrl: yt ? "https://www.youtube.com/watch?v=" + yt : "",
    kind: kind,
    live: /live|progress|in play/i.test(status),
    category: row.strSport || "Sports",
    eventDate: row.dateEvent || "",
    eventTime: row.strTime || "",
    homeTeam: home,
    awayTeam: away,
    homeScore: row.intHomeScore != null ? String(row.intHomeScore) : "",
    awayScore: row.intAwayScore != null ? String(row.intAwayScore) : "",
    status: status,
    league: row.strLeague || "",
  };
}

function isPlayableSportsUrl(url) {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  var lower = String(url).toLowerCase();
  if (/thesportsdb\.com|facebook\.com|twitter\.com|instagram\.com|tiktok\.com/i.test(lower)) return false;
  return /\.m3u8(\?|$)|\.mp4(\?|$)|\.ts(\?|$)/i.test(lower);
}

function resolveStreamUrl(part, base) {
  if (/^https?:\/\//i.test(part)) return part;
  return new URL(part, base).href;
}

function rewriteM3u8Playlist(text, sourceUrl, ua, ref) {
  var suffix = "";
  if (ua) suffix += "&ua=" + encodeURIComponent(ua);
  if (ref) suffix += "&ref=" + encodeURIComponent(ref);
  return text
    .split(/\r?\n/)
    .map(function (line) {
      var trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.charAt(0) === "#") {
        if (trimmed.indexOf('URI="') !== -1) {
          return trimmed.replace(/URI="([^"]+)"/g, function (_match, uri) {
            var abs = resolveStreamUrl(uri, sourceUrl);
            return 'URI="/api/sports/proxy?url=' + encodeURIComponent(abs) + suffix + '"';
          });
        }
        return line;
      }
      var abs = resolveStreamUrl(trimmed, sourceUrl);
      return "/api/sports/proxy?url=" + encodeURIComponent(abs) + suffix;
    })
    .join("\n");
}

function fetchSportsStreamBody(raw, ua, ref, redirectCount) {
  redirectCount = redirectCount || 0;
  return new Promise(function (resolve, reject) {
    var client = raw.indexOf("https://") === 0 ? https : require("http");
    var headers = {
      "User-Agent": ua || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9",
    };
    if (ref) {
      headers.Referer = ref;
      try {
        headers.Origin = new URL(ref).origin;
      } catch (e) {}
    }
    client
      .get(raw, { headers: headers }, function (upstream) {
        if (
          redirectCount < 5 &&
          upstream.statusCode &&
          [301, 302, 307, 308].indexOf(upstream.statusCode) !== -1 &&
          upstream.headers.location
        ) {
          var next = upstream.headers.location;
          if (next.indexOf("http") !== 0) {
            try {
              next = new URL(next, raw).href;
            } catch (e) {
              return reject(e);
            }
          }
          upstream.resume();
          return fetchSportsStreamBody(next, ua, ref, redirectCount + 1).then(resolve).catch(reject);
        }
        var chunks = [];
        upstream.on("data", function (chunk) {
          chunks.push(chunk);
        });
        upstream.on("end", function () {
          if (upstream.statusCode && upstream.statusCode >= 400) reject(new Error("upstream"));
          else
            resolve({
              status: upstream.statusCode || 200,
              type: upstream.headers["content-type"] || "",
              body: Buffer.concat(chunks),
            });
        });
      })
      .on("error", reject);
  });
}

function fetchSportsDbEvents() {
  var jobs = [];
  for (var offset = -2; offset <= 5; offset++) {
    var dayDate = new Date();
    dayDate.setDate(dayDate.getDate() + offset);
    var day = dayDate.toISOString().slice(0, 10);
    SPORTS_TYPES.forEach(function (sport) {
      jobs.push(
        httpsFetchJson(
          "https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=" + encodeURIComponent(day) + "&s=" + encodeURIComponent(sport)
        ).catch(function () {
          return { events: [] };
        })
      );
    });
  }
  SPORTS_LEAGUE_IDS.forEach(function (leagueId) {
    jobs.push(
      httpsFetchJson(
        "https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=" + encodeURIComponent(String(leagueId))
      ).catch(function () {
        return { events: [] };
      })
    );
    jobs.push(
      httpsFetchJson(
        "https://www.thesportsdb.com/api/v1/json/3/eventspastleague.php?id=" + encodeURIComponent(String(leagueId))
      ).catch(function () {
        return { events: [] };
      })
    );
  });
  return Promise.all(jobs).then(function (results) {
    var out = [];
    var seen = {};
    results.forEach(function (payload) {
      var events = payload && Array.isArray(payload.events) ? payload.events : [];
      events.forEach(function (row) {
        var mapped = mapSportsDbEvent(row);
        if (!mapped || seen[mapped.id]) return;
        seen[mapped.id] = true;
        out.push(mapped);
      });
    });
    out.sort(function (a, b) {
      var da = String(a.eventDate || "");
      var db = String(b.eventDate || "");
      if (da !== db) return db.localeCompare(da);
      var ka = a.kind === "youtube" ? 0 : a.kind === "stream" ? 1 : 2;
      var kb = b.kind === "youtube" ? 0 : b.kind === "stream" ? 1 : 2;
      if (ka !== kb) return ka - kb;
      return String(a.title || "").localeCompare(String(b.title || ""));
    });
    return out;
  });
}

function iptvStreamScore(stream) {
  var score = 0;
  if (stream.user_agent || stream.userAgent) score += 3;
  if (stream.referrer || stream.referer) score += 3;
  if (/\.m3u8/i.test(stream.url || "")) score += 2;
  return score;
}

function buildIptvSportsFeed() {
  var channels = sportsIptvCache.channels || [];
  var streams = sportsIptvCache.streams || [];
  var logos = sportsIptvCache.logos || [];
  var logoMap = {};
  logos.forEach(function (logo) {
    if (logo && logo.channel && logo.url) logoMap[logo.channel] = logo.url;
  });
  var channelMap = {};
  channels.forEach(function (channel) {
    if (!channel || !channel.id) return;
    var cats = (channel.categories || []).map(function (c) {
      return String(c || "").toLowerCase();
    });
    var sports =
      cats.indexOf("sports") !== -1 ||
      /sport|espn|nba|nfl|mlb|nhl|f1|ufc|dazn|bein|sky sport|fox sport|bt sport|tnt sport/i.test(
        String(channel.name || "")
      );
    if (!sports) return;
    channelMap[channel.id] = channel;
  });
  var byChannel = {};
  streams.forEach(function (stream) {
    if (!stream || !stream.url || !stream.channel) return;
    if (!isPlayableSportsUrl(stream.url)) return;
    if (!channelMap[stream.channel]) return;
    if (!byChannel[stream.channel]) byChannel[stream.channel] = [];
    byChannel[stream.channel].push(stream);
  });
  var feed = [];
  Object.keys(byChannel).forEach(function (chId) {
    var channel = channelMap[chId];
    var list = byChannel[chId].slice().sort(function (a, b) {
      return iptvStreamScore(b) - iptvStreamScore(a);
    });
    var urls = [];
    var seenUrl = {};
    list.forEach(function (stream) {
      var u = String(stream.url).trim();
      if (!u || seenUrl[u]) return;
      seenUrl[u] = true;
      urls.push({
        url: u,
        userAgent: stream.user_agent || stream.userAgent || "",
        referrer: stream.referrer || stream.referer || "",
      });
    });
    if (!urls.length) return;
    var primary = urls[0];
    feed.push({
      id: "iptv:" + chId,
      title: channel.name || "Sports channel",
      subtitle: ((channel.country || "").toUpperCase() || "LIVE") + " · Live TV",
      logo: logoMap[chId] || "",
      url: primary.url,
      urls: urls,
      userAgent: primary.userAgent,
      referrer: primary.referrer,
      kind: "stream",
      live: true,
      category: "Live TV",
    });
  });
  return feed.sort(function (a, b) {
    return String(a.title || "").localeCompare(String(b.title || ""));
  });
}

function loadIptvSportsData() {
  if (sportsIptvCache.channels && sportsIptvCache.streams && Date.now() - (sportsIptvCache.iptvAt || 0) < SPORTS_FEED_CACHE_MS) {
    return Promise.resolve();
  }
  return Promise.all([
    httpsFetchJson("https://iptv-org.github.io/api/channels.json"),
    httpsFetchJson("https://iptv-org.github.io/api/streams.json"),
    httpsFetchJson("https://iptv-org.github.io/api/logos.json").catch(function () {
      return [];
    }),
  ]).then(function (results) {
    sportsIptvCache.channels = results[0] || [];
    sportsIptvCache.streams = results[1] || [];
    sportsIptvCache.logos = results[2] || [];
    sportsIptvCache.iptvAt = Date.now();
  });
}

function getSportsFeed() {
  if (sportsFeedCache.feed && sportsFeedCache.build === 5 && Date.now() - sportsFeedCache.at < SPORTS_FEED_CACHE_MS) {
    return Promise.resolve(sportsFeedCache.feed);
  }
  return Promise.all([
    loadIptvSportsData()
      .then(function () {
        return buildIptvSportsFeed();
      })
      .catch(function () {
        return [];
      }),
    fetchSportsDbEvents().catch(function () {
      return [];
    }),
  ])
    .then(function (parts) {
      var live = parts[0] || [];
      var events = (parts[1] || []).filter(function (item) {
        return item && (item.kind === "youtube" || item.kind === "stream");
      });
      var merged = dedupeSportsList(live.concat(events));
      sportsFeedCache.feed = merged;
      sportsFeedCache.at = Date.now();
      sportsFeedCache.build = 5;
      return merged;
    })
    .catch(function () {
      if (sportsFeedCache.feed) return sportsFeedCache.feed;
      return [];
    });
}

function dedupeSportsList(list) {
  var seen = {};
  var out = [];
  (list || []).forEach(function (item) {
    if (!item || !item.id || seen[item.id]) return;
    seen[item.id] = true;
    out.push(item);
  });
  return out;
}

function filterSportsFeed(feed, q) {
  if (!q) return feed.slice();
  var needle = q.toLowerCase();
  return feed.filter(function (item) {
    return (
      String(item.title || "")
        .toLowerCase()
        .indexOf(needle) !== -1 ||
      String(item.subtitle || "")
        .toLowerCase()
        .indexOf(needle) !== -1 ||
      String(item.category || "")
        .toLowerCase()
        .indexOf(needle) !== -1
    );
  });
}

app.get("/api/movies/lookup/:id", function (req, res) {
  var id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: "bad_id" });
  var catalog = getMergedMediaCatalog();
  var hit = null;
  for (var i = 0; i < catalog.length; i++) {
    if (Number(catalog[i].id) === id) {
      hit = catalog[i];
      break;
    }
  }
  if (hit) return res.json(hit);
  if (!TMDB_API_KEY) {
    return res.json({ id: id, title: "TMDB #" + id, year: "", poster: "", type: "movie" });
  }
  Promise.all([
    httpsFetchJson(
      "https://api.themoviedb.org/3/movie/" + encodeURIComponent(String(id)) + "?api_key=" + encodeURIComponent(TMDB_API_KEY)
    ).catch(function () {
      return null;
    }),
    httpsFetchJson(
      "https://api.themoviedb.org/3/tv/" + encodeURIComponent(String(id)) + "?api_key=" + encodeURIComponent(TMDB_API_KEY)
    ).catch(function () {
      return null;
    }),
  ])
    .then(function (results) {
      var movie = results[0];
      var tv = results[1];
      if (tv && tv.id && (!movie || !movie.id || (tv.name && !movie.title))) {
        return res.json({
          id: tv.id,
          title: tv.name || "TV #" + id,
          year: tv.first_air_date ? String(tv.first_air_date).slice(0, 4) : "",
          poster: tv.poster_path ? String(tv.poster_path).replace(/^\/+/, "") : "",
          type: "tv",
        });
      }
      if (movie && movie.id) {
        return res.json({
          id: movie.id,
          title: movie.title || "Movie #" + id,
          year: movie.release_date ? String(movie.release_date).slice(0, 4) : "",
          poster: movie.poster_path ? String(movie.poster_path).replace(/^\/+/, "") : "",
          type: "movie",
        });
      }
      res.json({ id: id, title: "TMDB #" + id, year: "", poster: "", type: "movie" });
    })
    .catch(function () {
      res.json({ id: id, title: "TMDB #" + id, year: "", poster: "", type: "movie" });
    });
});

app.get("/api/movies/tv/:id", function (req, res) {
  var id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ seasons: [] });
  if (!TMDB_API_KEY) {
    return res.json({
      seasons: [
        { season: 1, episodes: 24 },
        { season: 2, episodes: 24 },
        { season: 3, episodes: 24 },
        { season: 4, episodes: 24 },
        { season: 5, episodes: 24 },
        { season: 6, episodes: 24 },
        { season: 7, episodes: 24 },
        { season: 8, episodes: 24 },
        { season: 9, episodes: 24 },
        { season: 10, episodes: 24 },
      ],
    });
  }
  httpsFetchJson(
    "https://api.themoviedb.org/3/tv/" + encodeURIComponent(String(id)) + "?api_key=" + encodeURIComponent(TMDB_API_KEY)
  )
    .then(function (payload) {
      var seasons = [];
      if (payload && Array.isArray(payload.seasons)) {
        payload.seasons.forEach(function (row) {
          var n = Number(row.season_number);
          if (!n || n < 1) return;
          seasons.push({
            season: n,
            episodes: Math.max(1, Number(row.episode_count) || 1),
            name: row.name || "",
          });
        });
      }
      res.json({ seasons: seasons, name: payload && payload.name ? payload.name : "" });
    })
    .catch(function () {
      res.json({ seasons: [{ season: 1, episodes: 24 }] });
    });
});

app.get("/api/movies/poster/:type/:id", function (req, res) {
  var type = req.params.type === "tv" ? "tv" : "movie";
  var id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).end();
  var key = posterCacheKey(type, id);
  if (posterCache[key]) {
    res.setHeader("Cache-Control", "public, max-age=604800");
    return res.redirect(302, "https://image.tmdb.org/t/p/w185/" + posterCache[key]);
  }
  resolvePosterPath(type, id)
    .then(function (poster) {
      if (!poster) return res.status(404).end();
      res.setHeader("Cache-Control", "public, max-age=604800");
      res.redirect(302, "https://image.tmdb.org/t/p/w185/" + poster);
    })
    .catch(function () {
      res.status(502).end();
    });
});

app.get("/api/movies/catalog", function (req, res) {
  var catalog = getMergedMediaCatalog();
  var page = parseInt(req.query.page, 10);
  var limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 200, 1), 500);
  if (req.query.page != null || req.query.limit != null) {
    var p = Math.max(page || 1, 1);
    var start = (p - 1) * limit;
    var slice = catalog.slice(start, start + limit);
  res.setHeader("Cache-Control", "public, max-age=3600");
    return res.json({
      data: slice,
      hasMore: start + limit < catalog.length,
      page: p,
      total: catalog.length,
    });
  }
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.json(catalog);
});

app.get("/api/movies/search", function (req, res) {
  var q = String(req.query.q || "").trim();
  var page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  if (!q) return res.json({ data: [], hasMore: false, page: 1, total: 0 });
  var local = dedupeMediaList(
    filterCatalogByQuery(getMoviesCatalog(), q, "movie").concat(filterCatalogByQuery(getTvCatalog(), q, "tv"))
  );
  if (/^\d+$/.test(q)) {
    var numId = parseInt(q, 10);
    var inLocal = local.some(function (item) {
      return item.id === numId;
    });
    if (!inLocal) {
      var tvHit = (getTvCatalog() || []).find(function (item) {
        return Number(item.id) === numId;
      });
      var movieHit = (getMoviesCatalog() || []).find(function (item) {
        return Number(item.id) === numId;
      });
      if (tvHit) local.unshift(Object.assign({}, tvHit, { type: "tv" }));
      else if (movieHit) local.unshift(Object.assign({}, movieHit, { type: "movie" }));
      else local.unshift({ id: numId, title: "TMDB #" + numId, year: "", poster: "", type: "movie" });
    }
  }
  if (!TMDB_API_KEY) {
    var pageSize = 96;
    var start = (page - 1) * pageSize;
    var slice = local.slice(start, start + pageSize);
    return res.json({
      data: slice,
      hasMore: start + pageSize < local.length,
      page: page,
      total: local.length,
    });
  }
  var url =
    "https://api.themoviedb.org/3/search/multi?api_key=" +
    encodeURIComponent(TMDB_API_KEY) +
    "&query=" +
    encodeURIComponent(q) +
    "&page=" +
    encodeURIComponent(String(page)) +
    "&include_adult=false";
  httpsFetchJson(url)
    .then(function (payload) {
      var remote = [];
      if (payload && Array.isArray(payload.results)) {
        payload.results.forEach(function (row) {
          var mapped = mapTmdbSearchItem(row);
          if (mapped) remote.push(mapped);
        });
      }
      var merged = dedupeMediaList(local.concat(remote));
      var totalPages = payload && payload.total_pages ? payload.total_pages : 1;
      res.json({
        data: merged,
        hasMore: page < totalPages,
        page: page,
        total: payload && payload.total_results ? payload.total_results : merged.length,
      });
    })
    .catch(function () {
      var pageSize = 96;
      var start = (page - 1) * pageSize;
      var slice = local.slice(start, start + pageSize);
      res.json({
        data: slice,
        hasMore: start + pageSize < local.length,
        page: page,
        total: local.length,
      });
    });
});

app.get("/api/music/catalog", function (req, res) {
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.json(getMusicCatalog());
});

app.get("/api/music/trending", function (req, res) {
  var limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 100);
  audiusRequest("/tracks/trending", { limit: String(limit), app_name: "Kobran" }, res);
});

var MUSIC_FEED_PAGE_SIZE = 96;

app.get("/api/music/feed", function (req, res) {
  var page = Math.max(parseInt(req.query.page, 10) || 0, 0);
  var limit = Math.min(Math.max(parseInt(req.query.limit, 10) || MUSIC_FEED_PAGE_SIZE, 1), 200);
  var staticTracks = getMusicCatalog();
  var total = Array.isArray(staticTracks) ? staticTracks.length : 0;
  var start = page * limit;
  var slice = Array.isArray(staticTracks) ? staticTracks.slice(start, start + limit) : [];
  var staticHasMore = start + limit < total;
  if (page === 0 && musicFeedCache.payload && Date.now() - musicFeedCache.at < MUSIC_FEED_CACHE_MS) {
    res.setHeader("Cache-Control", "public, max-age=120");
    return res.json(musicFeedCache.payload);
  }
  function sendPayload(data, hasMore) {
      var payload = {
      data: dedupeTracks(data),
      hasMore: hasMore,
        nextPage: page + 1,
      total: total,
      };
      if (page === 0) {
        musicFeedCache.payload = payload;
        musicFeedCache.at = Date.now();
        res.setHeader("Cache-Control", "public, max-age=120");
      }
      res.json(payload);
  }
  if (page > 0) {
    return sendPayload(slice, staticHasMore);
  }
  Promise.race([
    fetchAudiusQuickFeed(),
    new Promise(function (resolve) {
      setTimeout(function () {
        resolve([]);
      }, 8000);
    }),
  ])
    .then(function (audiusBatch) {
      var merged = slice.concat(Array.isArray(audiusBatch) ? audiusBatch : []);
      sendPayload(merged.slice(0, limit), staticHasMore || merged.length > limit);
    })
    .catch(function () {
      sendPayload(slice, staticHasMore);
    });
});

app.get("/api/music/search", function (req, res) {
  var q = String(req.query.q || "").trim();
  var offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  var limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 100);
  if (!q) return res.json({ data: [], hasMore: false });
  Promise.all([
    audiusFetchJson("/tracks/search", {
      query: q,
      limit: String(limit),
      offset: String(offset),
      sortMethod: "popular",
      app_name: "Kobran",
    }),
    audiusFetchJson("/tracks/search", {
      query: q,
      limit: String(limit),
      offset: String(offset),
      sortMethod: "recent",
      app_name: "Kobran",
    }).catch(function () {
      return { data: [] };
    }),
    offset === 0
      ? audiusFetchJson("/users/search", { query: q, limit: "20", app_name: "Kobran" }).catch(function () {
          return { data: [] };
        })
      : Promise.resolve({ data: [] }),
    searchArchiveTracks(q, Math.floor(offset / 100)),
  ])
    .then(function (results) {
      var trackPayload = results[0] || { data: [] };
      var recentPayload = results[1] || { data: [] };
      var usersPayload = results[2] || { data: [] };
      var archiveBatch = results[3] || [];
      var tracks = Array.isArray(trackPayload.data) ? trackPayload.data.slice() : [];
      if (Array.isArray(recentPayload.data)) tracks = tracks.concat(recentPayload.data);
      if (Array.isArray(archiveBatch)) tracks = tracks.concat(archiveBatch);
      var users = Array.isArray(usersPayload.data) ? usersPayload.data.slice(0, 12) : [];
      var userJobs = users.map(function (user) {
        if (!user || user.id == null) return Promise.resolve({ data: [] });
        return audiusFetchJson("/users/" + encodeURIComponent(String(user.id)) + "/tracks", {
          limit: "25",
          app_name: "Kobran",
        }).catch(function () {
          return { data: [] };
        });
      });
      return Promise.all(userJobs).then(function (userResults) {
        userResults.forEach(function (payload) {
          if (payload && Array.isArray(payload.data)) tracks = tracks.concat(payload.data);
        });
        var merged = dedupeTracks(tracks);
        res.json({
          data: merged,
          hasMore:
            (Array.isArray(trackPayload.data) && trackPayload.data.length >= limit) ||
            (Array.isArray(recentPayload.data) && recentPayload.data.length >= limit) ||
            offset + limit < 8000,
        });
      });
    })
    .catch(function () {
      res.status(502).json({ error: "Search failed", data: [], hasMore: false });
    });
});

app.get("/api/music/stream/:id", function (req, res) {
  var id = decodeURIComponent(String(req.params.id || "").trim());
  if (!id) return res.status(400).json({ error: "Missing track id" });
  if (id.indexOf("archive:") === 0) {
    var rest = id.slice(8);
    var splitAt = rest.indexOf("::");
    if (splitAt < 1) return res.status(400).json({ error: "Invalid archive track" });
    var identifier = rest.slice(0, splitAt);
    var filename = rest.slice(splitAt + 2);
    return res.redirect(
      302,
      "https://archive.org/download/" + encodeURIComponent(identifier) + "/" + encodeURIComponent(filename)
    );
  }
  res.redirect(302, "https://discoveryprovider.audius.co/v1/tracks/" + encodeURIComponent(id) + "/stream?app_name=Kobran");
});

app.get("/api/music/artwork/:id", function (req, res) {
  var id = decodeURIComponent(String(req.params.id || "").trim());
  if (!id) return res.status(400).end();
  if (id.indexOf("archive:") === 0) {
    var identifier = id.slice(8).split("::")[0];
    if (!identifier) return res.status(400).end();
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.redirect(302, "https://archive.org/services/img/" + encodeURIComponent(identifier));
  }
  audiusFetchJson("/tracks/" + encodeURIComponent(id), { app_name: "Kobran" })
    .then(function (payload) {
      var track = payload && payload.data ? payload.data : null;
      var art =
        track && track.artwork
          ? track.artwork["480x480"] || track.artwork["150x150"] || track.artwork["1000x1000"] || ""
          : "";
      if (!art) return res.status(404).end();
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.redirect(302, art);
    })
    .catch(function () {
      res.status(502).end();
    });
});

app.get("/api/sports/feed", function (req, res) {
  var page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  var limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 120, 1), 300);
  var q = String(req.query.q || "").trim();
  getSportsFeed()
    .then(function (feed) {
      var filtered = filterSportsFeed(feed, q);
      var start = (page - 1) * limit;
      var slice = filtered.slice(start, start + limit);
      res.setHeader("Cache-Control", "public, max-age=300");
      res.json({
        data: slice,
        hasMore: start + limit < filtered.length,
        page: page,
        total: filtered.length,
      });
    })
    .catch(function () {
      res.status(502).json({ data: [], hasMore: false, page: page, total: 0 });
    });
});

app.get("/api/sports/logo", function (req, res) {
  var raw = String(req.query.url || "").trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return res.status(400).end();
  fetchSportsStreamBody(raw, "", "", 0)
    .then(function (result) {
      res.status(result.status || 200);
      if (result.type) res.setHeader("Content-Type", result.type);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.send(result.body);
    })
    .catch(function () {
      res.status(502).end();
    });
});

app.get("/api/sports/proxy", function (req, res) {
  var raw = String(req.query.url || "").trim();
  var ua = String(req.query.ua || "").trim();
  var ref = String(req.query.ref || "").trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return res.status(400).end();
  if (!isPlayableSportsUrl(raw)) return res.status(400).end();
  fetchSportsStreamBody(raw, ua, ref, 0)
    .then(function (result) {
      var isM3u8 =
        /\.m3u8(\?|$)/i.test(raw) ||
        (result.type && String(result.type).toLowerCase().indexOf("mpegurl") !== -1) ||
        (result.type && String(result.type).toLowerCase().indexOf("m3u8") !== -1);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "no-store");
      if (isM3u8) {
        var text = result.body.toString("utf8");
        res.status(200);
        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
        res.send(rewriteM3u8Playlist(text, raw, ua, ref));
        return;
      }
      res.status(result.status || 200);
      if (result.type) res.setHeader("Content-Type", result.type);
      res.send(result.body);
    })
    .catch(function () {
      res.status(502).end();
    });
});

attachApiTools(app, {
  httpsFetchJson: httpsFetchJson,
  httpsFetchText: httpsFetchText,
  audiusFetchJson: audiusFetchJson,
});

attachWallpaperApi(app, {
  httpsFetchJson: httpsFetchJson,
});

attachSiteFeatures(app, {
  dataDir: DATA_DIR,
  requireAuth: requireAuth,
});

attachAiChat(app);

function isAllowedExternalUrl(raw) {
  try {
    var parsed = new URL(raw);
    if (parsed.protocol !== "https:") return false;
    var host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) return false;
    return true;
  } catch (e) {
    return false;
  }
}

app.all("/api/external", function (req, res) {
  var payload = req.body && typeof req.body === "object" ? req.body : {};
  var target = String(payload.url || req.query.url || "").trim();
  if (!isAllowedExternalUrl(target)) return res.status(400).json({ error: "Invalid URL" });
  var method = String(payload.method || req.query.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "POST") method = "GET";
  var headers = {
    "User-Agent": "Kobran/1.0",
    Accept: "application/json, text/plain, */*",
  };
  var auth = String(req.headers["x-proxy-auth"] || payload.auth || "").trim();
  if (auth) {
    if (auth.indexOf("Bot ") === 0 || auth.indexOf("Bearer ") === 0) headers.Authorization = auth;
    else if (target.indexOf("discord.com") !== -1) headers.Authorization = "Bot " + auth;
    else headers.Authorization = "Bearer " + auth;
  }
  if (target.indexOf("reddit.com") !== -1) headers["User-Agent"] = "KobranApiClient/1.0";
  var body = payload.body && method === "POST" ? String(payload.body) : null;
  var parsed = new URL(target);
  var upstreamReq = https.request(
    parsed,
    { method: method, headers: headers },
    function (upstream) {
      var chunks = [];
      upstream.on("data", function (chunk) {
        chunks.push(chunk);
      });
      upstream.on("end", function () {
        res.status(upstream.statusCode || 502);
        res.setHeader("Content-Type", upstream.headers["content-type"] || "application/json");
        res.send(Buffer.concat(chunks));
      });
    }
  );
  upstreamReq.on("error", function () {
    res.status(502).json({ error: "Upstream request failed" });
  });
  if (body) upstreamReq.write(body);
  upstreamReq.end();
});

app.get("/api/game-launch/:id", function (req, res) {
  const id = String(req.params.id || "").trim();
  const game = getMergedGames().find(function (g) {
    return g.id === id;
  });
  if (!game) return res.status(404).json({ error: "Game not found" });
  res.json({
    id: game.id,
    title: game.title,
    path: game.path,
    targets: resolveLaunchTargets(game),
  });
});

app.get("/api/game-frame", createGameFrameHandler());
app.get("/api/browser/frame", createBrowseFrameHandler());
app.get("/api/browser/asset", createBrowseAssetHandler());

function isCloakDomain(value) {
  return /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(String(value || "").trim()) && String(value).length < 120;
}

function pipeCloakIconResponse(upstream, res, onFail) {
  if (upstream.statusCode !== 200) {
    upstream.resume();
    return onFail();
  }
  var type = String(upstream.headers["content-type"] || "image/png").split(";")[0];
  res.setHeader("Content-Type", type);
  res.setHeader("Cache-Control", "public, max-age=604800");
  upstream.pipe(res);
}

function fetchCloakIconUrl(sourceUrl, res, onFail) {
  https
    .get(
      sourceUrl,
      {
        headers: {
          "User-Agent": "KobranCloak/1.0",
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
      },
      function (upstream) {
        if (upstream.statusCode >= 300 && upstream.statusCode < 400 && upstream.headers.location) {
          var next = upstream.headers.location;
          if (!/^https?:\/\//i.test(next)) {
            try {
              next = new URL(next, sourceUrl).href;
            } catch (e) {
              upstream.resume();
              return onFail();
            }
          }
          upstream.resume();
          return fetchCloakIconUrl(next, res, onFail);
        }
        pipeCloakIconResponse(upstream, res, onFail);
      }
    )
    .on("error", onFail);
}

app.get("/api/cloak-icon", function (req, res) {
  var rawUrl = String(req.query.u || "").trim();
  if (rawUrl) {
    if (!/^https?:\/\//i.test(rawUrl) || rawUrl.length > 500) return res.status(400).end();
    return fetchCloakIconUrl(rawUrl, res, function () {
      res.status(502).end();
    });
  }
  var domain = String(req.query.d || "")
    .trim()
    .toLowerCase();
  if (!isCloakDomain(domain)) return res.status(400).end();
  var sources = [
    "https://icons.duckduckgo.com/ip3/" + domain + ".ico",
    "https://www.google.com/s2/favicons?domain=" + encodeURIComponent(domain) + "&sz=64",
  ];
  var idx = 0;
  function tryNext() {
    if (idx >= sources.length) return res.status(502).end();
    var url = sources[idx++];
    fetchCloakIconUrl(url, res, tryNext);
  }
  tryNext();
});

app.get("/api/announcements", function (req, res) {
  const list = loadAnnouncements().sort(function (a, b) {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  res.json(list);
});

app.get("/api/changelog", function (req, res) {
  const list = loadChangelog().sort(function (a, b) {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  res.json(list);
});

app.post("/api/secret-code/verify", function (req, res) {
  if (!SECRET_MENU_CODE) {
    return res.status(503).json({ error: "Secret menu unavailable" });
  }
  const code = String((req.body && req.body.code) || "").trim();
  if (code !== SECRET_MENU_CODE) {
    return res.status(401).json({ error: "Invalid code" });
  }
  res.json({ ok: true, path: "/apps/secret-code/" + SECRET_MENU_SLUG });
});

app.get("/api/admin/session", function (req, res) {
  const ctx = getPanelContext(req);
  if (!ctx) return res.json({ authed: false });
  res.json({
    authed: true,
    level: ctx.access.level,
    roleId: ctx.access.roleId,
    isFounder: ctx.access.isFounder,
    isModerator: ctx.access.isModerator,
    user: userAuth.publicUser(ctx.user),
  });
});

app.post("/api/admin/logout", function (req, res) {
  const cookies = parseCookies(req.headers.cookie || "");
  const token = cookies.kobran_user;
  if (token && userAuth.dropSession) userAuth.dropSession(token);
  res.setHeader("Set-Cookie", "kobran_user=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
  res.json({ ok: true });
});

app.get("/api/admin/games", requireAuth, function (req, res) {
  const base = loadBaseGames();
  const overrides = loadOverrides();
  const games = getMergedGames();
  res.json({ games: games, base: base, overrides: overrides });
});

app.put("/api/admin/games/:id", requireAuth, function (req, res) {
  const id = req.params.id;
  const base = loadBaseGames().find(function (g) {
    return g.id === id;
  });
  if (!base) return res.status(404).json({ error: "Game not found" });

  const body = req.body || {};
  const overrides = loadOverrides();
  const next = Object.assign({}, overrides[id] || {});

  if (body.title != null) {
    const title = String(body.title).trim();
    if (title && title !== base.title) next.title = title;
    else delete next.title;
  }
  if (body.path != null) {
    const gamePath = String(body.path).trim();
    if (gamePath && gamePath !== base.path) next.path = gamePath;
    else delete next.path;
  }
  if (body.file != null) {
    const file = String(body.file).trim();
    if (file !== (base.file || "")) next.file = file;
    else delete next.file;
  }
  if (body.search != null) {
    let search = String(body.search).trim();
    if (!search) {
      search = buildSearch({
        id: id,
        title: next.title || base.title,
        file: next.file || base.file,
        path: next.path || base.path,
      });
    }
    if (search !== base.search) next.search = search;
    else delete next.search;
  }
  if (body.image !== undefined) {
    const imageOverride = String(body.image || "").trim();
    if (imageOverride) next.image = imageOverride;
    else delete next.image;
  }

  if (Object.keys(next).length === 0) delete overrides[id];
  else overrides[id] = next;
  saveOverrides(overrides);
  res.json({ game: mergeGame(base, overrides[id]), overrides: overrides });
});

app.delete("/api/admin/games/:id/override", requireAuth, function (req, res) {
  const id = req.params.id;
  const base = loadBaseGames().find(function (g) {
    return g.id === id;
  });
  if (!base) return res.status(404).json({ error: "Game not found" });
  const overrides = loadOverrides();
  delete overrides[id];
  saveOverrides(overrides);
  res.json({ game: base, overrides: overrides });
});

app.delete("/api/admin/games/:id", requireAuth, function (req, res) {
  const id = req.params.id;
  const games = loadBaseGames();
  const idx = games.findIndex(function (g) {
    return g.id === id;
  });
  if (idx === -1) return res.status(404).json({ error: "Game not found" });
  const removed = games[idx];
  games.splice(idx, 1);
  saveGamesList(games);
  removeImportedGameFile(removed);
  const overrides = loadOverrides();
  if (overrides[id]) {
    delete overrides[id];
    saveOverrides(overrides);
  }
  res.json({ ok: true, games: getMergedGames(), overrides: overrides });
});

app.post("/api/admin/games/import", requireAuth, function (req, res) {
  const html = String((req.body && req.body.html) || "").trim();
  if (!html || html.length < 20) {
    return res.status(400).json({ error: "Valid HTML code required" });
  }
  if (!/<html[\s>]/i.test(html) && !/<!doctype/i.test(html)) {
    return res.status(400).json({ error: "HTML must include a doctype or html tag" });
  }
  const games = loadBaseGames();
  let title = String((req.body && req.body.title) || "").trim();
  if (!title) title = titleFromHtml(html);
  if (!title) title = "Imported Game";
  let id = String((req.body && req.body.id) || "").trim();
  if (id) {
    id = slugId(id);
    if (games.some(function (g) {
      return g.id === id;
    })) {
      id = uniqueGameId(id, games);
    }
  } else {
    id = uniqueGameId(title, games);
  }
  const image = req.body.image ? String(req.body.image).trim() : "";
  fs.mkdirSync(IMPORTED_DIR, { recursive: true });
  const file = "imported/" + id + ".html";
  const relPath = path.join(IMPORTED_DIR, id + ".html");
  fs.writeFileSync(relPath, html, "utf8");
  const entry = {
    id: id,
    file: file,
    title: title,
    path: "Offline-HTML-Games-Pack-master/offline/" + file.replace(/\\/g, "/"),
    search: buildSearch({ id: id, title: title, file: file, path: "Offline-HTML-Games-Pack-master/offline/" + file }),
    image: image || "",
  };
  games.push(entry);
  games.sort(function (a, b) {
    return a.title.localeCompare(b.title);
  });
  saveGamesList(games);
  res.status(201).json({ game: entry, games: getMergedGames() });
});

app.post("/api/admin/announcements", requireAuth, function (req, res) {
  const title = String((req.body && req.body.title) || "").trim();
  if (!title) return res.status(400).json({ error: "Title required" });
  const list = loadAnnouncements();
  const item = {
    id: "ann_" + Date.now() + "_" + crypto.randomBytes(4).toString("hex"),
    title: title,
    subtitle: req.body.subtitle ? String(req.body.subtitle).trim() : "",
    description: req.body.description ? String(req.body.description).trim() : "",
    image: req.body.image ? String(req.body.image).trim() : "",
    createdAt: new Date().toISOString(),
    updatedAt: null,
  };
  list.unshift(item);
  saveAnnouncements(list);
  res.status(201).json(item);
});

app.put("/api/admin/announcements/:id", requireAuth, function (req, res) {
  const list = loadAnnouncements();
  const idx = list.findIndex(function (a) {
    return a.id === req.params.id;
  });
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  const prev = list[idx];
  const title = req.body.title != null ? String(req.body.title).trim() : prev.title;
  if (!title) return res.status(400).json({ error: "Title required" });
  list[idx] = {
    id: prev.id,
    title: title,
    subtitle: req.body.subtitle != null ? String(req.body.subtitle).trim() : prev.subtitle,
    description: req.body.description != null ? String(req.body.description).trim() : prev.description,
    image: req.body.image != null ? String(req.body.image).trim() : prev.image,
    createdAt: prev.createdAt,
    updatedAt: new Date().toISOString(),
  };
  saveAnnouncements(list);
  res.json(list[idx]);
});

app.delete("/api/admin/announcements/:id", requireAuth, function (req, res) {
  const list = loadAnnouncements().filter(function (a) {
    return a.id !== req.params.id;
  });
  saveAnnouncements(list);
  res.json({ ok: true });
});

app.post("/api/admin/changelog", requireAuth, function (req, res) {
  const title = String((req.body && req.body.title) || "").trim();
  if (!title) return res.status(400).json({ error: "Title required" });
  const list = loadChangelog();
  const item = {
    id: "log_" + Date.now() + "_" + crypto.randomBytes(4).toString("hex"),
    title: title,
    message: req.body.message ? String(req.body.message).trim() : "",
    createdAt: new Date().toISOString(),
    updatedAt: null,
  };
  list.unshift(item);
  saveChangelog(list);
  res.status(201).json(item);
});

app.put("/api/admin/changelog/:id", requireAuth, function (req, res) {
  const list = loadChangelog();
  const idx = list.findIndex(function (a) {
    return a.id === req.params.id;
  });
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  const prev = list[idx];
  const title = req.body.title != null ? String(req.body.title).trim() : prev.title;
  if (!title) return res.status(400).json({ error: "Title required" });
  list[idx] = {
    id: prev.id,
    title: title,
    message: req.body.message != null ? String(req.body.message).trim() : prev.message,
    createdAt: prev.createdAt,
    updatedAt: new Date().toISOString(),
  };
  saveChangelog(list);
  res.json(list[idx]);
});

app.delete("/api/admin/changelog/:id", requireAuth, function (req, res) {
  const list = loadChangelog().filter(function (a) {
    return a.id !== req.params.id;
  });
  saveChangelog(list);
  res.json({ ok: true });
});

app.get("/api/admin/blacklist", requirePanelMod, function (req, res) {
  res.json(loadBlacklistFromDisk());
});

function countAllChatMessages() {
  return chatStore.messageCount();
}

app.get("/api/admin/chat/channels", requirePanelChat, function (req, res) {
  const rows = chatStore.allChannels().filter(function (ch) {
    return chatStore.canRead(ch, req.panelUser);
  });
  res.json(rows);
});

app.post("/api/admin/chat/channels", requireAuth, function (req, res) {
  const result = chatStore.createChannel(req.body || {});
  if (result.error === "bad_name") return res.status(400).json({ error: "bad_name" });
  if (result.error === "exists") return res.status(409).json({ error: "exists" });
  res.status(201).json(result.channel);
});

app.put("/api/admin/chat/channels/:id", requireAuth, function (req, res) {
  const result = chatStore.updateChannel(String(req.params.id || ""), req.body || {});
  if (result.error === "not_found") return res.status(404).json({ error: "not_found" });
  res.json(result.channel);
});

app.delete("/api/admin/chat/channels/:id", requireAuth, function (req, res) {
  const result = chatStore.deleteChannel(String(req.params.id || ""));
  if (result.error === "protected") return res.status(400).json({ error: "protected" });
  if (result.error === "not_found") return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
});

app.get("/api/admin/chat/messages", requirePanelChat, function (req, res) {
  const channelId = String((req.query && req.query.channelId) || "").trim();
  if (channelId && !requireChannelPanel(req, res, channelId)) return;
  res.json(chatStore.adminListMessages(180, req.panelUser, channelId || ""));
});

app.delete("/api/admin/chat/messages/:id", requirePanelChat, function (req, res) {
  const id = String(req.params.id || "").trim();
  const channelId = String((req.query && req.query.channelId) || (req.body && req.body.channelId) || "").trim();
  if (!channelId) return res.status(400).json({ error: "missing_channel" });
  if (!requireChannelPanel(req, res, channelId)) return;
  const result = chatStore.adminDeleteMessage(channelId, id);
  if (result.error === "not_found") return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
});

app.post("/api/admin/chat/messages/purge", requirePanelChat, function (req, res) {
  const channelId = String((req.body && req.body.channelId) || "general").trim();
  if (!requireChannelPanel(req, res, channelId)) return;
  const rawCount = req.body && req.body.count;
  const removeAll = rawCount === "all" || rawCount === null || rawCount === undefined;
  let deleteCount = removeAll ? "all" : Number(rawCount);
  if (!removeAll && (!Number.isInteger(deleteCount) || deleteCount <= 0)) {
    return res.status(400).json({ error: "bad_count" });
  }
  const deleted = chatStore.purgeChannel(channelId, deleteCount);
  res.json({ ok: true, deleted: deleted });
});

function sendAdminChatSettings(req, res) {
  res.json(chatHub.getServer());
}

function putAdminChatSettings(req, res) {
  const server = chatHub.updateServer(req.body || {});
  chatStore.updateChannel(server.channelId || "general", { topic: server.topic || "" });
  res.json(server);
}

app.get("/api/admin/chat/settings", requireAuth, sendAdminChatSettings);
app.put("/api/admin/chat/settings", requireAuth, putAdminChatSettings);

app.get("/api/admin/chat/server", requireAuth, sendAdminChatSettings);
app.put("/api/admin/chat/server", requireAuth, putAdminChatSettings);

app.post("/api/admin/chat/messages/:id/pin", requireAuth, function (req, res) {
  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ error: "missing_id" });
  const server = chatHub.setPinnedMessageId(id);
  res.json(server);
});

app.delete("/api/admin/chat/pin", requireAuth, function (req, res) {
  const server = chatHub.setPinnedMessageId("");
  res.json(server);
});

app.post("/api/admin/chat/mute", requireAuth, function (req, res) {
  const userId = String((req.body && req.body.userId) || "").trim();
  const muted = req.body && req.body.muted !== false;
  if (!userId) return res.status(400).json({ error: "missing_user" });
  const server = chatHub.setMuted(userId, muted);
  res.json(server);
});

app.get("/api/admin/featured", requireAuth, function (req, res) {
  res.json(featuredSchedule.list());
});

app.post("/api/admin/featured", requireAuth, function (req, res) {
  const result = featuredSchedule.add(req.body || {});
  if (result.error === "missing_game") return res.status(400).json({ error: "missing_game" });
  if (result.error === "bad_range") return res.status(400).json({ error: "bad_range" });
  res.status(201).json(result.entry);
});

app.delete("/api/admin/featured/:id", requireAuth, function (req, res) {
  const result = featuredSchedule.remove(String(req.params.id || ""));
  if (result.error === "not_found") return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
});

app.get("/api/admin/chat/roles", requireAuth, function (req, res) {
  res.json(chatHub.listRoles());
});

app.post("/api/admin/chat/roles", requireAuth, function (req, res) {
  const result = chatHub.createRole(req.body || {});
  if (result.error === "bad_id") return res.status(400).json({ error: "bad_id" });
  if (result.error === "exists") return res.status(409).json({ error: "exists" });
  res.status(201).json(result.role);
});

app.put("/api/admin/chat/roles/:id", requireAuth, function (req, res) {
  const result = chatHub.updateRole(String(req.params.id || ""), req.body || {});
  if (result.error === "not_found") return res.status(404).json({ error: "not_found" });
  res.json(result.role);
});

app.delete("/api/admin/chat/roles/:id", requireAuth, function (req, res) {
  const result = chatHub.deleteRole(String(req.params.id || ""));
  if (result.error === "protected") return res.status(400).json({ error: "protected" });
  if (result.error === "not_found") return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
});

userAuth.attachAdminRoutes(app, requireAuth);

app.get("/api/admin/security", requirePanelMod, function (req, res) {
  res.json(sec.listBlockedIps());
});

app.post("/api/admin/security/block", requirePanelMod, function (req, res) {
  const ip = String((req.body && req.body.ip) || "").trim();
  const permanent = Boolean(req.body && req.body.permanent);
  if (!ip) return res.status(400).json({ error: "missing_ip" });
  if (permanent) sec.blockIpPermanent(ip);
  else sec.banIp(ip, 86400000, false);
  res.json({ ok: true, blocks: sec.listBlockedIps() });
});

app.post("/api/admin/security/unblock", requirePanelMod, function (req, res) {
  const ip = String((req.body && req.body.ip) || "").trim();
  if (!ip) return res.status(400).json({ error: "missing_ip" });
  sec.unblockIp(ip);
  res.json({ ok: true, blocks: sec.listBlockedIps() });
});

app.get("/api/admin/overview", requirePanelMod, function (req, res) {
  const games = loadBaseGames();
  const overrides = loadOverrides();
  const thumbCdn = readJson(path.join(DATA_DIR, "thumb-cdn.json"), {});
  res.json({
    games: games.length,
    overrides: Object.keys(overrides).length,
    announcements: loadAnnouncements().length,
    changelog: loadChangelog().length,
    chatMessages: countAllChatMessages(),
    chatRevision: chatStore.revision(),
    chatChannels: chatStore.allChannels().length,
    blacklist: loadBlacklistFromDisk().length,
    thumbsCached: thumbFileIndex.size,
    thumbFiles: thumbFileIndex.size,
    thumbMapPaths: thumbCdn.byPath ? Object.keys(thumbCdn.byPath).length : 0,
    ubg: ubgStatic.getBundleStatus(ROOT),
    security: sec.listBlockedIps(),
    adminConfigured: !!ADMIN_KEY,
    discordWebhook: !!String(process.env.DISCORD_VISIT_WEBHOOK || "").trim(),
    nodeVersion: process.version,
    uptime: Math.floor(process.uptime()),
  });
});

app.post("/api/admin/cache/refresh", requirePanelMod, function (req, res) {
  refreshThumbIndex();
  res.json({ ok: true, thumbsCached: thumbFileIndex.size });
});

app.post("/api/admin/blacklist", requirePanelMod, function (req, res) {
  const hwid = normalizeHwid(req.body && req.body.hwid);
  const scope = String((req.body && req.body.scope) || "").trim();
  const blocked = Boolean(req.body && req.body.blocked);
  if (!hwid) return res.status(400).json({ error: "missing_hwid" });
  if (scope !== "chat" && scope !== "site") {
    return res.status(400).json({ error: "bad_scope" });
  }
  const list = loadBlacklistFromDisk();
  let row = list.find(function (x) {
    return x.hwid === hwid;
  });
  if (!row) {
    row = { hwid: hwid, chatBlocked: false, siteBlocked: false, updatedTs: Date.now() };
    list.push(row);
  }
  if (scope === "chat") row.chatBlocked = blocked;
  if (scope === "site") row.siteBlocked = blocked;
  row.updatedTs = Date.now();
  saveBlacklistToDisk(
    list.filter(function (x) {
      return x.chatBlocked || x.siteBlocked;
    })
  );
  res.json({
    hwid: row.hwid,
    chatBlocked: Boolean(row.chatBlocked),
    siteBlocked: Boolean(row.siteBlocked),
  });
});

app.use(sec.staticRateLimit);
app.get("/sail/sw.js", function (req, res, next) {
  var fp = ubgStatic.resolveUbgFile(ROOT, "/sail/sw.js");
  if (!fp) return next();
  res.setHeader("Service-Worker-Allowed", "/");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.sendFile(fp);
});
app.use(function (req, res, next) {
  var p = String(req.path || "").toLowerCase();
  if (/\.(css|js)$/i.test(p)) {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  if (
    p === "/" ||
    p === "/index.html" ||
    p === "/play.html" ||
    p === "/lesson-play.html" ||
    p === "/chat.html" ||
    p === "/app.js" ||
    p === "/cloak.js" ||
    p === "/settings.js" ||
    p === "/styles.css" ||
    p === "/chat-ui.css" ||
    p === "/site-background.css" ||
    p === "/sw.js"
  ) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("CDN-Cache-Control", "no-store");
    res.setHeader("Cloudflare-CDN-Cache-Control", "no-store");
  }
  next();
});
attachThumbHandler(app, { root: ROOT, thumbsDir: THUMBS_DIR, getGames: getMergedGames });
var BLOX_ROOT = ubgStatic.resolveBloxRoot(ROOT);
var UBG_FLAT = ubgStatic.isFlatBundle(BLOX_ROOT);
var UBG_STATUS = ubgStatic.getBundleStatus(ROOT);

app.get("/api/ubg-health", function (req, res) {
  res.json(ubgStatic.getBundleStatus(ROOT));
});

function resolveCineRoot(siteRoot) {
  var candidates = [
    path.join(siteRoot, "Cine-Cloud-SRC-main", "src"),
    path.join(siteRoot, "Cine-Cloud-SRC-main"),
  ];
  for (var i = 0; i < candidates.length; i++) {
    if (fs.existsSync(path.join(candidates[i], "index.html"))) {
      return candidates[i];
    }
  }
  return candidates[0];
}

var CINE_ROOT = resolveCineRoot(ROOT);
var CINE_INDEX = path.join(CINE_ROOT, "index.html");
var cineInstalled = fs.existsSync(CINE_INDEX);

if (cineInstalled) {
  app.get(/^\/cine-cloud\/?$/, function (req, res) {
    res.redirect(301, "/kritikal/");
  });
  app.get(/^\/lumina\/?$/, function (req, res) {
    res.redirect(301, "/kritikal/");
  });
  app.get(/^\/kritikal$/, function (req, res) {
    res.redirect(301, "/kritikal/");
  });
  app.get("/kritikal/", function (req, res) {
    res.sendFile(CINE_INDEX);
  });
  app.get(/^\/kritikal\/(.+)$/, function (req, res, next) {
    var rel = String(req.params[0] || "").split("?")[0];
    if (!rel || rel.indexOf("..") !== -1) return next();
    var fp = path.join(CINE_ROOT, rel);
    if (!fp.startsWith(CINE_ROOT) || !fs.existsSync(fp) || !fs.statSync(fp).isFile()) return next();
    res.sendFile(fp);
  });
  app.get(/^\/lumina\/(.+)$/, function (req, res) {
    var rel = String(req.params[0] || "").split("?")[0];
    return res.redirect(301, "/kritikal/" + rel);
  });
  app.use(
    "/kritikal",
    express.static(CINE_ROOT, {
      dotfiles: "deny",
      index: false,
      maxAge: "1h",
      redirect: false,
    })
  );
} else {
  app.get(/^\/cine-cloud\/?$/, function (req, res) {
    res.redirect(301, "/kritikal/");
  });
  app.get(/^\/lumina\/?$/, function (req, res) {
    res.redirect(301, "/kritikal/");
  });
  app.get(/^\/kritikal\/?$/, function (req, res) {
    res
      .status(503)
      .type("html")
      .send(
        "<!DOCTYPE html><html><head><meta charset=utf-8><title>Kritikal unavailable</title>" +
          "<style>body{font-family:system-ui,sans-serif;background:#0a0a0a;color:#d4d4d4;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}" +
          ".box{text-align:center;max-width:440px;padding:24px;line-height:1.5}a{color:#fff}</style></head><body>" +
          "<div class=box><h1>Kritikal not installed</h1><p>Upload the <b>Cine-Cloud-SRC-main</b> folder into the site directory on the server, then restart.</p>" +
          "<p><a href=/>Back to Kobran</a></p></div></body></html>"
      );
  });
  console.warn(
    "Kritikal disabled: missing Cine-Cloud-SRC-main/src. upload that folder to enable /kritikal"
  );
}
app.get("/chat.html", function (req, res) {
  if (!userAuth.getSessionUser(req)) {
    return res.redirect(302, "/");
  }
  res.sendFile(path.join(ROOT, "chat.html"));
});

var UNBLOCKED_ROOT = path.join(ROOT, "kobran-unblocked");
var UNBLOCKED_INDEX = path.join(UNBLOCKED_ROOT, "index.html");
if (fs.existsSync(UNBLOCKED_INDEX)) {
  app.get(/^\/unblocked\/?$/, function (req, res) {
    res.redirect(301, "/kobranhub/");
  });
  app.get(/^\/kobranhub$/, function (req, res) {
    res.redirect(301, "/kobranhub/");
  });
  app.get("/kobranhub/", function (req, res) {
    res.setHeader("Cache-Control", "no-store");
    res.sendFile(UNBLOCKED_INDEX);
  });
  app.use(
    "/kobranhub",
    function (req, res, next) {
      if (/\.(?:js|css|html)$/i.test(String(req.path || ""))) {
        res.setHeader("Cache-Control", "no-store");
      }
      next();
    },
    express.static(UNBLOCKED_ROOT, {
      dotfiles: "deny",
      index: false,
      maxAge: 0,
      redirect: false,
      setHeaders: function (res) {
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      },
    })
  );
  app.use(
    "/unblocked",
    function (req, res) {
      var rest = String(req.url || "").replace(/^\//, "");
      res.redirect(301, "/kobranhub/" + rest);
    }
  );
}

app.use(ubgStatic.createUbgStatic(ROOT));
app.use(
  express.static(ROOT, {
    dotfiles: "deny",
    index: ["index.html"],
    maxAge: "1h",
  })
);

var UBG_ROUTE_PREFIXES = [
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
];

function isUbgRoute(urlPath) {
  return ubgStatic.isUbgRoute(urlPath);
}

function serveUbgRequest(req, res) {
  if (ubgStatic.serveUbgRequest(ROOT, req, res)) return;
  var hint = ubgStatic.missingHint(ROOT, req.path);
  res.status(404).type("html").send(
    "<!DOCTYPE html><html><head><meta charset=utf-8><title>Not found</title>" +
      "<style>body{font-family:system-ui,sans-serif;background:#0a0a0f;color:#ddd;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}" +
      ".box{text-align:center;padding:24px;max-width:520px;line-height:1.5}a{color:#b794ff}code{background:#1a1a24;padding:2px 6px;border-radius:4px}</style></head><body>" +
      "<div class=box><h1>Hub file missing on VPS</h1>" +
      "<p>Upload into <code>kritikal-UBG-main/</code> (flat, no subfolders):</p>" +
      "<p><code>" + hint.flat + "</code></p>" +
      "<p>Also upload <code>ubg-manifest.json</code> and the rest of the bundle (~359 files).</p>" +
      "<p><a href=/api/ubg-health>Check bundle status (JSON)</a></p>" +
      "<p><a href=/>Back to Kobran</a></p></div></body></html>"
  );
}

function serveSailGoFallback(req, res) {
  res
    .status(200)
    .type("html")
    .setHeader("Cache-Control", "no-store, no-cache, must-revalidate")
    .send(
      "<!DOCTYPE html><html><head><meta charset=utf-8><title>Proxy</title></head><body style=\"margin:0;background:#0a0a0f;color:#fff;font:14px system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh\"><div style=\"text-align:center;padding:24px;max-width:420px;line-height:1.5\">Proxy is starting. If this stays blank, reload the page.<br><br><button onclick=\"location.reload()\" style=\"padding:10px 18px;border-radius:8px;border:0;background:#6d28d9;color:#fff;cursor:pointer\">Reload</button></div><script>" +
        "(function(){if(!('serviceWorker'in navigator))return;function go(){if(navigator.serviceWorker.controller){location.replace(location.href);return;}navigator.serviceWorker.ready.then(function(){location.reload();});}navigator.serviceWorker.register('/sail/sw.js',{scope:'/'}).then(go).catch(function(){navigator.serviceWorker.register('/sail/sw.js',{scope:'/sail/'}).then(go);});})();" +
        "</script></body></html>"
    );
}

function isSailGoPath(urlPath) {
  return String(urlPath || "")
    .toLowerCase()
    .split("?")[0]
    .indexOf("/sail/go/") === 0;
}

app.get("*", function (req, res, next) {
  if (req.path.startsWith("/api/")) return next();
  if (req.path.startsWith("/lumina")) {
    return res.redirect(301, req.path.replace(/^\/lumina/, "/kritikal") || "/kritikal/");
  }
  if (req.path.startsWith("/kritikal/") && cineInstalled) {
    var lumRel = req.path.replace(/^\/kritikal\/?/, "");
    if (lumRel) {
      var lumFp = path.join(CINE_ROOT, lumRel.split("?")[0]);
      if (lumFp.startsWith(CINE_ROOT) && fs.existsSync(lumFp) && fs.statSync(lumFp).isFile()) {
        return res.sendFile(lumFp);
      }
    }
    return res.status(404).type("text/plain").send("Not found");
  }
  if (req.path === "/kritikal" || req.path === "/kritikal/") {
    if (cineInstalled) return res.sendFile(CINE_INDEX);
    return next();
  }
  if (isSailGoPath(req.path)) return serveSailGoFallback(req, res);
  if (isUbgRoute(req.path)) return serveUbgRequest(req, res);
  const ext = path.extname(req.path);
  if (ext) return next();
  if (req.path.startsWith("/admin")) {
    return res.sendFile(path.join(ROOT, "admin", "index.html"));
  }
  return res.sendFile(path.join(ROOT, "index.html"));
});

function syncSailProxyBundle() {
  var nested = path.join(ROOT, "kritikal-UBG-main");
  var flat = path.join(ROOT, "zentra-ubg");
  if (!fs.existsSync(nested) || !fs.existsSync(flat)) return;
  var pairs = [
    ["sail/sw.js", "sail__sw.js"],
    ["sail/embed/index.html", "sail__embed__index.html"],
    ["app-viewer/js/scarmjet.js", "app-viewer__js__scarmjet.js"],
    ["sail/scram/scram-idb.js", "sail__scram__scram-idb.js"],
    ["sail/scram/scramjet.all.js", "sail__scram__scramjet.all.js"],
  ];
  pairs.forEach(function (pair) {
    var src = path.join(nested, pair[0]);
    var dst = path.join(flat, pair[1]);
    if (!fs.existsSync(src)) return;
    try {
      fs.copyFileSync(src, dst);
    } catch (e) {}
  });
}

syncSailProxyBundle();

setImmediate(function () {
  getMusicCatalog();
  getMergedMediaCatalog();
});

const chatWs = attachChatWebSocket({
  userAuth: userAuth,
  chatSessions: chatSessions,
  getBlacklistState: getBlacklistState,
  getDeviceHwid: getDeviceHwid,
});

const httpServer = http.createServer(app);
httpServer.on("upgrade", function (req, socket, head) {
  if (chatWs.handleUpgrade(req, socket, head)) return;
  socket.destroy();
});

httpServer.listen(PORT, function () {
  console.log("Kobran server http://localhost:" + PORT);
  console.log("Data dir " + DATA_DIR);
  console.log("Admin panel http://localhost:" + PORT + "/admin/");
  console.log("API tools http://localhost:" + PORT + "/api/tools/jokes");
  console.log("UBG root " + BLOX_ROOT + (UBG_FLAT ? " (flat)" : " (nested)"));
  console.log("UBG bundle roots: " + UBG_STATUS.roots.map(function (r) { return r.dir; }).join(" | "));
  UBG_STATUS.pages.forEach(function (p) {
    console.log("  " + p.path + " " + (p.ok ? "OK" : "MISSING " + p.needFlat));
  });
  if (process.env.THUMB_WARM_START !== "0" && thumbFileIndex.size < 1500) {
    const warmScript = path.join(ROOT, "warm-thumbnails.js");
    if (fs.existsSync(warmScript)) {
      const child = require("child_process").spawn(process.execPath, [warmScript], {
        cwd: ROOT,
        env: Object.assign({}, process.env, {
          THUMB_MISS_ONLY: "1",
          THUMB_CONCURRENCY: "12",
          THUMBS_DIR: THUMBS_DIR,
        }),
        stdio: "ignore",
        detached: true,
      });
      child.unref();
    }
  }
  setInterval(function () {
    try {
      refreshThumbIndex();
    } catch (e) {}
  }, 30000).unref();
});

mongo.connectMongo().then(function (db) {
  var jobs = [];
  function pushBind(obj) {
    if (db && obj && typeof obj.bindMongo === "function") jobs.push(obj.bindMongo(db));
  }
  pushBind(userAuth);
  pushBind(kobranKeys);
  pushBind({ bindMongo: bindSiteMongo });
  pushBind(chatStore);
  pushBind(chatHub);
  pushBind(chatSessions);
  pushBind(featuredSchedule);
  pushBind(sec);
  return Promise.all(jobs).then(function () {
    if (db) console.log("Mongo persistence on for users, keys, admin, chat");
    else if (mongo.getMongoUri()) console.log("Mongo unavailable, using local data files");
    else console.log("Mongo not configured (set MONGODB_URI)");
  });
});
