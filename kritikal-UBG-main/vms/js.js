const frame = document.getElementById("vmFrame");
const home = document.getElementById("home");
const hyperbeamApi = "https://vms-link.jamdudelovescakelol.workers.dev/create-vm";
const hyperbeamStart = "https://google.com";

function showFrame(url){
  home.style.display = "none";
  frame.style.display = "block";
  frame.removeAttribute("srcdoc");
  frame.src = url;
}

function goHome(){
  frame.style.display = "none";
  frame.src = "";
  frame.removeAttribute("srcdoc");
  home.style.display = "flex";
}

function launchHyperbeam(){
  home.style.display = "none";
  frame.style.display = "block";
  frame.src = "about:blank";
  fetch(hyperbeamApi, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ start_url: hyperbeamStart }),
  })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.embed_url) {
        frame.src = data.embed_url;
        return;
      }
      throw data;
    })
    .catch(function () {
      showFrame("https://vms-link.jamdudelovescakelol.workers.dev/?start=" + encodeURIComponent(hyperbeamStart));
    });
}
