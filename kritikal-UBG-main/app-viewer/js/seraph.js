const params = new URLSearchParams(window.location.search);
    const view = params.get("view");

    const BASE = "https://cdn.jsdelivr.net/gh/a456pur/seraph@main/games/";
    const JSON_URL = "https://cdn.jsdelivr.net/gh/DominumNetwork/dominum@main/src/assets/libraries/seraph/games.json";

    const viewerFrame = document.getElementById("viewerFrame");
    const viewerTitle = document.getElementById("viewerTitle");
    const closeViewer = document.getElementById("closeViewer");
    const openNewTab = document.getElementById("openNewTab");

    function show404() {
      viewerFrame.srcdoc = `
        <style>
          body{
            background:black;
            color:white;
            font-family:sans-serif;
            display:flex;
            justify-content:center;
            align-items:center;
            height:100vh;
            font-size:24px;
          }
        </style>
        404 Blocked Or Not Found
      `;
      viewerTitle.textContent = " ";
    }

    if (!view) {
      show404();
    } else {
      const fullUrl = BASE + view;

      fetch(JSON_URL)
        .then(res => res.json())
        .then(data => {
          const entry = data.find(game => game.url === fullUrl);

          if (!entry) throw new Error("Not in JSON");

          viewerTitle.textContent = entry.name || "Game";

          const baseHref = fullUrl.substring(0, fullUrl.lastIndexOf("/")) + "/";

          fetch(fullUrl)
            .then(res => {
              if (!res.ok) throw new Error();
              return res.text();
            })
            .then(html => {
              const headIndex = html.indexOf("<head>");
              let modifiedHtml = html;
              if (headIndex !== -1) {
                modifiedHtml = html.slice(0, headIndex + 6) + `<base href="${baseHref}">` + html.slice(headIndex + 6);
              } else {
                modifiedHtml = `<base href="${baseHref}">` + html;
              }
              viewerFrame.srcdoc = modifiedHtml;
            })
            .catch(() => show404());

          openNewTab.addEventListener("click", async (e) => {
            e.preventDefault();
            try {
              const res = await fetch(fullUrl);
              if (!res.ok) throw new Error();

              const html = await res.text();
              
              const headIndex = html.indexOf("<head>");
              let modifiedHtml = html;
              if (headIndex !== -1) {
                modifiedHtml = html.slice(0, headIndex + 6) + `<base href="${baseHref}">` + html.slice(headIndex + 6);
              } else {
                modifiedHtml = `<base href="${baseHref}">` + html;
              }

              const newTab = window.open("about:blank", "_blank");

              if (!newTab) {
                alert("Popup blocked! Enable popups.");
                return;
              }

              newTab.document.open();
              newTab.document.write(modifiedHtml);
              newTab.document.close();
            } catch {
              alert("Failed to open game");
            }
          });

        })
        .catch(() => show404());
    }

    closeViewer.addEventListener("click", () => {
      window.top.location.href = "https://google.com/";
    });
