(function () {
  var root = document.getElementById("kchat-root");
  if (!root) return;

  var lobbyMessages = document.getElementById("kchat-lobby-messages");
  var lobbyForm = document.getElementById("kchat-lobby-form");
  var lobbyInput = document.getElementById("kchat-lobby-input");
  var lobbyImageInput = document.getElementById("kchat-lobby-image");
  var lobbyAttach = document.getElementById("kchat-lobby-attach");
  var lobbyAttachImg = document.getElementById("kchat-lobby-attach-img");
  var lobbyAttachClear = document.getElementById("kchat-lobby-attach-clear");
  var sessionHome = document.getElementById("kchat-session-home");
  var sessionActive = document.getElementById("kchat-session-active");
  var sessionMessages = document.getElementById("kchat-session-messages");
  var sessionForm = document.getElementById("kchat-session-form");
  var sessionInput = document.getElementById("kchat-session-input");
  var sessionImageInput = document.getElementById("kchat-session-image");
  var sessionAttach = document.getElementById("kchat-session-attach");
  var sessionAttachImg = document.getElementById("kchat-session-attach-img");
  var sessionAttachClear = document.getElementById("kchat-session-attach-clear");
  var sessionCodeEl = document.getElementById("kchat-session-code");
  var sessionModeEl = document.getElementById("kchat-session-mode");
  var sessionMembers = document.getElementById("kchat-session-members");
  var joinInput = document.getElementById("kchat-join-code");
  var joinBtn = document.getElementById("kchat-join-btn");
  var createBtns = root.querySelectorAll("[data-create-mode]");
  var leaveBtn = document.getElementById("kchat-leave-btn");
  var endBtn = document.getElementById("kchat-end-btn");
  var statusEl = document.getElementById("kchat-status");
  var tabBtns = root.querySelectorAll("[data-kchat-tab]");
  var panels = root.querySelectorAll("[data-kchat-panel]");
  var subTabBtns = root.querySelectorAll("[data-kchat-sub]");
  var subPanels = root.querySelectorAll("[data-kchat-subpanel]");

  var ws = null;
  var me = null;
  var session = null;
  var reconnectTimer = null;
  var pollTimer = null;
  var transport = "";
  var wsFails = 0;
  var connected = false;
  var connectGen = 0;
  var lobbyRev = null;
  var sessionRev = "";
  var lobbyPendingImage = "";
  var sessionPendingImage = "";

  switchTab("lobby");
  switchSubTab("create");

  function esc(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function escAttr(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function safeImageSrc(src) {
    var s = String(src || "").trim();
    if (!/^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/i.test(s)) return "";
    return s;
  }

  function initials(name) {
    var p = String(name || "?").trim().split(/\s+/);
    return ((p[0] && p[0][0]) || "?").toUpperCase() + ((p[1] && p[1][0]) || "").toUpperCase();
  }

  function formatTime(ts) {
    try {
      return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch (e) {
      return "";
    }
  }

  function setStatus(text, isError) {
    if (!statusEl) return;
    statusEl.textContent = text || "";
    statusEl.hidden = !text;
    statusEl.classList.toggle("kchat__status--error", !!isError);
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
      return res.json().then(function (data) {
        if (!res.ok) throw new Error((data && data.error) || "error");
        return data;
      });
    });
  }

  function wsUrl() {
    var proto = location.protocol === "https:" ? "wss:" : "ws:";
    return proto + "//" + location.host + "/ws/chat";
  }

  function wsSend(payload) {
    if (transport !== "ws" || !ws || ws.readyState !== 1) return false;
    ws.send(JSON.stringify(payload));
    return true;
  }

  function renderMessageRow(m, mine) {
    var av = m.avatar
      ? '<img class="kchat__avatar" src="' + escAttr(m.avatar) + '" alt="" width="36" height="36" />'
      : '<span class="kchat__avatar kchat__avatar--fallback">' + esc(initials(m.name)) + "</span>";
    var imgSrc = safeImageSrc(m.image);
    var imgHtml = imgSrc
      ? '<img class="kchat__msg-image" src="' + escAttr(imgSrc) + '" alt="" loading="lazy" />'
      : "";
    var textHtml = m.text ? '<p class="kchat__msg-text">' + esc(m.text) + "</p>" : "";
    return (
      '<article class="kchat__msg' +
      (mine ? " kchat__msg--mine" : "") +
      '">' +
      av +
      '<div class="kchat__msg-body"><div class="kchat__msg-meta"><strong>' +
      esc(m.name) +
      "</strong><time>" +
      esc(formatTime(m.ts)) +
      "</time></div>" +
      imgHtml +
      textHtml +
      "</div></article>"
    );
  }

  function paintMessages(el, list, userId) {
    if (!el) return;
    el.innerHTML = (list || [])
      .map(function (m) {
        return renderMessageRow(m, m.userId === userId);
      })
      .join("");
    el.scrollTop = el.scrollHeight;
  }

  function appendMessage(el, m, userId) {
    if (!el) return;
    el.insertAdjacentHTML("beforeend", renderMessageRow(m, m.userId === userId));
    el.scrollTop = el.scrollHeight;
  }

  function switchTab(name) {
    tabBtns.forEach(function (btn) {
      btn.classList.toggle("kchat__tab--active", btn.getAttribute("data-kchat-tab") === name);
    });
    panels.forEach(function (panel) {
      var on = panel.getAttribute("data-kchat-panel") === name;
      panel.hidden = !on;
    });
  }

  function switchSubTab(name) {
    subTabBtns.forEach(function (btn) {
      btn.classList.toggle("kchat__subtab--active", btn.getAttribute("data-kchat-sub") === name);
    });
    subPanels.forEach(function (panel) {
      panel.hidden = panel.getAttribute("data-kchat-subpanel") !== name;
    });
  }

  function showSessionHome() {
    session = null;
    sessionRev = "";
    clearPendingImage("session");
    if (sessionHome) sessionHome.hidden = false;
    if (sessionActive) sessionActive.hidden = true;
    switchSubTab("create");
  }

  function showSessionActive(data) {
    session = data;
    switchTab("private");
    if (sessionHome) sessionHome.hidden = true;
    if (sessionActive) sessionActive.hidden = false;
    if (sessionCodeEl) sessionCodeEl.textContent = data.code || "";
    if (sessionModeEl) sessionModeEl.textContent = "CHAT";
    if (endBtn) endBtn.hidden = data.hostId !== (me && me.id);
    renderMembers(data.members || []);
    sessionRev = "";
  }

  function renderMembers(list) {
    if (!sessionMembers) return;
    sessionMembers.innerHTML = (list || [])
      .map(function (m) {
        var av = m.avatar
          ? '<img src="' + escAttr(m.avatar) + '" alt="" width="28" height="28" />'
          : '<span class="kchat__member-fallback">' + esc(initials(m.displayName)) + "</span>";
        return '<div class="kchat__member">' + av + "<span>" + esc(m.displayName) + "</span></div>";
      })
      .join("");
  }

  function stopPoll() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function loadLobbyHttp() {
    return api("/api/chat/lobby/messages").then(function (data) {
      if (data.revision === lobbyRev) return;
      lobbyRev = data.revision;
      paintMessages(lobbyMessages, data.messages || [], me && me.id);
    });
  }

  function loadSessionHttp() {
    if (!session || !session.id) return Promise.resolve();
    return api("/api/chat/sessions/" + encodeURIComponent(session.id)).then(function (data) {
      var key = JSON.stringify(data.messages || []);
      if (key === sessionRev) {
        if (data.session) renderMembers(data.session.members || []);
        return;
      }
      sessionRev = key;
      if (data.session) {
        session = data.session;
        if (endBtn) endBtn.hidden = session.hostId !== (me && me.id);
        renderMembers(session.members || []);
      }
      paintMessages(sessionMessages, data.messages || [], me && me.id);
    });
  }

  function startHttpTransport() {
    transport = "http";
    connected = true;
    wsFails = 0;
    stopPoll();
    setStatus("");
    loadLobbyHttp().catch(function () {});
    pollTimer = setInterval(function () {
      loadLobbyHttp().catch(function () {});
      if (session && session.id) loadSessionHttp().catch(function () {});
    }, 2800);
  }

  function handleWsMessage(ev) {
    var msg;
    try {
      msg = JSON.parse(ev.data);
    } catch (e) {
      return;
    }
    if (msg.type === "ready") {
      me = msg.user;
      connected = true;
      transport = "ws";
      setStatus("");
      return;
    }
    if (msg.type === "error") {
      var err = msg.error;
      setStatus(
        err === "not_found"
          ? "Session not found."
          : err === "full"
            ? "Session is full."
            : err === "bad_image"
              ? "That image cant be sent."
              : err === "too_long"
                ? "Message too long."
                : "Something went wrong.",
        true
      );
      return;
    }
    if (msg.type === "lobby:sync") {
      paintMessages(lobbyMessages, (msg.data && msg.data.messages) || [], me && me.id);
      if (msg.data) lobbyRev = msg.data.revision;
      return;
    }
    if (msg.type === "lobby:message") {
      appendMessage(lobbyMessages, msg.message, me && me.id);
      if (msg.revision != null) lobbyRev = msg.revision;
      return;
    }
    if (msg.type === "session:state") {
      showSessionActive(msg.session);
      paintMessages(sessionMessages, msg.messages || [], me && me.id);
      return;
    }
    if (msg.type === "session:message") {
      appendMessage(sessionMessages, msg.message, me && me.id);
      return;
    }
    if (msg.type === "session:member") {
      if (!session) return;
      if (msg.action === "join" && msg.member) {
        session.members = (session.members || []).filter(function (m) {
          return m.id !== msg.member.id;
        });
        session.members.push(msg.member);
        renderMembers(session.members);
      }
      if (msg.action === "leave" && msg.member) {
        session.members = (session.members || []).filter(function (m) {
          return m.id !== msg.member.id;
        });
        renderMembers(session.members);
      }
      return;
    }
    if (msg.type === "session:ended") {
      setStatus(msg.reason === "ended" ? "Session ended." : "Session closed.", false);
      showSessionHome();
      return;
    }
    if (msg.type === "session:left") {
      showSessionHome();
    }
  }

  function fallbackToHttp() {
    if (ws) {
      try {
        ws.onclose = null;
        ws.close();
      } catch (e) {}
      ws = null;
    }
    startHttpTransport();
  }

  function connectWs() {
    if (!window.KobranAuth || !window.KobranAuth.isLoggedIn()) {
      setStatus("Sign in to use chat.", true);
      return;
    }
    if (transport === "http" && connected) return;
    connectGen += 1;
    var gen = connectGen;
    stopPoll();
    if (ws) {
      try {
        ws.onclose = null;
        ws.close();
      } catch (e) {}
      ws = null;
    }
    transport = "ws";
    connected = false;
    var opened = false;
    var openTimer = setTimeout(function () {
      if (gen !== connectGen || opened) return;
      wsFails += 1;
      fallbackToHttp();
    }, 3500);
    ws = new WebSocket(wsUrl());
    ws.onopen = function () {
      if (gen !== connectGen) return;
      opened = true;
      clearTimeout(openTimer);
      wsFails = 0;
      connected = true;
      setStatus("");
    };
    ws.onmessage = handleWsMessage;
    ws.onclose = function (ev) {
      if (gen !== connectGen) return;
      clearTimeout(openTimer);
      connected = false;
      if (ev.code === 4401) {
        setStatus("Sign in to use chat.", true);
        return;
      }
      if (ev.code === 4403) {
        setStatus("Chat blocked on this device.", true);
        return;
      }
      wsFails += 1;
      if (wsFails >= 2) {
        fallbackToHttp();
        return;
      }
      setStatus("Reconnecting…", false);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connectWs, 2200);
    };
    ws.onerror = function () {
      if (gen !== connectGen || opened) return;
    };
  }

  function ensureMe() {
    if (me) return Promise.resolve(me);
    return api("/api/auth/session").then(function (data) {
      me = data.user || null;
      return me;
    });
  }

  function createSession(mode) {
    ensureMe()
      .then(function () {
        if (transport === "ws" && wsSend({ type: "session:create", mode: mode || "chat" })) return null;
        return api("/api/chat/sessions", { method: "POST", body: { mode: mode || "chat" } }).then(function (data) {
          return api("/api/chat/sessions/" + encodeURIComponent(data.session.id));
        });
      })
      .then(function (pack) {
        if (!pack) return;
        showSessionActive(pack.session);
        paintMessages(sessionMessages, pack.messages || [], me && me.id);
      })
      .catch(function () {
        setStatus("Could not create session.", true);
      });
  }

  function joinSession(code) {
    ensureMe()
      .then(function () {
        if (transport === "ws" && wsSend({ type: "session:join", code: code })) return null;
        return api("/api/chat/sessions/join", { method: "POST", body: { code: code } }).then(function (data) {
          return api("/api/chat/sessions/" + encodeURIComponent(data.session.id));
        });
      })
      .then(function (pack) {
        if (!pack) return;
        showSessionActive(pack.session);
        paintMessages(sessionMessages, pack.messages || [], me && me.id);
      })
      .catch(function (err) {
        var msg = String((err && err.message) || "");
        setStatus(msg === "not_found" ? "Session not found." : msg === "full" ? "Session is full." : "Could not join session.", true);
      });
  }

  function leaveSession() {
    if (!session) {
      showSessionHome();
      return;
    }
    if (transport === "ws") wsSend({ type: "session:leave" });
    else {
      api("/api/chat/sessions/leave", { method: "POST", body: { sessionId: session.id } }).catch(function () {});
    }
    showSessionHome();
  }

  function endSession() {
    if (!session) return;
    if (transport === "ws") wsSend({ type: "session:end" });
    else {
      api("/api/chat/sessions/end", { method: "POST", body: { sessionId: session.id } }).catch(function () {});
    }
    showSessionHome();
  }

  function clearPendingImage(kind) {
    if (kind === "lobby") {
      lobbyPendingImage = "";
      if (lobbyAttach) lobbyAttach.hidden = true;
      if (lobbyAttachImg) lobbyAttachImg.removeAttribute("src");
      if (lobbyImageInput) lobbyImageInput.value = "";
      return;
    }
    sessionPendingImage = "";
    if (sessionAttach) sessionAttach.hidden = true;
    if (sessionAttachImg) sessionAttachImg.removeAttribute("src");
    if (sessionImageInput) sessionImageInput.value = "";
  }

  function setPendingImage(kind, dataUrl) {
    if (kind === "lobby") {
      lobbyPendingImage = dataUrl;
      if (lobbyAttachImg) lobbyAttachImg.src = dataUrl;
      if (lobbyAttach) lobbyAttach.hidden = false;
      return;
    }
    sessionPendingImage = dataUrl;
    if (sessionAttachImg) sessionAttachImg.src = dataUrl;
    if (sessionAttach) sessionAttach.hidden = false;
  }

  function readChatImage(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\/(png|jpe?g|gif|webp)$/i.test(file.type)) {
        reject(new Error("bad_type"));
        return;
      }
      if (file.size > 900000) {
        reject(new Error("too_big"));
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        var url = String(reader.result || "");
        if (!safeImageSrc(url) || url.length > 1200000) {
          reject(new Error("too_big"));
          return;
        }
        resolve(url);
      };
      reader.onerror = function () {
        reject(new Error("read"));
      };
      reader.readAsDataURL(file);
    });
  }

  function bindImagePicker(input, kind) {
    if (!input) return;
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (!file) return;
      readChatImage(file)
        .then(function (url) {
          setPendingImage(kind, url);
          setStatus("");
        })
        .catch(function (err) {
          clearPendingImage(kind);
          var code = String((err && err.message) || "");
          setStatus(code === "too_big" ? "Image too big, keep it under 900kb." : "Could not use that image.", true);
        });
    });
  }

  function sendChatMessage(opts) {
    var text = opts.text || "";
    var image = opts.image || "";
    if (!text && !image) return;
    if (opts.kind === "lobby") {
      if (transport === "ws" && wsSend({ type: "lobby:send", text: text, image: image })) {
        if (lobbyInput) lobbyInput.value = "";
        clearPendingImage("lobby");
        return;
      }
      if (transport === "http") {
        api("/api/chat/lobby/messages", { method: "POST", body: { text: text, image: image } })
          .then(function (data) {
            if (data.message) appendMessage(lobbyMessages, data.message, me && me.id);
            if (lobbyInput) lobbyInput.value = "";
            clearPendingImage("lobby");
          })
          .catch(function (err) {
            var code = String((err && err.message) || "");
            setStatus(code === "bad_image" ? "That image cant be sent." : "Could not send message.", true);
          });
        return;
      }
      setStatus("Not connected", true);
      return;
    }
    if (!session) return;
    if (transport === "ws" && wsSend({ type: "session:send", text: text, image: image })) {
      if (sessionInput) sessionInput.value = "";
      clearPendingImage("session");
      return;
    }
    if (transport === "http") {
      api("/api/chat/sessions/" + encodeURIComponent(session.id) + "/messages", {
        method: "POST",
        body: { text: text, image: image },
      })
        .then(function (data) {
          if (data.message) appendMessage(sessionMessages, data.message, me && me.id);
          if (sessionInput) sessionInput.value = "";
          clearPendingImage("session");
        })
        .catch(function (err) {
          var code = String((err && err.message) || "");
          setStatus(code === "bad_image" ? "That image cant be sent." : "Could not send message.", true);
        });
      return;
    }
    setStatus("Not connected", true);
  }

  function boot() {
    if (!window.KobranAuth) return;
    window.KobranAuth.whenReady().then(function () {
      if (!window.KobranAuth.isLoggedIn()) {
        setStatus("Sign in to use chat.", true);
        return;
      }
      if (document.body.classList.contains("kchat-page")) connectWs();
    });
  }

  tabBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      switchTab(btn.getAttribute("data-kchat-tab"));
    });
  });

  subTabBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      switchSubTab(btn.getAttribute("data-kchat-sub"));
    });
  });

  if (lobbyForm) {
    lobbyForm.addEventListener("submit", function (e) {
      e.preventDefault();
      sendChatMessage({
        kind: "lobby",
        text: lobbyInput ? lobbyInput.value.trim() : "",
        image: lobbyPendingImage,
      });
    });
  }

  if (sessionForm) {
    sessionForm.addEventListener("submit", function (e) {
      e.preventDefault();
      sendChatMessage({
        kind: "session",
        text: sessionInput ? sessionInput.value.trim() : "",
        image: sessionPendingImage,
      });
    });
  }

  bindImagePicker(lobbyImageInput, "lobby");
  bindImagePicker(sessionImageInput, "session");
  if (lobbyAttachClear) lobbyAttachClear.addEventListener("click", function () {
    clearPendingImage("lobby");
  });
  if (sessionAttachClear) sessionAttachClear.addEventListener("click", function () {
    clearPendingImage("session");
  });

  createBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      createSession(btn.getAttribute("data-create-mode") || "chat");
    });
  });

  if (joinBtn) {
    joinBtn.addEventListener("click", function () {
      var code = joinInput ? joinInput.value.trim().toUpperCase() : "";
      if (!code) return;
      joinSession(code);
    });
  }

  if (leaveBtn) leaveBtn.addEventListener("click", leaveSession);
  if (endBtn) endBtn.addEventListener("click", endSession);

  window.KobranChat = {
    connect: connectWs,
    disconnect: function () {
      connectGen += 1;
      connected = false;
      transport = "";
      stopPoll();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        try {
          ws.onclose = null;
          ws.close();
        } catch (e) {}
        ws = null;
      }
    },
  };

  window.addEventListener("kobran-auth", function () {
    if (window.KobranAuth && window.KobranAuth.isLoggedIn()) connectWs();
  });

  boot();
})();
