const https = require("https");
const fs = require("fs");
const path = require("path");

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "*/*",
            Referer: "https://www.raccoongame.com/wap/dist/",
          },
          timeout: 30000,
        },
        (res) => {
          let data = "";
          res.on("data", (c) => (data += c));
          res.on("end", () => resolve({ status: res.statusCode, body: data }));
        }
      )
      .on("error", reject);
  });
}

async function main() {
  const home = await get("https://www.raccoongame.com/wap/dist/");
  const scripts = [...home.body.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]);
  console.log("scripts", scripts.length);
  const games = new Map();
  for (const rel of scripts) {
    const url = rel.startsWith("http") ? rel : "https://www.raccoongame.com/wap/dist/" + rel.replace(/^\//, "");
    let r;
    try {
      r = await get(url);
    } catch (e) {
      continue;
    }
    if (r.status !== 200) continue;
    const body = r.body;
    let m;
    const re1 = /gid[:=]["']?(\d{1,5})["']?[^]{0,500}?name[:=]["']([^"']{2,120})["']/g;
    while ((m = re1.exec(body))) games.set(m[1], m[2]);
    const re2 = /name[:=]["']([^"']{2,120})["'][^]{0,500}?gid[:=]["']?(\d{1,5})["']?/g;
    while ((m = re2.exec(body))) games.set(m[2], m[1]);
    const re3 = /"gid"\s*:\s*"?(\d{1,5})"?\s*,\s*"name"\s*:\s*"([^"]{2,120})"/g;
    while ((m = re3.exec(body))) games.set(m[1], m[2]);
    const re4 = /"name"\s*:\s*"([^"]{2,120})"\s*,\s*"gid"\s*:\s*"?(\d{1,5})"?/g;
    while ((m = re4.exec(body))) games.set(m[2], m[1]);
    const re5 = /gamedetail\?gid=(\d{1,5})&name=([^"'&\\]{2,120})/g;
    while ((m = re5.exec(body))) {
      try {
        games.set(m[1], decodeURIComponent(m[2]));
      } catch (e) {
        games.set(m[1], m[2]);
      }
    }
    const gids = [...new Set([...body.matchAll(/gid[=:]["']?(\d{1,5})/gi)].map((x) => x[1]))];
    if (gids.length > 20) {
      console.log("chunk", url.split("/").pop(), "gids", gids.length, "size", body.length);
      fs.writeFileSync(path.join(__dirname, "_raccoon-chunk-" + url.split("/").pop() + ".txt"), body.slice(0, 200000));
    }
  }

  const endpoints = [
    "https://www.raccoongame.com/wap/game/list?page=1&pageSize=200",
    "https://www.raccoongame.com/wap/game/list?pageNum=1&pageSize=200",
    "https://www.raccoongame.com/wap/api/v1/game/list?page=1&pageSize=200",
    "https://www.raccoongame.com/wap/cloudgame/list?page=1&size=200",
    "https://www.raccoongame.com/wap/api/cloudgame/list?page=1&pageSize=200",
    "https://www.raccoongame.com/wap/api/game/hot",
    "https://www.raccoongame.com/wap/api/game/recommend",
  ];
  for (const url of endpoints) {
    try {
      const r = await get(url);
      console.log(url.replace("https://www.raccoongame.com", ""), r.status, r.body.slice(0, 180).replace(/\s+/g, " "));
      if (r.status === 200 && r.body.includes("gid")) {
        const matches = [...r.body.matchAll(/"gid"\s*:\s*"?(\d+)"?[^}]{0,200}?"name"\s*:\s*"([^"]+)"/g)];
        matches.forEach((m) => games.set(m[1], m[2]));
      }
    } catch (e) {
      console.log(url, e.message);
    }
  }

  const out = [...games.entries()].sort((a, b) => Number(a[0]) - Number(b[0]));
  fs.writeFileSync(path.join(__dirname, "_raccoon-games.json"), JSON.stringify(out, null, 2));
  console.log("found", out.length);
  console.log(out.slice(0, 40).map(([g, n]) => g + ":" + n).join("\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
