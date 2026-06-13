(function () {
  var SECTIONS = [
    {
      title: "Gaming",
      items: [
        { name: "ScriptBlox", desc: "Roblox scripts database and API hub", href: "https://scriptblox.com/" },
        { name: "Roblox Open Cloud", desc: "Official Roblox cloud API docs", href: "https://create.roblox.com/docs/cloud" },
        { name: "Roblox Engine Reference", desc: "Roblox engine classes and methods", href: "https://create.roblox.com/docs/reference/engine" },
        { name: "Steam Web API", desc: "Valve Steam player and game data", href: "https://developer.valvesoftware.com/wiki/Steam_Web_API" },
        { name: "Epic Online Services", desc: "Epic Games platform services API", href: "https://dev.epicgames.com/docs/services" },
        { name: "Riot Games API", desc: "League, Valorant, and Riot data", href: "https://developer.riotgames.com/" },
        { name: "Battle.net API", desc: "Blizzard game profile APIs", href: "https://develop.battle.net/documentation" },
        { name: "Minecraft Services", desc: "Mojang profile and server APIs", href: "https://wiki.vg/Main_Page" },
      ],
    },
    {
      title: "Social",
      items: [
        { name: "Discord API", desc: "Bots, webhooks, and gateway events", href: "https://discord.com/developers/docs/reference" },
        { name: "TikTok for Developers", desc: "Login, share, and content APIs", href: "https://developers.tiktok.com/doc/overview" },
        { name: "Instagram Graph API", desc: "Meta Instagram business APIs", href: "https://developers.facebook.com/docs/instagram-api/" },
        { name: "Facebook Graph API", desc: "Meta pages, users, and social graph", href: "https://developers.facebook.com/docs/graph-api/" },
        { name: "X API", desc: "Posts, users, and Twitter developer platform", href: "https://developer.x.com/en/docs" },
        { name: "Snapchat Marketing API", desc: "Snap ads and developer tools", href: "https://developers.snap.com/" },
        { name: "Reddit API", desc: "Subreddits, posts, and OAuth endpoints", href: "https://www.reddit.com/dev/api/" },
        { name: "Telegram Bot API", desc: "Bots, messages, and inline queries", href: "https://core.telegram.org/bots/api" },
        { name: "LinkedIn API", desc: "Profiles, sharing, and marketing APIs", href: "https://learn.microsoft.com/en-us/linkedin/" },
        { name: "Pinterest API", desc: "Pins, boards, and ads endpoints", href: "https://developers.pinterest.com/docs/api/v5/" },
      ],
    },
    {
      title: "Music & Video",
      items: [
        { name: "Spotify Web API", desc: "Tracks, albums, playlists, and playback", href: "https://developer.spotify.com/documentation/web-api" },
        { name: "Apple Music API", desc: "Catalog, library, and playback data", href: "https://developer.apple.com/documentation/applemusicapi" },
        { name: "SoundCloud API", desc: "Tracks, users, and OAuth streaming", href: "https://developers.soundcloud.com/docs/api/guide" },
        { name: "YouTube Data API", desc: "Videos, channels, and search", href: "https://developers.google.com/youtube/v3" },
        { name: "Twitch Helix API", desc: "Streams, clips, and channel data", href: "https://dev.twitch.tv/docs/api/" },
        { name: "Audius API", desc: "Decentralized music catalog and streaming", href: "https://docs.audius.co/developers/api/" },
        { name: "Deezer API", desc: "Charts, search, and track metadata", href: "https://developers.deezer.com/api" },
        { name: "Last.fm API", desc: "Scrobbling and music metadata", href: "https://www.last.fm/api" },
      ],
    },
    {
      title: "Dev & Cloud",
      items: [
        { name: "GitHub REST API", desc: "Repos, issues, actions, and users", href: "https://docs.github.com/en/rest" },
        { name: "GitLab API", desc: "Projects, pipelines, and merge requests", href: "https://docs.gitlab.com/ee/api/rest/" },
        { name: "OpenAI API", desc: "Chat, images, audio, and embeddings", href: "https://platform.openai.com/docs/api-reference" },
        { name: "Google APIs Explorer", desc: "Maps, Gmail, Drive, and more", href: "https://developers.google.com/apis-explorer" },
        { name: "Firebase", desc: "Auth, Firestore, storage, and hosting", href: "https://firebase.google.com/docs/reference" },
        { name: "Supabase API", desc: "Postgres, auth, and realtime backends", href: "https://supabase.com/docs/reference/api/introduction" },
        { name: "Cloudflare API", desc: "DNS, workers, and edge services", href: "https://developers.cloudflare.com/api/" },
        { name: "Vercel REST API", desc: "Deployments, domains, and projects", href: "https://vercel.com/docs/rest-api" },
      ],
    },
    {
      title: "Payments & Data",
      items: [
        { name: "Stripe API", desc: "Payments, subscriptions, and billing", href: "https://docs.stripe.com/api" },
        { name: "PayPal REST API", desc: "Checkout, payouts, and orders", href: "https://developer.paypal.com/api/rest/" },
        { name: "CoinGecko API", desc: "Crypto prices, markets, and coins", href: "https://www.coingecko.com/en/api/documentation" },
        { name: "TMDB API", desc: "Movies, TV, and poster metadata", href: "https://developer.themoviedb.org/docs" },
        { name: "OMDb API", desc: "Movie and series lookup by title or ID", href: "https://www.omdbapi.com/" },
        { name: "NASA Open APIs", desc: "Space imagery, asteroids, and weather", href: "https://api.nasa.gov/" },
        { name: "OpenWeather API", desc: "Forecast and current weather data", href: "https://openweathermap.org/api" },
        { name: "Wikipedia API", desc: "Articles, search, and summaries", href: "https://www.mediawiki.org/wiki/API:Main_page" },
      ],
    },
  ];

  function renderApi() {
    var root = document.getElementById("api-grid");
    if (!root) return;
    root.innerHTML = "";
    SECTIONS.forEach(function (section) {
      var block = document.createElement("div");
      block.className = "hub__section";
      var head = document.createElement("h3");
      head.className = "hub__section-title";
      head.textContent = section.title;
      block.appendChild(head);
      var grid = document.createElement("div");
      grid.className = "hub__grid";
      section.items.forEach(function (item) {
        var card = document.createElement("a");
        card.className = "hub__card";
        card.href = item.href;
        card.target = "_blank";
        card.rel = "noopener noreferrer";
        var title = document.createElement("span");
        title.className = "hub__card-title";
        title.textContent = item.name;
        var desc = document.createElement("span");
        desc.className = "hub__card-desc";
        desc.textContent = item.desc;
        card.append(title, desc);
        grid.appendChild(card);
      });
      block.appendChild(grid);
      root.appendChild(block);
    });
  }

  window.KritikalApi = { render: renderApi };
  window.KritikalTools = window.KritikalApi;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderApi);
  } else {
    renderApi();
  }
})();
