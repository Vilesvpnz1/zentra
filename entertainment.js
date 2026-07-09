(function () {
  var tabs = document.querySelectorAll(".entertainment-tabs__btn[data-ent-tab]");
  var panelMovies = document.getElementById("ent-panel-movies");
  var panelMusic = document.getElementById("ent-panel-music");
  var panelSports = document.getElementById("ent-panel-sports");
  var activeTab = "movies";

  function switchTab(name) {
    if (!name) name = "movies";
    activeTab = name;
    tabs.forEach(function (tab) {
      tab.classList.toggle("entertainment-tabs__btn--active", tab.getAttribute("data-ent-tab") === name);
    });
    if (panelMovies) panelMovies.hidden = name !== "movies";
    if (panelMusic) panelMusic.hidden = name !== "music";
    if (panelSports) panelSports.hidden = name !== "sports";
    if (name === "movies" && window.KritikalMovies) window.KritikalMovies.render();
    if (name === "music" && window.KritikalMusic) window.KritikalMusic.render();
    if (name === "sports" && window.KritikalSports) window.KritikalSports.render();
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      switchTab(tab.getAttribute("data-ent-tab"));
    });
  });

  window.KritikalEntertainment = {
    switchTab: switchTab,
    tab: function () {
      return activeTab;
    },
    open: function (tab) {
      switchTab(tab || "movies");
    }
  };
})();
