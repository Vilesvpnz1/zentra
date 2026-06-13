const repos = [
  "tharun9772/ugs-1",
  "tharun9772/ugs-2",
  "tharun9772/ugs-3"
]; 

const params = new URLSearchParams(window.location.search);
let view = params.get("view");

const viewerFrame = document.getElementById("viewerFrame");
const viewerTitle = document.getElementById("viewerTitle");
const openNewTab = document.getElementById("openNewTab");
const closeViewer = document.getElementById("closeViewer");

function cleanName(name) {
  return name.replace(/^cl/, "").replace(/\.html$/, "");
}

async function findFile(filename) {
  for (const repo of repos) {
    try {
      const res = await fetch(`https://cdn.jsdelivr.net/gh/tharun9772/game-assets/api_generated/github/${repo}/file.json`);
      const files = await res.json();

      const match = files.find(f =>
        f.type === "file" &&
        f.name === filename
      );

      if (match) {
        return {
          repo,
          file: match.name,
          url: `https://cdn.jsdelivr.net/gh/${repo}@main/${match.name}`,
          name: match.name
        };
      }
    } catch (e) {
      console.error("Repo failed:", repo);
    }
  }
  return null;
}

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
        font-size:20px;
      }
    </style>
    404 - Game Not Found
  `;
  viewerTitle.textContent = "Not Found";
}

async function load() {
  if (!view) return show404();

  view = view.replace(/^"+|"+$/g, "").trim();


  let filename = view.endsWith(".html") ? view : (view + ".html");

  const game = await findFile(filename);

  if (!game) return show404();

  viewerTitle.textContent = cleanName(game.file);

  const html = await fetch(game.url).then(r => r.text());
  viewerFrame.srcdoc = html;

  openNewTab.onclick = async (e) => {
    e.preventDefault();
    const html = await fetch(game.url).then(r => r.text());
    const w = window.open("about:blank", "_blank");
    w.document.open();
    w.document.write(html);
    w.document.close();
  };
}



load();
