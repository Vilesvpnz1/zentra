require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const https = require("https");

express.static.mime.define({ "application/json": ["babylon"] });

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const GAMES_PATH = path.join(ROOT, "games.json");
const MOVIES_CATALOG_PATH = path.join(ROOT, "movies-catalog.json");
const MUSIC_CATALOG_PATH = path.join(ROOT, "music-catalog.json");
const OVERRIDES_PATH = path.join(DATA_DIR, "overrides.json");
const ANNOUNCEMENTS_PATH = path.join(DATA_DIR, "announcements.json");
const CHANGELOG_PATH = path.join(DATA_DIR, "changelog.json");
const CHANGELOG_SEED_PATH = path.join(ROOT, "changelog.seed.json");
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
const { attachApiTools } = require("./api-tools");
const { attachAiChat } = require("./ai-providers");
const { attachThumbHandler } = require("./thumb-handler");
const { resolveCoverUrls } = require("./thumb-resolve");

const app = express();
const sec = attachSecurity(app, { dataDir: DATA_DIR, trustProxy: true });
app.use("/api", sec.apiRateLimit);

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
}

function loadAnnouncements() {
  return readJson(ANNOUNCEMENTS_PATH, []);
}

function saveAnnouncements(list) {
  writeJson(ANNOUNCEMENTS_PATH, list);
}

function loadChangelog() {
  const list = readJson(CHANGELOG_PATH, null);
  if (Array.isArray(list) && list.length) return list;
  const seed = readJson(CHANGELOG_SEED_PATH, []);
  return Array.isArray(seed) ? seed : [];
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
  const games = getMergedGames().map(function (game) {
    let cover = "";
    let covers = [];
    try {
      covers = resolveCoverUrls(game).slice(0, 10);
      cover = covers[0] || "";
    } catch (e) {
      cover = "";
      covers = [];
    }
    return Object.assign({}, game, { cover: cover, covers: covers });
  });
  res.setHeader("Cache-Control", "public, max-age=300");
  res.json(games);
});

