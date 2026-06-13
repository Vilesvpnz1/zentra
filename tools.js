(function () {
  function renderTools() {
    var root = document.getElementById("tools-grid");
    if (!root) return;
    root.innerHTML = '<p class="site__empty">Coming soon!</p>';
  }

  window.KritikalTools = { render: renderTools };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderTools);
  } else {
    renderTools();
  }
})();
