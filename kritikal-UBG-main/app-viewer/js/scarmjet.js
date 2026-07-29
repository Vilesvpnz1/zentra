const defaultWs = "wss://wisp.mercurywork.shop/";
const fallbackWs = [
    "wss://wisp.mercurywork.shop/",
    "wss://anura.pro/",
    "wss://gointospace.app/wisp/",
    "wss://glseries.net/wisp/",
    "wss://fern.best/",
    "wss://wisp.rhw.one/",
    "wss://wisp.unlimited.web.id/",
    "wss://wisp.rubynetwork.net/",
    "wss://wisp.terbium.workers.dev/",
    "wss://wisp.hypertabs.cc/",
    "wss://aluu.xyz/wisp/",
    "wss://dash.goip.de/wisp/",
];
let storedWs = "";
try {
    storedWs = localStorage.getItem("proxy-ws") || "";
    if (storedWs && storedWs.indexOf("classroom.lat") !== -1) {
        localStorage.removeItem("proxy-ws");
        storedWs = "";
    }
} catch (e) {}
let currentWs = storedWs || defaultWs;

const embedMode = document.documentElement.classList.contains("proxy-embed");
const wsSelect = document.getElementById("ws-select");
const customWsGroup = document.getElementById("custom-ws-group");
const customWsInput = document.getElementById("custom-ws-input");

if (wsSelect && currentWs !== defaultWs) {
    wsSelect.value = "custom";
    if (customWsInput) customWsInput.value = currentWs;
    if (customWsGroup) customWsGroup.style.display = "block";
}

const swReady = registerSw();
const connection = new BareMux.BareMuxConnection("/sail/baremux/worker.js");

function registerSw() {
    if (!("serviceWorker" in navigator)) return Promise.resolve();
    return navigator.serviceWorker
        .register("/sail/sw.js", { scope: "/" })
        .catch(function () {
            return navigator.serviceWorker.register("/sail/sw.js", { scope: "/sail/" });
        });
}

function normalizeWs(url) {
    var value = String(url || "").trim();
    if (!value) return "";
    if (!value.endsWith("/")) value += "/";
    return value;
}

function probeWisp(url) {
    return new Promise(function (resolve) {
        var done = false;
        var ws;
        function finish(ok) {
            if (done) return;
            done = true;
            clearTimeout(timer);
            try {
                ws.close();
            } catch (e) {}
            resolve(ok);
        }
        try {
            ws = new WebSocket(url);
        } catch (e) {
            finish(false);
            return;
        }
        var timer = setTimeout(function () {
            finish(false);
        }, 3000);
        ws.onopen = function () {
            finish(true);
        };
        ws.onerror = function () {
            finish(false);
        };
    });
}

async function verifyProxyFetch() {
    try {
        var probe =
            location.origin + "/sail/go/" + encodeURIComponent("https://example.com/");
        var res = await fetch(probe, { cache: "no-store" });
        if (!res.ok) return false;
        var text = await res.text();
        if (!text || text.length < 20) return false;
        if (text.indexOf("Proxy connection failed") !== -1) return false;
        if (text.indexOf("Uh oh!") !== -1) return false;
        if (text.indexOf("Could not connect to server") !== -1) return false;
        return true;
    } catch (e) {
        return false;
    }
}

async function applyTransport() {
    var candidates = [];
    var seen = {};
    function add(url) {
        var normalized = normalizeWs(url);
        if (!normalized || seen[normalized]) return;
        seen[normalized] = true;
        candidates.push(normalized);
    }
    add(currentWs);
    add(defaultWs);
    for (var i = 0; i < fallbackWs.length; i++) add(fallbackWs[i]);

    for (var j = 0; j < candidates.length; j++) {
        var ws = candidates[j];
        if (!(await probeWisp(ws))) continue;
        try {
            await connection.setTransport("/sail/libcurl/index.mjs", [{ websocket: ws }]);
        } catch (e) {
            continue;
        }
        if (await verifyProxyFetch()) {
            currentWs = ws;
            try {
                localStorage.setItem("proxy-ws", currentWs);
            } catch (e) {}
            return true;
        }
    }

    var last = normalizeWs(defaultWs);
    await connection.setTransport("/sail/libcurl/index.mjs", [{ websocket: last }]);
    currentWs = last;
    try {
        localStorage.setItem("proxy-ws", currentWs);
    } catch (e) {}
    return false;
}

