(function () {
  function tool(id, name, desc, section, config) {
    return Object.assign({ id: id, name: name, desc: desc, section: section }, config || {});
  }

  var ITEMS = [
    tool("deezer", "Deezer", "search tracks or check the chart", "Music", {
      mode: "search",
      placeholder: "Search songs or artists…",
      actions: [
        { id: "default", label: "Search" },
        { id: "chart", label: "Top chart", auto: true },
      ],
    }),
    tool("itunes", "iTunes", "apple music catalog lookup", "Music", {
      mode: "search",
      placeholder: "Search songs or artists…",
    }),
    tool("audius", "Audius", "free tracks u can play here", "Music", {
      mode: "search",
      placeholder: "Search tracks…",
      play: true,
    }),
    tool("github", "GitHub", "repos or a user profile", "Social", {
      mode: "search",
      placeholder: "Search repos…",
      actions: [
        { id: "default", label: "Repos" },
        { id: "user", label: "User lookup" },
      ],
    }),
    tool("tiktok", "TikTok", "look up a tiktok user", "Social", {
      mode: "search",
      placeholder: "TikTok username",
    }),
    tool("instagram", "Instagram", "look up an ig profile", "Social", {
      mode: "search",
      placeholder: "Instagram username",
    }),
    tool("discord", "Discord", "users or invite codes", "Social", {
      mode: "search",
      placeholder: "User ID or invite code (e.g. minecraft)",
      actions: [
        { id: "user", label: "User ID" },
        { id: "invite", label: "Server invite" },
      ],
    }),
    tool("hackernews", "Hacker News", "top stories rn", "Social", {
      mode: "browse",
      autoLoad: true,
      actions: [{ id: "default", label: "Refresh", auto: true }],
    }),
    tool("pokemon", "Pokédex", "any pokemon by name", "Gaming", {
      mode: "lookup",
      placeholder: "e.g. pikachu, charizard, mewtwo",
    }),
    tool("minecraft", "Minecraft", "java username lookup", "Gaming", {
      mode: "lookup",
      placeholder: "Minecraft username",
    }),
    tool("roblox", "Roblox", "search roblox users", "Gaming", {
      mode: "search",
      placeholder: "Roblox username",
    }),
    tool("scriptblox", "ScriptBlox", "roblox scripts", "Gaming", {
      mode: "search",
      placeholder: "Search scripts…",
    }),
    tool("wikipedia", "Wikipedia", "quick article summaries", "Knowledge", {
      mode: "lookup",
      placeholder: "Article title",
    }),
    tool("dictionary", "Dictionary", "define a word", "Knowledge", {
      mode: "lookup",
      placeholder: "Word to define",
    }),
    tool("tvmaze", "TV Maze", "search tv shows", "Knowledge", {
      mode: "search",
      placeholder: "Show name",
    }),
    tool("books", "Open Library", "search books", "Knowledge", {
      mode: "search",
      placeholder: "Book title or author",
    }),
    tool("crypto", "Crypto Prices", "coin prices from coingecko", "Utility", {
      mode: "browse",
      autoLoad: true,
      placeholder: "Optional: bitcoin,ethereum,solana",
      actions: [{ id: "default", label: "Refresh", auto: true }],
    }),
    tool("weather", "Weather", "weather for any city", "Utility", {
      mode: "lookup",
      placeholder: "City name",
    }),
    tool("exchange", "Exchange Rates", "convert currencies", "Utility", {
      mode: "fields",
      fields: [
        { key: "from", label: "From", value: "USD" },
        { key: "to", label: "To", value: "EUR" },
        { key: "q", label: "Amount", value: "100" },
      ],
      actions: [{ id: "default", label: "Convert" }],
    }),
    tool("jokes", "Jokes", "random clean jokes", "Fun", {
      mode: "browse",
      autoLoad: true,
      actions: [{ id: "default", label: "New jokes", auto: true }],
    }),
    tool("advice", "Advice", "random advice slip", "Fun", {
      mode: "browse",
      autoLoad: true,
      actions: [{ id: "default", label: "New advice", auto: true }],
    }),
    tool("facts", "Random Facts", "useless but true", "Fun", {
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

  window.KobranApiRegistry = { sections: SECTIONS, byId: BY_ID, items: ITEMS };
})();
