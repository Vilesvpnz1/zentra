(function () {
  var openTabs = [];
  var activeTab = "list";

  function registry() {
    return window.ZentraApiRegistry || { sections: [], byId: {} };
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderGrid() {
    var root = document.getElementById("api-grid");
    if (!root) return;
    root.innerHTML = "";
    registry().sections.forEach(function (section) {
      var block = document.createElement("div");
      block.className = "hub__section";
      var head = document.createElement("h3");
      head.className = "hub__section-title";
      head.textContent = section.title;
      block.appendChild(head);
      var grid = document.createElement("div");
      grid.className = "hub__grid";
      section.items.forEach(function (item) {
        var card = document.createElement("button");
        card.type = "button";
        card.className = "hub__card api-card";
        card.dataset.apiId = item.id;
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
    root.querySelectorAll(".api-card").forEach(function (card) {
      card.addEventListener("click", function () {
        openApiTab(card.dataset.apiId);
      });
    });
  }

  function renderTabs() {
    var bar = document.getElementById("api-tabs");
    if (!bar) return;
    bar.innerHTML = "";
    var browse = document.createElement("button");
    browse.type = "button";
    browse.className = "api-tabs__btn" + (activeTab === "list" ? " api-tabs__btn--active" : "");
    browse.dataset.apiTab = "list";
    browse.textContent = "Browse";
    bar.appendChild(browse);
    openTabs.forEach(function (id) {
      var api = registry().byId[id];
      if (!api) return;
      var wrap = document.createElement("span");
      wrap.className = "api-tabs__item";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "api-tabs__btn" + (activeTab === id ? " api-tabs__btn--active" : "");
      btn.dataset.apiTab = id;
      btn.textContent = api.name;
      var close = document.createElement("button");
      close.type = "button";
      close.className = "api-tabs__close";
      close.dataset.apiClose = id;
      close.setAttribute("aria-label", "Close tab");
      close.textContent = "×";
      wrap.append(btn, close);
      bar.appendChild(wrap);
    });
    bar.querySelectorAll(".api-tabs__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        switchTab(btn.dataset.apiTab);
      });
    });
    bar.querySelectorAll(".api-tabs__close").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        closeApiTab(btn.dataset.apiClose);
      });
    });
  }

  function switchTab(id) {
    activeTab = id || "list";
    renderTabs();
    var list = document.getElementById("api-view-list");
    var workspaces = document.getElementById("api-workspaces");
    if (list) list.hidden = activeTab !== "list";
    if (workspaces) {
      workspaces.querySelectorAll(".api-workspace").forEach(function (panel) {
        panel.hidden = panel.dataset.apiId !== activeTab;
      });
    }
  }

  function renderResultCard(item, tool) {
    var card = document.createElement("article");
    card.className = "api-result";
    if (item.image) {
      var img = document.createElement("img");
      img.className = "api-result__img";
      img.src = item.image;
      img.alt = "";
      img.loading = "lazy";
      card.appendChild(img);
    }
    var body = document.createElement("div");
    body.className = "api-result__body";
    var title = document.createElement("h4");
    title.className = "api-result__title";
    title.textContent = item.title || "Result";
    body.appendChild(title);
    if (item.subtitle) {
      var sub = document.createElement("p");
      sub.className = "api-result__sub";
      sub.textContent = item.subtitle;
      body.appendChild(sub);
    }
    if (item.meta) {
      var meta = document.createElement("p");
      meta.className = "api-result__meta";
      meta.textContent = item.meta;
      body.appendChild(meta);
    }
    if (item.details && item.details.length) {
      var dl = document.createElement("dl");
      dl.className = "api-result__details";
      item.details.forEach(function (row) {
        if (!row || !row.label) return;
        var dt = document.createElement("dt");
        dt.textContent = row.label;
        var dd = document.createElement("dd");
        dd.textContent = row.value != null ? row.value : "—";
        dl.appendChild(dt);
        dl.appendChild(dd);
      });
      if (dl.childNodes.length) body.appendChild(dl);
    }
    if (item.tags && item.tags.length) {
      var tags = document.createElement("div");
      tags.className = "api-result__tags";
      item.tags.forEach(function (tag) {
        var chip = document.createElement("span");
        chip.className = "api-result__tag";
        chip.textContent = tag;
        tags.appendChild(chip);
      });
      body.appendChild(tags);
    }
    if (item.body) {
      var text = document.createElement("p");
      text.className = "api-result__text";
      text.textContent = item.body;
      body.appendChild(text);
    }
    var actions = document.createElement("div");
    actions.className = "api-result__actions";
    if (tool.play && item.playId && window.ZentraMusicPlayer) {
      var playBtn = document.createElement("button");
      playBtn.type = "button";
      playBtn.className = "api-result__btn";
      playBtn.textContent = "Play";
      playBtn.addEventListener("click", function () {
        window.ZentraMusicPlayer.playTrack(
          { id: item.playId, title: item.title, user: { name: item.subtitle || "" }, artwork: { "150x150": item.image || "" } },
          [{ id: item.playId, title: item.title, user: { name: item.subtitle || "" }, artwork: { "150x150": item.image || "" } }],
          0
        );
      });
      actions.appendChild(playBtn);
    }
    if (item.url) {
      var link = document.createElement("a");
      link.className = "api-result__link";
      link.href = item.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Open";
      actions.appendChild(link);
    }
    if (actions.childNodes.length) body.appendChild(actions);
    card.appendChild(body);
    return card;
  }

  function runTool(panel, tool, actionId) {
    var status = panel.querySelector(".api-workspace__status");
    var results = panel.querySelector(".api-results");
    var params = new URLSearchParams();
    params.set("action", actionId || "default");
    if (tool.mode === "fields" && tool.fields) {
      tool.fields.forEach(function (field) {
        var input = panel.querySelector('.api-workspace__field[data-field-key="' + field.key + '"]');
        var val = input ? input.value.trim() : field.value || "";
        if (field.key === "q") params.set("q", val);
        else params.set(field.key, val);
      });
    } else {
      var search = panel.querySelector(".api-workspace__search");
      var q = search ? search.value.trim() : "";
      if (q) params.set("q", q);
    }
    if (status) status.textContent = "Loading…";
    if (results) results.innerHTML = "";
    fetch("/api/tools/" + encodeURIComponent(tool.id) + "?" + params.toString())
      .then(function (res) {
        return res.text().then(function (text) {
          var payload = {};
          try {
            payload = JSON.parse(text);
          } catch (e) {
            throw new Error("bad_json");
          }
          return { ok: res.ok, payload: payload };
        });
      })
      .then(function (result) {
        var payload = result.payload || {};
        var items = Array.isArray(payload.items) ? payload.items : [];
        if (!items.length) {
          if (status) status.textContent = payload.error || "No results";
          if (results) {
            results.innerHTML =
              '<p class="api-results__empty">' +
              escapeHtml(payload.error || "Nothing found. Try a different search.") +
              "</p>";
          }
          return;
        }
        if (status) status.textContent = items.length + " result" + (items.length === 1 ? "" : "s");
        if (!results) return;
        items.forEach(function (item) {
          results.appendChild(renderResultCard(item, tool));
        });
      })
      .catch(function () {
        if (status) status.textContent = "Something went wrong";
        if (results) {
          results.innerHTML =
            '<p class="api-results__empty">Could not load results. Refresh the page or restart the site server.</p>';
        }
      });
  }

  function ensureWorkspace(id) {
    var tool = registry().byId[id];
    var root = document.getElementById("api-workspaces");
    if (!tool || !root) return null;
    var existing = root.querySelector('.api-workspace[data-api-id="' + id + '"]');
    if (existing) return existing;

    var panel = document.createElement("div");
    panel.className = "api-workspace glass-panel";
    panel.dataset.apiId = id;
    panel.innerHTML =
      '<div class="glass-panel__body api-workspace__body">' +
      '<div class="api-workspace__head">' +
      "<div><h3 class=\"api-workspace__title\">" +
      escapeHtml(tool.name) +
      '</h3><p class="api-workspace__desc">' +
      escapeHtml(tool.desc) +
      "</p></div></div>" +
      '<div class="api-workspace__controls"></div>' +
      '<div class="api-workspace__row">' +
      '<span class="api-workspace__status" aria-live="polite"></span>' +
      "</div>" +
      '<div class="api-results" role="list"></div>' +
      "</div>";

    var controls = panel.querySelector(".api-workspace__controls");
    var activeAction = "default";

    if (tool.mode === "fields" && tool.fields) {
      tool.fields.forEach(function (field) {
        var label = document.createElement("label");
        label.className = "api-workspace__label";
        label.textContent = field.label || field.key;
        var input = document.createElement("input");
        input.type = "text";
        input.className = "api-workspace__input api-workspace__field";
        input.dataset.fieldKey = field.key;
        input.value = field.value || "";
        controls.append(label, input);
      });
    } else if (tool.mode !== "browse") {
      var searchLabel = document.createElement("label");
      searchLabel.className = "api-workspace__label";
      searchLabel.textContent = tool.mode === "lookup" ? "Lookup" : "Search";
      var searchInput = document.createElement("input");
      searchInput.type = "search";
      searchInput.className = "api-workspace__input api-workspace__search";
      searchInput.placeholder = tool.placeholder || "Search…";
      searchInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") runTool(panel, tool, activeAction);
      });
      controls.append(searchLabel, searchInput);
    } else if (tool.placeholder) {
      var optional = document.createElement("input");
      optional.type = "search";
      optional.className = "api-workspace__input api-workspace__search";
      optional.placeholder = tool.placeholder;
      controls.appendChild(optional);
    }

    var actions = tool.actions && tool.actions.length ? tool.actions : [{ id: "default", label: tool.mode === "browse" ? "Load" : "Go" }];
    var actionRow = document.createElement("div");
    actionRow.className = "api-workspace__actions";
    actions.forEach(function (action, index) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "api-workspace__run" + (index === 0 ? " api-workspace__run--active" : "");
      btn.textContent = action.label;
      btn.dataset.actionId = action.id || "default";
      btn.addEventListener("click", function () {
        activeAction = action.id || "default";
        actionRow.querySelectorAll(".api-workspace__run").forEach(function (el) {
          el.classList.toggle("api-workspace__run--active", el === btn);
        });
        runTool(panel, tool, activeAction);
      });
      actionRow.appendChild(btn);
    });
    controls.appendChild(actionRow);

    root.appendChild(panel);

    if (tool.autoLoad) {
      var auto = actions.find(function (a) {
        return a.auto;
      });
      runTool(panel, tool, auto ? auto.id : "default");
    }

    return panel;
  }

  function openApiTab(id) {
    if (!registry().byId[id]) return;
    if (openTabs.indexOf(id) === -1) openTabs.push(id);
    ensureWorkspace(id);
    switchTab(id);
  }

  function closeApiTab(id) {
    openTabs = openTabs.filter(function (tabId) {
      return tabId !== id;
    });
    var panel = document.querySelector('.api-workspace[data-api-id="' + id + '"]');
    if (panel) panel.remove();
    if (activeTab === id) switchTab(openTabs.length ? openTabs[openTabs.length - 1] : "list");
    else renderTabs();
  }

  function resetTabs() {
    openTabs = [];
    activeTab = "list";
    var workspaces = document.getElementById("api-workspaces");
    if (workspaces) workspaces.innerHTML = "";
    switchTab("list");
  }

  window.KritikalApi = {
    render: function () {
      renderGrid();
      renderTabs();
      switchTab(activeTab);
    },
    openApi: openApiTab,
    reset: resetTabs,
  };
  window.KritikalTools = window.KritikalApi;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderGrid);
  } else {
    renderGrid();
  }
})();
