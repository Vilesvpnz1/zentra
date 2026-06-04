const params = new URLSearchParams(window.location.search);
const rawUrl = params.get("url");
const gameUrl = rawUrl ? rawUrl.trim() : null;

const viewerFrame = document.getElementById("viewerFrame");
const viewerTitle = document.getElementById("viewerTitle");
const closeViewer = document.getElementById("closeViewer");
const openNewTab = document.getElementById("openNewTab");

const ELITE_GAMEZ_BASE = "https://cdn.jsdelivr.net/gh/elite-gamez/elite-gamez.github.io@main/";

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
  viewerTitle.textContent = "";
}

if (!gameUrl) {
  show404();
} else {
  const fullUrl = ELITE_GAMEZ_BASE + gameUrl;

  viewerTitle.textContent = "Loading...";

  fetch("https://cdn.jsdelivr.net/gh/elite-gamez/elite-gamez.github.io@main/games.json")
    .then(res => res.json())
    .then(data => {
      const entry = data.find(e => e.url === gameUrl);

      if (entry) {
        viewerTitle.textContent = entry.title || "Game";
      }

      return fetch(fullUrl);
    })
    .then(res => {
      if (!res.ok) throw new Error();
      return res.text();
    })
    .then(html => {
      viewerFrame.srcdoc = html;

    
      openNewTab.addEventListener("click", async (e) => {
        e.preventDefault();

        try {
          const res = await fetch(fullUrl);
          if (!res.ok) throw new Error();

          const newHtml = await res.text();

          const newTab = window.open("about:blank", "_blank");
          if (!newTab) {
            alert("Popup blocked! Enable popups.");
            return;
          }

          newTab.document.open();
          newTab.document.write(newHtml);
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
