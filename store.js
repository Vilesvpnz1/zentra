window.KritikalStore = (function () {
  function api(path, options) {
    options = options || {};
    return fetch(path, {
      method: options.method || "GET",
      headers: Object.assign({ "Content-Type": "application/json" }, options.headers || {}),
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: "same-origin",
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) {
          const err = new Error((data && data.error) || "Request failed");
          err.status = res.status;
          throw err;
        }
        return data;
      });
    });
  }

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function buildSearch(game) {
    return [game.id, game.title, game.file, game.path]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  return {
    formatDate: formatDate,
    buildSearch: buildSearch,
    checkSession: function () {
      return api("/api/admin/session");
    },
    login: function (key) {
      return api("/api/admin/login", { method: "POST", body: { key: key } });
    },
    logout: function () {
      return api("/api/admin/logout", { method: "POST" });
    },
    getGames: function () {
      return api("/api/games");
    },
    getAdminGames: function () {
      return api("/api/admin/games");
    },
    saveGame: function (id, payload) {
      return api("/api/admin/games/" + encodeURIComponent(id), {
        method: "PUT",
        body: payload,
      });
    },
    resetGame: function (id) {
      return api("/api/admin/games/" + encodeURIComponent(id) + "/override", {
        method: "DELETE",
      });
    },
    deleteGame: function (id) {
      return api("/api/admin/games/" + encodeURIComponent(id), {
        method: "DELETE",
      });
    },
    getAnnouncements: function () {
      return api("/api/announcements");
    },
    createAnnouncement: function (payload) {
      return api("/api/admin/announcements", { method: "POST", body: payload });
    },
    updateAnnouncement: function (id, payload) {
      return api("/api/admin/announcements/" + encodeURIComponent(id), {
        method: "PUT",
        body: payload,
      });
    },
    deleteAnnouncement: function (id) {
      return api("/api/admin/announcements/" + encodeURIComponent(id), {
        method: "DELETE",
      });
    },
    getChangelog: function () {
      return api("/api/changelog");
    },
    createChangelog: function (payload) {
      return api("/api/admin/changelog", { method: "POST", body: payload });
    },
    updateChangelog: function (id, payload) {
      return api("/api/admin/changelog/" + encodeURIComponent(id), {
        method: "PUT",
        body: payload,
      });
    },
    deleteChangelog: function (id) {
      return api("/api/admin/changelog/" + encodeURIComponent(id), {
        method: "DELETE",
      });
    },
    importGame: function (payload) {
      return api("/api/admin/games/import", { method: "POST", body: payload });
    },
    getAdminBlacklist: function () {
      return api("/api/admin/blacklist");
    },
    getAdminChatMessages: function () {
      return api("/api/admin/chat/messages");
    },
    deleteAdminChatMessage: function (id) {
      return api("/api/admin/chat/messages/" + encodeURIComponent(id), { method: "DELETE" });
    },
    purgeAdminChatMessages: function (count) {
      return api("/api/admin/chat/messages/purge", { method: "POST", body: { count: count } });
    },
    setBlacklist: function (hwid, scope, blocked) {
      return api("/api/admin/blacklist", {
        method: "POST",
        body: { hwid: hwid, scope: scope, blocked: blocked },
      });
    },
  };
})();
