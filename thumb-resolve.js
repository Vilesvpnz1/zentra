const fs = require("fs");
const path = require("path");

const MAP_PATH = path.join(__dirname, "data", "thumb-cdn.json");
const OVERRIDE_PATH = path.join(__dirname, "data", "thumb-overrides.json");
let thumbMap = { byPath: {}, byId: {} };
let overrideMap = { byPath: {}, byId: {} };

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (e) {
    return null;
  }
}

const raw = readJson(MAP_PATH);
if (raw) {
  thumbMap = {
    byPath: raw.byPath && typeof raw.byPath === "object" ? raw.byPath : {},
    byId: raw.byId && typeof raw.byId === "object" ? raw.byId : {},
  };
}

const overrides = readJson(OVERRIDE_PATH);
if (overrides) {
  overrideMap = {
    byPath: overrides.byPath && typeof overrides.byPath === "object" ? overrides.byPath : {},
    byId: overrides.byId && typeof overrides.byId === "object" ? overrides.byId : {},
  };
}

function safeDecode(value) {
  const raw = String(value || "");
  try {
    return decodeURIComponent(raw);
  } catch (e) {
    return raw;
  }
}

function slugDash(id) {
  return String(id)
    .replace(/([a-z])(\d)/g, "$1-$2")
    .replace(/(\d)([a-z])/g, "$1-$2")
    .replace(/_/g, "-")
    .replace(/\./g, "-");
}

function cleanKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizePath(url) {
  return String(url || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "")
    .split("#")[0]
    .split("?")[0];
}

function repoBase(pathValue) {
  const m = String(pathValue || "").match(/^(https:\/\/cdn\.jsdelivr\.net\/gh\/[^/]+\/[^@]+@[^/]+\/)/i);
  return m ? m[1] : "";
}

function pushUnique(urls, value) {
  const url = String(value || "").trim();
  if (!url || urls.indexOf(url) !== -1) return;
  urls.push(url);
}

function mapCover(game) {
  const gamePath = String((game && game.path) || "");
  const id = String((game && game.id) || "");
  const pathKey = normalizePath(gamePath);
  if (pathKey && overrideMap.byPath[pathKey]) return overrideMap.byPath[pathKey];
  if (id && overrideMap.byId[id]) return overrideMap.byId[id];
  if (pathKey && thumbMap.byPath[pathKey]) return thumbMap.byPath[pathKey];
  if (id && thumbMap.byId[id]) return thumbMap.byId[id];
  return "";
}

function resolveCoverUrls(game) {
  try {
    return resolveCoverUrlsInner(game);
  } catch (e) {
    return [];
  }
}

