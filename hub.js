(function () {
  var SECTIONS = [
    {
      title: "Core",
      items: [
        { name: "Category Games Browser", desc: "GN, Elite, Sea Bean, Seraph, 3kh0, All tab", href: "/games/" },
        { name: "Apps & Proxies", desc: "AI, browser, sandstone, proxied sites", href: "/apps/" },
        { name: "Featured Games", desc: "Curated picks", href: "/featured-games/" },
        { name: "Ultimate Game Stash", desc: "UGS single-file browser", href: "/ultimate-game-stash/" },
      ],
    },
    {
      title: "Proxy",
      items: [
        { name: "Sail Proxy", desc: "Scramjet browser with tabs", href: "/sail/" },
        { name: "Sail Embed", desc: "Proxied game embed frame", href: "/sail/embed/" },
        { name: "Proxy Select", desc: "Pick proxy mode", href: "/proxy-select/" },
      ],
    },
    {
      title: "Tools",
      items: [
        { name: "Minecraft Tools", desc: "Tick calc, give, color generators", href: "/minecraft-tools/" },
        { name: "Math Tools", desc: "Calculator utilities", href: "/tools/math-tools/" },
        { name: "Refined Beta", desc: "Custom minigames", href: "/refined-beta/" },
      ],
    },
    {
      title: "Extra",
      items: [
        { name: "VM Selector", desc: "Hyperbeam remote browser VM", href: "/vms/" },
        { name: "Secret Code Menu", desc: "Unlock hidden pages", href: "/assets/secret-code-popup.html" },
      ],
    },
    {
      title: "Info",
      items: [
        { name: "Partners", desc: "Partner listings", href: "/partners/" },
        { name: "Terms of Service", desc: "Rules for using Zentra", href: "/terms/" },
        { name: "Privacy Policy", desc: "How we handle your data", href: "/privacy-policy/" },
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

  window.KritikalHub = { render: renderHub, sections: SECTIONS };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderHub);
  } else {
    renderHub();
  }
})();
