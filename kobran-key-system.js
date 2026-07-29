const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const CLAIM_TTL_MS = 30 * 60 * 1000;
const MIN_WAIT_MS = 6000;
const CLEAN_EVERY_MS = 5 * 60 * 1000;

function createKobranKeySystem(options) {
  const root = options.root;
  const configPath = path.join(root, "kobran-unblocked", "key-config.json");
  const storePath = path.join(root, "data", "kobran-key-claims.json");
  const claims = new Map();

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

  function startClaim() {
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
    });
    persist();
    return {
      ok: true,
      claimId: claimId,
      linkvertiseUrl: config.linkvertiseUrl,
    };
  }

  function claimKey(claimId) {
    cleanup();
    var id = String(claimId || "").trim();
    if (!id || id.length < 16) {
      return { ok: false, error: "invalid_claim", message: "missing claim. hit generate key again." };
    }
    var row = claims.get(id);
    if (!row) {
      return { ok: false, error: "not_found", message: "claim expired or invalid. generate a new key." };
    }
    if (row.claimedAt) {
      return { ok: true, key: row.key, already: true };
    }
    var waited = Date.now() - (row.createdAt || 0);
    if (waited < MIN_WAIT_MS) {
      return {
        ok: false,
        error: "too_fast",
        message: "finish the steps on the ad page first then come back.",
      };
    }
    row.claimedAt = Date.now();
    claims.set(id, row);
    persist();
    return { ok: true, key: row.key, already: false };
  }

  function getPublicConfig() {
    var config = loadConfig();
    return {
      configured: !!config.linkvertiseUrl,
      donePath: "/unblocked/?keydone=1#key",
    };
  }

  hydrate();
  setInterval(cleanup, CLEAN_EVERY_MS).unref();

  return {
    startClaim: startClaim,
    claimKey: claimKey,
    getPublicConfig: getPublicConfig,
  };
}

module.exports = { createKobranKeySystem: createKobranKeySystem };
