const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const https = require("https");
const http = require("http");

const CLAIM_TTL_MS = 30 * 60 * 1000;
const KEY_DURATION_MS = 24 * 60 * 60 * 1000;
const REDEEM_TTL_MS = 3 * 60 * 1000;
const MIN_COMPLETE_MS = 8000;
const CLEAN_EVERY_MS = 5 * 60 * 1000;
const BYPASS_SUSPEND_MS = 3 * 60 * 60 * 1000;
const CLAIM_COOKIE = "kobran_key_claim";

function createKobranKeySystem(options) {
  const root = options.root;
  const configPath = path.join(root, "kobran-unblocked", "key-config.json");
  const storePath = path.join(root, "data", "kobran-key-claims.json");
  const secretPath = path.join(root, "data", "kobran-key-secret.txt");
  const strikePath = path.join(root, "data", "kobran-bypass-strikes.json");
  const claims = new Map();
  const strikes = new Map();
  const secret = loadSecret();
  hydrateStrikes();

  function loadSecret() {
    var fromEnv = String(process.env.KOBRAN_KEY_SECRET || process.env.ADMIN_KEY || "").trim();
    if (fromEnv) return fromEnv;
    try {
      if (fs.existsSync(secretPath)) {
        var existing = String(fs.readFileSync(secretPath, "utf8") || "").trim();
        if (existing) return existing;
      }
    } catch (e) {}
    var made = crypto.randomBytes(32).toString("hex");
    try {
      fs.mkdirSync(path.dirname(secretPath), { recursive: true });
      fs.writeFileSync(secretPath, made);
    } catch (e) {}
    return made;
  }

  function loadConfig() {
    var linkvertiseUrl = String(process.env.KOBRAN_LINKVERTISE_URL || "").trim();
    var antiBypassToken = String(process.env.KOBRAN_ANTI_BYPASS_TOKEN || "").trim();
    var defaultKeyDurationMs = KEY_DURATION_MS;
    try {
      if (fs.existsSync(configPath)) {
        var raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
        if (raw && raw.linkvertiseUrl) linkvertiseUrl = String(raw.linkvertiseUrl).trim();
        if (raw && raw.antiBypassToken) antiBypassToken = String(raw.antiBypassToken).trim();
        if (raw && Number(raw.defaultKeyDurationMs) > 0) {
          defaultKeyDurationMs = Number(raw.defaultKeyDurationMs);
        }
      }
    } catch (e) {}
    return {
      linkvertiseUrl: linkvertiseUrl,
      antiBypassToken: antiBypassToken,
      defaultKeyDurationMs: defaultKeyDurationMs,
    };
  }

  function saveConfig(partial) {
    var current = loadConfig();
    var next = {
      linkvertiseUrl: current.linkvertiseUrl,
      antiBypassToken: current.antiBypassToken,
      defaultKeyDurationMs: current.defaultKeyDurationMs,
    };
    if (partial && typeof partial.linkvertiseUrl === "string") {
      next.linkvertiseUrl = String(partial.linkvertiseUrl).trim();
    }
    if (partial && typeof partial.antiBypassToken === "string") {
      next.antiBypassToken = String(partial.antiBypassToken).trim();
    }
    if (partial && Number(partial.defaultKeyDurationMs) > 0) {
      next.defaultKeyDurationMs = Math.floor(Number(partial.defaultKeyDurationMs));
    }
    try {
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify(next, null, 2));
    } catch (e) {}
    return next;
  }

  function getDefaultKeyDurationMs() {
    return loadConfig().defaultKeyDurationMs || KEY_DURATION_MS;
  }

  function formatDurationLabel(ms) {
    var n = Math.max(0, Math.floor(Number(ms) || 0));
    if (!n) return "0";
    var days = Math.floor(n / 86400000);
    var hours = Math.floor((n % 86400000) / 3600000);
    var mins = Math.floor((n % 3600000) / 60000);
    if (days && !hours && !mins) return days === 1 ? "1 day" : days + " days";
    if (!days && hours && !mins) return hours === 1 ? "1 hour" : hours + " hours";
    if (!days && !hours && mins) return mins === 1 ? "1 minute" : mins + " minutes";
    var parts = [];
    if (days) parts.push(days + (days === 1 ? " day" : " days"));
    if (hours) parts.push(hours + (hours === 1 ? " hour" : " hours"));
    if (mins) parts.push(mins + (mins === 1 ? " minute" : " minutes"));
    return parts.join(" ") || n + " ms";
  }

  function parseDurationMs(value, fallbackMs) {
    if (typeof value === "number" && value > 0) return Math.floor(value);
    var raw = String(value || "").trim().toLowerCase();
    if (!raw) return fallbackMs || 0;
    if (/^\d+$/.test(raw)) return Math.floor(Number(raw));
    var match = raw.match(/^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d|sec|secs|second|seconds|min|mins|minute|minutes|hr|hrs|hour|hours|day|days)?$/);
    if (!match) return fallbackMs || 0;
    var amount = Number(match[1]);
    var unit = match[2] || "h";
    if (!amount || amount <= 0) return fallbackMs || 0;
    if (unit === "ms") return Math.floor(amount);
    if (unit === "s" || unit === "sec" || unit === "secs" || unit === "second" || unit === "seconds") {
      return Math.floor(amount * 1000);
    }
    if (unit === "m" || unit === "min" || unit === "mins" || unit === "minute" || unit === "minutes") {
      return Math.floor(amount * 60 * 1000);
    }
    if (unit === "h" || unit === "hr" || unit === "hrs" || unit === "hour" || unit === "hours") {
      return Math.floor(amount * 60 * 60 * 1000);
    }
    if (unit === "d" || unit === "day" || unit === "days") {
      return Math.floor(amount * 24 * 60 * 60 * 1000);
    }
    return fallbackMs || 0;
  }

  function keyStatus(row, now) {
    if (!row) return "missing";
    if (row.expiresAt && now > row.expiresAt) return "expired";
    if (row.claimedAt && row.expiresAt) return "active";
    if (row.verifiedAt) return "ready";
    return "pending";
  }

  function normalizeBindHwid(value) {
    return String(value || "")
      .trim()
      .slice(0, 160);
  }

  function serializeKey(id, row, now) {
    now = now || Date.now();
    return {
      id: id,
      key: row.key || "",
      createdAt: row.createdAt || 0,
      claimedAt: row.claimedAt || 0,
      verifiedAt: row.verifiedAt || 0,
      expiresAt: row.expiresAt || 0,
      ip: row.ip || "",
      note: row.note || "",
      source: row.source || "linkvertise",
      boundHwid: row.boundHwid || "",
      boundAt: row.boundAt || 0,
      boundIp: row.boundIp || "",
      status: keyStatus(row, now),
      remainingMs: row.expiresAt && row.expiresAt > now ? row.expiresAt - now : 0,
    };
  }

  function findClaimByKey(keyRaw) {
    var want = String(keyRaw || "")
      .trim()
      .toUpperCase();
    if (!want) return null;
    var found = null;
    claims.forEach(function (row, id) {
      if (found) return;
      if (row && String(row.key || "").toUpperCase() === want) {
        found = { id: id, row: row };
      }
    });
    return found;
  }

  function ensureStoreDir() {
    try {
      fs.mkdirSync(path.dirname(storePath), { recursive: true });
    } catch (e) {}
  }

  function persistStrikes() {
    ensureStoreDir();
    var out = {};
    strikes.forEach(function (value, key) {
      out[key] = value;
    });
    try {
      fs.writeFileSync(strikePath, JSON.stringify(out));
    } catch (e) {}
  }

  function hydrateStrikes() {
    try {
      if (!fs.existsSync(strikePath)) return;
      var raw = JSON.parse(fs.readFileSync(strikePath, "utf8"));
      Object.keys(raw || {}).forEach(function (id) {
        strikes.set(id, raw[id]);
      });
    } catch (e) {}
  }

  function strikeKey(ip) {
    return String(ip || "").trim() || "unknown";
  }

  function getSuspension(ip) {
    var key = strikeKey(ip);
    var row = strikes.get(key);
    if (!row) return null;
    var until = Number(row.suspendedUntil || 0);
    if (!until) return null;
    if (Date.now() >= until) {
      row.suspendedUntil = 0;
      row.count = 0;
      strikes.set(key, row);
      persistStrikes();
      return null;
    }
    return { until: until, remainingMs: until - Date.now() };
  }

  function recordBypass(ip) {
    var key = strikeKey(ip);
    var now = Date.now();
    var row = strikes.get(key) || { count: 0, suspendedUntil: 0, updatedAt: now };
    if (row.suspendedUntil && now < row.suspendedUntil) {
      return { suspended: true, until: row.suspendedUntil, count: row.count || 0 };
    }
    if (row.suspendedUntil && now >= row.suspendedUntil) {
      row.suspendedUntil = 0;
      row.count = 0;
    }
    row.count = (row.count || 0) + 1;
    row.updatedAt = now;
    if (row.count >= 2) {
      row.suspendedUntil = now + BYPASS_SUSPEND_MS;
      strikes.set(key, row);
      persistStrikes();
      return { suspended: true, until: row.suspendedUntil, count: row.count, first: false };
    }
    strikes.set(key, row);
    persistStrikes();
    return { suspended: false, until: 0, count: row.count, first: true };
  }

  function handleBypassRedirect(req, res) {
    var ip = "";
    try {
      ip = options.getClientIp ? options.getClientIp(req) : "";
    } catch (e) {}
    var result = recordBypass(ip);
    if (result.suspended) return res.redirect(302, "/unblocked/suspended");
    return res.redirect(302, "/unblocked/bypass");
  }

  function persist() {
    ensureStoreDir();
    var out = {};
    claims.forEach(function (value, key) {
      out[key] = value;
    });
    try {
      fs.writeFileSync(storePath, JSON.stringify(out));
    } catch (e) {}
  }

  function hydrate() {
    try {
      if (!fs.existsSync(storePath)) return;
      var raw = JSON.parse(fs.readFileSync(storePath, "utf8"));
      Object.keys(raw || {}).forEach(function (id) {
        claims.set(id, raw[id]);
      });
    } catch (e) {}
  }

  function cleanup() {
    var now = Date.now();
    var changed = false;
    claims.forEach(function (value, key) {
      if (!value) {
        claims.delete(key);
        changed = true;
        return;
      }
      if (value.expiresAt && now > value.expiresAt) {
        claims.delete(key);
        changed = true;
        return;
      }
      if (value.claimedAt) return;
      if (now - (value.createdAt || 0) > CLAIM_TTL_MS) {
        claims.delete(key);
        changed = true;
      }
    });
    if (changed) persist();
  }

  function makeKey() {
    var a = crypto.randomBytes(3).toString("hex").toUpperCase();
    var b = crypto.randomBytes(3).toString("hex").toUpperCase();
    var c = crypto.randomBytes(3).toString("hex").toUpperCase();
    return "KOBRAN-" + a + "-" + b + "-" + c;
  }

  function parseCookies(header) {
    var out = {};
    String(header || "")
      .split(";")
      .forEach(function (part) {
        var i = part.indexOf("=");
        if (i < 1) return;
        var k = part.slice(0, i).trim();
        var v = part.slice(i + 1).trim();
        if (!k) return;
        try {
          out[k] = decodeURIComponent(v);
        } catch (e) {
          out[k] = v;
        }
      });
    return out;
  }

  function setClaimCookie(res, claimId) {
    var secure = process.env.RENDER || process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.setHeader(
      "Set-Cookie",
      CLAIM_COOKIE +
        "=" +
        encodeURIComponent(claimId) +
        "; Path=/; HttpOnly; SameSite=Lax; Max-Age=1800" +
        secure
    );
  }

  function clearClaimCookie(res) {
    var secure = process.env.RENDER || process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.setHeader(
      "Set-Cookie",
      CLAIM_COOKIE + "=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0" + secure
    );
  }

  function httpRequest(url, method) {
    return new Promise(function (resolve, reject) {
      var lib = url.indexOf("https:") === 0 ? https : http;
      var req = lib.request(
        url,
        {
          method: method || "GET",
          headers: {
            Accept: "*/*",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          },
          timeout: 12000,
        },
        function (res) {
          var chunks = [];
          res.on("data", function (c) {
            chunks.push(c);
          });
          res.on("end", function () {
            resolve({
              status: res.statusCode || 0,
              body: Buffer.concat(chunks).toString("utf8").trim(),
            });
          });
        }
      );
      req.on("error", reject);
      req.on("timeout", function () {
        req.destroy();
        reject(new Error("timeout"));
      });
      req.end();
    });
  }

  function isTrueBody(body) {
    var text = String(body || "")
      .trim()
      .replace(/^"+|"+$/g, "")
      .toUpperCase();
    if (text === "TRUE" || text === "1" || text === "OK") return true;
    try {
      var json = JSON.parse(body);
      if (json === true) return true;
      if (json && (json.valid === true || json.success === true || json.data === true)) return true;
      if (json && String(json.result || json.status || "").toUpperCase() === "TRUE") return true;
    } catch (e) {}
    return false;
  }

  async function verifyAntiBypassHash(hash) {
    var config = loadConfig();
    var token = config.antiBypassToken;
    if (!token) return { ok: false, error: "token_missing" };
    var cleanHash = String(hash || "").trim();
    if (!cleanHash || cleanHash.length < 8) return { ok: false, error: "hash_missing" };

    var endpoints = [
      {
        method: "GET",
        url:
          "https://publisher.linkvertise.com/api/v1/anti_bypassing?token=" +
          encodeURIComponent(token) +
          "&hash=" +
          encodeURIComponent(cleanHash),
      },
      {
        method: "POST",
        url:
          "https://publisher.linkvertise.com/api/v1/validation/verify?token=" +
          encodeURIComponent(token) +
          "&hash=" +
          encodeURIComponent(cleanHash),
      },
      {
        method: "GET",
        url:
          "https://publisher.linkvertise.com/api/v1/antibypass/validate?token=" +
          encodeURIComponent(token) +
          "&hash=" +
          encodeURIComponent(cleanHash),
      },
    ];

    for (var i = 0; i < endpoints.length; i++) {
      try {
        var res = await httpRequest(endpoints[i].url, endpoints[i].method);
        if (res.status >= 200 && res.status < 300 && isTrueBody(res.body)) {
          return { ok: true };
        }
        if (res.status >= 200 && res.status < 300) {
          var upper = String(res.body || "").toUpperCase();
          if (upper.indexOf("FALSE") !== -1 || upper.indexOf("INVALID") !== -1) {
            return { ok: false, error: "invalid_hash" };
          }
        }
      } catch (e) {}
    }
    return { ok: false, error: "verify_failed" };
  }

  function signRedeem(claimId) {
    var exp = Date.now() + REDEEM_TTL_MS;
    var payload = claimId + "." + exp;
    var sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    return payload + "." + sig;
  }

  function verifyRedeem(token) {
    var raw = String(token || "").trim();
    var parts = raw.split(".");
    if (parts.length !== 3) return null;
    var claimId = parts[0];
    var exp = Number(parts[1]);
    var sig = parts[2];
    if (!claimId || !exp || !sig) return null;
    if (Date.now() > exp) return null;
    var payload = claimId + "." + exp;
    var expect = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    try {
      var a = Buffer.from(sig, "utf8");
      var b = Buffer.from(expect, "utf8");
      if (a.length !== b.length) return null;
      if (!crypto.timingSafeEqual(a, b)) return null;
    } catch (e) {
      return null;
    }
    return claimId;
  }

  function startClaim(clientIp, res) {
    cleanup();
    var config = loadConfig();
    if (!config.linkvertiseUrl) {
      return {
        ok: false,
        error: "linkvertise_not_configured",
        message: "key system isnt set up yet. add ur linkvertise url first.",
      };
    }
    if (!config.antiBypassToken) {
      return {
        ok: false,
        error: "antibypass_not_configured",
        message: "anti bypass token missing. add it in key-config.",
      };
    }
    var claimId = crypto.randomBytes(18).toString("hex");
    var key = makeKey();
    claims.set(claimId, {
      key: key,
      createdAt: Date.now(),
      claimedAt: 0,
      verifiedAt: 0,
      expiresAt: 0,
      ip: String(clientIp || "").trim(),
    });
    persist();
    if (res) setClaimCookie(res, claimId);
    var durationMs = getDefaultKeyDurationMs();
    return {
      ok: true,
      claimId: claimId,
      linkvertiseUrl: config.linkvertiseUrl,
      keyDurationMs: durationMs,
      keyDurationLabel: formatDurationLabel(durationMs),
    };
  }

  async function completeClaim(req, res) {
    cleanup();
    var cookies = parseCookies(req.headers.cookie || "");
    var claimId = String(cookies[CLAIM_COOKIE] || "").trim();
    var hash = String((req.query && req.query.hash) || "").trim();

    if (!claimId || !claims.has(claimId)) {
      return res.redirect(302, "/unblocked/?keyerr=missing#key");
    }
    if (!hash) {
      return handleBypassRedirect(req, res);
    }

    var row = claims.get(claimId);
    if (!row) return res.redirect(302, "/unblocked/?keyerr=missing#key");
    if (Date.now() - (row.createdAt || 0) < MIN_COMPLETE_MS) {
      return res.redirect(302, "/unblocked/?keyerr=wait#key");
    }

    var verified = await verifyAntiBypassHash(hash);
    if (!verified.ok) {
      if (verified.error === "invalid_hash" || verified.error === "hash_missing") {
        return handleBypassRedirect(req, res);
      }
      return res.redirect(302, "/unblocked/?keyerr=ad#key");
    }

    row.verifiedAt = Date.now();
    claims.set(claimId, row);
    persist();
    var token = signRedeem(claimId);
    return res.redirect(
      302,
      "/unblocked/?keydone=1&t=" + encodeURIComponent(token) + "#key"
    );
  }

  function claimKey(claimId, token) {
    cleanup();
    var idFromToken = verifyRedeem(token);
    if (!idFromToken) {
      return {
        ok: false,
        error: "bad_token",
        message: "finish the ad first. closing it and skipping wont work.",
      };
    }
    var id = String(claimId || "").trim() || idFromToken;
    if (id !== idFromToken) {
      return {
        ok: false,
        error: "claim_mismatch",
        message: "finish the ad first. closing it and skipping wont work.",
      };
    }
    var row = claims.get(id);
    if (!row) {
      return { ok: false, error: "not_found", message: "claim expired or invalid. generate a new key." };
    }
    if (!row.verifiedAt) {
      return {
        ok: false,
        error: "not_verified",
        message: "finish the ad first. closing it and skipping wont work.",
      };
    }
    var durationMs = getDefaultKeyDurationMs();
    if (row.claimedAt && row.expiresAt) {
      if (Date.now() > row.expiresAt) {
        return { ok: false, error: "expired", message: "that key expired. generate a new one." };
      }
      return {
        ok: true,
        key: row.key,
        already: true,
        expiresAt: row.expiresAt,
        keyDurationMs: durationMs,
        keyDurationLabel: formatDurationLabel(durationMs),
      };
    }
    row.claimedAt = Date.now();
    row.expiresAt = row.claimedAt + durationMs;
    claims.set(id, row);
    persist();
    return {
      ok: true,
      key: row.key,
      already: false,
      expiresAt: row.expiresAt,
      keyDurationMs: durationMs,
      keyDurationLabel: formatDurationLabel(durationMs),
    };
  }

  function getPublicConfig() {
    var config = loadConfig();
    var durationMs = getDefaultKeyDurationMs();
    return {
      configured: !!config.linkvertiseUrl && !!config.antiBypassToken,
      donePath: "/api/kobran/key/complete",
      validatePath: "/api/kobran/key/validate",
      keyDurationMs: durationMs,
      keyDurationLabel: formatDurationLabel(durationMs),
    };
  }

  function validateKey(payload) {
    cleanup();
    var keyRaw = String((payload && payload.key) || "").trim();
    var hwid = normalizeBindHwid(payload && payload.hwid);
    var clientIp = String((payload && payload.ip) || "").trim();
    if (!keyRaw) {
      return { ok: false, error: "missing_key", message: "key is required." };
    }
    if (!hwid || hwid.length < 6) {
      return { ok: false, error: "missing_hwid", message: "hwid is required." };
    }
    var found = findClaimByKey(keyRaw);
    if (!found || !found.row) {
      return { ok: false, error: "invalid", message: "invalid key." };
    }
    var row = found.row;
    var now = Date.now();
    if (!row.claimedAt || !row.expiresAt) {
      return { ok: false, error: "not_ready", message: "that key isnt ready yet." };
    }
    if (now > row.expiresAt) {
      return { ok: false, error: "expired", message: "that key expired." };
    }
    var bound = normalizeBindHwid(row.boundHwid);
    if (!bound) {
      row.boundHwid = hwid;
      row.boundAt = now;
      row.boundIp = clientIp;
      claims.set(found.id, row);
      persist();
    } else if (bound !== hwid) {
      return {
        ok: false,
        error: "hwid_mismatch",
        message: "this key is locked to another device.",
      };
    } else if (clientIp && !row.boundIp) {
      row.boundIp = clientIp;
      claims.set(found.id, row);
      persist();
    }
    var durationMs = getDefaultKeyDurationMs();
    return {
      ok: true,
      key: row.key,
      expiresAt: row.expiresAt,
      remainingMs: row.expiresAt - now,
      keyDurationMs: durationMs,
      keyDurationLabel: formatDurationLabel(durationMs),
      bound: true,
    };
  }

  function listKeysAdmin() {
    cleanup();
    var now = Date.now();
    var out = [];
    claims.forEach(function (row, id) {
      out.push(serializeKey(id, row, now));
    });
    out.sort(function (a, b) {
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    return out;
  }

  function createKeyAdmin(payload) {
    cleanup();
    var now = Date.now();
    var durationMs = parseDurationMs(
      payload && (payload.durationMs != null ? payload.durationMs : payload.duration),
      getDefaultKeyDurationMs()
    );
    if (!durationMs || durationMs < 60000) {
      return { ok: false, error: "bad_duration", message: "duration must be at least 1 minute." };
    }
    var customKey = String((payload && payload.key) || "").trim().toUpperCase();
    if (customKey) {
      var clash = false;
      claims.forEach(function (row) {
        if (row && String(row.key || "").toUpperCase() === customKey) clash = true;
      });
      if (clash) return { ok: false, error: "duplicate_key", message: "that key already exists." };
    }
    var claimId = crypto.randomBytes(18).toString("hex");
    var preBind = normalizeBindHwid(payload && payload.boundHwid);
    var row = {
      key: customKey || makeKey(),
      createdAt: now,
      claimedAt: now,
      verifiedAt: now,
      expiresAt: now + durationMs,
      ip: String((payload && payload.ip) || "admin").trim() || "admin",
      note: String((payload && payload.note) || "").trim().slice(0, 200),
      source: "admin",
      boundHwid: preBind,
      boundAt: preBind ? now : 0,
      boundIp: "",
    };
    claims.set(claimId, row);
    persist();
    return {
      ok: true,
      key: serializeKey(claimId, row, now),
      keyDurationMs: durationMs,
      keyDurationLabel: formatDurationLabel(durationMs),
    };
  }

  function updateKeyAdmin(id, payload) {
    cleanup();
    var claimId = String(id || "").trim();
    if (!claimId || !claims.has(claimId)) {
      return { ok: false, error: "not_found", message: "key not found." };
    }
    var row = claims.get(claimId);
    var now = Date.now();
    if (payload && payload.clearBinding) {
      row.boundHwid = "";
      row.boundAt = 0;
      row.boundIp = "";
    }
    if (payload && typeof payload.boundHwid === "string") {
      var nextBind = normalizeBindHwid(payload.boundHwid);
      row.boundHwid = nextBind;
      row.boundAt = nextBind ? now : 0;
      if (!nextBind) row.boundIp = "";
    }
    if (payload && typeof payload.key === "string") {
      var nextKey = String(payload.key || "").trim().toUpperCase();
      if (!nextKey) return { ok: false, error: "bad_key", message: "key cant be empty." };
      var clash = false;
      claims.forEach(function (other, otherId) {
        if (otherId === claimId) return;
        if (other && String(other.key || "").toUpperCase() === nextKey) clash = true;
      });
      if (clash) return { ok: false, error: "duplicate_key", message: "that key already exists." };
      row.key = nextKey;
    }
    if (payload && typeof payload.note === "string") {
      row.note = String(payload.note || "").trim().slice(0, 200);
    }
    if (payload && payload.expiresAt != null && payload.expiresAt !== "") {
      var expiresAt = Number(payload.expiresAt);
      if (!expiresAt || expiresAt < now + 60000) {
        return { ok: false, error: "bad_expiry", message: "expiry must be at least 1 minute from now." };
      }
      row.expiresAt = Math.floor(expiresAt);
      if (!row.claimedAt) row.claimedAt = now;
      if (!row.verifiedAt) row.verifiedAt = now;
    } else if (payload && (payload.durationMs != null || payload.duration != null)) {
      var durationMs = parseDurationMs(
        payload.durationMs != null ? payload.durationMs : payload.duration,
        0
      );
      if (!durationMs || durationMs < 60000) {
        return { ok: false, error: "bad_duration", message: "duration must be at least 1 minute." };
      }
      if (!row.claimedAt) row.claimedAt = now;
      if (!row.verifiedAt) row.verifiedAt = now;
      row.expiresAt = now + durationMs;
    } else if (payload && payload.extendMs != null) {
      var extendMs = parseDurationMs(payload.extendMs, 0);
      if (!extendMs) return { ok: false, error: "bad_duration", message: "bad extend duration." };
      var base = row.expiresAt && row.expiresAt > now ? row.expiresAt : now;
      if (!row.claimedAt) row.claimedAt = now;
      if (!row.verifiedAt) row.verifiedAt = now;
      row.expiresAt = base + extendMs;
    }
    claims.set(claimId, row);
    persist();
    return { ok: true, key: serializeKey(claimId, row, now) };
  }

  function deleteKeyAdmin(id) {
    var claimId = String(id || "").trim();
    if (!claimId || !claims.has(claimId)) {
      return { ok: false, error: "not_found", message: "key not found." };
    }
    claims.delete(claimId);
    persist();
    return { ok: true };
  }

  function listSuspensionsAdmin() {
    var now = Date.now();
    var out = [];
    strikes.forEach(function (row, ip) {
      var until = Number(row && row.suspendedUntil) || 0;
      var active = until > now;
      out.push({
        ip: ip,
        count: Number(row && row.count) || 0,
        suspendedUntil: until,
        active: active,
        remainingMs: active ? until - now : 0,
        updatedAt: Number(row && row.updatedAt) || 0,
      });
    });
    out.sort(function (a, b) {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return (b.suspendedUntil || 0) - (a.suspendedUntil || 0);
    });
    return out;
  }

  function addSuspensionAdmin(payload) {
    var ip = strikeKey(payload && payload.ip);
    if (!ip || ip === "unknown") {
      return { ok: false, error: "missing_ip", message: "ip is required." };
    }
    var now = Date.now();
    var durationMs = parseDurationMs(
      payload && (payload.durationMs != null ? payload.durationMs : payload.duration),
      BYPASS_SUSPEND_MS
    );
    if (!durationMs || durationMs < 60000) {
      return { ok: false, error: "bad_duration", message: "duration must be at least 1 minute." };
    }
    var row = strikes.get(ip) || { count: 0, suspendedUntil: 0, updatedAt: now };
    row.count = Math.max(Number(row.count) || 0, 2);
    row.suspendedUntil = now + durationMs;
    row.updatedAt = now;
    strikes.set(ip, row);
    persistStrikes();
    return {
      ok: true,
      suspension: {
        ip: ip,
        count: row.count,
        suspendedUntil: row.suspendedUntil,
        active: true,
        remainingMs: durationMs,
        updatedAt: row.updatedAt,
      },
    };
  }

  function removeSuspensionAdmin(ipRaw) {
    var ip = strikeKey(ipRaw);
    if (!ip || ip === "unknown") {
      return { ok: false, error: "missing_ip", message: "ip is required." };
    }
    var row = strikes.get(ip);
    if (!row) return { ok: false, error: "not_found", message: "no suspension for that ip." };
    row.suspendedUntil = 0;
    row.updatedAt = Date.now();
    strikes.set(ip, row);
    persistStrikes();
    return { ok: true };
  }

  function clearStrikesAdmin(ipRaw) {
    var ip = strikeKey(ipRaw);
    if (!ip || ip === "unknown") {
      return { ok: false, error: "missing_ip", message: "ip is required." };
    }
    if (!strikes.has(ip)) return { ok: false, error: "not_found", message: "no strikes for that ip." };
    strikes.delete(ip);
    persistStrikes();
    return { ok: true };
  }

  function getAdminSnapshot() {
    cleanup();
    var durationMs = getDefaultKeyDurationMs();
    var config = loadConfig();
    return {
      keys: listKeysAdmin(),
      suspensions: listSuspensionsAdmin(),
      settings: {
        defaultKeyDurationMs: durationMs,
        defaultKeyDurationLabel: formatDurationLabel(durationMs),
        defaultSuspendMs: BYPASS_SUSPEND_MS,
        defaultSuspendLabel: formatDurationLabel(BYPASS_SUSPEND_MS),
        linkvertiseConfigured: !!config.linkvertiseUrl && !!config.antiBypassToken,
      },
    };
  }

  function updateSettingsAdmin(payload) {
    var nextDuration = parseDurationMs(
      payload && (payload.defaultKeyDurationMs != null ? payload.defaultKeyDurationMs : payload.duration),
      0
    );
    if (!nextDuration || nextDuration < 60000) {
      return { ok: false, error: "bad_duration", message: "default duration must be at least 1 minute." };
    }
    saveConfig({ defaultKeyDurationMs: nextDuration });
    return { ok: true, settings: getAdminSnapshot().settings };
  }

  hydrate();
  setInterval(cleanup, CLEAN_EVERY_MS).unref();

  return {
    startClaim: startClaim,
    claimKey: claimKey,
    completeClaim: completeClaim,
    getPublicConfig: getPublicConfig,
    validateKey: validateKey,
    clearClaimCookie: clearClaimCookie,
    getSuspension: getSuspension,
    recordBypass: recordBypass,
    handleBypassRedirect: handleBypassRedirect,
    getAdminSnapshot: getAdminSnapshot,
    createKeyAdmin: createKeyAdmin,
    updateKeyAdmin: updateKeyAdmin,
    deleteKeyAdmin: deleteKeyAdmin,
    addSuspensionAdmin: addSuspensionAdmin,
    removeSuspensionAdmin: removeSuspensionAdmin,
    clearStrikesAdmin: clearStrikesAdmin,
    updateSettingsAdmin: updateSettingsAdmin,
  };
}

module.exports = { createKobranKeySystem: createKobranKeySystem };
