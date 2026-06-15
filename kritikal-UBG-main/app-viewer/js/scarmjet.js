const defaultWs = "wss://wisp.classroom.lat/";
const fallbackWs = [
    "wss://wisp.mercurywork.shop/",
    "wss://wisp.unlimited.web.id/",
    "wss://wisp.rubynetwork.net/",
];
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

function raceTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise(function (_, reject) {
            setTimeout(function () {
                reject(new Error("timeout"));
            }, ms);
        }),
    ]);
}

const swReady = navigator.serviceWorker.register("/sail/sw.js", { scope: "/sail/" }).catch(function () {
    return navigator.serviceWorker.register("/sail/sw.js");
});
const connection = new BareMux.BareMuxConnection("/sail/baremux/worker.js");

const loaded = $scramjetLoadController();
const scramjet = new loaded.ScramjetController({
    files: {
        all: "/sail/scram/scramjet.all.js",
        wasm: "/sail/scram/scramjet.wasm.wasm",
        sync: "/sail/scram/scramjet.sync.js",
    },
    prefix: "/sail/go/",
});
scramjet.init();

async function applyTransport() {
    const candidates = [currentWs].concat(
        fallbackWs.filter(function (ws) {
            return ws !== currentWs;
        })
    );
    for (let i = 0; i < candidates.length; i++) {
        try {
            await raceTimeout(
                connection.setTransport("/sail/libcurl/index.mjs", [{ websocket: candidates[i] }]),
                7000
            );
            currentWs = candidates[i];
            return;
        } catch (e) {}
    }
    await raceTimeout(
        connection.setTransport("/sail/libcurl/index.mjs", [{ websocket: defaultWs }]),
        7000
    );
    currentWs = defaultWs;
}

function resolveTargetUrl() {
    let hash = window.location.hash.substring(1);
    try {
        hash = decodeURIComponent(hash);
    } catch (e) {}
    let url = hash || "https://www.youtube.com/";
    if (!url.startsWith("http")) url = "https://" + url.replace(/^\/+/, "");
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.replace(/^www\./, "").replace(/^m\./, "");
        if (host === "youtube.com" || host === "youtu.be") {
            parsed.hostname = "www.youtube.com";
            parsed.protocol = "https:";
            url = parsed.toString();
        }
    } catch (e) {}
    return url;
}

let mountedUrl = "";

async function loadFromHash() {
    const url = resolveTargetUrl();
    const container = document.getElementById("iframe-container");
    if (!container) return;
    if (mountedUrl === url && container.querySelector("iframe")) return;
    mountedUrl = url;
    container.innerHTML = "";
    const frame = scramjet.createFrame();
    container.appendChild(frame.frame);
    frame.frame.setAttribute("loading", "eager");
    frame.frame.setAttribute("fetchpriority", "high");
    frame.frame.setAttribute(
        "allow",
        "fullscreen *; autoplay *; encrypted-media *; picture-in-picture *; clipboard-read *; clipboard-write *"
    );
    frame.frame.setAttribute("allowfullscreen", "");
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

async function bootProxy() {
    try {
        await swReady;
        await raceTimeout(navigator.serviceWorker.ready, 15000);
    } catch (e) {}
    try {
        await applyTransport();
    } catch (e) {}
    await loadFromHash();
}

bootProxy().catch(function () {
    setTimeout(function () {
        bootProxy().catch(function () {
            loadFromHash();
        });
    }, 800);
});

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

window.addEventListener("hashchange", loadFromHash);
