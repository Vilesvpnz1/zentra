(function () {
  var params = new URLSearchParams(location.search);
  var gameId = String(params.get("id") || "").trim();
  var gameTitle = String(params.get("title") || "").trim();
  var frame = document.getElementById("lesson-play-frame");
  var loading = document.getElementById("lesson-play-loading");
  var titleEl = document.getElementById("lesson-play-game-title");
  var dateEl = document.getElementById("lesson-play-date");

  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  if (titleEl) {
    titleEl.textContent = gameTitle || "Interactive activity";
  }

  function hideLoading() {
    if (loading) loading.hidden = true;
  }

  function showError(msg) {
    hideLoading();
    if (loading) {
      loading.hidden = false;
      loading.textContent = msg;
      loading.classList.add("lesson-play__loading--err");
    }
  }

  function mount(url) {
    if (!frame || !url) {
      showError("Could not start activity.");
      return;
    }
    frame.addEventListener(
      "load",
      function () {
        hideLoading();
      },
      { once: true }
    );
    frame.src = url;
  }

  if (!gameId) {
    showError("No activity selected.");
    return;
  }

  var q = "id=" + encodeURIComponent(gameId);
  if (gameTitle) q += "&title=" + encodeURIComponent(gameTitle);
  var fallbackPath = String(params.get("path") || "").trim();
  if (fallbackPath) q += "&path=" + encodeURIComponent(fallbackPath);

  mount("/play.html?" + q + "&_=" + Date.now());
})();
