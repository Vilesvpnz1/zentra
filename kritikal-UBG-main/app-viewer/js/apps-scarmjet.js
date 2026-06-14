const defaultWs = "wss://wisp.classroom.lat/";
const fallbackWs = [
  "wss://wisp.mercurywork.shop/",
  "wss://wisp.unlimited.web.id/",
  "wss://wisp.rubynetwork.net/",
];
let currentWs = localStorage.getItem("proxy-ws") || defaultWs;

function targetFromLocation() {
  const hash = window.location.hash.substring(1).trim();
  if (hash) {
    if (hash.startsWith("http")) return hash;
    return "https://" + hash.replace(/^\/+/, "");
  }
  const params = new URLSearchParams(window.location.search);
  const queryTarget = params.get("target") || params.get("u") || "";
  if (queryTarget) {
    if (queryTarget.startsWith("http")) return queryTarget;
    return "https://" + queryTarget.replace(/^\/+/, "");
  }
  return "https://www.youtube.com/";
}

function normalizeYouTube(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
      parsed.hostname = "www.youtube.com";
      parsed.protocol = "https:";
      if (host === "m.youtube.com") parsed.pathname = parsed.pathname || "/";
      return parsed.toString();
    }
  } catch (e) {}
  return url;
}

const targetUrl = normalizeYouTube(targetFromLocation());
const connection = new BareMux.BareMuxConnection("/sail/baremux/worker.js");

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

let activeFrame = null;
let booted = false;

function mountFrame(url) {
  const container = document.getElementById("iframe-container");
  if (!container) return;
  if (activeFrame && activeFrame.frame && activeFrame.frame.parentNode === container) {
    activeFrame.go(url);
    return;
  }
  container.innerHTML = "";
  activeFrame = scramjet.createFrame();
  container.appendChild(activeFrame.frame);
  activeFrame.frame.setAttribute("loading", "eager");
  activeFrame.frame.setAttribute("importance", "high");
  activeFrame.go(url);
}

async function registerWorker() {
  try {
    await navigator.serviceWorker.register("/sail/sw.js", { scope: "/sail/" });
  } catch (e) {
    await navigator.serviceWorker.register("/sail/sw.js");
  }
  await navigator.serviceWorker.ready;
}

async function pickTransport() {
  const candidates = [currentWs].concat(
    fallbackWs.filter(function (ws) {
      return ws !== currentWs;
    })
  );
  let lastError = null;
  for (let i = 0; i < candidates.length; i++) {
    try {
      await connection.setTransport("/sail/libcurl/index.mjs", [{ websocket: candidates[i] }]);
      currentWs = candidates[i];
      return;
    } catch (e) {
      lastError = e;
    }
  }
  await connection.setTransport("/sail/libcurl/index.mjs", [{ websocket: defaultWs }]);
  currentWs = defaultWs;
  if (lastError) throw lastError;
}

async function warmTransport() {
  await pickTransport();
  try {
    await fetch(location.origin + "/sail/go/https://example.com/", {
      method: "HEAD",
      cache: "no-store",
    });
  } catch (e) {}
}

async function boot() {
  if (booted) return;
  booted = true;
  await registerWorker();
  await warmTransport();
  mountFrame(targetUrl);
}

boot().catch(function () {
  booted = false;
  setTimeout(function () {
    boot();
  }, 900);
});

window.addEventListener("hashchange", function () {
  if (!booted) return;
  mountFrame(normalizeYouTube(targetFromLocation()));
});
