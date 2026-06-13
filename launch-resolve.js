const fs = require("fs");
const path = require("path");
const { proxyFrameUrl } = require("./game-frame-proxy");
const { resolveUnderSiteRoot } = require("./ubg-static");

const ROOT = path.join(__dirname);
const UBG98_DIR = path.join(ROOT, "ubg98.github.io-gh-pages");
const OFFLINE_DIR = path.join(ROOT, "Offline-HTML-Games-Pack-master", "offline");
const UBG98_CATALOG_PATH = path.join(UBG98_DIR, "assets", "js", "games.json");

let ubg98EmbedByNorm = null;
let ubg98CatalogByNorm = null;

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function slugDash(id) {
  return String(id)
    .replace(/([a-z])(\d)/g, "$1-$2")
    .replace(/(\d)([a-z])/g, "$1-$2")
    .replace(/_/g, "-")
    .replace(/\./g, "-");
}

function encodePathUrl(rel) {
  return (
    "/" +
    String(rel)
      .replace(/^\/+/, "")
      .split("/")
      .map(function (part) {
        return encodeURIComponent(part);
      })
      .join("/")
  );
}

function extractEmbedSrc(html) {
  const m = html.match(/<iframe[^>]*id=["']gameFrame["'][^>]*src=["']([^"']+)/i);
  return m ? m[1].trim() : "";
}

function isBrokenWrapper(html) {
  if (!html) return true;
  if (/PAGE[\s\S]{0,80}NOT[\s\S]{0,80}FOUND/i.test(html)) return true;
  return !/<iframe/i.test(html);
}

function isBlockedCdnUrl(url) {
  const u = String(url || "").toLowerCase();
  if (/cdn\.jsdelivr\.net\/gh\/3kh0\/3kh0-lite/i.test(u)) return true;
  if (/raw\.githack\.com\/3kh0\/3kh0-lite/i.test(u)) return true;
  if (/raw\.githubusercontent\.com\/3kh0\/3kh0-lite/i.test(u)) return true;
  return false;
}

function readJsonSafe(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (e) {
    return fallback;
  }
}

function buildUbg98Catalog() {
  const map = new Map();
  const data = readJsonSafe(UBG98_CATALOG_PATH, { games: [] });
  const items = Array.isArray(data.games) ? data.games : [];
  items.forEach(function (item) {
    const site = String(item.site || "").trim();
    const link = String(item.link || "").trim();
    if (!site || !link) return;
    const remotePage = "https://" + site.replace(/\/+$/, "") + link;
    const file = link.replace(/^\//, "");
    const localWrap = "ubg98.github.io-gh-pages/" + file;
    let embed = "";
    const localPath = path.join(UBG98_DIR, file);
    if (fs.existsSync(localPath)) {
      try {
        const html = fs.readFileSync(localPath, "utf8");
        if (!isBrokenWrapper(html)) embed = extractEmbedSrc(html);
      } catch (e) {}
    }
    const entry = { embed: embed, remotePage: remotePage, localWrap: localWrap };
    const keys = [
      norm(file),
      norm(file.replace(/\.html$/i, "")),
      norm(file.replace(/-unblockedz?\.html$/i, "")),
      norm(item.title),
      norm(String(item.title || "").replace(/\s*-\s*ubg\d+/i, "")),
    ];
    keys.forEach(function (k) {
      if (k) map.set(k, entry);
    });
  });
  return map;
}

function buildUbg98EmbedIndex() {
  const map = new Map();
  if (!fs.existsSync(UBG98_DIR)) return map;
  const files = fs.readdirSync(UBG98_DIR);
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (!f.endsWith(".html")) continue;
    const fp = path.join(UBG98_DIR, f);
    let html = "";
    try {
      html = fs.readFileSync(fp, "utf8");
    } catch (e) {
      continue;
    }
    if (isBrokenWrapper(html)) continue;
    const src = extractEmbedSrc(html);
    if (!src) continue;
    const relWrapper = "ubg98.github.io-gh-pages/" + f;
    const entry = { embed: src, wrapper: relWrapper };
    const slug = src.replace(/\/+$/, "").split("/").pop();
    map.set(norm(slug), entry);
    map.set(norm(f.replace(/\.html$/i, "")), entry);
    map.set(norm(f.replace(/-unblockedz?\.html$/i, "")), entry);
  }
  return map;
}

function getUbg98Catalog() {
  if (!ubg98CatalogByNorm) ubg98CatalogByNorm = buildUbg98Catalog();
  return ubg98CatalogByNorm;
}

function getUbg98Index() {
  if (!ubg98EmbedByNorm) ubg98EmbedByNorm = buildUbg98EmbedIndex();
  return ubg98EmbedByNorm;
}

function catalogKeysForGame(game) {
  const keys = [];
  keys.push(norm(game.id));
  keys.push(norm(String(game.file || "").replace(/\.html?$/i, "")));
  keys.push(norm(slugDash(game.id)));
  keys.push(norm(String(game.title || "")));
  keys.push(norm(String(game.title || "").replace(/\s+/g, "")));
  return keys;
}

function lookupCatalog(game) {
  const catalog = getUbg98Catalog();
  const keys = catalogKeysForGame(game);
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] && catalog.has(keys[i])) return catalog.get(keys[i]);
  }
  return null;
}

