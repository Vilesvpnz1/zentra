const params = new URLSearchParams(window.location.search);
const view = params.get("view");

const BASE = "https://cdn.jsdelivr.net/gh/Hydra-Network/hydra-assets@main/gmes/";
const JSON_URL = "https://cdn.jsdelivr.net/gh/Hydra-Network/hydra-assets@main/gmes.json";

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
      const game = data.find(g => g.file_name === view);
      if(!game) throw new Error();

      const fullUrl = BASE + game.file_name;
      viewerTitle.textContent = game.title;

      fetch(fullUrl)
        .then(r=>r.text())
        .then(html=>{
          viewerFrame.srcdoc = html;
        });

      openNewTab.onclick = async () => {
        const html = await fetch(fullUrl).then(r=>r.text());
        const tab = window.open("about:blank");
        tab.document.write(html);
      };

    })
    .catch(show404);
}

document.getElementById("closeViewer").onclick = ()=>{
  window.top.location.href = "https://google.com/";
};
