function safeDecode(value) {
  const raw = String(value || "");
  try {
    return decodeURIComponent(raw);
  } catch (e) {
    return raw;
  }
}

function slugDash(id) {
  return String(id)
    .replace(/([a-z])(\d)/g, "$1-$2")
    .replace(/(\d)([a-z])/g, "$1-$2")
    .replace(/_/g, "-")
    .replace(/\./g, "-");
}

function cleanKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function repoBase(path) {
  const m = String(path || "").match(/^(https:\/\/cdn\.jsdelivr\.net\/gh\/[^/]+\/[^@]+@[^/]+\/)/i);
  return m ? m[1] : "";
}

function resolveCoverUrls(game) {
  try {
    return resolveCoverUrlsInner(game);
  } catch (e) {
    return [];
  }
}

function resolveCoverUrlsInner(game) {
  const urls = [];
  const gamePath = String((game && game.path) || "");
  const id = String((game && game.id) || "");
  const title = String((game && game.title) || "");
  const image = String((game && game.image) || "");

  if (/^https?:\/\//i.test(image)) urls.push(image);

  let m = gamePath.match(/LupineVault@[^/]+\/assets\/games\/([^/]+)\//i);
  if (m) {
    const slug = safeDecode(m[1]);
    urls.push(
      "https://cdn.jsdelivr.net/gh/tharun9772/LupineVault@main/assets/images/games/tile/" +
        encodeURIComponent(slug) +
        ".png"
    );
    if (title) {
      urls.push(
        "https://cdn.jsdelivr.net/gh/tharun9772/LupineVault@main/assets/images/games/tile/" +
          encodeURIComponent(title) +
          ".png"
      );
    }
  }

  m = gamePath.match(/ChickenKingsVault@[^/]+\/gamefiles\/([^/?#]+)\.html/i);
  if (m) {
    const base = m[1].replace(/\.html?$/i, "");
    const root = "https://cdn.jsdelivr.net/gh/carbonicality/ChickenKingsVault@main/gameimages/";
    urls.push(root + base + ".png", root + base + ".jpg", root + base + ".webp");
  }

  m = gamePath.match(/elite-gamez\.github\.io@[^/]+\/g\/([^/?#]+)\.html/i);
  if (m) {
    const root = repoBase(gamePath) || "https://cdn.jsdelivr.net/gh/elite-gamez/elite-gamez.github.io@main/";
    const htmlName = safeDecode(m[1].replace(/\.html?$/i, ""));
    const keys = [cleanKey(title), cleanKey(htmlName), cleanKey(id)];
    keys.forEach(function (key) {
      if (!key) return;
      urls.push(root + "images/" + key + ".jpg");
      urls.push(root + "images/" + key + ".png");
      urls.push(root + "images/" + key + ".webp");
    });
  }

  m = gamePath.match(/hydra-assets@[^/]+\/gmes\/([^/?#]+)\.html/i);
  if (m) {
    const base = m[1].replace(/\.html?$/i, "");
    const root = "https://cdn.jsdelivr.net/gh/Hydra-Network/hydra-assets@main/";
    urls.push(root + "thumbs/" + base + ".png", root + "thumbs/" + base + ".jpg", root + "images/" + base + ".png");
  }

  m = gamePath.match(/freebuisness\/html@[^/]+\/(\d+)/i);
  if (m) urls.push("https://cdn.jsdelivr.net/gh/freebuisness/covers@main/" + m[1] + ".png");
  m = gamePath.match(/freebuisness\/html@[^/]+\/([^/?#]+)\.html/i);
  if (m && m[1]) urls.push("https://cdn.jsdelivr.net/gh/freebuisness/covers@main/" + m[1] + ".png");

  m = gamePath.match(/google-class-files@[^/]+\/(.+\.html)$/i);
  if (m) {
    const root = repoBase(gamePath);
    const rel = m[1].replace(/\.html?$/i, "");
    if (root) urls.push(root + rel + ".png", root + rel + ".jpg", root + "images/" + rel.split("/").pop() + ".png");
  }

  m = gamePath.match(/game-assets[^/]*\/([^/]+)\/index\.html/i);
  if (m) {
    const root = gamePath.replace(/\/[^/]+$/, "/");
    urls.push(root + "thumb.jpg", root + "splash.png", root + "icon.png", root + "logo.png");
  }

  m = gamePath.match(/3kh0-assets\/main\/([^/]+)\/index\.html/i);
  if (m) {
    urls.push("https://raw.githack.com/tharun9772/3kh0-assets/main/" + m[1] + "/splash.png");
  }

  m = gamePath.match(/3kh0-lite\/main\/([^/?#]+)$/i);
  if (m) {
    const root = "https://raw.githack.com/3kh0/3kh0-lite/main/";
    const rel = m[1];
    urls.push(root + rel.replace(/\.html?$/i, ".png"), root + "img/" + rel.split("/").pop().replace(/\.html?$/i, ".png"));
  }

  m = gamePath.match(/truffled\.lol\/([^/?#]+)/i);
  if (m) {
    const slug = m[1].replace(/\.html?$/i, "");
    urls.push("https://cdn.jsdelivr.net/gh/aukak/truffled@main/public/png/games/" + slug + ".png");
  }

  m = gamePath.match(/tharun9772\/(ugs-[123])@main\/([^/?#]+\.html)/i);
  if (m) {
    urls.push("https://cdn.jsdelivr.net/gh/tharun9772/game-assets@main/5968517.png");
  }

  m = gamePath.match(/alexrsworld@[^/]+\/(.+\.html)$/i);
  if (m) {
    const root = repoBase(gamePath);
    const file = m[1].replace(/\.html?$/i, "");
    if (root) {
      urls.push(root + "img/" + file + ".png", root + "img/" + file + ".jpg", root + "images/" + file + ".png");
    }
  }

  m = gamePath.match(/dskjfoisjfsjio\/Standalone-games@[^/]+\/([^/?#]+\.html)/i);
  if (m) {
    const root = repoBase(gamePath);
    const file = m[1].replace(/\.html?$/i, "");
    if (root) urls.push(root + file + ".png", root + "images/" + file + ".png");
  }

  m = gamePath.match(/bloxcraft-st\/google-class-files@[^/]+\/([^/?#]+\.html)/i);
  if (m) {
    const root = repoBase(gamePath);
    const file = m[1].replace(/\.html?$/i, "");
    if (root) urls.push(root + file + ".png", root + "images/" + file.split("/").pop().replace(/\.html?$/i, "") + ".png");
  }

  if (title) {
    const enc = encodeURIComponent(title);
    m = gamePath.match(/LupineVault@[^/]+\//i);
    if (m && !urls.some(function (u) {
      return u.indexOf("/assets/images/games/tile/") !== -1;
    })) {
      urls.push("https://cdn.jsdelivr.net/gh/tharun9772/LupineVault@main/assets/images/games/tile/" + enc + ".png");
    }
  }

  if (/^https?:\/\//i.test(gamePath)) {
    const dir = gamePath.replace(/\/[^/]*$/, "/");
    const file = gamePath.split("/").pop().replace(/\.html?$/i, "");
    urls.push(
      dir + "cover.png",
      dir + "icon.png",
      dir + "logo.png",
      dir + "splash.png",
      dir + "thumb.png",
      dir + "thumbnail.png",
      dir + file + ".png",
      dir + file + ".jpg",
      dir + "assets/icon.png",
      dir + "assets/logo.png"
    );
  }

  if (id) {
    urls.push(
      "https://cdn.jsdelivr.net/gh/freebuisness/covers@main/" + id.replace(/^gn/i, "") + ".png",
      "https://cdn.jsdelivr.net/gh/freebuisness/covers@main/" + id + ".png"
    );
  }

  return [...new Set(urls.filter(Boolean))];
}

function pickCoverUrl(game) {
  try {
    const urls = resolveCoverUrlsInner(game);
    return urls[0] || "";
  } catch (e) {
    return "";
  }
}

module.exports = {
  slugDash: slugDash,
  resolveCoverUrls: resolveCoverUrls,
  pickCoverUrl: pickCoverUrl,
};
