var fs = require("fs");
var path = require("path");

var DEFAULT_FEATURES = {
  gameRatings: true,
  lyricsOverlay: true,
  lowDataMode: true,
  pwaInstall: true,
  wallpaperSearch: true,
  backgroundDim: true,
  surpriseWallpaper: true,
};

function attachSiteFeatures(app, opts) {
  opts = opts || {};
  var dataDir = opts.dataDir || path.join(__dirname, "data");
  var featuresPath = path.join(dataDir, "site-features.json");
  var ratingsPath = path.join(dataDir, "game-ratings.json");
  var votesPath = path.join(dataDir, "game-rating-votes.json");
  var requireAuth = opts.requireAuth;

  function ensureDir() {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  }

  function readJson(file, fallback) {
    try {
      if (!fs.existsSync(file)) return fallback;
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(file, data) {
    ensureDir();
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  }

  function readFeatures() {
    var stored = readJson(featuresPath, null);
    if (!stored || typeof stored !== "object") return Object.assign({}, DEFAULT_FEATURES);
    return Object.assign({}, DEFAULT_FEATURES, stored);
  }

  function readRatings() {
    var data = readJson(ratingsPath, {});
    return data && typeof data === "object" ? data : {};
  }

  function readVotes() {
    var data = readJson(votesPath, {});
    return data && typeof data === "object" ? data : {};
  }

  function normalizeHwid(req) {
    var raw = String((req.headers && req.headers["x-device-hwid"]) || "").trim();
    return raw.slice(0, 80);
  }

  function ratingRow(gameId) {
    var all = readRatings();
    var row = all[gameId] || { up: 0, down: 0 };
    return {
      up: Math.max(0, Number(row.up) || 0),
      down: Math.max(0, Number(row.down) || 0),
    };
  }

  app.get("/api/site/features", function (req, res) {
    res.json({ features: readFeatures() });
  });

  app.get("/api/games/ratings", function (req, res) {
    res.json({ ratings: readRatings() });
  });

  app.post("/api/games/:id/rate", function (req, res) {
    var features = readFeatures();
    if (!features.gameRatings) return res.status(403).json({ error: "disabled" });
    var gameId = String(req.params.id || "").trim().slice(0, 120);
    var vote = String((req.body && req.body.vote) || "").toLowerCase();
    if (!gameId || (vote !== "up" && vote !== "down")) {
      return res.status(400).json({ error: "invalid_vote" });
    }
    var hwid = normalizeHwid(req);
    if (!hwid) return res.status(400).json({ error: "missing_hwid" });
    var votes = readVotes();
    var key = gameId + ":" + hwid;
    if (votes[key]) return res.status(409).json({ error: "already_voted", vote: votes[key] });
    votes[key] = vote;
    writeJson(votesPath, votes);
    var ratings = readRatings();
    var row = ratingRow(gameId);
    if (vote === "up") row.up += 1;
    else row.down += 1;
    ratings[gameId] = row;
    writeJson(ratingsPath, ratings);
    res.json({ ok: true, ratings: row, vote: vote });
  });

  if (requireAuth) {
    app.get("/api/admin/features", requireAuth, function (req, res) {
      res.json({ features: readFeatures() });
    });

    app.put("/api/admin/features", requireAuth, function (req, res) {
      var body = req.body && typeof req.body === "object" ? req.body : {};
      var next = readFeatures();
      Object.keys(DEFAULT_FEATURES).forEach(function (key) {
        if (typeof body[key] === "boolean") next[key] = body[key];
      });
      writeJson(featuresPath, next);
      res.json({ features: next });
    });

    app.get("/api/admin/ratings", requireAuth, function (req, res) {
      var ratings = readRatings();
      var list = Object.keys(ratings).map(function (id) {
        var row = ratingRow(id);
        return {
          id: id,
          up: row.up,
          down: row.down,
          score: row.up - row.down,
        };
      });
      list.sort(function (a, b) {
        if (b.score !== a.score) return b.score - a.score;
        return b.up - a.up;
      });
      res.json({ ratings: list, totalVotes: Object.keys(readVotes()).length });
    });

    app.delete("/api/admin/ratings", requireAuth, function (req, res) {
      writeJson(ratingsPath, {});
      writeJson(votesPath, {});
      res.json({ ok: true });
    });
  }
}

module.exports = {
  attachSiteFeatures: attachSiteFeatures,
  DEFAULT_FEATURES: DEFAULT_FEATURES,
};
