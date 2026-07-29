const https = require("https");
const fs = require("fs");
const path = require("path");

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json, text/plain, */*",
          Referer: "https://www.raccoongame.com/wap/dist/",
          Origin: "https://www.raccoongame.com",
        },
        timeout: 15000,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on("error", reject);
  });
}

async function probe(gid) {
  const paths = [
    `/wap/api/game/detail?gid=${gid}`,
    `/wap/api/v1/game/detail?gid=${gid}`,
    `/wap/game/detail?gid=${gid}`,
    `/wap/cloudgame/detail?gid=${gid}`,
    `/wap/api/cloudgame/detail?gid=${gid}`,
    `/wap/api/game/info?gid=${gid}`,
    `/wap/api/game/get?id=${gid}`,
  ];
  for (const p of paths) {
    try {
      const r = await get("https://www.raccoongame.com" + p);
      if (r.status === 200 && !r.body.includes("<!DOCTYPE") && r.body.length > 20) {
        return { path: p, status: r.status, body: r.body.slice(0, 400) };
      }
      if (r.status !== 404) {
        return { path: p, status: r.status, body: r.body.slice(0, 200) };
      }
    } catch (e) {}
  }
  return null;
}

async function main() {
  for (const gid of [1, 117, 241, 500, 1000]) {
    const hit = await probe(gid);
    console.log("gid", gid, hit ? JSON.stringify(hit) : "none");
  }

  const home = await get("https://www.raccoongame.com/");
  const apis = [...home.body.matchAll(/https?:\\\/\\\/[^"'\\]+|https?:\/\/[^"'\s]+|\/wap\/[a-zA-Z0-9_\/?\-=&%.]+/g)].map((m) => m[0]).slice(0, 50);
  console.log("home urls sample", apis.slice(0, 30).join("\n"));

  const dist = await get("https://www.raccoongame.com/wap/dist/");
  const scripts = [...dist.body.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]);
  fs.writeFileSync(path.join(__dirname, "_raccoon-dist.html"), dist.body);
  console.log("dist scripts", scripts);

  for (const rel of scripts) {
    const url = rel.startsWith("http") ? rel : "https://www.raccoongame.com/wap/dist/" + rel.replace(/^\//, "");
    const r = await get(url);
    const apiHits = [...new Set([...r.body.matchAll(/[/"'](\/?(?:wap|api)[^"'\\]{3,80})["']/g)].map((m) => m[1]))].slice(0, 40);
    if (apiHits.length) {
      console.log("apis in", url.split("/").pop(), apiHits.slice(0, 25).join(" | "));
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
