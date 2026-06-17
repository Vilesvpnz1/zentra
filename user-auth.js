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

function createUserAuth(options) {
  const usersPath = path.join(options.dataDir, "users.json");
  const sessionsPath = path.join(options.dataDir, "user-sessions.json");
  const sessions = new Map();
  const COOKIE = "zentra_user";
  const MAX_AVATAR = 280000;
  let chatHub = options.chatHub || null;
  const onProfileUpdate = options.onProfileUpdate || null;

  function loadSessions() {
    const raw = readJson(sessionsPath, { sessions: {} });
    const obj = raw.sessions && typeof raw.sessions === "object" ? raw.sessions : {};
    Object.keys(obj).forEach(function (token) {
      const row = obj[token];
      if (row && row.userId) {
        sessions.set(token, { userId: row.userId, createdAt: row.createdAt || Date.now() });
      }
    });
  }

  function persistSessions() {
    const obj = {};
    sessions.forEach(function (val, token) {
      obj[token] = val;
    });
    writeJson(sessionsPath, { sessions: obj });
  }

  function storeSession(token, userId) {
    sessions.set(token, { userId: userId, createdAt: Date.now() });
    persistSessions();
  }

  function dropSession(token) {
    if (!token) return;
    sessions.delete(token);
    persistSessions();
  }

  function notifyProfileUpdate(user) {
    if (onProfileUpdate && user) onProfileUpdate(user);
  }

  function loadUsers() {
    const raw = readJson(usersPath, { users: [] });
    return Array.isArray(raw.users) ? raw.users : [];
  }

  function saveUsers(users) {
    writeJson(usersPath, { users: users });
  }

  function hashPassword(password, salt) {
    return crypto.pbkdf2Sync(String(password), salt, 120000, 32, "sha512").toString("hex");
  }

  function sanitizeUsername(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "")
      .slice(0, 24);
  }

  function sanitizeDisplay(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 32);
  }

  function publicUser(user) {
    if (!user) return null;
    if (chatHub && chatHub.publicUser) return chatHub.publicUser(user);
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      avatar: user.avatar || "",
      roleId: user.roleId || "member",
      createdAt: user.createdAt,
    };
  }

  function adminUserRow(user) {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      avatar: user.avatar || "",
      roleId: user.roleId || "member",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt || null,
    };
  }

  function parseCookies(header) {
    const out = {};
    if (!header) return out;
    header.split(";").forEach(function (part) {
      const i = part.indexOf("=");
      if (i === -1) return;
      out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    });
    return out;
  }

  function setUserCookie(res, token) {
    res.setHeader(
      "Set-Cookie",
      COOKIE + "=" + encodeURIComponent(token) + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000"
    );
  }

  function clearUserCookie(res) {
    res.setHeader("Set-Cookie", COOKIE + "=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
  }

  function getSessionUser(req) {
    const cookies = parseCookies(req.headers.cookie || "");
    const token = cookies[COOKIE];
    if (!token) return null;
    const sess = sessions.get(token);
    if (!sess) return null;
    const users = loadUsers();
    return users.find(function (u) {
      return u.id === sess.userId;
    }) || null;
  }

  function requireUser(req, res, next) {
    if (getSessionUser(req)) return next();
    res.status(401).json({ error: "login_required" });
  }

  function attachRoutes(app) {
    app.get("/api/auth/session", function (req, res) {
      const user = getSessionUser(req);
      res.json({ user: publicUser(user), authed: !!user });
    });

    app.post("/api/auth/register", function (req, res) {
      const body = req.body || {};
      const username = sanitizeUsername(body.username);
      const password = String(body.password || "");
      const displayName = sanitizeDisplay(body.displayName || body.username);
      const avatar = String(body.avatar || "").trim();
      if (!username || username.length < 3) {
        return res.status(400).json({ error: "bad_username" });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: "bad_password" });
      }
      if (avatar && avatar.length > MAX_AVATAR) {
        return res.status(400).json({ error: "avatar_too_large" });
      }
      const users = loadUsers();
      if (users.some(function (u) { return u.username === username; })) {
        return res.status(409).json({ error: "username_taken" });
      }
      const salt = crypto.randomBytes(16).toString("hex");
      const user = {
        id: crypto.randomUUID(),
        username: username,
        displayName: displayName || username,
        passwordSalt: salt,
        passwordHash: hashPassword(password, salt),
        avatar: avatar,
        roleId: "member",
        createdAt: Date.now(),
      };
      users.push(user);
      saveUsers(users);
      const token = crypto.randomBytes(32).toString("hex");
      storeSession(token, user.id);
      setUserCookie(res, token);
      res.status(201).json({ user: publicUser(user) });
    });

    app.post("/api/auth/login", function (req, res) {
      const username = sanitizeUsername(req.body && req.body.username);
      const password = String((req.body && req.body.password) || "");
      if (!username || !password) {
        return res.status(400).json({ error: "missing_fields" });
      }
      const users = loadUsers();
      const user = users.find(function (u) {
        return u.username === username;
      });
      if (!user || hashPassword(password, user.passwordSalt) !== user.passwordHash) {
        return res.status(401).json({ error: "invalid_credentials" });
      }
      const token = crypto.randomBytes(32).toString("hex");
      storeSession(token, user.id);
      setUserCookie(res, token);
      res.json({ user: publicUser(user) });
    });

    app.post("/api/auth/logout", function (req, res) {
      const cookies = parseCookies(req.headers.cookie || "");
      dropSession(cookies[COOKIE]);
      clearUserCookie(res);
      res.json({ ok: true });
    });

    app.put("/api/auth/profile", requireUser, function (req, res) {
      const current = getSessionUser(req);
      const body = req.body || {};
      const users = loadUsers();
      const idx = users.findIndex(function (u) {
        return u.id === current.id;
      });
      if (idx === -1) return res.status(404).json({ error: "not_found" });
      if (body.displayName != null) {
        users[idx].displayName = sanitizeDisplay(body.displayName) || users[idx].username;
      }
      if (body.avatar != null) {
        const avatar = String(body.avatar || "").trim();
        if (avatar.length > MAX_AVATAR) {
          return res.status(400).json({ error: "avatar_too_large" });
        }
        users[idx].avatar = avatar;
      }
      users[idx].updatedAt = Date.now();
      saveUsers(users);
      notifyProfileUpdate(users[idx]);
      res.json({ user: publicUser(users[idx]) });
    });

    app.put("/api/auth/credentials", requireUser, function (req, res) {
      const current = getSessionUser(req);
      const body = req.body || {};
      const currentPassword = String(body.currentPassword || "");
      const newPassword = body.newPassword != null ? String(body.newPassword) : null;
      const newUsername = body.username != null ? sanitizeUsername(body.username) : null;
      if (!currentPassword) {
        return res.status(400).json({ error: "missing_password" });
      }
      const users = loadUsers();
      const idx = users.findIndex(function (u) {
        return u.id === current.id;
      });
      if (idx === -1) return res.status(404).json({ error: "not_found" });
      if (hashPassword(currentPassword, users[idx].passwordSalt) !== users[idx].passwordHash) {
        return res.status(401).json({ error: "invalid_password" });
      }
      if (newUsername && newUsername !== users[idx].username) {
        if (newUsername.length < 3) return res.status(400).json({ error: "bad_username" });
        if (users.some(function (u) { return u.username === newUsername && u.id !== users[idx].id; })) {
          return res.status(409).json({ error: "username_taken" });
        }
        users[idx].username = newUsername;
      }
      if (newPassword != null) {
        if (newPassword.length < 6) return res.status(400).json({ error: "bad_password" });
        const salt = crypto.randomBytes(16).toString("hex");
        users[idx].passwordSalt = salt;
        users[idx].passwordHash = hashPassword(newPassword, salt);
      }
      users[idx].updatedAt = Date.now();
      saveUsers(users);
      notifyProfileUpdate(users[idx]);
      res.json({ user: publicUser(users[idx]) });
    });
  }

  loadSessions();

  function attachAdminRoutes(app, requireAuth) {
    app.get("/api/admin/users", requireAuth, function (req, res) {
      res.json(loadUsers().map(adminUserRow));
    });

    app.put("/api/admin/users/:id", requireAuth, function (req, res) {
      const id = String(req.params.id || "");
      const body = req.body || {};
      const users = loadUsers();
      const idx = users.findIndex(function (u) { return u.id === id; });
      if (idx === -1) return res.status(404).json({ error: "not_found" });
      if (body.displayName != null) {
        users[idx].displayName = sanitizeDisplay(body.displayName) || users[idx].username;
      }
      if (body.roleId != null) {
        users[idx].roleId = String(body.roleId || "member").slice(0, 24);
      }
      if (body.username != null) {
        const username = sanitizeUsername(body.username);
        if (!username || username.length < 3) return res.status(400).json({ error: "bad_username" });
        if (users.some(function (u) { return u.username === username && u.id !== id; })) {
          return res.status(409).json({ error: "username_taken" });
        }
        users[idx].username = username;
      }
      users[idx].updatedAt = Date.now();
      saveUsers(users);
      notifyProfileUpdate(users[idx]);
      res.json(adminUserRow(users[idx]));
    });

    app.delete("/api/admin/users/:id", requireAuth, function (req, res) {
      const id = String(req.params.id || "");
      const users = loadUsers().filter(function (u) { return u.id !== id; });
      if (users.length === loadUsers().length) return res.status(404).json({ error: "not_found" });
      saveUsers(users);
      res.json({ ok: true });
    });
  }

  return {
    attachRoutes: attachRoutes,
    attachAdminRoutes: attachAdminRoutes,
    getSessionUser: getSessionUser,
    requireUser: requireUser,
    publicUser: publicUser,
    loadUsers: loadUsers,
    saveUsers: saveUsers,
  };
}

module.exports = { createUserAuth: createUserAuth };
