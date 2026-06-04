(function () {
  const gate = document.getElementById("admin-gate");
  const panel = document.getElementById("admin-panel");
  const gateForm = document.getElementById("gate-form");
  const gateKey = document.getElementById("gate-key");
  const gateError = document.getElementById("gate-error");
  const gateBtn = gateForm ? gateForm.querySelector('button[type="submit"]') : null;
  const logoutBtn = document.getElementById("admin-logout");
  const tabs = document.querySelectorAll(".admin-tab");
  const tabGames = document.getElementById("tab-games");
  const tabAnn = document.getElementById("tab-announcements");
  const tabLog = document.getElementById("tab-changelog");
  const tabChat = document.getElementById("tab-chat");
  const chatTableBody = document.getElementById("chat-table-body");
  const chatPurgeForm = document.getElementById("chat-purge-form");
  const chatClearAll = document.getElementById("chat-clear-all");
  const chatRefresh = document.getElementById("chat-refresh");
  const chatToggleHwid = document.getElementById("chat-toggle-hwid");
  const gamesList = document.getElementById("games-list");
  const gamesTotal = document.getElementById("games-total");
  const gamesFilter = document.getElementById("games-filter");
  const gameModal = document.getElementById("game-modal");
  const gameForm = document.getElementById("game-form");
  const gameReset = document.getElementById("game-reset");
  const gameImageInput = document.getElementById("game-image");
  const gameImageClear = document.getElementById("game-image-clear");
  const gameThumbPreview = document.getElementById("game-thumb-preview");
  const annList = document.getElementById("ann-list");
  const annNew = document.getElementById("ann-new");
  const annModal = document.getElementById("ann-modal");
  const annForm = document.getElementById("ann-form");
  const annModalTitle = document.getElementById("ann-modal-title");
  const annDateHint = document.getElementById("ann-date-hint");
  const logList = document.getElementById("log-list");
  const logNew = document.getElementById("log-new");
  const logForm = document.getElementById("log-form");
  const logModalTitle = document.getElementById("log-modal-title");
  const logDateHint = document.getElementById("log-date-hint");

  const S = window.KritikalStore;
  if (!S) return;

  let adminGames = [];
  let baseGames = [];
  let overrides = {};
  let announcements = [];
  let changelogEntries = [];
  let blacklistRows = [];
  let revealChatHwid = false;

  function showGate() {
    gate.classList.remove("admin-gate--hide");
    panel.classList.add("admin-panel--hide");
    gate.hidden = false;
    panel.hidden = true;
  }

  function showPanel() {
    gate.classList.add("admin-gate--hide");
    panel.classList.remove("admin-panel--hide");
    gate.hidden = true;
    panel.hidden = false;
    loadAdminData();
  }

  function openModal(id) {
    const el = document.getElementById(id);
    if (el) {
      el.hidden = false;
      el.classList.add("admin-modal--open");
    }
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) {
      el.hidden = true;
      el.classList.remove("admin-modal--open");
    }
  }

  document.querySelectorAll("[data-close]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      closeModal(btn.getAttribute("data-close"));
    });
  });

  function setGateLoading(on) {
    if (gateBtn) {
      gateBtn.disabled = on;
      gateBtn.textContent = on ? "Checking…" : "Unlock panel";
    }
  }

  function loadAdminData() {
    gamesTotal.textContent = "Loading…";
    S.getAdminGames()
      .then(function (data) {
        adminGames = data.games || [];
        baseGames = data.base || [];
        overrides = data.overrides || {};
        renderGames();
        return S.getAnnouncements();
      })
      .then(function (list) {
        announcements = list || [];
        renderAnnouncements();
        return S.getChangelog();
      })
      .then(function (list) {
        changelogEntries = list || [];
        renderChangelogAdmin();
        return S.getAdminBlacklist();
      })
      .then(function (list) {
        blacklistRows = list || [];
        renderChatAdmin();
      })
      .catch(function () {
        gamesTotal.textContent = "Failed to load data";
        gamesList.innerHTML = '<p class="admin-empty">Could not load games. Refresh the page.</p>';
      });
  }

  S.checkSession()
    .then(function (data) {
      if (data.authed) showPanel();
      else showGate();
    })
    .catch(function () {
      showGate();
    });

  gateForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const key = gateKey.value.trim();
    if (!key) return;
    gateError.hidden = true;
    setGateLoading(true);
    S.login(key)
      .then(function () {
        gateKey.value = "";
        showPanel();
      })
      .catch(function () {
        gateError.hidden = false;
        gateKey.focus();
      })
      .finally(function () {
        setGateLoading(false);
      });
  });

  logoutBtn.addEventListener("click", function () {
    S.logout().finally(showGate);
  });

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (t) {
        t.classList.remove("admin-tab--active");
      });
      tab.classList.add("admin-tab--active");
      const name = tab.getAttribute("data-tab");
      tabGames.hidden = name !== "games";
      tabAnn.hidden = name !== "announcements";
      if (tabLog) tabLog.hidden = name !== "changelog";
      if (tabChat) tabChat.hidden = name !== "chat";
      if (name === "chat") renderChatAdmin();
    });
  });

  function blacklistMap() {
    const map = new Map();
    blacklistRows.forEach(function (row) {
      if (!row || !row.hwid) return;
      map.set(String(row.hwid), {
        chatBlocked: Boolean(row.chatBlocked),
        siteBlocked: Boolean(row.siteBlocked),
      });
    });
    return map;
  }

  function renderChatAdmin() {
    if (!chatTableBody) return;
    chatTableBody.innerHTML = '<tr><td colspan="5">Loading…</td></tr>';
    S.getAdminChatMessages()
      .then(function (rows) {
        chatTableBody.innerHTML = "";
        if (!rows || !rows.length) {
          chatTableBody.innerHTML = '<tr><td colspan="5">No messages yet.</td></tr>';
          return;
        }
        const sorted = rows.slice().sort(function (a, b) {
          return Number(b.ts || 0) - Number(a.ts || 0);
        });
        const blMap = blacklistMap();
        sorted.slice(0, 120).forEach(function (m) {
          const tr = document.createElement("tr");
          const tdT = document.createElement("td");
          tdT.textContent = new Date(m.ts).toLocaleString();
          const tdN = document.createElement("td");
          tdN.textContent = m.name || "";
          const tdX = document.createElement("td");
          tdX.className = "admin-table__msg";
          tdX.textContent = m.text || "";
          const tdH = document.createElement("td");
          tdH.className = "admin-table__msg";
          const hwid = String(m.deviceHwid || "");
          tdH.textContent = revealChatHwid ? hwid || "none" : hwid ? "hidden" : "none";
          const tdB = document.createElement("td");
          tdB.className = "admin-table__actions";
          const del = document.createElement("button");
          del.type = "button";
          del.className = "admin-btn admin-btn--ghost admin-btn--sm";
          del.textContent = "Delete";
          del.addEventListener("click", function () {
            S.deleteAdminChatMessage(m.id).then(renderChatAdmin);
          });
          tdB.appendChild(del);
          if (hwid) {
            const state = blMap.get(hwid) || { chatBlocked: false, siteBlocked: false };
            const chatBtn = document.createElement("button");
            chatBtn.type = "button";
            chatBtn.className = "admin-btn admin-btn--ghost admin-btn--sm";
            chatBtn.textContent = state.chatBlocked ? "Unblock chat" : "Block chat";
            chatBtn.addEventListener("click", function () {
              S.setBlacklist(hwid, "chat", !state.chatBlocked).then(function () {
                return S.getAdminBlacklist();
              }).then(function (list) {
                blacklistRows = list || [];
                renderChatAdmin();
              });
            });
            const siteBtn = document.createElement("button");
            siteBtn.type = "button";
            siteBtn.className = "admin-btn admin-btn--ghost admin-btn--sm";
            siteBtn.textContent = state.siteBlocked ? "Unblock site" : "Block site";
            siteBtn.addEventListener("click", function () {
              S.setBlacklist(hwid, "site", !state.siteBlocked).then(function () {
                return S.getAdminBlacklist();
              }).then(function (list) {
                blacklistRows = list || [];
                renderChatAdmin();
              });
            });
            tdB.appendChild(chatBtn);
            tdB.appendChild(siteBtn);
          }
          tr.append(tdT, tdN, tdX, tdH, tdB);
          chatTableBody.appendChild(tr);
        });
      })
      .catch(function () {
        chatTableBody.innerHTML = '<tr><td colspan="5">Could not load messages.</td></tr>';
      });
  }

  if (chatPurgeForm) {
    chatPurgeForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const fd = new FormData(chatPurgeForm);
      const count = Number(fd.get("count"));
      if (!Number.isInteger(count) || count <= 0) return;
      S.purgeAdminChatMessages(count).then(renderChatAdmin);
    });
  }

  if (chatClearAll) {
    chatClearAll.addEventListener("click", function () {
      S.purgeAdminChatMessages("all").then(renderChatAdmin);
    });
  }

  if (chatRefresh) {
    chatRefresh.addEventListener("click", renderChatAdmin);
  }

  if (chatToggleHwid) {
    chatToggleHwid.addEventListener("click", function () {
      revealChatHwid = !revealChatHwid;
      chatToggleHwid.textContent = revealChatHwid ? "Hide HWID" : "Show HWID";
      renderChatAdmin();
    });
  }

  function isEdited(id) {
    return !!overrides[id];
  }

  function renderGames() {
    const q = (gamesFilter.value || "").trim().toLowerCase();
    gamesTotal.textContent = adminGames.length + " games in library";
    gamesList.innerHTML = "";
    const filtered = adminGames.filter(function (g) {
      if (!q) return true;
      const hay = (g.search || S.buildSearch(g)).toLowerCase();
      return hay.includes(q) || g.title.toLowerCase().includes(q) || g.id.toLowerCase().includes(q);
    });
    if (!filtered.length) {
      gamesList.innerHTML = '<p class="admin-empty">No games match your filter.</p>';
      return;
    }
    filtered.forEach(function (game) {
      const row = document.createElement("div");
      row.className = "admin-game";
      const img = document.createElement("img");
      img.className = "admin-game__thumb";
      img.alt = "";
      const thumb = effectiveThumbForGame(game);
      if (thumb) {
        img.src = thumbSrc(thumb);
      }
      img.addEventListener("error", function () {
        img.style.display = "none";
      });
      const info = document.createElement("div");
      info.className = "admin-game__info";
      const title = document.createElement("p");
      title.className = "admin-game__title";
      title.textContent = game.title;
      const meta = document.createElement("p");
      meta.className = "admin-game__meta";
      meta.textContent = game.id + " · " + game.path;
      info.append(title, meta);
      const tag = document.createElement("span");
      tag.className = "admin-game__tag" + (isEdited(game.id) ? " admin-game__tag--edited" : "");
      tag.textContent = isEdited(game.id) ? "Edited" : "Default";
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "admin-btn admin-btn--ghost admin-btn--sm";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", function () {
        openGameEditor(game);
      });
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "admin-btn admin-btn--danger admin-btn--sm";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", function () {
        if (!confirm('Delete "' + game.title + '" from the library? This cannot be undone.')) return;
        S.deleteGame(game.id)
          .then(function (data) {
            adminGames = data.games || [];
            overrides = data.overrides || {};
            renderGames();
          })
          .catch(function () {
            alert("Could not delete game.");
          });
      });
      const actions = document.createElement("div");
      actions.className = "admin-game__actions";
      actions.append(editBtn, delBtn);
      row.append(img, info, tag, actions);
      gamesList.append(row);
    });
  }

  gamesFilter.addEventListener("input", renderGames);

  function thumbSrc(raw) {
    const u = String(raw || "").trim();
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u;
    return "/" + u.replace(/^\/+/, "");
  }

  function getBaseGame(id) {
    for (let i = 0; i < baseGames.length; i++) {
      if (baseGames[i].id === id) return baseGames[i];
    }
    return null;
  }

  function effectiveThumbForGame(game) {
    const ov = overrides[game.id] || {};
    if (ov.image) return ov.image;
    const base = getBaseGame(game.id);
    return (base && base.image) || game.image || "";
  }

  function updateGameThumbPreview(id) {
    if (!gameThumbPreview) return;
    const base = getBaseGame(id);
    const ov = overrides[id] || {};
    const overrideUrl = (gameImageInput && gameImageInput.value.trim()) || ov.image || "";
    const fallback = (base && base.image) || "";
    const show = overrideUrl || fallback;
    if (!show) {
      gameThumbPreview.hidden = true;
      gameThumbPreview.removeAttribute("src");
      return;
    }
    gameThumbPreview.hidden = false;
    gameThumbPreview.src = thumbSrc(overrideUrl || fallback);
    gameThumbPreview.onerror = function () {
      if (overrideUrl && fallback && overrideUrl !== fallback) {
        gameThumbPreview.src = thumbSrc(fallback);
        return;
      }
      gameThumbPreview.hidden = true;
    };
  }

  if (gameImageInput) {
    gameImageInput.addEventListener("input", function () {
      updateGameThumbPreview(document.getElementById("game-id").value);
    });
  }

  if (gameImageClear) {
    gameImageClear.addEventListener("click", function () {
      if (gameImageInput) gameImageInput.value = "";
      updateGameThumbPreview(document.getElementById("game-id").value);
    });
  }

  function openGameEditor(game) {
    document.getElementById("game-id").value = game.id;
    document.getElementById("game-title").value = game.title || "";
    document.getElementById("game-path").value = game.path || "";
    document.getElementById("game-file").value = game.file || "";
    const ov = overrides[game.id] || {};
    if (gameImageInput) gameImageInput.value = ov.image || "";
    document.getElementById("game-search").value = game.search || S.buildSearch(game);
    document.getElementById("game-modal-title").textContent = "Edit · " + game.title;
    updateGameThumbPreview(game.id);
    openModal("game-modal");
  }

  gameForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const id = document.getElementById("game-id").value;
    const payload = {
      title: document.getElementById("game-title").value.trim(),
      path: document.getElementById("game-path").value.trim(),
      file: document.getElementById("game-file").value.trim(),
      image: gameImageInput ? gameImageInput.value.trim() : "",
      search: document.getElementById("game-search").value.trim(),
    };
    S.saveGame(id, payload)
      .then(function (data) {
        overrides = data.overrides || overrides;
        const idx = adminGames.findIndex(function (g) {
          return g.id === id;
        });
        if (idx !== -1) adminGames[idx] = data.game;
        closeModal("game-modal");
        renderGames();
      })
      .catch(function () {
        alert("Could not save game.");
      });
  });

  gameReset.addEventListener("click", function () {
    const id = document.getElementById("game-id").value;
    if (!id) return;
    if (!confirm("Reset this game to default info?")) return;
    S.resetGame(id)
      .then(function (data) {
        overrides = data.overrides || overrides;
        const idx = adminGames.findIndex(function (g) {
          return g.id === id;
        });
        if (idx !== -1) adminGames[idx] = data.game;
        closeModal("game-modal");
        renderGames();
      })
      .catch(function () {
        alert("Could not reset game.");
      });
  });

  function renderAnnouncements() {
    annList.innerHTML = "";
    if (!announcements.length) {
      annList.innerHTML = '<p class="admin-empty">No announcements yet. Create one to show it on the main site.</p>';
      return;
    }
    announcements.forEach(function (ann) {
      const card = document.createElement("article");
      card.className = "admin-ann";
      let imgEl;
      if (ann.image) {
        imgEl = document.createElement("img");
        imgEl.className = "admin-ann__img";
        imgEl.alt = "";
        imgEl.src = ann.image.startsWith("http") ? ann.image : "/" + ann.image.replace(/^\//, "");
        imgEl.addEventListener("error", function () {
          imgEl.replaceWith(makeEmptyImg());
        });
      } else {
        imgEl = makeEmptyImg();
      }
      const body = document.createElement("div");
      body.className = "admin-ann__body";
      const h = document.createElement("h3");
      h.className = "admin-ann__title";
      h.textContent = ann.title;
      body.append(h);
      if (ann.subtitle) {
        const sub = document.createElement("p");
        sub.className = "admin-ann__sub";
        sub.textContent = ann.subtitle;
        body.append(sub);
      }
      if (ann.description) {
        const desc = document.createElement("p");
        desc.className = "admin-ann__desc";
        desc.textContent = ann.description;
        body.append(desc);
      }
      const date = document.createElement("p");
      date.className = "admin-ann__date";
      date.textContent = "Posted " + S.formatDate(ann.createdAt);
      if (ann.updatedAt) date.textContent += " · Edited " + S.formatDate(ann.updatedAt);
      body.append(date);
      const actions = document.createElement("div");
      actions.className = "admin-ann__actions";
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "admin-btn admin-btn--ghost admin-btn--sm";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", function () {
        openAnnEditor(ann);
      });
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "admin-btn admin-btn--danger admin-btn--sm";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", function () {
        if (!confirm("Delete this announcement?")) return;
        S.deleteAnnouncement(ann.id)
          .then(function () {
            announcements = announcements.filter(function (a) {
              return a.id !== ann.id;
            });
            renderAnnouncements();
          })
          .catch(function () {
            alert("Could not delete announcement.");
          });
      });
      actions.append(editBtn, delBtn);
      card.append(imgEl, body, actions);
      annList.append(card);
    });
  }

  function makeEmptyImg() {
    const d = document.createElement("div");
    d.className = "admin-ann__img admin-ann__img--empty";
    d.textContent = "No image";
    return d;
  }

  function openAnnEditor(ann) {
    if (ann) {
      annModalTitle.textContent = "Edit announcement";
      document.getElementById("ann-id").value = ann.id;
      document.getElementById("ann-title").value = ann.title || "";
      document.getElementById("ann-subtitle").value = ann.subtitle || "";
      document.getElementById("ann-description").value = ann.description || "";
      document.getElementById("ann-image").value = ann.image || "";
      annDateHint.textContent = "Posted " + S.formatDate(ann.createdAt);
    } else {
      annModalTitle.textContent = "New announcement";
      document.getElementById("ann-id").value = "";
      document.getElementById("ann-title").value = "";
      document.getElementById("ann-subtitle").value = "";
      document.getElementById("ann-description").value = "";
      document.getElementById("ann-image").value = "";
      annDateHint.textContent = "Date will be set when you save.";
    }
    openModal("ann-modal");
  }

  annNew.addEventListener("click", function () {
    openAnnEditor(null);
  });

  annForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const title = document.getElementById("ann-title").value.trim();
    if (!title) return;
    const payload = {
      title: title,
      subtitle: document.getElementById("ann-subtitle").value.trim(),
      description: document.getElementById("ann-description").value.trim(),
      image: document.getElementById("ann-image").value.trim(),
    };
    const id = document.getElementById("ann-id").value;
    const req = id ? S.updateAnnouncement(id, payload) : S.createAnnouncement(payload);
    req
      .then(function (item) {
        if (id) {
          const idx = announcements.findIndex(function (a) {
            return a.id === id;
          });
          if (idx !== -1) announcements[idx] = item;
        } else {
          announcements.unshift(item);
        }
        announcements.sort(function (a, b) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        closeModal("ann-modal");
        renderAnnouncements();
      })
      .catch(function () {
        alert("Could not save announcement.");
      });
  });

  function renderChangelogAdmin() {
    if (!logList) return;
    logList.innerHTML = "";
    if (!changelogEntries.length) {
      logList.innerHTML = '<p class="admin-empty">No changelog entries yet. Create one to show it on the main site.</p>';
      return;
    }
    changelogEntries.forEach(function (entry) {
      const card = document.createElement("article");
      card.className = "admin-ann";
      const body = document.createElement("div");
      body.className = "admin-ann__body";
      const h = document.createElement("h3");
      h.className = "admin-ann__title";
      h.textContent = entry.title;
      body.append(h);
      if (entry.message) {
        const msg = document.createElement("p");
        msg.className = "admin-ann__desc";
        msg.textContent = entry.message;
        body.append(msg);
      }
      const date = document.createElement("p");
      date.className = "admin-ann__date";
      date.textContent = "Posted " + S.formatDate(entry.createdAt);
      if (entry.updatedAt) date.textContent += " · Edited " + S.formatDate(entry.updatedAt);
      body.append(date);
      const actions = document.createElement("div");
      actions.className = "admin-ann__actions";
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "admin-btn admin-btn--ghost admin-btn--sm";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", function () {
        openLogEditor(entry);
      });
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "admin-btn admin-btn--danger admin-btn--sm";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", function () {
        if (!confirm("Delete this changelog entry?")) return;
        S.deleteChangelog(entry.id)
          .then(function () {
            changelogEntries = changelogEntries.filter(function (a) {
              return a.id !== entry.id;
            });
            renderChangelogAdmin();
          })
          .catch(function () {
            alert("Could not delete changelog entry.");
          });
      });
      actions.append(editBtn, delBtn);
      card.append(body, actions);
      logList.append(card);
    });
  }

  function openLogEditor(entry) {
    if (entry) {
      logModalTitle.textContent = "Edit changelog entry";
      document.getElementById("log-id").value = entry.id;
      document.getElementById("log-title").value = entry.title || "";
      document.getElementById("log-message").value = entry.message || "";
      logDateHint.textContent = "Posted " + S.formatDate(entry.createdAt);
    } else {
      logModalTitle.textContent = "New changelog entry";
      document.getElementById("log-id").value = "";
      document.getElementById("log-title").value = "";
      document.getElementById("log-message").value = "";
      logDateHint.textContent = "Date will be set when you save.";
    }
    openModal("log-modal");
  }

  if (logNew) {
    logNew.addEventListener("click", function () {
      openLogEditor(null);
    });
  }

  if (logForm) {
    logForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const title = document.getElementById("log-title").value.trim();
      if (!title) return;
      const payload = {
        title: title,
        message: document.getElementById("log-message").value.trim(),
      };
      const id = document.getElementById("log-id").value;
      const req = id ? S.updateChangelog(id, payload) : S.createChangelog(payload);
      req
        .then(function (item) {
          if (id) {
            const idx = changelogEntries.findIndex(function (a) {
              return a.id === id;
            });
            if (idx !== -1) changelogEntries[idx] = item;
          } else {
            changelogEntries.unshift(item);
          }
          changelogEntries.sort(function (a, b) {
            return new Date(b.createdAt) - new Date(a.createdAt);
          });
          closeModal("log-modal");
          renderChangelogAdmin();
        })
        .catch(function () {
          alert("Could not save changelog entry.");
        });
    });
  }

  const importOpen = document.getElementById("game-import-open");
  const importForm = document.getElementById("import-form");
  const pasteHtml = document.getElementById("paste-html");
  const pasteTitle = document.getElementById("paste-title");
  const pasteAdd = document.getElementById("paste-add");
  const pasteStatus = document.getElementById("paste-status");

  function runImport(payload, onDone) {
    if (pasteAdd) pasteAdd.disabled = true;
    if (pasteStatus) {
      pasteStatus.hidden = false;
      pasteStatus.textContent = "Adding game…";
      pasteStatus.className = "admin-paste__status admin-paste__status--busy";
    }
    return S.importGame(payload)
      .then(function () {
        if (pasteStatus) {
          pasteStatus.textContent = "Game added.";
          pasteStatus.className = "admin-paste__status admin-paste__status--ok";
        }
        loadAdminData();
        if (onDone) onDone();
        setTimeout(function () {
          if (pasteStatus) pasteStatus.hidden = true;
        }, 2500);
      })
      .catch(function (err) {
        if (pasteStatus) {
          pasteStatus.textContent = (err && err.message) || "Could not add game.";
          pasteStatus.className = "admin-paste__status admin-paste__status--err";
          pasteStatus.hidden = false;
        } else {
          alert((err && err.message) || "Could not add game.");
        }
      })
      .finally(function () {
        if (pasteAdd) pasteAdd.disabled = false;
      });
  }

  if (pasteAdd && pasteHtml) {
    pasteAdd.addEventListener("click", function () {
      const html = pasteHtml.value.trim();
      if (!html) {
        pasteHtml.focus();
        return;
      }
      runImport({
        html: html,
        title: pasteTitle ? pasteTitle.value.trim() : "",
        id: "",
        image: "",
      }).then(function () {
        pasteHtml.value = "";
        if (pasteTitle) pasteTitle.value = "";
      });
    });
  }

  if (importOpen) {
    importOpen.addEventListener("click", function () {
      document.getElementById("import-title").value = "";
      document.getElementById("import-id").value = "";
      document.getElementById("import-image").value = "";
      document.getElementById("import-html").value = "";
      openModal("import-modal");
    });
  }

  if (importForm) {
    importForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const html = document.getElementById("import-html").value.trim();
      if (!html) return;
      runImport({
        html: html,
        title: document.getElementById("import-title").value.trim(),
        id: document.getElementById("import-id").value.trim(),
        image: document.getElementById("import-image").value.trim(),
      }).then(function () {
        closeModal("import-modal");
        importForm.reset();
      });
    });
  }
})();
