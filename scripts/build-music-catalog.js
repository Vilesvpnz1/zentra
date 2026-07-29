const fs = require("fs");
const path = require("path");
const https = require("https");

const root = path.join(__dirname, "..");
const musicPath = path.join(root, "music-catalog.json");

function fetchJson(url) {
  return new Promise(function (resolve, reject) {
    https
      .get(url, { headers: { "User-Agent": "Kobran/1.0", Accept: "application/json" } }, function (res) {
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

async function audius(pathname, params) {
  var qs = new URLSearchParams(params || {});
  qs.set("app_name", "Kobran");
  return fetchJson("https://discoveryprovider.audius.co/v1" + pathname + "?" + qs.toString());
}

async function main() {
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
    "EDM",
    "Dubstep",
    "Phonk",
    "Hyperpop",
    "Synthwave",
  ];
  var jobs = [];
  for (var page = 0; page < 80; page++) {
    jobs.push(audius("/tracks/trending", { limit: "100", offset: String(page * 100) }));
    jobs.push(audius("/tracks/trending/underground", { limit: "100", offset: String(page * 100) }));
  }
  genres.forEach(function (genre) {
    for (var g = 0; g < 8; g++) {
      jobs.push(audius("/tracks/trending", { limit: "50", genre: genre, offset: String(g * 50) }));
    }
  });
  var terms = [
    "love",
    "night",
    "beat",
    "remix",
    "mix",
    "2024",
    "2025",
    "2026",
    "chill",
    "party",
    "vibes",
    "rap",
    "drill",
    "house",
    "techno",
    "pop",
    "rock",
    "jazz",
    "soul",
    "funk",
    "acoustic",
    "live",
    "instrumental",
    "vocal",
    "summer",
    "winter",
    "drive",
    "workout",
    "study",
    "sleep",
  ];
  terms.forEach(function (term) {
    for (var t = 0; t < 10; t++) {
      jobs.push(audius("/tracks/search", { query: term, limit: "100", offset: String(t * 100), sortMethod: "popular" }));
    }
  });
  console.log("Audius jobs:", jobs.length);
  for (var i = 0; i < jobs.length; i += 40) {
    var slice = jobs.slice(i, i + 40);
    var results = await Promise.all(
      slice.map(function (j) {
        return j.catch(function () {
          return { data: [] };
        });
      })
    );
    results.forEach(function (payload) {
      if (payload && Array.isArray(payload.data)) merged = merged.concat(payload.data);
    });
    process.stdout.write("batch " + Math.min(i + 40, jobs.length) + "/" + jobs.length + " merged " + merged.length + "\n");
    await new Promise(function (r) {
      setTimeout(r, 300);
    });
  }
  merged = dedupeTracks(merged).slice(0, 12000);
  fs.writeFileSync(musicPath, JSON.stringify(merged, null, 2) + "\n");
  console.log("Music catalog tracks:", merged.length);
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
