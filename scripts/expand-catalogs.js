const fs = require("fs");
const path = require("path");
const https = require("https");

const root = path.join(__dirname, "..");
const moviesPath = path.join(root, "movies-catalog.json");
const musicPath = path.join(root, "music-catalog.json");

function fetchJson(url) {
  return new Promise(function (resolve, reject) {
    https
      .get(url, { headers: { "User-Agent": "Kritikal/1.0", Accept: "application/json" } }, function (res) {
        var chunks = [];
        res.on("data", function (c) {
          chunks.push(c);
        });
        res.on("end", function () {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
  } catch (e) {
    return fallback;
  }
}

function dedupeMovies(list) {
  var seen = {};
  var out = [];
  list.forEach(function (m) {
    if (!m || !m.id || seen[m.id]) return;
    seen[m.id] = true;
    out.push(m);
  });
  return out;
}

function dedupeTracks(list) {
  var seen = {};
  var out = [];
  list.forEach(function (t) {
    if (!t || t.id == null || seen[t.id]) return;
    seen[t.id] = true;
    out.push(t);
  });
  return out;
}

async function expandMovies() {
  var existing = readJson(moviesPath, []);
  var seen = {};
  existing.forEach(function (m) {
    if (m && m.id) seen[m.id] = true;
  });
  var query =
    "SELECT ?tmdbId ?itemLabel ?year WHERE { ?item wdt:P31 wd:Q11424. ?item wdt:P4947 ?tmdbId. OPTIONAL { ?item wdt:P577 ?inception. BIND(YEAR(?inception) AS ?year) } SERVICE wikibase:label { bd:serviceParam wikibase:language \"en\". } } LIMIT 2500";
  var url = "https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(query);
  var payload = await fetchJson(url);
  var rows = payload && payload.results && payload.results.bindings ? payload.results.bindings : [];
  var added = 0;
  rows.forEach(function (row) {
    var id = parseInt(String(row.tmdbId && row.tmdbId.value ? row.tmdbId.value : ""), 10);
    if (!id || seen[id]) return;
    var title = row.itemLabel && row.itemLabel.value ? row.itemLabel.value : "Movie " + id;
    var year = row.year && row.year.value ? parseInt(row.year.value, 10) : "";
    seen[id] = true;
    existing.push({ id: id, title: title, year: year || "", poster: "" });
    added++;
  });
  existing = dedupeMovies(existing);
  fs.writeFileSync(moviesPath, JSON.stringify(existing, null, 2) + "\n");
  console.log("Movies total:", existing.length, "added:", added);
}

async function audius(pathname, params) {
  var qs = new URLSearchParams(params || {});
  qs.set("app_name", "Kritikal");
  return fetchJson("https://discoveryprovider.audius.co/v1" + pathname + "?" + qs.toString());
}

async function expandMusic() {
  var merged = [];
  var genres = [
    "Electronic",
    "Hip-Hop",
    "Pop",
    "Rock",
    "R&B",
    "Alternative",
    "Country",
    "Latin",
    "Jazz",
    "Classical",
    "Soul",
    "Metal",
    "Folk",
    "Blues",
    "Soundtrack",
    "Lo-Fi",
    "House",
    "Techno",
    "Trap",
    "Indie",
    "Dance",
    "Ambient",
    "Disco",
    "Reggae",
    "Punk",
    "Afrobeats",
    "K-Pop",
    "Gospel",
    "Drum & Bass",
    "Trance",
  ];
  var jobs = [
    audius("/tracks/trending", { limit: "100" }),
    audius("/tracks/trending/underground", { limit: "100" }),
  ];
  for (var page = 0; page < 20; page++) {
    jobs.push(audius("/tracks/trending", { limit: "100", offset: String(page * 100) }));
    jobs.push(audius("/tracks/trending/underground", { limit: "100", offset: String(page * 100) }));
  }
  genres.forEach(function (genre) {
    jobs.push(audius("/tracks/trending", { limit: "50", genre: genre }));
    jobs.push(audius("/tracks/trending", { limit: "50", genre: genre, offset: "50" }));
    jobs.push(audius("/tracks/trending", { limit: "50", genre: genre, offset: "100" }));
  });
  var searchTerms = ["love", "night", "beat", "remix", "mix", "2024", "2025", "chill", "party", "vibes"];
  searchTerms.forEach(function (term) {
    jobs.push(audius("/tracks/search", { query: term, limit: "100", sortMethod: "popular" }));
    jobs.push(audius("/tracks/search", { query: term, limit: "100", offset: "100", sortMethod: "popular" }));
  });
  var results = await Promise.all(
    jobs.map(function (j) {
      return j.catch(function () {
        return { data: [] };
      });
    })
  );
  results.forEach(function (payload) {
    if (payload && Array.isArray(payload.data)) merged = merged.concat(payload.data);
  });
  merged = dedupeTracks(merged).slice(0, 1400);
  fs.writeFileSync(musicPath, JSON.stringify(merged, null, 2) + "\n");
  console.log("Music catalog tracks:", merged.length);
}

async function main() {
  await expandMovies();
  await expandMusic();
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
