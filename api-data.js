(function () {
  function tool(id, name, desc, section, config) {
    return Object.assign({ id: id, name: name, desc: desc, section: section }, config || {});
  }

  var ITEMS = [
    tool("deezer", "Deezer", "Search tracks and browse the chart", "Music", {
      mode: "search",
      placeholder: "Search songs or artists…",
      actions: [
        { id: "default", label: "Search" },
        { id: "chart", label: "Top chart", auto: true },
      ],
    }),
    tool("itunes", "iTunes", "Search Apple Music catalog", "Music", {
      mode: "search",
      placeholder: "Search songs or artists…",
    }),
    tool("audius", "Audius", "Search free tracks and play them here", "Music", {
      mode: "search",
      placeholder: "Search tracks…",
      play: true,
    }),
    tool("github", "GitHub", "Search repos or look up a user", "Social", {
      mode: "search",
      placeholder: "Search repos…",
      actions: [
        { id: "default", label: "Repos" },
        { id: "user", label: "User lookup" },
      ],
    }),
    tool("tiktok", "TikTok", "Look up a TikTok user", "Social", {
      mode: "search",
      placeholder: "TikTok username",
    }),
    tool("instagram", "Instagram", "Look up an Instagram profile", "Social", {
      mode: "search",
      placeholder: "Instagram username",
    }),
    tool("discord", "Discord", "Look up users or server invites", "Social", {
      mode: "search",
      placeholder: "User ID or invite code (e.g. minecraft)",
      actions: [
        { id: "user", label: "User ID" },
        { id: "invite", label: "Server invite" },
      ],
    }),
    tool("hackernews", "Hacker News", "Top stories right now", "Social", {
      mode: "browse",
      autoLoad: true,
      actions: [{ id: "default", label: "Refresh", auto: true }],
    }),
    tool("pokemon", "Pokédex", "Look up any Pokémon by name", "Gaming", {
      mode: "lookup",
      placeholder: "e.g. pikachu, charizard, mewtwo",
    }),
    tool("minecraft", "Minecraft", "Java edition username lookup", "Gaming", {
      mode: "lookup",
      placeholder: "Minecraft username",
    }),
    tool("roblox", "Roblox", "Search Roblox users", "Gaming", {
      mode: "search",
      placeholder: "Roblox username",
    }),
    tool("scriptblox", "ScriptBlox", "Search Roblox scripts", "Gaming", {
      mode: "search",
      placeholder: "Search scripts…",
    }),
    tool("wikipedia", "Wikipedia", "Article summaries", "Knowledge", {
      mode: "lookup",
      placeholder: "Article title",
    }),
    tool("dictionary", "Dictionary", "English word definitions", "Knowledge", {
      mode: "lookup",
      placeholder: "Word to define",
    }),
    tool("tvmaze", "TV Maze", "Search TV shows", "Knowledge", {
      mode: "search",
      placeholder: "Show name",
    }),
    tool("books", "Open Library", "Search books", "Knowledge", {
      mode: "search",
      placeholder: "Book title or author",
    }),
    tool("crypto", "Crypto Prices", "Live coin prices from CoinGecko", "Utility", {
      mode: "browse",
      autoLoad: true,
      placeholder: "Optional: bitcoin,ethereum,solana",
      actions: [{ id: "default", label: "Refresh", auto: true }],
    }),
    tool("weather", "Weather", "Current weather for any city", "Utility", {
      mode: "lookup",
      placeholder: "City name",
    }),
    tool("exchange", "Exchange Rates", "Convert between currencies", "Utility", {
      mode: "fields",
      fields: [
        { key: "from", label: "From", value: "USD" },
        { key: "to", label: "To", value: "EUR" },
        { key: "q", label: "Amount", value: "100" },
      ],
      actions: [{ id: "default", label: "Convert" }],
    }),
    tool("jokes", "Jokes", "Random clean jokes", "Fun", {
      mode: "browse",
      autoLoad: true,
      actions: [{ id: "default", label: "New jokes", auto: true }],
    }),
    tool("advice", "Advice", "Random advice slip", "Fun", {
      mode: "browse",
      autoLoad: true,
      actions: [{ id: "default", label: "New advice", auto: true }],
    }),
    tool("facts", "Random Facts", "Useless but true facts", "Fun", {
      mode: "browse",
      autoLoad: true,
      actions: [{ id: "default", label: "New fact", auto: true }],
    }),
  ];

  var SECTIONS = [];
  var BY_ID = {};
  var sectionMap = {};

  ITEMS.forEach(function (item) {
    BY_ID[item.id] = item;
    if (!sectionMap[item.section]) sectionMap[item.section] = [];
    sectionMap[item.section].push(item);
  });

  Object.keys(sectionMap).forEach(function (title) {
    SECTIONS.push({ title: title, items: sectionMap[title] });
  });

  window.ZentraApiRegistry = { sections: SECTIONS, byId: BY_ID, items: ITEMS };
})();
