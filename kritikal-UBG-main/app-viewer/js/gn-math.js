    const params = new URLSearchParams(window.location.search);
    const rawId = params.get("gn-id") || params.get("id");
    const id = rawId ? rawId.replace(/^"+|"+$/g, "").trim() : null;

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

    if (!id) {
      show404();
    } else {
      viewerTitle.textContent = "Loading...";

      const jsonUrl = "https://cdn.jsdelivr.net/gh/freebuisness/assets/zones.json";

      fetch(jsonUrl)
        .then(res => res.json())
        .then(data => {
          const entry = data.find(e => String(e.id) === id);
          if (!entry || !entry.url) throw new Error("File not found in JSON");

          const htmlUrl = entry.url.replace("{HTML_URL}", "https://cdn.jsdelivr.net/gh/freebuisness/html@master");

          viewerTitle.textContent = entry.name || id;

          fetch(htmlUrl)
            .then(res => {
              if (!res.ok) throw new Error();
              return res.text();
            })
            .then(html => {
              viewerFrame.srcdoc = html;
            })
            .catch(() => show404());

          openNewTab.addEventListener("click", async (e) => {
            e.preventDefault();
            try {
              const res = await fetch(htmlUrl);
              if (!res.ok) throw new Error();
              const html = await res.text();
              const newTab = window.open("about:blank", "_blank");
              if (!newTab) {
                alert("Popup blocked! Enable popups to open game.");
                return;
              }
              newTab.document.open();
              newTab.document.write(html);
              newTab.document.close();
            } catch {
              alert("Failed to open in new tab");
            }
          });

        })
        .catch(() => show404());
    }

    closeViewer.addEventListener("click", () => {
      window.top.location.href = "https://google.com/";
    });
