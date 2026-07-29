const fs = require("fs");
const path = require("path");

const gameFile = path.join(__dirname, "../Cine-Cloud-SRC-main/src/random/gamelayout.js");
const discovered = JSON.parse(fs.readFileSync(path.join(__dirname, "raccoon-discovered.json"), "utf8")).found;

function racUrl(name, gid) {
  return `https://www.raccoongame.com/wap/dist/#/platform/cloudgame/gamedetail?gid=${gid}&name=${encodeURIComponent(name)}`;
}

function steamImg(appId) {
  return `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900.jpg`;
}

function steamBg(appId) {
  return `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/library_hero.jpg`;
}

const meta = {
  260: { steam: 360170, dev: "Defiant Development", tags: ["Card Game", "RPG", "Indie", "Adventure"], desc: "Build a deck and fight through a dark fantasy world in this card-driven action RPG.", ach: 30 },
  263: { steam: 552990, dev: "Wargaming Group", tags: ["Naval", "Multiplayer", "Free to Play", "Simulation"], desc: "Command historic warships in large-scale free-to-play naval battles.", ach: 40 },
  277: { steam: 1174180, dev: "Rockstar Games", tags: ["Open World", "Western", "Story Rich", "Action"], desc: "Live the outlaw life in Rockstar's epic Western open-world adventure.", ach: 50 },
  288: { steam: 860510, dev: "Tarsier Studios", tags: ["Horror", "Puzzle", "Platformer", "Atmospheric"], desc: "Journey through a world distorted by horror with Mono and Six.", ach: 25 },
  312: { steam: 0, dev: "Bandai Namco", tags: ["Fighting", "Anime", "Action", "Single Player"], desc: "Battle as Ultraman in this classic tokusatsu fighting game.", ach: 20 },
  300: { steam: 476600, dev: "Sledgehammer Games", tags: ["FPS", "War", "Multiplayer", "Action"], desc: "Fight across the European theater in this World War II Call of Duty campaign and multiplayer.", ach: 40 },
  306: { steam: 324930, dev: "Wideload Games", tags: ["Zombie", "Comedy", "Action", "Adventure"], desc: "Play as Stubbs, a zombie out for revenge in this dark comedy action game.", ach: 25 },
  316: { steam: 323190, dev: "Telltale Games", tags: ["Adventure", "Story Rich", "Choices Matter", "Minecraft"], desc: "Experience an original Minecraft adventure from Telltale Games.", ach: 30 },
  318: { steam: 1386890, dev: "ATLUS", tags: ["Action", "RPG", "Anime", "Hack and Slash"], desc: "Join the Phantom Thieves in a stylish action RPG spin-off of Persona 5.", ach: 35 },
  329: { steam: 1112190, dev: "Ryu Ga Gotoku Studio", tags: ["Action", "Crime", "Story Rich", "Beat em up"], desc: "Play as Akiyama, Tanimura, Saejima, and Kiryu in this four-protagonist Yakuza saga.", ach: 40 },
  319: { steam: 229810, dev: "Beenox", tags: ["Action", "Open World", "Superhero", "Adventure"], desc: "Swing through New York as Spider-Man in this open-world superhero adventure.", ach: 35 },
  322: { steam: 787480, dev: "CAPCOM", tags: ["Adventure", "Visual Novel", "Mystery", "Anime"], desc: "Three classic Ace Attorney games in one definitive courtroom trilogy.", ach: 35 },
  422: { steam: 1196590, dev: "CAPCOM", tags: ["Horror", "Survival", "Action", "Single Player"], desc: "Survive the horrors of a remote European village in Resident Evil Village.", ach: 40 },
  404: { steam: 375350, dev: "PlatinumGames", tags: ["Action", "Hack and Slash", "Mechs", "Single Player"], desc: "Transform and fight as Autobots in this stylish PlatinumGames action title.", ach: 30 },
  409: { steam: 267530, dev: "Beenox", tags: ["Action", "Open World", "Superhero", "Adventure"], desc: "Take on new threats as Spider-Man in the sequel to The Amazing Spider-Man.", ach: 35 },
  438: { steam: 981890, dev: "Sega", tags: ["Sports", "Olympics", "Multiplayer", "Simulation"], desc: "Compete in official Olympic events from the Tokyo 2020 Games.", ach: 30 },
  447: { steam: 812140, dev: "Ubisoft Quebec", tags: ["Action", "RPG", "Open World", "Adventure"], desc: "Dive into Atlantis and uncover Isu secrets in this Assassin's Creed Odyssey expansion.", ach: 35 },
  452: { steam: 271590, dev: "Rockstar North", tags: ["Open World", "Action", "Crime", "Mod"], desc: "Grand Theft Auto V with community mods for an enhanced Los Santos experience.", ach: 40 },
  434: { steam: 690040, dev: "SUPERHOT Team", tags: ["FPS", "Indie", "Puzzle", "Action"], desc: "Time moves only when you move in this mind-bending SUPERHOT expansion.", ach: 25 },
  446: { steam: 227300, dev: "SCS Software", tags: ["Simulation", "Driving", "Relaxing", "Open World"], desc: "Drive across Europe as a trucker building your freight empire.", ach: 30 },
  456: { steam: 433550, dev: "Monomi Park", tags: ["Adventure", "Exploration", "Cute", "Indie"], desc: "Explore a colorful ranch and care for adorable slimes in a relaxed adventure.", ach: 25 },
  460: { steam: 261550, dev: "TaleWorlds Entertainment", tags: ["Strategy", "RPG", "Medieval", "Sandbox"], desc: "Lead armies, manage kingdoms, and carve your legend in Calradia.", ach: 40 },
  459: { steam: 1134100, dev: "Super Evil Megacorp", tags: ["Party", "Sports", "Multiplayer", "Casual"], desc: "Fling yourself across wild courses in this chaotic party sports game.", ach: 20 },
  560: { steam: 346110, dev: "Studio Wildcard", tags: ["Survival", "Dinosaurs", "Open World", "Multiplayer"], desc: "Tame dinosaurs, craft gear, and survive on a mysterious island.", ach: 40 },
  568: { steam: 1145360, dev: "Nintendo", tags: ["Adventure", "Open World", "Exploration", "Fantasy"], desc: "Explore Hyrule in an open-world adventure as Link awakens to save the kingdom.", ach: 45 },
  571: { steam: 12110, dev: "Rockstar North", tags: ["Open World", "Action", "Crime", "Classic"], desc: "Rise through Vice City's criminal underworld in the 1980s classic.", ach: 35 },
  558: { steam: 255710, dev: "Colossal Order", tags: ["City Builder", "Simulation", "Management", "Sandbox"], desc: "Build and manage the city of your dreams with deep simulation systems.", ach: 35 },
  570: { steam: 12120, dev: "Rockstar North", tags: ["Open World", "Action", "Crime", "Classic"], desc: "Return to San Andreas and carve out a criminal empire across three cities.", ach: 40 },
  569: { steam: 12100, dev: "DMA Design", tags: ["Open World", "Action", "Crime", "Classic"], desc: "The game that defined open-world crime, set in Liberty City.", ach: 30 },
  621: { steam: 1551360, dev: "Playground Games", tags: ["Racing", "Open World", "Driving", "Multiplayer"], desc: "Race across a stunning Mexico open world in Forza Horizon 5.", ach: 45 },
  600: { steam: 1174180, dev: "Rockstar Games", tags: ["Open World", "Western", "Story Rich", "Action"], desc: "An epic tale of outlaws Arthur Morgan and the Van der Linde gang.", ach: 50 },
  604: { steam: 1498570, dev: "SNK", tags: ["Fighting", "Multiplayer", "Competitive", "Anime"], desc: "The next chapter of the King of Fighters with modern online play.", ach: 35 },
  603: { steam: 1659040, dev: "IO Interactive", tags: ["Stealth", "Action", "Assassin", "Sandbox"], desc: "Travel the globe as Agent 47 and eliminate high-profile targets your way.", ach: 40 },
  618: { steam: 275850, dev: "Game Freak", tags: ["RPG", "Adventure", "Open World", "Pokemon"], desc: "Explore the Hisui region and discover Pokemon legends in a new open-world adventure.", ach: 40 },
  656: { steam: 1817070, dev: "Insomniac Games", tags: ["Action", "Open World", "Superhero", "Story Rich"], desc: "Swing through New York as Miles Morales in his own Spider-Man adventure.", ach: 40 },
  683: { steam: 814380, dev: "Bandai Namco", tags: ["Action", "Adventure", "Anime", "Open World"], desc: "Explore the One Piece world as Luffy in an open-world adventure.", ach: 35 },
  712: { steam: 1128000, dev: "Catobyte", tags: ["Co-op", "Party", "Platformer", "Multiplayer"], desc: "Chaotic co-op platforming as stretchy bunnies with friends.", ach: 20 },
  742: { steam: 1400980, dev: "Live Motion Games", tags: ["Simulation", "Building", "Casual", "Single Player"], desc: "Take on construction jobs and build everything from furniture to houses.", ach: 25 },
  749: { steam: 2050650, dev: "CAPCOM", tags: ["Horror", "Survival", "Action", "Remake"], desc: "Survive the nightmare in Leon Kennedy's Resident Evil 4 remake.", ach: 40 },
  801: { steam: 674940, dev: "Landfall", tags: ["Fighting", "Multiplayer", "Physics", "Party"], desc: "Battle friends in frantic physics-based stick-figure arena fights.", ach: 20 },
  827: { steam: 1902960, dev: "Remedy Entertainment", tags: ["Horror", "Action", "Story Rich", "Atmospheric"], desc: "Alan Wake returns in a dark, cinematic survival horror sequel.", ach: 40 },
};

