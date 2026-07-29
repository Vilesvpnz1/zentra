const { WebSocketServer } = require("ws");
const { parse } = require("url");

function attachChatWebSocket(options) {
  const userAuth = options.userAuth;
  const chatSessions = options.chatSessions;
  const getBlacklistState = options.getBlacklistState;
  const getDeviceHwid = options.getDeviceHwid;

  const clients = new Map();
  const sessionRooms = new Map();

  function getUserFromReq(req) {
    return userAuth.getSessionUser(req);
  }

  function send(ws, payload) {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(payload));
    }
  }

  function broadcastLobby(payload, exceptWs) {
    clients.forEach(function (row, ws) {
      if (ws === exceptWs) return;
      if (!row.user) return;
      if (row.sessionId) return;
      send(ws, payload);
    });
  }

  function roomClients(sessionId) {
    const set = sessionRooms.get(sessionId);
    if (!set) return [];
    const rows = [];
    set.forEach(function (ws) {
      const row = clients.get(ws);
      if (row && row.user) rows.push({ ws: ws, user: row.user });
    });
    return rows;
  }

  function broadcastSession(sessionId, payload, exceptWs) {
    const set = sessionRooms.get(sessionId);
    if (!set) return;
    set.forEach(function (ws) {
      if (ws === exceptWs) return;
      send(ws, payload);
    });
  }

  function joinSessionRoom(ws, sessionId) {
    const row = clients.get(ws);
    if (!row) return;
    if (row.sessionId && row.sessionId !== sessionId) {
      leaveSessionRoom(ws);
    }
    row.sessionId = sessionId;
    if (!sessionRooms.has(sessionId)) sessionRooms.set(sessionId, new Set());
    sessionRooms.get(sessionId).add(ws);
  }

  function leaveSessionRoom(ws) {
    const row = clients.get(ws);
    if (!row || !row.sessionId) return;
    const set = sessionRooms.get(row.sessionId);
    if (set) {
      set.delete(ws);
      if (!set.size) sessionRooms.delete(row.sessionId);
    }
    row.sessionId = null;
  }

  function publicMember(user) {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      avatar: user.avatar || "",
    };
  }

  function handleMessage(ws, raw) {
    const row = clients.get(ws);
    if (!row || !row.user) return;
    const user = row.user;
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (e) {
      return;
    }
    const type = String(msg.type || "");

    if (type === "lobby:send") {
      const result = chatSessions.addLobbyMessage(user, msg.text, msg.image);
      if (result.error) {
        send(ws, { type: "error", error: result.error });
        return;
      }
      const payload = { type: "lobby:message", message: result.message, revision: result.revision };
      broadcastLobby(payload, ws);
      send(ws, payload);
      return;
    }

    if (type === "lobby:sync") {
      send(ws, { type: "lobby:sync", data: chatSessions.getLobbyMessages(100) });
      return;
    }

    if (type === "session:create") {
      const result = chatSessions.createSession(user, msg.mode);
      joinSessionRoom(ws, result.session.id);
      const pack = chatSessions.getSessionMessages(result.session.id, user.id);
      send(ws, { type: "session:state", session: pack.session, messages: pack.messages || [] });
      return;
    }

    if (type === "session:join") {
      const result = chatSessions.joinSession(msg.code, user);
      if (result.error) {
        send(ws, { type: "error", error: result.error });
        return;
      }
      joinSessionRoom(ws, result.session.id);
      const pack = chatSessions.getSessionMessages(result.session.id, user.id);
      send(ws, { type: "session:state", session: pack.session, messages: pack.messages || [] });
      broadcastSession(result.session.id, { type: "session:member", action: "join", member: publicMember(user) }, ws);
      const peers = roomClients(result.session.id)
        .filter(function (r) {
          return r.user.id !== user.id;
        })
        .map(function (r) {
          return publicMember(r.user);
        });
      send(ws, { type: "session:peers", peers: peers });
      return;
    }

    if (type === "session:leave") {
      if (!row.sessionId) return;
      const sessionId = row.sessionId;
      const result = chatSessions.leaveSession(sessionId, user.id);
      leaveSessionRoom(ws);
      if (result.ended) {
        broadcastSession(sessionId, { type: "session:ended", reason: result.wasHost ? "host_left" : "empty" });
        sessionRooms.delete(sessionId);
      } else {
        broadcastSession(sessionId, { type: "session:member", action: "leave", member: publicMember(user) });
      }
      send(ws, { type: "session:left" });
      return;
    }

    if (type === "session:end") {
      if (!row.sessionId) return;
      const sessionId = row.sessionId;
      const session = chatSessions.getSession(sessionId);
      if (!session || session.hostId !== user.id) {
        send(ws, { type: "error", error: "forbidden" });
        return;
      }
      chatSessions.endSession(sessionId, user.id);
      broadcastSession(sessionId, { type: "session:ended", reason: "ended" });
      sessionRooms.delete(sessionId);
      leaveSessionRoom(ws);
      send(ws, { type: "session:left" });
      return;
    }

    if (type === "session:send") {
      if (!row.sessionId) return;
      const result = chatSessions.addSessionMessage(row.sessionId, user, msg.text, msg.image);
      if (result.error) {
        send(ws, { type: "error", error: result.error });
        return;
      }
      const payload = { type: "session:message", message: result.message };
      broadcastSession(row.sessionId, payload);
      return;
    }

    if (type === "session:sync") {
      if (!row.sessionId) return;
      const pack = chatSessions.getSessionMessages(row.sessionId, user.id);
      if (pack.error) {
        send(ws, { type: "error", error: pack.error });
        return;
      }
      send(ws, { type: "session:state", session: pack.session, messages: pack.messages || [] });
      return;
    }
  }

  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", function (ws, req) {
    const user = getUserFromReq(req);
    if (!user) {
      ws.close(4401, "auth");
      return;
    }
    if (getBlacklistState && getDeviceHwid) {
      const state = getBlacklistState(getDeviceHwid(req));
      if (state && (state.chatBlocked || state.siteBlocked)) {
        ws.close(4403, "blocked");
        return;
      }
    }
    clients.set(ws, { user: user, sessionId: null });
    send(ws, { type: "ready", user: publicMember(user) });
    send(ws, { type: "lobby:sync", data: chatSessions.getLobbyMessages(100) });

    ws.on("message", function (data) {
      handleMessage(ws, data);
    });

    ws.on("close", function () {
      const row = clients.get(ws);
      if (row && row.sessionId) {
        const sessionId = row.sessionId;
        const result = chatSessions.leaveSession(sessionId, row.user.id);
        leaveSessionRoom(ws);
        if (result && !result.error && result.ended) {
          broadcastSession(sessionId, { type: "session:ended", reason: result.wasHost ? "host_left" : "empty" });
          sessionRooms.delete(sessionId);
        } else if (result && !result.error) {
          broadcastSession(sessionId, { type: "session:member", action: "leave", member: publicMember(row.user) });
        }
      }
      clients.delete(ws);
    });
  });

  return {
    handleUpgrade: function (req, socket, head) {
      const pathname = parse(req.url || "").pathname || "";
      if (pathname !== "/ws/chat") return false;
      const user = getUserFromReq(req);
      if (!user) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return true;
      }
      wss.handleUpgrade(req, socket, head, function (ws) {
        wss.emit("connection", ws, req);
      });
      return true;
    },
  };
}

module.exports = { attachChatWebSocket };
