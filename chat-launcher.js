(function () {
  var openBtn = document.getElementById("chat-open-window");

  function openChat() {
    if (!window.ZentraAuth || !window.ZentraAuth.isLoggedIn()) {
      if (window.ZentraAuth && window.ZentraAuth.showGate) window.ZentraAuth.showGate();
      return;
    }
    var chatUrl = location.origin + "/chat.html";
    var win = window.open(chatUrl, "_blank", "noopener,noreferrer");
    if (!win) window.location.href = chatUrl;
  }

  if (openBtn) {
    openBtn.addEventListener("click", openChat);
  }
})();