function urlsFromSearch(search) {
  const out = [];
  const re = /https?:\/\/[^\s"'<>]+/gi;
  let m;
  while ((m = re.exec(String(search || ""))) !== null) {
    const u = m[0].replace(/[),.;]+$/, "");
    if (u && !out.includes(u) && !isBlockedCdnUrl(u)) out.push(u);
  }
  return out;
}

function readWrapperEntry(wrapRel) {
  const wrapAbs = path.join(ROOT, wrapRel);
  if (!fs.existsSync(wrapAbs)) return null;
  try {
    const html = fs.readFileSync(wrapAbs, "utf8");
    if (isBrokenWrapper(html)) return null;
    const embed = extractEmbedSrc(html);
    return { embed: embed, wrapper: wrapRel };
  } catch (e) {
    return null;
  }
}

function resolveLaunchTargets(game) {
  const ordered = [];
  const seen = new Set();
  function add(url, kind) {
    const u = String(url || "").trim();
    if (!u || seen.has(u) || isBlockedCdnUrl(u)) return;
    seen.add(u);
    if (/^https?:\/\//i.test(u)) {
      const proxied = proxyFrameUrl(u);
      if (seen.has(proxied)) return;
      seen.add(proxied);
      ordered.push({ url: proxied, kind: kind || "proxy" });
      return;
    }
    ordered.push({ url: u, kind: kind || "link" });
  }

  const catalogPath = String(game.path || "").replace(/^\/+/, "");
  const pathIsRemote = /^https?:\/\//i.test(catalogPath);

  if (catalogPath && !pathIsRemote) {
    const abs = resolveUnderSiteRoot(ROOT, catalogPath);
    if (fs.existsSync(abs)) {
      if (catalogPath.indexOf("ubg98.github.io-gh-pages/") === 0) {
        const w = readWrapperEntry(catalogPath);
        if (w) {
          add(encodePathUrl(catalogPath), "wrapper");
          if (w.embed) add(w.embed, "embed");
        }
      } else {
        add(encodePathUrl(catalogPath), "local");
      }
      if (ordered.length) return ordered;
    }
  }

  if (pathIsRemote && !isBlockedCdnUrl(catalogPath)) {
    add(catalogPath, "external");
    return ordered;
  }

  if (game.file) {
    const offRel = "Offline-HTML-Games-Pack-master/offline/" + game.file;
    const offAbs = path.join(ROOT, offRel);
    if (fs.existsSync(offAbs)) add(encodePathUrl(offRel), "offline");
    const wrapRel = "ubg98.github.io-gh-pages/" + game.file;
    const okWrap = readWrapperEntry(wrapRel);
    if (okWrap) {
      add(encodePathUrl(wrapRel), "wrapper");
      if (okWrap.embed) add(okWrap.embed, "embed");
    }
  }

  const catalog = lookupCatalog(game);

  if (catalog) {
    if (catalog.localWrap) {
      const ok = readWrapperEntry(catalog.localWrap);
      if (ok) {
        add(encodePathUrl(catalog.localWrap), "wrapper");
        if (ok.embed) add(ok.embed, "embed");
      }
    }
    add(catalog.remotePage, "remote");
  }

  urlsFromSearch(game.search).forEach(function (u) {
    add(u, "search");
  });

  const index = getUbg98Index();
  const keys = catalogKeysForGame(game);
  for (let i = 0; i < keys.length; i++) {
    const hit = index.get(keys[i]);
    if (hit && hit.wrapper) {
      add(encodePathUrl(hit.wrapper), "wrapper");
      if (hit.embed) add(hit.embed, "embed");
      break;
    }
  }

  return ordered;
}

module.exports = {
  resolveLaunchTargets: resolveLaunchTargets,
  encodePathUrl: encodePathUrl,
  norm: norm,
  isBlockedCdnUrl: isBlockedCdnUrl,
  rebuildUbg98Index: function () {
    ubg98EmbedByNorm = buildUbg98EmbedIndex();
    ubg98CatalogByNorm = buildUbg98Catalog();
    return ubg98EmbedByNorm;
  },
};
