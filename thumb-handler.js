const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { slugDash, resolveCoverUrls } = require("./thumb-resolve");

const TIMEOUT_MS = 4500;
const MEM_CACHE_MAX = 4000;
const inflight = new Map();
const memCache = new Map();

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

function labelFromTitle(title, id) {
  const t = String(title || id || "Game").trim();
  return t.length > 22 ? t.slice(0, 20) + "…" : t;
}

function makeSvg(title, id) {
  const h = hueFromId(id);
  const h2 = (h + 38) % 360;
  const label = escapeXml(labelFromTitle(title, id));
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

function fetchBuffer(url, redirects) {
  redirects = redirects || 0;
  if (redirects > 4 || !/^https?:\/\//i.test(url)) return Promise.resolve(null);
  return new Promise(function (resolve) {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(
      url,
      {
        headers: { "User-Agent": "ZentraThumb/1.0", Accept: "image/*,*/*;q=0.8" },
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

function rememberCache(key, value) {
  if (memCache.size >= MEM_CACHE_MAX) {
    const first = memCache.keys().next().value;
    if (first) memCache.delete(first);
  }
  memCache.set(key, value);
}

async function firstImageHit(urls) {
  const slice = urls.slice(0, 20);
  const hits = await Promise.all(
    slice.map(function (url) {
      return fetchBuffer(url).then(function (hit) {
        return hit ? { hit: hit, url: url } : null;
      });
    })
  );
  for (let i = 0; i < hits.length; i++) {
    if (hits[i]) return hits[i];
  }
  return null;
}

function buildGameIndex(games) {
  const map = new Map();
  games.forEach(function (game) {
    if (!game || !game.id) return;
    map.set(String(game.id).toLowerCase(), game);
    map.set(slugDash(game.id).toLowerCase(), game);
    const base = String(game.id).replace(/\.[^.]+$/i, "");
    map.set(base.toLowerCase(), game);
  });
  return map;
}

function findGame(index, token) {
  if (!token) return null;
  const key = String(token).toLowerCase();
  if (index.has(key)) return index.get(key);
  const dashed = slugDash(token).toLowerCase();
  if (index.has(dashed)) return index.get(dashed);
  return null;
}

function writeCached(outPath, buf) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
}

async function resolveThumb(game, outPath) {
  const got = await firstImageHit(resolveCoverUrls(game));
  if (got && got.hit && got.hit.buf) {
    try {
      writeCached(outPath, got.hit.buf);
    } catch (e) {}
    return { path: outPath, ct: got.hit.ct, buf: got.hit.buf };
  }
  return null;
}

function sendCached(res, cached) {
  res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
  if (cached.buf) {
    res.type(cached.ct || "image/png");
    res.send(cached.buf);
    return;
  }
  if (cached.path && fs.existsSync(cached.path)) {
    res.sendFile(cached.path);
    return;
  }
  if (cached.redirect) {
    res.redirect(302, cached.redirect);
  }
}

function serveThumb(req, res, game, cacheKey, outPath) {
  if (memCache.has(cacheKey)) {
    sendCached(res, memCache.get(cacheKey));
    return;
  }
  if (outPath && fs.existsSync(outPath) && fs.statSync(outPath).isFile()) {
    const hit = { path: outPath };
    rememberCache(cacheKey, hit);
    sendCached(res, hit);
    return;
  }

  if (inflight.has(cacheKey)) {
    inflight
      .get(cacheKey)
      .then(function (result) {
        if (result && (result.buf || result.path)) {
          sendCached(res, result);
          return;
        }
        res.type("image/svg+xml").send(makeSvg(game.title, game.id));
      })
      .catch(function () {
        res.type("image/svg+xml").send(makeSvg(game.title, game.id));
      });
    return;
  }

  const job = resolveThumb(game, outPath)
    .then(function (result) {
      inflight.delete(cacheKey);
      if (result) rememberCache(cacheKey, result);
      return result;
    })
    .catch(function () {
      inflight.delete(cacheKey);
      return null;
    });

  inflight.set(cacheKey, job);

  job.then(function (result) {
    if (result && (result.buf || (result.path && fs.existsSync(result.path)))) {
      sendCached(res, result);
      return;
    }
    const svg = makeSvg(game.title, game.id);
    rememberCache(cacheKey, { buf: Buffer.from(svg, "utf8"), ct: "image/svg+xml" });
    res.type("image/svg+xml").send(svg);
  });
}

function attachThumbHandler(app, options) {
  const root = path.resolve(options.root);
  const thumbsDir = path.join(root, "assets", "thumbs");
  const getGames = options.getGames;
  let gameIndex = buildGameIndex(getGames());

  setInterval(function () {
    gameIndex = buildGameIndex(getGames());
  }, 120000);

  function lookupGame(token) {
    return findGame(gameIndex, token);
  }

  app.get("/api/thumb/:id", function (req, res) {
    const token = String(req.params.id || "").replace(/\.[^.]+$/i, "");
    const game = lookupGame(token);
    if (!game) {
      res.status(404).end();
      return;
    }
    const outPath = path.join(thumbsDir, token + ".png");
    serveThumb(req, res, game, "id:" + token, outPath);
  });

  app.get("/assets/thumbs/:file", function (req, res, next) {
    const file = path.basename(String(req.params.file || ""));
    if (!file || file.includes("..")) {
      res.status(400).end();
      return;
    }
    const token = file.replace(/\.[^.]+$/i, "");
    const game = lookupGame(token);
    if (!game) {
      next();
      return;
    }
    const localPath = path.join(thumbsDir, file);
    serveThumb(req, res, game, "file:" + file, localPath);
  });
}

module.exports = {
  attachThumbHandler: attachThumbHandler,
  makeSvg: makeSvg,
};
