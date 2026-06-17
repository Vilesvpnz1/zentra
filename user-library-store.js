const fs = require("fs");
const path = require("path");

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

function createUserLibrary(options) {
  const libPath = path.join(options.dataDir, "user-libraries.json");
  const MAX_FAV = 120;
  const MAX_RECENT = 24;

  function loadAll() {
    const raw = readJson(libPath, { users: {} });
    return raw.users && typeof raw.users === "object" ? raw.users : {};
  }

  function saveAll(users) {
    writeJson(libPath, { users: users });
  }

  function emptyLib() {
    return { favorites: [], recent: [] };
  }

  function getLibrary(userId) {
    if (!userId) return emptyLib();
    const all = loadAll();
    const row = all[userId] || emptyLib();
    return {
      favorites: Array.isArray(row.favorites) ? row.favorites.slice(0, MAX_FAV) : [],
      recent: Array.isArray(row.recent) ? row.recent.slice(0, MAX_RECENT) : [],
    };
  }

  function putLibrary(userId, lib) {
    if (!userId) return emptyLib();
    const all = loadAll();
    const favorites = Array.isArray(lib.favorites) ? lib.favorites.map(String).filter(Boolean) : [];
    const uniqFav = [];
    favorites.forEach(function (id) {
      if (uniqFav.indexOf(id) === -1) uniqFav.push(id);
    });
    const recent = Array.isArray(lib.recent) ? lib.recent : [];
    all[userId] = {
      favorites: uniqFav.slice(0, MAX_FAV),
      recent: recent
        .filter(function (r) {
          return r && r.id;
        })
        .slice(0, MAX_RECENT),
    };
    saveAll(all);
    return getLibrary(userId);
  }

  function toggleFavorite(userId, gameId) {
    const id = String(gameId || "").trim();
    if (!userId || !id) return { error: "missing_fields" };
    const lib = getLibrary(userId);
    const idx = lib.favorites.indexOf(id);
    if (idx === -1) lib.favorites.unshift(id);
    else lib.favorites.splice(idx, 1);
    if (lib.favorites.length > MAX_FAV) lib.favorites.length = MAX_FAV;
    return { library: putLibrary(userId, lib), favorited: idx === -1 };
  }

  function pushRecent(userId, gameId) {
    const id = String(gameId || "").trim();
    if (!userId || !id) return { error: "missing_fields" };
    const lib = getLibrary(userId);
    lib.recent = lib.recent.filter(function (r) {
      return r.id !== id;
    });
    lib.recent.unshift({ id: id, ts: Date.now() });
    if (lib.recent.length > MAX_RECENT) lib.recent.length = MAX_RECENT;
    return { library: putLibrary(userId, lib) };
  }

  function mergeLibrary(userId, payload) {
    if (!userId) return { error: "missing_user" };
    const lib = getLibrary(userId);
    if (payload && Array.isArray(payload.favorites)) {
      payload.favorites.forEach(function (id) {
        id = String(id || "").trim();
        if (id && lib.favorites.indexOf(id) === -1) lib.favorites.push(id);
      });
    }
    if (payload && Array.isArray(payload.recent)) {
      payload.recent.forEach(function (row) {
        if (!row || !row.id) return;
        lib.recent = lib.recent.filter(function (r) {
          return r.id !== row.id;
        });
        lib.recent.unshift({ id: String(row.id), ts: Number(row.ts) || Date.now() });
      });
    }
    if (lib.favorites.length > MAX_FAV) lib.favorites = lib.favorites.slice(0, MAX_FAV);
    if (lib.recent.length > MAX_RECENT) lib.recent = lib.recent.slice(0, MAX_RECENT);
    return { library: putLibrary(userId, lib) };
  }

  return {
    getLibrary: getLibrary,
    toggleFavorite: toggleFavorite,
    pushRecent: pushRecent,
    mergeLibrary: mergeLibrary,
  };
}

module.exports = { createUserLibrary: createUserLibrary };
