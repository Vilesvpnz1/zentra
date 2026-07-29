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
  const app = fs.readFileSync(path.join(__dirname, "_raccoon-app.js"), "utf8");
  const mapStr = app.match(/\{"chunk-[^"]+":"[a-f0-9]+"(?:,"chunk-[^"]+":"[a-f0-9]+")*\}/);
  const map = JSON.parse(mapStr[0]);
  const hits = [];
  for (const [name, hash] of Object.entries(map)) {
    const url = "https://www.raccoongame.com/wap/dist/js/" + name + "." + hash + ".js";
    let body = "";
    try {
      body = await get(url);
    } catch (e) {
      continue;
    }
    const urls = [...body.matchAll(/https?:\\\/\\\/[a-zA-Z0-9.\-\/_%?=&]+|https?:\/\/[a-zA-Z0-9.\-\/_%?=&]+/g)].map((m) =>
      m[0].replace(/\\\//g, "/")
    );
    const apiish = [...new Set(urls)].filter((u) => /api|game|cloud|list|jy|sdk|store/i.test(u));
    const pathish = [...new Set([...body.matchAll(/["'](\/[a-zA-Z0-9_\-\/.?=&%]{6,100})["']/g)].map((m) => m[1]))].filter((p) =>
      /api|game|list|detail|cloud|page|hot|rank/i.test(p)
    );
    if (apiish.length || pathish.length > 3) {
      hits.push({ name, apiish: apiish.slice(0, 20), pathish: pathish.slice(0, 30) });
      console.log("\n==", name, "==");
      console.log("urls", apiish.slice(0, 15).join(" | "));
      console.log("paths", pathish.slice(0, 20).join(" | "));
    }
  }
  fs.writeFileSync(path.join(__dirname, "_raccoon-api-hits.json"), JSON.stringify(hits, null, 2));
  console.log("hit files", hits.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
