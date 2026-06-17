const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

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

function createChatStore(options) {
  const chatPath = path.join(options.dataDir, "chat.json");
  const channelsPath = path.join(options.dataDir, "chat-channels.json");
  const maxMessages = options.maxMessages || 800;
  let revision = 0;
  let channels = [];
  let messagesByChannel = {};

  function defaultChannels() {
    return [
      { id: "general", name: "general", topic: "Community chat", permRead: "all", permWrite: "members" },
    ];
  }

  function loadChannels() {
    const raw = readJson(channelsPath, null);
    if (raw && Array.isArray(raw.channels) && raw.channels.length) {
      const general = raw.channels.find(function (c) { return c.id === "general"; });
      channels = general ? [general] : defaultChannels();
      return;
    }
    channels = defaultChannels();
    saveChannels();
  }

  function saveChannels() {
    writeJson(channelsPath, { channels: channels });
  }

  function loadChat() {
    loadChannels();
    const raw = readJson(chatPath, { revision: 0, messages: [], messagesByChannel: {} });
    revision = typeof raw.revision === "number" ? raw.revision : 0;
    if (raw.messagesByChannel && typeof raw.messagesByChannel === "object") {
      messagesByChannel = raw.messagesByChannel;
    } else if (Array.isArray(raw.messages)) {
      messagesByChannel = { general: raw.messages };
    } else {
      messagesByChannel = {};
    }
    channels.forEach(function (ch) {
      if (!Array.isArray(messagesByChannel[ch.id])) messagesByChannel[ch.id] = [];
    });
    saveChat();
  }

  function saveChat() {
    writeJson(chatPath, {
      revision: revision,
      messagesByChannel: messagesByChannel,
    });
  }

  function bumpRevision() {
    revision += 1;
  }

  function getChannel(id) {
    return channels.find(function (c) {
      return c.id === id;
    });
  }

  function canRead(channel, user) {
    if (!channel) return false;
    if (channel.permRead === "all") return true;
    if (channel.permRead === "members") return !!user;
    return false;
  }

  function canWrite(channel, user) {
    if (!channel) return false;
    if (channel.permWrite === "all") return true;
    if (channel.permWrite === "members") return !!user;
    return false;
  }

  function listChannels(user) {
    return channels
      .filter(function (ch) {
        return canRead(ch, user);
      })
      .map(function (ch) {
        return {
          id: ch.id,
          name: ch.name,
          topic: ch.topic || "",
          permRead: ch.permRead,
          permWrite: ch.permWrite,
          canWrite: canWrite(ch, user),
        };
      });
  }

  function getPinnedMessage(channelId, messageId) {
    if (!messageId) return null;
    const list = messagesByChannel[channelId] || [];
    const m = list.find(function (row) {
      return row.id === messageId;
    });
    if (!m) return null;
    return {
      id: m.id,
      text: m.text,
      ts: m.ts,
      userId: m.userId,
      name: m.name,
      avatar: m.avatar || "",
    };
  }

  function getMessages(channelId, viewerUserId, clientRev, canManageMessages, pinnedMessageId) {
    if (clientRev !== undefined && clientRev !== "" && Number(clientRev) === revision) {
      return { unchanged: true, revision: revision, pinned: getPinnedMessage(channelId, pinnedMessageId) };
    }
    const list = (messagesByChannel[channelId] || []).slice(-140).map(function (m) {
      const mine = Boolean(viewerUserId && m.userId === viewerUserId);
      return {
        id: m.id,
        text: m.text,
        ts: m.ts,
        userId: m.userId,
        name: m.name,
        avatar: m.avatar || "",
        mine: mine,
        canDelete: mine || Boolean(canManageMessages),
      };
    });
    return { unchanged: false, revision: revision, messages: list, pinned: getPinnedMessage(channelId, pinnedMessageId) };
  }

  function addMessage(channelId, user, text, deviceHwid) {
    const channel = getChannel(channelId);
    if (!channel) return { error: "not_found" };
    if (!canWrite(channel, user)) return { error: "forbidden" };
    const msg = {
      id: crypto.randomUUID(),
      channelId: channelId,
      userId: user.id,
      name: user.displayName || user.username,
      avatar: user.avatar || "",
      text: String(text || "").trim().slice(0, 500),
      deviceHwid: deviceHwid || "",
      ts: Date.now(),
    };
    if (!msg.text) return { error: "empty" };
    if (!messagesByChannel[channelId]) messagesByChannel[channelId] = [];
    messagesByChannel[channelId].push(msg);
    if (messagesByChannel[channelId].length > maxMessages) {
      messagesByChannel[channelId].splice(0, messagesByChannel[channelId].length - maxMessages);
    }
    bumpRevision();
    saveChat();
    return { message: msg };
  }

  function deleteMessage(channelId, messageId, user) {
    const list = messagesByChannel[channelId] || [];
    const idx = list.findIndex(function (m) {
      return m.id === messageId;
    });
    if (idx === -1) return { error: "not_found" };
    if (list[idx].userId !== user.id) return { error: "forbidden" };
    list.splice(idx, 1);
    bumpRevision();
    saveChat();
    return { ok: true };
  }

  function adminDeleteMessage(channelId, messageId) {
    const list = messagesByChannel[channelId] || [];
    const idx = list.findIndex(function (m) {
      return m.id === messageId;
    });
    if (idx === -1) return { error: "not_found" };
    list.splice(idx, 1);
    bumpRevision();
    saveChat();
    return { ok: true };
  }

  function purgeChannel(channelId, count) {
    const list = messagesByChannel[channelId] || [];
    if (!list.length) return 0;
    let n = count;
    if (count === "all") n = list.length;
    n = Math.max(0, Math.min(Number(n) || 0, list.length));
    if (!n) return 0;
    list.splice(list.length - n, n);
    bumpRevision();
    saveChat();
    return n;
  }

  function adminListMessages(limit) {
    const out = [];
    channels.forEach(function (ch) {
      (messagesByChannel[ch.id] || []).forEach(function (m) {
        out.push(Object.assign({}, m, { channelId: ch.id, channelName: ch.name }));
      });
    });
    out.sort(function (a, b) {
      return b.ts - a.ts;
    });
    return out.slice(0, limit || 180);
  }

  function createChannel(payload) {
    const name = String(payload.name || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32);
    if (!name) return { error: "bad_name" };
    if (channels.some(function (c) { return c.id === name; })) {
      return { error: "exists" };
    }
    const ch = {
      id: name,
      name: name,
      topic: String(payload.topic || "").trim().slice(0, 120),
      permRead: payload.permRead === "members" ? "members" : "all",
      permWrite: payload.permWrite === "all" ? "all" : "members",
    };
    channels.push(ch);
    messagesByChannel[ch.id] = [];
    saveChannels();
    saveChat();
    return { channel: ch };
  }

  function updateChannel(id, payload) {
    const ch = getChannel(id);
    if (!ch) return { error: "not_found" };
    if (payload.topic != null) ch.topic = String(payload.topic || "").trim().slice(0, 120);
    if (payload.permRead != null) ch.permRead = payload.permRead === "members" ? "members" : "all";
    if (payload.permWrite != null) ch.permWrite = payload.permWrite === "all" ? "all" : "members";
    saveChannels();
    return { channel: ch };
  }

  function deleteChannel(id) {
    if (id === "general") return { error: "protected" };
    const idx = channels.findIndex(function (c) {
      return c.id === id;
    });
    if (idx === -1) return { error: "not_found" };
    channels.splice(idx, 1);
    delete messagesByChannel[id];
    saveChannels();
    saveChat();
    return { ok: true };
  }

  function syncUserProfile(userId, patch) {
    if (!userId || !patch) return;
    let changed = false;
    channels.forEach(function (ch) {
      (messagesByChannel[ch.id] || []).forEach(function (m) {
        if (m.userId !== userId) return;
        if (patch.name != null) m.name = patch.name;
        if (patch.avatar != null) m.avatar = patch.avatar;
        changed = true;
      });
    });
    if (changed) {
      bumpRevision();
      saveChat();
    }
  }

  loadChat();

  return {
    revision: function () { return revision; },
    listChannels: listChannels,
    getChannel: getChannel,
    canRead: canRead,
    canWrite: canWrite,
    getMessages: getMessages,
    addMessage: addMessage,
    deleteMessage: deleteMessage,
    adminDeleteMessage: adminDeleteMessage,
    purgeChannel: purgeChannel,
    adminListMessages: adminListMessages,
    createChannel: createChannel,
    updateChannel: updateChannel,
    deleteChannel: deleteChannel,
    syncUserProfile: syncUserProfile,
    allChannels: function () { return channels.slice(); },
    messageCount: function () {
      let n = 0;
      Object.keys(messagesByChannel).forEach(function (k) {
        n += (messagesByChannel[k] || []).length;
      });
      return n;
    },
  };
}

module.exports = { createChatStore: createChatStore };
