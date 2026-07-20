(function () {
  var GUEST_KEY = "zentra-guest-mode";
  var VISIT_KEY = "zentra-visit-choice";
  var state = { user: null, authed: false, guest: false, ready: false };

  function hasGuestVisit() {
    try {
      return localStorage.getItem(VISIT_KEY) === "guest";
    } catch (e) {
      return false;
    }
  }

  function markGuestVisit() {
    try {
      localStorage.setItem(VISIT_KEY, "guest");
    } catch (e) {}
    setGuest();
  }

  function clearVisitChoice() {
    try {
      localStorage.removeItem(VISIT_KEY);
    } catch (e) {}
  }

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
    clearVisitChoice();
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
      } else if (hasGuestVisit()) {
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
      state.user = null;
      state.authed = false;
      state.guest = false;
      emit();
      if (window.ZentraAuth && window.ZentraAuth.showGate) window.ZentraAuth.showGate("login");
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

  function normalizeUsername(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "")
      .slice(0, 24);
  }

  function checkUsernameAvailable(username) {
    var u = normalizeUsername(username);
    if (u.length < 3) {
      return Promise.resolve({ available: false, reason: "short", username: u });
    }
    return api("/api/auth/username-available?u=" + encodeURIComponent(u))
      .then(function (data) {
        return {
          available: !!data.available,
          username: data.username || u,
          reason: data.reason || "",
        };
      })
      .catch(function () {
        return { available: null, error: true, username: u };
      });
  }

  function bindAuthGate() {
    var gate = document.getElementById("auth-gate");
    if (!gate) return;
    var tabs = gate.querySelectorAll("[data-auth-tab]");
    var panels = gate.querySelectorAll("[data-auth-panel]");
    var loginForm = document.getElementById("auth-login-form");
    var skipBtn = document.getElementById("auth-skip");
    var avatarInput = document.getElementById("auth-avatar-input");
    var avatarPreview = document.getElementById("auth-avatar-preview");
    var avatarPlaceholder = document.getElementById("auth-avatar-placeholder");
    var avatarClear = document.getElementById("auth-avatar-clear");
    var avatarFilename = document.getElementById("auth-avatar-filename");
    var avatarRing = document.getElementById("auth-avatar-ring");
    var loginError = document.getElementById("auth-login-error");
    var signupError = document.getElementById("auth-signup-error");
    var wizUsername = document.getElementById("auth-wiz-username");
    var wizUsernameStatus = document.getElementById("auth-wiz-username-status");
    var wizPassword = document.getElementById("auth-wiz-password");
    var wizDisplay = document.getElementById("auth-wiz-display");
    var wizBack = document.getElementById("auth-wizard-back");
    var wizSkip = document.getElementById("auth-wizard-skip");
    var wizNext = document.getElementById("auth-wizard-next");
    var wizDots = document.getElementById("auth-wizard-dots");
    var wizStepLabel = document.getElementById("auth-wizard-step-label");
    var bgGrid = document.getElementById("auth-bg-grid");
    var bgWallpapers = document.getElementById("auth-bg-wallpapers");
    var engineGrid = document.getElementById("auth-engine-grid");
    var wizYes = document.getElementById("auth-wiz-yes");
    var wizNo = document.getElementById("auth-wiz-no");
    var wizLoginLink = document.getElementById("auth-wiz-login-link");
    var wizHead = document.getElementById("auth-wizard-head");
    var gateTabs = document.getElementById("auth-gate-tabs");
    var gateFooter = document.getElementById("auth-gate-footer");
    var gateIntro = document.getElementById("auth-gate-intro");
    var authTitle = document.getElementById("auth-gate-title");
    var authSub = document.getElementById("auth-gate-sub");
    var wizardEl = document.getElementById("auth-wizard");
    var wizardNav = gate ? gate.querySelector(".auth-gate__wizard-nav") : null;
    var wizardSteps = gate.querySelectorAll("[data-wizard-step]");
    var SIGNUP_STEPS = 6;
    var wizardStep = 0;
    var usernameCheckTimer = 0;
    var usernameCheckSeq = 0;
    var usernameAvailable = null;
    var pendingAvatar = "";
    var wizData = {
      username: "",
      password: "",
      displayName: "",
      background: "grid",
      backgroundUrl: "",
      searchEngine: (window.KritikalSearchEngines && window.KritikalSearchEngines.defaultId) || "duckduckgo",
    };

    function showTab(name) {
      tabs.forEach(function (btn) {
        var on = btn.getAttribute("data-auth-tab") === name;
        btn.classList.toggle("auth-gate__tab--active", on);
        btn.setAttribute("aria-selected", on ? "true" : "false");
      });
      panels.forEach(function (panel) {
        panel.hidden = panel.getAttribute("data-auth-panel") !== name;
      });
      if (wizardEl) wizardEl.hidden = name !== "signup";
      if (loginForm) loginForm.hidden = name !== "login";
      if (gateTabs) gateTabs.hidden = name !== "login";
      if (gateFooter) gateFooter.hidden = true;
      if (gateIntro) gateIntro.hidden = name === "login" ? false : wizardStep >= 1;
      if (authTitle) {
        authTitle.textContent = name === "login" ? "Welcome back" : wizardStep > 0 ? "Create your profile" : "Welcome to Kritikal";
      }
      if (authSub) {
        authSub.textContent =
          name === "login"
            ? "log in for chat and synced settings."
            : wizardStep > 0
              ? "quick setup. skip what u dont care about."
              : "one time setup. skip if u just wanna browse.";
      }
      if (name === "signup") resetWizard();
    }

    function resetWizard() {
      wizardStep = 0;
      pendingAvatar = "";
      wizData = {
        username: "",
        password: "",
        displayName: "",
        background: "grid",
        backgroundUrl: "",
        searchEngine: (window.KritikalSearchEngines && window.KritikalSearchEngines.defaultId) || "duckduckgo",
      };
      if (wizUsername) wizUsername.value = "";
      if (wizUsernameStatus) {
        wizUsernameStatus.textContent = "";
        wizUsernameStatus.className = "auth-gate__field-status";
      }
      usernameAvailable = null;
      clearTimeout(usernameCheckTimer);
      if (wizPassword) wizPassword.value = "";
      if (wizDisplay) wizDisplay.value = "";
      if (avatarInput) avatarInput.value = "";
      setAvatarPreview("", "");
      if (signupError) signupError.textContent = "";
      renderWizardStep();
      buildBgPicker();
      buildEnginePicker();
    }

    function renderWizardStep() {
      wizardSteps.forEach(function (step) {
        var n = Number(step.getAttribute("data-wizard-step"));
        var on = n === wizardStep;
        step.hidden = !on;
        step.classList.toggle("auth-gate__step--active", on);
        if (on) {
          step.style.animation = "none";
          void step.offsetWidth;
          step.style.animation = "";
        }
      });
      var inSignup = wizardStep >= 1;
      if (gateIntro) gateIntro.hidden = inSignup;
      if (wizHead) wizHead.hidden = !inSignup;
      if (wizardNav) wizardNav.hidden = !inSignup;
      if (authTitle) authTitle.textContent = inSignup ? "Create your profile" : "Welcome to Kritikal";
      if (authSub) {
        authSub.textContent = inSignup
          ? "quick setup. skip what u dont care about."
          : "one time setup. skip if u just wanna browse.";
      }
      if (wizDots && inSignup) {
        wizDots.innerHTML = "";
        for (var i = 1; i <= SIGNUP_STEPS; i++) {
          var dot = document.createElement("span");
          dot.className =
            "auth-gate__wizard-dot" +
            (i === wizardStep ? " auth-gate__wizard-dot--active" : i < wizardStep ? " auth-gate__wizard-dot--done" : "");
          wizDots.appendChild(dot);
        }
      }
      if (wizStepLabel && inSignup) wizStepLabel.textContent = "Step " + wizardStep + " of " + SIGNUP_STEPS;
      if (wizBack) wizBack.hidden = wizardStep < 1;
      if (wizSkip) wizSkip.hidden = wizardStep !== 4;
      if (wizNext) {
        wizNext.textContent = wizardStep === SIGNUP_STEPS ? "Create account" : "Continue";
        wizNext.disabled = false;
      }
      var focusMap = { 1: wizUsername, 2: wizPassword, 3: wizDisplay };
      var focusEl = focusMap[wizardStep];
      if (focusEl) setTimeout(function () { focusEl.focus(); }, 40);
    }

    function beginSignup() {
      wizardStep = 1;
      if (gateTabs) gateTabs.hidden = true;
      if (signupError) signupError.textContent = "";
      buildBgPicker();
      buildEnginePicker();
      renderWizardStep();
    }

    function buildBgPicker() {
      if (!bgGrid) return;
      var presets = (window.ZentraSiteBg && window.ZentraSiteBg.presets) || {
        eclipse: { label: "Eclipse", url: "/assets/backgrounds/eclipse.svg" },
        nebula: { label: "Nebula", url: "/assets/backgrounds/nebula.svg" },
        void: { label: "Deep void", url: "/assets/backgrounds/void.svg" },
        dawn: { label: "Dawn", url: "/assets/backgrounds/dawn.svg" },
        grid: { label: "Grid", url: "/assets/backgrounds/grid.svg" },
      };
      bgGrid.innerHTML = "";
      Object.keys(presets).forEach(function (key) {
        if (key === "custom") return;
        var meta = presets[key];
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "auth-gate__bg-option" + (wizData.background === key && !wizData.backgroundUrl ? " auth-gate__bg-option--active" : "");
        btn.dataset.bg = key;
        btn.innerHTML =
          '<span class="auth-gate__bg-thumb"><img src="' +
          meta.url +
          '" alt="" width="120" height="72" loading="lazy" decoding="async" /></span><span class="auth-gate__bg-label">' +
          meta.label +
          "</span>";
        btn.addEventListener("click", function () {
          wizData.background = key;
          wizData.backgroundUrl = "";
          bgGrid.querySelectorAll(".auth-gate__bg-option").forEach(function (el) {
            el.classList.toggle("auth-gate__bg-option--active", el.dataset.bg === key);
          });
          if (bgWallpapers) {
            bgWallpapers.querySelectorAll(".auth-gate__bg-option").forEach(function (el) {
              el.classList.remove("auth-gate__bg-option--active");
            });
          }
        });
        bgGrid.appendChild(btn);
      });
      if (!bgWallpapers) return;
      bgWallpapers.innerHTML = "";
      var curated = (window.ZentraSiteBg && window.ZentraSiteBg.curatedWallpapers) || [];
      if (!curated.length) return;
      var heading = document.createElement("p");
      heading.className = "auth-gate__bg-wall-heading";
      heading.textContent = "Wallpapers";
      bgWallpapers.appendChild(heading);
      var wallGrid = document.createElement("div");
      wallGrid.className = "auth-gate__bg-grid auth-gate__bg-grid--wall";
      curated.forEach(function (item) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className =
          "auth-gate__bg-option auth-gate__bg-option--wall" +
          (wizData.background === "custom" && wizData.backgroundUrl === item.url ? " auth-gate__bg-option--active" : "");
        btn.dataset.wallpaperUrl = item.url;
        btn.innerHTML =
          '<span class="auth-gate__bg-thumb"><img src="' +
          (item.thumb || item.url) +
          '" alt="" width="120" height="72" loading="lazy" decoding="async" /></span><span class="auth-gate__bg-label">' +
          item.label +
          "</span>";
        btn.addEventListener("click", function () {
          wizData.background = "custom";
          wizData.backgroundUrl = item.url;
          wallGrid.querySelectorAll(".auth-gate__bg-option").forEach(function (el) {
            el.classList.toggle("auth-gate__bg-option--active", el.dataset.wallpaperUrl === item.url);
          });
          if (bgGrid) {
            bgGrid.querySelectorAll(".auth-gate__bg-option").forEach(function (el) {
              el.classList.remove("auth-gate__bg-option--active");
            });
          }
        });
        wallGrid.appendChild(btn);
      });
      bgWallpapers.appendChild(wallGrid);
    }

    function buildEnginePicker() {
      if (!engineGrid || !window.KritikalSearchEngines) return;
      engineGrid.innerHTML = "";
      window.KritikalSearchEngines.list().forEach(function (engine) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className =
          "auth-gate__engine-option" + (wizData.searchEngine === engine.id ? " auth-gate__engine-option--active" : "");
        btn.dataset.engine = engine.id;
        btn.textContent = engine.label;
        btn.addEventListener("click", function () {
          wizData.searchEngine = engine.id;
          engineGrid.querySelectorAll(".auth-gate__engine-option").forEach(function (el) {
            el.classList.toggle("auth-gate__engine-option--active", el.dataset.engine === engine.id);
          });
        });
        engineGrid.appendChild(btn);
      });
    }

    function applySignupSettings() {
      var S = window.KritikalSettings;
      if (!S || !S.set) return;
      S.set("background", wizData.background);
      S.set("backgroundUrl", wizData.backgroundUrl || "");
      S.set("searchEngine", wizData.searchEngine);
      if (S.apply) S.apply();
    }

    function setUsernameStatus(text, state) {
      if (!wizUsernameStatus) return;
      wizUsernameStatus.textContent = text || "";
      wizUsernameStatus.className = "auth-gate__field-status" + (state ? " auth-gate__field-status--" + state : "");
    }

    function queueUsernameCheck() {
      clearTimeout(usernameCheckTimer);
      usernameAvailable = null;
      var raw = wizUsername ? String(wizUsername.value || "").trim() : "";
      if (!raw) {
        setUsernameStatus("", "");
        return;
      }
      var normalized = normalizeUsername(raw);
      if (normalized.length < 3) {
        setUsernameStatus("At least 3 characters", "warn");
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(raw)) {
        setUsernameStatus("Letters, numbers, and underscores only", "warn");
        return;
      }
      setUsernameStatus("Checking availability…", "checking");
      var seq = ++usernameCheckSeq;
      usernameCheckTimer = setTimeout(function () {
        checkUsernameAvailable(raw).then(function (result) {
          if (seq !== usernameCheckSeq) return;
          if (normalizeUsername(wizUsername ? wizUsername.value : "") !== result.username) return;
          if (result.error) {
            usernameAvailable = null;
            setUsernameStatus("Could not check username", "error");
            return;
          }
          usernameAvailable = !!result.available;
          if (result.available) {
            setUsernameStatus("Username is available", "ok");
            return;
          }
          setUsernameStatus("Username already taken", "error");
        });
      }, 320);
    }

    function validateStep(step) {
      if (signupError) signupError.textContent = "";
      if (step === 1) {
        var u = wizUsername ? String(wizUsername.value || "").trim() : "";
        if (u.length < 3) {
          if (signupError) signupError.textContent = "Username must be at least 3 characters";
          return Promise.resolve(false);
        }
        if (!/^[a-zA-Z0-9_]+$/.test(u)) {
          if (signupError) signupError.textContent = "Username can only use letters, numbers, and underscores";
          return Promise.resolve(false);
        }
        var normalized = normalizeUsername(u);
        if (usernameAvailable === true && normalizeUsername(wizUsername.value) === normalized) {
          wizData.username = normalized;
          return Promise.resolve(true);
        }
        setUsernameStatus("Checking availability…", "checking");
        return checkUsernameAvailable(u).then(function (result) {
          if (!result.available) {
            usernameAvailable = false;
            if (signupError) {
              signupError.textContent = result.error ? "Could not check username" : "Username already taken";
            }
            setUsernameStatus(result.error ? "Could not check username" : "Username already taken", "error");
            return false;
          }
          usernameAvailable = true;
          wizData.username = result.username || normalized;
          setUsernameStatus("Username is available", "ok");
          return true;
        });
      }
      if (step === 2) {
        var p = wizPassword ? String(wizPassword.value || "") : "";
        if (p.length < 6) {
          if (signupError) signupError.textContent = "Password must be at least 6 characters";
          return Promise.resolve(false);
        }
        wizData.password = p;
        return Promise.resolve(true);
      }
      if (step === 3) {
        var d = wizDisplay ? String(wizDisplay.value || "").trim() : "";
        wizData.displayName = d || wizData.username;
        return Promise.resolve(true);
      }
      return Promise.resolve(true);
    }

    function finishSignup() {
      if (wizNext) {
        wizNext.disabled = true;
        wizNext.textContent = "Creating…";
      }
      register({
        username: wizData.username,
        password: wizData.password,
        displayName: wizData.displayName,
        avatar: pendingAvatar,
      }).then(function () {
        applySignupSettings();
        finishGate();
      }).catch(function (err) {
        var msg = "Could not create account";
        if (err.code === "username_taken") msg = "Username already taken";
        if (err.code === "bad_username") msg = "Username must be at least 3 letters or numbers";
        if (err.code === "bad_password") msg = "Password must be at least 6 characters";
        if (signupError) signupError.textContent = msg;
        if (wizNext) {
          wizNext.disabled = false;
          wizNext.textContent = "Create account";
        }
      });
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

    if (wizUsername) {
      wizUsername.addEventListener("input", queueUsernameCheck);
    }

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
        markGuestVisit();
        finishGate();
      });
    }

    if (wizNo) {
      wizNo.addEventListener("click", function () {
        markGuestVisit();
        finishGate();
      });
    }

    if (wizYes) {
      wizYes.addEventListener("click", function () {
        beginSignup();
      });
    }

    if (wizLoginLink) {
      wizLoginLink.addEventListener("click", function () {
        if (gateTabs) gateTabs.hidden = false;
        showTab("login");
      });
    }

    if (wizBack) {
      wizBack.addEventListener("click", function () {
        if (wizardStep <= 1) {
          wizardStep = 0;
          if (gateTabs) gateTabs.hidden = true;
          if (signupError) signupError.textContent = "";
          renderWizardStep();
          return;
        }
        wizardStep -= 1;
        if (signupError) signupError.textContent = "";
        renderWizardStep();
      });
    }

    if (wizSkip) {
      wizSkip.addEventListener("click", function () {
        if (wizardStep !== 4) return;
        pendingAvatar = "";
        if (avatarInput) avatarInput.value = "";
        setAvatarPreview("", "");
        wizardStep += 1;
        if (signupError) signupError.textContent = "";
        renderWizardStep();
      });
    }

    if (wizNext) {
      wizNext.addEventListener("click", function () {
        if (wizardStep < 1) return;
        if (wizardStep === 4) {
          wizardStep += 1;
          if (signupError) signupError.textContent = "";
          renderWizardStep();
          return;
        }
        if (wizardStep === 5) {
          wizardStep += 1;
          renderWizardStep();
          return;
        }
        if (wizardStep === SIGNUP_STEPS) {
          finishSignup();
          return;
        }
        if (wizardStep <= 3) {
          if (wizNext.disabled) return;
          wizNext.disabled = true;
          validateStep(wizardStep).then(function (ok) {
            wizNext.disabled = false;
            if (!ok) return;
            wizardStep += 1;
            renderWizardStep();
          });
          return;
        }
        wizardStep += 1;
        renderWizardStep();
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
            else if (err.code === "network_error") loginError.textContent = "Could not reach the server. Is Kritikal running?";
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

    buildBgPicker();
    buildEnginePicker();
    renderWizardStep();

    window.ZentraAuth.showGate = function (mode) {
      gate.hidden = false;
      gate.classList.add("auth-gate--visible");
      if (mode === "login" || hasGuestVisit()) {
        if (gateTabs) gateTabs.hidden = false;
        showTab("login");
        return;
      }
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
    hasGuestVisit: hasGuestVisit,
    setGuestMode: setGuest,
    markGuestVisit: markGuestVisit,
    user: function () { return state.user; },
    ready: function () { return state.ready; },
    whenReady: function () { return refreshSession(); },
    siteBooted: false,
    requireChat: function () {
      if (isLoggedIn()) return true;
      if (window.ZentraAuth.showGate) window.ZentraAuth.showGate("login");
      return false;
    },
    openChatWindow: function () {
      if (!isLoggedIn()) {
        var gate = document.getElementById("auth-gate");
        if (gate && window.ZentraAuth.showGate) {
          window.ZentraAuth.showGate("login");
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
