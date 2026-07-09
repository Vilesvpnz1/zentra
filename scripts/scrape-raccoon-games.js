const https = require("https");
const fs = require("fs");
const path = require("path");

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 30000 }, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

async function main() {
  const home = await get("https://www.raccoongame.com/wap/dist/");
  const scripts = [...home.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]);
  const games = new Map();
  for (const rel of scripts) {
    const url = rel.startsWith("http") ? rel : "https://www.raccoongame.com/wap/dist/" + rel.replace(/^\//, "");
    let data = "";
    try {
      data = await get(url);
    } catch {
      continue;
    }
    const re = /gid[:=]["']?(\d{1,5})["']?[^}]{0,400}?name[:=]["']([^"']{2,120})["']/g;
    let m;
    while ((m = re.exec(data))) games.set(m[1], m[2]);
    const re2 = /name[:=]["']([^"']{2,120})["'][^}]{0,400}?gid[:=]["']?(\d{1,5})["']?/g;
    while ((m = re2.exec(data))) games.set(m[2], m[1]);
    const re3 = /gameId[:=]["']?(\d{1,5})["']?[^}]{0,400}?gameName[:=]["']([^"']{2,120})["']/g;
    while ((m = re3.exec(data))) games.set(m[1], m[2]);
  }
  const out = [...games.entries()].sort((a, b) => Number(a[0]) - Number(b[0]));
  fs.writeFileSync(path.join(__dirname, "_raccoon-games.json"), JSON.stringify(out, null, 2));
  console.log("found", out.length);
  console.log(out.slice(0, 20).map(([g, n]) => g + ":" + n).join("\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
