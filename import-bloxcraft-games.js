const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = __dirname;
const GAMES_PATH = path.join(ROOT, "games.json");
const THUMBS_DIR = path.join(ROOT, "assets", "thumbs");
const BLOX_DIR = path.join(ROOT, "Bloxcraft-UBG-main");
const KRIT_DIR = path.join(ROOT, "kritikal-ubg-main");
const KRIT_PREFIX = "kritikal-ubg-main/";
const CATALOG_PATH = path.join(BLOX_DIR, "games", "games.json");
const TIMEOUT_MS = 12000;

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

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

function viewFromUrl(url) {
  const m = String(url || "").match(/[?&]view=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

function localIndexFromView(view) {
  const v = String(view || "").replace(/^\/+/, "");
  if (!v) return "";
  return KRIT_PREFIX + v.replace(/\/+$/, "") + "/index.html";
}

function titleFromHtml(html, fallback) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (m) {
    const t = m[1]
      .replace(/\|.*$/, "")
      .replace(/bloxcraft\s*ubg\s*-?\s*/gi, "")
      .replace(/kritikal\s*ubg\s*-?\s*/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    if (t) return t;
  }
  return fallback;
}

function fetchJson(url) {
  return new Promise(function (resolve) {
    https
      .get(url, { headers: { "User-Agent": "KritikalImport/1.0" }, timeout: TIMEOUT_MS }, function (res) {
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

function existingKeys(games) {
  const titles = new Set();
  const paths = new Set();
  const ids = new Set();
  games.forEach(function (g) {
    titles.add(norm(g.title));
    paths.add(norm(g.path));
    paths.add(norm(String(g.path || "").replace(/^kritikal-ubg-main\//i, "")));
    paths.add(norm(String(g.path || "").replace(/^bloxcraft-ubg-main\//i, "")));
    if (g.file) paths.add(norm(g.file));
    ids.add(g.id);
  });
  return { titles: titles, paths: paths, ids: ids };
}

function exists(keys, title, gamePath, file) {
  if (keys.titles.has(norm(title))) return true;
  if (keys.paths.has(norm(gamePath))) return true;
  if (file && keys.paths.has(norm(file))) return true;
  const rel = String(gamePath || "").replace(/^Bloxcraft-UBG-main\//i, "");
  if (keys.paths.has(norm(rel))) return true;
  return false;
}

function collectLocalEntries(catalog, keys, ids, out) {
  catalog.forEach(function (item) {
    const view = viewFromUrl(item.url);
    if (!view.startsWith("/")) return;
    const gamePath = localIndexFromView(view);
    const rel = view.replace(/^\/+/, "").replace(/\/+$/, "");
    const abs = path.join(KRIT_DIR, rel, "index.html");
    if (!fs.existsSync(abs)) return;
    const file = rel + "/index.html";
    const title = item.name || path.basename(view);
    if (exists(keys, title, gamePath, file)) return;
    let html = "";
    try {
      html = fs.readFileSync(abs, "utf8");
    } catch (e) {
      return;
    }
    const finalTitle = item.name || titleFromHtml(html, title);
    if (exists(keys, finalTitle, gamePath, file)) return;
    const id = uniqueGameId(finalTitle, ids);
    ids.add(id);
    keys.titles.add(norm(finalTitle));
    keys.paths.add(norm(gamePath));
    out.push({
      id: id,
      file: file,
      title: finalTitle,
      path: gamePath,
      img: item.img || "",
      search: "",
    });
  });

  ["gameFiles", "refined-beta"].forEach(function (root) {
    const base = path.join(KRIT_DIR, root);
    if (!fs.existsSync(base)) return;
    fs.readdirSync(base).forEach(function (name) {
      if (root === "refined-beta" && (name === "index.html" || name === "landing")) return;
      const relDir = root + "/" + name;
      const gamePath = KRIT_PREFIX + relDir + "/index.html";
      const abs = path.join(KRIT_DIR, relDir, "index.html");
      if (!fs.existsSync(abs)) return;
      const file = relDir + "/index.html";
      if (exists(keys, name, gamePath, file)) return;
      let html = "";
      try {
        html = fs.readFileSync(abs, "utf8");
      } catch (e) {
        return;
      }
      const title = titleFromHtml(html, name.replace(/-/g, " "));
      if (exists(keys, title, gamePath, file)) return;
      const id = uniqueGameId(name, ids);
      ids.add(id);
      keys.titles.add(norm(title));
      keys.paths.add(norm(gamePath));
      out.push({
        id: id,
        file: file,
        title: title,
        path: gamePath,
        img: "",
        search: "",
      });
    });
  });
}

function addRemote(keys, ids, out, title, gamePath, img) {
  if (!title || !gamePath) return;
  if (exists(keys, title, gamePath, "")) return;
  const id = uniqueGameId(title, ids);
  ids.add(id);
  keys.titles.add(norm(title));
  keys.paths.add(norm(gamePath));
  out.push({
    id: id,
    file: "",
    title: title,
    path: gamePath,
    img: img || "",
    search: "",
  });
}

async function collectRemoteEntries(keys, ids, out) {
  const gn = await fetchJson("https://cdn.jsdelivr.net/gh/freebuisness/assets/zones.json");
  if (Array.isArray(gn)) {
    gn.forEach(function (g) {
      if (g.id === -1 || !g.name || String(g.name).startsWith("[!]") || !g.url) return;
      const gamePath = g.url.replace("{HTML_URL}", "https://cdn.jsdelivr.net/gh/freebuisness/html@master");
      addRemote(
        keys,
        ids,
        out,
        g.name,
        gamePath,
        "https://cdn.jsdelivr.net/gh/freebuisness/covers@main/" + String(g.cover || "").replace("{COVER_URL}", "")
      );
    });
  }

  const elite = await fetchJson("https://cdn.jsdelivr.net/gh/elite-gamez/elite-gamez.github.io@main/games.json");
  if (Array.isArray(elite)) {
    elite.forEach(function (g) {
      if (!g.title || !g.url) return;
      addRemote(
        keys,
        ids,
        out,
        g.title,
        "https://cdn.jsdelivr.net/gh/elite-gamez/elite-gamez.github.io@main/" + g.url,
        "https://cdn.jsdelivr.net/gh/elite-gamez/elite-gamez.github.io@main/" + (g.image || "")
      );
    });
  }

  const sea = await fetchJson("https://cdn.jsdelivr.net/gh/sea-bean-unblocked/sde@main/zzz.json");
  if (Array.isArray(sea)) {
    sea.forEach(function (g) {
      if (!g.name) return;
      let gamePath = g.html || g.url || "";
      if (!gamePath) return;
      if (gamePath.includes("{HTML_URL}")) {
        gamePath = gamePath.replace("{HTML_URL}", "https://cdn.jsdelivr.net/gh/sea-bean-unblocked/Singlemile@main/games/");
      }
      gamePath = gamePath.replace(/([^:]\/)\/+/g, "$1");
      let img = g.cover || "";
      if (img && !/^https?:\/\//i.test(img)) {
        img = "https://cdn.jsdelivr.net/gh/sea-bean-unblocked/Singlemile@main/Icon/" + img.replace("{COVER_URL}/", "");
      }
      addRemote(keys, ids, out, g.name, gamePath, img);
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
      addRemote(
        keys,
        ids,
        out,
        f.name.replace(/^cl/, "").replace(/\.html$/, ""),
        "https://cdn.jsdelivr.net/gh/" + repo + "@main/" + f.name,
        "https://cdn.jsdelivr.net/gh/tharun9772/game-assets@main/5968517.png"
      );
    });
  }

  const seraph = await fetchJson(
    "https://cdn.jsdelivr.net/gh/DominumNetwork/dominum@main/src/assets/libraries/seraph/games.json"
  );
  if (Array.isArray(seraph)) {
    seraph.forEach(function (g) {
      if (!g.name || !g.url) return;
      addRemote(keys, ids, out, g.name, g.url, g.img || "");
    });
  }

  const ckv = await fetchJson("https://cdn.jsdelivr.net/gh/carbonicality/ChickenKingsVault@main/games.json");
  if (Array.isArray(ckv)) {
    ckv.forEach(function (g) {
      if (!g.name || !g.html) return;
      addRemote(
        keys,
        ids,
        out,
        g.name,
        "https://cdn.jsdelivr.net/gh/carbonicality/ChickenKingsVault@main/gamefiles/" + g.html,
        g.img
          ? "https://cdn.jsdelivr.net/gh/carbonicality/ChickenKingsVault@main/gameimages/" + g.img
          : ""
      );
    });
  }

  const hydra = await fetchJson("https://cdn.jsdelivr.net/gh/Hydra-Network/hydra-assets@main/gmes.json");
  if (Array.isArray(hydra)) {
    hydra.forEach(function (g) {
      if (!g.title || !g.file_name) return;
      addRemote(
        keys,
        ids,
        out,
        g.title,
        "https://cdn.jsdelivr.net/gh/Hydra-Network/hydra-assets@main/gmes/" + g.file_name,
        g.thumb ? "https://cdn.jsdelivr.net/gh/Hydra-Network/hydra-assets@main/" + g.thumb : ""
      );
    });
  }

  const cc = await fetchJson("https://cdn.jsdelivr.net/gh/tharun9772/game-assets@main/ccported-stupid-game-lib.json");
  if (Array.isArray(cc)) {
    cc.forEach(function (g) {
      if (!g.base || !g.Id) return;
      addRemote(
        keys,
        ids,
        out,
        g.name && g.name.trim() ? g.name : "Game " + g.Id,
        g.base + "/index.html",
        g.base + "/thumb.jpg"
      );
    });
  }

  const gc = await fetchJson("https://cdn.jsdelivr.net/gh/bloxcraft-st/google-class-files@main/assets/games.json");
  if (Array.isArray(gc)) {
    gc.forEach(function (g) {
      if (!g.name || !g.url) return;
      addRemote(
        keys,
        ids,
        out,
        g.name,
        "https://cdn.jsdelivr.net/gh/bloxcraft-st/google-class-files@main/" + g.url,
        g.img || ""
      );
    });
  }

  const tr = await fetchJson("https://cdn.jsdelivr.net/gh/aukak/truffled@main/public/js/json/g.json");
  if (tr && Array.isArray(tr.games)) {
    tr.games.forEach(function (g) {
      if (!g.name || !g.url) return;
      const thumb = String(g.thumbnail || "")
        .replace(/^\/+/, "")
        .replace(/^png\/games\//, "");
      addRemote(
        keys,
        ids,
        out,
        g.name,
        "https://truffled.lol/" + String(g.url).replace(/^\/+/, ""),
        thumb ? "https://cdn.jsdelivr.net/gh/aukak/truffled@main/public/png/games/" + thumb : ""
      );
    });
  }

  const nowgg = await fetchJson("https://cdn.jsdelivr.net/gh/tharun9772/game-assets@main/nowgg.fun/games.json");
  if (Array.isArray(nowgg)) {
    nowgg.forEach(function (g) {
      if (!g.name || !g.url) return;
      let gamePath = String(g.url).trim();
      if (!/^https?:\/\//i.test(gamePath)) gamePath = "https://" + gamePath;
      addRemote(keys, ids, out, g.name, gamePath, g.img || "");
    });
  }

  const alex = await fetchJson("https://cdn.jsdelivr.net/gh/dskjfoisjfsjio/alexrsworld@latest/singlefilegames.json");
  if (Array.isArray(alex)) {
    alex.forEach(function (g) {
      if (!g.title || !g.path) return;
      addRemote(keys, ids, out, g.title, g.path, g.img || "");
    });
  }

  const lupine = await fetchJson("https://cdn.jsdelivr.net/gh/tharun9772/LupineVault@main/assets/games.json");
  if (Array.isArray(lupine)) {
    lupine.forEach(function (g) {
      if (!g.name) return;
      const enc = encodeURIComponent(g.name);
      addRemote(
        keys,
        ids,
        out,
        g.name,
        "https://cdn.jsdelivr.net/gh/tharun9772/LupineVault@main/assets/games/" + enc + "/index.html",
        "https://cdn.jsdelivr.net/gh/tharun9772/LupineVault@main/assets/images/games/tile/" + enc + ".png"
      );
    });
  }

  const k3 = await fetchJson("https://cdn.jsdelivr.net/gh/tharun9772/game-assets@main/3kh0/3kh0-assets.json");
  if (Array.isArray(k3)) {
    k3.forEach(function (name) {
      if (!name) return;
      addRemote(
        keys,
        ids,
        out,
        name,
        "https://raw.githack.com/tharun9772/3kh0-assets/main/" + name + "/index.html",
        "https://raw.githack.com/tharun9772/3kh0-assets/main/" + name + "/splash.png"
      );
    });
  }

  const k3l = await fetchJson("https://cdn.jsdelivr.net/gh/tharun9772/game-assets@main/3kh0/3kh0-lite.json");
  if (Array.isArray(k3l)) {
    k3l.forEach(function (g) {
      if (!g.title || !g.link) return;
      addRemote(
        keys,
        ids,
        out,
        g.title,
        "https://raw.githack.com/3kh0/3kh0-lite/main/" + g.link,
        "https://raw.githack.com/3kh0/3kh0-lite/main/" + (g.imgSrc || "")
      );
    });
  }
}

function resolveImgUrl(img) {
  const raw = String(img || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return raw;
  return "/" + raw;
}

function readLocalImage(imgUrl) {
  const rel = String(imgUrl || "").replace(/^\/+/, "");
  const tries = [
    path.join(BLOX_DIR, rel),
    path.join(ROOT, rel),
    path.join(ROOT, "kritikal-ubg-main", rel),
  ];
  for (let i = 0; i < tries.length; i++) {
    if (fs.existsSync(tries[i])) {
      try {
        const buf = fs.readFileSync(tries[i]);
        if (buf.length >= 40) return { buf: buf, ct: "", url: tries[i] };
      } catch (e) {}
    }
  }
  return null;
}

function fetchBuffer(url, redirects) {
  redirects = redirects || 0;
  if (redirects > 5) return Promise.resolve(null);
  return new Promise(function (resolve) {
    const lib = url.startsWith("https") ? https : require("http");
    lib
      .get(url, { headers: { "User-Agent": "KritikalImport/1.0", Accept: "image/*,*/*" }, timeout: TIMEOUT_MS }, function (res) {
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
          if (buf.length < 40) resolve(null);
          else resolve({ buf: buf, ct: String(res.headers["content-type"] || ""), url: url });
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

function extFromContentType(ct, url) {
  const u = String(url || "").toLowerCase();
  if (u.endsWith(".png") || ct.includes("png")) return "png";
  if (u.endsWith(".jpg") || u.endsWith(".jpeg") || ct.includes("jpeg")) return "jpg";
  if (u.endsWith(".webp") || ct.includes("webp")) return "webp";
  if (u.endsWith(".gif") || ct.includes("gif")) return "gif";
  if (u.endsWith(".svg") || ct.includes("svg")) return "svg";
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

async function saveThumb(id, title, img) {
  if (!fs.existsSync(THUMBS_DIR)) fs.mkdirSync(THUMBS_DIR, { recursive: true });
  const imgUrl = resolveImgUrl(img);
  let hit = null;
  if (imgUrl.startsWith("http")) hit = await fetchBuffer(imgUrl);
  else if (imgUrl) hit = readLocalImage(imgUrl);
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

async function main() {
  const existing = JSON.parse(fs.readFileSync(GAMES_PATH, "utf8"));
  const keys = existingKeys(existing);
  const ids = new Set(existing.map(function (g) {
    return g.id;
  }));
  const additions = [];

  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  collectLocalEntries(catalog, keys, ids, additions);
  await collectRemoteEntries(keys, ids, additions);

  for (let i = 0; i < additions.length; i++) {
    const e = additions[i];
    e.image = await saveThumb(e.id, e.title, e.img);
    delete e.img;
    e.search = buildSearch(e);
  }

  if (!additions.length) {
    console.log(JSON.stringify({ added: 0, total: existing.length }));
    return;
  }

  const merged = existing.concat(additions);
  merged.sort(function (a, b) {
    return a.title.localeCompare(b.title);
  });

  fs.writeFileSync(GAMES_PATH, JSON.stringify(merged, null, 2), "utf8");
  fs.writeFileSync(path.join(ROOT, "games.js"), "window.KRITIKAL_GAMES=" + JSON.stringify(merged) + ";", "utf8");

  console.log(
    JSON.stringify({
      added: additions.length,
      total: merged.length,
      sample: additions.slice(0, 10).map(function (g) {
        return g.title;
      }),
    })
  );
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
