require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

express.static.mime.define({ "application/json": ["babylon"] });

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const GAMES_PATH = path.join(ROOT, "games.json");
const OVERRIDES_PATH = path.join(DATA_DIR, "overrides.json");
const ANNOUNCEMENTS_PATH = path.join(DATA_DIR, "announcements.json");
const CHANGELOG_PATH = path.join(DATA_DIR, "changelog.json");
const CHAT_PATH = path.join(DATA_DIR, "chat.json");
const BLACKLIST_PATH = path.join(DATA_DIR, "blacklist.json");
const ADMIN_KEY = String(process.env.ADMIN_KEY || "").trim();
const SECRET_MENU_CODE = String(process.env.SECRET_MENU_CODE || "").trim();
const SECRET_MENU_SLUG = String(process.env.SECRET_MENU_SLUG || "code-37829767").trim();
const MAX_CHAT_MESSAGES = 400;
const PORT = process.env.PORT || 3080;
const sessions = new Map();

const OFFLINE_DIR = path.join(ROOT, "Offline-HTML-Games-Pack-master", "offline");
const IMPORTED_DIR = path.join(OFFLINE_DIR, "imported");
const { resolveLaunchTargets } = require("./launch-resolve");
const { createGameFrameHandler } = require("./game-frame-proxy");
const { attachSecurity } = require("./security");

const app = express();
const sec = attachSecurity(app, { dataDir: DATA_DIR, trustProxy: true });
app.use("/api", sec.apiRateLimit);

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
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
}

function loadAnnouncements() {
  return readJson(ANNOUNCEMENTS_PATH, []);
}

function saveAnnouncements(list) {
  writeJson(ANNOUNCEMENTS_PATH, list);
}

function loadChangelog() {
  return readJson(CHANGELOG_PATH, []);
}

function saveChangelog(list) {
  writeJson(CHANGELOG_PATH, list);
}

function seedJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) writeJson(filePath, fallback);
}

seedJson(CHAT_PATH, { revision: 0, messages: [] });
seedJson(BLACKLIST_PATH, []);
seedJson(CHANGELOG_PATH, []);

let chatMessages = [];
let chatRevision = 0;
const chatRateBuckets = new Map();

function loadChatFromDisk() {
  const data = readJson(CHAT_PATH, { revision: 0, messages: [] });
  chatMessages = Array.isArray(data.messages) ? data.messages.slice(-MAX_CHAT_MESSAGES) : [];
  chatRevision =
    typeof data.revision === "number" && Number.isFinite(data.revision) ? data.revision : 0;
}

function saveChatToDisk() {
  writeJson(CHAT_PATH, { revision: chatRevision, messages: chatMessages });
}

function bumpChatRevision() {
  chatRevision += 1;
}

loadChatFromDisk();

function createChatId() {
  return crypto.randomBytes(16).toString("hex");
}

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