function resolveCoverUrlsInner(game) {
  const urls = [];
  const gamePath = String((game && game.path) || "");
  const id = String((game && game.id) || "");
  const title = String((game && game.title) || "");
  const image = String((game && game.image) || "");

  pushUnique(urls, mapCover(game));
  if (/^https?:\/\//i.test(image)) pushUnique(urls, image);

  let m = gamePath.match(/LupineVault@[^/]+\/assets\/games\/([^/]+)\//i);
  if (m) {
    const slug = safeDecode(m[1]);
    pushUnique(
      urls,
      "https://cdn.jsdelivr.net/gh/tharun9772/LupineVault@main/assets/images/games/tile/" +
        encodeURIComponent(slug) +
        ".png"
    );
    if (title) {
      pushUnique(
        urls,
        "https://cdn.jsdelivr.net/gh/tharun9772/LupineVault@main/assets/images/games/tile/" +
          encodeURIComponent(title) +
          ".png"
      );
    }
  }

  m = gamePath.match(/ChickenKingsVault@[^/]+\/gamefiles\/([^/?#]+)\.html/i);
  if (m) {
    const base = m[1].replace(/\.html?$/i, "");
    const root = "https://cdn.jsdelivr.net/gh/carbonicality/ChickenKingsVault@main/gameimages/";
    pushUnique(urls, root + base + ".png");
    pushUnique(urls, root + base + ".jpg");
    pushUnique(urls, root + base + ".webp");
  }

  m = gamePath.match(/elite-gamez\.github\.io@[^/]+\/g\/([^/?#]+)\.html/i);
  if (m) {
    const root = repoBase(gamePath) || "https://cdn.jsdelivr.net/gh/elite-gamez/elite-gamez.github.io@main/";
    const htmlName = safeDecode(m[1].replace(/\.html?$/i, ""));
    const keys = [cleanKey(title), cleanKey(htmlName), cleanKey(id)];
    keys.forEach(function (key) {
      if (!key) return;
      pushUnique(urls, root + "images/" + key + ".jpg");
      pushUnique(urls, root + "images/" + key + ".png");
      pushUnique(urls, root + "images/" + key + ".webp");
    });
  }

  m = gamePath.match(/hydra-assets@[^/]+\/gmes\/([^/?#]+)\.html/i);
  if (m) {
    const base = m[1].replace(/\.html?$/i, "");
    const root = "https://cdn.jsdelivr.net/gh/Hydra-Network/hydra-assets@main/";
    pushUnique(urls, root + "thumbs/" + base + ".png");
    pushUnique(urls, root + "thumbs/" + base + ".jpg");
    pushUnique(urls, root + "thumbs/" + base + ".webp");
    pushUnique(urls, root + "images/" + base + ".png");
    pushUnique(urls, root + "images/" + base + ".jpg");
  }

  m = gamePath.match(/freebuisness\/html@[^/]+\/(\d+)/i);
  if (m) pushUnique(urls, "https://cdn.jsdelivr.net/gh/freebuisness/covers@main/" + m[1] + ".png");
  m = gamePath.match(/freebuisness\/html@[^/]+\/([^/?#]+)\.html/i);
  if (m && m[1]) pushUnique(urls, "https://cdn.jsdelivr.net/gh/freebuisness/covers@main/" + m[1] + ".png");

  m = gamePath.match(/google-class-files@[^/]+\/(.+\.html)$/i);
  if (m) {
    const root = repoBase(gamePath);
    const rel = m[1].replace(/\.html?$/i, "");
    if (root) {
      pushUnique(urls, root + rel + ".png");
      pushUnique(urls, root + rel + ".jpg");
      pushUnique(urls, root + "images/" + rel.split("/").pop() + ".png");
    }
  }

  m = gamePath.match(/game-assets[^/]*\/([^/]+)\/index\.html/i);
  if (m) {
    const root = gamePath.replace(/\/[^/]+$/, "/");
    pushUnique(urls, root + "thumb.jpg");
    pushUnique(urls, root + "splash.png");
    pushUnique(urls, root + "icon.png");
    pushUnique(urls, root + "logo.png");
  }

  m = gamePath.match(/3kh0-assets\/main\/([^/]+)\/index\.html/i);
  if (m) {
    pushUnique(urls, "https://raw.githack.com/tharun9772/3kh0-assets/main/" + m[1] + "/splash.png");
    pushUnique(urls, "https://raw.githack.com/tharun9772/3kh0-assets/main/" + m[1] + "/icon.png");
  }

  m = gamePath.match(/3kh0-lite\/main\/([^/?#]+)$/i);
  if (m) {
    const root = "https://raw.githack.com/3kh0/3kh0-lite/main/";
    const rel = m[1];
    pushUnique(urls, root + rel.replace(/\.html?$/i, ".png"));
    pushUnique(urls, root + "img/" + rel.split("/").pop().replace(/\.html?$/i, ".png"));
  }

  m = gamePath.match(/truffled\.lol\/([^/?#]+)/i);
  if (m) {
    const slug = m[1].replace(/\.html?$/i, "");
    pushUnique(urls, "https://cdn.jsdelivr.net/gh/aukak/truffled@main/public/png/games/" + slug + ".png");
    pushUnique(urls, "https://cdn.jsdelivr.net/gh/aukak/truffled@main/public/png/games/" + slug + ".jpg");
  }

  m = gamePath.match(/tharun9772\/(ugs-[123])@main\/([^/?#]+\.html)/i);
  if (m) {
    const base = m[2].replace(/\.html?$/i, "");
    const stripped = base.replace(/^cl/i, "");
    const key = cleanKey(stripped);
    pushUnique(
      urls,
      "https://cdn.jsdelivr.net/gh/tharun9772/LupineVault@main/assets/images/games/tile/" +
        encodeURIComponent(stripped) +
        ".png"
    );
    if (key) {
      pushUnique(urls, "https://cdn.jsdelivr.net/gh/elite-gamez/elite-gamez.github.io@main/images/" + key + ".jpg");
      pushUnique(urls, "https://cdn.jsdelivr.net/gh/elite-gamez/elite-gamez.github.io@main/images/" + key + ".png");
    }
    pushUnique(urls, "https://cdn.jsdelivr.net/gh/freebuisness/covers@main/" + stripped + ".png");
  }

  m = gamePath.match(/bubbls\/ugs-singlefile(?:@[^/]+)?\/(?:ugs-files\/)?([^/?#]+\.html)/i);
  if (m) {
    const base = m[1].replace(/\.html?$/i, "");
    const stripped = base.replace(/^cl/i, "");
    const key = cleanKey(stripped);
    pushUnique(
      urls,
      "https://cdn.jsdelivr.net/gh/tharun9772/LupineVault@main/assets/images/games/tile/" +
        encodeURIComponent(stripped) +
        ".png"
    );
    if (key) {
      pushUnique(urls, "https://cdn.jsdelivr.net/gh/elite-gamez/elite-gamez.github.io@main/images/" + key + ".jpg");
      pushUnique(urls, "https://cdn.jsdelivr.net/gh/elite-gamez/elite-gamez.github.io@main/images/" + key + ".png");
    }
    pushUnique(urls, "https://cdn.jsdelivr.net/gh/freebuisness/covers@main/" + stripped + ".png");
    pushUnique(urls, "https://cdn.jsdelivr.net/gh/freebuisness/covers@main/" + base + ".png");
  }

  m = gamePath.match(/alexrsworld@[^/]+\/(.+\.html)$/i);
  if (m) {
    const root = repoBase(gamePath);
    const file = m[1].replace(/\.html?$/i, "");
    if (root) {
      pushUnique(urls, root + "img/" + file + ".png");
      pushUnique(urls, root + "img/" + file + ".jpg");
      pushUnique(urls, root + "images/" + file + ".png");
      pushUnique(urls, root + file + ".png");
    }
  }

  m = gamePath.match(/dskjfoisjfsjio\/Standalone-games@[^/]+\/([^/?#]+\.html)/i);
  if (m) {
    const root = repoBase(gamePath);
    const file = m[1].replace(/\.html?$/i, "");
    if (root) {
      pushUnique(urls, root + file + ".png");
      pushUnique(urls, root + "images/" + file + ".png");
    }
  }

  m = gamePath.match(/bloxcraft-st\/google-class-files@[^/]+\/([^/?#]+\.html)/i);
  if (m) {
    const root = repoBase(gamePath);
    const file = m[1].replace(/\.html?$/i, "");
    if (root) {
      pushUnique(urls, root + file + ".png");
      pushUnique(urls, root + "images/" + file.split("/").pop().replace(/\.html?$/i, "") + ".png");
    }
  }

  m = gamePath.match(/sea-bean-unblocked\/Singlemile@[^/]+\/games\/(\d+)\.html/i);
  if (m) {
    const root = "https://cdn.jsdelivr.net/gh/sea-bean-unblocked/Singlemile@main/Icon/";
    pushUnique(urls, root + m[1] + ".png");
    pushUnique(urls, root + m[1] + ".jpg");
    pushUnique(urls, root + m[1] + ".webp");
  }

  m = gamePath.match(/a456pur\/seraph@[^/]+\/games\/([^/]+)\/index\.html/i);
  if (m) {
    const dir = gamePath.replace(/\/index\.html.*$/i, "/");
    pushUnique(urls, dir + "cover.png");
    pushUnique(urls, dir + "icon.png");
    pushUnique(urls, dir + "logo.png");
    pushUnique(urls, dir + "splash.png");
    pushUnique(urls, dir + "thumb.png");
    pushUnique(urls, dir + "screenshot.png");
    pushUnique(urls, dir + "banner.png");
  }

  m = gamePath.match(/ccported\/games@main\/([^/]+)\/index\.html/i);
  if (m) {
    const dir = gamePath.replace(/\/index\.html.*$/i, "/");
    pushUnique(urls, dir + "thumb.jpg");
    pushUnique(urls, dir + "icon.png");
    pushUnique(urls, dir + "cover.png");
  }

  if (title) {
    const enc = encodeURIComponent(title);
    m = gamePath.match(/LupineVault@[^/]+\//i);
    if (m && !urls.some(function (u) {
      return u.indexOf("/assets/images/games/tile/") !== -1;
    })) {
      pushUnique(
        urls,
        "https://cdn.jsdelivr.net/gh/tharun9772/LupineVault@main/assets/images/games/tile/" + enc + ".png"
      );
    }
  }

  if (/^https?:\/\//i.test(gamePath)) {
    const dir = gamePath.replace(/\/[^/]*$/, "/");
    const file = gamePath.split("/").pop().replace(/\.html?$/i, "");
    pushUnique(urls, dir + "cover.png");
    pushUnique(urls, dir + "icon.png");
    pushUnique(urls, dir + "logo.png");
    pushUnique(urls, dir + "splash.png");
    pushUnique(urls, dir + "thumb.png");
    pushUnique(urls, dir + "thumbnail.png");
    pushUnique(urls, dir + file + ".png");
    pushUnique(urls, dir + file + ".jpg");
    pushUnique(urls, dir + file + ".webp");
    pushUnique(urls, dir + "assets/icon.png");
    pushUnique(urls, dir + "assets/logo.png");
    pushUnique(urls, dir + "assets/cover.png");
    pushUnique(urls, dir + "images/" + file + ".png");
    pushUnique(urls, dir + "img/" + file + ".png");
    pushUnique(urls, dir + "media/icon.png");
    pushUnique(urls, dir + "media/logo.png");
    pushUnique(urls, dir + "icons/icon-512.png");
    pushUnique(urls, dir + "icons/icon-256.png");
    pushUnique(urls, dir + "favicon.png");
    pushUnique(urls, dir + "appicon.png");
  }

  m = gamePath.match(/\/imported\/([^/?#]+)\.html/i);
  if (m) {
    const base = m[1].replace(/\.html?$/i, "");
    const root = repoBase(gamePath);
    if (root) {
      pushUnique(urls, root + "imported/" + base + ".png");
      pushUnique(urls, root + "imported/" + base + ".jpg");
      pushUnique(urls, root + "images/" + cleanKey(base) + ".png");
      pushUnique(urls, root + "images/" + cleanKey(title) + ".png");
    }
  }

  m = gamePath.match(/\/play\/([^/?#]+)/i);
  if (m) {
    pushUnique(urls, "https://cdn.jsdelivr.net/gh/freebuisness/covers@main/" + m[1] + ".png");
  }

  if (id) {
    pushUnique(urls, "https://cdn.jsdelivr.net/gh/freebuisness/covers@main/" + id.replace(/^gn/i, "") + ".png");
    pushUnique(urls, "https://cdn.jsdelivr.net/gh/freebuisness/covers@main/" + id + ".png");
  }

  if (title) {
    const key = cleanKey(title);
    if (key) {
      pushUnique(urls, "https://cdn.jsdelivr.net/gh/elite-gamez/elite-gamez.github.io@main/images/" + key + ".jpg");
      pushUnique(urls, "https://cdn.jsdelivr.net/gh/elite-gamez/elite-gamez.github.io@main/images/" + key + ".png");
    }
  }

  return urls;
}

const GENERIC_COVERS = /^https:\/\/cdn\.jsdelivr\.net\/gh\/freebuisness\/covers@main\//i;
const PLACEHOLDER_COVER = /^https:\/\/cdn\.jsdelivr\.net\/gh\/tharun9772\/game-assets@main\/5968517\.png$/i;

function hasLikelyThumb(game) {
  try {
    return hasLikelyThumbInner(game);
  } catch (e) {
    return false;
  }
}

function hasLikelyThumbInner(game) {
  if (mapCover(game)) return true;
  const image = String((game && game.image) || "");
  if (/^https?:\/\//i.test(image)) return true;
  const urls = resolveCoverUrlsInner(game);
  if (!urls.length) return false;
  return urls.some(function (u) {
    if (GENERIC_COVERS.test(u)) return false;
    if (PLACEHOLDER_COVER.test(u)) return false;
    return true;
  });
}

function pickCoverUrl(game) {
  try {
    const urls = resolveCoverUrlsInner(game);
    return urls[0] || "";
  } catch (e) {
    return "";
  }
}

module.exports = {
  slugDash: slugDash,
  resolveCoverUrls: resolveCoverUrls,
  pickCoverUrl: pickCoverUrl,
  hasLikelyThumb: hasLikelyThumb,
  normalizePath: normalizePath,
};
