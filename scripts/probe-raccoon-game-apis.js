const https = require("https");
const fs = require("fs");
const path = require("path");

function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: Object.assign(
            {
              "User-Agent": "Mozilla/5.0",
              Accept: "application/json, text/plain, */*",
              Referer: "https://www.raccoongame.com/wap/dist/",
              Origin: "https://www.raccoongame.com",
            },
            headers
          ),
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

function post(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = typeof body === "string" ? body : JSON.stringify(body);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: "POST",
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
          Referer: "https://www.raccoongame.com/wap/dist/",
          Origin: "https://www.raccoongame.com",
        },
        timeout: 30000,
      },
      (res) => {
        let out = "";
        res.on("data", (c) => (out += c));
        res.on("end", () => resolve({ status: res.statusCode, body: out }));
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const endpoints = [
    "/api/member/channelCardList",
    "/api/handleList",
    "/game/noticeBoard",
    "/api/game/list",
    "/api/game/hot",
    "/api/game/rank",
    "/api/game/new",
    "/api/cloudgame/list",
    "/api/cloudgame/hot",
    "/api/cloudgame/index",
    "/api/store/list",
    "/api/store/games",
    "/jyapi/gameList",
    "/jyapi/hotGame",
    "/userGame/list",
    "/api/userGame/list",
  ];

  for (const p of endpoints) {
    try {
      const r = await get("https://www.raccoongame.com" + p);
      console.log("GET", p, r.status, r.body.slice(0, 220).replace(/\s+/g, " "));
    } catch (e) {
      console.log("GET", p, e.message);
    }
  }

  for (const p of ["/api/member/channelCardList", "/api/handleList", "/api/game/list", "/api/cloudgame/list"]) {
    try {
      const r = await post("https://www.raccoongame.com" + p, { page: 1, pageSize: 100, pageNum: 1, size: 100 });
      console.log("POST", p, r.status, r.body.slice(0, 220).replace(/\s+/g, " "));
    } catch (e) {
      console.log("POST", p, e.message);
    }
  }

  const app = fs.readFileSync(path.join(__dirname, "_raccoon-app.js"), "utf8");
  const map = JSON.parse(app.match(/\{"chunk-[^"]+":"[a-f0-9]+"(?:,"chunk-[^"]+":"[a-f0-9]+")*\}/)[0]);
  for (const key of ["chunk-74f58632", "chunk-3d4dc49f", "chunk-85bfe1b4", "chunk-async"]) {
    if (!map[key]) continue;
    const body = await get("https://www.raccoongame.com/wap/dist/js/" + key + "." + map[key] + ".js");
    fs.writeFileSync(path.join(__dirname, "_" + key + ".js"), body);
    const apis = [...new Set([...body.matchAll(/["'](\/[a-zA-Z0-9_\/.?=&%-]{5,80})["']/g)].map((m) => m[1]))].filter((p) =>
      /api|game|list|hot|rank|store|channel|card|page/i.test(p)
    );
    console.log(key, "apis", apis.join(" | "));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
