const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const https = require("https");
const http = require("http");

const CLAIM_TTL_MS = 30 * 60 * 1000;
const KEY_DURATION_MS = 24 * 60 * 60 * 1000;
const KEY_DURATION_LABEL = "24 hours";
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
    try {
      if (fs.existsSync(configPath)) {
        var raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
        if (raw && raw.linkvertiseUrl) linkvertiseUrl = String(raw.linkvertiseUrl).trim();
        if (raw && raw.antiBypassToken) antiBypassToken = String(raw.antiBypassToken).trim();
      }
    } catch (e) {}
    return { linkvertiseUrl: linkvertiseUrl, antiBypassToken: antiBypassToken };
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
    return {
      ok: true,
      claimId: claimId,
      linkvertiseUrl: config.linkvertiseUrl,
      keyDurationMs: KEY_DURATION_MS,
      keyDurationLabel: KEY_DURATION_LABEL,
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
    if (row.claimedAt && row.expiresAt) {
      if (Date.now() > row.expiresAt) {
        return { ok: false, error: "expired", message: "that key expired. generate a new one." };
      }
      return {
        ok: true,
        key: row.key,
        already: true,
        expiresAt: row.expiresAt,
        keyDurationMs: KEY_DURATION_MS,
        keyDurationLabel: KEY_DURATION_LABEL,
      };
    }
    row.claimedAt = Date.now();
    row.expiresAt = row.claimedAt + KEY_DURATION_MS;
    claims.set(id, row);
    persist();
    return {
      ok: true,
      key: row.key,
      already: false,
      expiresAt: row.expiresAt,
      keyDurationMs: KEY_DURATION_MS,
      keyDurationLabel: KEY_DURATION_LABEL,
    };
  }

  function getPublicConfig() {
    var config = loadConfig();
    return {
      configured: !!config.linkvertiseUrl && !!config.antiBypassToken,
      donePath: "/api/kobran/key/complete",
      keyDurationMs: KEY_DURATION_MS,
      keyDurationLabel: KEY_DURATION_LABEL,
    };
  }

  hydrate();
  setInterval(cleanup, CLEAN_EVERY_MS).unref();

  return {
    startClaim: startClaim,
    claimKey: claimKey,
    completeClaim: completeClaim,
    getPublicConfig: getPublicConfig,
    clearClaimCookie: clearClaimCookie,
    getSuspension: getSuspension,
    recordBypass: recordBypass,
    handleBypassRedirect: handleBypassRedirect,
  };
}

module.exports = { createKobranKeySystem: createKobranKeySystem };
