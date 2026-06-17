const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = __dirname;
const OUT = path.join(ROOT, "data", "thumb-cdn.json");
const OVERRIDE_PATH = path.join(ROOT, "data", "thumb-overrides.json");
const GAMES_PATH = path.join(ROOT, "games.json");
const KRITIKAL_CATALOG = path.join(ROOT, "kritikal-UBG-main", "games", "games.json");
const KRITIKAL_CDN = "https://cdn.jsdelivr.net/gh/tharun9772/Bloxcraft-UBG@main";
const TIMEOUT_MS = 15000;

function fetchJson(url) {
  return new Promise(function (resolve) {
    https
      .get(url, { headers: { "User-Agent": "ZentraThumbMap/1.0" }, timeout: TIMEOUT_MS }, function (res) {
        if (res.statusCode !== 200) {
          res.resume();
          resolve(null);
          return;
        }
        const chunks = [];
        res.on("data", function (c) {
          chunks.push(c);
        });
        res.on("end", function () {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch (e) {
            resolve(null);
          }
        });
      })
      .on("error", function () {
        resolve(null);
      })
      .on("timeout", function () {
        resolve(null);
      });
  });
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

function absImg(img, base) {
  const raw = String(img || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return "https:" + raw;
  if (raw.startsWith("/")) return base.replace(/\/+$/, "") + raw;
  return base.replace(/\/+$/, "") + "/" + raw.replace(/^\/+/, "");
}

function putId(map, id, cover, force) {
  const coverUrl = String(cover || "").trim();
  const gameId = String(id || "").trim();
  if (!gameId || !coverUrl || !/^https?:\/\//i.test(coverUrl)) return;
  if (force || !map.byId[gameId]) map.byId[gameId] = coverUrl;
}

function loadExistingMap() {
  try {
    const raw = JSON.parse(fs.readFileSync(OUT, "utf8"));
    return {
      byPath: raw.byPath && typeof raw.byPath === "object" ? raw.byPath : {},
      byId: raw.byId && typeof raw.byId === "object" ? raw.byId : {},
    };
  } catch (e) {
    return { byPath: {}, byId: {} };
  }
}

function loadOverrides(map) {
  try {
    const raw = JSON.parse(fs.readFileSync(OVERRIDE_PATH, "utf8"));
    const byPath = raw.byPath && typeof raw.byPath === "object" ? raw.byPath : {};
    const byId = raw.byId && typeof raw.byId === "object" ? raw.byId : {};
    Object.keys(byPath).forEach(function (key) {
      put(map, key, byPath[key], true);
    });
    Object.keys(byId).forEach(function (key) {
      putId(map, key, byId[key], true);
    });
  } catch (e) {}
}

function loadKritikalCatalog(map) {
  let list = [];
  try {
    list = JSON.parse(fs.readFileSync(KRITIKAL_CATALOG, "utf8"));
  } catch (e) {
    return;
  }
  if (!Array.isArray(list)) return;
  list.forEach(function (g) {
    const url = String(g.url || "");
    const m = url.match(/\/gameFiles\/([^/?#]+)/i);
    if (!m) return;
    const slug = m[1];
    const gamePath = "kritikal-ubg-main/gameFiles/" + slug + "/index.html";
    let img = String(g.img || "").trim();
    if (!img) return;
    if (!/^https?:\/\//i.test(img)) {
      img = KRITIKAL_CDN + (img.startsWith("/") ? img : "/" + img);
    }
    put(map, gamePath, img);
  });
}

function scanLocalGameFiles(map, games) {
  games.forEach(function (g) {
    if (!g || !g.path) return;
    const key = normalizePath(g.path);
    if (map.byPath[key]) return;
    const m = String(g.path).match(/^kritikal-ubg-main\/(gamefiles|refined-beta)\/([^/]+)\/index\.html$/i);
    if (!m) return;
    const relDir = path.join(ROOT, "kritikal-UBG-main", m[1], m[2]);
    if (!fs.existsSync(relDir)) return;
    const names = [
      "cover.png",
      "cover.jpg",
      "cover.webp",
      "icon.png",
      "icon.jpg",
      "logo.png",
      "splash.png",
      "thumb.png",
      "thumb.jpg",
      "banner.png",
      "screenshot.png",
    ];
    for (let i = 0; i < names.length; i++) {
      const file = path.join(relDir, names[i]);
      if (fs.existsSync(file) && fs.statSync(file).isFile()) {
        const rel = "kritikal-ubg-main/" + m[1] + "/" + m[2] + "/" + names[i];
        put(map, g.path, KRITIKAL_CDN + "/" + rel.replace(/\\/g, "/"));
        if (g.id) putId(map, g.id, KRITIKAL_CDN + "/" + rel.replace(/\\/g, "/"));
        break;
      }
    }
  });
}

function put(map, gamePath, cover, force) {
  const coverUrl = String(cover || "").trim();
  const pathKey = normalizePath(gamePath);
  if (!pathKey || !coverUrl || !/^https?:\/\//i.test(coverUrl)) return;
  if (force || !map.byPath[pathKey]) map.byPath[pathKey] = coverUrl;
}

async function loadCatalogs(map) {
  const gn = await fetchJson("https://cdn.jsdelivr.net/gh/freebuisness/assets/zones.json");
  if (Array.isArray(gn)) {
    gn.forEach(function (zone) {
      (zone.games || []).forEach(function (g) {
        if (!g.url) return;
        const gamePath = g.url.replace("{HTML_URL}", "https://cdn.jsdelivr.net/gh/freebuisness/html@master");
        const cover = String(g.cover || "").replace("{COVER_URL}", "https://cdn.jsdelivr.net/gh/freebuisness/covers@main/");
        put(map, gamePath, cover);
      });
    });
  }

  const elite = await fetchJson("https://cdn.jsdelivr.net/gh/elite-gamez/elite-gamez.github.io@main/games.json");
  if (Array.isArray(elite)) {
    elite.forEach(function (g) {
      if (!g.url) return;
      const root = "https://cdn.jsdelivr.net/gh/elite-gamez/elite-gamez.github.io@main/";
      put(map, root + "g/" + g.url, g.image ? root + g.image : root + "images/" + String(g.url).replace(/\.html?$/i, "") + ".jpg");
    });
  }

  const sea = await fetchJson("https://cdn.jsdelivr.net/gh/sea-bean-unblocked/sde@main/zzz.json");
  if (Array.isArray(sea)) {
    sea.forEach(function (g) {
      if (!g.url) return;
      let gamePath = String(g.url).replace("{HTML_URL}", "https://cdn.jsdelivr.net/gh/sea-bean-unblocked/Singlemile@main/games/");
      let img = g.cover || "";
      if (img && !/^https?:\/\//i.test(img)) {
        img = "https://cdn.jsdelivr.net/gh/sea-bean-unblocked/Singlemile@main/Icon/" + img.replace("{COVER_URL}/", "");
      }
      put(map, gamePath, img);
    });
  }

  const repos = ["tharun9772/ugs-1", "tharun9772/ugs-2", "tharun9772/ugs-3"];
  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];
    const files = await fetchJson(
      "https://cdn.jsdelivr.net/gh/tharun9772/game-assets/api_generated/github/" + repo + "/file.json"
    );
    if (!Array.isArray(files)) continue;
    files.forEach(function (f) {
      if (f.type !== "file" || !f.name || !f.name.startsWith("cl") || !f.name.endsWith(".html")) return;
      const gamePath = "https://cdn.jsdelivr.net/gh/" + repo + "@main/" + f.name;
      const stripped = f.name.replace(/^cl/i, "").replace(/\.html?$/i, "");
      const key = stripped.toLowerCase().replace(/[^a-z0-9]+/g, "");
      put(
        map,
        gamePath,
        "https://cdn.jsdelivr.net/gh/tharun9772/LupineVault@main/assets/images/games/tile/" +
          encodeURIComponent(stripped) +
          ".png"
      );
      if (key) {
        put(
          map,
          gamePath,
          "https://cdn.jsdelivr.net/gh/elite-gamez/elite-gamez.github.io@main/images/" + key + ".jpg"
        );
      }
    });
  }

  const seraph = await fetchJson(
    "https://cdn.jsdelivr.net/gh/DominumNetwork/dominum@main/src/assets/libraries/seraph/games.json"
  );
  if (Array.isArray(seraph)) {
    seraph.forEach(function (g) {
      put(map, g.url, g.img);
    });
  }

  const ckv = await fetchJson("https://cdn.jsdelivr.net/gh/carbonicality/ChickenKingsVault@main/games.json");
  if (Array.isArray(ckv)) {
    ckv.forEach(function (g) {
      if (!g.html) return;
      const gamePath = "https://cdn.jsdelivr.net/gh/carbonicality/ChickenKingsVault@main/gamefiles/" + g.html;
      const cover = g.img
        ? "https://cdn.jsdelivr.net/gh/carbonicality/ChickenKingsVault@main/gameimages/" + g.img
        : "";
      put(map, gamePath, cover);
    });
  }

  const hydra = await fetchJson("https://cdn.jsdelivr.net/gh/Hydra-Network/hydra-assets@main/gmes.json");
  if (Array.isArray(hydra)) {
    hydra.forEach(function (g) {
      if (!g.file_name) return;
      const gamePath = "https://cdn.jsdelivr.net/gh/Hydra-Network/hydra-assets@main/gmes/" + g.file_name;
      const cover = g.thumb ? "https://cdn.jsdelivr.net/gh/Hydra-Network/hydra-assets@main/" + g.thumb : "";
      put(map, gamePath, cover);
    });
  }

  const cc = await fetchJson("https://cdn.jsdelivr.net/gh/tharun9772/game-assets@main/ccported-stupid-game-lib.json");
  if (Array.isArray(cc)) {
    cc.forEach(function (g) {
      if (!g.base) return;
      put(map, g.base + "/index.html", g.base + "/thumb.jpg");
    });
  }

  const gc = await fetchJson("https://cdn.jsdelivr.net/gh/bloxcraft-st/google-class-files@main/assets/games.json");
  if (Array.isArray(gc)) {
    gc.forEach(function (g) {
      if (!g.url) return;
      const gamePath = "https://cdn.jsdelivr.net/gh/bloxcraft-st/google-class-files@main/" + g.url;
      put(map, gamePath, g.img ? absImg(g.img, "https://cdn.jsdelivr.net/gh/bloxcraft-st/google-class-files@main") : "");
    });
  }

  const tr = await fetchJson("https://cdn.jsdelivr.net/gh/aukak/truffled@main/public/js/json/g.json");
  if (tr && Array.isArray(tr.games)) {
    tr.games.forEach(function (g) {
      if (!g.url) return;
      const thumb = String(g.thumbnail || "")
        .replace(/^\/+/, "")
        .replace(/^png\/games\//, "");
      const gamePath = "https://truffled.lol/" + String(g.url).replace(/^\/+/, "");
      put(
        map,
        gamePath,
        thumb ? "https://cdn.jsdelivr.net/gh/aukak/truffled@main/public/png/games/" + thumb : ""
      );
    });
  }

  const nowgg = await fetchJson("https://cdn.jsdelivr.net/gh/tharun9772/game-assets@main/nowgg.fun/games.json");
  if (Array.isArray(nowgg)) {
    nowgg.forEach(function (g) {
      if (!g.url) return;
      let gamePath = String(g.url).trim();
      if (!/^https?:\/\//i.test(gamePath)) gamePath = "https://" + gamePath;
      put(map, gamePath, g.img || "");
    });
  }

  const alex = await fetchJson("https://cdn.jsdelivr.net/gh/dskjfoisjfsjio/alexrsworld@latest/singlefilegames.json");
  if (Array.isArray(alex)) {
    alex.forEach(function (g) {
      put(map, g.path, g.img);
    });
  }

  const lupine = await fetchJson("https://cdn.jsdelivr.net/gh/tharun9772/LupineVault@main/assets/games.json");
  if (Array.isArray(lupine)) {
    lupine.forEach(function (g) {
      if (!g.name) return;
      const enc = encodeURIComponent(g.name);
      const gamePath = "https://cdn.jsdelivr.net/gh/tharun9772/LupineVault@main/assets/games/" + enc + "/index.html";
      put(
        map,
        gamePath,
        "https://cdn.jsdelivr.net/gh/tharun9772/LupineVault@main/assets/images/games/tile/" + enc + ".png"
      );
    });
  }

  const k3 = await fetchJson("https://cdn.jsdelivr.net/gh/tharun9772/game-assets@main/3kh0/3kh0-assets.json");
  if (Array.isArray(k3)) {
    k3.forEach(function (name) {
      if (!name) return;
      const gamePath = "https://raw.githack.com/tharun9772/3kh0-assets/main/" + name + "/index.html";
      put(map, gamePath, "https://raw.githack.com/tharun9772/3kh0-assets/main/" + name + "/splash.png");
    });
  }

  const k3l = await fetchJson("https://cdn.jsdelivr.net/gh/tharun9772/game-assets@main/3kh0/3kh0-lite.json");
  if (Array.isArray(k3l)) {
    k3l.forEach(function (g) {
      if (!g.link) return;
      const gamePath = "https://raw.githack.com/3kh0/3kh0-lite/main/" + g.link;
      put(map, gamePath, "https://raw.githack.com/3kh0/3kh0-lite/main/" + (g.imgSrc || ""));
    });
  }

  const seraphRepo = await fetchJson("https://cdn.jsdelivr.net/gh/a456pur/seraph@main/games.json");
  if (Array.isArray(seraphRepo)) {
    seraphRepo.forEach(function (g) {
      if (!g.path && !g.url) return;
      const slug = g.path || g.url;
      const gamePath = "https://cdn.jsdelivr.net/gh/a456pur/seraph@main/games/" + String(slug).replace(/^\/+/, "") + "/index.html";
      put(map, gamePath, g.image || g.img || g.icon || "");
    });
  }
}

function inferFromPath(gamePath) {
  const urls = [];
  const p = String(gamePath || "");
  if (!/^https?:\/\//i.test(p)) return urls;

  let m = p.match(/sea-bean-unblocked\/Singlemile@[^/]+\/games\/(\d+)\.html/i);
  if (m) {
    const root = "https://cdn.jsdelivr.net/gh/sea-bean-unblocked/Singlemile@main/Icon/";
    urls.push(root + m[1] + ".png", root + m[1] + ".jpg", root + m[1] + ".webp");
  }

  m = p.match(/a456pur\/seraph@[^/]+\/games\/([^/]+)\/index\.html/i);
  if (m) {
    const dir = p.replace(/\/index\.html.*$/i, "/");
    urls.push(
      dir + "cover.png",
      dir + "icon.png",
      dir + "logo.png",
      dir + "splash.png",
      dir + "thumb.png",
      dir + "screenshot.png",
      dir + "banner.png"
    );
  }

  m = p.match(/bubbls\/ugs-singlefile(?:@[^/]+)?\/(?:ugs-files\/)?([^/?#]+\.html)/i);
  if (m) {
    const base = m[1].replace(/\.html?$/i, "");
    const stripped = base.replace(/^cl/i, "");
    urls.push(
      "https://cdn.jsdelivr.net/gh/tharun9772/LupineVault@main/assets/images/games/tile/" +
        encodeURIComponent(stripped) +
        ".png"
    );
    const key = stripped.toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (key) {
      urls.push("https://cdn.jsdelivr.net/gh/elite-gamez/elite-gamez.github.io@main/images/" + key + ".jpg");
    }
    urls.push("https://cdn.jsdelivr.net/gh/freebuisness/covers@main/" + stripped + ".png");
  }

  m = p.match(/tharun9772\/ugs-[123]@main\/(cl[^/?#]+\.html)/i);
  if (m) {
    const stripped = m[1].replace(/^cl/i, "").replace(/\.html?$/i, "");
    urls.push(
      "https://cdn.jsdelivr.net/gh/tharun9772/LupineVault@main/assets/images/games/tile/" +
        encodeURIComponent(stripped) +
        ".png"
    );
  }

  m = p.match(/ccported\/games@main\/([^/]+)\/index\.html/i);
  if (m) {
    const dir = p.replace(/\/index\.html.*$/i, "/");
    urls.push(dir + "thumb.jpg", dir + "icon.png", dir + "cover.png");
  }

  return urls.filter(Boolean);
}

async function main() {
  const map = loadExistingMap();
  map.updatedAt = Date.now();
  console.log("Existing paths: " + Object.keys(map.byPath).length);
  loadOverrides(map);
  console.log("Fetching remote catalogs...");
  await loadCatalogs(map);
  loadKritikalCatalog(map);

  let games = [];
  try {
    games = JSON.parse(fs.readFileSync(GAMES_PATH, "utf8"));
  } catch (e) {
    games = [];
  }

  scanLocalGameFiles(map, games);

  games.forEach(function (g) {
    if (!g || !g.path) return;
    const key = normalizePath(g.path);
    if (map.byPath[key]) return;
    const inferred = inferFromPath(g.path);
    if (inferred[0]) map.byPath[key] = inferred[0];
    if (g.id && inferred[0] && !map.byId[g.id]) map.byId[g.id] = inferred[0];
  });

  loadOverrides(map);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(map));
  console.log("Wrote " + OUT);
  console.log("Paths mapped: " + Object.keys(map.byPath).length);
  console.log("Ids mapped: " + Object.keys(map.byId).length);
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
