const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const ROOT = __dirname;
const GAMES_PATH = path.join(ROOT, "games.json");
const THUMBS_DIR = path.join(ROOT, "assets", "thumbs");
const CONCURRENCY = Number(process.env.THUMB_CONCURRENCY || 32);
const LIMIT = Number(process.env.THUMB_LIMIT || 0);
const ONLY_IDS = process.env.THUMB_IDS
  ? String(process.env.THUMB_IDS)
      .split(",")
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean)
  : null;
const MISS_ONLY = process.env.THUMB_MISS_ONLY === "1";
const TIMEOUT_MS = 8000;
const THUMB_EXTS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

const { resolveCoverUrls, pickCoverUrl } = require("./thumb-resolve");

function extFromCt(ct, url) {
  const type = String(ct || "").toLowerCase();
  if (type.includes("webp")) return ".webp";
  if (type.includes("gif")) return ".gif";
  if (type.includes("jpeg") || type.includes("jpg")) return ".jpg";
  if (type.includes("svg")) return ".svg";
  if (type.includes("png")) return ".png";
  const m = String(url || "").match(/\.(png|jpe?g|webp|gif|svg)(?:\?|#|$)/i);
  return m ? "." + m[1].toLowerCase().replace("jpeg", "jpg") : ".png";
}

function fetchBuffer(url, redirects) {
  redirects = redirects || 0;
  if (redirects > 4 || !/^https?:\/\//i.test(url)) return Promise.resolve(null);
  return new Promise(function (resolve) {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(
      url,
      {
        headers: { "User-Agent": "KritikalThumbWarm/1.0", Accept: "image/*,*/*;q=0.8" },
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
        const ct = String(res.headers["content-type"] || "");
        if (ct.includes("text/html") && !ct.includes("svg")) {
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
          if (buf.length < 80) {
            resolve(null);
            return;
          }
          resolve({ buf: buf, ct: ct, url: url });
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

async function firstImageHit(urls) {
  const slice = urls.slice(0, 24);
  if (!slice.length) return null;
  return new Promise(function (resolve) {
    let settled = false;
    let pending = slice.length;
    slice.forEach(function (url) {
      fetchBuffer(url).then(function (hit) {
        if (settled) return;
        if (hit && hit.buf && hit.buf.length >= 120) {
          settled = true;
          resolve(hit);
          return;
        }
        pending--;
        if (pending <= 0) resolve(null);
      });
    });
  });
}

function isBadThumbFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return true;
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size < 80) return true;
    const head = fs.readFileSync(filePath).slice(0, 200).toString("utf8");
    if (head.includes("<svg") && head.includes("linearGradient")) return true;
    if (stat.size < 4000 && filePath.toLowerCase().endsWith(".png")) return true;
    return false;
  } catch (e) {
    return true;
  }
}

function hasCachedThumb(id) {
  const exts = THUMB_EXTS.concat([".svg"]);
  let best = 0;
  for (let i = 0; i < exts.length; i++) {
    const p = path.join(THUMBS_DIR, id + exts[i]);
    if (isBadThumbFile(p)) continue;
    const size = fs.statSync(p).size;
    if (size > best) best = size;
  }
  return best > 500;
}

async function warmGame(game) {
  const id = String(game.id || "");
  if (!id) return { id: "", status: "skip" };
  const urls = resolveCoverUrls(game);
  const preferred = pickCoverUrl(game);
  if (preferred) {
    urls.unshift(preferred);
  }
  const unique = [];
  urls.forEach(function (u) {
    if (u && unique.indexOf(u) === -1) unique.push(u);
  });
  if (hasCachedThumb(id)) {
    return { id: id, status: "cached" };
  }
  const hit = await firstImageHit(unique);
  if (!hit) return { id: id, status: "miss" };
  const ext = extFromCt(hit.ct, hit.url);
  const out = path.join(THUMBS_DIR, id + ext);
  fs.mkdirSync(THUMBS_DIR, { recursive: true });
  fs.writeFileSync(out, hit.buf);
  THUMB_EXTS.concat([".svg"]).forEach(function (oldExt) {
    if (oldExt === ext) return;
    const oldPath = path.join(THUMBS_DIR, id + oldExt);
    if (isBadThumbFile(oldPath)) {
      try {
        fs.unlinkSync(oldPath);
      } catch (e) {}
    }
  });
  return { id: id, status: "saved", url: hit.url, file: out };
}

async function runPool(items, worker, concurrency) {
  let index = 0;
  const results = [];
  async function next() {
    while (index < items.length) {
      const i = index++;
      const result = await worker(items[i], i);
      results[i] = result;
    }
  }
  const runners = [];
  for (let i = 0; i < concurrency; i++) runners.push(next());
  await Promise.all(runners);
  return results;
}


async function main() {
  let games = JSON.parse(fs.readFileSync(GAMES_PATH, "utf8"));
  if (ONLY_IDS) {
    const set = new Set(ONLY_IDS.map(function (s) {
      return s.toLowerCase();
    }));
    games = games.filter(function (g) {
      return set.has(String(g.id || "").toLowerCase());
    });
  }
  if (MISS_ONLY) {
    games = games.filter(function (g) {
      return g && g.id && !hasCachedThumb(String(g.id));
    });
  }
  if (LIMIT > 0) games = games.slice(0, LIMIT);
  console.log("Warming " + games.length + " thumbnails (concurrency " + CONCURRENCY + ")...");
  let saved = 0;
  let cached = 0;
  let miss = 0;
  const started = Date.now();
  await runPool(
    games,
    async function (game, i) {
      const result = await warmGame(game);
      if (result.status === "saved") saved++;
      else if (result.status === "cached") cached++;
      else if (result.status === "miss") miss++;
      if ((i + 1) % 100 === 0 || i + 1 === games.length) {
        const elapsed = ((Date.now() - started) / 1000).toFixed(1);
        console.log(
          "[" + (i + 1) + "/" + games.length + "] saved=" + saved + " cached=" + cached + " miss=" + miss + " (" + elapsed + "s)"
        );
      }
      return result;
    },
    CONCURRENCY
  );
  console.log("Done. saved=" + saved + " cached=" + cached + " miss=" + miss);
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
