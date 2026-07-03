const fs = require("fs");
const path = require("path");

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

function createChatHub(options) {
  const dataDir = options.dataDir;
  const serverPath = path.join(dataDir, "chat-server.json");
  const rolesPath = path.join(dataDir, "chat-roles.json");
  const presenceTtl = options.presenceTtl || 45000;
  const presence = new Map();

  function defaultRoles() {
    return [
      {
        id: "member",
        name: "Member",
        color: "#9aa3c7",
        permissions: { sendMessages: true, manageMessages: false, manageMembers: false },
      },
      {
        id: "moderator",
        name: "Moderator",
        color: "#5eead4",
        permissions: { sendMessages: true, manageMessages: true, manageMembers: false },
      },
      {
        id: "admin",
        name: "Admin",
        color: "#c4b5fd",
        permissions: { sendMessages: true, manageMessages: true, manageMembers: true },
      },
      {
        id: "founder",
        name: "Founder",
        color: "#fde68a",
        permissions: { sendMessages: true, manageMessages: true, manageMembers: true },
      },
    ];
  }

  function defaultServer() {
    return {
      name: "Zentra",
      topic: "main chat",
      channelId: "general",
      channelName: "general",
      slowModeSeconds: 0,
      pinnedMessageId: "",
      mutedUserIds: [],
    };
  }

  function loadRoles() {
    const raw = readJson(rolesPath, null);
    let list;
    if (raw && Array.isArray(raw.roles) && raw.roles.length) {
      list = raw.roles.slice();
      if (!list.some(function (r) { return r.id === "founder"; })) {
        list.push(defaultRoles().find(function (r) { return r.id === "founder"; }));
        saveRoles(list);
      }
      return list;
    }
    list = defaultRoles();
    writeJson(rolesPath, { roles: list });
    return list;
  }

  function saveRoles(roles) {
    writeJson(rolesPath, { roles: roles });
  }

  function loadServer() {
    const raw = readJson(serverPath, null);
    if (raw && raw.name) return raw;
    const server = defaultServer();
    writeJson(serverPath, server);
    return server;
  }

  function saveServer(server) {
    writeJson(serverPath, server);
  }

  let roles = loadRoles();
  let server = loadServer();

  function getRole(roleId) {
    return roles.find(function (r) {
      return r.id === roleId;
    });
  }

  function userPermissions(user) {
    const roleId = (user && user.roleId) || "member";
    const role = getRole(roleId) || getRole("member");
    return (role && role.permissions) || { sendMessages: true, manageMessages: false, manageMembers: false };
  }

  function userCan(user, perm) {
    const perms = userPermissions(user);
    return !!perms[perm];
  }

  function publicUserPresence(entry) {
    if (!entry) return null;
    const role = getRole(entry.roleId || "member");
    return {
      id: entry.id,
      username: entry.username,
      displayName: entry.displayName,
      avatar: entry.avatar || "",
      roleId: entry.roleId || "member",
      roleName: role ? role.name : "Member",
      roleColor: role ? role.color : "#9aa3c7",
    };
  }

  function touchPresence(user) {
    if (!user) return null;
    const entry = {
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      avatar: user.avatar || "",
      roleId: user.roleId || "member",
      lastSeen: Date.now(),
    };
    presence.set(user.id, entry);
    return entry;
  }

  function prunePresence() {
    const now = Date.now();
    presence.forEach(function (entry, id) {
      if (now - entry.lastSeen > presenceTtl) presence.delete(id);
    });
  }

  function listOnline() {
    prunePresence();
    const out = [];
    presence.forEach(function (entry) {
      out.push(publicUserPresence(entry));
    });
    out.sort(function (a, b) {
      return String(a.displayName).localeCompare(String(b.displayName));
    });
    return out;
  }

  function getServerPublic() {
    return {
      name: server.name,
      topic: server.topic,
      channelId: server.channelId || "general",
      channelName: server.channelName || "general",
      slowModeSeconds: Number(server.slowModeSeconds) || 0,
      pinnedMessageId: server.pinnedMessageId || "",
    };
  }

  function isMuted(userId) {
    if (!userId) return false;
    const list = Array.isArray(server.mutedUserIds) ? server.mutedUserIds : [];
    return list.indexOf(userId) !== -1;
  }

  function setMuted(userId, muted) {
    if (!userId) return server;
    let list = Array.isArray(server.mutedUserIds) ? server.mutedUserIds.slice() : [];
    const idx = list.indexOf(userId);
    if (muted && idx === -1) list.push(userId);
    if (!muted && idx !== -1) list.splice(idx, 1);
    server.mutedUserIds = list.slice(0, 200);
    saveServer(server);
    return server;
  }

  function setPinnedMessageId(messageId) {
    server.pinnedMessageId = String(messageId || "").trim();
    saveServer(server);
    return server;
  }

  function updateServer(payload) {
    if (payload.name != null) server.name = String(payload.name || "").trim().slice(0, 48) || "Zentra";
    if (payload.topic != null) server.topic = String(payload.topic || "").trim().slice(0, 160);
    if (payload.channelName != null) {
      server.channelName = String(payload.channelName || "general").trim().slice(0, 32) || "general";
    }
    if (payload.slowModeSeconds != null) {
      server.slowModeSeconds = Math.max(0, Math.min(300, Number(payload.slowModeSeconds) || 0));
    }
    if (payload.pinnedMessageId != null) {
      server.pinnedMessageId = String(payload.pinnedMessageId || "").trim().slice(0, 64);
    }
    if (payload.mutedUserIds != null && Array.isArray(payload.mutedUserIds)) {
      server.mutedUserIds = payload.mutedUserIds.map(String).filter(Boolean).slice(0, 200);
    }
    saveServer(server);
    return server;
  }

  function listRoles() {
    return roles.slice();
  }

  function createRole(payload) {
    const id = String(payload.id || payload.name || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24);
    if (!id) return { error: "bad_id" };
    if (roles.some(function (r) { return r.id === id; })) return { error: "exists" };
    const role = {
      id: id,
      name: String(payload.name || id).trim().slice(0, 32) || id,
      color: String(payload.color || "#9aa3c7").trim().slice(0, 16),
      permissions: {
        sendMessages: payload.permissions ? !!payload.permissions.sendMessages : true,
        manageMessages: payload.permissions ? !!payload.permissions.manageMessages : false,
        manageMembers: payload.permissions ? !!payload.permissions.manageMembers : false,
      },
    };
    roles.push(role);
    saveRoles(roles);
    return { role: role };
  }

  function updateRole(id, payload) {
    const role = getRole(id);
    if (!role) return { error: "not_found" };
    if (id === "member" && payload.permissions) {
      payload.permissions.sendMessages = true;
    }
    if (payload.name != null) role.name = String(payload.name || "").trim().slice(0, 32) || role.id;
    if (payload.color != null) role.color = String(payload.color || "").trim().slice(0, 16) || role.color;
    if (payload.permissions) {
      role.permissions = {
        sendMessages: payload.permissions.sendMessages !== false,
        manageMessages: !!payload.permissions.manageMessages,
        manageMembers: !!payload.permissions.manageMembers,
      };
    }
    saveRoles(roles);
    return { role: role };
  }

  function deleteRole(id) {
    if (id === "member" || id === "admin" || id === "moderator" || id === "founder") return { error: "protected" };
    const idx = roles.findIndex(function (r) { return r.id === id; });
    if (idx === -1) return { error: "not_found" };
    roles.splice(idx, 1);
    saveRoles(roles);
    return { ok: true };
  }

  return {
    touchPresence: touchPresence,
    listOnline: listOnline,
    getServerPublic: getServerPublic,
    updateServer: updateServer,
    getServer: function () { return Object.assign({}, server); },
    listRoles: listRoles,
    getRole: getRole,
    createRole: createRole,
    updateRole: updateRole,
    deleteRole: deleteRole,
    userCan: userCan,
    userPermissions: userPermissions,
    isMuted: isMuted,
    setMuted: setMuted,
    setPinnedMessageId: setPinnedMessageId,
    publicUser: function (user) {
      if (!user) return null;
      const role = getRole(user.roleId || "member");
      return {
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        avatar: user.avatar || "",
        roleId: user.roleId || "member",
        roleName: role ? role.name : "Member",
        roleColor: role ? role.color : "#9aa3c7",
      };
    },
  };
}

module.exports = { createChatHub: createChatHub };
