(function () {
  var CHANNEL = "general";
  var messagesEl = document.getElementById("zchat-messages");
  var messagesWrap = document.getElementById("zchat-messages-wrap");
  var form = document.getElementById("zchat-form");
  var input = document.getElementById("zchat-input");
  var userbar = document.getElementById("zchat-userbar");
  var meName = document.getElementById("zchat-me-name");
  var meUser = document.getElementById("zchat-me-user");
  var meAvatar = document.getElementById("zchat-me-avatar");
  var channelTitle = document.getElementById("zchat-channel-title");
  var channelTopic = document.getElementById("zchat-channel-topic");
  var railChannelName = document.getElementById("zchat-rail-channel-name");
  var serverBadge = document.getElementById("zchat-server-badge");
  var serverIcon = document.getElementById("zchat-server-icon");
  var membersList = document.getElementById("zchat-members-list");
  var onlineCount = document.getElementById("zchat-online-count");
  var toastEl = document.getElementById("zchat-toast");
  var toastTimer = null;

  var revision = null;
  var pollTimer = null;
  var presenceTimer = null;
  var sending = false;
  var deletingId = null;
  var lastMessageKey = "";
  var pinnedMessage = null;
  var serverMeta = { name: "Zentra", topic: "", channelName: "general" };

  if (messagesWrap) messagesWrap.hidden = true;

  function esc(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function formatTime(ts) {
    try {
      return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch (e) {
      return "";
    }
  }

  function initials(name) {
    var p = String(name || "?").trim().split(/\s+/);
    return ((p[0] && p[0][0]) || "?").toUpperCase() + ((p[1] && p[1][0]) || "").toUpperCase();
  }

  function showToast(text, isError) {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.hidden = false;
    toastEl.classList.toggle("zchat__toast--error", !!isError);
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.hidden = true;
    }, 2800);
  }

  function api(path, options) {
    options = options || {};
    var headers = Object.assign({}, options.headers || {});
    if (options.body != null) headers["Content-Type"] = "application/json";
    return fetch(path, {
      method: options.method || "GET",
      credentials: "same-origin",
      headers: headers,
      body: options.body != null ? JSON.stringify(options.body) : undefined,
    }).then(function (res) {
      if (res.status === 204) return { unchanged: true };
      return res.json().then(function (data) {
        var rev = res.headers.get("X-Chat-Revision");
        if (rev) revision = Number(rev);
        if (!res.ok) throw new Error((data && data.error) || "error");
        return data;
      });
    });
  }

  function applyServer(meta) {
    serverMeta = meta || serverMeta;
    CHANNEL = serverMeta.channelId || "general";
    var label = serverMeta.channelName || "general";
    if (channelTitle) channelTitle.textContent = label;
    if (railChannelName) railChannelName.textContent = label;
    if (channelTopic) channelTopic.textContent = serverMeta.topic || "";
    if (serverBadge) serverBadge.textContent = serverMeta.name || "Zentra";
    if (serverIcon) {
      var letter = String(serverMeta.name || "Z").trim().charAt(0).toUpperCase() || "Z";
      serverIcon.textContent = letter;
    }
    if (input) input.placeholder = "Message #" + label;
    document.title = (serverMeta.name || "Zentra") + " Chat";
  }

  function renderMembers(list) {
    if (!membersList) return;
    membersList.innerHTML = "";
    if (onlineCount) onlineCount.textContent = String((list || []).length);
    (list || []).forEach(function (m) {
      var row = document.createElement("div");
      row.className = "zchat__member";
      var av = m.avatar
        ? '<img class="zchat__member-avatar" src="' + esc(m.avatar) + '" alt="" width="32" height="32" />'
        : '<span class="zchat__member-avatar zchat__member-avatar--fallback">' + esc(initials(m.displayName)) + "</span>";
      row.innerHTML =
        av +
        '<div class="zchat__member-body"><strong style="color:' +
        esc(m.roleColor || "#eef0ff") +
        '">' +
        esc(m.displayName) +
        '</strong><span>' +
        esc(m.roleName || "Member") +
        "</span></div>";
      membersList.appendChild(row);
    });
  }

  function messageListKey(list) {
    return (list || [])
      .map(function (m) {
        return [m.id, m.ts, m.text, m.name, m.avatar, m.mine, m.canDelete].join("\u0001");
      })
      .join("\u0002");
  }

  function wasNearBottom() {
    if (!messagesWrap) return true;
    return messagesWrap.scrollHeight - messagesWrap.scrollTop - messagesWrap.clientHeight < 96;
  }

  function deleteMessage(messageId, rowEl, buttonEl) {
    if (!messageId || deletingId) return;
    deletingId = messageId;
    if (buttonEl) {
      buttonEl.disabled = true;
      buttonEl.textContent = "Deleting…";
    }
    api("/api/chat/channels/" + encodeURIComponent(CHANNEL) + "/messages/" + encodeURIComponent(messageId), {
      method: "DELETE",
    })
      .then(function () {
        if (rowEl && rowEl.parentNode) rowEl.remove();
        lastMessageKey = "";
        revision = null;
        return loadMessages(true);
      })
      .catch(function (err) {
        showToast("Could not delete message", true);
        if (buttonEl) {
          buttonEl.disabled = false;
          buttonEl.textContent = "Delete";
        }
      })
      .finally(function () {
        deletingId = null;
      });
  }

  function renderPinned() {
    var wrap = document.getElementById("zchat-pinned");
    if (!wrap) return;
    if (!pinnedMessage) {
      wrap.hidden = true;
      wrap.innerHTML = "";
      return;
    }
    wrap.hidden = false;
    wrap.innerHTML =
      '<div class="zchat__pinned-label">Pinned</div>' +
      '<div class="zchat__pinned-body"><strong>' +
      esc(pinnedMessage.name) +
      "</strong> " +
      esc(pinnedMessage.text) +
      "</div>";
  }

  function renderMessages(list) {
    if (!messagesEl) return;
    var key = messageListKey(list);
    if (key === lastMessageKey) return;
    lastMessageKey = key;
    var stickBottom = wasNearBottom();
    var prevScroll = messagesWrap ? messagesWrap.scrollTop : 0;
    messagesEl.innerHTML = "";
    var lastDay = "";
    (list || []).forEach(function (m) {
      var day = new Date(m.ts).toLocaleDateString();
      if (day !== lastDay) {
        lastDay = day;
        var sep = document.createElement("div");
        sep.className = "zchat__day-sep";
        sep.textContent = day;
        messagesEl.appendChild(sep);
      }
      var row = document.createElement("article");
      row.className = "zchat__msg" + (m.mine ? " zchat__msg--mine" : "") + (m.canDelete ? " zchat__msg--deletable" : "");
      row.dataset.messageId = m.id;
      var avatar = m.avatar
        ? '<img class="zchat__msg-avatar" src="' + esc(m.avatar) + '" alt="" width="40" height="40" />'
        : '<span class="zchat__msg-avatar zchat__msg-avatar--fallback">' + esc(initials(m.name)) + "</span>";
      var actions = "";
      if (m.canDelete) {
        actions =
          '<div class="zchat__msg-actions"><button type="button" class="zchat__msg-del" data-delete="' +
          esc(m.id) +
          '" aria-label="Delete message">Delete</button></div>';
      }
      row.innerHTML =
        avatar +
        '<div class="zchat__msg-body"><header class="zchat__msg-head"><strong>' +
        esc(m.name) +
        '</strong><time>' +
        esc(formatTime(m.ts)) +
        "</time>" +
        actions +
        '</header><p class="zchat__msg-text">' +
        esc(m.text) +
        "</p></div>";
      messagesEl.appendChild(row);
    });
    if (messagesWrap) {
      if (stickBottom) messagesWrap.scrollTop = messagesWrap.scrollHeight;
      else messagesWrap.scrollTop = prevScroll;
    }
  }

  function loadMessages(force) {
    if (force) revision = null;
    var url = "/api/chat/channels/" + encodeURIComponent(CHANNEL) + "/messages";
    if (!force && revision != null) url += "?rev=" + encodeURIComponent(String(revision));
    return api(url)
      .then(function (data) {
        if (data && data.unchanged) return;
        if (data && data.pinned !== undefined) {
          pinnedMessage = data.pinned || null;
          renderPinned();
        }
        if (Array.isArray(data)) {
          renderMessages(data);
        } else if (data && Array.isArray(data.messages)) {
          if (data.pinned !== undefined) pinnedMessage = data.pinned || null;
          renderPinned();
          renderMessages(data.messages);
        }
      })
      .catch(function () {});
  }

  function loadOnline() {
    return api("/api/chat/online")
      .then(function (data) {
        if (Array.isArray(data)) renderMembers(data);
      })
      .catch(function () {});
  }

  function pingPresence() {
    return api("/api/chat/presence", { method: "POST", body: {} }).catch(function () {});
  }

  function showUser(user) {
    if (!userbar) return;
    userbar.hidden = false;
    if (meName) meName.textContent = user.displayName || user.username;
    if (meUser) meUser.textContent = "@" + user.username;
    if (meAvatar) {
      if (user.avatar) {
        meAvatar.src = user.avatar;
        meAvatar.hidden = false;
      } else {
        meAvatar.removeAttribute("src");
        meAvatar.hidden = true;
      }
    }
    if (form) form.hidden = false;
  }

  function showGuest() {
    stopLoops();
    window.location.replace("/");
  }

  function showAuthed(user) {
    if (messagesWrap) messagesWrap.hidden = false;
    showUser(user);
    pingPresence();
    loadOnline();
    loadMessages(true).then(startLoops);
  }

  function resolveUser() {
    if (window.ZentraAuth && window.ZentraAuth.isLoggedIn()) {
      return Promise.resolve(window.ZentraAuth.user());
    }
    return fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store" })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (data && data.user) {
          if (window.ZentraAuth && window.ZentraAuth.refresh) {
            return window.ZentraAuth.refresh().then(function () {
              return data.user;
            });
          }
          return data.user;
        }
        return null;
      });
  }

  function applyAuthState() {
    resolveUser()
      .then(function (user) {
        if (user) showAuthed(user);
        else showGuest();
      })
      .catch(function () {
        showGuest();
      });
  }

  function startLoops() {
    stopLoops();
    pollTimer = setInterval(function () {
      if (deletingId || (messagesWrap && messagesWrap.matches(":hover"))) return;
      loadMessages(false);
    }, 2800);
    presenceTimer = setInterval(function () {
      pingPresence().then(loadOnline);
    }, 12000);
  }

  function stopLoops() {
    if (pollTimer) clearInterval(pollTimer);
    if (presenceTimer) clearInterval(presenceTimer);
    pollTimer = null;
    presenceTimer = null;
  }

  if (messagesEl) {
    messagesEl.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-delete]");
      if (!btn) return;
      var row = btn.closest(".zchat__msg");
      if (!row) return;
      e.preventDefault();
      e.stopPropagation();
      deleteMessage(btn.getAttribute("data-delete"), row, btn);
    });
  }

  if (form && input) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (sending) return;
      var text = input.value.trim();
      if (!text) return;
      sending = true;
      api("/api/chat/channels/" + encodeURIComponent(CHANNEL) + "/messages", {
        method: "POST",
        body: { text: text },
      })
        .then(function () {
          input.value = "";
          lastMessageKey = "";
          revision = null;
          return loadMessages(true);
        })
        .catch(function (err) {
          var code = err && err.message;
          if (code === "muted") showToast("You are muted in chat", true);
          else if (code === "slow_mode") showToast("Slow mode is on — wait a moment", true);
          else if (code === "rate_limited") showToast("You are sending too fast", true);
          else showToast("Could not send message", true);
        })
        .finally(function () {
          sending = false;
        });
    });
  }

  function boot() {
    api("/api/chat/settings")
      .then(applyServer)
      .catch(function () {
        return api("/api/chat/server").then(applyServer);
      })
      .catch(function () {});
    var ready =
      window.ZentraAuth && window.ZentraAuth.whenReady
        ? window.ZentraAuth.whenReady()
        : window.ZentraAuth && window.ZentraAuth.refresh
          ? window.ZentraAuth.refresh()
          : Promise.resolve();
    ready.then(applyAuthState);
  }

  window.addEventListener("zentra-auth", applyAuthState);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) applyAuthState();
  });
  window.addEventListener("focus", function () {
    if (window.ZentraAuth && window.ZentraAuth.refresh) {
      window.ZentraAuth.refresh().then(applyAuthState);
    } else {
      applyAuthState();
    }
  });

  try {
    var authChannel = new BroadcastChannel("zentra-auth");
    authChannel.onmessage = function () {
      if (window.ZentraAuth && window.ZentraAuth.refresh) {
        window.ZentraAuth.refresh().then(applyAuthState);
      }
    };
  } catch (e) {}

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
