(function () {
  var guestCard = document.getElementById("profile-guest");
  var panel = document.getElementById("profile-panel");
  var openAuth = document.getElementById("profile-open-auth");
  var form = document.getElementById("profile-form");
  var logoutBtn = document.getElementById("profile-logout");
  var errorEl = document.getElementById("profile-error");
  var successEl = document.getElementById("profile-success");
  var displayNameEl = document.getElementById("profile-display-name");
  var usernameEl = document.getElementById("profile-username");
  var roleBadge = document.getElementById("profile-role-badge");
  var displayInput = document.getElementById("profile-display-input");
  var usernameInput = document.getElementById("profile-username-input");
  var avatarImg = document.getElementById("profile-avatar-img");
  var avatarFallback = document.getElementById("profile-avatar-fallback");
  var avatarRing = document.getElementById("profile-avatar-ring");
  var avatarInput = document.getElementById("profile-avatar-input");
  var avatarClear = document.getElementById("profile-avatar-clear");
  var pendingAvatar = null;
  var avatarDirty = false;

  function initials(name) {
    var p = String(name || "?").trim().split(/\s+/);
    return ((p[0] && p[0][0]) || "?").toUpperCase() + ((p[1] && p[1][0]) || "").toUpperCase();
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      if (!file) return resolve("");
      if (file.size > 200000) return reject(new Error("file_too_large"));
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || "")); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function setMessage(err, ok) {
    if (errorEl) errorEl.textContent = err || "";
    if (successEl) {
      successEl.hidden = !ok;
      successEl.textContent = ok || "";
    }
  }

  function renderAvatar(user) {
    var url = pendingAvatar != null ? pendingAvatar : (user && user.avatar) || "";
    if (avatarImg) {
      if (url) {
        avatarImg.src = url;
        avatarImg.hidden = false;
      } else {
        avatarImg.removeAttribute("src");
        avatarImg.hidden = true;
      }
    }
    if (avatarFallback) {
      avatarFallback.textContent = initials(user && (user.displayName || user.username));
      avatarFallback.hidden = !!url;
    }
    if (avatarRing) avatarRing.classList.toggle("profile-hero__avatar-wrap--filled", !!url);
    if (avatarClear) avatarClear.hidden = !url;
  }

  function render(user) {
    var logged = window.ZentraAuth && window.ZentraAuth.isLoggedIn && window.ZentraAuth.isLoggedIn();
    if (guestCard) guestCard.hidden = logged;
    if (panel) panel.hidden = !logged;
    if (!logged) return;
    pendingAvatar = null;
    avatarDirty = false;
    setMessage("", "");
    if (displayNameEl) displayNameEl.textContent = user.displayName || user.username;
    if (usernameEl) usernameEl.textContent = "@" + user.username;
    if (roleBadge) {
      roleBadge.textContent = user.roleName || "Member";
      roleBadge.style.color = user.roleColor || "";
      roleBadge.style.borderColor = user.roleColor || "";
    }
    var panelBtn = document.getElementById("profile-panel-btn");
    if (panelBtn) {
      var canPanel = !!user.canAccessPanel;
      panelBtn.hidden = !canPanel;
      panelBtn.textContent = user.isModerator ? "Open moderator panel" : "Open admin panel";
    }
    if (displayInput) displayInput.value = user.displayName || "";
    if (usernameInput) usernameInput.value = user.username || "";
    renderAvatar(user);
  }

  function refresh() {
    if (!window.ZentraAuth) return;
    window.ZentraAuth.refresh().then(function (data) {
      render(data.user || window.ZentraAuth.user());
    });
  }

  if (openAuth) {
    openAuth.addEventListener("click", function () {
      if (window.ZentraAuth && window.ZentraAuth.showGate) window.ZentraAuth.showGate();
    });
  }

  if (avatarInput) {
    avatarInput.addEventListener("change", function () {
      var file = avatarInput.files && avatarInput.files[0];
      if (!file) return;
      readFileAsDataUrl(file).then(function (url) {
        pendingAvatar = url;
        avatarDirty = true;
        renderAvatar(window.ZentraAuth.user());
      }).catch(function () {
        setMessage("Image is too large. Try a smaller file.", "");
      });
    });
  }

  if (avatarClear) {
    avatarClear.addEventListener("click", function () {
      pendingAvatar = "";
      avatarDirty = true;
      if (avatarInput) avatarInput.value = "";
      renderAvatar(window.ZentraAuth.user());
    });
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!window.ZentraAuth || !window.ZentraAuth.isLoggedIn()) return;
      setMessage("", "");
      var currentPassword = document.getElementById("profile-current-password").value;
      var newPassword = document.getElementById("profile-new-password").value;
      var username = usernameInput ? usernameInput.value.trim() : "";
      var displayName = displayInput ? displayInput.value.trim() : "";
      var user = window.ZentraAuth.user();
      var chain = Promise.resolve();
      if (displayName && displayName !== (user.displayName || "")) {
        chain = chain.then(function () {
          return window.ZentraAuth.updateProfile({ displayName: displayName });
        });
      }
      if (avatarDirty) {
        chain = chain.then(function () {
          return window.ZentraAuth.updateProfile({ avatar: pendingAvatar != null ? pendingAvatar : "" });
        });
      }
      var usernameChanged = username && username !== user.username;
      var passwordChanged = !!newPassword;
      if (usernameChanged || passwordChanged) {
        if (!currentPassword) {
          setMessage("Enter your current password to change username or password.", "");
          return;
        }
        chain = chain.then(function () {
          return fetch("/api/auth/credentials", {
            method: "PUT",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              currentPassword: currentPassword,
              newPassword: passwordChanged ? newPassword : undefined,
              username: usernameChanged ? username : undefined,
            }),
          }).then(function (res) {
            return res.json().then(function (data) {
              if (!res.ok) throw new Error(data.error || "save_failed");
              if (data.user && window.ZentraAuth && window.ZentraAuth.refresh) {
                return data;
              }
              return data;
            });
          });
        });
      }
      chain.then(function () {
        return window.ZentraAuth.refresh();
      }).then(function () {
        setMessage("", "Profile updated");
        avatarDirty = false;
        pendingAvatar = null;
        refresh();
        var np = document.getElementById("profile-new-password");
        var cp = document.getElementById("profile-current-password");
        if (np) np.value = "";
        if (cp) cp.value = "";
      }).catch(function (err) {
        var msg = "Could not save profile";
        if (err.message === "invalid_password") msg = "Current password is wrong";
        if (err.message === "username_taken") msg = "Username already taken";
        if (err.message === "bad_username") msg = "Username must be at least 3 characters";
        if (err.message === "bad_password") msg = "New password must be at least 6 characters";
        setMessage(msg, "");
      });
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      if (window.ZentraAuth && window.ZentraAuth.logout) {
        window.ZentraAuth.logout();
      }
    });
  }

  var panelBtn = document.getElementById("profile-panel-btn");
  if (panelBtn) {
    panelBtn.addEventListener("click", function () {
      window.location.href = "/admin/";
    });
  }

  window.addEventListener("zentra-auth", function () {
    render(window.ZentraAuth.user());
  });

  window.ZentraProfile = { refresh: refresh };

  refresh();
})();
