const fs = require("fs");
const path = require("path");
const https = require("https");

const root = path.join(__dirname, "Offline-HTML-Games-Pack-master", "offline", "tunnelace");
const base = "https://cdn-factory.marketjs.com/en/tunnel-ace/";

function fetch(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetch(new URL(res.headers.location, url).href).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(String(res.statusCode)));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

function save(rel, buf) {
  const out = path.join(root, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buf);
}

function exists(rel) {
  const out = path.join(root, rel);
  return fs.existsSync(out) && fs.statSync(out).size > 0;
}

async function download(rel) {
  if (exists(rel)) return true;
  try {
    save(rel, await fetch(base + rel));
    console.log("saved", rel);
    return true;
  } catch {
    return false;
  }
}

(async () => {
  const js = fs.readFileSync(path.join(root, "game.js"), "utf8");
  const must = [
    "media/babylon/scene.babylon",
    "media/graphics/loading/loader.svg",
    "media/fonts/ibmplexmono-regular.woff",
    "media/fonts/ibmplexmono-regular.ttf",
    "media/fonts/ibmplexmono-bold.woff",
    "media/fonts/ibmplexmono-bold.ttf",
  ];
  for (const rel of must) await download(rel);

  const audioNames = new Set();
  for (const m of js.matchAll(/media\/audio\/[a-zA-Z0-9_/-]+\.mp3/g)) audioNames.add(m[0]);
  for (const m of js.matchAll(/path['"]:\s*['"]([a-zA-Z0-9_/-]{1,48})['"]/g)) {
    const name = m[1];
    if (!name.includes("/") && !name.includes(".")) continue;
    if (name.startsWith("media/")) audioNames.add(name + ".mp3");
    else audioNames.add("media/audio/" + name + ".mp3");
  }
  const chunk = js.slice(js.length - 800000);
  for (const m of chunk.matchAll(/['"]([a-z0-9_-]{2,32})['"]/gi)) {
    const n = m[1];
    if (/^(bgm|sfx|music|sound|click|tap|coin|explode|game|menu|win|lose|hit|whoosh)/i.test(n)) {
      audioNames.add("media/audio/" + n + ".mp3");
      audioNames.add("media/audio/" + n + ".ogg");
    }
  }
  for (const rel of audioNames) await download(rel);

  const commonAudio = [
    "media/audio/bgm.mp3",
    "media/audio/bgm.ogg",
    "media/audio/music.mp3",
    "media/audio/game.mp3",
    "media/audio/sfx-explosion.mp3",
    "media/audio/sfx-coin.mp3",
    "media/audio/sfx-click.mp3",
    "media/audio/sfx-tap.mp3",
    "media/audio/sfx-crash.mp3",
    "media/audio/sfx-score.mp3",
    "media/audio/sfx-powerup.mp3",
  ];
  for (const rel of commonAudio) await download(rel);

  console.log("scene size", fs.statSync(path.join(root, "media/babylon/scene.babylon")).size);
})();
