const fs = require("fs");
const path = require("path");

const t = fs.readFileSync(
  path.join(__dirname, "../Cine-Cloud-SRC-main/src/random/gamelayout.js"),
  "utf8"
);
const have = new Set([...t.matchAll(/gid=(\d+)/g)].map((m) => m[1]));

const found = [
  { gid: 2, n: "Hollow Knight" },
  { gid: 3, n: "Transformers: Rise of the Dark Spark" },
  { gid: 4, n: "Final Fantasy XIII" },
  { gid: 5, n: "PES 2017" },
  { gid: 6, n: "Dead Cells" },
  { gid: 7, n: "Devil May Cry 4" },
  { gid: 10, n: "Baldur's Gate 3" },
  { gid: 13, n: "Naruto Shippuden: Ultimate Ninja Storm 4" },
  { gid: 17, n: "American Fugitive" },
  { gid: 18, n: "How to Train Your Dragon: Dawn of New Riders" },
  { gid: 21, n: "FINAL FANTASY VII REMAKE INTERGRADE" },
  { gid: 24, n: "Devil May Cry 5" },
  { gid: 25, n: "Resident Evil 2: Remake" },
  { gid: 30, n: "Assassin's Creed: Odyssey" },
  { gid: 31, n: "For The King" },
  { gid: 32, n: "Dragon Ball Z: Kakarot" },
  { gid: 37, n: "Ori and the Blind Forest" },
  { gid: 38, n: "NieR:Automata" },
  { gid: 40, n: "Terminator: Resistance" },
  { gid: 41, n: "Witchers 3" },
  { gid: 43, n: "Ace Combat 7: Skies Unknown" },
  { gid: 47, n: "Hades" },
  { gid: 48, n: "Doraemon: Story of Seasons" },
  { gid: 49, n: "Ori and the Will of the Wisps" },
  { gid: 50, n: "One Piece: Burning Blood" },
  { gid: 52, n: "Wizard of Legend" },
  { gid: 54, n: "Katana ZERO" },
  { gid: 56, n: "Rise of the Tomb Raider" },
  { gid: 57, n: "Untitled Goose Game" },
  { gid: 62, n: "What Remains of Edith Finch" },
  { gid: 66, n: "Cuphead" },
  { gid: 74, n: "Watch Dogs 2" },
  { gid: 78, n: "Titanfall 2" },
  { gid: 83, n: "Resident Evil 7: Biohazard" },
  { gid: 85, n: "Forager" },
  { gid: 87, n: "Bloodstained: Ritual of the Night" },
  { gid: 89, n: "Curse of the Dead Gods" },
  { gid: 96, n: "Attack On Titan2" },
  { gid: 98, n: "Sekiro: Shadows Die Twice" },
  { gid: 100, n: "Stardew Valley" },
  { gid: 102, n: "Resident Evil: Revelations 2" },
  { gid: 104, n: "Tom Clancy's Ghost Recon Wildlands" },
  { gid: 106, n: "Far Cry New Dawn" },
  { gid: 109, n: "Batman: Arkham Knight" },
  { gid: 111, n: "Batman: Arkham Origins" },
  { gid: 117, n: "Cyberpunk 2077" },
  { gid: 118, n: "COD6 Modern Warfare" },
  { gid: 126, n: "Far Cry 3" },
  { gid: 127, n: "Mirror's Edge Catalyst" },
  { gid: 135, n: "Far Cry Primal" },
  { gid: 159, n: "Off-Road Heroes 4" },
  { gid: 192, n: "Boomerang Fu" },
  { gid: 196, n: "Overcooked 2" },
  { gid: 201, n: "ONE PIECE: PIRATE WARRIORS 4" },
  { gid: 207, n: "Mafia: Definitive Edition" },
  { gid: 217, n: "Little Nightmares" },
  { gid: 232, n: "The Past Room" },
];

const miss = found.filter((g) => !have.has(String(g.gid)));
console.log("missing", miss.length);
miss.forEach((g) => console.log(g.gid, g.n));
console.log("total", new Function(t + "\nreturn G_DATA.length;")());
console.log("unique gids", have.size);
