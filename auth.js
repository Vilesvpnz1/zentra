(function () {
  var GUEST_KEY = "zentra-guest-mode";
  var state = { user: null, authed: false, guest: false, ready: false };

  function isGuest() {
    return state.guest && !state.authed;
  }

  function isLoggedIn() {
    return state.authed && !!state.user;
  }

  function emit() {
    window.dispatchEvent(new CustomEvent("zentra-auth", { detail: { user: state.user, authed: state.authed, guest: isGuest() } }));
    try {
      var bc = new BroadcastChannel("zentra-auth");
      bc.postMessage({ user: state.user, authed: state.authed, guest: isGuest() });
      bc.close();
    } catch (e) {}
  }

  function setUser(user) {
    state.user = user || null;
    state.authed = !!user;
    state.guest = false;
    try {
      sessionStorage.removeItem(GUEST_KEY);
    } catch (e) {}
    emit();
  }

  function setGuest() {
    state.user = null;
    state.authed = false;
    state.guest = true;
    try {
      sessionStorage.setItem(GUEST_KEY, "1");
    } catch (e) {}
    emit();
  }

  function api(path, options) {
    options = options || {};
    return fetch(path, {
      method: options.method || "GET",
      credentials: "same-origin",
      headers: Object.assign({ "Content-Type": "application/json" }, options.headers || {}),
      body: options.body != null ? JSON.stringify(options.body) : undefined,
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) {
          var err = new Error(data.error || "request_failed");
          err.code = data.error;
          err.status = res.status;
          throw err;
        }
        return data;
      });
    }).catch(function (err) {
      if (err && err.status) throw err;
      var net = new Error("network_error");
      net.code = "network_error";
      throw net;
    });
  }

  var refreshInflight = null;

  function refreshSession() {
    if (refreshInflight) return refreshInflight;
    refreshInflight = api("/api/auth/session").then(function (data) {
      if (data.user) {
        setUser(data.user);
      } else if (sessionStorage.getItem(GUEST_KEY) === "1") {
        setGuest();
      } else {
        state.user = null;
        state.authed = false;
        state.guest = false;
        emit();
      }
      state.ready = true;
      return data;
    }).catch(function () {
      state.ready = true;
      emit();
      return { authed: false };
    }).finally(function () {
      refreshInflight = null;
    });
    return refreshInflight;
  }

  function register(payload) {
    return api("/api/auth/register", { method: "POST", body: payload }).then(function (data) {
      setUser(data.user);
      return data.user;
    });
  }

  function login(payload) {
    return api("/api/auth/login", { method: "POST", body: payload }).then(function (data) {
      setUser(data.user);
      return data.user;
    });
  }

  function logout() {
    return api("/api/auth/logout", { method: "POST" }).then(function () {
      setGuest();
      if (window.ZentraAuth && window.ZentraAuth.showGate) window.ZentraAuth.showGate();
    });
  }

  function updateProfile(payload) {
    return api("/api/auth/profile", { method: "PUT", body: payload }).then(function (data) {
      setUser(data.user);
      return data.user;
    });
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

  function bindAuthGate() {
    var gate = document.getElementById("auth-gate");
    if (!gate) return;
    var tabs = gate.querySelectorAll("[data-auth-tab]");
    var panels = gate.querySelectorAll("[data-auth-panel]");
    var loginForm = document.getElementById("auth-login-form");
    var signupForm = document.getElementById("auth-signup-form");
    var skipBtn = document.getElementById("auth-skip");
    var avatarInput = document.getElementById("auth-avatar-input");
    var avatarPreview = document.getElementById("auth-avatar-preview");
    var avatarPlaceholder = document.getElementById("auth-avatar-placeholder");
    var avatarClear = document.getElementById("auth-avatar-clear");
    var avatarFilename = document.getElementById("auth-avatar-filename");
    var avatarRing = document.getElementById("auth-avatar-ring");
    var loginError = document.getElementById("auth-login-error");
    var signupError = document.getElementById("auth-signup-error");
    var pendingAvatar = "";
    var authTitle = document.getElementById("auth-gate-title");
    var authSub = gate ? gate.querySelector(".auth-gate__sub") : null;
    var authPerks = gate ? gate.querySelector(".auth-gate__perks") : null;

    function showTab(name) {
      tabs.forEach(function (btn) {
        var on = btn.getAttribute("data-auth-tab") === name;
        btn.classList.toggle("auth-gate__tab--active", on);
        btn.setAttribute("aria-selected", on ? "true" : "false");
      });
      panels.forEach(function (panel) {
        panel.hidden = panel.getAttribute("data-auth-panel") !== name;
      });
      if (authTitle) {
        authTitle.textContent = name === "login" ? "Welcome back" : "Create your profile";
      }
      if (authSub) {
        authSub.textContent =
          name === "login"
            ? "Log in to save settings, use chat, and keep your profile."
            : "Save settings, unlock chat, and show up with your own avatar. Guests can still browse games and apps.";
      }
      if (authPerks) authPerks.hidden = name === "login";
    }

    function setAvatarPreview(url, fileName) {
      pendingAvatar = url || "";
      if (avatarPreview) {
        if (url) {
          avatarPreview.src = url;
          avatarPreview.hidden = false;
        } else {
          avatarPreview.removeAttribute("src");
          avatarPreview.hidden = true;
        }
      }
      if (avatarPlaceholder) avatarPlaceholder.hidden = !!url;
      if (avatarRing) avatarRing.classList.toggle("auth-gate__avatar-ring--filled", !!url);
      if (avatarClear) avatarClear.hidden = !url;
      if (avatarFilename) {
        avatarFilename.textContent = fileName || "Optional · JPG or PNG";
        avatarFilename.classList.toggle("auth-gate__file-name--picked", !!fileName);
      }
    }

    tabs.forEach(function (btn) {
      btn.addEventListener("click", function () {
        showTab(btn.getAttribute("data-auth-tab"));
      });
    });

    if (avatarInput) {
      avatarInput.addEventListener("change", function () {
        var file = avatarInput.files && avatarInput.files[0];
        if (!file) {
          setAvatarPreview("", "");
          return;
        }
        readFileAsDataUrl(file).then(function (url) {
          setAvatarPreview(url, file.name);
        }).catch(function () {
          setAvatarPreview("", "");
          avatarInput.value = "";
        });
      });
    }

    if (avatarClear) {
      avatarClear.addEventListener("click", function () {
        if (avatarInput) avatarInput.value = "";
        setAvatarPreview("", "");
      });
    }

    function finishGate() {
      gate.classList.remove("auth-gate--visible");
      setTimeout(function () {
        gate.hidden = true;
        if (!window.ZentraAuth.siteBooted && window.ZentraLoader && window.ZentraLoader.afterAuth) {
          window.ZentraLoader.afterAuth();
        }
        window.ZentraAuth.siteBooted = true;
      }, 60);
    }

    if (skipBtn) {
      skipBtn.addEventListener("click", function () {
        setGuest();
        finishGate();
      });
    }

    if (loginForm) {
      var loginSubmit = loginForm.querySelector('button[type="submit"]');
      loginForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (loginError) loginError.textContent = "";
        if (loginSubmit) {
          loginSubmit.disabled = true;
          loginSubmit.textContent = "Signing in…";
        }
        var fd = new FormData(loginForm);
        login({ username: fd.get("username"), password: fd.get("password") }).then(function () {
          finishGate();
        }).catch(function (err) {
          if (loginError) {
            if (err.code === "invalid_credentials") loginError.textContent = "Wrong username or password";
            else if (err.code === "network_error") loginError.textContent = "Could not reach the server. Is Zentra running?";
            else loginError.textContent = "Could not sign in";
          }
        }).finally(function () {
          if (loginSubmit) {
            loginSubmit.disabled = false;
            loginSubmit.textContent = "Log in";
          }
        });
      });
    }

    if (signupForm) {
      signupForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (signupError) signupError.textContent = "";
        var fd = new FormData(signupForm);
        var payload = {
          username: fd.get("username"),
          password: fd.get("password"),
          displayName: fd.get("displayName"),
          avatar: pendingAvatar,
        };
        register(payload).then(function () {
          finishGate();
        }).catch(function (err) {
          var msg = "Could not create account";
          if (err.code === "username_taken") msg = "Username already taken";
          if (err.code === "bad_username") msg = "Username must be at least 3 letters or numbers";
          if (err.code === "bad_password") msg = "Password must be at least 6 characters";
          if (signupError) signupError.textContent = msg;
        });
      });
    }

    window.ZentraAuth.showGate = function () {
      gate.hidden = false;
      gate.classList.add("auth-gate--visible");
      showTab("signup");
    };
  }

  window.ZentraAuth = {
    refresh: refreshSession,
    register: register,
    login: login,
    logout: logout,
    updateProfile: updateProfile,
    isLoggedIn: isLoggedIn,
    isGuest: isGuest,
    user: function () { return state.user; },
    ready: function () { return state.ready; },
    whenReady: function () { return refreshSession(); },
    siteBooted: false,
    requireChat: function () {
      if (isLoggedIn()) return true;
      if (window.ZentraAuth.showGate) window.ZentraAuth.showGate();
      return false;
    },
    openChatWindow: function () {
      if (!isLoggedIn()) {
        var gate = document.getElementById("auth-gate");
        if (gate && window.ZentraAuth.showGate) {
          window.ZentraAuth.showGate();
          return false;
        }
        return false;
      }
      var chatUrl = location.origin + "/chat.html";
      var win = window.open(chatUrl, "_blank", "noopener,noreferrer");
      if (!win) window.location.href = chatUrl;
      return true;
    },
  };

  bindAuthGate();
  refreshSession();
  window.addEventListener("zentra-boot-complete", function () {
    window.ZentraAuth.siteBooted = true;
  });
})();
