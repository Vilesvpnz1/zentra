const params = new URLSearchParams(window.location.search);

const view = params.get("view");

const JSON_URL = "https://cdn.jsdelivr.net/gh/dskjfoisjfsjio/alexrsworld@latest/singlefilegames.json";

const viewerFrame = document.getElementById("viewerFrame");
const viewerTitle = document.getElementById("viewerTitle");
const openNewTab = document.getElementById("openNewTab");

function show404(){
  viewerFrame.srcdoc = `
    <div style="
      background:black;
      color:white;
      width:100%;
      height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      font-family:sans-serif;
      font-size:40px;
    ">
      404
    </div>
  `;
}

async function loadGame(){

  if(!view){
    show404();
    return;
  }

  try{

    const games = await fetch(JSON_URL).then(r => r.json());

    const game = games.find(g =>
      g.title.toLowerCase() === decodeURIComponent(view).toLowerCase()
    );

    if(!game){
      throw new Error("Game not found");
    }

    viewerTitle.textContent = game.title;

    const html = await fetch(game.path).then(r => r.text());

    const blob = new Blob([html], {
      type: "text/html"
    });

    const blobUrl = URL.createObjectURL(blob);

    viewerFrame.src = blobUrl;

    openNewTab.onclick = async () => {
      const tab = window.open("about:blank");

      tab.document.open();
      tab.document.write(html);
      tab.document.close();
    };

  } catch(err){
    console.error(err);
    show404();
  }
}

loadGame();

document.getElementById("closeViewer").onclick = () => {
  window.top.location.href = "https://google.com/";
};
