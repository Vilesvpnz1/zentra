const defaultWs = "wss://wisp.classroom.lat/";
let currentWs = localStorage.getItem("proxy-ws") || defaultWs;

const embedMode = document.documentElement.classList.contains("proxy-embed");
const wsSelect = document.getElementById("ws-select");
const customWsGroup = document.getElementById("custom-ws-group");
const customWsInput = document.getElementById("custom-ws-input");

if (wsSelect && currentWs !== defaultWs) {
    wsSelect.value = "custom";
    if (customWsInput) customWsInput.value = currentWs;
    if (customWsGroup) customWsGroup.style.display = "block";
}

const swReady = navigator.serviceWorker.register("/sail/sw.js");
const connection = new BareMux.BareMuxConnection("/sail/baremux/worker.js");

async function applyTransport() {
    await connection.setTransport("/sail/libcurl/index.mjs", [
        { websocket: currentWs }
    ]);
    try {
        await fetch(location.origin + "/sail/go/https://example.com/", {
            method: "HEAD",
            cache: "no-store",
        });
    } catch (e) {}
}

async function bootProxy() {
    await swReady;
    await navigator.serviceWorker.ready;
    await applyTransport();
    loadFromHash();
}

bootProxy();

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

if (wsSelect) {
    wsSelect.addEventListener("change", () => {
        if (customWsGroup) customWsGroup.style.display = wsSelect.value === "custom" ? "block" : "none";
    });
}

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
    frame.frame.setAttribute("loading", "eager");
    frame.go(url);

 
    if (!embedMode) {
        const viewerTitle = document.getElementById("viewerTitle");
        if (viewerTitle) viewerTitle.innerText = "Zentra Proxy - Loading";
        frame.frame.addEventListener("load", () => {
            try {
                const iframeDoc = frame.frame.contentDocument || frame.frame.contentWindow.document;
                if (viewerTitle) {
                    if (iframeDoc && iframeDoc.title) viewerTitle.innerText = "Zentra Proxy - " + iframeDoc.title;
                    else viewerTitle.innerText = "Zentra Proxy - Scarmjet";
                }
            } catch (e) {
                if (viewerTitle) viewerTitle.innerText = "Zentra Proxy - Scarmjet";
            }
        });
    }
}

window.addEventListener('hashchange', loadFromHash);
