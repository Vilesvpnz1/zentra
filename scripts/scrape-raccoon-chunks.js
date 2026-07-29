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
  const mapMatch = app.match(/\{"chunk-0051b4d6":"[^}]+\}/);
  const mapStr = app.match(/\{"chunk-[^"]+":"[a-f0-9]+"(?:,"chunk-[^"]+":"[a-f0-9]+")*\}/);
  if (!mapStr) {
    console.log("no chunk map");
    return;
  }
  const map = JSON.parse(mapStr[0]);
  console.log("chunks", Object.keys(map).length);

  const games = new Map();
  for (const [name, hash] of Object.entries(map)) {
    const url = "https://www.raccoongame.com/wap/dist/js/" + name + "." + hash + ".js";
    let body = "";
    try {
      body = await get(url);
    } catch (e) {
      continue;
    }
    const before = games.size;
    let m;
    const rePairs = [
      /"gid"\s*:\s*"?(\d{1,5})"?[\s\S]{0,180}?"(?:game_)?name"\s*:\s*"([^"]{2,120})"/gi,
      /"(?:game_)?name"\s*:\s*"([^"]{2,120})"[\s\S]{0,180}?"gid"\s*:\s*"?(\d{1,5})"?/gi,
      /gid[:=]"?(\d{1,5})"?[\s\S]{0,120}?name[:=]"([^"]{2,120})"/gi,
      /gamedetail\?gid=(\d{1,5})&name=([^"'&\\]{2,120})/gi,
      /game_id[:=]"?(\d{1,5})"?[\s\S]{0,120}?game_name[:=]"([^"]{2,120})"/gi,
    ];
    for (const re of rePairs) {
      re.lastIndex = 0;
      while ((m = re.exec(body))) {
        if (re.source.startsWith('"(?:game_)?name') || re.source.startsWith("name")) {
          games.set(m[2], m[1]);
        } else {
          const gid = m[1];
          let nameVal = m[2];
          try {
            nameVal = decodeURIComponent(nameVal);
          } catch (e) {}
          games.set(gid, nameVal);
        }
      }
    }
    const gids = [...new Set([...body.matchAll(/gid[=:"'\s]+(\d{1,5})/gi)].map((x) => x[1]))];
    if (games.size > before || gids.length > 30) {
      console.log(name, "size", body.length, "new", games.size - before, "gids", gids.length);
      if (gids.length > 50) {
        fs.writeFileSync(path.join(__dirname, "_chunk-" + name + ".js"), body);
      }
    }
  }

  const out = [...games.entries()].sort((a, b) => Number(a[0]) - Number(b[0]));
  fs.writeFileSync(path.join(__dirname, "_raccoon-games.json"), JSON.stringify(out, null, 2));
  console.log("found", out.length);
  console.log(out.slice(0, 50).map(([g, n]) => g + ":" + n).join("\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
