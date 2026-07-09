(function () {
  var root = document.getElementById("kchat-root");
  if (!root) return;

  var lobbyMessages = document.getElementById("kchat-lobby-messages");
  var lobbyForm = document.getElementById("kchat-lobby-form");
  var lobbyInput = document.getElementById("kchat-lobby-input");
  var sessionHome = document.getElementById("kchat-session-home");
  var sessionActive = document.getElementById("kchat-session-active");
  var sessionMessages = document.getElementById("kchat-session-messages");
  var sessionForm = document.getElementById("kchat-session-form");
  var sessionInput = document.getElementById("kchat-session-input");
  var sessionCodeEl = document.getElementById("kchat-session-code");
  var sessionModeEl = document.getElementById("kchat-session-mode");
  var sessionMembers = document.getElementById("kchat-session-members");
  var joinInput = document.getElementById("kchat-join-code");
  var joinBtn = document.getElementById("kchat-join-btn");
  var createBtns = root.querySelectorAll("[data-create-mode]");
  var leaveBtn = document.getElementById("kchat-leave-btn");
  var endBtn = document.getElementById("kchat-end-btn");
  var enableMediaBtn = document.getElementById("kchat-enable-media");
  var callGrid = document.getElementById("kchat-call-grid");
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
  var peers = {};
  var localStream = null;
  var remoteStreams = {};
  var pendingIce = {};

  switchTab("lobby");
  switchSubTab("create");

  function esc(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
      ? '<img class="kchat__avatar" src="' + esc(m.avatar) + '" alt="" width="36" height="36" />'
      : '<span class="kchat__avatar kchat__avatar--fallback">' + esc(initials(m.name)) + "</span>";
    return (
      '<article class="kchat__msg' +
      (mine ? " kchat__msg--mine" : "") +
      '">' +
      av +
      '<div class="kchat__msg-body"><div class="kchat__msg-meta"><strong>' +
      esc(m.name) +
      "</strong><time>" +
      esc(formatTime(m.ts)) +
      '</time></div><p class="kchat__msg-text">' +
      esc(m.text) +
      "</p></div></article>"
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

  function syncEnableMediaBtn(mode) {
    if (!enableMediaBtn) return;
    var needs = mode === "voice" || mode === "video";
    if (!needs || localStream) {
      enableMediaBtn.hidden = true;
      return;
    }
    enableMediaBtn.hidden = false;
    enableMediaBtn.textContent = mode === "video" ? "Allow camera & microphone" : "Allow microphone";
  }

  function showSessionHome() {
    session = null;
    sessionRev = "";
    if (sessionHome) sessionHome.hidden = false;
    if (sessionActive) sessionActive.hidden = true;
    if (enableMediaBtn) enableMediaBtn.hidden = true;
    switchSubTab("create");
    stopMedia();
    clearPeers();
    if (callGrid) callGrid.innerHTML = "";
  }

  function showSessionActive(data) {
    session = data;
    switchTab("private");
    if (sessionHome) sessionHome.hidden = true;
    if (sessionActive) sessionActive.hidden = false;
    if (sessionCodeEl) sessionCodeEl.textContent = data.code || "";
    if (sessionModeEl) sessionModeEl.textContent = (data.mode || "chat").toUpperCase();
    if (endBtn) endBtn.hidden = data.hostId !== (me && me.id);
    renderMembers(data.members || []);
    sessionRev = "";
    if (data.mode === "voice" || data.mode === "video") {
      if (transport !== "ws") {
        setStatus("Voice and video need a live connection. Restart the server.", true);
      } else if (localStream) {
        attachLocalPreview();
        syncEnableMediaBtn(data.mode);
      } else {
        syncEnableMediaBtn(data.mode);
      }
    } else {
      stopMedia();
      if (callGrid) callGrid.hidden = true;
      if (enableMediaBtn) enableMediaBtn.hidden = true;
    }
  }

  function renderMembers(list) {
    if (!sessionMembers) return;
    sessionMembers.innerHTML = (list || [])
      .map(function (m) {
        var av = m.avatar
          ? '<img src="' + esc(m.avatar) + '" alt="" width="28" height="28" />'
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

  function iceServers() {
    return [{ urls: "stun:stun.l.google.com:19302" }];
  }

  function stopMedia() {
    if (localStream) {
      localStream.getTracks().forEach(function (t) {
        t.stop();
      });
      localStream = null;
    }
    Object.keys(remoteStreams).forEach(function (id) {
      var node = document.getElementById("kchat-remote-" + id);
      if (node) node.remove();
    });
    remoteStreams = {};
  }

  function clearPeers() {
    Object.keys(peers).forEach(function (id) {
      try {
        peers[id].close();
      } catch (e) {}
    });
    peers = {};
    pendingIce = {};
  }

  function ensureCallTile(userId, label) {
    if (!callGrid) return null;
    callGrid.hidden = false;
    var id = "kchat-remote-" + userId;
    var node = document.getElementById(id);
    if (!node) {
      node = document.createElement("div");
      node.className = "kchat__call-tile";
      node.id = id;
      node.innerHTML = '<video playsinline autoplay></video><span class="kchat__call-label"></span>';
      callGrid.appendChild(node);
    }
    var labelEl = node.querySelector(".kchat__call-label");
    if (labelEl) labelEl.textContent = label || userId;
    return node.querySelector("video");
  }

  function attachLocalPreview() {
    if (!callGrid || !localStream) return;
    var tile = document.getElementById("kchat-local-tile");
    if (!tile) {
      tile = document.createElement("div");
      tile.className = "kchat__call-tile kchat__call-tile--local";
      tile.id = "kchat-local-tile";
      tile.innerHTML = '<video playsinline autoplay muted></video><span class="kchat__call-label">You</span>';
      callGrid.appendChild(tile);
    }
    var video = tile.querySelector("video");
    if (video) video.srcObject = localStream;
  }

  function startMedia(withVideo) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("Voice and video are not supported in this browser.", true);
      return Promise.reject(new Error("unsupported"));
    }
    if (localStream) {
      stopMedia();
    }
    return navigator.mediaDevices
      .getUserMedia({ audio: true, video: !!withVideo })
      .then(function (stream) {
        localStream = stream;
        attachLocalPreview();
        if (session) syncEnableMediaBtn(session.mode);
        setStatus("");
        return stream;
      })
      .catch(function (err) {
        syncEnableMediaBtn(withVideo ? "video" : "voice");
        if (err && err.name === "NotAllowedError") {
          setStatus("Click allow when the browser asks for microphone access.", true);
        } else if (err && err.name === "NotFoundError") {
          setStatus("No microphone found on this device.", true);
        } else {
          setStatus("Could not access microphone" + (withVideo ? " or camera" : "") + ".", true);
        }
        throw err;
      });
  }

  function acquireMediaForMode(mode) {
    if (mode !== "voice" && mode !== "video") return Promise.resolve();
    return startMedia(mode === "video");
  }

  function getPeer(userId) {
    if (peers[userId]) return peers[userId];
    var pc = new RTCPeerConnection({ iceServers: iceServers() });
    if (localStream) {
      localStream.getTracks().forEach(function (track) {
        pc.addTrack(track, localStream);
      });
    }
    pc.onicecandidate = function (ev) {
      if (!ev.candidate) return;
      wsSend({ type: "rtc:ice", targetUserId: userId, candidate: ev.candidate });
    };
    pc.ontrack = function (ev) {
      remoteStreams[userId] = ev.streams[0];
      var video = ensureCallTile(userId, userId);
      if (video) video.srcObject = ev.streams[0];
    };
    peers[userId] = pc;
    return pc;
  }

  function flushIce(userId) {
    var list = pendingIce[userId];
    if (!list || !peers[userId]) return;
    list.forEach(function (c) {
      peers[userId].addIceCandidate(c).catch(function () {});
    });
    pendingIce[userId] = [];
  }

  function connectPeer(userId) {
    var pc = getPeer(userId);
    pc.createOffer()
      .then(function (offer) {
        return pc.setLocalDescription(offer);
      })
      .then(function () {
        wsSend({ type: "rtc:offer", targetUserId: userId, sdp: pc.localDescription });
      })
      .catch(function () {});
  }

  function handleRtc(msg) {
    var userId = msg.fromUserId;
    if (!userId || userId === (me && me.id)) return;
    if (msg.type === "rtc:offer" && msg.sdp) {
      var pc = getPeer(userId);
      pc.setRemoteDescription(msg.sdp)
        .then(function () {
          return pc.createAnswer();
        })
        .then(function (answer) {
          return pc.setLocalDescription(answer);
        })
        .then(function () {
          wsSend({ type: "rtc:answer", targetUserId: userId, sdp: pc.localDescription });
          flushIce(userId);
        })
        .catch(function () {});
      return;
    }
    if (msg.type === "rtc:answer" && msg.sdp) {
      var peer = peers[userId];
      if (!peer) return;
      peer.setRemoteDescription(msg.sdp).then(function () {
        flushIce(userId);
      });
      return;
    }
    if (msg.type === "rtc:ice" && msg.candidate) {
      if (!peers[userId]) {
        if (!pendingIce[userId]) pendingIce[userId] = [];
        pendingIce[userId].push(msg.candidate);
        return;
      }
      peers[userId].addIceCandidate(msg.candidate).catch(function () {});
    }
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
      setStatus(msg.error === "not_found" ? "Session not found." : msg.error === "full" ? "Session is full." : "Something went wrong.", true);
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
        if (peers[msg.member.id]) {
          try {
            peers[msg.member.id].close();
          } catch (e) {}
          delete peers[msg.member.id];
        }
        var tile = document.getElementById("kchat-remote-" + msg.member.id);
        if (tile) tile.remove();
      }
      return;
    }
    if (msg.type === "session:peers") {
      (msg.peers || []).forEach(function (peer) {
        connectPeer(peer.id);
      });
      return;
    }
    if (msg.type === "session:ended") {
      setStatus(msg.reason === "ended" ? "Session ended." : "Session closed.", false);
      showSessionHome();
      return;
    }
    if (msg.type === "session:left") {
      showSessionHome();
      return;
    }
    if (msg.type === "rtc:offer" || msg.type === "rtc:answer" || msg.type === "rtc:ice") {
      handleRtc(msg);
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
    if (!window.ZentraAuth || !window.ZentraAuth.isLoggedIn()) {
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
        if (transport === "ws" && wsSend({ type: "session:create", mode: mode })) return null;
        return api("/api/chat/sessions", { method: "POST", body: { mode: mode } }).then(function (data) {
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

  function boot() {
    if (!window.ZentraAuth) return;
    window.ZentraAuth.whenReady().then(function () {
      if (!window.ZentraAuth.isLoggedIn()) {
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
      var text = lobbyInput ? lobbyInput.value.trim() : "";
      if (!text) return;
      if (transport === "ws" && wsSend({ type: "lobby:send", text: text })) {
        if (lobbyInput) lobbyInput.value = "";
        return;
      }
      if (transport === "http") {
        api("/api/chat/lobby/messages", { method: "POST", body: { text: text } })
          .then(function (data) {
            if (data.message) appendMessage(lobbyMessages, data.message, me && me.id);
            if (lobbyInput) lobbyInput.value = "";
          })
          .catch(function () {
            setStatus("Could not send message.", true);
          });
        return;
      }
      setStatus("Not connected", true);
    });
  }

  if (sessionForm) {
    sessionForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = sessionInput ? sessionInput.value.trim() : "";
      if (!text || !session) return;
      if (transport === "ws" && wsSend({ type: "session:send", text: text })) {
        if (sessionInput) sessionInput.value = "";
        return;
      }
      if (transport === "http") {
        api("/api/chat/sessions/" + encodeURIComponent(session.id) + "/messages", { method: "POST", body: { text: text } })
          .then(function (data) {
            if (data.message) appendMessage(sessionMessages, data.message, me && me.id);
            if (sessionInput) sessionInput.value = "";
          })
          .catch(function () {
            setStatus("Could not send message.", true);
          });
        return;
      }
      setStatus("Not connected", true);
    });
  }

  createBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var mode = btn.getAttribute("data-create-mode") || "chat";
      acquireMediaForMode(mode)
        .then(function () {
          createSession(mode);
        })
        .catch(function () {});
    });
  });

  if (enableMediaBtn) {
    enableMediaBtn.addEventListener("click", function () {
      if (!session) return;
      var withVideo = session.mode === "video";
      startMedia(withVideo).catch(function () {});
    });
  }

  if (joinBtn) {
    joinBtn.addEventListener("click", function () {
      var code = joinInput ? joinInput.value.trim().toUpperCase() : "";
      if (!code) return;
      joinSession(code);
    });
  }

  if (leaveBtn) leaveBtn.addEventListener("click", leaveSession);
  if (endBtn) endBtn.addEventListener("click", endSession);

  window.KritikalChat = {
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

  window.addEventListener("zentra-auth", function () {
    if (window.ZentraAuth && window.ZentraAuth.isLoggedIn()) connectWs();
  });

  boot();
})();
