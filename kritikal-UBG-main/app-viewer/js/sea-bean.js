const params = new URLSearchParams(window.location.search);

const viewId = params.get("view");

const viewerFrame = document.getElementById("viewerFrame");
const viewerTitle = document.getElementById("viewerTitle");
const closeViewer = document.getElementById("closeViewer");
const openNewTab = document.getElementById("openNewTab");

const jsonUrl =
  "https://cdn.jsdelivr.net/gh/sea-bean-unblocked/sde@main/zzz.json";

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
        margin:0;
      }
    </style>

    404 Blocked Or Not Found
  `;

  viewerTitle.textContent = "";
}

async function loadGame() {

  if (!viewId) {
    show404();
    return;
  }

  try {

    viewerTitle.textContent = "Loading...";

    const jsonRes = await fetch(jsonUrl, {
      cache: "no-store"
    });

    if (!jsonRes.ok) {
      throw new Error("Failed to fetch JSON");
    }

    const data = await jsonRes.json();

    const entry =
      data.find(e => String(e.id) === String(viewId));

    if (!entry) {
      throw new Error("Game not found");
    }

    viewerTitle.textContent =
      entry.name || viewId;

    let htmlUrl =
      entry.html ||
      entry.url ||
      "";

    if (htmlUrl.includes("{HTML_URL}")) {

      htmlUrl = htmlUrl.replace(
        "{HTML_URL}",
        "https://cdn.jsdelivr.net/gh/sea-bean-unblocked/Singlemile@main/games/"
      );
    }


    htmlUrl = htmlUrl.replace(/([^:]\/)\/+/g, "$1");

    console.log("Loading game URL:", htmlUrl);

    const gameRes = await fetch(htmlUrl, {
      cache: "no-store"
    });

    if (!gameRes.ok) {

      console.error(
        "Game fetch failed:",
        gameRes.status,
        htmlUrl
      );

      throw new Error("Failed to fetch HTML");
    }

    const html = await gameRes.text();

    viewerFrame.srcdoc = html;

    openNewTab.onclick = async (e) => {

      e.preventDefault();

      try {

        const res = await fetch(htmlUrl, {
          cache: "no-store"
        });

        if (!res.ok) {
          throw new Error();
        }

        const html = await res.text();

        const newTab =
          window.open("about:blank", "_blank");

        if (!newTab) {
          alert("Popup blocked");
          return;
        }

        newTab.document.open();
        newTab.document.write(html);
        newTab.document.close();

      } catch (err) {

        console.error(err);

        alert("Failed to open game");

      }
    };

  } catch (err) {

    console.error(err);

    show404();

  }
}

loadGame();

closeViewer.addEventListener("click", () => {
  window.location.href = "htpps://google.com";
});