function audiusRequest(apiPath, query, res) {
  var qs = query && Object.keys(query).length ? "?" + new URLSearchParams(query).toString() : "";
  var url = "https://discoveryprovider.audius.co/v1" + apiPath + qs;
  https
    .get(url, { headers: { Accept: "application/json", "User-Agent": "Zentra/1.0" } }, function (upstream) {
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
      .get(url, { headers: { Accept: "application/json", "User-Agent": "Zentra/1.0" } }, function (upstream) {
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
      .get(url, { headers: { Accept: "application/json", "User-Agent": "Zentra/1.0" } }, function (upstream) {
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
    audiusFetchJson("/tracks/trending", { limit: "100", app_name: "Zentra" }),
    audiusFetchJson("/tracks/trending/underground", { limit: "100", app_name: "Zentra" }).catch(function () {
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
    audiusFetchJson("/tracks/trending", { limit: "100", app_name: "Zentra" }),
    audiusFetchJson("/tracks/trending/underground", { limit: "100", app_name: "Zentra" }).catch(function () {
      return { data: [] };
    }),
    audiusFetchJson("/playlists/trending", { limit: "50", app_name: "Zentra" }).catch(function () {
      return { data: [] };
    }),
  ];
  AUDIUS_GENRES.forEach(function (genre) {
    jobs.push(
      audiusFetchJson("/tracks/trending", { limit: "50", genre: genre, app_name: "Zentra" }).catch(function () {
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
              app_name: "Zentra",
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
    audiusFetchJson("/tracks/trending", { limit: "100", offset: offset, app_name: "Zentra" }).catch(function () {
      return { data: [] };
    }),
    audiusFetchJson("/tracks/trending/underground", { limit: "100", offset: offset, app_name: "Zentra" }).catch(function () {
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
        app_name: "Zentra",
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
var cachedMusicCatalog = null;
var musicFeedCache = { payload: null, at: 0 };
var MUSIC_FEED_CACHE_MS = 300000;

function getMusicCatalog() {
  if (!cachedMusicCatalog) cachedMusicCatalog = readJson(MUSIC_CATALOG_PATH, []);
  return cachedMusicCatalog;
}

app.get("/api/movies/catalog", function (req, res) {
  if (!cachedMoviesCatalog) cachedMoviesCatalog = readJson(MOVIES_CATALOG_PATH, []);
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.json(cachedMoviesCatalog);
});

app.get("/api/music/catalog", function (req, res) {
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.json(getMusicCatalog());
});

app.get("/api/music/trending", function (req, res) {
  var limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 100);
  audiusRequest("/tracks/trending", { limit: String(limit), app_name: "Zentra" }, res);
});

app.get("/api/music/feed", function (req, res) {
  var page = Math.max(parseInt(req.query.page, 10) || 0, 0);
  if (page === 0 && musicFeedCache.payload && Date.now() - musicFeedCache.at < MUSIC_FEED_CACHE_MS) {
    res.setHeader("Cache-Control", "public, max-age=120");
    return res.json(musicFeedCache.payload);
  }
  var jobs = [];
  if (page === 0) jobs.push(fetchAudiusQuickFeed());
  else {
    jobs.push(fetchAudiusOffsetFeed(page));
    jobs.push(fetchArchiveTracks(page));
  }
  Promise.all(jobs)
    .then(function (results) {
      var merged = [];
      results.forEach(function (batch) {
        merged = merged.concat(batch || []);
      });
      if (page === 0) {
        var staticTracks = getMusicCatalog();
        if (Array.isArray(staticTracks) && staticTracks.length) {
          merged = staticTracks.concat(merged);
        }
      }
      var payload = {
        data: dedupeTracks(merged),
        hasMore: page < 50,
        nextPage: page + 1,
      };
      if (page === 0) {
        musicFeedCache.payload = payload;
        musicFeedCache.at = Date.now();
        res.setHeader("Cache-Control", "public, max-age=120");
      }
      res.json(payload);
    })
    .catch(function () {
      res.status(502).json({ error: "Music service unavailable", data: [], hasMore: false, nextPage: page + 1 });
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
      app_name: "Zentra",
    }),
    audiusFetchJson("/tracks/search", {
      query: q,
      limit: String(limit),
      offset: String(offset),
      sortMethod: "recent",
      app_name: "Zentra",
    }).catch(function () {
      return { data: [] };
    }),
    offset === 0
      ? audiusFetchJson("/users/search", { query: q, limit: "20", app_name: "Zentra" }).catch(function () {
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
          app_name: "Zentra",
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
          hasMore: Array.isArray(trackPayload.data) && trackPayload.data.length >= limit,
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
  res.redirect(302, "https://discoveryprovider.audius.co/v1/tracks/" + encodeURIComponent(id) + "/stream?app_name=Zentra");
});

attachApiTools(app, {
  httpsFetchJson: httpsFetchJson,
  httpsFetchText: httpsFetchText,
  audiusFetchJson: audiusFetchJson,
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
    "User-Agent": "Zentra/1.0",
    Accept: "application/json, text/plain, */*",
  };
  var auth = String(req.headers["x-proxy-auth"] || payload.auth || "").trim();
  if (auth) {
    if (auth.indexOf("Bot ") === 0 || auth.indexOf("Bearer ") === 0) headers.Authorization = auth;
    else if (target.indexOf("discord.com") !== -1) headers.Authorization = "Bot " + auth;
    else headers.Authorization = "Bearer " + auth;
  }
  if (target.indexOf("reddit.com") !== -1) headers["User-Agent"] = "ZentraApiClient/1.0";
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
  if (
    p === "/" ||
    p === "/index.html" ||
    p === "/play.html" ||
    p === "/lesson-play.html" ||
    p === "/app.js" ||
    p === "/cloak.js" ||
    p === "/settings.js" ||
    p === "/styles.css"
  ) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  next();
});
attachThumbHandler(app, { root: ROOT, getGames: getMergedGames });
var ubgStatic = require("./ubg-static");
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
  app.get(/^\/cine-cloud$/, function (req, res) {
    res.redirect(301, "/cine-cloud/");
  });
  app.get("/cine-cloud/", function (req, res) {
    res.sendFile(CINE_INDEX);
  });
  app.use(
    "/cine-cloud",
    express.static(CINE_ROOT, {
      dotfiles: "deny",
      index: false,
      maxAge: "1h",
      redirect: false,
    })
  );
} else {
  app.get(/^\/cine-cloud\/?$/, function (req, res) {
    res
      .status(503)
      .type("html")
      .send(
        "<!DOCTYPE html><html><head><meta charset=utf-8><title>Kritikal unavailable</title>" +
          "<style>body{font-family:system-ui,sans-serif;background:#0a0a0a;color:#d4d4d4;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}" +
          ".box{text-align:center;max-width:440px;padding:24px;line-height:1.5}a{color:#fff}</style></head><body>" +
          "<div class=box><h1>Kritikal not installed</h1><p>Upload the <b>Cine-Cloud-SRC-main</b> folder into the site directory on the server, then restart.</p>" +
          "<p><a href=/>Back to Zentra</a></p></div></body></html>"
      );
  });
  console.warn(
    "Kritikal disabled: missing Cine-Cloud-SRC-main/src — upload that folder to enable /cine-cloud/"
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
      "<p>Upload into <code>zentra/zentra-ubg/</code> (flat, no subfolders):</p>" +
      "<p><code>" + hint.flat + "</code></p>" +
      "<p>Also upload <code>ubg-manifest.json</code> and the rest of the bundle (~359 files).</p>" +
      "<p><a href=/api/ubg-health>Check bundle status (JSON)</a></p>" +
      "<p><a href=/>Back to Zentra</a></p></div></body></html>"
  );
}

app.get("*", function (req, res, next) {
  if (req.path.startsWith("/api/")) return next();
  if (req.path.startsWith("/cine-cloud")) return next();
  if (isUbgRoute(req.path)) return serveUbgRequest(req, res);
  const ext = path.extname(req.path);
  if (ext) return next();
  if (req.path.startsWith("/admin")) {
    return res.sendFile(path.join(ROOT, "admin", "index.html"));
  }
  return res.sendFile(path.join(ROOT, "index.html"));
});

app.listen(PORT, function () {
  console.log("Zentra server http://localhost:" + PORT);
  console.log("Admin panel http://localhost:" + PORT + "/admin/");
  console.log("API tools http://localhost:" + PORT + "/api/tools/jokes");
  console.log("UBG root " + BLOX_ROOT + (UBG_FLAT ? " (flat)" : " (nested)"));
  console.log("UBG bundle roots: " + UBG_STATUS.roots.map(function (r) { return r.dir; }).join(" | "));
  UBG_STATUS.pages.forEach(function (p) {
    console.log("  " + p.path + " " + (p.ok ? "OK" : "MISSING " + p.needFlat));
  });
});
