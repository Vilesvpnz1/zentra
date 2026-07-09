const https = require("https");

function get(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: opts.method || "GET",
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json, text/plain, */*",
          Referer: "https://www.raccoongame.com/wap/dist/",
          ...(opts.headers || {}),
        },
        timeout: 20000,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, data }));
      }
    );
    req.on("error", reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

const paths = [
  "/wap/game/list?page=1&pageSize=100",
  "/wap/game/list?pageNum=1&pageSize=100",
  "/wap/api/game/list?page=1&pageSize=100",
  "/wap/api/v1/game/list?page=1&pageSize=100",
  "/wap/api/game/page?page=1&size=100",
  "/wap/game/page?page=1&pageSize=100",
  "/wap/cloudgame/list",
  "/wap/cloudgame/gameList",
  "/wap/dist/gameList.json",
];

(async () => {
  for (const p of paths) {
    try {
      const r = await get("https://www.raccoongame.com" + p);
      const preview = r.data.slice(0, 250).replace(/\s+/g, " ");
      console.log(p, r.status, preview);
    } catch (e) {
      console.log(p, "err", e.message);
    }
  }
})();
