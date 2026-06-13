const params = new URLSearchParams(window.location.search);
const id = params.get("view");

const JSON_URL = "https://cdn.jsdelivr.net/gh/tharun9772/game-assets@main/ccported-stupid-game-lib.json";

const viewerFrame = document.getElementById("viewerFrame");
const viewerTitle = document.getElementById("viewerTitle");
const openNewTab = document.getElementById("openNewTab");

function show404(){
  viewerFrame.srcdoc = `
    <style>
      body{
        background:black;
        color:white;
        display:flex;
        justify-content:center;
        align-items:center;
        height:100vh;
        font-family:sans-serif;
      }
    </style>
    404 Not Found
  `;
  viewerTitle.textContent = "";
}

if(!id){
  show404();
} else {

  fetch(JSON_URL)
    .then(r => r.json())
    .then(data => {

      const game = data.find(g => String(g.Id) === id);
      if(!game || !game.base) throw new Error();

      const fullUrl = game.base + "/index.html";

      viewerTitle.textContent = game.name && game.name.trim()
        ? game.name
        : "Game " + game.Id;

      fetch(fullUrl)
        .then(r => {
          if(!r.ok) throw new Error();
          return r.text();
        })
        .then(html => {
          viewerFrame.srcdoc = html;
        })
        .catch(show404);

      openNewTab.onclick = async () => {
        try{
          const html = await fetch(fullUrl).then(r => r.text());
          const tab = window.open("about:blank", "_blank");

          if(!tab){
            alert("Popup blocked");
            return;
          }

          tab.document.open();
          tab.document.write(html);
          tab.document.close();

        }catch{
          alert("Failed to open game");
        }
      };

    })
    .catch(show404);
}

document.getElementById("closeViewer").onclick = ()=>{
  window.top.location.href = "https://google.com/";
};
