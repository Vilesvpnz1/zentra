(function () {
  var chooserCards = document.querySelectorAll(".entertainment-launcher__card[data-ent-tab]");
  var view = document.getElementById("view-entertainment");
  var launcher = document.getElementById("ent-launcher");
  var panelMovies = document.getElementById("ent-panel-movies");
  var panelMusic = document.getElementById("ent-panel-music");
  var backMovies = document.getElementById("ent-back-movies");
  var backMusic = document.getElementById("ent-back-music");
  var activeTab = "";

  function setLauncher(open) {
    if (launcher) launcher.hidden = !open;
    if (view) {
      view.classList.toggle("entertainment-mode-chooser", open);
      view.classList.toggle("entertainment-mode-movies", !open && activeTab === "movies");
      view.classList.toggle("entertainment-mode-music", !open && activeTab === "music");
    }
  }

  function switchTab(name, fromLauncher) {
    if (!name) name = "movies";
    activeTab = name;
    chooserCards.forEach(function (card) {
      card.classList.toggle("entertainment-launcher__card--active", card.getAttribute("data-ent-tab") === name);
    });
    setLauncher(false);
    if (panelMovies) panelMovies.hidden = name !== "movies";
    if (panelMusic) panelMusic.hidden = name !== "music";
    if (name === "movies" && window.KobranMovies) window.KobranMovies.render();
    if (name === "music" && window.KobranMusic) window.KobranMusic.render();
    if (fromLauncher && typeof window.scrollTo === "function") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function showLauncher() {
    activeTab = "";
    if (panelMovies) panelMovies.hidden = true;
    if (panelMusic) panelMusic.hidden = true;
    chooserCards.forEach(function (card) {
      card.classList.remove("entertainment-launcher__card--active");
    });
    setLauncher(true);
  }

  chooserCards.forEach(function (card) {
    card.addEventListener("click", function () {
      switchTab(card.getAttribute("data-ent-tab"), true);
    });
  });
  if (backMovies) backMovies.addEventListener("click", showLauncher);
  if (backMusic) backMusic.addEventListener("click", showLauncher);

  window.KobranEntertainment = {
    switchTab: switchTab,
    tab: function () {
      return activeTab;
    },
    open: function (tab) {
      if (!tab) {
        showLauncher();
        return;
      }
      switchTab(tab, false);
    }
  };
  showLauncher();
})();
