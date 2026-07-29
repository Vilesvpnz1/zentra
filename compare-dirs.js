const fs = require("fs");
const path = require("path");

function listGameDirs(base) {
  const out = [];
  const gf = path.join(base, "gameFiles");
  if (!fs.existsSync(gf)) return out;
  fs.readdirSync(gf).forEach(function (d) {
    if (fs.existsSync(path.join(gf, d, "index.html"))) out.push(d);
  });
  return out.sort();
}

const ROOT = path.join(__dirname);
const blox = listGameDirs(path.join(ROOT, "Bloxcraft-UBG-main"));
const krit = listGameDirs(path.join(ROOT, "kritikal-UBG-main"));
const kritSet = new Set(krit);
const onlyBlox = blox.filter((d) => !kritSet.has(d));
const onlyKrit = krit.filter((d) => !new Set(blox).has(d));

const rbBlox = [];
const rb = path.join(ROOT, "Bloxcraft-UBG-main", "refined-beta");
if (fs.existsSync(rb)) {
  fs.readdirSync(rb).forEach(function (d) {
    if (d === "index.html" || d === "landing") return;
    if (fs.existsSync(path.join(rb, d, "index.html"))) rbBlox.push(d);
  });
}

console.log(
  JSON.stringify(
    {
      bloxGameFiles: blox.length,
      kritGameFiles: krit.length,
      onlyInBloxcraft: onlyBlox,
      onlyInKobran: onlyKrit.length,
      refinedBetaBlox: rbBlox,
    },
    null,
    2
  )
);
