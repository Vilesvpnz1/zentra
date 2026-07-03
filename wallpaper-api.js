var CURATED_WALLPAPERS = [
  {
    id: "samurai-bloom",
    label: "Samurai Bloom",
    url: "https://i.redd.it/tacuww7vhvaf1.jpeg",
    thumb: "https://i.redd.it/tacuww7vhvaf1.jpeg",
  },
  {
    id: "alien-ridge",
    label: "Alien Ridge",
    url: "https://images2.alphacoders.com/783/783391.png",
    thumb: "https://images2.alphacoders.com/783/783391.png",
  },
  {
    id: "moon-lake",
    label: "Moon Lake",
    url: "https://www.designyourway.net/blog/wp-content/uploads/2018/01/3d-Desktop-Backgrounds.jpg",
    thumb: "https://www.designyourway.net/blog/wp-content/uploads/2018/01/3d-Desktop-Backgrounds.jpg",
  },
  {
    id: "neon-city",
    label: "Neon City",
    url: "https://wallpaperaccess.com/full/627165.jpg",
    thumb: "https://wallpaperaccess.com/full/627165.jpg",
  },
];

function attachWallpaperApi(app, helpers) {
  var httpsFetchJson = helpers.httpsFetchJson;
  var pexelsKey = String(process.env.PEXELS_API_KEY || "").trim();
  var PAGE_SIZE = 20;

  function normalizeImageUrl(url) {
    var u = String(url || "").trim();
    if (!u) return "";
    if (/^http:\/\//i.test(u)) u = "https://" + u.slice(7);
    return /^https:\/\//i.test(u) ? u : "";
  }

  function mapOpenverse(items) {
    return (items || [])
      .map(function (item) {
        var url = normalizeImageUrl(item && item.url);
        if (!url) return null;
        var thumb = normalizeImageUrl(item.thumbnail) || url;
        return {
          id: String(item.id || url),
          label: String(item.title || "Wallpaper").slice(0, 80),
          url: url,
          thumb: thumb,
          width: item.width || 0,
          height: item.height || 0,
          source: "openverse",
        };
      })
      .filter(Boolean);
  }

  function mapPexels(items) {
    return (items || [])
      .filter(function (photo) {
        return photo && photo.src && (photo.src.large2x || photo.src.large || photo.src.original);
      })
      .map(function (photo) {
        return {
          id: "pexels-" + String(photo.id),
          label: String(photo.alt || "Wallpaper").slice(0, 80),
          url: photo.src.large2x || photo.src.large || photo.src.original,
          thumb: photo.src.medium || photo.src.small || photo.src.large2x,
          width: photo.width || 0,
          height: photo.height || 0,
          source: "pexels",
        };
      });
  }

  function openverseUrl(q, page, wide) {
    var url =
      "https://api.openverse.org/v1/images/?q=" +
      encodeURIComponent(q) +
      "&page=" +
      page +
      "&page_size=" +
      PAGE_SIZE;
    if (wide) url += "&aspect_ratio=wide";
    return url;
  }

  function searchOpenverse(q, page, wide) {
    wide = wide !== false;
    return httpsFetchJson(openverseUrl(q, page, wide)).then(function (data) {
      var items = mapOpenverse(data && data.results);
      if (!items.length && wide) {
        return searchOpenverse(q, page, false);
      }
      return {
        items: items,
        page: data && data.page ? data.page : page,
        total: data && data.result_count ? data.result_count : items.length,
        provider: "openverse",
      };
    });
  }

  function searchPexels(q, page) {
    var url =
      "https://api.pexels.com/v1/search?query=" +
      encodeURIComponent(q) +
      "&per_page=" +
      PAGE_SIZE +
      "&page=" +
      page +
      "&orientation=landscape";
    return new Promise(function (resolve, reject) {
      var https = require("https");
      var parsed = new URL(url);
      var req = https.request(
        parsed,
        {
          method: "GET",
          headers: {
            Authorization: pexelsKey,
            "User-Agent": "Zentra/1.0",
          },
        },
        function (res) {
          var chunks = [];
          res.on("data", function (chunk) {
            chunks.push(chunk);
          });
          res.on("end", function () {
            try {
              var data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
              if (res.statusCode >= 400) {
                reject(new Error((data && data.error) || "Pexels error"));
                return;
              }
              resolve({
                items: mapPexels(data && data.photos),
                page: data && data.page ? data.page : page,
                total: data && data.total_results ? data.total_results : 0,
                provider: "pexels",
              });
            } catch (e) {
              reject(e);
            }
          });
        }
      );
      req.on("error", reject);
      req.end();
    });
  }

  function runSearch(q, page) {
    if (pexelsKey) {
      return searchPexels(q, page).catch(function () {
        return searchOpenverse(q, page, true);
      });
    }
    return searchOpenverse(q, page, true);
  }

  app.get("/api/wallpapers/curated", function (req, res) {
    res.json({ items: CURATED_WALLPAPERS });
  });

  var SURPRISE_TAGS = ["nature", "city", "space", "anime", "mountains", "ocean", "neon", "forest", "sunset"];

  app.get("/api/wallpapers/surprise", function (req, res) {
    var tag = SURPRISE_TAGS[Math.floor(Math.random() * SURPRISE_TAGS.length)];
    var page = Math.floor(Math.random() * 4) + 1;
    runSearch(tag, page)
      .then(function (payload) {
        var items = (payload && payload.items) || [];
        if (!items.length) {
          var pick = CURATED_WALLPAPERS[Math.floor(Math.random() * CURATED_WALLPAPERS.length)];
          return res.json({ item: pick, source: "curated" });
        }
        res.json({ item: items[Math.floor(Math.random() * items.length)], source: payload.provider || "search" });
      })
      .catch(function () {
        var pick = CURATED_WALLPAPERS[Math.floor(Math.random() * CURATED_WALLPAPERS.length)];
        res.json({ item: pick, source: "curated" });
      });
  });

  app.get("/api/wallpapers/search", function (req, res) {
    var q = String(req.query.q || "")
      .trim()
      .slice(0, 80);
    var page = Math.max(1, Math.min(20, parseInt(req.query.page, 10) || 1));
    if (!q) return res.json({ items: [], page: 1, total: 0, provider: "" });

    runSearch(q, page)
      .then(function (payload) {
        res.json(payload);
      })
      .catch(function () {
        res.status(502).json({ items: [], page: page, total: 0, error: "Search failed" });
      });
  });
}

module.exports = {
  attachWallpaperApi: attachWallpaperApi,
  CURATED_WALLPAPERS: CURATED_WALLPAPERS,
};
