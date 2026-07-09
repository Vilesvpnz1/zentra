const fs = require("fs");
const path = require("path");

const gameFile = path.join(__dirname, "../Cine-Cloud-SRC-main/src/random/gamelayout.js");
let text = fs.readFileSync(gameFile, "utf8");

const start = text.indexOf("const G_DATA = [");
if (start < 0) throw new Error("G_DATA not found");
const end = text.lastIndexOf("];");
const head = text.slice(0, start + "const G_DATA = [".length);
const tail = text.slice(end);
const body = text.slice(start + "const G_DATA = [".length, end);

const kept = [];
let depth = 0;
let cur = "";
let inStr = false;
let esc = false;
let quote = "";

for (let i = 0; i < body.length; i++) {
  const ch = body[i];
  if (inStr) {
    cur += ch;
    if (esc) esc = false;
    else if (ch === "\\") esc = true;
    else if (ch === quote) inStr = false;
    continue;
  }
  if (ch === '"' || ch === "'") {
    inStr = true;
    quote = ch;
    cur += ch;
    continue;
  }
  if (ch === "{") {
    if (depth === 0) cur = "{";
    else cur += ch;
    depth++;
    continue;
  }
  if (ch === "}") {
    cur += ch;
    depth--;
    if (depth === 0) {
      if (!/\bpath\s*:/.test(cur)) kept.push(cur.trim());
      cur = "";
    }
    continue;
  }
  if (depth > 0) cur += ch;
}

const out = head + "\n  " + kept.join(",\n  ") + "\n" + tail;
fs.writeFileSync(gameFile, out);

const count = new Function(out + "\nreturn G_DATA.length;")();
console.log("removed", 411 - count, "local games, total", count);
