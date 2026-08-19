(function () {
  var tabs = document.querySelectorAll(".entertainment-tabs__btn[data-ent-tab]");
  var chooserCards = document.querySelectorAll(".entertainment-chooser__card[data-ent-tab]");
  var view = document.getElementById("view-entertainment");
  var panelMovies = document.getElementById("ent-panel-movies");
  var panelMusic = document.getElementById("ent-panel-music");
  var activeTab = "movies";

  function switchTab(name) {
    if (!name || name === "sports") name = "movies";
    activeTab = name;
    tabs.forEach(function (tab) {
      tab.classList.toggle("entertainment-tabs__btn--active", tab.getAttribute("data-ent-tab") === name);
    });
    chooserCards.forEach(function (card) {
      card.classList.toggle("entertainment-chooser__card--active", card.getAttribute("data-ent-tab") === name);
    });
    if (view) {
      view.classList.toggle("entertainment-mode-movies", name === "movies");
      view.classList.toggle("entertainment-mode-music", name === "music");
    }
    if (panelMovies) panelMovies.hidden = name !== "movies";
    if (panelMusic) panelMusic.hidden = name !== "music";
    if (name === "movies" && window.KobranMovies) window.KobranMovies.render();
    if (name === "music" && window.KobranMusic) window.KobranMusic.render();
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      switchTab(tab.getAttribute("data-ent-tab"));
    });
  });
  chooserCards.forEach(function (card) {
    card.addEventListener("click", function () {
      switchTab(card.getAttribute("data-ent-tab"));
    });
  });

  window.KobranEntertainment = {
    switchTab: switchTab,
    tab: function () {
      return activeTab;
    },
    open: function (tab) {
      switchTab(tab || "movies");
    }
  };
  switchTab(activeTab);
})();
