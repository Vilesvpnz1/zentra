(function () {
  var SECTIONS = [
    {
      id: "core",
      title: "Core",
      items: [
        { id: "games-browser", name: "Category Games Browser", desc: "GN, Elite, Sea Bean, Seraph, 3kh0, All tab", href: "/games/" },
        { id: "apps-proxies", name: "Apps & Proxies", desc: "AI, browser, sandstone, proxied sites", href: "/apps/" },
        { id: "ultimate-game-stash", name: "Ultimate Game Stash", desc: "UGS single-file browser", href: "/ultimate-game-stash/" },
      ],
    },
    {
      id: "proxy",
      title: "Proxy",
      items: [
        { id: "sail-proxy", name: "Sail Proxy", desc: "Scramjet browser with tabs", href: "/sail/" },
        { id: "sail-embed", name: "Sail Embed", desc: "Proxied game embed frame", href: "/sail/embed/" },
        { id: "proxy-select", name: "Proxy Select", desc: "Pick proxy mode", href: "/proxy-select/" },
      ],
    },
    {
      id: "tools",
      title: "Tools",
      items: [
        { id: "minecraft-tools", name: "Minecraft Tools", desc: "Tick calc, give, color generators", href: "/minecraft-tools/" },
        { id: "math-tools", name: "Math Tools", desc: "Calculator utilities", href: "/tools/math-tools/" },
        { id: "refined-beta", name: "Refined Beta", desc: "Custom minigames", href: "/refined-beta/" },
      ],
    },
    {
      id: "extra",
      title: "Extra",
      items: [
        { id: "vm-selector", name: "VM Selector", desc: "Hyperbeam remote browser VM", href: "/vms/" },
        { id: "secret-code", name: "Secret Code Menu", desc: "Unlock hidden pages", href: "/assets/secret-code-popup.html" },
      ],
    },
    {
      id: "info",
      title: "Info",
      items: [
        { id: "partners", name: "Partners", desc: "Partner listings", href: "/partners/" },
        { id: "terms", name: "Terms of Service", desc: "Rules for using Kritikal", href: "/terms/" },
        { id: "privacy", name: "Privacy Policy", desc: "How we handle your data", href: "/privacy-policy/" },
      ],
    },
  ];

  function hubSectionVisible(sectionId) {
    if (window.ZentraSiteConfig && window.ZentraSiteConfig.layoutVisible) {
      return window.ZentraSiteConfig.layoutVisible("hubSections", sectionId);
    }
    return true;
  }

  function hubItemVisible(itemId) {
    if (window.ZentraSiteConfig && window.ZentraSiteConfig.layoutVisible) {
      return window.ZentraSiteConfig.layoutVisible("hubItems", itemId);
    }
    return true;
  }

  function renderHub() {
    var root = document.getElementById("hub-grid");
    if (!root) return;
    root.innerHTML = "";
    var hasContent = false;
    SECTIONS.forEach(function (section) {
      if (!hubSectionVisible(section.id)) return;
      var visibleItems = section.items.filter(function (item) {
        return hubItemVisible(item.id);
      });
      if (!visibleItems.length) return;
      hasContent = true;
      var block = document.createElement("div");
      block.className = "hub__section";
      var head = document.createElement("h3");
      head.className = "hub__section-title";
      head.textContent = section.title;
      block.appendChild(head);
      var grid = document.createElement("div");
      grid.className = "hub__grid";
      visibleItems.forEach(function (item) {
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
    if (!hasContent) {
      root.innerHTML = '<p class="hub__empty">No hub links are visible right now.</p>';
    }
  }

  window.KritikalHub = { render: renderHub, sections: SECTIONS };
  window.addEventListener("zentra-site-config", renderHub);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderHub);
  } else {
    renderHub();
  }
})();