function saveBlacklistToDisk(arr) {
  writeJson(BLACKLIST_PATH, arr);
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

function chatRateLimitOk(authorKey) {
  const now = Date.now();
  const windowMs = 60000;
  const max = 12;
  let arr = chatRateBuckets.get(authorKey);
  if (!arr) {
    arr = [];
    chatRateBuckets.set(authorKey, arr);
  }
  while (arr.length && arr[0] < now - windowMs) arr.shift();
  if (arr.length >= max) return false;
  arr.push(now);
  return true;
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

function saveGamesList(games) {
  writeJson(GAMES_PATH, games);
  fs.writeFileSync(path.join(ROOT, "games.js"), "window.KRITIKAL_GAMES=" + JSON.stringify(games) + ";", "utf8");
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

function createSession() {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { createdAt: Date.now() });
  return token;
}

function isAuthed(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  const token = cookies.kritikal_admin;
  return token && sessions.has(token);
}

function requireAuth(req, res, next) {
  if (isAuthed(req)) return next();
  res.status(401).json({ error: "Unauthorized" });
}

app.use("/api/", function (req, res, next) {
  const p = String(req.path || "");
  if (
    p.startsWith("/admin/") ||
    p === "/block-status" ||
    p.startsWith("/chat/")
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

app.get("/api/chat/messages", denyIfChatBlocked, function (req, res) {
  const headerKey = normalizeAuthorKey(req.headers["x-author-key"]);
  const queryKey = normalizeAuthorKey(req.query && req.query.authorKey);
  const viewerKey = headerKey || queryKey;
  const clientRevRaw = req.query && req.query.rev;
  if (clientRevRaw !== undefined && clientRevRaw !== "") {
    const clientRev = Number(clientRevRaw);
    if (Number.isFinite(clientRev) && clientRev === chatRevision) {
      return res.status(204).end();
    }
  }
  const slice = chatMessages.slice(-120).map(function (m) {
    return {
      id: m.id,
      name: m.name,
      text: m.text,
      ts: m.ts,
      mine: Boolean(viewerKey && m.authorKey === viewerKey),
    };
  });
  res.setHeader("X-Chat-Revision", String(chatRevision));
  res.json(slice);
});

app.post("/api/chat/messages", denyIfChatBlocked, function (req, res) {
  const name = normalizeChatName(req.body && req.body.name);
  const text = normalizeChatText(req.body && req.body.text);
  const authorKey = normalizeAuthorKey(req.body && req.body.authorKey);
  if (!name || !text || !authorKey) {
    return res.status(400).json({ error: "missing_fields" });
  }
  if (!chatRateLimitOk(authorKey)) {
    return res.status(429).json({ error: "rate_limited", retryAfterSeconds: 60 });
  }
  const msg = {
    id: createChatId(),
    name: name,
    text: text,
    authorKey: authorKey,
    deviceHwid: getDeviceHwid(req),
    ts: Date.now(),
  };
  chatMessages.push(msg);
  if (chatMessages.length > MAX_CHAT_MESSAGES) {
    chatMessages.splice(0, chatMessages.length - MAX_CHAT_MESSAGES);
  }
  bumpChatRevision();
  saveChatToDisk();
  res.setHeader("X-Chat-Revision", String(chatRevision));
  res.status(201).json({ id: msg.id, ts: msg.ts });
});

app.delete("/api/chat/messages/:id", denyIfChatBlocked, function (req, res) {
  const authorKey =
    normalizeAuthorKey(req.headers["x-author-key"]) ||
    normalizeAuthorKey(req.body && req.body.authorKey);
  if (!authorKey) return res.status(400).json({ error: "missing_author_key" });
  const id = String(req.params.id || "").trim();
  const idx = chatMessages.findIndex(function (m) {
    return m.id === id;
  });
  if (idx === -1) return res.status(404).json({ error: "not_found" });
  if (chatMessages[idx].authorKey !== authorKey) {
    return res.status(403).json({ error: "forbidden" });
  }
  chatMessages.splice(idx, 1);
  bumpChatRevision();
  saveChatToDisk();
  res.json({ ok: true });
});

app.post("/api/chat/presence", denyIfChatBlocked, function (req, res) {
  res.json({ ok: true });
});

app.get("/api/games", function (req, res) {
  res.json(getMergedGames());
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
  res.json({ authed: isAuthed(req) });
});

app.post("/api/admin/login", sec.adminLoginGuard, function (req, res) {
  if (!ADMIN_KEY) {
    return res.status(503).json({ error: "Admin not configured" });
  }
  const ip = sec.getClientIp(req);
  const key = String((req.body && req.body.key) || "").trim();
  if (key !== ADMIN_KEY) {
    sec.registerLoginFailure(ip);
    return res.status(401).json({ error: "Invalid key" });
  }
  sec.registerLoginSuccess(ip);
  const token = createSession();
  res.setHeader(
    "Set-Cookie",
    "kritikal_admin=" +
      encodeURIComponent(token) +
      "; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400"
  );
  res.json({ ok: true });
});

app.post("/api/admin/logout", function (req, res) {
  const cookies = parseCookies(req.headers.cookie || "");
  if (cookies.kritikal_admin) sessions.delete(cookies.kritikal_admin);
  res.setHeader("Set-Cookie", "kritikal_admin=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
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

app.get("/api/admin/blacklist", requireAuth, function (req, res) {
  res.json(loadBlacklistFromDisk());
});

app.get("/api/admin/chat/messages", requireAuth, function (req, res) {
  res.json(
    chatMessages.slice(-180).map(function (m) {
      return {
        id: m.id,
        name: m.name,
        text: m.text,
        ts: m.ts,
        deviceHwid: m.deviceHwid || "",
      };
    })
  );
});

app.delete("/api/admin/chat/messages/:id", requireAuth, function (req, res) {
  const id = String(req.params.id || "").trim();
  const idx = chatMessages.findIndex(function (m) {
    return m.id === id;
  });
  if (idx === -1) return res.status(404).json({ error: "not_found" });
  chatMessages.splice(idx, 1);
  bumpChatRevision();
  saveChatToDisk();
  res.json({ ok: true });
});

app.post("/api/admin/chat/messages/purge", requireAuth, function (req, res) {
  const rawCount = req.body && req.body.count;
  const removeAll = rawCount === "all" || rawCount === null || rawCount === undefined;
  let deleteCount = chatMessages.length;
  if (!removeAll) {
    const n = Number(rawCount);
    if (!Number.isInteger(n) || n <= 0) {
      return res.status(400).json({ error: "bad_count" });
    }
    deleteCount = Math.min(n, chatMessages.length);
  }
  if (deleteCount <= 0) {
    return res.json({ ok: true, deleted: 0, remaining: chatMessages.length });
  }
  chatMessages.splice(chatMessages.length - deleteCount, deleteCount);
  bumpChatRevision();
  saveChatToDisk();
  res.json({ ok: true });
});

app.get("/api/admin/security", requireAuth, function (req, res) {
  res.json(sec.listBlockedIps());
});

app.post("/api/admin/security/block", requireAuth, function (req, res) {
  const ip = String((req.body && req.body.ip) || "").trim();
  const permanent = Boolean(req.body && req.body.permanent);
  if (!ip) return res.status(400).json({ error: "missing_ip" });
  if (permanent) sec.blockIpPermanent(ip);
  else sec.banIp(ip, 86400000, false);
  res.json({ ok: true, blocks: sec.listBlockedIps() });
});

app.post("/api/admin/security/unblock", requireAuth, function (req, res) {
  const ip = String((req.body && req.body.ip) || "").trim();
  if (!ip) return res.status(400).json({ error: "missing_ip" });
  sec.unblockIp(ip);
  res.json({ ok: true, blocks: sec.listBlockedIps() });
});

app.post("/api/admin/blacklist", requireAuth, function (req, res) {
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
app.use(function (req, res, next) {
  var p = String(req.path || "").toLowerCase();
  if (p === "/play.html" || p === "/lesson-play.html" || p === "/app.js" || p === "/cloak.js" || p === "/settings.js") {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  next();
});
var ubgStatic = require("./ubg-static");
var BLOX_ROOT = ubgStatic.resolveBloxRoot(ROOT);
app.use("/gameFiles", express.static(path.join(BLOX_ROOT, "gameFiles")));
app.use("/refined-beta", express.static(path.join(BLOX_ROOT, "refined-beta")));
var CINE_ROOT = path.join(ROOT, "Cine-Cloud-SRC-main", "src");
app.use(
  "/cine-cloud",
  express.static(CINE_ROOT, {
    dotfiles: "deny",
    index: ["index.html"],
    maxAge: "1h",
  })
);
app.use(ubgStatic.createUbgStatic(BLOX_ROOT));
app.use(
  express.static(ROOT, {
    dotfiles: "deny",
    index: ["index.html"],
    maxAge: "1h",
  })
);

app.get("/cine-cloud", function (req, res) {
  res.redirect(301, "/cine-cloud/");
});

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
  var p = String(urlPath || "").toLowerCase();
  for (var i = 0; i < UBG_ROUTE_PREFIXES.length; i++) {
    var prefix = UBG_ROUTE_PREFIXES[i];
    if (p === prefix || p.startsWith(prefix + "/")) return true;
  }
  if (p === "/tools" || p.startsWith("/tools/")) return true;
  return false;
}

app.get("*", function (req, res, next) {
  if (req.path.startsWith("/api/")) return next();
  if (req.path.startsWith("/cine-cloud")) return next();
  const ext = path.extname(req.path);
  if (ext) return next();
  if (isUbgRoute(req.path)) return res.status(404).send("Not found");
  if (req.path.startsWith("/admin")) {
    return res.sendFile(path.join(ROOT, "admin", "index.html"));
  }
  return res.sendFile(path.join(ROOT, "index.html"));
});

app.listen(PORT, function () {
  console.log("Zentra server http://localhost:" + PORT);
  console.log("Admin panel http://localhost:" + PORT + "/admin/");
  console.log("UBG root " + BLOX_ROOT);
});
