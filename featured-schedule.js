const fs = require("fs");
const path = require("path");

const crypto = require("crypto");
const mongo = require("./mongo");

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  } catch (e) {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function createFeaturedSchedule(options) {
  const filePath = path.join(options.dataDir, "featured-schedule.json");
  const mongoStore = mongo.createDocStore("featured_store");

  function load() {
    const raw = readJson(filePath, { entries: [] });
    return Array.isArray(raw.entries) ? raw.entries : [];
  }

  function save(entries) {
    writeJson(filePath, { entries: entries });
    mongoStore.save("schedule", { entries: entries });
  }

  async function bindMongo(db) {
    return mongoStore.bind(db, [
      {
        id: "schedule",
        getLocal: function () {
          return { entries: load() };
        },
        hasLocal: function (data) {
          return !!(data && Array.isArray(data.entries) && data.entries.length);
        },
        hasRemote: function (data) {
          return !!(data && Array.isArray(data.entries) && data.entries.length);
        },
        applyRemote: function (data) {
          writeJson(filePath, { entries: data.entries });
        },
      },
    ]);
  }

  function normalizeEntry(payload) {
    const gameId = String((payload && payload.gameId) || "").trim();
    if (!gameId) return { error: "missing_game" };
    const startAt = Number(payload.startAt) || Date.parse(String(payload.startDate || "")) || 0;
    const endAt = Number(payload.endAt) || Date.parse(String(payload.endDate || "")) || 0;
    if (!startAt || !endAt || endAt <= startAt) return { error: "bad_range" };
    return {
      id: String(payload.id || crypto.randomUUID()),
      gameId: gameId,
      label: String(payload.label || "").trim().slice(0, 80),
      startAt: startAt,
      endAt: endAt,
    };
  }

  function list() {
    return load().sort(function (a, b) {
      return b.startAt - a.startAt;
    });
  }

  function activeAt(ts) {
    const now = ts || Date.now();
    const entries = load();
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (e.startAt <= now && now < e.endAt) return e;
    }
    return null;
  }

  function add(payload) {
    const entry = normalizeEntry(payload);
    if (entry.error) return entry;
    const entries = load();
    entries.push(entry);
    save(entries);
    return { entry: entry };
  }

  function remove(id) {
    const entries = load().filter(function (e) {
      return e.id !== id;
    });
    if (entries.length === load().length) return { error: "not_found" };
    save(entries);
    return { ok: true };
  }

  return {
    list: list,
    activeAt: activeAt,
    add: add,
    remove: remove,
    bindMongo: bindMongo,
  };
}

module.exports = { createFeaturedSchedule: createFeaturedSchedule };
