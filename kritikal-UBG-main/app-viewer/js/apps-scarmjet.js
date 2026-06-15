const defaultWs = "wss://wisp.classroom.lat/";
let currentWs = localStorage.getItem("proxy-ws") || defaultWs;

const swReady = navigator.serviceWorker.register("/sail/sw.js");
const connection = new BareMux.BareMuxConnection("/sail/baremux/worker.js");

async function applyTransport() {
  await connection.setTransport("/sail/libcurl/index.mjs", [{ websocket: currentWs }]);
}

async function bootProxy() {
  document.documentElement.dataset.appsBoot = "loading";
  await swReady;
  await navigator.serviceWorker.ready;
  await applyTransport();
  loadFromHash();
}

bootProxy().catch(function () {
  setTimeout(function () {
    bootProxy().catch(function () {});
  }, 800);
});

const { ScramjetController } = $scramjetLoadController();
const scramjet = new ScramjetController({
  files: {
    all: "/sail/scram/scramjet.all.js",
    wasm: "/sail/scram/scramjet.wasm.wasm",
    sync: "/sail/scram/scramjet.sync.js",
  },
  prefix: "/sail/go/",
});
scramjet.init();

function normalizeYouTube(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").replace(/^m\./, "");
    if (host === "youtube.com" || host === "youtu.be") {
      parsed.hostname = "www.youtube.com";
      parsed.protocol = "https:";
      return parsed.toString();
    }
  } catch (e) {}
  return url;
}

function targetFromLocation() {
  const hash = window.location.hash.substring(1).trim();
  if (hash) {
    if (hash.startsWith("http")) return hash;
    return "https://" + hash.replace(/^\/+/, "");
  }
  return "https://www.youtube.com/";
}

function loadFromHash() {
  const url = normalizeYouTube(targetFromLocation());
  const container = document.getElementById("iframe-container");
  if (!container) return;
  container.innerHTML = "";
  const frame = scramjet.createFrame();
  container.appendChild(frame.frame);
  frame.frame.setAttribute("loading", "eager");
  frame.frame.setAttribute("fetchpriority", "high");
  frame.frame.addEventListener(
    "load",
    function () {
      document.documentElement.dataset.appsBoot = "ready";
    },
    { once: true }
  );
  frame.go(url);
}

window.addEventListener("hashchange", loadFromHash);
