const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const ROOT = __dirname;
const GAMES_PATH = path.join(ROOT, "games.json");
const THUMBS_DIR = path.join(ROOT, "assets", "thumbs");
const PACK_DIR = path.join(ROOT, "kritikal-ubg-main");
const PACK_PREFIX = "kritikal-ubg-main/";
const CATALOG_PATH = path.join(PACK_DIR, "games", "games.json");
const TIMEOUT_MS = 3500;
const THUMB_CONCURRENCY = 16;

function slugId(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "game";
}

function uniqueGameId(base, ids) {
  let id = slugId(base);
  if (!ids.has(id)) return id;
  let n = 2;
  while (ids.has(id + n)) n++;
  return id + n;
}

function buildSearch(game) {
  return [game.id, game.title, game.file, game.path]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normTitleKey(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/kritikal\s*ubg\s*-?\s*/gi, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function normPathKey(gamePath) {
  const p = String(gamePath || "").toLowerCase().trim();
  if (!p) return "";
  return p.replace(/\/+$/, "");
}

function gameScore(game) {
  let score = 0;
  const p = String(game.path || "");
  if (p.startsWith(PACK_PREFIX)) score += 1000;
  else if (/^https?:\/\//i.test(p)) score += 100;
  const img = String(game.image || game.img || "");
  if (img && !img.endsWith(".svg")) score += 50;
  else if (img) score += 10;
  if (game.file) score += 5;
  if (p.length) score += Math.min(p.length, 200) / 200;
  return score;
}

function dedupeGames(games) {
  const sorted = games.slice().sort(function (a, b) {
    return gameScore(b) - gameScore(a);
  });
  const kept = [];
  const seenTitles = new Set();
  const seenPaths = new Set();
  sorted.forEach(function (game) {
    const tk = normTitleKey(game.title);
    const pk = normPathKey(game.path);
    if (tk && seenTitles.has(tk)) return;
    if (pk && seenPaths.has(pk)) return;
    if (tk) seenTitles.add(tk);
    if (pk) seenPaths.add(pk);
    kept.push(game);
  });
  return kept;
}

function viewFromUrl(url) {
  const m = String(url || "").match(/[?&]view=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

function localIndexFromView(view) {
  const v = String(view || "").replace(/^\/+/, "");
  if (!v) return "";
  return PACK_PREFIX + v.replace(/\/+$/, "") + "/index.html";
}

function cleanTitle(raw) {
  return String(raw || "")
    .replace(/kritikal\s*ubg\s*-?\s*/gi, "")
    .replace(/Kritikal\s*ubg\s*-?\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleFromHtml(html, fallback) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (m) {
    const t = cleanTitle(m[1].replace(/\|.*$/, ""));
    if (t) return t;
  }
  return cleanTitle(fallback);
}

function resolveImgUrl(img) {
  const raw = String(img || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return raw;
  return "/" + raw;
}

function fetchText(url, redirects) {
  redirects = redirects || 0;
  if (redirects > 5) return Promise.resolve(null);
  return new Promise(function (resolve) {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(
      url,
      { headers: { "User-Agent": "KritikalImport/1.0" }, timeout: TIMEOUT_MS },
      function (res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const next = res.headers.location.startsWith("http")
            ? res.headers.location
            : new URL(res.headers.location, url).href;
          res.resume();
          resolve(fetchText(next, redirects + 1));
          return;
        }
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
          resolve(Buffer.concat(chunks).toString("utf8"));
        });
      }
    );
    req.on("error", function () {
      resolve(null);
    });
    req.on("timeout", function () {
      req.destroy();
      resolve(null);
    });
  });
}

function fetchJson(url) {
  return fetchText(url).then(function (text) {
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  });
}

function fetchBuffer(url, redirects) {
  redirects = redirects || 0;
  if (redirects > 5) return Promise.resolve(null);
  return new Promise(function (resolve) {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(
      url,
      {
        headers: { "User-Agent": "KritikalImport/1.0", Accept: "image/*,*/*" },
        timeout: TIMEOUT_MS,
      },
      function (res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const next = res.headers.location.startsWith("http")
            ? res.headers.location
            : new URL(res.headers.location, url).href;
          res.resume();
          resolve(fetchBuffer(next, redirects + 1));
          return;
        }
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
          const buf = Buffer.concat(chunks);
          if (buf.length < 40) {
            resolve(null);
            return;
          }
          resolve({ buf: buf, ct: String(res.headers["content-type"] || ""), url: url });
        });
      }
    );
    req.on("error", function () {
      resolve(null);
    });
    req.on("timeout", function () {
      req.destroy();
      resolve(null);
    });
  });
}

function extFromContentType(ct, url) {
  const u = String(url || "").toLowerCase();
  if (u.endsWith(".png") || ct.includes("png")) return "png";
  if (u.endsWith(".jpg") || u.endsWith(".jpeg") || ct.includes("jpeg")) return "jpg";
  if (u.endsWith(".webp") || ct.includes("webp")) return "webp";
  if (u.endsWith(".gif") || ct.includes("gif")) return "gif";
  if (u.endsWith(".svg") || ct.includes("svg")) return "svg";
  if (u.endsWith(".ico") || ct.includes("icon")) return "ico";
  return "png";
}

function hueFromId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

function escapeXml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function makeSvg(title, id) {
  const h = hueFromId(id);
  const h2 = (h + 38) % 360;
  const label = escapeXml(String(title || id).slice(0, 20));
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0%" stop-color="hsl(' +
    h +
    ',72%,48%)"/>' +
    '<stop offset="100%" stop-color="hsl(' +
    h2 +
    ',72%,32%)"/>' +
    "</linearGradient></defs>" +
    '<rect width="400" height="300" rx="18" fill="url(#g)"/>' +
    '<text x="200" y="158" fill="#fff" font-family="Segoe UI,Arial,sans-serif" font-size="28" font-weight="700" text-anchor="middle">' +
    label +
    "</text></svg>"
  );
}

function readLocalImage(imgUrl) {
  const rel = String(imgUrl || "").replace(/^\/+/, "");
  const abs = path.join(PACK_DIR, rel);
  if (!fs.existsSync(abs)) return null;
  try {
    const buf = fs.readFileSync(abs);
    if (buf.length < 40) return null;
    return { buf: buf, ct: "", url: abs };
  } catch (e) {
    return null;
  }
}

async function saveThumb(id, title, img) {
  if (!fs.existsSync(THUMBS_DIR)) fs.mkdirSync(THUMBS_DIR, { recursive: true });
  const imgUrl = resolveImgUrl(img);
  let hit = null;
  if (imgUrl.startsWith("http")) {
    hit = await fetchBuffer(imgUrl);
  } else if (imgUrl) {
    hit = readLocalImage(imgUrl);
  }
  if (hit && hit.buf) {
    const ext = extFromContentType(hit.ct, imgUrl || hit.url);
    const rel = "assets/thumbs/" + id + "." + ext;
    fs.writeFileSync(path.join(ROOT, rel), hit.buf);
    return rel;
  }
  const relSvg = "assets/thumbs/" + id + ".svg";
  const svgPath = path.join(ROOT, relSvg);
  if (!fs.existsSync(svgPath)) fs.writeFileSync(svgPath, makeSvg(title, id), "utf8");
  return relSvg;
}

function collectLocalIndexes() {
  const out = [];
  function walk(baseRel, absDir) {
    if (!fs.existsSync(absDir)) return;
    fs.readdirSync(absDir, { withFileTypes: true }).forEach(function (entry) {
      const rel = baseRel ? baseRel + "/" + entry.name : entry.name;
      const abs = path.join(absDir, entry.name);
      if (entry.isDirectory()) {
        walk(rel, abs);
        return;
      }
      if (entry.name.toLowerCase() === "index.html") {
        out.push(PACK_PREFIX + rel.replace(/\\/g, "/"));
      }
    });
  }
  walk("gameFiles", path.join(PACK_DIR, "gameFiles"));
  walk("refined-beta", path.join(PACK_DIR, "refined-beta"));
  return out;
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  const workers = [];
  for (let w = 0; w < limit; w++) workers.push(worker());
  await Promise.all(workers);
  return results;
}

function tryAdd(state, entry) {
  const pathLower = String(entry.path || "").toLowerCase();
  if (!pathLower || state.knownPaths.has(pathLower)) return false;
  state.knownPaths.add(pathLower);
  const id = uniqueGameId(entry.idHint || entry.title, state.ids);
  state.ids.add(id);
  state.games.push({
    id: id,
    file: entry.file || "",
    title: entry.title,
    path: entry.path,
    img: entry.img || "",
    search: "",
    image: "",
  });
  return true;
}

async function loadRemoteGames(state) {
  const gn = await fetchJson("https://cdn.jsdelivr.net/gh/freebuisness/assets/zones.json");
  if (Array.isArray(gn)) {
    gn.forEach(function (g) {
      if (g.id === -1 || !g.name || String(g.name).startsWith("[!]") || !g.url) return;
      const htmlUrl = String(g.url).replace("{HTML_URL}", "https://cdn.jsdelivr.net/gh/freebuisness/html@master");
      const cover = String(g.cover || "").replace("{COVER_URL}", "");
      tryAdd(state, {
        title: g.name,
        path: htmlUrl,
        img: cover ? "https://cdn.jsdelivr.net/gh/freebuisness/covers@main/" + cover : "",
        idHint: "gn" + g.id,
      });
    });
  }

  const elite = await fetchJson("https://cdn.jsdelivr.net/gh/elite-gamez/elite-gamez.github.io@main/games.json");
  if (Array.isArray(elite)) {
    elite.forEach(function (g) {
      if (!g.url) return;
      tryAdd(state, {
        title: g.title || "Game",
        path: "https://cdn.jsdelivr.net/gh/elite-gamez/elite-gamez.github.io@main/" + String(g.url).replace(/^\/+/, ""),
        img: g.image
          ? "https://cdn.jsdelivr.net/gh/elite-gamez/elite-gamez.github.io@main/" + String(g.image).replace(/^\/+/, "")
          : "",
        idHint: g.title,
      });
    });
  }

  const sea = await fetchJson("https://cdn.jsdelivr.net/gh/sea-bean-unblocked/sde@main/zzz.json");
  if (Array.isArray(sea)) {
    sea.forEach(function (g) {
      if (!g.id) return;
      let htmlUrl = String(g.html || g.url || "");
      if (!htmlUrl) return;
      if (htmlUrl.includes("{HTML_URL}")) {
        htmlUrl = htmlUrl.replace("{HTML_URL}", "https://cdn.jsdelivr.net/gh/sea-bean-unblocked/Singlemile@main/games/");
      }
      htmlUrl = htmlUrl.replace(/([^:]\/)\/+/g, "$1");
      const cover = String(g.cover || "").replace("{COVER_URL}/", "");
      let img = "";
      if (cover) {
        img = cover.startsWith("http")
          ? cover
          : "https://cdn.jsdelivr.net/gh/sea-bean-unblocked/Singlemile@main/Icon/" + cover.replace(/^\/+/, "");
      }
      tryAdd(state, {
        title: g.name || "Game",
        path: htmlUrl,
        img: img,
        idHint: "sea" + g.id,
      });
    });
  }

  const ugsRepos = ["tharun9772/ugs-1", "tharun9772/ugs-2", "tharun9772/ugs-3"];
  for (let r = 0; r < ugsRepos.length; r++) {
    const repo = ugsRepos[r];
    const files = await fetchJson(
      "https://cdn.jsdelivr.net/gh/tharun9772/game-assets/api_generated/github/" + repo + "/file.json"
    );
    if (!Array.isArray(files)) continue;
    files.forEach(function (f) {
      if (!f || f.type !== "file" || !f.name || !f.name.startsWith("cl") || !f.name.endsWith(".html")) return;
      const title = f.name.replace(/^cl/, "").replace(/\.html$/i, "").replace(/-/g, " ");
      tryAdd(state, {
        title: title,
        path: "https://cdn.jsdelivr.net/gh/" + repo + "@main/" + f.name,
        img: "https://cdn.jsdelivr.net/gh/tharun9772/game-assets@main/5968517.png",
        idHint: f.name,
      });
    });
  }

  const seraph = await fetchJson(
    "https://cdn.jsdelivr.net/gh/DominumNetwork/dominum@main/src/assets/libraries/seraph/games.json"
  );
  if (Array.isArray(seraph)) {
    const base = "https://cdn.jsdelivr.net/gh/a456pur/seraph@main/games/";
    seraph.forEach(function (g) {
      if (!g.url) return;
      const rel = String(g.url).replace(base, "").replace(/^\/+/, "");
      tryAdd(state, {
        title: g.name || "Game",
        path: base + rel,
        img: g.img || "",
        idHint: g.name,
      });
    });
  }

  const ckv = await fetchJson("https://cdn.jsdelivr.net/gh/carbonicality/ChickenKingsVault@main/games.json");
  if (Array.isArray(ckv)) {
    const base = "https://cdn.jsdelivr.net/gh/carbonicality/ChickenKingsVault@main/gamefiles/";
    ckv.forEach(function (g) {
      if (!g.html) return;
      tryAdd(state, {
        title: g.name || "Game",
        path: base + String(g.html).replace(/^\/+/, ""),
        img: g.img ? "https://cdn.jsdelivr.net/gh/carbonicality/ChickenKingsVault@main/gameimages/" + g.img : "",
        idHint: g.html,
      });
    });
  }

  const hydra = await fetchJson("https://cdn.jsdelivr.net/gh/Hydra-Network/hydra-assets@main/gmes.json");
  if (Array.isArray(hydra)) {
    const base = "https://cdn.jsdelivr.net/gh/Hydra-Network/hydra-assets@main/gmes/";
    hydra.forEach(function (g) {
      if (!g.file_name) return;
      tryAdd(state, {
        title: g.title || "Game",
        path: base + g.file_name,
        img: g.thumb ? "https://cdn.jsdelivr.net/gh/Hydra-Network/hydra-assets@main/" + String(g.thumb).replace(/^\/+/, "") : "",
        idHint: g.file_name,
      });
    });
  }

  const cc = await fetchJson("https://cdn.jsdelivr.net/gh/tharun9772/game-assets@main/ccported-stupid-game-lib.json");
  if (Array.isArray(cc)) {
    cc.forEach(function (g) {
      if (!g || !g.base || !g.Id) return;
      tryAdd(state, {
        title: g.name || "Game " + g.Id,
        path: String(g.base).replace(/\/+$/, "") + "/index.html",
        img: String(g.base).replace(/\/+$/, "") + "/thumb.jpg",
        idHint: "cc" + g.Id,
      });
    });
  }

  const gclass = await fetchJson("https://cdn.jsdelivr.net/gh/ Kritikal_ST /google-class-files@main/assets/games.json");
  if (Array.isArray(gclass)) {
    const base = "https://cdn.jsdelivr.net/gh/ Kritikal_ST /google-class-files@main/";
    gclass.forEach(function (g) {
      if (!g.url) return;
      tryAdd(state, {
        title: g.name || "Game",
        path: base + String(g.url).replace(/^\/+/, ""),
        img: g.img || "",
        idHint: g.name,
      });
    });
  }

  const truffled = await fetchJson("https://cdn.jsdelivr.net/gh/aukak/truffled@main/public/js/json/g.json");
  if (truffled && Array.isArray(truffled.games)) {
    truffled.games.forEach(function (g) {
      if (!g.url) return;
      const thumb = String(g.thumbnail || "")
        .replace(/^\/+/, "")
        .replace(/^png\/games\//, "");
      tryAdd(state, {
        title: g.name || "Game",
        path: "https://truffled.lol/" + String(g.url).replace(/^\/+/, ""),
        img: thumb ? "https://cdn.jsdelivr.net/gh/aukak/truffled@main/public/png/games/" + thumb : "/1f3ae.png",
        idHint: g.name,
      });
    });
  }

  const nowgg = await fetchJson("https://cdn.jsdelivr.net/gh/tharun9772/game-assets@main/nowgg.fun/games.json");
  if (Array.isArray(nowgg)) {
    nowgg.forEach(function (g) {
      if (!g.name || !g.url) return;
      let cleanUrl = String(g.url).trim();
      if (!/^https?:\/\//i.test(cleanUrl)) cleanUrl = "https://" + cleanUrl;
      tryAdd(state, {
        title: g.name,
        path: cleanUrl,
        img: g.img || "/1f3ae.png",
        idHint: g.name,
      });
    });
  }

  const alexr = await fetchJson("https://cdn.jsdelivr.net/gh/dskjfoisjfsjio/alexrsworld@latest/singlefilegames.json");
  if (Array.isArray(alexr)) {
    alexr.forEach(function (g) {
      if (!g.path) return;
      tryAdd(state, {
        title: g.title || "Game",
        path: g.path,
        img: g.img || "/1f3ae.png",
        idHint: g.title,
      });
    });
  }
}

async function main() {
  if (!fs.existsSync(PACK_DIR)) {
    console.error("Missing pack dir:", PACK_DIR);
    process.exit(1);
  }

  const state = {
    games: [],
    ids: new Set(),
    knownPaths: new Set(),
  };

  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  catalog.forEach(function (item) {
    const view = viewFromUrl(item.url);
    if (!view.startsWith("/")) return;
    const gamePath = localIndexFromView(view);
    if (!fs.existsSync(path.join(ROOT, gamePath))) return;
    tryAdd(state, {
      title: item.name,
      path: gamePath,
      file: gamePath.replace(PACK_PREFIX, ""),
      img: item.img || "",
      idHint: item.name,
    });
  });

  collectLocalIndexes().forEach(function (gamePath) {
    if (state.knownPaths.has(gamePath.toLowerCase())) return;
    const abs = path.join(ROOT, gamePath);
    let html = "";
    try {
      html = fs.readFileSync(abs, "utf8");
    } catch (e) {
      return;
    }
    const relFile = gamePath.replace(PACK_PREFIX, "");
    const fallback = relFile.split("/").pop().replace(/index\.html$/i, "").replace(/-/g, " ");
    tryAdd(state, {
      title: titleFromHtml(html, fallback),
      path: gamePath,
      file: relFile,
      img: "",
      idHint: relFile,
    });
  });

  await loadRemoteGames(state);

  state.games = dedupeGames(state.games);

  let downloaded = 0;
  let svgMade = 0;
  await mapPool(state.games, THUMB_CONCURRENCY, async function (game) {
    const rel = await saveThumb(game.id, game.title, game.img);
    game.image = rel;
    delete game.img;
    game.search = buildSearch(game);
    if (rel.endsWith(".svg")) svgMade++;
    else downloaded++;
  });

  state.games.sort(function (a, b) {
    return a.title.localeCompare(b.title);
  });

  fs.writeFileSync(GAMES_PATH, JSON.stringify(state.games, null, 2), "utf8");
  fs.writeFileSync(path.join(ROOT, "games.js"), "window.KRITIKAL_GAMES=" + JSON.stringify(state.games) + ";", "utf8");

  console.log(
    JSON.stringify({
      total: state.games.length,
      thumbsDownloaded: downloaded,
      thumbsSvg: svgMade,
    })
  );
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