async function waitForSwControl(ms) {
    const deadline = Date.now() + (ms || 12000);
    while (!navigator.serviceWorker.controller && Date.now() < deadline) {
        await new Promise(function (resolve) {
            setTimeout(resolve, 50);
        });
    }
    return !!navigator.serviceWorker.controller;
}

async function ensureSwControl() {
    await swReady;
    try {
        await navigator.serviceWorker.ready;
    } catch (e) {}
    if (await waitForSwControl(12000)) return true;
    if (!sessionStorage.getItem("sail-sw-reload")) {
        sessionStorage.setItem("sail-sw-reload", "1");
        location.reload();
        return false;
    }
    sessionStorage.removeItem("sail-sw-reload");
    return false;
}

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

function resolveTargetUrl() {
    var params = new URLSearchParams(window.location.search);
    var fromQuery = params.get("u") || params.get("url");
    if (fromQuery) {
        try {
            fromQuery = decodeURIComponent(fromQuery);
        } catch (e) {}
        if (fromQuery) {
            let url = fromQuery;
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
    }
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

function loadFromHash() {
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
        if (viewerTitle) viewerTitle.innerText = "Kobran Proxy - Loading";
        frame.frame.addEventListener("load", () => {
            try {
                const iframeDoc = frame.frame.contentDocument || frame.frame.contentWindow.document;
                if (viewerTitle) {
                    if (iframeDoc && iframeDoc.title) viewerTitle.innerText = "Kobran Proxy - " + iframeDoc.title;
                    else viewerTitle.innerText = "Kobran Proxy - Scarmjet";
                }
            } catch (e) {
                if (viewerTitle) viewerTitle.innerText = "Kobran Proxy - Scarmjet";
            }
        });
    }
}

async function resetScramjetDb() {
    return new Promise(function (resolve) {
        var req = indexedDB.deleteDatabase("$scramjet");
        req.onsuccess = req.onerror = req.onblocked = resolve;
    });
}

async function bootProxy() {
    try {
        await window.__scramjetIdbReady;
    } catch (e) {
        if (!sessionStorage.getItem("scramjet-idb-reset")) {
            sessionStorage.setItem("scramjet-idb-reset", "1");
            await resetScramjetDb();
            location.reload();
            return;
        }
        sessionStorage.removeItem("scramjet-idb-reset");
    }
    await swReady;
    try {
        await navigator.serviceWorker.ready;
    } catch (e) {}
    const ready = await ensureSwControl();
    if (!ready) return;
    var transportOk = false;
    try {
        transportOk = await applyTransport();
    } catch (e) {}
    if (!transportOk) {
        var title = document.getElementById("viewerTitle");
        if (title) {
            title.innerText = "Proxy server unreachable. Reload to try another Wisp server.";
        }
    }
    try {
        loadFromHash();
    } catch (e) {
        if (!sessionStorage.getItem("scramjet-idb-reset")) {
            sessionStorage.setItem("scramjet-idb-reset", "1");
            await resetScramjetDb();
            location.reload();
        }
    }
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
    } catch {
        return u;
    }
}

if (wsSelect) {
    wsSelect.addEventListener("change", () => {
        if (customWsGroup) customWsGroup.style.display = wsSelect.value === "custom" ? "block" : "none";
    });
}

function toggleSettings() {
    const panel = document.getElementById("settings-panel");
    if (panel) panel.classList.toggle("open");
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

window.addEventListener("hashchange", function () {
    bootProxy().catch(function () {
        loadFromHash();
    });
});
