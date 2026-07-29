function attachApiTools(app, helpers) {
  var httpsFetchJson = helpers.httpsFetchJson;
  var httpsFetchText = helpers.httpsFetchText;
  var audiusFetchJson = helpers.audiusFetchJson;
  var discordBotToken = String(process.env.DISCORD_BOT_TOKEN || "").trim();

  function sendItems(res, items, extra) {
    res.json({ items: items || [], extra: extra || null });
  }

  function fail(res, message) {
    res.status(502).json({ items: [], error: message || "Request failed" });
  }

  function fmtNum(value) {
    if (value == null || value === "") return "—";
    var n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    return n.toLocaleString();
  }

  function fmtDuration(seconds) {
    var s = Number(seconds) || 0;
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + "m " + r + "s";
  }

  function mapDeezerTrack(track) {
    return {
      id: String(track.id),
      title: track.title || "Track",
      subtitle: track.artist && track.artist.name ? track.artist.name : "",
      meta: track.album && track.album.title ? track.album.title : "",
      image: track.album && track.album.cover_medium ? track.album.cover_medium : "",
      url: track.link || "",
      body: track.title_short || track.title || "",
      details: [
        { label: "Duration", value: fmtDuration(track.duration) },
        { label: "Rank", value: track.rank != null ? String(track.rank) : "—" },
        { label: "Explicit", value: track.explicit_lyrics ? "Yes" : "No" },
        { label: "Album", value: track.album && track.album.title ? track.album.title : "—" },
        { label: "Artist", value: track.artist && track.artist.name ? track.artist.name : "—" },
      ],
    };
  }

  function metaContent(html, property) {
    var re = new RegExp('property="' + property + '" content="([^"]+)"', "i");
    var alt = new RegExp("property='" + property + "' content='([^']+)'", "i");
    var match = html.match(re) || html.match(alt);
    return match ? match[1].replace(/&amp;/g, "&") : "";
  }

  function snowflakeCreatedAt(id) {
    try {
      var n = BigInt(String(id));
      return new Date(Number((n >> 22n) + 1420070400000n));
    } catch (e) {
      return null;
    }
  }

  function defaultDiscordAvatar(id) {
    try {
      var index = Number(BigInt(String(id)) >> 22n) % 6n;
      return "https://cdn.discordapp.com/embed/avatars/" + index + ".png";
    } catch (e) {
      return "";
    }
  }

  function discordInviteCode(raw) {
    var q = String(raw || "").trim();
    if (!q) return "";
    q = q.replace(/^https?:\/\//i, "");
    q = q.replace(/^discord\.gg\//i, "");
    q = q.replace(/^discord\.com\/invite\//i, "");
    q = q.replace(/^discordapp\.com\/invite\//i, "");
    return q.split(/[/?#]/)[0];
  }

  function fetchDiscordUserById(id) {
    if (!discordBotToken) return Promise.resolve(null);
    return new Promise(function (resolve) {
      var req = require("https").request(
        {
          hostname: "discord.com",
          path: "/api/v10/users/" + encodeURIComponent(String(id)),
          method: "GET",
          headers: {
            Authorization: "Bot " + discordBotToken,
            Accept: "application/json",
            "User-Agent": "Kobran/1.0",
          },
        },
        function (upstream) {
          var chunks = [];
          upstream.on("data", function (chunk) {
            chunks.push(chunk);
          });
          upstream.on("end", function () {
            try {
              var parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
              if (upstream.statusCode && upstream.statusCode >= 400) resolve(null);
              else resolve(parsed);
            } catch (e) {
              resolve(null);
            }
          });
        }
      );
      req.on("error", function () {
        resolve(null);
      });
      req.end();
    });
  }

  app.get("/api/tools/:tool", function (req, res) {
    var tool = String(req.params.tool || "").trim().toLowerCase();
    var action = String(req.query.action || "default").trim().toLowerCase();
    var q = String(req.query.q || "").trim();

    if (tool === "deezer") {
      if (action === "chart") {
        return httpsFetchJson("https://api.deezer.com/chart/0/tracks")
          .then(function (payload) {
            var tracks = Array.isArray(payload.data) ? payload.data : [];
            sendItems(
              res,
              tracks.slice(0, 24).map(mapDeezerTrack)
            );
          })
          .catch(function () {
            fail(res);
          });
      }
      if (!q) return sendItems(res, []);
      return httpsFetchJson("https://api.deezer.com/search?q=" + encodeURIComponent(q))
        .then(function (payload) {
          var tracks = payload.data && Array.isArray(payload.data) ? payload.data : [];
          sendItems(
            res,
            tracks.slice(0, 24).map(mapDeezerTrack)
          );
        })
        .catch(function () {
          fail(res);
        });
    }

    if (tool === "itunes") {
      if (!q) return sendItems(res, []);
      return httpsFetchJson(
        "https://itunes.apple.com/search?term=" + encodeURIComponent(q) + "&limit=24&media=music"
      )
        .then(function (payload) {
          var rows = Array.isArray(payload.results) ? payload.results : [];
          sendItems(
            res,
            rows.map(function (row) {
              return {
                id: String(row.trackId || row.collectionId || row.artistId),
                title: row.trackName || row.collectionName || row.artistName || "Result",
                subtitle: row.artistName || "",
                meta: row.primaryGenreName || "",
                image: row.artworkUrl100 || "",
                url: row.trackViewUrl || row.collectionViewUrl || "",
                body: row.collectionName || row.trackName || "",
                details: [
                  { label: "Album", value: row.collectionName || "—" },
                  { label: "Genre", value: row.primaryGenreName || "—" },
                  { label: "Duration", value: row.trackTimeMillis ? fmtDuration(Math.round(row.trackTimeMillis / 1000)) : "—" },
                  { label: "Price", value: row.trackPrice != null ? "$" + row.trackPrice : "—" },
                  { label: "Release", value: row.releaseDate ? String(row.releaseDate).slice(0, 10) : "—" },
                ],
              };
            })
          );
        })
        .catch(function () {
          fail(res);
        });
    }

    if (tool === "audius") {
      if (!q) return sendItems(res, []);
      return audiusFetchJson("/tracks/search", {
        query: q,
        limit: "24",
        sortMethod: "popular",
        app_name: "Kobran",
      })
        .then(function (payload) {
          var tracks = Array.isArray(payload.data) ? payload.data : [];
          sendItems(
            res,
            tracks.map(function (track) {
              return {
                id: String(track.id),
                title: track.title || "Track",
                subtitle: track.user && track.user.name ? track.user.name : "",
                meta: track.genre || "",
                image: track.artwork && track.artwork["150x150"] ? track.artwork["150x150"] : "",
                url: "",
                playId: String(track.id),
                body: track.description || "",
                details: [
                  { label: "Artist", value: track.user && track.user.name ? track.user.name : "—" },
                  { label: "Genre", value: track.genre || "—" },
                  { label: "Duration", value: track.duration ? fmtDuration(track.duration) : "—" },
                  { label: "Plays", value: fmtNum(track.play_count) },
                  { label: "Track ID", value: String(track.id) },
                ],
              };
            })
          );
        })
        .catch(function () {
          fail(res);
        });
    }

    if (tool === "github") {
      if (action === "user") {
        if (!q) return sendItems(res, []);
        return httpsFetchJson("https://api.github.com/users/" + encodeURIComponent(q))
          .then(function (user) {
            sendItems(res, [
              {
                id: user.login,
                title: user.name || user.login,
                subtitle: "@" + user.login,
                meta: (user.public_repos || 0) + " repos · " + (user.followers || 0) + " followers",
                image: user.avatar_url || "",
                url: user.html_url || "",
                body: user.bio || "",
                details: [
                  { label: "Followers", value: fmtNum(user.followers) },
                  { label: "Following", value: fmtNum(user.following) },
                  { label: "Public repos", value: fmtNum(user.public_repos) },
                  { label: "Location", value: user.location || "—" },
                  { label: "Company", value: user.company || "—" },
                  { label: "Joined", value: user.created_at ? String(user.created_at).slice(0, 10) : "—" },
                ],
              },
            ]);
          })
          .catch(function () {
            fail(res);
          });
      }
      if (!q) return sendItems(res, []);
      return httpsFetchJson(
        "https://api.github.com/search/repositories?q=" + encodeURIComponent(q) + "&per_page=24"
      )
        .then(function (payload) {
          var rows = Array.isArray(payload.items) ? payload.items : [];
          sendItems(
            res,
            rows.map(function (repo) {
              return {
                id: String(repo.id),
                title: repo.full_name || repo.name,
                subtitle: repo.language || "Repo",
                meta: "★ " + (repo.stargazers_count || 0),
                image: repo.owner && repo.owner.avatar_url ? repo.owner.avatar_url : "",
                url: repo.html_url || "",
                body: repo.description || "",
                details: [
                  { label: "Stars", value: fmtNum(repo.stargazers_count) },
                  { label: "Forks", value: fmtNum(repo.forks_count) },
                  { label: "Issues", value: fmtNum(repo.open_issues_count) },
                  { label: "Language", value: repo.language || "—" },
                  { label: "Updated", value: repo.updated_at ? String(repo.updated_at).slice(0, 10) : "—" },
                ],
                tags: repo.topics && repo.topics.length ? repo.topics.slice(0, 4) : [],
              };
            })
          );
        })
        .catch(function () {
          fail(res);
        });
    }

    if (tool === "hackernews") {
      return httpsFetchJson("https://hacker-news.firebaseio.com/v0/topstories.json")
        .then(function (ids) {
          var top = Array.isArray(ids) ? ids.slice(0, 20) : [];
          return Promise.all(
            top.map(function (id) {
              return httpsFetchJson("https://hacker-news.firebaseio.com/v0/item/" + id).catch(function () {
                return null;
              });
            })
          );
        })
        .then(function (rows) {
          sendItems(
            res,
            rows
              .filter(function (row) {
                return row && row.title;
              })
              .map(function (row) {
                var url = row.url || "https://news.ycombinator.com/item?id=" + row.id;
                return {
                  id: String(row.id),
                  title: row.title,
                  subtitle: row.by ? "by " + row.by : "",
                  meta: (row.score || 0) + " pts · " + (row.descendants || 0) + " comments",
                  url: url,
                  body: row.text || "",
                  details: [
                    { label: "Score", value: fmtNum(row.score) },
                    { label: "Comments", value: fmtNum(row.descendants) },
                    { label: "Author", value: row.by || "—" },
                    { label: "Posted", value: row.time ? new Date(row.time * 1000).toLocaleString() : "—" },
                    { label: "Story ID", value: String(row.id) },
                  ],
                };
              })
          );
        })
        .catch(function () {
          fail(res);
        });
    }

    if (tool === "pokemon") {
      if (!q) return sendItems(res, []);
      return httpsFetchJson("https://pokeapi.co/api/v2/pokemon/" + encodeURIComponent(q.toLowerCase()))
        .then(function (mon) {
            sendItems(res, [
              {
                id: String(mon.id),
                title: mon.name ? mon.name.charAt(0).toUpperCase() + mon.name.slice(1) : "Pokemon",
                subtitle: "Height " + (mon.height / 10) + "m · Weight " + (mon.weight / 10) + "kg",
                meta: mon.types ? mon.types.map(function (t) { return t.type.name; }).join(", ") : "",
                image: mon.sprites && mon.sprites.other && mon.sprites.other["official-artwork"]
                  ? mon.sprites.other["official-artwork"].front_default
                  : "",
                body: mon.abilities
                  ? "Abilities: " + mon.abilities.map(function (a) { return a.ability.name; }).join(", ")
                  : "",
                details: [
                  { label: "Dex #", value: String(mon.id) },
                  { label: "Height", value: (mon.height / 10) + " m" },
                  { label: "Weight", value: (mon.weight / 10) + " kg" },
                  { label: "Types", value: mon.types ? mon.types.map(function (t) { return t.type.name; }).join(", ") : "—" },
                  { label: "Base XP", value: fmtNum(mon.base_experience) },
                ],
                tags: mon.types ? mon.types.map(function (t) { return t.type.name; }) : [],
              },
            ]);
        })
        .catch(function () {
          fail(res);
        });
    }

    if (tool === "minecraft") {
      if (!q) return sendItems(res, []);
      return httpsFetchJson("https://api.mojang.com/users/profiles/minecraft/" + encodeURIComponent(q))
        .then(function (profile) {
          if (!profile || !profile.id) return sendItems(res, []);
          sendItems(res, [
            {
              id: profile.id,
              title: profile.name || q,
              subtitle: "Java profile",
              meta: "UUID " + profile.id,
              image:
                "https://crafatar.com/avatars/" +
                encodeURIComponent(profile.id) +
                "?size=128&overlay",
              url: "https://namemc.com/profile/" + encodeURIComponent(profile.name || q),
              details: [
                { label: "Username", value: profile.name || q },
                { label: "UUID", value: profile.id },
                { label: "Profile", value: "Java edition" },
              ],
            },
          ]);
        })
        .catch(function () {
          fail(res);
        });
    }

    if (tool === "roblox") {
      if (!q) return sendItems(res, []);
      return httpsFetchJson(
        "https://users.roblox.com/v1/users/search?keyword=" + encodeURIComponent(q) + "&limit=20"
      )
        .then(function (payload) {
          var users = Array.isArray(payload.data) ? payload.data : [];
          return Promise.all(
            users.slice(0, 12).map(function (user) {
              return httpsFetchJson(
                "https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=" +
                  encodeURIComponent(String(user.id)) +
                  "&size=150x150&format=Png"
              )
                .then(function (thumb) {
                  var image =
                    thumb.data && thumb.data[0] && thumb.data[0].imageUrl ? thumb.data[0].imageUrl : "";
                  return {
                    id: String(user.id),
                    title: user.displayName || user.name,
                    subtitle: "@" + (user.name || user.displayName),
                    meta: user.hasVerifiedBadge ? "Verified" : "Roblox user",
                    image: image,
                    url: "https://www.roblox.com/users/" + encodeURIComponent(String(user.id)) + "/profile",
                    details: [
                      { label: "User ID", value: String(user.id) },
                      { label: "Display name", value: user.displayName || user.name || "—" },
                      { label: "Username", value: user.name || "—" },
                      { label: "Verified", value: user.hasVerifiedBadge ? "Yes" : "No" },
                    ],
                    tags: user.hasVerifiedBadge ? ["Verified"] : [],
                  };
                })
                .catch(function () {
                  return {
                    id: String(user.id),
                    title: user.displayName || user.name,
                    subtitle: "@" + (user.name || user.displayName),
                    meta: user.hasVerifiedBadge ? "Verified" : "Roblox user",
                    url: "https://www.roblox.com/users/" + encodeURIComponent(String(user.id)) + "/profile",
                  };
                });
            })
          );
        })
        .then(function (items) {
          sendItems(res, items);
        })
        .catch(function () {
          fail(res);
        });
    }

    if (tool === "scriptblox") {
      if (!q) return sendItems(res, []);
      return httpsFetchJson("https://scriptblox.com/api/script/search?q=" + encodeURIComponent(q))
        .then(function (payload) {
          var scripts =
            payload.result && Array.isArray(payload.result.scripts) ? payload.result.scripts : [];
          sendItems(
            res,
            scripts.slice(0, 20).map(function (script) {
              return {
                id: String(script._id || script.slug || script.title),
                title: script.title || "Script",
                subtitle: script.game && script.game.name ? script.game.name : "Roblox script",
                meta: script.views ? script.views + " views" : "",
                image: script.game && script.game.imageUrl ? script.game.imageUrl : "",
                url: script.slug ? "https://scriptblox.com/script/" + script.slug : "https://scriptblox.com/",
                body: script.script ? String(script.script).slice(0, 280) + (String(script.script).length > 280 ? "…" : "") : "",
                details: [
                  { label: "Game", value: script.game && script.game.name ? script.game.name : "—" },
                  { label: "Views", value: fmtNum(script.views) },
                  { label: "Verified", value: script.verified ? "Yes" : "No" },
                  { label: "Keyless", value: script.key ? "No" : "Yes" },
                ],
              };
            })
          );
        })
        .catch(function () {
          fail(res);
        });
    }

    if (tool === "wikipedia") {
      if (!q) return sendItems(res, []);
      return httpsFetchJson(
        "https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(q.replace(/ /g, "_"))
      )
        .then(function (page) {
            sendItems(res, [
              {
                id: page.pageid ? String(page.pageid) : q,
                title: page.title || q,
                subtitle: page.description || "Wikipedia",
                meta: page.extract ? page.extract.slice(0, 140) + "…" : "",
                image: page.thumbnail && page.thumbnail.source ? page.thumbnail.source : "",
                url: page.content_urls && page.content_urls.desktop ? page.content_urls.desktop.page : "",
                body: page.extract || "",
                details: [
                  { label: "Description", value: page.description || "—" },
                  { label: "Page ID", value: page.pageid ? String(page.pageid) : "—" },
                  { label: "Language", value: page.lang || "en" },
                  { label: "Type", value: page.type || "—" },
                ],
              },
            ]);
        })
        .catch(function () {
          fail(res);
        });
    }

    if (tool === "dictionary") {
      if (!q) return sendItems(res, []);
      return httpsFetchJson("https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURIComponent(q))
        .then(function (rows) {
          var entry = Array.isArray(rows) ? rows[0] : null;
          if (!entry) return sendItems(res, []);
          var defs = [];
          (entry.meanings || []).forEach(function (meaning) {
            (meaning.definitions || []).slice(0, 2).forEach(function (def) {
              if (def.definition) defs.push((meaning.partOfSpeech || "def") + ": " + def.definition);
            });
          });
          sendItems(res, [
            {
              id: entry.word || q,
              title: entry.word || q,
              subtitle: entry.phonetic || "",
              meta: defs[0] || "",
              body: defs.join("\n\n"),
              details: [
                { label: "Phonetic", value: entry.phonetic || "—" },
                { label: "Meanings", value: String((entry.meanings || []).length) },
                { label: "Origin", value: entry.origin || "—" },
              ],
            },
          ]);
        })
        .catch(function () {
          fail(res);
        });
    }

    if (tool === "crypto") {
      var ids =
        q ||
        "bitcoin,ethereum,solana,dogecoin,cardano,ripple,litecoin,polkadot,chainlink,avalanche-2";
      return httpsFetchJson(
        "https://api.coingecko.com/api/v3/simple/price?ids=" +
          encodeURIComponent(ids) +
          "&vs_currencies=usd&include_24hr_change=true"
      )
        .then(function (payload) {
          var items = Object.keys(payload || {}).map(function (coin) {
            var row = payload[coin] || {};
            return {
              id: coin,
              title: coin.replace(/-/g, " "),
              subtitle: row.usd != null ? "$" + row.usd : "",
              meta: row.usd_24h_change != null ? row.usd_24h_change.toFixed(2) + "% (24h)" : "",
              details: [
                { label: "Price USD", value: row.usd != null ? "$" + row.usd : "—" },
                { label: "24h change", value: row.usd_24h_change != null ? row.usd_24h_change.toFixed(2) + "%" : "—" },
                { label: "Coin ID", value: coin },
              ],
            };
          });
          sendItems(res, items);
        })
        .catch(function () {
          fail(res);
        });
    }

    if (tool === "tvmaze") {
      if (!q) return sendItems(res, []);
      return httpsFetchJson("https://api.tvmaze.com/search/shows?q=" + encodeURIComponent(q))
        .then(function (rows) {
          sendItems(
            res,
            (Array.isArray(rows) ? rows : []).slice(0, 20).map(function (row) {
              var show = row.show || {};
              return {
                id: String(show.id),
                title: show.name || "Show",
                subtitle: show.language || "",
                meta: show.status || "",
                image: show.image && show.image.medium ? show.image.medium : "",
                url: show.url || "",
                body: show.summary ? String(show.summary).replace(/<[^>]+>/g, "") : "",
                details: [
                  { label: "Status", value: show.status || "—" },
                  { label: "Premiered", value: show.premiered || "—" },
                  { label: "Genres", value: show.genres ? show.genres.join(", ") : "—" },
                  { label: "Network", value: show.network && show.network.name ? show.network.name : "—" },
                  { label: "Rating", value: show.rating && show.rating.average ? String(show.rating.average) : "—" },
                ],
                tags: show.genres ? show.genres.slice(0, 4) : [],
              };
            })
          );
        })
        .catch(function () {
          fail(res);
        });
    }

    if (tool === "books") {
      if (!q) return sendItems(res, []);
      return httpsFetchJson("https://openlibrary.org/search.json?q=" + encodeURIComponent(q) + "&limit=20")
        .then(function (payload) {
          var docs = Array.isArray(payload.docs) ? payload.docs : [];
          sendItems(
            res,
            docs.map(function (book) {
              var cover = book.cover_i
                ? "https://covers.openlibrary.org/b/id/" + book.cover_i + "-M.jpg"
                : "";
              return {
                id: book.key || book.title,
                title: book.title || "Book",
                subtitle: book.author_name ? book.author_name.join(", ") : "",
                meta: book.first_publish_year ? String(book.first_publish_year) : "",
                image: cover,
                url: book.key ? "https://openlibrary.org" + book.key : "https://openlibrary.org/",
                details: [
                  { label: "Authors", value: book.author_name ? book.author_name.join(", ") : "—" },
                  { label: "First published", value: book.first_publish_year ? String(book.first_publish_year) : "—" },
                  { label: "Edition count", value: fmtNum(book.edition_count) },
                  { label: "Language", value: book.language ? book.language.join(", ") : "—" },
                ],
              };
            })
          );
        })
        .catch(function () {
          fail(res);
        });
    }

    if (tool === "weather") {
      if (!q) return sendItems(res, []);
      return httpsFetchJson("https://wttr.in/" + encodeURIComponent(q) + "?format=j1")
        .then(function (payload) {
          var current = payload.current_condition && payload.current_condition[0] ? payload.current_condition[0] : {};
          var area = payload.nearest_area && payload.nearest_area[0] ? payload.nearest_area[0] : {};
          var place =
            area.areaName && area.areaName[0] && area.areaName[0].value ? area.areaName[0].value : q;
          sendItems(res, [
            {
              id: place,
              title: place,
              subtitle: current.weatherDesc && current.weatherDesc[0] ? current.weatherDesc[0].value : "",
              meta:
                (current.temp_C != null ? current.temp_C + "°C" : "") +
                (current.humidity != null ? " · " + current.humidity + "% humidity" : ""),
              body:
                "Feels like " +
                (current.FeelsLikeC || "?") +
                "°C · Wind " +
                (current.windspeedKmph || "?") +
                " km/h",
              details: [
                { label: "Temp", value: current.temp_C != null ? current.temp_C + "°C" : "—" },
                { label: "Feels like", value: current.FeelsLikeC != null ? current.FeelsLikeC + "°C" : "—" },
                { label: "Humidity", value: current.humidity != null ? current.humidity + "%" : "—" },
                { label: "Wind", value: current.windspeedKmph != null ? current.windspeedKmph + " km/h" : "—" },
                { label: "Visibility", value: current.visibility != null ? current.visibility + " km" : "—" },
                { label: "UV", value: current.uvIndex != null ? String(current.uvIndex) : "—" },
              ],
            },
          ]);
        })
        .catch(function () {
          fail(res);
        });
    }

    if (tool === "exchange") {
      var from = String(req.query.from || "USD").trim().toUpperCase();
      var to = String(req.query.to || "EUR").trim().toUpperCase();
      return httpsFetchJson("https://open.er-api.com/v6/latest/" + encodeURIComponent(from))
        .then(function (payload) {
          var rate = payload.rates && payload.rates[to] != null ? payload.rates[to] : null;
          sendItems(res, [
            {
              id: from + "-" + to,
              title: "1 " + from + " = " + (rate != null ? rate.toFixed(4) : "?") + " " + to,
              subtitle: payload.time_last_update_utc || "Live rate",
              meta: rate != null && q ? q + " " + from + " ≈ " + (parseFloat(q) * rate).toFixed(2) + " " + to : "",
              details: [
                { label: "From", value: from },
                { label: "To", value: to },
                { label: "Rate", value: rate != null ? rate.toFixed(6) : "—" },
                { label: "Amount", value: q || "1" },
                { label: "Updated", value: payload.time_last_update_utc || "—" },
              ],
            },
          ]);
        })
        .catch(function () {
          fail(res);
        });
    }

    if (tool === "jokes") {
      return httpsFetchJson("https://v2.jokeapi.dev/joke/Any?amount=8&safe-mode")
        .then(function (payload) {
          var jokes = Array.isArray(payload.jokes) ? payload.jokes : payload.joke ? [payload] : [];
          sendItems(
            res,
            jokes.map(function (joke, index) {
              var text =
                joke.type === "twopart"
                  ? joke.setup + " — " + joke.delivery
                  : joke.joke || joke.setup || "";
              return {
                id: String(index),
                title: joke.category || "Joke",
                subtitle: joke.type || "",
                body: text,
                details: [
                  { label: "Category", value: joke.category || "—" },
                  { label: "Type", value: joke.type || "—" },
                  { label: "Safe", value: joke.flags && joke.flags.nsfw ? "No" : "Yes" },
                ],
              };
            })
          );
        })
        .catch(function () {
          fail(res);
        });
    }

    if (tool === "advice") {
      return httpsFetchJson("https://api.adviceslip.com/advice")
        .then(function (payload) {
          var slip = payload.slip || {};
          sendItems(res, [
            {
              id: String(slip.id || "1"),
              title: "Advice",
              body: slip.advice || "",
              details: [{ label: "Slip ID", value: String(slip.id || "1") }],
            },
          ]);
        })
        .catch(function () {
          fail(res);
        });
    }

    if (tool === "facts") {
      return httpsFetchJson("https://uselessfacts.jsph.pl/api/v2/facts/random")
        .then(function (payload) {
          sendItems(res, [
            {
              id: payload.id || "fact",
              title: "Random fact",
              subtitle: payload.source || "",
              body: payload.text || "",
              url: payload.source_url || "",
              details: [
                { label: "Source", value: payload.source || "—" },
                { label: "Language", value: payload.language || "en" },
              ],
            },
          ]);
        })
        .catch(function () {
          fail(res);
        });
    }

    if (tool === "tiktok") {
      if (!q) return sendItems(res, []);
      var tikUser = q.replace(/^@/, "").replace(/^https?:\/\/(www\.)?tiktok\.com\/@?/i, "").split(/[/?#]/)[0];
      return httpsFetchJson("https://www.tikwm.com/api/user/info?unique_id=" + encodeURIComponent(tikUser))
        .then(function (payload) {
          var user = payload && payload.data && payload.data.user ? payload.data.user : null;
          if (!user) return sendItems(res, []);
          var stats = payload.data.stats || {};
          sendItems(res, [
            {
              id: String(user.id || tikUser),
              title: user.nickname || user.uniqueId || tikUser,
              subtitle: "@" + (user.uniqueId || tikUser),
              meta:
                (stats.followerCount != null ? stats.followerCount + " followers" : "") +
                (stats.videoCount != null ? " · " + stats.videoCount + " videos" : ""),
              image: user.avatarMedium || user.avatarThumb || user.avatarLarger || "",
              body: user.signature || "",
              url: "https://www.tiktok.com/@" + encodeURIComponent(user.uniqueId || tikUser),
              details: [
                { label: "Followers", value: fmtNum(stats.followerCount) },
                { label: "Following", value: fmtNum(stats.followingCount) },
                { label: "Likes", value: fmtNum(stats.heartCount || stats.heart) },
                { label: "Videos", value: fmtNum(stats.videoCount) },
                { label: "User ID", value: String(user.id || tikUser) },
              ],
              tags: user.verified ? ["Verified"] : [],
            },
          ]);
        })
        .catch(function () {
          fail(res, "TikTok lookup failed");
        });
    }

    if (tool === "instagram") {
      if (!q) return sendItems(res, []);
      var igUser = q.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").split(/[/?#]/)[0];
      return httpsFetchText("https://www.instagram.com/" + encodeURIComponent(igUser) + "/")
        .then(function (html) {
          var title = metaContent(html, "og:title") || igUser;
          var image = metaContent(html, "og:image");
          var desc = metaContent(html, "og:description");
          if (!title && !desc && !image) return sendItems(res, []);
          sendItems(res, [
            {
              id: igUser,
              title: title.replace(/ \(@.*\)$/, "").replace(/ • Instagram photos and videos$/, "") || igUser,
              subtitle: "@" + igUser,
              meta: desc ? desc.slice(0, 140) : "Instagram profile",
              image: image,
              url: "https://www.instagram.com/" + encodeURIComponent(igUser) + "/",
              body: desc || "",
              details: [
                { label: "Username", value: "@" + igUser },
                { label: "Profile", value: title.replace(/ \(@.*\)$/, "").replace(/ • Instagram photos and videos$/, "") || igUser },
              ],
              tags: ["Instagram"],
            },
          ]);
        })
        .catch(function () {
          fail(res, "Instagram lookup failed");
        });
    }

    if (tool === "discord") {
      if (!q) return sendItems(res, []);
      var discordQuery = q.trim();
      if (action === "user" || /^\d{15,22}$/.test(discordQuery)) {
        var userId = discordQuery.replace(/\D/g, "");
        if (!/^\d{15,22}$/.test(userId)) return sendItems(res, []);
        return fetchDiscordUserById(userId)
          .then(function (user) {
            if (user && user.id) {
              var avatar =
                user.avatar && user.id
                  ? "https://cdn.discordapp.com/avatars/" +
                    user.id +
                    "/" +
                    user.avatar +
                    ".png?size=128"
                  : defaultDiscordAvatar(user.id);
              var created = snowflakeCreatedAt(user.id);
              return sendItems(res, [
                {
                  id: String(user.id),
                  title: user.global_name || user.username || "Discord user",
                  subtitle: user.username ? "@" + user.username : "User ID " + user.id,
                  meta: created ? "Created " + created.toLocaleDateString() : "",
                  image: avatar,
                  url: "https://discord.com/users/" + encodeURIComponent(String(user.id)),
                  details: [
                    { label: "Username", value: user.username ? "@" + user.username : "—" },
                    { label: "Display name", value: user.global_name || user.username || "—" },
                    { label: "User ID", value: String(user.id) },
                    { label: "Created", value: created ? created.toLocaleString() : "—" },
                    { label: "Bot account", value: user.bot ? "Yes" : "No" },
                  ],
                },
              ]);
            }
            var fallbackDate = snowflakeCreatedAt(userId);
            sendItems(res, [
              {
                id: userId,
                title: "Discord user " + userId,
                subtitle: "Snowflake ID",
                meta: fallbackDate ? "Account created around " + fallbackDate.toLocaleDateString() : "",
                image: defaultDiscordAvatar(userId),
                url: "https://discord.com/users/" + encodeURIComponent(userId),
                details: [
                  { label: "User ID", value: userId },
                  { label: "Created", value: fallbackDate ? fallbackDate.toLocaleString() : "—" },
                  { label: "Profile", value: "Decoded from snowflake ID" },
                ],
              },
            ]);
          })
          .catch(function () {
            fail(res, "Discord lookup failed");
          });
      }
      var inviteCode = discordInviteCode(discordQuery);
      return httpsFetchJson(
        "https://discord.com/api/v9/invites/" +
          encodeURIComponent(inviteCode) +
          "?with_counts=true&with_expiration=true"
      )
        .then(function (payload) {
          if (payload && payload.guild) {
            var guild = payload.guild;
            return sendItems(res, [
              {
                id: inviteCode,
                title: guild.name || inviteCode,
                subtitle: guild.description ? guild.description.slice(0, 80) : "Discord server",
                meta:
                  (payload.approximate_member_count != null
                    ? payload.approximate_member_count + " members"
                    : "") +
                  (payload.approximate_presence_count != null
                    ? " · " + payload.approximate_presence_count + " online"
                    : ""),
                image: guild.icon
                  ? "https://cdn.discordapp.com/icons/" +
                    guild.id +
                    "/" +
                    guild.icon +
                    ".png?size=128"
                  : "",
                url: "https://discord.gg/" + encodeURIComponent(inviteCode),
                body: guild.description || "",
                details: [
                  { label: "Members", value: fmtNum(payload.approximate_member_count) },
                  { label: "Online", value: fmtNum(payload.approximate_presence_count) },
                  { label: "Server ID", value: guild.id || "—" },
                  { label: "Invite code", value: inviteCode },
                  { label: "Boost tier", value: payload.premium_tier != null ? String(payload.premium_tier) : "—" },
                ],
              },
            ]);
          }
          if (payload && payload.type === 2) {
            return sendItems(res, [
              {
                id: inviteCode,
                title: "Discord invite",
                subtitle: inviteCode,
                meta: payload.friends_count != null ? payload.friends_count + " friends on invite" : "Friend invite link",
                url: "https://discord.gg/" + encodeURIComponent(inviteCode),
              },
            ]);
          }
          return sendItems(res, []);
        })
        .catch(function () {
          fail(res, "Discord invite lookup failed");
        });
    }

    res.status(404).json({ items: [], error: "Unknown tool" });
  });
}

module.exports = { attachApiTools };
