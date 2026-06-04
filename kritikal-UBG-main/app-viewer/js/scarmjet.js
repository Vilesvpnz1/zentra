const defaultWs = "wss://wisp.classroom.lat/";
let currentWs = localStorage.getItem("proxy-ws") || defaultWs;

const wsSelect = document.getElementById("ws-select");
const customWsGroup = document.getElementById("custom-ws-group");
const customWsInput = document.getElementById("custom-ws-input");

if (currentWs !== defaultWs) {
    wsSelect.value = "custom";
    customWsInput.value = currentWs;
    customWsGroup.style.display = "block";
}

navigator.serviceWorker.register("/sail/sw.js");
const connection = new BareMux.BareMuxConnection("/sail/baremux/worker.js");

async function applyTransport() {
    await connection.setTransport("/sail/libcurl/index.mjs", [
        { websocket: currentWs }
    ]);
}
applyTransport();

const { ScramjetController } = $scramjetLoadController();
const scramjet = new ScramjetController({
    files: {
        all: "/sail/scram/scramjet.all.js",
        wasm: "/sail/scram/scramjet.wasm.wasm",
        sync: "/sail/scram/scramjet.sync.js"
    },
    prefix: "/sail/go/"
});
scramjet.init();

function decodeProxiedUrl(u) {
    if (!u) return "";
    try {
        if (u.includes("/sail/go/")) {
            let part = u.split("/sail/go/")[1] || "";
            part = decodeURIComponent(part);
            return part;
        }
        return u;
    } catch { return u; }
}

wsSelect.addEventListener("change", () => {
    customWsGroup.style.display = wsSelect.value === "custom" ? "block" : "none";
});

function toggleSettings() {
    document.getElementById("settings-panel").classList.toggle("open");
}

function saveSettings() {
    if (wsSelect.value === "custom") {
        const custom = customWsInput.value.trim();
        if (!custom) return;
        currentWs = custom;
    } else {
        currentWs = defaultWs;
    }
    localStorage.setItem("proxy-ws", currentWs);
    location.reload();
}

async function loadFromHash() {
    const hash = window.location.hash.substring(1);
    let url = hash || 'https://google.com/';
    if (!url.startsWith('http')) url = 'https://' + url;

    const container = document.getElementById('iframe-container');
    container.innerHTML = ''; 
    const frame = scramjet.createFrame();
    container.appendChild(frame.frame);
    frame.go(url);

 
    document.getElementById('viewerTitle').innerText = "BloxProxy - Loading";

 
    frame.frame.addEventListener('load', () => {
        try {
           
            const iframeDoc = frame.frame.contentDocument || frame.frame.contentWindow.document;
            
        
            if (iframeDoc && iframeDoc.title) {
                document.getElementById('viewerTitle').innerText = "BloxProxy - " + iframeDoc.title;
            } else {
                document.getElementById('viewerTitle').innerText = "BloxProxy - " + "Scarmjet";
            }
        } catch (e) {
          
            document.getElementById('viewerTitle').innerText = "BloxProxy - " + "Scarmjet";
        }
    });
}

window.addEventListener('hashchange', loadFromHash);
window.addEventListener('load', loadFromHash);
