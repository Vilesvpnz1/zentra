window.KobranStore = (function () {
  function apiUrl(path) {
    if (/^https?:\/\//i.test(path)) return path;
    if (typeof window !== "undefined" && window.location && window.location.protocol === "file:") {
      return "http://localhost:" + (window.__KOBRAN_PORT || "3080") + path;
    }
    return path;
  }

  function api(path, options) {
    options = options || {};
    return fetch(apiUrl(path), {
      method: options.method || "GET",
      headers: Object.assign({ "Content-Type": "application/json" }, options.headers || {}),
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: "same-origin",
    })
      .then(function (res) {
        return res
          .json()
          .catch(function () {
            return {};
          })
          .then(function (data) {
            if (!res.ok) {
              const err = new Error((data && data.error) || "Request failed");
              err.status = res.status;
              throw err;
            }
            return data;
          });
      })
      .catch(function (err) {
        if (err && err.status) throw err;
        const net = new Error("network_error");
        net.cause = err;
        throw net;
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
    login: function (username, password) {
      return api("/api/auth/login", {
        method: "POST",
        body: { username: username, password: password },
      });
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
    scanAdminGamesFetch: function () {
      return api("/api/admin/games/scan-fetch", { method: "POST", body: {} });
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
    getAdminChatMessages: function (channelId) {
      var q = channelId ? "?channelId=" + encodeURIComponent(channelId) : "";
      return api("/api/admin/chat/messages" + q);
    },
    getAdminChatChannels: function () {
      return api("/api/admin/chat/channels");
    },
    getAdminChatChannels: function () {
      return api("/api/admin/chat/channels");
    },
    createAdminChatChannel: function (payload) {
      return api("/api/admin/chat/channels", { method: "POST", body: payload });
    },
    updateAdminChatChannel: function (id, payload) {
      return api("/api/admin/chat/channels/" + encodeURIComponent(id), {
        method: "PUT",
        body: payload,
      });
    },
    deleteAdminChatChannel: function (id) {
      return api("/api/admin/chat/channels/" + encodeURIComponent(id), { method: "DELETE" });
    },
    deleteAdminChatMessage: function (id, channelId) {
      var q = channelId ? "?channelId=" + encodeURIComponent(channelId) : "";
      return api("/api/admin/chat/messages/" + encodeURIComponent(id) + q, { method: "DELETE" });
    },
    purgeAdminChatMessages: function (count, channelId) {
      return api("/api/admin/chat/messages/purge", {
        method: "POST",
        body: { count: count, channelId: channelId || "general" },
      });
    },
    getAdminChatServer: function () {
      return api("/api/admin/chat/settings");
    },
    updateAdminChatServer: function (payload) {
      return api("/api/admin/chat/settings", { method: "PUT", body: payload });
    },
    getAdminChatRoles: function () {
      return api("/api/admin/chat/roles");
    },
    createAdminChatRole: function (payload) {
      return api("/api/admin/chat/roles", { method: "POST", body: payload });
    },
    updateAdminChatRole: function (id, payload) {
      return api("/api/admin/chat/roles/" + encodeURIComponent(id), { method: "PUT", body: payload });
    },
    deleteAdminChatRole: function (id) {
      return api("/api/admin/chat/roles/" + encodeURIComponent(id), { method: "DELETE" });
    },
    pinAdminChatMessage: function (id) {
      return api("/api/admin/chat/messages/" + encodeURIComponent(id) + "/pin", { method: "POST" });
    },
    unpinAdminChatMessage: function () {
      return api("/api/admin/chat/pin", { method: "DELETE" });
    },
    muteChatUser: function (userId, muted) {
      return api("/api/admin/chat/mute", { method: "POST", body: { userId: userId, muted: muted !== false } });
    },
    getAdminFeatured: function () {
      return api("/api/admin/featured");
    },
    addAdminFeatured: function (payload) {
      return api("/api/admin/featured", { method: "POST", body: payload });
    },
    deleteAdminFeatured: function (id) {
      return api("/api/admin/featured/" + encodeURIComponent(id), { method: "DELETE" });
    },
    getAdminUsers: function () {
      return api("/api/admin/users");
    },
    updateAdminUser: function (id, payload) {
      return api("/api/admin/users/" + encodeURIComponent(id), { method: "PUT", body: payload });
    },
    deleteAdminUser: function (id) {
      return api("/api/admin/users/" + encodeURIComponent(id), { method: "DELETE" });
    },
    setBlacklist: function (hwid, scope, blocked) {
      return api("/api/admin/blacklist", {
        method: "POST",
        body: { hwid: hwid, scope: scope, blocked: blocked },
      });
    },
    getAdminOverview: function () {
      return api("/api/admin/overview");
    },
    refreshAdminCache: function () {
      return api("/api/admin/cache/refresh", { method: "POST" });
    },
    getAdminSecurity: function () {
      return api("/api/admin/security");
    },
    blockIp: function (ip, permanent) {
      return api("/api/admin/security/block", {
        method: "POST",
        body: { ip: ip, permanent: !!permanent },
      });
    },
    unblockIp: function (ip) {
      return api("/api/admin/security/unblock", {
        method: "POST",
        body: { ip: ip },
      });
    },
    getAdminFeatures: function () {
      return api("/api/admin/features");
    },
    putAdminFeatures: function (payload) {
      return api("/api/admin/features", { method: "PUT", body: payload });
    },
    getAdminRatings: function () {
      return api("/api/admin/ratings");
    },
    clearAdminRatings: function () {
      return api("/api/admin/ratings", { method: "DELETE" });
    },
    getAdminKobranHub: function () {
      return api("/api/admin/kobran-hub");
    },
    updateAdminKobranHubSettings: function (payload) {
      return api("/api/admin/kobran-hub/settings", { method: "POST", body: payload });
    },
    createAdminKobranKey: function (payload) {
      return api("/api/admin/kobran-hub/keys", { method: "POST", body: payload });
    },
    updateAdminKobranKey: function (id, payload) {
      return api("/api/admin/kobran-hub/keys/" + encodeURIComponent(id), {
        method: "PUT",
        body: payload,
      });
    },
    deleteAdminKobranKey: function (id) {
      return api("/api/admin/kobran-hub/keys/" + encodeURIComponent(id), { method: "DELETE" });
    },
    exportAdminKobranKeys: function () {
      return api("/api/admin/kobran-hub/keys/export");
    },
    importAdminKobranKeys: function (payload) {
      return api("/api/admin/kobran-hub/keys/import", { method: "POST", body: payload });
    },
  };
})();
