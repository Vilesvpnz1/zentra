(function () {
  const gate = document.getElementById("admin-gate");
  const panel = document.getElementById("admin-panel");
  const gateForm = document.getElementById("gate-form");
  const gateUser = document.getElementById("gate-user");
  const gatePass = document.getElementById("gate-pass");
  const gateError = document.getElementById("gate-error");
  const gateBtn = gateForm ? gateForm.querySelector('button[type="submit"]') : null;
  const adminTopBadge = document.getElementById("admin-top-badge");
  const logoutBtn = document.getElementById("admin-logout");
  const tabs = document.querySelectorAll(".admin-tab");
  const tabGames = document.getElementById("tab-games");
  const tabDash = document.getElementById("tab-dashboard");
  const tabAnn = document.getElementById("tab-announcements");
  const tabLog = document.getElementById("tab-changelog");
  const tabChat = document.getElementById("tab-chat");
  const tabUsers = document.getElementById("tab-users");
  const tabBlacklist = document.getElementById("tab-blacklist");
  const tabSecurity = document.getElementById("tab-security");
  const tabKobranHub = document.getElementById("tab-kobran-hub");
  const tabFeatures = document.getElementById("tab-features");
  const tabSystem = document.getElementById("tab-system");
  const chatTableBody = document.getElementById("chat-table-body");
  const chatPurgeForm = document.getElementById("chat-purge-form");
  const chatClearAll = document.getElementById("chat-clear-all");
  const chatRefresh = document.getElementById("chat-refresh");
  const chatToggleHwid = document.getElementById("chat-toggle-hwid");
  const chatServerForm = document.getElementById("chat-server-form");
  const chatServerName = document.getElementById("chat-server-name");
  const chatServerTopic = document.getElementById("chat-server-topic");
  const chatServerChannel = document.getElementById("chat-server-channel");
  const chatSlowMode = document.getElementById("chat-slow-mode");
  const chatUnpin = document.getElementById("chat-unpin");
  const featuredForm = document.getElementById("featured-form");
  const featuredTableBody = document.getElementById("featured-table-body");
  const roleTableBody = document.getElementById("role-table-body");
  const roleCreateForm = document.getElementById("role-create-form");
  const usersTableBody = document.getElementById("users-table-body");
  const usersRefresh = document.getElementById("users-refresh");
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
  const chatChannelTabs = document.getElementById("chat-channel-tabs");
  const chatServerCard = document.getElementById("admin-chat-server-card");
  const chatRolesCard = document.getElementById("admin-chat-roles-card");

  const S = window.KobranStore;
  if (!S) return;

  let adminGames = [];
  let baseGames = [];
  let overrides = {};
  let announcements = [];
  let changelogEntries = [];
  let blacklistRows = [];
  let revealChatHwid = false;
  let gamesFiltered = [];
  let gamesScrollEl = null;
  let gamesVirtualInner = null;
  let gamesRenderRaf = 0;
  let gamesFilterTimer = 0;
  let gamesVirtualReady = false;
  let adminDataLoaded = false;
  let activeAdminTab = "dashboard";
  let overviewData = null;
  let panelMeta = { level: "full", roleId: "admin", isModerator: false, isFounder: false };
  const MOD_TABS = ["chat", "blacklist", "security", "system"];
  const adminSidebar = document.querySelector(".admin-sidebar");

  function isModPanel() {
    return !!panelMeta.isModerator || panelMeta.roleId === "moderator";
  }

  function modTabAllowed(name) {
    return MOD_TABS.indexOf(name) !== -1;
  }

  function setNavTabVisible(tab, visible) {
    if (!tab) return;
    if (visible) {
      tab.removeAttribute("hidden");
      tab.classList.remove("admin-tab--mod-hidden");
    } else {
      tab.setAttribute("hidden", "");
      tab.classList.add("admin-tab--mod-hidden");
    }
  }

  function setActiveNavTab(name) {
    tabs.forEach(function (tab) {
      const on = tab.getAttribute("data-tab") === name;
      tab.classList.toggle("admin-tab--active", on);
      if (on) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });
  }

  function setSectionVisible(section, visible) {
    if (!section) return;
    if (visible) section.removeAttribute("hidden");
    else section.setAttribute("hidden", "");
  }
  let activeChatChannel = "general";
  const GAMES_ROW_HEIGHT = 78;
  const GAMES_OVERSCAN = 10;

  function showGate() {
    gate.classList.remove("admin-gate--hide");
    panel.classList.add("admin-panel--hide");
    gate.hidden = false;
    panel.hidden = true;
  }

  function applyPanelChrome() {
    if (adminTopBadge) {
      adminTopBadge.textContent = panelMeta.isModerator ? "Moderator Panel" : "Admin";
    }
    document.title = panelMeta.isModerator ? "Kobran Moderator Panel" : "Kobran Admin";
    if (chatServerCard) chatServerCard.hidden = isModPanel();
    if (chatRolesCard) chatRolesCard.hidden = isModPanel();
  }

  function configureTabsForRole() {
    const isMod = isModPanel();
    if (adminSidebar) adminSidebar.classList.toggle("admin-sidebar--mod", isMod);
    tabs.forEach(function (tab) {
      const name = tab.getAttribute("data-tab") || "";
      setNavTabVisible(tab, !isMod || modTabAllowed(name));
    });
  }

  function showPanelDenied() {
    const host = document.querySelector(".admin-main");
    if (!host) return;
    let el = document.getElementById("admin-denied");
    if (!el) {
      el = document.createElement("div");
      el.id = "admin-denied";
      el.className = "admin-denied";
      host.prepend(el);
    }
    el.textContent = "insufficient permissions loser";
    el.hidden = false;
    setTimeout(function () {
      el.hidden = true;
    }, 2600);
  }

  function showPanel() {
    gate.classList.add("admin-gate--hide");
    panel.classList.remove("admin-panel--hide");
    gate.hidden = true;
    panel.hidden = false;
    applyPanelChrome();
    configureTabsForRole();
    loadAdminData();
    if (isModPanel() && !modTabAllowed(activeAdminTab)) {
      activeAdminTab = "chat";
    }
    switchAdminTab(activeAdminTab);
  }

  function switchAdminTab(name) {
    if (isModPanel() && !modTabAllowed(name)) {
      showPanelDenied();
      return;
    }
    activeAdminTab = name;
    setActiveNavTab(name);
    setSectionVisible(tabDash, name === "dashboard");
    setSectionVisible(tabGames, name === "games");
    setSectionVisible(tabAnn, name === "announcements");
    setSectionVisible(tabLog, name === "changelog");
    setSectionVisible(tabChat, name === "chat");
    setSectionVisible(tabUsers, name === "users");
    setSectionVisible(tabBlacklist, name === "blacklist");
    setSectionVisible(tabSecurity, name === "security");
    setSectionVisible(tabKobranHub, name === "kobran-hub");
    setSectionVisible(tabFeatures, name === "features");
    setSectionVisible(tabSystem, name === "system");
    if (name === "dashboard") renderDashboard();
    if (name === "chat") renderChatAdmin();
    if (name === "users") renderUsersAdmin();
    if (name === "blacklist") renderBlacklistAdmin();
    if (name === "security") renderSecurityAdmin();
    if (name === "kobran-hub") renderKobranHubAdmin();
    if (name === "features") renderFeaturesAdmin();
    if (name === "system") renderSystemAdmin();
    if (name === "games" && adminDataLoaded) scheduleGamesPaint();
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
      gateBtn.textContent = on ? "Signing in…" : "Sign in";
    }
  }

  function assignableRoles(actorRole, roles) {
    return (roles || []).filter(function (role) {
      if (role.id === "founder") return false;
      if (actorRole === "founder") {
        return role.id === "admin" || role.id === "moderator" || role.id === "member";
      }
      if (actorRole === "admin") {
        return role.id === "moderator" || role.id === "member";
      }
      return false;
    });
  }

  function loadAdminData() {
    if (adminDataLoaded) {
      if (activeAdminTab === "games") renderGames();
      return;
    }
    if (isModPanel()) {
      adminDataLoaded = true;
      S.getAdminBlacklist()
        .then(function (list) {
          blacklistRows = list || [];
          if (activeAdminTab === "chat") renderChatAdmin();
        })
        .catch(function () {
          blacklistRows = [];
          if (activeAdminTab === "chat") renderChatAdmin();
        });
      return;
    }
    gamesTotal.textContent = "Loading…";
    S.getAdminGames()
      .then(function (data) {
        adminGames = data.games || [];
        baseGames = data.base || [];
        overrides = data.overrides || {};
        adminDataLoaded = true;
        ensureGamesVirtualScroll();
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
        if (activeAdminTab === "chat") renderChatAdmin();
      })
      .catch(function () {
        gamesTotal.textContent = "Failed to load data";
        if (gamesList) {
          gamesList.innerHTML = '<p class="admin-empty">Could not load games. Refresh the page.</p>';
        }
      });
  }

  S.checkSession()
    .then(function (data) {
      if (data && data.authed) {
        panelMeta = data;
        showPanel();
      } else {
        showGate();
      }
    })
    .catch(function () {
      showGate();
    });

  gateForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const username = gateUser ? gateUser.value.trim().toLowerCase() : "";
    const password = gatePass ? gatePass.value : "";
    if (!username || !password) return;
    gateError.hidden = true;
    setGateLoading(true);
    S.login(username, password)
      .then(function () {
        return S.checkSession();
      })
      .then(function (data) {
        if (!data || !data.authed) {
          gateError.textContent = "Signed in but this account does not have panel access";
          gateError.hidden = false;
          return;
        }
        panelMeta = data;
        if (gateUser) gateUser.value = "";
        if (gatePass) gatePass.value = "";
        showPanel();
      })
      .catch(function (err) {
        gateError.hidden = false;
        if (err && err.status === 401) {
          gateError.textContent = "Wrong username or password";
        } else if (err && err.message === "network_error") {
          gateError.textContent = "Could not reach the server. Is Kobran running?";
        } else {
          gateError.textContent = "Could not sign in";
        }
        if (gateUser) gateUser.focus();
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
      switchAdminTab(tab.getAttribute("data-tab"));
    });
  });

  function formatUptime(sec) {
    const s = Number(sec) || 0;
    if (s < 60) return s + "s";
    if (s < 3600) return Math.floor(s / 60) + "m";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h + "h " + m + "m";
  }

  function renderDashboard() {
    const statsEl = document.getElementById("dash-stats");
    const panelsEl = document.getElementById("dash-panels");
    const updatedEl = document.getElementById("dash-updated");
    if (!statsEl) return;
    statsEl.innerHTML = '<p class="admin-empty">Loading overview…</p>';
    S.getAdminOverview()
      .then(function (data) {
        overviewData = data;
        if (updatedEl) updatedEl.textContent = "Updated just now · uptime " + formatUptime(data.uptime);
        const cards = [
          { label: "Games", value: data.games, tone: "" },
          { label: "Overrides", value: data.overrides, tone: "" },
          { label: "Thumbs cached", value: data.thumbsCached, tone: "ok" },
          { label: "Chat messages", value: data.chatMessages, tone: "" },
          { label: "Announcements", value: data.announcements, tone: "" },
          { label: "Changelog", value: data.changelog, tone: "" },
          { label: "HWID blocks", value: data.blacklist, tone: data.blacklist ? "warn" : "" },
          { label: "IP blocks", value: (data.security && data.security.permanent ? data.security.permanent.length : 0) + (data.security && data.security.temporary ? data.security.temporary.length : 0), tone: "" },
        ];
        statsEl.innerHTML = "";
        cards.forEach(function (c) {
          const card = document.createElement("div");
          card.className = "admin-stat" + (c.tone ? " admin-stat--" + c.tone : "");
          card.innerHTML = '<p class="admin-stat__value">' + Number(c.value || 0).toLocaleString() + '</p><p class="admin-stat__label">' + c.label + "</p>";
          statsEl.appendChild(card);
        });
        if (!panelsEl) return;
        panelsEl.innerHTML = "";
        const ubg = data.ubg || {};
        const ubgPages = ubg.pages || ubg.routes || [];
        const ubgOk = ubgPages.length ? ubgPages.every(function (r) { return r.ok; }) : false;
        const ubgCard = document.createElement("div");
        ubgCard.className = "admin-card";
        ubgCard.innerHTML =
          '<div class="admin-card__head"><h3 class="admin-card__title">UBG bundle</h3><p class="admin-card__sub">' +
          (ubgOk ? "Bundle routes healthy" : "Some bundle paths missing on server") +
          "</p></div>";
        const ubgList = document.createElement("div");
        ubgList.className = "admin-kv-list";
        ubgPages.forEach(function (r) {
          const row = document.createElement("div");
          row.className = "admin-kv";
          row.innerHTML = '<span class="admin-kv__k">' + r.path + '</span><span class="admin-kv__v admin-kv__v--' + (r.ok ? "ok" : "bad") + '">' + (r.ok ? "OK" : "Missing") + "</span>";
          ubgList.appendChild(row);
        });
        ubgCard.appendChild(ubgList);
        panelsEl.appendChild(ubgCard);
        const quick = document.createElement("div");
        quick.className = "admin-card";
        quick.innerHTML = '<div class="admin-card__head"><h3 class="admin-card__title">Quick actions</h3></div>';
        const quickRow = document.createElement("div");
        quickRow.className = "admin-inline-form";
        [
          { label: "Manage games", tab: "games" },
          { label: "Moderate chat", tab: "chat" },
          { label: "IP security", tab: "security" },
          { label: "System tools", tab: "system" },
        ].forEach(function (q) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "admin-btn admin-btn--ghost admin-btn--sm";
          btn.textContent = q.label;
          btn.addEventListener("click", function () {
            switchAdminTab(q.tab);
          });
          quickRow.appendChild(btn);
        });
        quick.appendChild(quickRow);
        panelsEl.appendChild(quick);
        renderFeaturedAdmin();
      })
      .catch(function () {
        statsEl.innerHTML = '<p class="admin-empty">Could not load overview.</p>';
      });
  }

  const dashRefresh = document.getElementById("dash-refresh");
  if (dashRefresh) dashRefresh.addEventListener("click", renderDashboard);

  function renderBlacklistAdmin() {
    const body = document.getElementById("blacklist-body");
    if (!body) return;
    body.innerHTML = '<tr><td colspan="5">Loading…</td></tr>';
    S.getAdminBlacklist()
      .then(function (rows) {
        blacklistRows = rows || [];
        body.innerHTML = "";
        if (!blacklistRows.length) {
          body.innerHTML = '<tr><td colspan="5">No HWID blocks yet.</td></tr>';
          return;
        }
        blacklistRows.forEach(function (row) {
          const tr = document.createElement("tr");
          const tdH = document.createElement("td");
          tdH.className = "admin-table__msg";
          tdH.textContent = row.hwid || "";
          const tdC = document.createElement("td");
          tdC.textContent = row.chatBlocked ? "Blocked" : "—";
          const tdS = document.createElement("td");
          tdS.textContent = row.siteBlocked ? "Blocked" : "—";
          const tdU = document.createElement("td");
          tdU.textContent = row.updatedTs ? S.formatDate(new Date(row.updatedTs).toISOString()) : "—";
          const tdA = document.createElement("td");
          tdA.className = "admin-table__actions";
          const unchat = document.createElement("button");
          unchat.type = "button";
          unchat.className = "admin-btn admin-btn--ghost admin-btn--sm";
          unchat.textContent = row.chatBlocked ? "Unblock chat" : "Block chat";
          unchat.addEventListener("click", function () {
            S.setBlacklist(row.hwid, "chat", !row.chatBlocked).then(renderBlacklistAdmin);
          });
          const unsite = document.createElement("button");
          unsite.type = "button";
          unsite.className = "admin-btn admin-btn--ghost admin-btn--sm";
          unsite.textContent = row.siteBlocked ? "Unblock site" : "Block site";
          unsite.addEventListener("click", function () {
            S.setBlacklist(row.hwid, "site", !row.siteBlocked).then(renderBlacklistAdmin);
          });
          tdA.append(unchat, unsite);
          tr.append(tdH, tdC, tdS, tdU, tdA);
          body.appendChild(tr);
        });
      })
      .catch(function () {
        body.innerHTML = '<tr><td colspan="5">Could not load blacklist.</td></tr>';
      });
  }

  const blacklistForm = document.getElementById("blacklist-add-form");
  if (blacklistForm) {
    blacklistForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const hwid = document.getElementById("blacklist-hwid").value.trim();
      const chat = document.getElementById("blacklist-chat").checked;
      const site = document.getElementById("blacklist-site").checked;
      if (!hwid) return;
      const chain = Promise.resolve();
      (chat ? chain.then(function () { return S.setBlacklist(hwid, "chat", true); }) : chain)
        .then(function () {
          if (site) return S.setBlacklist(hwid, "site", true);
        })
        .then(function () {
          document.getElementById("blacklist-hwid").value = "";
          renderBlacklistAdmin();
        });
    });
  }
  const blacklistRefresh = document.getElementById("blacklist-refresh");
  if (blacklistRefresh) blacklistRefresh.addEventListener("click", renderBlacklistAdmin);

  function renderSecurityAdmin() {
    const permEl = document.getElementById("ip-permanent-list");
    const tempEl = document.getElementById("ip-temp-list");
    if (!permEl || !tempEl) return;
    permEl.innerHTML = "Loading…";
    tempEl.innerHTML = "";
    S.getAdminSecurity()
      .then(function (data) {
        permEl.innerHTML = "";
        tempEl.innerHTML = "";
        const perm = (data && data.permanent) || [];
        const temp = (data && data.temporary) || [];
        if (!perm.length) permEl.innerHTML = '<p class="admin-muted">None</p>';
        perm.forEach(function (ip) {
          permEl.appendChild(makeIpChip(ip, true));
        });
        if (!temp.length) tempEl.innerHTML = '<p class="admin-muted">None</p>';
        temp.forEach(function (row) {
          tempEl.appendChild(makeIpChip(row.ip, false, row.until));
        });
      })
      .catch(function () {
        permEl.textContent = "Could not load blocks.";
      });
  }

  function makeIpChip(ip, permanent, until) {
    const chip = document.createElement("div");
    chip.className = "admin-chip";
    const label = document.createElement("span");
    label.textContent = ip + (until ? " · until " + S.formatDate(new Date(until).toISOString()) : "");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "admin-chip__btn";
    btn.textContent = "Unblock";
    btn.addEventListener("click", function () {
      S.unblockIp(ip).then(renderSecurityAdmin);
    });
    chip.append(label, btn);
    return chip;
  }

  const ipBlockForm = document.getElementById("ip-block-form");
  if (ipBlockForm) {
    ipBlockForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const ip = document.getElementById("ip-block-value").value.trim();
      const permanent = document.getElementById("ip-block-permanent").checked;
      if (!ip) return;
      S.blockIp(ip, permanent).then(function () {
        document.getElementById("ip-block-value").value = "";
        renderSecurityAdmin();
      });
    });
  }
  const securityRefresh = document.getElementById("security-refresh");
  if (securityRefresh) securityRefresh.addEventListener("click", renderSecurityAdmin);

  let kobranHubKeys = [];

  function msToDurationInput(ms) {
    var n = Math.max(0, Math.floor(Number(ms) || 0));
    if (!n) return "";
    if (n % 86400000 === 0) return n / 86400000 + "d";
    if (n % 3600000 === 0) return n / 3600000 + "h";
    if (n % 60000 === 0) return n / 60000 + "m";
    return String(n);
  }

  function renderKobranHubAdmin() {
    const keysBody = document.getElementById("kobran-keys-body");
    const durationInput = document.getElementById("kobran-default-duration");
    const durationLabel = document.getElementById("kobran-default-duration-label");
    if (!keysBody) return;
    keysBody.innerHTML = '<tr><td colspan="8">Loading…</td></tr>';
    S.getAdminKobranHub()
      .then(function (data) {
        const settings = (data && data.settings) || {};
        kobranHubKeys = (data && data.keys) || [];
        if (durationInput && !durationInput.matches(":focus")) {
          durationInput.value = msToDurationInput(settings.defaultKeyDurationMs) || "24h";
        }
        if (durationLabel) {
          durationLabel.textContent = settings.defaultKeyDurationLabel
            ? "currently " + settings.defaultKeyDurationLabel
            : "";
        }
        keysBody.innerHTML = "";
        if (!kobranHubKeys.length) {
          keysBody.innerHTML = '<tr><td colspan="8">No keys yet.</td></tr>';
        } else {
          kobranHubKeys.forEach(function (row) {
            const tr = document.createElement("tr");
            const tdKey = document.createElement("td");
            tdKey.className = "admin-table__msg";
            tdKey.textContent = row.key || "";
            const tdStatus = document.createElement("td");
            tdStatus.textContent = row.status || "—";
            const tdExp = document.createElement("td");
            tdExp.textContent = row.expiresAt
              ? S.formatDate(new Date(row.expiresAt).toISOString())
              : "—";
            const tdSource = document.createElement("td");
            tdSource.textContent = row.source || "—";
            const tdBind = document.createElement("td");
            tdBind.className = "admin-table__msg";
            tdBind.textContent = row.shared ? "shared (no lock)" : row.boundHwid || "unbound";
            const tdIp = document.createElement("td");
            tdIp.textContent = row.ip || "—";
            const tdNote = document.createElement("td");
            tdNote.textContent = row.note || "—";
            const tdA = document.createElement("td");
            tdA.className = "admin-table__actions";
            const editBtn = document.createElement("button");
            editBtn.type = "button";
            editBtn.className = "admin-btn admin-btn--ghost admin-btn--sm";
            editBtn.textContent = "Edit";
            editBtn.addEventListener("click", function () {
              openKobranKeyEdit(row);
            });
            const delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.className = "admin-btn admin-btn--danger admin-btn--sm";
            delBtn.textContent = "Delete";
            delBtn.addEventListener("click", function () {
              if (!window.confirm("Delete this key?")) return;
              S.deleteAdminKobranKey(row.id).then(renderKobranHubAdmin);
            });
            tdA.append(editBtn, delBtn);
            tr.append(tdKey, tdStatus, tdExp, tdSource, tdBind, tdIp, tdNote, tdA);
            keysBody.appendChild(tr);
          });
        }
      })
      .catch(function () {
        keysBody.innerHTML = '<tr><td colspan="8">Could not load keys.</td></tr>';
      });
  }

  function openKobranKeyEdit(row) {
    const idEl = document.getElementById("kobran-edit-id");
    const keyEl = document.getElementById("kobran-edit-key");
    const durationEl = document.getElementById("kobran-edit-duration");
    const noteEl = document.getElementById("kobran-edit-note");
    const hintEl = document.getElementById("kobran-edit-hint");
    const clearBind = document.getElementById("kobran-edit-clear-bind");
    const sharedEl = document.getElementById("kobran-edit-shared");
    if (!idEl || !keyEl) return;
    idEl.value = row.id || "";
    keyEl.value = row.key || "";
    durationEl.value = "";
    noteEl.value = row.note || "";
    if (clearBind) clearBind.checked = false;
    if (sharedEl) sharedEl.checked = !!row.shared;
    var bits = [];
    if (row.expiresAt) bits.push("Current expiry: " + S.formatDate(new Date(row.expiresAt).toISOString()));
    else bits.push("No expiry set yet.");
    if (row.shared) bits.push("Shared key (no HWID lock).");
    else bits.push(row.boundHwid ? "Bound HWID: " + row.boundHwid : "Not bound to a device yet.");
    hintEl.textContent = bits.join(" · ");
    openModal("kobran-key-modal");
  }

  const kobranHubRefresh = document.getElementById("kobran-hub-refresh");
  if (kobranHubRefresh) kobranHubRefresh.addEventListener("click", renderKobranHubAdmin);

  const kobranDurationForm = document.getElementById("kobran-duration-form");
  if (kobranDurationForm) {
    kobranDurationForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const status = document.getElementById("kobran-duration-status");
      const value = document.getElementById("kobran-default-duration").value.trim();
      if (!value) return;
      if (status) status.textContent = "Saving…";
      S.updateAdminKobranHubSettings({ duration: value })
        .then(function () {
          if (status) status.textContent = "Saved";
          renderKobranHubAdmin();
        })
        .catch(function () {
          if (status) status.textContent = "Failed";
        });
    });
  }

  const kobranKeyCreateForm = document.getElementById("kobran-key-create-form");
  if (kobranKeyCreateForm) {
    kobranKeyCreateForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const key = document.getElementById("kobran-key-value").value.trim();
      const duration = document.getElementById("kobran-key-duration").value.trim();
      const note = document.getElementById("kobran-key-note").value.trim();
      const sharedEl = document.getElementById("kobran-key-shared");
      const payload = {};
      if (key) payload.key = key;
      if (duration) payload.duration = duration;
      if (note) payload.note = note;
      if (sharedEl && sharedEl.checked) payload.shared = true;
      S.createAdminKobranKey(payload).then(function () {
        document.getElementById("kobran-key-value").value = "";
        document.getElementById("kobran-key-duration").value = "";
        document.getElementById("kobran-key-note").value = "";
        if (sharedEl) sharedEl.checked = false;
        renderKobranHubAdmin();
      });
    });
  }

  const kobranKeysExportBtn = document.getElementById("kobran-keys-export");
  const kobranKeysImportBtn = document.getElementById("kobran-keys-import");
  const kobranKeysImportFile = document.getElementById("kobran-keys-import-file");
  const kobranKeysIoStatus = document.getElementById("kobran-keys-io-status");

  if (kobranKeysExportBtn) {
    kobranKeysExportBtn.addEventListener("click", function () {
      if (kobranKeysIoStatus) kobranKeysIoStatus.textContent = "Exporting…";
      function downloadExport(data) {
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "kobran-hub-keys-" + Date.now() + ".json";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () {
          URL.revokeObjectURL(url);
        }, 1000);
        if (kobranKeysIoStatus) {
          kobranKeysIoStatus.textContent =
            "Exported " + ((data && data.count) || (data && data.keys && data.keys.length) || 0) + " key(s)";
        }
      }
      var exportFn =
        S && typeof S.exportAdminKobranKeys === "function"
          ? S.exportAdminKobranKeys
          : function () {
              return fetch("/api/admin/kobran-hub/keys/export", { credentials: "same-origin" }).then(function (res) {
                return res.json().then(function (data) {
                  if (!res.ok) throw new Error((data && data.error) || "export_failed");
                  return data;
                });
              });
            };
      exportFn()
        .then(downloadExport)
        .catch(function (err) {
          if (kobranKeysIoStatus) {
            kobranKeysIoStatus.textContent =
              "Export failed" + (err && err.message ? " (" + err.message + ")" : "");
          }
        });
    });
  }

  if (kobranKeysImportBtn && kobranKeysImportFile) {
    kobranKeysImportBtn.addEventListener("click", function () {
      kobranKeysImportFile.value = "";
      kobranKeysImportFile.click();
    });
    kobranKeysImportFile.addEventListener("change", function () {
      var file = kobranKeysImportFile.files && kobranKeysImportFile.files[0];
      if (!file) return;
      var replaceEl = document.getElementById("kobran-keys-import-replace");
      var replace = !!(replaceEl && replaceEl.checked);
      if (replace && !window.confirm("Replace all current keys with this export?")) {
        kobranKeysImportFile.value = "";
        return;
      }
      if (kobranKeysIoStatus) kobranKeysIoStatus.textContent = "Importing…";
      var reader = new FileReader();
      reader.onload = function () {
        var parsed = null;
        try {
          parsed = JSON.parse(String(reader.result || ""));
        } catch (err) {
          if (kobranKeysIoStatus) kobranKeysIoStatus.textContent = "Bad JSON file";
          return;
        }
        if (!parsed || typeof parsed !== "object") {
          if (kobranKeysIoStatus) kobranKeysIoStatus.textContent = "Bad export file";
          return;
        }
        var payload = Object.assign({}, parsed, { replace: replace });
        var importFn =
          S && typeof S.importAdminKobranKeys === "function"
            ? S.importAdminKobranKeys
            : function (body) {
                return fetch("/api/admin/kobran-hub/keys/import", {
                  method: "POST",
                  credentials: "same-origin",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                }).then(function (res) {
                  return res.json().then(function (data) {
                    if (!res.ok) throw new Error((data && data.error) || "import_failed");
                    return data;
                  });
                });
              };
        importFn(payload)
          .then(function (data) {
            if (kobranKeysIoStatus) {
              kobranKeysIoStatus.textContent =
                "Imported +" +
                (data.added || 0) +
                " / updated " +
                (data.updated || 0) +
                " / skipped " +
                (data.skipped || 0);
            }
            renderKobranHubAdmin();
          })
          .catch(function (err) {
            if (kobranKeysIoStatus) {
              kobranKeysIoStatus.textContent =
                "Import failed" + (err && err.message ? " (" + err.message + ")" : "");
            }
          });
      };
      reader.onerror = function () {
        if (kobranKeysIoStatus) kobranKeysIoStatus.textContent = "Couldnt read file";
      };
      reader.readAsText(file);
    });
  }

  const kobranKeyEditForm = document.getElementById("kobran-key-edit-form");
  if (kobranKeyEditForm) {
    kobranKeyEditForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const id = document.getElementById("kobran-edit-id").value.trim();
      const key = document.getElementById("kobran-edit-key").value.trim();
      const duration = document.getElementById("kobran-edit-duration").value.trim();
      const note = document.getElementById("kobran-edit-note").value.trim();
      const clearBind = document.getElementById("kobran-edit-clear-bind");
      const sharedEl = document.getElementById("kobran-edit-shared");
      if (!id || !key) return;
      const payload = { key: key, note: note };
      if (duration) payload.duration = duration;
      if (clearBind && clearBind.checked) payload.clearBinding = true;
      if (sharedEl) payload.shared = !!sharedEl.checked;
      S.updateAdminKobranKey(id, payload).then(function () {
        closeModal("kobran-key-modal");
        renderKobranHubAdmin();
      });
    });
  }

  function renderFeaturesAdmin() {
    const togglesEl = document.getElementById("features-toggles");
    const layoutEl = document.getElementById("features-layout");
    const ratingsBody = document.getElementById("features-ratings-body");
    const ratingsStatus = document.getElementById("features-ratings-status");
    if (!togglesEl) return;
    togglesEl.innerHTML = '<p class="admin-empty">Loading…</p>';
    if (layoutEl) layoutEl.innerHTML = "";
    const labels = {
      gameRatings: "Game ratings on cards",
      lyricsOverlay: "Music lyrics overlay",
      lowDataMode: "Low data mode setting",
      pwaInstall: "PWA install prompt",
      wallpaperSearch: "Wallpaper search",
      backgroundDim: "Background dim slider",
      surpriseWallpaper: "Surprise me wallpaper button",
    };
    const navLayout = [
      { id: "games", label: "Games" },
      { id: "hub", label: "Hub" },
      { id: "browser", label: "Browser" },
      { id: "entertainment", label: "Entertainment" },
      { id: "announcements", label: "News" },
      { id: "tutorial", label: "Tutorial" },
      { id: "chat", label: "Chat" },
      { id: "tab-cloak", label: "Tab Cloaking" },
      { id: "ai", label: "AI" },
      { id: "changelog", label: "Updates" },
      { id: "more", label: "More" },
      { id: "profile", label: "Profile" },
      { id: "settings", label: "Settings" },
    ];
    function canManageLayout() {
      return !!(panelMeta.isFounder || panelMeta.roleId === "admin" || panelMeta.roleId === "founder");
    }
    function patchLayout(bucket, key, visible) {
      const patch = { layout: { hubSections: {}, hubItems: {}, nav: {} } };
      patch.layout[bucket][key] = visible;
      return S.putAdminFeatures(patch).then(function () {
        renderFeaturesAdmin();
      });
    }
    function layoutToggleRow(label, visible, onChange) {
      const row = document.createElement("div");
      row.className = "admin-layout-row";
      const name = document.createElement("span");
      name.className = "admin-layout-row__label";
      name.textContent = label;
      const actions = document.createElement("div");
      actions.className = "admin-layout-row__actions";
      const state = document.createElement("span");
      state.className = "admin-layout-row__state" + (visible ? " admin-layout-row__state--on" : "");
      state.textContent = visible ? "Shown" : "Hidden";
      const showBtn = document.createElement("button");
      showBtn.type = "button";
      showBtn.className = "admin-btn admin-btn--ghost admin-btn--sm";
      showBtn.textContent = "Show";
      showBtn.disabled = visible;
      showBtn.addEventListener("click", function () {
        onChange(true).catch(function () {});
      });
      const hideBtn = document.createElement("button");
      hideBtn.type = "button";
      hideBtn.className = "admin-btn admin-btn--ghost admin-btn--sm";
      hideBtn.textContent = "Hide";
      hideBtn.disabled = !visible;
      hideBtn.addEventListener("click", function () {
        onChange(false).catch(function () {});
      });
      actions.append(state, showBtn, hideBtn);
      row.append(name, actions);
      return row;
    }
    function renderLayoutAdmin(layout) {
      if (!layoutEl || !canManageLayout()) {
        if (layoutEl) layoutEl.hidden = true;
        return;
      }
      layoutEl.hidden = false;
      layoutEl.innerHTML =
        '<div class="admin-card__head"><h3 class="admin-card__title">Hub and navigation</h3><p class="admin-card__sub">Hide or show hub sections, hub links, and bottom nav buttons for everyone on the site. Refresh the main site after changes.</p></div>';
      const wrap = document.createElement("div");
      wrap.className = "admin-layout-admin";
      const hubSections = (window.KobranHub && window.KobranHub.sections) || [];
      hubSections.forEach(function (section) {
        const block = document.createElement("div");
        block.className = "admin-layout-block";
        const sectionVisible = !layout.hubSections || layout.hubSections[section.id] !== false;
        const head = document.createElement("div");
        head.className = "admin-layout-block__head";
        const title = document.createElement("p");
        title.className = "admin-layout-heading";
        title.textContent = section.title;
        const bulk = document.createElement("div");
        bulk.className = "admin-layout-bulk";
        const hideAll = document.createElement("button");
        hideAll.type = "button";
        hideAll.className = "admin-btn admin-btn--ghost admin-btn--sm";
        hideAll.textContent = "Hide all";
        hideAll.addEventListener("click", function () {
          const keys = section.items.map(function (item) {
            return item.id;
          });
          keys.push(section.id);
          const patch = { layout: { hubSections: {}, hubItems: {}, nav: {} } };
          patch.layout.hubSections[section.id] = false;
          keys.forEach(function (key) {
            if (key !== section.id) patch.layout.hubItems[key] = false;
          });
          S.putAdminFeatures(patch).then(function () {
            renderFeaturesAdmin();
          });
        });
        const showAll = document.createElement("button");
        showAll.type = "button";
        showAll.className = "admin-btn admin-btn--ghost admin-btn--sm";
        showAll.textContent = "Show all";
        showAll.addEventListener("click", function () {
          const patch = { layout: { hubSections: {}, hubItems: {}, nav: {} } };
          patch.layout.hubSections[section.id] = true;
          section.items.forEach(function (item) {
            patch.layout.hubItems[item.id] = true;
          });
          S.putAdminFeatures(patch).then(function () {
            renderFeaturesAdmin();
          });
        });
        bulk.append(hideAll, showAll);
        head.append(title, bulk);
        block.appendChild(head);
        block.appendChild(
          layoutToggleRow(section.title + " section", sectionVisible, function (visible) {
            return patchLayout("hubSections", section.id, visible);
          })
        );
        const itemList = document.createElement("div");
        itemList.className = "admin-layout-items";
        section.items.forEach(function (item) {
          const itemVisible = !layout.hubItems || layout.hubItems[item.id] !== false;
          itemList.appendChild(
            layoutToggleRow(item.name, itemVisible, function (visible) {
              return patchLayout("hubItems", item.id, visible);
            })
          );
        });
        block.appendChild(itemList);
        wrap.appendChild(block);
      });
      const navBlock = document.createElement("div");
      navBlock.className = "admin-layout-block";
      const navHead = document.createElement("div");
      navHead.className = "admin-layout-block__head";
      const navTitle = document.createElement("p");
      navTitle.className = "admin-layout-heading";
      navTitle.textContent = "Bottom navigation";
      const navBulk = document.createElement("div");
      navBulk.className = "admin-layout-bulk";
      const navHideAll = document.createElement("button");
      navHideAll.type = "button";
      navHideAll.className = "admin-btn admin-btn--ghost admin-btn--sm";
      navHideAll.textContent = "Hide all";
      navHideAll.addEventListener("click", function () {
        const patch = { layout: { hubSections: {}, hubItems: {}, nav: {} } };
        navLayout.forEach(function (item) {
          patch.layout.nav[item.id] = false;
        });
        S.putAdminFeatures(patch).then(function () {
          renderFeaturesAdmin();
        });
      });
      const navShowAll = document.createElement("button");
      navShowAll.type = "button";
      navShowAll.className = "admin-btn admin-btn--ghost admin-btn--sm";
      navShowAll.textContent = "Show all";
      navShowAll.addEventListener("click", function () {
        const patch = { layout: { hubSections: {}, hubItems: {}, nav: {} } };
        navLayout.forEach(function (item) {
          patch.layout.nav[item.id] = true;
        });
        S.putAdminFeatures(patch).then(function () {
          renderFeaturesAdmin();
        });
      });
      navBulk.append(navHideAll, navShowAll);
      navHead.append(navTitle, navBulk);
      navBlock.appendChild(navHead);
      const navList = document.createElement("div");
      navList.className = "admin-layout-items";
      navLayout.forEach(function (item) {
        const itemVisible = !layout.nav || layout.nav[item.id] !== false;
        navList.appendChild(
          layoutToggleRow(item.label, itemVisible, function (visible) {
            return patchLayout("nav", item.id, visible);
          })
        );
      });
      navBlock.appendChild(navList);
      wrap.appendChild(navBlock);
      layoutEl.appendChild(wrap);
    }
    Promise.all([S.getAdminFeatures(), S.getAdminRatings()])
      .then(function (rows) {
        const features = (rows[0] && rows[0].features) || {};
        const layout = (rows[0] && rows[0].layout) || { hubSections: {}, hubItems: {}, nav: {} };
        const ratings = (rows[1] && rows[1].ratings) || [];
        togglesEl.innerHTML =
          '<div class="admin-card__head"><h3 class="admin-card__title">Public features</h3><p class="admin-card__sub">Turn off anything you do not want live on the site.</p></div>';
        const list = document.createElement("div");
        list.className = "admin-kv-list";
        Object.keys(labels).forEach(function (key) {
          const row = document.createElement("label");
          row.className = "admin-kv admin-kv--toggle";
          const name = document.createElement("span");
          name.className = "admin-kv__k";
          name.textContent = labels[key];
          const input = document.createElement("input");
          input.type = "checkbox";
          input.checked = features[key] !== false;
          input.addEventListener("change", function () {
            const patch = {};
            patch[key] = input.checked;
            S.putAdminFeatures(patch).catch(function () {
              input.checked = !input.checked;
            });
          });
          row.append(name, input);
          list.appendChild(row);
        });
        togglesEl.appendChild(list);
        renderLayoutAdmin(layout);
        if (ratingsBody) {
          ratingsBody.innerHTML = "";
          if (!ratings.length) {
            ratingsBody.innerHTML = '<tr><td colspan="4">No ratings yet.</td></tr>';
          } else {
            ratings.slice(0, 100).forEach(function (row) {
              const tr = document.createElement("tr");
              tr.innerHTML =
                "<td>" +
                row.id +
                "</td><td>" +
                row.up +
                "</td><td>" +
                row.down +
                "</td><td>" +
                row.score +
                "</td>";
              ratingsBody.appendChild(tr);
            });
          }
        }
        if (ratingsStatus && rows[1]) {
          ratingsStatus.textContent = Number(rows[1].totalVotes || 0).toLocaleString() + " device votes stored";
        }
      })
      .catch(function () {
        togglesEl.innerHTML = '<p class="admin-empty">Could not load features.</p>';
      });
  }

  const featuresRefresh = document.getElementById("features-refresh");
  if (featuresRefresh) featuresRefresh.addEventListener("click", renderFeaturesAdmin);
  const featuresRatingsClear = document.getElementById("features-ratings-clear");
  const featuresRatingsStatus = document.getElementById("features-ratings-status");
  if (featuresRatingsClear) {
    featuresRatingsClear.addEventListener("click", function () {
      if (!window.confirm("Clear all game ratings?")) return;
      featuresRatingsClear.disabled = true;
      S.clearAdminRatings()
        .then(function () {
          if (featuresRatingsStatus) featuresRatingsStatus.textContent = "Ratings cleared";
          renderFeaturesAdmin();
        })
        .catch(function () {
          if (featuresRatingsStatus) featuresRatingsStatus.textContent = "Clear failed";
        })
        .finally(function () {
          featuresRatingsClear.disabled = false;
        });
    });
  }

  function renderSystemAdmin() {
    const ubgEl = document.getElementById("system-ubg");
    const thumbEl = document.getElementById("system-thumb-stats");
    const metaEl = document.getElementById("system-meta");
    if (!ubgEl) return;
    ubgEl.innerHTML = '<p class="admin-empty">Loading…</p>';
    S.getAdminOverview()
      .then(function (data) {
        overviewData = data;
        const ubg = data.ubg || {};
        const ubgPages = ubg.pages || ubg.routes || [];
        ubgEl.innerHTML =
          '<div class="admin-card__head"><h3 class="admin-card__title">UBG health</h3><p class="admin-card__sub">' +
          (ubg.primaryRoot || "No bundle root") +
          "</p></div>";
        const list = document.createElement("div");
        list.className = "admin-kv-list";
        ubgPages.forEach(function (r) {
          const row = document.createElement("div");
          row.className = "admin-kv";
          row.innerHTML = '<span class="admin-kv__k">' + r.path + '</span><span class="admin-kv__v admin-kv__v--' + (r.ok ? "ok" : "bad") + '">' + (r.ok ? "OK" : "Missing") + "</span>";
          list.appendChild(row);
        });
        ubgEl.appendChild(list);
        if (thumbEl) {
          thumbEl.innerHTML =
            '<div class="admin-kv"><span class="admin-kv__k">Cached game thumbs</span><span class="admin-kv__v">' +
            Number(data.thumbsCached || 0).toLocaleString() +
            '</span></div><div class="admin-kv"><span class="admin-kv__k">Thumb files on disk</span><span class="admin-kv__v">' +
            Number(data.thumbFiles || 0).toLocaleString() +
            '</span></div><div class="admin-kv"><span class="admin-kv__k">CDN map paths</span><span class="admin-kv__v">' +
            Number(data.thumbMapPaths || 0).toLocaleString() +
            "</span></div>";
        }
        if (metaEl) {
          metaEl.innerHTML =
            '<div class="admin-card__head"><h3 class="admin-card__title">Server</h3></div><div class="admin-kv-list">' +
            '<div class="admin-kv"><span class="admin-kv__k">Node</span><span class="admin-kv__v">' +
            (data.nodeVersion || "—") +
            '</span></div><div class="admin-kv"><span class="admin-kv__k">Uptime</span><span class="admin-kv__v">' +
            formatUptime(data.uptime) +
            '</span></div><div class="admin-kv"><span class="admin-kv__k">Admin key</span><span class="admin-kv__v admin-kv__v--' +
            (data.adminConfigured ? "ok" : "bad") +
            '">' +
            (data.adminConfigured ? "Configured" : "Missing") +
            '</span></div><div class="admin-kv"><span class="admin-kv__k">Discord webhook</span><span class="admin-kv__v">' +
            (data.discordWebhook ? "On" : "Off") +
            "</span></div></div>";
        }
      })
      .catch(function () {
        ubgEl.innerHTML = '<p class="admin-empty">Could not load system info.</p>';
      });
  }

  const systemRefresh = document.getElementById("system-refresh");
  if (systemRefresh) systemRefresh.addEventListener("click", renderSystemAdmin);
  const systemCacheRefresh = document.getElementById("system-cache-refresh");
  const systemCacheStatus = document.getElementById("system-cache-status");
  if (systemCacheRefresh) {
    systemCacheRefresh.addEventListener("click", function () {
      systemCacheRefresh.disabled = true;
      if (systemCacheStatus) systemCacheStatus.textContent = "Refreshing…";
      S.refreshAdminCache()
        .then(function (data) {
          if (systemCacheStatus) {
            systemCacheStatus.textContent = "Done · " + Number(data.thumbsCached || 0).toLocaleString() + " thumbs indexed";
          }
          renderSystemAdmin();
        })
        .catch(function () {
          if (systemCacheStatus) systemCacheStatus.textContent = "Failed";
        })
        .finally(function () {
          systemCacheRefresh.disabled = false;
        });
    });
  }

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

  function renderServerAdmin() {
    if (!chatServerForm) return;
    S.getAdminChatServer()
      .then(function (data) {
        if (chatServerName) chatServerName.value = data.name || "";
        if (chatServerTopic) chatServerTopic.value = data.topic || "";
        if (chatServerChannel) chatServerChannel.value = data.channelName || "general";
        if (chatSlowMode) chatSlowMode.value = String(data.slowModeSeconds || 0);
      })
      .catch(function () {
        if (chatServerName) chatServerName.value = "Kobran";
        if (chatServerTopic) chatServerTopic.value = "";
        if (chatServerChannel) chatServerChannel.value = "general";
      });
  }

  function renderRolesAdmin() {
    if (!roleTableBody) return;
    roleTableBody.innerHTML = '<tr><td colspan="5">Loading…</td></tr>';
    S.getAdminChatRoles()
      .then(function (rows) {
        roleTableBody.innerHTML = "";
        if (!rows || !rows.length) {
          roleTableBody.innerHTML = '<tr><td colspan="5">No roles.</td></tr>';
          return;
        }
        rows.forEach(function (role) {
          const tr = document.createElement("tr");
          const tdI = document.createElement("td");
          tdI.textContent = role.id;
          const tdN = document.createElement("td");
          const nameInput = document.createElement("input");
          nameInput.className = "admin-input admin-input--narrow";
          nameInput.value = role.name || "";
          tdN.appendChild(nameInput);
          const tdC = document.createElement("td");
          const colorInput = document.createElement("input");
          colorInput.className = "admin-input admin-input--narrow";
          colorInput.value = role.color || "";
          tdC.appendChild(colorInput);
          const tdP = document.createElement("td");
          tdP.textContent = [
            role.permissions && role.permissions.sendMessages ? "send" : "",
            role.permissions && role.permissions.manageMessages ? "mod" : "",
            role.permissions && role.permissions.manageMembers ? "members" : "",
          ].filter(Boolean).join(", ") || "none";
          const tdA = document.createElement("td");
          tdA.className = "admin-table__actions";
          const saveBtn = document.createElement("button");
          saveBtn.type = "button";
          saveBtn.className = "admin-btn admin-btn--ghost admin-btn--sm";
          saveBtn.textContent = "Save";
          saveBtn.addEventListener("click", function () {
            S.updateAdminChatRole(role.id, {
              name: nameInput.value,
              color: colorInput.value,
              permissions: role.permissions,
            }).then(renderRolesAdmin);
          });
          const delBtn = document.createElement("button");
          delBtn.type = "button";
          delBtn.className = "admin-btn admin-btn--danger admin-btn--sm";
          delBtn.textContent = "Delete";
          delBtn.disabled = role.id === "member" || role.id === "admin" || role.id === "moderator";
          delBtn.addEventListener("click", function () {
            if (!confirm("Delete role " + role.id + "?")) return;
            S.deleteAdminChatRole(role.id).then(renderRolesAdmin);
          });
          tdA.append(saveBtn, delBtn);
          tr.append(tdI, tdN, tdC, tdP, tdA);
          roleTableBody.appendChild(tr);
        });
      })
      .catch(function () {
        roleTableBody.innerHTML = '<tr><td colspan="5">Could not load roles.</td></tr>';
      });
  }

  function buildRolePicker(roles, value) {
    const wrap = document.createElement("div");
    wrap.className = "admin-role-pick";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "admin-role-pick__btn";
    const menu = document.createElement("div");
    menu.className = "admin-role-pick__menu";
    menu.hidden = true;

    function labelFor(id) {
      const role = roles.find(function (r) {
        return r.id === id;
      });
      return role ? role.name : id;
    }

    function paint() {
      btn.textContent = labelFor(value);
      menu.innerHTML = "";
      roles.forEach(function (role) {
        const opt = document.createElement("button");
        opt.type = "button";
        opt.className = "admin-role-pick__option";
        if (role.id === value) opt.classList.add("admin-role-pick__option--on");
        opt.textContent = role.name;
        opt.addEventListener("click", function (e) {
          e.stopPropagation();
          value = role.id;
          paint();
          menu.hidden = true;
        });
        menu.appendChild(opt);
      });
    }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      document.querySelectorAll(".admin-role-pick__menu").forEach(function (node) {
        if (node !== menu) node.hidden = true;
      });
      menu.hidden = !menu.hidden;
    });

    paint();
    wrap.append(btn, menu);
    wrap.getValue = function () {
      return value;
    };
    return wrap;
  }

  function renderUsersAdmin() {
    if (!usersTableBody) return;
    usersTableBody.innerHTML = '<tr><td colspan="6">Loading…</td></tr>';
    Promise.all([S.getAdminUsers(), S.getAdminChatRoles()])
      .then(function (pack) {
        const users = pack[0] || [];
        const roles = pack[1] || [];
        usersTableBody.innerHTML = "";
        if (!users.length) {
          usersTableBody.innerHTML = '<tr><td colspan="6">No users yet.</td></tr>';
          return;
        }
        users.forEach(function (user) {
          const tr = document.createElement("tr");
          const tdU = document.createElement("td");
          tdU.textContent = "@" + user.username;
          const tdD = document.createElement("td");
          tdD.textContent = user.displayName || "";
          const tdR = document.createElement("td");
          const roleChoices = assignableRoles(panelMeta.roleId, roles);
          if (user.roleId === "founder") {
            tdR.textContent = "Founder";
          } else if (!roleChoices.length) {
            tdR.textContent = user.roleId || "member";
          } else {
            const rolePick = buildRolePicker(roleChoices, user.roleId || "member");
            tdR.appendChild(rolePick);
          }
          const tdP = document.createElement("td");
          tdP.className = "admin-user-pass";
          const passWrap = document.createElement("div");
          passWrap.className = "admin-user-pass__wrap";
          const passText = document.createElement("code");
          passText.className = "admin-user-pass__value";
          const passInput = document.createElement("input");
          passInput.type = "text";
          passInput.className = "admin-input admin-input--narrow admin-user-pass__input";
          passInput.placeholder = "Set password";
          passInput.hidden = true;
          const viewToggle = document.createElement("label");
          viewToggle.className = "admin-check admin-user-pass__toggle";
          const viewBox = document.createElement("input");
          viewBox.type = "checkbox";
          viewBox.checked = user.passwordViewable !== false;
          viewToggle.append(viewBox, document.createTextNode(" Show"));
          function paintPassword() {
            if (user.roleId === "founder") {
              passText.textContent = "Protected";
              passText.classList.add("admin-user-pass__value--muted");
              passInput.hidden = true;
              viewToggle.hidden = true;
              return;
            }
            const canView = viewBox.checked;
            if (!canView) {
              passText.textContent = "Hidden";
              passText.classList.add("admin-user-pass__value--muted");
              passInput.hidden = true;
              return;
            }
            passText.classList.remove("admin-user-pass__value--muted");
            if (user.passwordPlain) {
              passText.textContent = user.passwordPlain;
              passInput.hidden = true;
            } else {
              passText.textContent = "Not stored";
              passInput.hidden = false;
            }
          }
          paintPassword();
          viewBox.addEventListener("change", paintPassword);
          passWrap.append(passText, passInput, viewToggle);
          tdP.appendChild(passWrap);
          const tdC = document.createElement("td");
          tdC.textContent = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "";
          const tdA = document.createElement("td");
          tdA.className = "admin-table__actions";
          const saveBtn = document.createElement("button");
          saveBtn.type = "button";
          saveBtn.className = "admin-btn admin-btn--ghost admin-btn--sm";
          saveBtn.textContent = "Save";
          saveBtn.addEventListener("click", function () {
            const payload = {
              passwordViewable: viewBox.checked,
            };
            const pick = tdR.querySelector(".admin-role-pick");
            if (pick && pick.getValue) payload.roleId = pick.getValue();
            const nextPass = passInput.value.trim();
            if (nextPass) payload.password = nextPass;
            S.updateAdminUser(user.id, payload).then(renderUsersAdmin);
          });
          const delBtn = document.createElement("button");
          delBtn.type = "button";
          delBtn.className = "admin-btn admin-btn--danger admin-btn--sm";
          delBtn.textContent = "Delete";
          delBtn.addEventListener("click", function () {
            if (!confirm("Delete user @" + user.username + "?")) return;
            S.deleteAdminUser(user.id).then(renderUsersAdmin);
          });
          tdA.append(saveBtn, delBtn);
          tr.append(tdU, tdD, tdR, tdP, tdC, tdA);
          usersTableBody.appendChild(tr);
        });
      })
      .catch(function () {
        usersTableBody.innerHTML = '<tr><td colspan="6">Could not load users.</td></tr>';
      });
  }

  function renderFeaturedAdmin() {
    if (!featuredTableBody) return;
    featuredTableBody.innerHTML = '<tr><td colspan="5">Loading…</td></tr>';
    S.getAdminFeatured()
      .then(function (rows) {
        featuredTableBody.innerHTML = "";
        if (!rows || !rows.length) {
          featuredTableBody.innerHTML = '<tr><td colspan="5">No schedules yet.</td></tr>';
          return;
        }
        rows.forEach(function (entry) {
          const tr = document.createElement("tr");
          const tdG = document.createElement("td");
          tdG.textContent = entry.gameId || "";
          const tdL = document.createElement("td");
          tdL.textContent = entry.label || "—";
          const tdS = document.createElement("td");
          tdS.textContent = entry.startAt ? new Date(entry.startAt).toLocaleString() : "";
          const tdE = document.createElement("td");
          tdE.textContent = entry.endAt ? new Date(entry.endAt).toLocaleString() : "";
          const tdA = document.createElement("td");
          tdA.className = "admin-table__actions";
          const del = document.createElement("button");
          del.type = "button";
          del.className = "admin-btn admin-btn--danger admin-btn--sm";
          del.textContent = "Remove";
          del.addEventListener("click", function () {
            S.deleteAdminFeatured(entry.id).then(renderFeaturedAdmin);
          });
          tdA.appendChild(del);
          tr.append(tdG, tdL, tdS, tdE, tdA);
          featuredTableBody.appendChild(tr);
        });
      })
      .catch(function () {
        featuredTableBody.innerHTML = '<tr><td colspan="5">Could not load schedule.</td></tr>';
      });
  }

  function renderChannelTabs(list) {
    if (!chatChannelTabs) return;
    if (!list || !list.length) {
      list = [{ id: "general", name: "general" }];
    }
    if (!list.some(function (ch) { return ch.id === activeChatChannel; })) {
      activeChatChannel = list[0].id;
    }
    chatChannelTabs.innerHTML = "";
    list.forEach(function (ch) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "admin-channel-tab" + (ch.id === activeChatChannel ? " admin-channel-tab--active" : "");
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", ch.id === activeChatChannel ? "true" : "false");
      btn.setAttribute("data-channel-id", ch.id);
      btn.textContent = ch.name || ch.id;
      btn.addEventListener("click", function () {
        if (activeChatChannel === ch.id) return;
        activeChatChannel = ch.id;
        renderChatAdmin();
      });
      chatChannelTabs.appendChild(btn);
    });
  }

  function renderChatAdmin() {
    applyPanelChrome();
    if (!isModPanel()) {
      renderServerAdmin();
      renderRolesAdmin();
    }
    if (!chatTableBody) return;
    const channelPromise = chatChannelTabs
      ? S.getAdminChatChannels()
          .then(function (rows) {
            renderChannelTabs(rows || []);
          })
          .catch(function () {
            renderChannelTabs([{ id: "general", name: "general" }]);
          })
      : Promise.resolve();
    chatTableBody.innerHTML = '<tr><td colspan="5">Loading…</td></tr>';
    channelPromise
      .then(function () {
        return S.getAdminChatMessages(activeChatChannel);
      })
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
            S.deleteAdminChatMessage(m.id, m.channelId || "general").then(renderChatAdmin);
          });
          const pin = document.createElement("button");
          pin.type = "button";
          pin.className = "admin-btn admin-btn--ghost admin-btn--sm";
          pin.textContent = "Pin";
          pin.addEventListener("click", function () {
            S.pinAdminChatMessage(m.id).then(renderChatAdmin);
          });
          tdB.append(pin, del);
          if (m.userId && !isModPanel()) {
            const mute = document.createElement("button");
            mute.type = "button";
            mute.className = "admin-btn admin-btn--ghost admin-btn--sm";
            mute.textContent = "Mute user";
            mute.addEventListener("click", function () {
              S.muteChatUser(m.userId, true).then(renderChatAdmin);
            });
            tdB.appendChild(mute);
          }
          if (hwid && !isModPanel()) {
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
      .catch(function (err) {
        if (err && err.status === 403) {
          chatTableBody.innerHTML = '<tr><td colspan="5">insufficient permissions loser</td></tr>';
          return;
        }
        chatTableBody.innerHTML = '<tr><td colspan="5">Could not load messages.</td></tr>';
      });
  }

  if (chatServerForm) {
    chatServerForm.addEventListener("submit", function (e) {
      e.preventDefault();
      S.updateAdminChatServer({
        name: chatServerName ? chatServerName.value : "",
        topic: chatServerTopic ? chatServerTopic.value : "",
        channelName: chatServerChannel ? chatServerChannel.value : "general",
        slowModeSeconds: chatSlowMode ? Number(chatSlowMode.value) || 0 : 0,
      })
        .then(renderServerAdmin)
        .catch(function () {
          alert("Could not save server settings. Make sure the Kobran server is running.");
        });
    });
  }

  if (chatUnpin) {
    chatUnpin.addEventListener("click", function () {
      S.unpinAdminChatMessage().then(renderChatAdmin);
    });
  }

  if (featuredForm) {
    featuredForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const gameIdEl = document.getElementById("featured-game-id");
      const labelEl = document.getElementById("featured-label");
      const startEl = document.getElementById("featured-start");
      const endEl = document.getElementById("featured-end");
      const gameId = gameIdEl ? gameIdEl.value.trim() : "";
      const label = labelEl ? labelEl.value.trim() : "";
      const startAt = startEl ? Date.parse(startEl.value) : 0;
      const endAt = endEl ? Date.parse(endEl.value) : 0;
      if (!gameId || !startAt || !endAt) {
        alert("Pick a game ID and valid start/end times.");
        return;
      }
      S.addAdminFeatured({ gameId: gameId, label: label, startAt: startAt, endAt: endAt })
        .then(function () {
          featuredForm.reset();
          renderFeaturedAdmin();
        })
        .catch(function () {
          alert("Could not schedule featured game.");
        });
    });
  }

  if (roleCreateForm) {
    roleCreateForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const fd = new FormData(roleCreateForm);
      S.createAdminChatRole({
        id: fd.get("id"),
        name: fd.get("name"),
        color: fd.get("color"),
        permissions: {
          sendMessages: fd.get("sendMessages") === "on",
          manageMessages: fd.get("manageMessages") === "on",
          manageMembers: fd.get("manageMembers") === "on",
        },
      }).then(function () {
        roleCreateForm.reset();
        renderRolesAdmin();
      });
    });
  }

  if (usersRefresh) {
    usersRefresh.addEventListener("click", renderUsersAdmin);
  }

  document.addEventListener("click", function () {
    document.querySelectorAll(".admin-role-pick__menu").forEach(function (node) {
      node.hidden = true;
    });
  });

  if (chatPurgeForm) {
    chatPurgeForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const fd = new FormData(chatPurgeForm);
      const count = Number(fd.get("count"));
      const channelId = activeChatChannel || "general";
      if (!Number.isInteger(count) || count <= 0) return;
      S.purgeAdminChatMessages(count, channelId).then(renderChatAdmin);
    });
  }

  if (chatClearAll) {
    chatClearAll.addEventListener("click", function () {
      const channelId = activeChatChannel || "general";
      S.purgeAdminChatMessages("all", channelId).then(renderChatAdmin);
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

  function ensureGamesVirtualScroll() {
    if (gamesVirtualReady || !gamesList) return;
    gamesList.innerHTML = "";
    gamesScrollEl = document.createElement("div");
    gamesScrollEl.className = "admin-games-scroll";
    gamesVirtualInner = document.createElement("div");
    gamesVirtualInner.className = "admin-games-virtual";
    gamesScrollEl.appendChild(gamesVirtualInner);
    gamesList.appendChild(gamesScrollEl);
    gamesScrollEl.addEventListener(
      "scroll",
      function () {
        scheduleGamesPaint();
      },
      { passive: true }
    );
    window.addEventListener("resize", scheduleGamesPaint);
    gamesVirtualReady = true;
  }

  function scheduleGamesPaint() {
    if (gamesRenderRaf) return;
    gamesRenderRaf = requestAnimationFrame(function () {
      gamesRenderRaf = 0;
      paintGamesWindow();
    });
  }

  function buildGameRow(game) {
    const row = document.createElement("div");
    row.className = "admin-game admin-game--virtual";
    const img = document.createElement("img");
    img.className = "admin-game__thumb";
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    const thumb = effectiveThumbForGame(game);
    if (thumb) {
      img.dataset.src = thumbSrc(thumb);
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
    return row;
  }

  function hydrateRowImages(container) {
    if (!container) return;
    container.querySelectorAll(".admin-game__thumb[data-src]").forEach(function (img) {
      if (img.src) return;
      img.src = img.dataset.src;
      img.removeAttribute("data-src");
    });
  }

  function paintGamesWindow() {
    if (!gamesScrollEl || !gamesVirtualInner) return;
    const total = gamesFiltered.length;
    if (!total) {
      gamesVirtualInner.className = "admin-games-virtual admin-games-virtual--empty";
      gamesVirtualInner.style.height = "";
      gamesVirtualInner.innerHTML = '<p class="admin-empty">No games match your filter.</p>';
      return;
    }
    gamesVirtualInner.className = "admin-games-virtual";
    gamesVirtualInner.style.height = total * GAMES_ROW_HEIGHT + "px";
    const scrollTop = gamesScrollEl.scrollTop;
    const viewH = gamesScrollEl.clientHeight || 480;
    const start = Math.max(0, Math.floor(scrollTop / GAMES_ROW_HEIGHT) - GAMES_OVERSCAN);
    const end = Math.min(total, Math.ceil((scrollTop + viewH) / GAMES_ROW_HEIGHT) + GAMES_OVERSCAN);
    const frag = document.createDocumentFragment();
    for (let i = start; i < end; i++) {
      const game = gamesFiltered[i];
      const row = buildGameRow(game);
      row.style.top = i * GAMES_ROW_HEIGHT + "px";
      frag.appendChild(row);
    }
    gamesVirtualInner.replaceChildren(frag);
    hydrateRowImages(gamesVirtualInner);
  }

  function renderGames() {
    ensureGamesVirtualScroll();
    const q = (gamesFilter.value || "").trim().toLowerCase();
    gamesTotal.textContent = adminGames.length + " games in library";
    gamesFiltered = adminGames.filter(function (g) {
      if (!q) return true;
      const hay = (g.search || S.buildSearch(g)).toLowerCase();
      return hay.includes(q) || g.title.toLowerCase().includes(q) || g.id.toLowerCase().includes(q);
    });
    if (gamesScrollEl) gamesScrollEl.scrollTop = 0;
    if (gamesFiltered.length) {
      gamesTotal.textContent =
        gamesFiltered.length === adminGames.length
          ? adminGames.length + " games in library"
          : gamesFiltered.length + " of " + adminGames.length + " games";
    }
    scheduleGamesPaint();
  }

  gamesFilter.addEventListener("input", function () {
    clearTimeout(gamesFilterTimer);
    gamesFilterTimer = setTimeout(renderGames, 180);
  });

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
    return "/api/thumb/" + encodeURIComponent(game.id) + ".png";
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
