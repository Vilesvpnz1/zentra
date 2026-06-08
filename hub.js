(function () {
  var SECTIONS = [
    {
      title: "core",
      items: [
        { name: "Category Games Browser", desc: "GN, Elite, Sea Bean, Seraph, 3kh0, All tab", href: "/games/" },
        { name: "Apps & Proxies", desc: "Bloxy AI, Dominum Browser, Sandstone, proxied sites", href: "/apps/" },
        { name: "Featured Games", desc: "curated picks", href: "/featured-games/" },
        { name: "Ultimate Game Stash", desc: "UGS single-file browser", href: "/ultimate-game-stash/" },
      ],
    },
    {
      title: "proxy",
      items: [
        { name: "Sail Proxy", desc: "Scramjet browser with tabs", href: "/sail/" },
        { name: "Sail Embed", desc: "proxied game embed frame", href: "/sail/embed/" },
        { name: "Proxy Select", desc: "pick proxy mode", href: "/proxy-select/" },
      ],
    },
    {
      title: "tools",
      items: [
        { name: "Tools Hub", desc: "math + minecraft entry", href: "/tools/" },
        { name: "Minecraft Tools", desc: "tick calc, give, color generators", href: "/minecraft-tools/" },
        { name: "Math Tools", desc: "calculator utilities", href: "/tools/math-tools/" },
        { name: "Refined Beta", desc: "custom minigames", href: "/refined-beta/" },
      ],
    },
    {
      title: "secret & social",
      items: [
        { name: "VM Selector", desc: "Hyperbeam + browser.lol", href: "/vms/" },
        { name: "Secret Code Menu", desc: "unlock hidden pages", href: "/assets/secret-code-popup.html" },
        { name: "Support", desc: "help desk iframe", href: "/iframe-sites/kritikal-ubg-support/" },
        { name: "Community Chat", desc: "Discord / Vortex chat iframe", href: "/iframe-sites/kritikal-ubg-chat/" },
        { name: "Padlet", desc: "comments and announcements", href: "/assets/padlet.html" },
        { name: "Events", desc: "site events page", href: "/events/" },
      ],
    },
    {
      title: "info",
      items: [
        { name: "Updates", desc: "patch log", href: "/updates/" },
        { name: "Partners", desc: "partner listings", href: "/partners/" },
        { name: "Terms", desc: "terms of service", href: "/terms/" },
        { name: "Privacy", desc: "privacy policy", href: "/privacy-policy/" },
        { name: "DMCA", desc: "takedown requests", href: "/request-dmca/" },
        { name: "Invite", desc: "invite landing", href: "/invite/" },
      ],
    },
  ];

  function renderHub() {
    var root = document.getElementById("hub-grid");
    if (!root || root.dataset.ready === "1") return;
    root.dataset.ready = "1";
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

  window.KritikalHub = { render: renderHub };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderHub);
  } else {
    renderHub();
  }
})();
