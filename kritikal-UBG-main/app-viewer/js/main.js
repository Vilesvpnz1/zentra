    const params = new URLSearchParams(window.location.search);
    const gameUrl = params.get("view");
    const viewerFrame = document.getElementById("viewerFrame");
    const viewerTitle = document.getElementById("viewerTitle");
    const closeViewer = document.getElementById("closeViewer");
    const openNewTab = document.getElementById("openNewTab");

    if (gameUrl && gameUrl.startsWith("/")) {
      viewerFrame.src = gameUrl;

      if (gameUrl === "/404") {
        viewerTitle.textContent = "404";
      } else {
        viewerFrame.addEventListener("load", () => {
          try {
            const iframeDoc = viewerFrame.contentDocument || viewerFrame.contentWindow.document;
            const iframeTitle = iframeDoc.querySelector("title")?.innerText || "Untitled App";
            viewerTitle.textContent = iframeTitle;
          } catch {
            viewerTitle.textContent = gameUrl;
          }
        });
      }
    } else {
      viewerTitle.textContent = " ";
    }

    closeViewer.addEventListener("click", () => {
      window.top.location.href = "https://google.com/";
    });

    openNewTab.addEventListener("click", (e) => {
      e.preventDefault();
      if (gameUrl && gameUrl.startsWith("/")) {
        window.open(gameUrl, "_blank", "noopener,noreferrer");
      }
    });
