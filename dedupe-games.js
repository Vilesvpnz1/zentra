const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const GAMES_PATH = path.join(ROOT, "games.json");
const PACK_PREFIX = "kritikal-UBG-main/";

function normTitleKey(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/kobran\s*ubg\s*-?\s*/gi, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function normPathKey(gamePath) {
  const p = String(gamePath || "").toLowerCase().trim();
  if (!p) return "";
  return p.replace(/\/+$/, "");
}

function gameScore(game) {
  let score = 0;
  const p = String(game.path || "");
  if (p.startsWith(PACK_PREFIX)) score += 1000;
  else if (/^https?:\/\//i.test(p)) score += 100;
  const img = String(game.image || game.img || "");
  if (img && !img.endsWith(".svg")) score += 50;
  else if (img) score += 10;
  if (game.file) score += 5;
  if (p.length) score += Math.min(p.length, 200) / 200;
  return score;
}

function dedupeGames(games) {
  const sorted = games.slice().sort(function (a, b) {
    return gameScore(b) - gameScore(a);
  });
  const kept = [];
  const seenTitles = new Set();
  const seenPaths = new Set();
  sorted.forEach(function (game) {
    const tk = normTitleKey(game.title);
    const pk = normPathKey(game.path);
    if (tk && seenTitles.has(tk)) return;
    if (pk && seenPaths.has(pk)) return;
    if (tk) seenTitles.add(tk);
    if (pk) seenPaths.add(pk);
    kept.push(game);
  });
  kept.sort(function (a, b) {
    return a.title.localeCompare(b.title);
  });
  return kept;
}

const before = JSON.parse(fs.readFileSync(GAMES_PATH, "utf8"));
const after = dedupeGames(before);

fs.writeFileSync(GAMES_PATH, JSON.stringify(after, null, 2), "utf8");
fs.writeFileSync(
  path.join(ROOT, "games.js"),
  "window.KRITIKAL_GAMES=" + JSON.stringify(after) + ";",
  "utf8"
);

console.log(
  JSON.stringify({
    before: before.length,
    after: after.length,
    removed: before.length - after.length,
  })
);
