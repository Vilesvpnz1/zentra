const params = new URLSearchParams(window.location.search);
const view = params.get("view");

const BASE = "https://cdn.jsdelivr.net/gh/carbonicality/ChickenKingsVault@main/gamefiles/";
const JSON_URL = "https://cdn.jsdelivr.net/gh/carbonicality/ChickenKingsVault@main/games.json";

const viewerFrame = document.getElementById("viewerFrame");
const viewerTitle = document.getElementById("viewerTitle");
const openNewTab = document.getElementById("openNewTab");

function show404(){
  viewerFrame.srcdoc = "<h1 style='color:white;background:black;height:100vh;display:flex;align-items:center;justify-content:center;'>404</h1>";
}

if(!view){
  show404();
} else {

  fetch(JSON_URL)
    .then(r=>r.json())
    .then(data=>{
      const game = data.find(g => g.html === view);
      if(!game) throw new Error();

      const fullUrl = BASE + game.html;
      viewerTitle.textContent = game.name;

      fetch(fullUrl)
        .then(r=>r.text())
        .then(async (html)=>{
         
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");
          const gameFrame = doc.querySelector("#frameWrapper #gameFrame");

          if (gameFrame) {
            const srcAttr = gameFrame.getAttribute("src");
            const finalUrl = BASE + srcAttr;
            
          
            const actualHtml = await fetch(finalUrl).then(r => r.text());
            viewerFrame.srcdoc = actualHtml;

        
            openNewTab.onclick = async () => {
              const tabHtml = await fetch(finalUrl).then(r => r.text());
              const tab = window.open("about:blank");
              tab.document.open();
              tab.document.write(tabHtml);
              tab.document.close();
            };
          } else {
          
            viewerFrame.srcdoc = html;

            openNewTab.onclick = async () => {
              const tabHtml = await fetch(fullUrl).then(r => r.text());
              const tab = window.open("about:blank");
              tab.document.open();
              tab.document.write(tabHtml);
              tab.document.close();
            };
          }
        });

    })
    .catch(show404);
}

document.getElementById("closeViewer").onclick = ()=>{
  window.top.location.href = "https://google.com/";
};
