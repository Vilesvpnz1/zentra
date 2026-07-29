const https = require("https");
const fs = require("fs");
const path = require("path");

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 60000 }, (res) => {
        const chunks = [];
        res.on("data", (d) => chunks.push(d));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      })
      .on("error", reject);
  });
}

async function main() {
  for (const f of ["commonfun.js", "jy.js", "user.js", "jysdk-cloudgame-h5.min.js", "chat.js"]) {
    const b = await get("https://www.raccoongame.com/wap/dist/js/" + f);
    fs.writeFileSync(path.join(__dirname, "_" + f), b);
    const urls = [
      ...new Set(
        [...b.matchAll(/https?:\\\/\\\/[^"'\\]+|https?:\/\/[^"'\s]+/g)].map((m) => m[0].replace(/\\\//g, "/"))
      ),
    ];
    console.log(f, "len", b.length, "urls", urls.slice(0, 25).join(" | "));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
