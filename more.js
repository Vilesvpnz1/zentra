(function () {
  var dock = document.getElementById("more-dock");
  var track = document.getElementById("more-nav-track");
  var links = track ? track.querySelectorAll(".more-dock__link[data-more]") : [];
  var panels = document.querySelectorAll(".more-panel__view");
  var gate = document.getElementById("more-gate");
  var layout = document.getElementById("more-layout");
  var gateEnter = document.getElementById("more-gate-enter");
  var glider = null;
  var activePanel = "home";
  var dockAmount = 0;
  var dockTarget = 0;
  var dockAnimRaf = 0;
  var dockHover = false;
  var mx = 0;
  var my = 0;

  function initGlider() {
    if (!track || glider) return;
    glider = document.createElement("span");
    glider.className = "more-dock__glider";
    glider.setAttribute("aria-hidden", "true");
    track.appendChild(glider);
    var active = track.querySelector(".more-dock__link--active");
    if (active) moveGlider(active);
  }

  function moveGlider(btn) {
    if (!glider || !btn || !track) return;
    var trackRect = track.getBoundingClientRect();
    var rect = btn.getBoundingClientRect();
    glider.style.width = rect.width + "px";
    glider.style.height = rect.height + "px";
    glider.style.transform = "translate(" + (rect.left - trackRect.left) + "px," + (rect.top - trackRect.top) + "px)";
    glider.style.opacity = "1";
  }

  function applyDockVisuals() {
    if (!dock) return;
    dock.style.setProperty("--more-dock-open", dockAmount.toFixed(4));
    dock.classList.toggle("more-dock--open", dockAmount > 0.55);
    if (dockAmount > 0.72 && glider) {
      requestAnimationFrame(function () {
        var active = track && track.querySelector(".more-dock__link--active");
        if (active) moveGlider(active);
      });
    }
  }

  function computeDockTarget(clientX, clientY) {
    if (dockHover) return 1;
    if (!dock) return 0;
    var shell = dock.querySelector(".more-dock__shell");
    if (shell) {
      var rect = shell.getBoundingClientRect();
      if (
        clientX >= rect.left - 28 &&
        clientX <= rect.right + 36 &&
        clientY >= rect.top - 36 &&
        clientY <= rect.bottom + 36
      ) {
        return 1;
      }
    }
    var fromLeft = clientX;
    if (fromLeft <= 72) return 1;
    if (fromLeft >= 180) return 0;
    return 1 - (fromLeft - 72) / 108;
  }

  function tickDockAnim() {
    dockAnimRaf = 0;
    if (!dockHover) dockTarget = computeDockTarget(mx, my);
    var delta = dockTarget - dockAmount;
    if (Math.abs(delta) > 0.002) {
      dockAmount += delta * (delta > 0 ? 0.11 : 0.08);
      if (dockAmount < 0) dockAmount = 0;
      if (dockAmount > 1) dockAmount = 1;
      applyDockVisuals();
      dockAnimRaf = requestAnimationFrame(tickDockAnim);
      return;
    }
    dockAmount = dockTarget;
    applyDockVisuals();
  }

  function startDockAnim() {
    if (!dockAnimRaf) dockAnimRaf = requestAnimationFrame(tickDockAnim);
  }

  var viewMore = document.getElementById("view-more");

  function showGate() {
    if (gate) gate.hidden = false;
    if (layout) layout.hidden = true;
    if (viewMore) viewMore.classList.add("view-more--gate");
    dockTarget = 0;
    dockAmount = 0;
    applyDockVisuals();
  }

  function enterMore() {
    if (gate) gate.hidden = true;
    if (layout) layout.hidden = false;
    if (viewMore) viewMore.classList.remove("view-more--gate");
    showPanel("home");
    dockTarget = 1;
    startDockAnim();
  }

  function showPanel(name) {
    activePanel = name || "home";
    links.forEach(function (link) {
      var on = link.getAttribute("data-more") === activePanel;
      link.classList.toggle("more-dock__link--active", on);
      if (on) moveGlider(link);
    });
    panels.forEach(function (panel) {
      var id = panel.id.replace("more-panel-", "");
      panel.hidden = id !== activePanel;
    });
    if (activePanel === "api" && window.KritikalApi) window.KritikalApi.render();
  }

  function open(panel) {
    initGlider();
    enterMore();
    if (panel && panel !== "home") showPanel(panel);
  }

  links.forEach(function (link) {
    link.addEventListener("click", function () {
      showPanel(link.getAttribute("data-more"));
    });
  });

  if (gateEnter) gateEnter.addEventListener("click", enterMore);

  if (dock) {
    dock.addEventListener("mouseenter", function () {
      dockHover = true;
      dockTarget = 1;
      startDockAnim();
    });
    dock.addEventListener("mouseleave", function () {
      dockHover = false;
      dockTarget = computeDockTarget(mx, my);
      startDockAnim();
    });
  }

  document.addEventListener("mousemove", function (e) {
    mx = e.clientX;
    my = e.clientY;
    if (!viewMore || viewMore.hidden) return;
    if (gate && !gate.hidden) return;
    dockTarget = computeDockTarget(mx, my);
    startDockAnim();
  });

  window.addEventListener("resize", function () {
    var active = track && track.querySelector(".more-dock__link--active");
    if (active) moveGlider(active);
  });

  window.KritikalMore = { open: open, showPanel: showPanel, enter: enterMore };

  if (layout && layout.hidden) enterMore();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGlider);
  } else {
    initGlider();
  }
})();
