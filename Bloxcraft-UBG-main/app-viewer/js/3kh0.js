    const params = new URLSearchParams(window.location.search);
    const gameName = params.get("view");
    const viewerFrame = document.getElementById("viewerFrame");
    const viewerTitle = document.getElementById("viewerTitle");
    const closeViewer = document.getElementById("closeViewer");
    const openNewTab = document.getElementById("openNewTab");

    let finalUrl = "";

    if (gameName) {
      finalUrl = "https://raw.githack.com/tharun9772/3kh0-assets/main/" + gameName + "/index.html";
      viewerFrame.src = finalUrl;
      viewerTitle.textContent = gameName;

      viewerFrame.addEventListener("load", () => {
        try {
          const iframeDoc = viewerFrame.contentDocument || viewerFrame.contentWindow.document;
          const iframeTitle = iframeDoc.querySelector("title")?.innerText || gameName;
          viewerTitle.textContent = iframeTitle;
        } catch {
          viewerTitle.textContent = gameName;
        }
      });
    } else {
      viewerTitle.textContent = " ";
    }

    closeViewer.addEventListener("click", () => {
      window.top.location.href = "https://google.com/";
    });

    openNewTab.addEventListener("click", (e) => {
      e.preventDefault();
      if (finalUrl) {
        const newTab = window.open("about:blank", "_blank");
        if (newTab) {
          const doc = newTab.document;
          doc.open();
          doc.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>${gameName || "Game"}</title>
              <style>
                html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
                iframe { width: 100%; height: 100%; border: none; }
              </style>
            </head>
            <body>
              <iframe src="${finalUrl}"></iframe>
            </body>
            </html>
          `);
          doc.close();
        }
      }
    });
