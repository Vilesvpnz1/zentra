const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = __dirname;
const GAMES_PATH = path.join(ROOT, "games.json");
const GAMES_JS_PATH = path.join(ROOT, "games.js");
const UGS_DOC_URL = "https://docs.google.com/document/d/1_FmH3BlSBQI7FGgAQL59-ZPe8eCxs35wel6JUyVaG8Q/mobilebasic";
const UGS_CDN = "https://cdn.jsdelivr.net/gh/bubbls/ugs-singlefile/UGS-Files/";
const CACHE_PATH = path.join(ROOT, "data", "ugs-doc-cache.txt");

function normKey(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/&amp;/g, "and")
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

function cleanTitle(raw) {
  return String(raw || "")
    .replace(/\s+/g, " ")
    .replace(/^also\s+/i, "")
    .trim();
}

function skipTitle(title) {
  if (!title || title.length < 2) return true;
  if (/^─+$/.test(title)) return true;
  if (/^[A-Z0-9]$/.test(title)) return true;
  return /^(singlefile|padlet|unpkg|esm\.sh|skypack|html5|popular|readme|games|methods|credits|important|blocked|instructions|disclaimer|welcome|ultimate|game stash|google|game site|game request|business|alt dropbox|if file|if jsdelivr|if files|if none|this is a completely|all these|────────)/i.test(
    title
  );
}

function fetchText(url) {
  return new Promise(function (resolve, reject) {
    https
      .get(url, { headers: { "User-Agent": "ZentraImport/1.0" }, timeout: 30000 }, function (res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchText(res.headers.location).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error("HTTP " + res.statusCode));
          return;
        }
        const chunks = [];
        res.on("data", function (c) {
          chunks.push(c);
        });
        res.on("end", function () {
          resolve(Buffer.concat(chunks).toString("utf8"));
        });
      })
      .on("error", reject)
      .on("timeout", function () {
        reject(new Error("timeout"));
      });
  });
}

function loadDocText() {
  if (process.env.UGS_DOC_FILE && fs.existsSync(process.env.UGS_DOC_FILE)) {
    return fs.readFileSync(process.env.UGS_DOC_FILE, "utf8");
  }
  if (fs.existsSync(CACHE_PATH)) {
    const age = Date.now() - fs.statSync(CACHE_PATH).mtimeMs;
    if (age < 86400000) return fs.readFileSync(CACHE_PATH, "utf8");
  }
  return null;
}

function parseUgsGames(text) {
  const byFile = new Map();
  const re = /^([^:\n]{2,160}):\s*(cl[^\s]+\.html)/gim;
  let m;
  while ((m = re.exec(text))) {
    const title = cleanTitle(m[1].trim());
    const file = m[2].trim();
    if (skipTitle(title)) continue;
    const key = file.toLowerCase();
    if (!byFile.has(key)) byFile.set(key, { title: title, file: file });
  }

  const b64 = text.match(/data:text\/html;base64,([A-Za-z0-9+/=\s]+)/);
  if (b64) {
    try {
      const html = Buffer.from(b64[1].replace(/\s+/g, ""), "base64").toString("utf8");
      const fm = html.match(/const files = \[([\s\S]*?)\];/);
      if (fm) {
        const files = Function("return [" + fm[1] + "];")();
        files.forEach(function (name) {
          const raw = String(name || "").trim();
          if (!/^cl/i.test(raw)) return;
          const file = /\.html$/i.test(raw) ? raw : raw + ".html";
          const key = file.toLowerCase();
          if (byFile.has(key)) return;
          const stem = file.replace(/^cl/i, "").replace(/\.html$/i, "");
          const title = stem.replace(/([a-z])([A-Z0-9])/g, "$1 $2").replace(/[-_]+/g, " ").trim();
          byFile.set(key, { title: title || stem, file: file });
        });
      }
    } catch (e) {}
  }

  return byFile;
}

function indexExisting(games) {
  const clFiles = new Set();
  const keys = new Set();
  const ids = new Set();
  const paths = new Set();
  games.forEach(function (g) {
    ids.add(g.id);
    keys.add(normKey(g.id));
    keys.add(normKey(g.title));
    keys.add(normKey(slugId(g.title)));
    paths.add(normKey(g.path));
    const p = String(g.path || "");
    const m = p.match(/\/(cl[^/?#]+\.html)/i);
    if (m) clFiles.add(m[1].toLowerCase());
    const f = String(g.file || "");
    const m2 = f.match(/^(cl[^/?#]+\.html)/i);
    if (m2) clFiles.add(m2[1].toLowerCase());
    const stem = slugId(g.id);
    if (/^cl/.test(stem)) clFiles.add(stem.toLowerCase() + ".html");
  });
  return { clFiles: clFiles, keys: keys, ids: ids, paths: paths };
}

function hasGame(index, entry) {
  const fileKey = entry.file.toLowerCase();
  if (index.clFiles.has(fileKey)) return true;
  const stem = fileKey.replace(/^cl/, "").replace(/\.html$/, "");
  if (index.keys.has(normKey(stem))) return true;
  if (index.keys.has(normKey(entry.title))) return true;
  if (index.keys.has(normKey(slugId(entry.title)))) return true;
  const pathKey = normKey(UGS_CDN + entry.file);
  if (index.paths.has(pathKey)) return true;
  return false;
}

async function main() {
  let text = loadDocText();
  if (!text) {
    text = await fetchText(UGS_DOC_URL);
    fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
    fs.writeFileSync(CACHE_PATH, text, "utf8");
  }

  const ugsMap = parseUgsGames(text);
  const games = JSON.parse(fs.readFileSync(GAMES_PATH, "utf8"));
  const index = indexExisting(games);
  let added = 0;

  ugsMap.forEach(function (entry) {
    if (hasGame(index, entry)) return;
    const stem = entry.file.replace(/\.html$/i, "");
    const id = uniqueGameId(stem, index.ids);
    index.ids.add(id);
    index.keys.add(normKey(id));
    index.keys.add(normKey(entry.title));
    index.keys.add(normKey(slugId(entry.title)));
    index.clFiles.add(entry.file.toLowerCase());
    const gamePath = UGS_CDN + entry.file;
    index.paths.add(normKey(gamePath));
    games.push({
      id: id,
      file: entry.file,
      title: entry.title,
      path: gamePath,
      search: buildSearch({ id: id, title: entry.title, file: entry.file, path: gamePath }),
      image: "assets/thumbs/" + id + ".png",
    });
    added++;
  });

  games.sort(function (a, b) {
    return a.title.localeCompare(b.title);
  });

  fs.writeFileSync(GAMES_PATH, JSON.stringify(games, null, 2), "utf8");
  fs.writeFileSync(GAMES_JS_PATH, "window.KRITIKAL_GAMES=" + JSON.stringify(games) + ";", "utf8");

  console.log(
    JSON.stringify(
      {
        ugsCatalog: ugsMap.size,
        added: added,
        total: games.length,
      },
      null,
      2
    )
  );
}

main().catch(function (err) {
  console.error(err.message || err);
  process.exit(1);
});
