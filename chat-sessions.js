const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mongo = require("./mongo");

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  } catch (e) {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function createChatSessions(options) {
  const dataDir = options.dataDir;
  const lobbyPath = path.join(dataDir, "chat-lobby.json");
  const sessionsPath = path.join(dataDir, "chat-sessions.json");
  const maxLobby = options.maxLobbyMessages || 300;
  const maxSessionMessages = options.maxSessionMessages || 200;
  const maxMembers = options.maxMembers || 8;
  const mongoStore = mongo.createDocStore("chat_sessions");

  let lobby = { revision: 0, messages: [] };
  let sessions = { active: {} };

  function load() {
    const rawLobby = readJson(lobbyPath, null);
    if (rawLobby && Array.isArray(rawLobby.messages)) {
      lobby = {
        revision: typeof rawLobby.revision === "number" ? rawLobby.revision : 0,
        messages: rawLobby.messages,
      };
    }
    const rawSessions = readJson(sessionsPath, null);
    if (rawSessions && rawSessions.active && typeof rawSessions.active === "object") {
      sessions = { active: rawSessions.active };
    }
    pruneExpired();
  }

  function saveLobby() {
    writeJson(lobbyPath, lobby);
    mongoStore.save("lobby", lobby);
  }

  function saveSessions() {
    writeJson(sessionsPath, sessions);
    mongoStore.save("sessions", sessions);
  }

  async function bindMongo(db) {
    return mongoStore.bind(db, [
      {
        id: "lobby",
        getLocal: function () {
          return lobby;
        },
        hasLocal: function (data) {
          return !!(data && Array.isArray(data.messages) && data.messages.length);
        },
        hasRemote: function (data) {
          return !!(data && Array.isArray(data.messages) && data.messages.length);
        },
        applyRemote: function (data) {
          lobby = {
            revision: typeof data.revision === "number" ? data.revision : 0,
            messages: data.messages,
          };
          writeJson(lobbyPath, lobby);
        },
      },
      {
        id: "sessions",
        getLocal: function () {
          return sessions;
        },
        hasLocal: function (data) {
          return !!(data && data.active && typeof data.active === "object" && Object.keys(data.active).length);
        },
        hasRemote: function (data) {
          return !!(data && data.active && typeof data.active === "object" && Object.keys(data.active).length);
        },
        applyRemote: function (data) {
          sessions = { active: data.active };
          writeJson(sessionsPath, sessions);
        },
      },
    ]);
  }

  function pruneExpired() {
    const now = Date.now();
    let changed = false;
    Object.keys(sessions.active).forEach(function (id) {
      const row = sessions.active[id];
      if (!row || !row.active || (row.expiresAt && row.expiresAt < now)) {
        delete sessions.active[id];
        changed = true;
      }
    });
    if (changed) saveSessions();
  }

  function makeCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars[crypto.randomInt(0, chars.length)];
    }
    const taken = Object.values(sessions.active).some(function (s) {
      return s && s.active && s.code === code;
    });
    if (taken) return makeCode();
    return code;
  }

  function publicMember(user) {
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      avatar: user.avatar || "",
    };
  }

  function packMessage(row) {
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      avatar: row.avatar || "",
      text: row.text || "",
      image: row.image || "",
      ts: row.ts,
    };
  }

  function packSession(session) {
    return {
      id: session.id,
      code: session.code,
      hostId: session.hostId,
      mode: session.mode,
      active: !!session.active,
      members: (session.members || []).map(publicMember).filter(Boolean),
      createdAt: session.createdAt,
    };
  }

  function getLobbyMessages(limit) {
    const n = Math.min(limit || 80, lobby.messages.length);
    return {
      revision: lobby.revision,
      messages: lobby.messages.slice(-n).map(packMessage),
    };
  }

  function normalizeChatImage(image) {
    const raw = String(image || "").trim();
    if (!raw) return "";
    if (raw.length > 1200000) return null;
    if (!/^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=\s]+$/i.test(raw)) return null;
    return raw.replace(/\s+/g, "");
  }

  function addLobbyMessage(user, text, image) {
    const body = String(text || "").trim();
    const img = normalizeChatImage(image);
    if (img === null) return { error: "bad_image" };
    if (!body && !img) return { error: "empty" };
    if (body.length > 500) return { error: "too_long" };
    const row = {
      id: crypto.randomBytes(8).toString("hex"),
      userId: user.id,
      name: user.displayName || user.username,
      avatar: user.avatar || "",
      text: body,
      image: img || "",
      ts: Date.now(),
    };
    lobby.messages.push(row);
    if (lobby.messages.length > maxLobby) lobby.messages = lobby.messages.slice(-maxLobby);
    lobby.revision += 1;
    saveLobby();
    return { message: packMessage(row), revision: lobby.revision };
  }

  function createSession(user, mode) {
    const sessionMode = "chat";
    const id = crypto.randomBytes(10).toString("hex");
    const code = makeCode();
    const session = {
      id: id,
      code: code,
      hostId: user.id,
      mode: sessionMode,
      active: true,
      members: [publicMember(user)],
      messages: [],
      createdAt: Date.now(),
      expiresAt: Date.now() + 1000 * 60 * 60 * 6,
    };
    sessions.active[id] = session;
    saveSessions();
    return { session: packSession(session) };
  }

  function getSession(id) {
    const session = sessions.active[id];
    if (!session || !session.active) return null;
    return session;
  }

  function getSessionByCode(code) {
    const needle = String(code || "").trim().toUpperCase();
    if (!needle) return null;
    return (
      Object.values(sessions.active).find(function (s) {
        return s && s.active && s.code === needle;
      }) || null
    );
  }

  function isMember(session, userId) {
    return (session.members || []).some(function (m) {
      return m && m.id === userId;
    });
  }

  function joinSession(code, user) {
    const session = getSessionByCode(code);
    if (!session) return { error: "not_found" };
    if (!session.active) return { error: "ended" };
    if (isMember(session, user.id)) return { session: packSession(session) };
    if ((session.members || []).length >= maxMembers) return { error: "full" };
    session.members.push(publicMember(user));
    saveSessions();
    return { session: packSession(session) };
  }

  function leaveSession(sessionId, userId) {
    const session = getSession(sessionId);
    if (!session) return { error: "not_found" };
    const wasHost = session.hostId === userId;
    session.members = (session.members || []).filter(function (m) {
      return m && m.id !== userId;
    });
    let ended = false;
    if (wasHost || !session.members.length) {
      session.active = false;
      delete sessions.active[sessionId];
      ended = true;
    }
    saveSessions();
    return { ended: ended, session: ended ? null : packSession(session), wasHost: wasHost };
  }

  function endSession(sessionId, userId) {
    const session = getSession(sessionId);
    if (!session) return { error: "not_found" };
    if (session.hostId !== userId) return { error: "forbidden" };
    session.active = false;
    delete sessions.active[sessionId];
    saveSessions();
    return { ok: true };
  }

  function addSessionMessage(sessionId, user, text, image) {
    const session = getSession(sessionId);
    if (!session) return { error: "not_found" };
    if (!isMember(session, user.id)) return { error: "forbidden" };
    const body = String(text || "").trim();
    const img = normalizeChatImage(image);
    if (img === null) return { error: "bad_image" };
    if (!body && !img) return { error: "empty" };
    if (body.length > 500) return { error: "too_long" };
    const row = {
      id: crypto.randomBytes(8).toString("hex"),
      userId: user.id,
      name: user.displayName || user.username,
      avatar: user.avatar || "",
      text: body,
      image: img || "",
      ts: Date.now(),
    };
    if (!Array.isArray(session.messages)) session.messages = [];
    session.messages.push(row);
    if (session.messages.length > maxSessionMessages) {
      session.messages = session.messages.slice(-maxSessionMessages);
    }
    saveSessions();
    return { message: packMessage(row), sessionId: sessionId };
  }

  function getSessionMessages(sessionId, userId) {
    const session = getSession(sessionId);
    if (!session) return { error: "not_found" };
    if (!isMember(session, userId)) return { error: "forbidden" };
    return {
      session: packSession(session),
      messages: (session.messages || []).map(packMessage),
    };
  }

  load();

  return {
    getLobbyMessages: getLobbyMessages,
    addLobbyMessage: addLobbyMessage,
    createSession: createSession,
    joinSession: joinSession,
    leaveSession: leaveSession,
    endSession: endSession,
    addSessionMessage: addSessionMessage,
    getSessionMessages: getSessionMessages,
    getSession: getSession,
    getSessionByCode: getSessionByCode,
    isMember: isMember,
    packSession: packSession,
    lobbyRevision: function () {
      return lobby.revision;
    },
    bindMongo: bindMongo,
  };
}

module.exports = { createChatSessions };
