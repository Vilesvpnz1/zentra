const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const CLAIM_TTL_MS = 30 * 60 * 1000;
const KEY_DURATION_MS = 24 * 60 * 60 * 1000;
const KEY_DURATION_LABEL = "24 hours";
const REDEEM_TTL_MS = 3 * 60 * 1000;
const MIN_COMPLETE_MS = 10000;
const CLEAN_EVERY_MS = 5 * 60 * 1000;
const CLAIM_COOKIE = "kobran_key_claim";

function createKobranKeySystem(options) {
  const root = options.root;
  const configPath = path.join(root, "kobran-unblocked", "key-config.json");
  const storePath = path.join(root, "data", "kobran-key-claims.json");
  const secretPath = path.join(root, "data", "kobran-key-secret.txt");
  const claims = new Map();
  const secret = loadSecret();

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
    try {
      if (fs.existsSync(configPath)) {
        var raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
        if (raw && raw.linkvertiseUrl) linkvertiseUrl = String(raw.linkvertiseUrl).trim();
      }
    } catch (e) {}
    return { linkvertiseUrl: linkvertiseUrl };
  }

  function ensureStoreDir() {
    try {
      fs.mkdirSync(path.dirname(storePath), { recursive: true });
    } catch (e) {}
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

  function isLinkvertiseReferer(ref) {
    if (!ref) return false;
    try {
      var host = new URL(ref).hostname.toLowerCase();
      return (
        host === "linkvertise.com" ||
        host.endsWith(".linkvertise.com") ||
        host === "linkvertise.net" ||
        host.endsWith(".linkvertise.net") ||
        host === "link-to.net" ||
        host.endsWith(".link-to.net") ||
        host === "direct-link.net" ||
        host.endsWith(".direct-link.net") ||
        host === "up-to-down.net" ||
        host.endsWith(".up-to-down.net")
      );
    } catch (e) {
      return false;
    }
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

  function completeClaim(req, res) {
    cleanup();
    var cookies = parseCookies(req.headers.cookie || "");
    var claimId = String(cookies[CLAIM_COOKIE] || "").trim();
    var referer = String(req.headers.referer || req.headers.referrer || "");
    if (!claimId || !claims.has(claimId)) {
      return res.redirect(302, "/unblocked/?keyerr=missing#key");
    }
    if (!isLinkvertiseReferer(referer)) {
      return res.redirect(302, "/unblocked/?keyerr=ad#key");
    }
    var row = claims.get(claimId);
    if (!row) return res.redirect(302, "/unblocked/?keyerr=missing#key");
    if (Date.now() - (row.createdAt || 0) < MIN_COMPLETE_MS) {
      return res.redirect(302, "/unblocked/?keyerr=wait#key");
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
      configured: !!config.linkvertiseUrl,
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
  };
}

module.exports = { createKobranKeySystem: createKobranKeySystem };
