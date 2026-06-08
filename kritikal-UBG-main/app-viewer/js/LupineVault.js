    const params = new URLSearchParams(window.location.search);
    const gameName = params.get("view");
    const viewerFrame = document.getElementById("viewerFrame");
    const viewerTitle = document.getElementById("viewerTitle");
    const closeViewer = document.getElementById("closeViewer");
    const openNewTab = document.getElementById("openNewTab");

    if (gameName) {
      const encodedName = encodeURIComponent(gameName);
      const apiUrl = `https://cdn.jsdelivr.net/gh/tharun9772/LupineVault@main/games/files/${encodedName}/index.html`;
      let processedHtml = "";

      viewerTitle.textContent = gameName;

      (async () => {
        try {
          const r = await fetch(apiUrl);
          if (!r.ok) throw new Error(r.status);
          let htmlText = await r.text();
          
          const baseTag = `<base href="https://cdn.jsdelivr.net/gh/tharun9772/LupineVault@main/games/files/${encodedName}/">`;
          
          if (htmlText.includes("<head>")) {
            htmlText = htmlText.replace("<head>", `<head>\n  ${baseTag}`);
          } else {
            htmlText = baseTag + htmlText;
          }

          processedHtml = htmlText;
          viewerFrame.srcdoc = htmlText;
        } catch (e) {
          console.error(e);
          viewerTitle.textContent = "Error loading game";
        }
      })();

      viewerFrame.addEventListener("load", () => {
        try {
          const iframeDoc = viewerFrame.contentDocument || viewerFrame.contentWindow.document;
          const iframeTitle = iframeDoc.querySelector("title")?.innerText;
          if (iframeTitle) viewerTitle.textContent = iframeTitle;
        } catch (e) {}
      });

      openNewTab.addEventListener("click", (e) => {
        e.preventDefault();
        if (processedHtml) {
          const blob = new Blob([processedHtml], { type: "text/html" });
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, "_blank");
        }
      });
    } else {
      viewerTitle.textContent = " ";
    }

    closeViewer.addEventListener("click", () => {
      window.top.location.href = "https://google.com/";
    });
