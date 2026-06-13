const frame = document.getElementById("vmFrame");
const home = document.getElementById("home");

function showFrame(url){
  home.style.display = "none";
  frame.style.display = "block";
  frame.src = url;
}

function goHome(){
  frame.style.display = "none";
  frame.src = "";
  home.style.display = "flex";
}

function launchHyperbeam(){
  showFrame("https://vms-link.jamdudelovescakelol.workers.dev/");
}

function launchBrowserLol(){
  window.location.href = "/vms/browser-lol/";
}
