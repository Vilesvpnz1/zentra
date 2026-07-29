const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = __dirname;
const GAMES_PATH = path.join(ROOT, "games.json");
const BLOX_DIR = path.join(ROOT, "Bloxcraft-UBG-main");
const KRIT_DIR = path.join(ROOT, "kritikal-UBG-main");
const KRIT_PREFIX = "kritikal-UBG-main/";
const TIMEOUT_MS = 15000;

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function viewFromUrl(url) {
  const m = String(url || "").match(/[?&]view=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

function fetchJson(url) {
  return new Promise(function (resolve) {
    https
      .get(url, { headers: { "User-Agent": "KobranScan/1.0" }, timeout: TIMEOUT_MS }, function (res) {
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
  games.forEach(function (g) {
    titles.add(norm(g.title));
    paths.add(norm(g.path));
    paths.add(norm(String(g.path || "").replace(/^kritikal-UBG-main\//i, "")));
    paths.add(norm(String(g.path || "").replace(/^bloxcraft-ubg-main\//i, "")));
    if (g.file) paths.add(norm(g.file));
  });
  return { titles: titles, paths: paths };
}

function exists(keys, title, gamePath, file) {
  if (keys.titles.has(norm(title))) return true;
  if (keys.paths.has(norm(gamePath))) return true;
  if (file && keys.paths.has(norm(file))) return true;
  return false;
}

function push(keys, out, source, title, gamePath, file, img) {
  if (!title || !gamePath) return;
  if (exists(keys, title, gamePath, file || "")) return;
  keys.titles.add(norm(title));
  keys.paths.add(norm(gamePath));
  if (file) keys.paths.add(norm(file));
  out.push({ source: source, title: title, path: gamePath, file: file || "", img: img || "" });
}

function collectLocal(keys, out) {
  const catalog = JSON.parse(fs.readFileSync(path.join(BLOX_DIR, "games", "games.json"), "utf8"));
  catalog.forEach(function (item) {
    const view = viewFromUrl(item.url);
    if (!view.startsWith("/")) return;
    const rel = view.replace(/^\/+/, "").replace(/\/+$/, "");
    const gamePath = KRIT_PREFIX + rel + "/index.html";
    const abs = path.join(KRIT_DIR, rel, "index.html");
    if (!fs.existsSync(abs)) return;
    push(keys, out, "blox-catalog", item.name || rel, gamePath, rel + "/index.html", item.img || "");
  });

  ["gameFiles", "refined-beta"].forEach(function (root) {
    const base = path.join(BLOX_DIR, root);
    if (!fs.existsSync(base)) return;
    fs.readdirSync(base).forEach(function (name) {
      if (root === "refined-beta" && (name === "index.html" || name === "landing")) return;
      const rel = root + "/" + name;
      const gamePath = KRIT_PREFIX + rel + "/index.html";
      const abs = path.join(KRIT_DIR, rel, "index.html");
      if (!fs.existsSync(abs)) return;
      push(keys, out, "blox-" + root, name.replace(/-/g, " "), gamePath, rel + "/index.html", "");
    });
  });
}

async function collectRemote(keys, out) {
  const gn = await fetchJson("https://cdn.jsdelivr.net/gh/freebuisness/assets/zones.json");
  if (Array.isArray(gn)) {
    gn.forEach(function (g) {
      if (g.id === -1 || !g.name || String(g.name).startsWith("[!]") || !g.url) return;
      const gamePath = g.url.replace("{HTML_URL}", "https://cdn.jsdelivr.net/gh/freebuisness/html@master");
      push(
        keys,
        out,
        "gn",
        g.name,
        gamePath,
        "",
        "https://cdn.jsdelivr.net/gh/freebuisness/covers@main/" + String(g.cover || "").replace("{COVER_URL}", "")
      );
    });
  }

  const elite = await fetchJson("https://cdn.jsdelivr.net/gh/elite-gamez/elite-gamez.github.io@main/games.json");
  if (Array.isArray(elite)) {
    elite.forEach(function (g) {
      if (!g.title || !g.url) return;
      const gamePath = "https://cdn.jsdelivr.net/gh/elite-gamez/elite-gamez.github.io@main/" + g.url;
      push(
        keys,
        out,
        "elite",
        g.title,
        gamePath,
        "",
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
      push(keys, out, "sea", g.name, gamePath, "", img);
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
      const title = f.name.replace(/^cl/, "").replace(/\.html$/, "");
      const gamePath = "https://cdn.jsdelivr.net/gh/" + repo + "@main/" + f.name;
      push(keys, out, "ugs", title, gamePath, "", "https://cdn.jsdelivr.net/gh/tharun9772/game-assets@main/5968517.png");
    });
  }

  const seraph = await fetchJson(
    "https://cdn.jsdelivr.net/gh/DominumNetwork/dominum@main/src/assets/libraries/seraph/games.json"
  );
  if (Array.isArray(seraph)) {
    seraph.forEach(function (g) {
      if (!g.name || !g.url) return;
      push(keys, out, "seraph", g.name, g.url, "", g.img || "");
    });
  }

  const ckv = await fetchJson("https://cdn.jsdelivr.net/gh/carbonicality/ChickenKingsVault@main/games.json");
  if (Array.isArray(ckv)) {
    ckv.forEach(function (g) {
      if (!g.name || !g.html) return;
      const gamePath =
        "https://cdn.jsdelivr.net/gh/carbonicality/ChickenKingsVault@main/gamefiles/" + g.html;
      const img = g.img
        ? "https://cdn.jsdelivr.net/gh/carbonicality/ChickenKingsVault@main/gameimages/" + g.img
        : "";
      push(keys, out, "ckv", g.name, gamePath, "", img);
    });
  }

  const hydra = await fetchJson("https://cdn.jsdelivr.net/gh/Hydra-Network/hydra-assets@main/gmes.json");
  if (Array.isArray(hydra)) {
    hydra.forEach(function (g) {
      if (!g.title || !g.file_name) return;
      const gamePath = "https://cdn.jsdelivr.net/gh/Hydra-Network/hydra-assets@main/gmes/" + g.file_name;
      const img = g.thumb ? "https://cdn.jsdelivr.net/gh/Hydra-Network/hydra-assets@main/" + g.thumb : "";
      push(keys, out, "hydra", g.title, gamePath, "", img);
    });
  }

  const cc = await fetchJson("https://cdn.jsdelivr.net/gh/tharun9772/game-assets@main/ccported-stupid-game-lib.json");
  if (Array.isArray(cc)) {
    cc.forEach(function (g) {
      if (!g.base || !g.Id) return;
      const title = g.name && g.name.trim() ? g.name : "Game " + g.Id;
      push(keys, out, "ccported", title, g.base + "/index.html", "", g.base + "/thumb.jpg");
    });
  }

  const gc = await fetchJson("https://cdn.jsdelivr.net/gh/bloxcraft-st/google-class-files@main/assets/games.json");
  if (Array.isArray(gc)) {
    gc.forEach(function (g) {
      if (!g.name || !g.url) return;
      const gamePath = "https://cdn.jsdelivr.net/gh/bloxcraft-st/google-class-files@main/" + g.url;
      push(keys, out, "googleclass", g.name, gamePath, "", g.img || "");
    });
  }

  const tr = await fetchJson("https://cdn.jsdelivr.net/gh/aukak/truffled@main/public/js/json/g.json");
  if (tr && Array.isArray(tr.games)) {
    tr.games.forEach(function (g) {
      if (!g.name || !g.url) return;
      const slug = String(g.url).replace(/^\/+/, "");
      const gamePath = "https://truffled.lol/" + slug;
      const thumb = String(g.thumbnail || "")
        .replace(/^\/+/, "")
        .replace(/^png\/games\//, "");
      const img = thumb
        ? "https://cdn.jsdelivr.net/gh/aukak/truffled@main/public/png/games/" + thumb
        : "";
      push(keys, out, "truffled", g.name, gamePath, "", img);
    });
  }

  const nowgg = await fetchJson("https://cdn.jsdelivr.net/gh/tharun9772/game-assets@main/nowgg.fun/games.json");
  if (Array.isArray(nowgg)) {
    nowgg.forEach(function (g) {
      if (!g.name || !g.url) return;
      let gamePath = String(g.url).trim();
      if (!/^https?:\/\//i.test(gamePath)) gamePath = "https://" + gamePath;
      push(keys, out, "nowgg", g.name, gamePath, "", g.img || "");
    });
  }

  const alex = await fetchJson("https://cdn.jsdelivr.net/gh/dskjfoisjfsjio/alexrsworld@latest/singlefilegames.json");
  if (Array.isArray(alex)) {
    alex.forEach(function (g) {
      if (!g.title || !g.path) return;
      push(keys, out, "alexr", g.title, g.path, "", g.img || "");
    });
  }

  const lupine = await fetchJson("https://cdn.jsdelivr.net/gh/tharun9772/LupineVault@main/assets/games.json");
  if (Array.isArray(lupine)) {
    lupine.forEach(function (g) {
      if (!g.name) return;
      const enc = encodeURIComponent(g.name);
      const gamePath =
        "https://cdn.jsdelivr.net/gh/tharun9772/LupineVault@main/assets/games/" + enc + "/index.html";
      push(
        keys,
        out,
        "lupine",
        g.name,
        gamePath,
        "",
        "https://cdn.jsdelivr.net/gh/tharun9772/LupineVault@main/assets/images/games/tile/" + enc + ".png"
      );
    });
  }

  const k3 = await fetchJson("https://cdn.jsdelivr.net/gh/tharun9772/game-assets@main/3kh0/3kh0-assets.json");
  if (Array.isArray(k3)) {
    k3.forEach(function (name) {
      if (!name) return;
      push(
        keys,
        out,
        "3kh0",
        name,
        "https://raw.githack.com/tharun9772/3kh0-assets/main/" + name + "/index.html",
        "",
        "https://raw.githack.com/tharun9772/3kh0-assets/main/" + name + "/splash.png"
      );
    });
  }

  const k3l = await fetchJson("https://cdn.jsdelivr.net/gh/tharun9772/game-assets@main/3kh0/3kh0-lite.json");
  if (Array.isArray(k3l)) {
    k3l.forEach(function (g) {
      if (!g.title || !g.link) return;
      push(
        keys,
        out,
        "3kh0lite",
        g.title,
        "https://raw.githack.com/3kh0/3kh0-lite/main/" + g.link,
        "",
        "https://raw.githack.com/3kh0/3kh0-lite/main/" + (g.imgSrc || "")
      );
    });
  }
}

async function main() {
  const existing = JSON.parse(fs.readFileSync(GAMES_PATH, "utf8"));
  const keys = existingKeys(existing);
  const missing = [];
  collectLocal(keys, missing);
  await collectRemote(keys, missing);

  const bySource = {};
  missing.forEach(function (m) {
    bySource[m.source] = (bySource[m.source] || 0) + 1;
  });

  console.log(
    JSON.stringify({
      missing: missing.length,
      bySource: bySource,
      sample: missing.slice(0, 15).map(function (m) {
        return m.title + " (" + m.source + ")";
      }),
    })
  );
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
