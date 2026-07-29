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
            "User-Agent": "Mozilla/5.0",
            Referer: "https://www.raccoongame.com/wap/dist/",
          },
          timeout: 60000,
        },
        (res) => {
          const chunks = [];
          res.on("data", (d) => chunks.push(d));
          res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        }
      )
      .on("error", reject);
  });
}

async function main() {
  const body = await get("https://www.raccoongame.com/wap/dist/js/app.9bb31945.js");
  fs.writeFileSync(path.join(__dirname, "_raccoon-app.js"), body);
  console.log("size", body.length);

  const apis = [
    ...new Set(
      [...body.matchAll(/["'`](\/?[a-zA-Z0-9_\-/.?=&%]{4,120})["'`]/g)]
        .map((m) => m[1])
        .filter((s) => /api|game|cloud|list|detail|page|store/i.test(s))
    ),
  ];
  console.log("paths", apis.slice(0, 100).join("\n"));

  const hosts = [
    ...new Set(
      [...body.matchAll(/https?:\\\/\\\/[a-zA-Z0-9.\-]+/g)].map((m) => m[0].replace(/\\\//g, "/"))
    ),
  ];
  console.log("hosts", hosts.join("\n"));

  const vendors = await get("https://www.raccoongame.com/wap/dist/js/chunk-vendors.35da38a2.js");
  fs.writeFileSync(path.join(__dirname, "_raccoon-vendors.js"), vendors.slice(0, 5000));
  const base = [...body.matchAll(/baseURL\s*[:=]\s*["']([^"']+)["']/g)].map((m) => m[1]);
  const axios = [...body.matchAll(/["'](https?:[^"']{10,120})["']/g)].map((m) => m[1]).filter((u) => /raccoon|jy|cloud|api/i.test(u));
  console.log("baseURL", base);
  console.log("urls", [...new Set(axios)].slice(0, 40).join("\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
