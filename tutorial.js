(function () {
  var STORAGE_KEY = "zentra-orbit-guide-v3";
  var guide = document.getElementById("guide");
  var spot = document.getElementById("guide-spot");
  var card = document.getElementById("guide-card");
  var titleEl = document.getElementById("guide-title");
  var bodyEl = document.getElementById("guide-body");
  var nextBtn = document.getElementById("guide-next");
  var skipBtn = document.getElementById("guide-skip");
  var stepCountEl = document.getElementById("guide-step-count");
  var dotsEl = document.getElementById("guide-dots");
  var active = false;
  var index = 0;
  var steps = [
    {
      title: "Welcome to Zentra",
      body: "Basically Kritikal (now rebranded as Zentra) is a fast, sleek website for unblocked games, tools, and community features to use at school. This quick tour shows you everything. Click next.",
      center: true,
    },
    {
      title: "Discord button",
      body: "Look up top next to the Zentra name. That Discord button opens our server invite link. Join if you want updates, announcements, and new drops without refreshing the site all day.",
      target: ".site__header-discord",
      pad: 8,
      altTarget: ".site__brand-row",
    },
    {
      title: "Search the library",
      body: "Here, use the search bar to filter and look for thousands of games instantly. Type a title, keyword, or slug and the grid shows u what ur looking for.",
      target: "#game-search",
      pad: 10,
    },
    {
      title: "Choose a game",
      body: "Every game launches in the built-in browser player. Click any game to start!",
      target: "#games-grid",
      pad: 14,
      fallback: ".site__hero",
    },
    {
      title: "Navigate through tabs here",
      body: "Move your cursor to the bottom center to open the nav dock. Games, Hub, Entertainment, News, Tutorial, Updates, Chat, More, and Settings live there.",
      target: ".site__nav-track",
      pad: 10,
    },
    {
      title: "Tutorial tab",
      body: "The Tutorial tab sits between News and Updates. Open it anytime to replay this orbit tour.",
      target: "#nav-tutorial",
      pad: 10,
    },
    {
      title: "Open the Hub",
      body: "Basically collects proxies, apps, tools, and extras from us. Lowk your launchpad for more than just games.",
      target: "#nav-hub",
      pad: 10,
    },
    {
      title: "Ready?",
      body: "That is the full orbit. Search a game, explore the Hub, or hang in chat. Ur ready to go!",
      center: true,
      finish: true,
    },
  ];

  function hasCompleted() {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function markCompleted() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch (e) {}
  }

  function resolveTarget(step) {
    if (!step.target) return null;
    var el = document.querySelector(step.target);
    if (el && el.offsetParent !== null && el.getClientRects().length) return el;
    if (step.altTarget) {
      var altEl = document.querySelector(step.altTarget);
      if (altEl) return altEl;
    }
    if (step.fallback) {
      var fb = document.querySelector(step.fallback);
      if (fb) return fb;
    }
    if (step.target === "#games-grid") {
      var cardNode = document.querySelector(".site__card");
      if (cardNode) return cardNode;
    }
    return el;
  }

  function buildDots() {
    if (!dotsEl) return;
    dotsEl.innerHTML = "";
    steps.forEach(function (_, i) {
      var dot = document.createElement("span");
      dot.className = "guide__dot";
      if (i === index) dot.classList.add("guide__dot--active");
      if (i < index) dot.classList.add("guide__dot--done");
      dotsEl.appendChild(dot);
    });
  }

  function placeCard(rect, center) {
    if (!card) return;
    card.classList.remove("guide__card--center");
    card.style.top = "";
    card.style.left = "";
    card.style.right = "";
    card.style.bottom = "";
    card.style.transform = "";
    if (center || !rect) {
      card.classList.add("guide__card--center");
      return;
    }
    var margin = 18;
    var cardRect = card.getBoundingClientRect();
    var cardH = cardRect.height || 240;
    var cardW = cardRect.width || 360;
    var top = rect.bottom + margin;
    if (top + cardH > window.innerHeight - margin) {
      top = rect.top - cardH - margin;
    }
    if (top < margin) top = margin;
    var left = rect.left + rect.width * 0.5 - cardW * 0.5;
    left = Math.max(margin, Math.min(left, window.innerWidth - cardW - margin));
    card.style.top = top + "px";
    card.style.left = left + "px";
  }

  function isNavGuideStep(step) {
    if (!step || !step.target) return false;
    var t = step.target;
    return t === ".site__nav-track" || t === "#nav-dock" || t.indexOf("#nav-") === 0;
  }

  function applySpotBox(box, pad) {
    if (!spot || !box) return;
    spot.hidden = false;
    spot.style.top = box.top + "px";
    spot.style.left = box.left + "px";
    spot.style.width = box.width + "px";
    spot.style.height = box.height + "px";
    placeCard(
      {
        top: box.top + pad,
        left: box.left + pad,
        width: Math.max(0, box.width - pad * 2),
        bottom: box.bottom != null ? box.bottom : box.top + box.height - pad,
      },
      false
    );
  }

  function positionNavGuideSpot(step, tries) {
    tries = tries || 0;
    if (window.ZentraNavDock && window.ZentraNavDock.snapOpen) {
      window.ZentraNavDock.snapOpen();
    } else if (window.ZentraNavDock) {
      window.ZentraNavDock.open(true);
    }
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var pad = step.pad || 10;
        var box = null;
        if (step.target === ".site__nav-track" && window.ZentraNavDock && window.ZentraNavDock.measureTabsRect) {
          box = window.ZentraNavDock.measureTabsRect(pad);
        } else {
          var el = resolveTarget(step);
          if (el) {
            var rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              box = {
                top: rect.top - pad,
                left: rect.left - pad,
                width: rect.width + pad * 2,
                height: rect.height + pad * 2,
                bottom: rect.bottom + pad,
              };
            }
          }
        }
        if ((!box || box.width < 24 || box.height < 16) && tries < 14) {
          setTimeout(function () {
            positionNavGuideSpot(step, tries + 1);
          }, 45);
          return;
        }
        if (!box) {
          spot.hidden = true;
          placeCard(null, true);
          return;
        }
        applySpotBox(box, pad);
      });
    });
  }

  function positionSpot() {
    var step = steps[index];
    if (!spot) return;
    if (step.center || !step.target) {
      spot.hidden = true;
      placeCard(null, true);
      return;
    }
    if (isNavGuideStep(step)) {
      positionNavGuideSpot(step, 0);
      return;
    }
    var el = resolveTarget(step);
    if (!el) {
      spot.hidden = true;
      placeCard(null, true);
      return;
    }
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    requestAnimationFrame(function () {
      var rect = el.getBoundingClientRect();
      var pad = step.pad || 10;
      applySpotBox(
        {
          top: rect.top - pad,
          left: rect.left - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
          bottom: rect.bottom + pad,
        },
        pad
      );
    });
  }

  function renderStep() {
    var step = steps[index];
    if (!step) return;
    if (guide) guide.classList.toggle("guide--focus", !step.center && !!step.target);
    if (titleEl) titleEl.textContent = step.title;
    if (bodyEl) bodyEl.textContent = step.body;
    if (stepCountEl) stepCountEl.textContent = index + 1 + " / " + steps.length;
    if (nextBtn) nextBtn.textContent = step.finish ? "Launch Zentra" : "Next";
    buildDots();
    positionSpot();
    if (nextBtn) nextBtn.focus();
  }

  function closeGuide() {
    active = false;
    markCompleted();
    document.documentElement.classList.remove("guide-open");
    if (guide) {
      guide.hidden = true;
      guide.classList.remove("guide--active");
    }
    if (spot) spot.hidden = true;
    if (window.ZentraNavDock) window.ZentraNavDock.close();
    window.removeEventListener("resize", onLayout);
    window.removeEventListener("scroll", onLayout, true);
  }

  function nextStep() {
    if (!active) return;
    if (index >= steps.length - 1) {
      closeGuide();
      return;
    }
    index += 1;
    renderStep();
  }

  function onLayout() {
    if (!active) return;
    positionSpot();
  }

  function openGuide() {
    if (!guide || active) return;
    if (document.documentElement.classList.contains("cloak-full")) return;
    if (hasCompleted()) return;
    active = true;
    index = 0;
    guide.hidden = false;
    document.documentElement.classList.add("guide-open");
    requestAnimationFrame(function () {
      guide.classList.add("guide--active");
      renderStep();
    });
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);
  }

  function scheduleGuide() {
    if (document.documentElement.classList.contains("cloak-full")) return;
    if (hasCompleted()) return;
    setTimeout(openGuide, 350);
  }

  if (nextBtn) nextBtn.addEventListener("click", nextStep);
  if (skipBtn) skipBtn.addEventListener("click", closeGuide);

  document.addEventListener("keydown", function (e) {
    if (!active) return;
    if (e.key === "Enter" && document.activeElement !== nextBtn && document.activeElement !== skipBtn) {
      e.preventDefault();
      nextStep();
    }
  });

  window.addEventListener("zentra-boot-complete", scheduleGuide);

  window.ZentraGuide = {
    start: function (force) {
      if (force) {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (e) {}
      }
      if (hasCompleted() && !force) return;
      active = true;
      index = 0;
      if (guide) {
        guide.hidden = false;
        document.documentElement.classList.add("guide-open");
        requestAnimationFrame(function () {
          guide.classList.add("guide--active");
          renderStep();
        });
        window.addEventListener("resize", onLayout);
        window.addEventListener("scroll", onLayout, true);
      }
    },
    reset: function () {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {}
    },
  };
})();
