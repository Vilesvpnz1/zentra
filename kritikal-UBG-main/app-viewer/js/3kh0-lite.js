    const params = new URLSearchParams(window.location.search);
    const gameLink = params.get("view");
    const viewerFrame = document.getElementById("viewerFrame");
    const viewerTitle = document.getElementById("viewerTitle");
    const closeViewer = document.getElementById("closeViewer");
    const openNewTab = document.getElementById("openNewTab");

    let finalUrl = "";
    let cleanName = "3kh0 Lite Game";

    if (gameLink) {
      finalUrl = "https://raw.githack.com/3kh0/3kh0-lite/main/" + gameLink;
      viewerFrame.src = finalUrl;
      
      const parts = gameLink.split("/");
      if (parts.length > 1) {
        cleanName = parts[1];
      }
      viewerTitle.textContent = cleanName;

      viewerFrame.addEventListener("load", () => {
        try {
          const iframeDoc = viewerFrame.contentDocument || viewerFrame.contentWindow.document;
          const iframeTitle = iframeDoc.querySelector("title")?.innerText || cleanName;
          viewerTitle.textContent = iframeTitle;
        } catch {
          viewerTitle.textContent = cleanName;
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
              <title>${cleanName}</title>
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
