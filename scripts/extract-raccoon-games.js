const fs = require("fs");
const path = require("path");

const ref = fs.readFileSync(
  path.join(__dirname, "../../zentra-push/Cine-Cloud-SRC-main/src/random/gamelayout.js"),
  "utf8"
);
const cur = fs.readFileSync(
  path.join(__dirname, "../Cine-Cloud-SRC-main/src/random/gamelayout.js"),
  "utf8"
);

const curIds = new Set([...cur.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]));
const want = new Set([
  "209", "1015", "996", "974", "1022", "890", "676", "602", "458", "305",
  "1023", "987", "982", "976", "201", "96", "735", "943", "196", "50",
]);

const start = ref.indexOf("const G_DATA = [");
const end = ref.lastIndexOf("];");
const body = ref.slice(start + 15, end);

const objs = [];
let depth = 0;
let curObj = "";
let inStr = false;
let esc = false;
let quote = "";

for (let i = 0; i < body.length; i++) {
  const ch = body[i];
  if (inStr) {
    curObj += ch;
    if (esc) esc = false;
    else if (ch === "\\") esc = true;
    else if (ch === quote) inStr = false;
    continue;
  }
  if (ch === '"' || ch === "'") {
    inStr = true;
    quote = ch;
    curObj += ch;
    continue;
  }
  if (ch === "{") {
    if (depth === 0) curObj = "{";
    else curObj += ch;
    depth++;
    continue;
  }
  if (ch === "}") {
    curObj += ch;
    depth--;
    if (depth === 0) {
      const id = (curObj.match(/id:\s*'([^']+)'/) || [])[1];
      if (id && want.has(id) && !curIds.has(id)) objs.push(curObj.trim());
      curObj = "";
    }
    continue;
  }
  if (depth > 0) curObj += ch;
}

const out = ",\n  " + objs.join(",\n  ");
fs.writeFileSync(path.join(__dirname, "../Cine-Cloud-SRC-main/src/_new-games-snippet.js"), out);
console.log("extracted", objs.length);
