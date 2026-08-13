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

  var viewMore = document.getElementById("view-more");

  function showGate() {
    if (gate) gate.hidden = false;
    if (layout) layout.hidden = true;
    if (viewMore) viewMore.classList.add("view-more--gate");
  }

  function enterMore() {
    if (gate) gate.hidden = true;
    if (layout) layout.hidden = false;
    if (viewMore) viewMore.classList.remove("view-more--gate");
    showPanel("home");
    requestAnimationFrame(function () {
      var active = track && track.querySelector(".more-dock__link--active");
      if (active) moveGlider(active);
    });
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
    if (activePanel === "api" && window.KobranApi) window.KobranApi.render();
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

  window.addEventListener("resize", function () {
    var active = track && track.querySelector(".more-dock__link--active");
    if (active) moveGlider(active);
  });

  window.KobranMore = { open: open, showPanel: showPanel, enter: enterMore };

  if (layout && layout.hidden) enterMore();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGlider);
  } else {
    initGlider();
  }
})();
