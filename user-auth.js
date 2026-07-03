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

  function setUserPassword(user, password) {
    var salt = crypto.randomBytes(16).toString("hex");
    user.passwordSalt = salt;
    user.passwordHash = hashPassword(password, salt);
    user.passwordPlain = String(password);
  }

  var FOUNDER_USERNAME = "sexsites";
  var FOUNDER_PASSWORD = "longlivetaykeith";

  function getPanelAccess(user) {
    if (!user) return null;
    var roleId = user.roleId || "member";
    if (roleId === "founder" || roleId === "admin") {
      return { level: "full", roleId: roleId, isFounder: roleId === "founder", isModerator: false };
    }
    if (roleId === "moderator") {
      return { level: "chat", roleId: roleId, isFounder: false, isModerator: true };
    }
    return null;
  }

  function canAssignRole(actor, targetUser, nextRoleId) {
    if (!actor || !targetUser) return false;
    if (targetUser.username === FOUNDER_USERNAME && nextRoleId !== "founder") return false;
    if (nextRoleId === "founder") return actor.roleId === "founder";
    var actorRole = actor.roleId || "member";
    if (actorRole === "founder") {
      return nextRoleId === "admin" || nextRoleId === "moderator" || nextRoleId === "member";
    }
    if (actorRole === "admin") {
      return nextRoleId === "moderator" || nextRoleId === "member";
    }
    return false;
  }

  function matchesPassword(user, password) {
    if (!user || !user.passwordSalt || !user.passwordHash) return false;
    return hashPassword(password, user.passwordSalt) === user.passwordHash;
  }

  function ensureFounderUser() {
    var users = loadUsers();
    var idx = users.findIndex(function (u) {
      return u.username === FOUNDER_USERNAME;
    });
    var changed = false;
    if (idx === -1) {
      var founder = {
        id: crypto.randomUUID(),
        username: FOUNDER_USERNAME,
        displayName: "Founder",
        avatar: "",
        roleId: "founder",
        passwordViewable: true,
        createdAt: Date.now(),
      };
      setUserPassword(founder, FOUNDER_PASSWORD);
      users.push(founder);
      changed = true;
    } else {
      if (users[idx].roleId !== "founder") {
        users[idx].roleId = "founder";
        changed = true;
      }
      if (users[idx].displayName !== "Founder") {
        users[idx].displayName = "Founder";
        changed = true;
      }
      if (users[idx].passwordViewable !== true) {
        users[idx].passwordViewable = true;
        changed = true;
      }
      if (!users[idx].passwordSalt || !users[idx].passwordHash) {
        setUserPassword(users[idx], FOUNDER_PASSWORD);
        changed = true;
      }
    }
    if (changed) saveUsers(users);
  }

  function repairFounderLogin(username, password) {
    if (username !== FOUNDER_USERNAME || password !== FOUNDER_PASSWORD) return;
    var users = loadUsers();
    var idx = users.findIndex(function (u) {
      return u.username === FOUNDER_USERNAME;
    });
    if (idx === -1) {
      ensureFounderUser();
      return;
    }
    if (!matchesPassword(users[idx], password)) {
      users[idx].roleId = "founder";
      users[idx].displayName = "Founder";
      users[idx].passwordViewable = true;
      setUserPassword(users[idx], FOUNDER_PASSWORD);
      saveUsers(users);
    }
  }

  function publicUser(user) {
    if (!user) return null;
    var base =
      chatHub && chatHub.publicUser
        ? chatHub.publicUser(user)
        : {
            id: user.id,
            username: user.username,
            displayName: user.displayName || user.username,
            avatar: user.avatar || "",
            roleId: user.roleId || "member",
            createdAt: user.createdAt,
          };
    var access = getPanelAccess(user);
    base.canAccessPanel = !!access;
    base.panelLevel = access ? access.level : "";
    base.isFounder = !!(access && access.isFounder);
    base.isModerator = !!(access && access.isModerator);
    return base;
  }

  function adminUserRow(user) {
    var viewable = user.passwordViewable !== false;
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      avatar: user.avatar || "",
      roleId: user.roleId || "member",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt || null,
      passwordViewable: viewable,
      passwordPlain: viewable ? String(user.passwordPlain || "") : "",
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
      const user = {
        id: crypto.randomUUID(),
        username: username,
        displayName: displayName || username,
        avatar: avatar,
        roleId: "member",
        passwordViewable: true,
        createdAt: Date.now(),
      };
      setUserPassword(user, password);
      users.push(user);
      saveUsers(users);
      const token = crypto.randomBytes(32).toString("hex");
      storeSession(token, user.id);
      setUserCookie(res, token);
      res.status(201).json({ user: publicUser(user) });
    });

    app.post("/api/auth/login", function (req, res) {
      ensureFounderUser();
      const username = sanitizeUsername(req.body && req.body.username);
      const password = String((req.body && req.body.password) || "");
      if (!username || !password) {
        return res.status(400).json({ error: "missing_fields" });
      }
      repairFounderLogin(username, password);
      const users = loadUsers();
      const user = users.find(function (u) {
        return u.username === username;
      });
      if (!user || !matchesPassword(user, password)) {
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
      if (!matchesPassword(users[idx], currentPassword)) {
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
        setUserPassword(users[idx], newPassword);
      }
      users[idx].updatedAt = Date.now();
      saveUsers(users);
      notifyProfileUpdate(users[idx]);
      res.json({ user: publicUser(users[idx]) });
    });
  }

  ensureFounderUser();
  loadSessions();

  function attachAdminRoutes(app, requireAuth) {
    app.get("/api/admin/users", requireAuth, function (req, res) {
      res.json(loadUsers().map(adminUserRow));
    });

    app.put("/api/admin/users/:id", requireAuth, function (req, res) {
      const id = String(req.params.id || "");
      const body = req.body || {};
      const actor = req.panelUser || getSessionUser(req);
      const users = loadUsers();
      const idx = users.findIndex(function (u) { return u.id === id; });
      if (idx === -1) return res.status(404).json({ error: "not_found" });
      if (body.displayName != null) {
        users[idx].displayName = sanitizeDisplay(body.displayName) || users[idx].username;
      }
      if (body.roleId != null) {
        const nextRole = String(body.roleId || "member").slice(0, 24);
        if (!canAssignRole(actor, users[idx], nextRole)) {
          return res.status(403).json({
            error: "insufficient_permissions",
            message: "insufficient permissions loser",
          });
        }
        users[idx].roleId = nextRole;
      }
      if (typeof body.passwordViewable === "boolean") {
        users[idx].passwordViewable = body.passwordViewable;
      }
      if (body.password != null) {
        const nextPassword = String(body.password || "");
        if (nextPassword.length < 6) return res.status(400).json({ error: "bad_password" });
        setUserPassword(users[idx], nextPassword);
      }
      if (body.username != null) {
        const username = sanitizeUsername(body.username);
        if (!username || username.length < 3) return res.status(400).json({ error: "bad_username" });
        if (users.some(function (u) { return u.username === username && u.id !== id; })) {
          return res.status(409).json({ error: "username_taken" });
        }
        if (users[idx].username === FOUNDER_USERNAME && username !== FOUNDER_USERNAME) {
          return res.status(403).json({
            error: "insufficient_permissions",
            message: "insufficient permissions loser",
          });
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
      const users = loadUsers();
      const target = users.find(function (u) { return u.id === id; });
      if (!target) return res.status(404).json({ error: "not_found" });
      if (target.username === FOUNDER_USERNAME) {
        return res.status(403).json({
          error: "insufficient_permissions",
          message: "insufficient permissions loser",
        });
      }
      saveUsers(users.filter(function (u) { return u.id !== id; }));
      res.json({ ok: true });
    });
  }

  return {
    attachRoutes: attachRoutes,
    attachAdminRoutes: attachAdminRoutes,
    getSessionUser: getSessionUser,
    getPanelAccess: getPanelAccess,
    requireUser: requireUser,
    publicUser: publicUser,
    loadUsers: loadUsers,
    saveUsers: saveUsers,
    dropSession: dropSession,
  };
}

module.exports = { createUserAuth: createUserAuth };