const fallbackSteam = 271590;

function esc(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function cleanName(n) {
  return String(n)
    .replace(/（steam）/gi, "")
    .replace(/\(steam\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function translateName(n) {
  const c = cleanName(n);
  if (c === "海贼王：世界探索者") return "One Piece: World Seeker";
  return c;
}

function normalizeKey(n) {
  return translateName(n)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

let text = fs.readFileSync(gameFile, "utf8");
const existingGid = new Set([...text.matchAll(/gid=(\d+)/g)].map((m) => m[1]));
const existingNames = new Set(
  [...text.matchAll(/n:\s*"([^"]+)"/g)].map((m) => normalizeKey(m[1]))
);

const rm = { os: "Windows 10", cpu: "Intel Core i5", ram: "8 GB RAM", gpu: "GTX 1060" };
const rr = { os: "Windows 10", cpu: "Intel Core i7", ram: "16 GB RAM", gpu: "RTX 2060" };

const toAdd = [];
for (const g of discovered) {
  const gid = String(g.gid);
  if (existingGid.has(gid)) continue;
  const name = translateName(g.n);
  const key = normalizeKey(name);
  if (existingNames.has(key)) continue;
  if (key.includes("red dead redemption 2") && existingNames.has("red dead redemption 2")) continue;
  if (key.includes("euro truck") && [...existingNames].some((x) => x.includes("euro truck"))) continue;
  if (key.includes("hitman 3") && [...existingNames].some((x) => x.includes("hitman"))) continue;
  if (key.includes("ark survival") && [...existingNames].some((x) => x.includes("ark"))) continue;
  if (key.includes("little nightmares ii") && [...existingNames].some((x) => x.includes("little nightmares ii"))) continue;
  if (key.includes("resident evil village") && [...existingNames].some((x) => x.includes("resident evil village"))) continue;
  if (key.includes("resident evil 4") && [...existingNames].some((x) => x === "resident evil 4" || x.includes("resident evil 4"))) continue;
  if (key.includes("gta v") || key === "grand theft auto v") {
    if ([...existingNames].some((x) => x.includes("grand theft auto v") || x === "gta v")) continue;
  }

  const m = meta[g.gid] || { steam: fallbackSteam, dev: "Various", tags: ["Action", "Adventure", "Cloud", "Single Player"], desc: `Play ${name} on Raccoon cloud gaming.`, ach: 25 };
  const steam = m.steam || fallbackSteam;
  toAdd.push({
    id: gid,
    n: name,
    dev: m.dev,
    url: racUrl(name, g.gid),
    img: steamImg(steam),
    bg: steamBg(steam),
    ach: m.ach || 25,
    tags: m.tags,
    desc: m.desc,
    rm,
    rr,
  });
  existingNames.add(key);
  existingGid.add(gid);
}

function formatGame(g) {
  const tags = g.tags.map((t) => `"${esc(t)}"`).join(", ");
  return `  { 
    id: '${g.id}', 
    n: "${esc(g.n)}", 
    dev: "${esc(g.dev)}", 
    url: "${g.url}", 
    img: "${g.img}", 
    bg: "${g.bg}", 
    ach: ${g.ach}, 
    tags: [${tags}],
    desc: "${esc(g.desc)}",
    rm: { os: "${g.rm.os}", cpu: "${g.rm.cpu}", ram: "${g.rm.ram}", gpu: "${g.rm.gpu}" },
    rr: { os: "${g.rr.os}", cpu: "${g.rr.cpu}", ram: "${g.rr.ram}", gpu: "${g.rr.gpu}" }
  }`;
}

if (!toAdd.length) {
  console.log("nothing to add");
  process.exit(0);
}

const block = toAdd.map(formatGame).join(",\n");
text = text.replace(/\r?\n\];[\s]*$/, ",\n" + block + "\n];");
fs.writeFileSync(gameFile, text);

try {
  const count = new Function(text + "\nreturn G_DATA.length;")();
  console.log("added", toAdd.length, "total", count);
  console.log(toAdd.map((g) => g.id + " " + g.n).join("\n"));
} catch (e) {
  console.error("invalid", e.message);
  process.exit(1);
}
