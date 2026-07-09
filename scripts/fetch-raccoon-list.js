const https = require("https");
const fs = require("fs");
const path = require("path");

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 20000 }, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, data, headers: res.headers }));
      })
      .on("error", reject);
  });
}

async function main() {
  const endpoints = [
    "https://www.raccoongame.com/wap/game/list",
    "https://www.raccoongame.com/wap/api/v1/game/list",
    "https://www.raccoongame.com/wap/api/game/list",
    "https://www.raccoongame.com/api/v1/games",
    "https://www.raccoongame.com/wap/dist/gameList.json",
  ];
  for (const url of endpoints) {
    try {
      const r = await get(url);
      console.log(url, r.status, r.data.slice(0, 300).replace(/\s+/g, " "));
    } catch (e) {
      console.log(url, "err", e.message);
    }
  }
  const home = await get("https://www.raccoongame.com/wap/dist/");
  const scripts = [...home.data.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]);
  console.log("script count", scripts.length);
  for (const rel of scripts) {
    const url = rel.startsWith("http") ? rel : "https://www.raccoongame.com/wap/dist/" + rel.replace(/^\//, "");
    try {
      const r = await get(url);
      if (!r.data.includes("gid")) continue;
      const names = [...r.data.matchAll(/name:\s*["']([^"']{3,60})["']/g)].map((m) => m[1]);
      const gids = [...new Set([...r.data.matchAll(/gid[=:]["']?(\d{1,5})/g)].map((m) => m[1]))];
      if (gids.length > 8) {
        console.log("HIT", url.split("/").pop(), "gids", gids.length, "sample", gids.slice(0, 15).join(","));
        fs.writeFileSync(path.join(__dirname, "_raccoon-chunk.txt"), r.data.slice(0, 50000));
      }
    } catch (e) {}
  }
}

main();
