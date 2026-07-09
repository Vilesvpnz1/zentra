const fs = require("fs");
const path = require("path");
const https = require("https");

const root = path.join(__dirname, "..");
const moviesPath = path.join(root, "movies-catalog.json");
const tvPath = path.join(root, "tv-catalog.json");

function fetchJson(url, attempt) {
  attempt = attempt || 0;
  return new Promise(function (resolve, reject) {
    https
      .get(url, { headers: { "User-Agent": "Kritikal/1.0", Accept: "application/json" } }, function (res) {
        var chunks = [];
        res.on("data", function (c) {
          chunks.push(c);
        });
        res.on("end", function () {
          var text = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode && res.statusCode >= 400) {
            if (attempt < 6) {
              return setTimeout(function () {
                fetchJson(url, attempt + 1)
                  .then(resolve)
                  .catch(reject);
              }, 2000 + attempt * 1500);
            }
            return reject(new Error("upstream " + res.statusCode));
          }
          try {
            resolve(JSON.parse(text));
          } catch (e) {
            if (attempt < 6) {
              return setTimeout(function () {
                fetchJson(url, attempt + 1)
                  .then(resolve)
                  .catch(reject);
              }, 2000 + attempt * 1500);
            }
            reject(e);
          }
        });
      })
      .on("error", function (err) {
        if (attempt < 6) {
          return setTimeout(function () {
            fetchJson(url, attempt + 1)
              .then(resolve)
              .catch(reject);
          }, 2000 + attempt * 1500);
        }
        reject(err);
      });
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

async function wikidataBatch(offset, limit, yearMin, yearMax) {
  var yearFilter = "";
  if (yearMin != null && yearMax != null) {
    yearFilter =
      " ?item wdt:P577 ?inception. FILTER(YEAR(?inception) >= " +
      yearMin +
      " && YEAR(?inception) <= " +
      yearMax +
      ") ";
  }
  var query =
    "SELECT ?tmdbId ?itemLabel ?year WHERE { ?item wdt:P31 wd:Q11424. ?item wdt:P4947 ?tmdbId." +
    yearFilter +
    " OPTIONAL { ?item wdt:P577 ?inception. BIND(YEAR(?inception) AS ?year) } SERVICE wikibase:label { bd:serviceParam wikibase:language \"en\". } } ORDER BY ?tmdbId OFFSET " +
    offset +
    " LIMIT " +
    limit;
  var url = "https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(query);
  var payload = await fetchJson(url);
  var rows = payload && payload.results && payload.results.bindings ? payload.results.bindings : [];
  var batch = [];
  rows.forEach(function (row) {
    var id = parseInt(String(row.tmdbId && row.tmdbId.value ? row.tmdbId.value : ""), 10);
    if (!id) return;
    var title = row.itemLabel && row.itemLabel.value ? row.itemLabel.value : "Movie " + id;
    var year = row.year && row.year.value ? parseInt(row.year.value, 10) : "";
    batch.push({ id: id, title: title, year: year || "", poster: "", type: "movie" });
  });
  return batch;
}

async function wikidataTvBatch(offset, limit) {
  var query =
    "SELECT ?tmdbId ?itemLabel ?year WHERE { ?item wdt:P31 wd:Q5398426. ?item wdt:P4983 ?tmdbId. OPTIONAL { ?item wdt:P580 ?start. BIND(YEAR(?start) AS ?year) } SERVICE wikibase:label { bd:serviceParam wikibase:language \"en\". } } ORDER BY ?tmdbId OFFSET " +
    offset +
    " LIMIT " +
    limit;
  var url = "https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(query);
  var payload = await fetchJson(url);
  var rows = payload && payload.results && payload.results.bindings ? payload.results.bindings : [];
  var batch = [];
  rows.forEach(function (row) {
    var id = parseInt(String(row.tmdbId && row.tmdbId.value ? row.tmdbId.value : ""), 10);
    if (!id) return;
    var title = row.itemLabel && row.itemLabel.value ? row.itemLabel.value : "TV " + id;
    var year = row.year && row.year.value ? parseInt(row.year.value, 10) : "";
    batch.push({ id: id, title: title, year: year || "", poster: "", type: "tv" });
  });
  return batch;
}

async function expandMovies(existing) {
  var seen = {};
  existing.forEach(function (m) {
    if (m && m.id) seen[m.id] = true;
  });
  var added = 0;
  var decades = [
    [2020, 2026],
    [2010, 2019],
    [2000, 2009],
    [1990, 1999],
    [1980, 1989],
    [1970, 1979],
    [1960, 1969],
    [1950, 1959],
    [1900, 1949],
  ];
  for (var d = 0; d < decades.length; d++) {
    var range = decades[d];
    for (var offset = 0; offset < 2500; offset += 500) {
      process.stdout.write("movies " + range[0] + "-" + range[1] + " offset " + offset + "...");
      var batch = await wikidataBatch(offset, 500, range[0], range[1]);
      if (!batch.length) break;
      batch.forEach(function (m) {
        if (seen[m.id]) return;
        seen[m.id] = true;
        existing.push(m);
        added++;
      });
      process.stdout.write(" +" + batch.length + " (total " + existing.length + ")\n");
      if (existing.length % 500 < batch.length) {
        fs.writeFileSync(moviesPath, JSON.stringify(dedupeMovies(existing), null, 2) + "\n");
      }
      await new Promise(function (r) {
        setTimeout(r, 2500);
      });
      if (existing.length >= 10500) return added;
    }
  }
  return added;
}

async function expandTv(existing) {
  var seen = {};
  existing.forEach(function (m) {
    if (m && m.id) seen[m.id] = true;
  });
  var added = 0;
  for (var offset = 0; offset < 3000; offset += 500) {
    process.stdout.write("tv offset " + offset + "...");
    var batch = await wikidataTvBatch(offset, 500);
    if (!batch.length) break;
    batch.forEach(function (m) {
      if (seen[m.id]) return;
      seen[m.id] = true;
      existing.push(m);
      added++;
    });
    process.stdout.write(" +" + batch.length + " (total " + existing.length + ")\n");
    await new Promise(function (r) {
      setTimeout(r, 1200);
    });
  }
  return added;
}

async function main() {
  var movies = readJson(moviesPath, []);
  var tv = readJson(tvPath, []);
  console.log("Starting movies:", movies.length, "tv:", tv.length);
  var movieAdded = await expandMovies(movies);
  movies = dedupeMovies(movies);
  fs.writeFileSync(moviesPath, JSON.stringify(movies, null, 2) + "\n");
  console.log("Movies total:", movies.length, "new:", movieAdded);
  var tvAdded = await expandTv(tv);
  fs.writeFileSync(tvPath, JSON.stringify(tv, null, 2) + "\n");
  console.log("TV total:", tv.length, "new:", tvAdded);
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
