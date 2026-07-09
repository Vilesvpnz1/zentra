const fs = require("fs");
const path = require("path");

function extractObjects(text) {
  const start = text.indexOf("const G_DATA = [");
  const end = text.lastIndexOf("];");
  const body = text.slice(start + 15, end);
  const objs = [];
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
        objs.push(cur.trim());
        cur = "";
      }
      continue;
    }
    if (depth > 0) cur += ch;
  }
  return objs;
}

const ref = fs.readFileSync(
  path.join(__dirname, "../../zentra-push/Cine-Cloud-SRC-main/src/random/gamelayout.js"),
  "utf8"
);
const cur = fs.readFileSync(
  path.join(__dirname, "../Cine-Cloud-SRC-main/src/random/gamelayout.js"),
  "utf8"
);

const curGids = new Set([...cur.matchAll(/gid=(\d+)/g)].map((m) => m[1]));
const curIds = new Set([...cur.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]));

const missing = extractObjects(ref).filter((o) => {
  if (/\bpath\s*:/.test(o)) return false;
  const id = (o.match(/id:\s*'([^']+)'/) || [])[1];
  const gid = (o.match(/gid=(\d+)/) || [])[1];
  if (!id || !gid) return false;
  if (curIds.has(id) || curGids.has(gid)) return false;
  return true;
});

console.log("missing from zentra-push", missing.length);
if (missing.length) {
  const block = ",\n  " + missing.join(",\n  ");
  const out = cur.replace(/\r?\n\];[\s]*$/, block + "\n];");
  fs.writeFileSync(path.join(__dirname, "../Cine-Cloud-SRC-main/src/random/gamelayout.js"), out);
  const count = new Function(out + "\nreturn G_DATA.length;")();
  console.log("merged total", count);
}
