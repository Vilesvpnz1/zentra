const https = require("https");
const crypto = require("crypto");

const WEBHOOK_URL = String(process.env.DISCORD_VISIT_WEBHOOK || "").trim();

const VISIT_COOLDOWN_MS = 8000;
const recentVisits = new Map();

function truncate(value, max) {
  var s = String(value == null ? "" : value);
  if (s.length <= max) return s || "n/a";
  return s.slice(0, max - 1) + "…";
}

function field(name, value, inline) {
  return {
    name: truncate(name, 256),
    value: truncate(value, 1024) || "n/a",
    inline: Boolean(inline),
  };
}

function postWebhook(payload) {
  return new Promise(function (resolve) {
    if (!WEBHOOK_URL) return resolve({ ok: false, reason: "no_url" });
    var body = JSON.stringify(payload);
    var url;
    try {
      url = new URL(WEBHOOK_URL);
    } catch (e) {
      return resolve({ ok: false, reason: "bad_url" });
    }
    var req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      function (res) {
        var chunks = [];
        res.on("data", function (chunk) {
          chunks.push(chunk);
        });
        res.on("end", function () {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            body: Buffer.concat(chunks).toString(),
            bytes: body.length,
          });
        });
      }
    );
    req.on("error", function (err) {
      resolve({ ok: false, reason: err.message });
    });
    req.setTimeout(10000, function () {
      req.destroy();
      resolve({ ok: false, reason: "timeout" });
    });
    req.write(body);
    req.end();
  });
}

function collectServer(req, getClientIp) {
  var headers = {};
  Object.keys(req.headers || {}).forEach(function (key) {
    headers[key] = truncate(req.headers[key], 240);
  });
  return {
    ip: getClientIp(req),
    method: req.method,
    path: req.path,
    url: req.originalUrl || req.url,
    host: req.headers.host || "",
    userAgent: req.headers["user-agent"] || "",
    referer: req.headers.referer || req.headers.referrer || "",
    acceptLanguage: req.headers["accept-language"] || "",
    acceptEncoding: req.headers["accept-encoding"] || "",
    cfConnectingIp: req.headers["cf-connecting-ip"] || "",
    cfCountry: req.headers["cf-ipcountry"] || "",
    cfRay: req.headers["cf-ray"] || "",
    xForwardedFor: req.headers["x-forwarded-for"] || "",
    xRealIp: req.headers["x-real-ip"] || "",
    secChUa: req.headers["sec-ch-ua"] || "",
    secChUaMobile: req.headers["sec-ch-ua-mobile"] || "",
    secChUaPlatform: req.headers["sec-ch-ua-platform"] || "",
    deviceHwid: req.headers["x-device-hwid"] || "",
    headers: headers,
  };
}

function buildMainEmbed(server, client) {
  client = client && typeof client === "object" ? client : {};
  return {
    title: "Kritikal visit",
    color: 0x7c3aed,
    timestamp: new Date().toISOString(),
    fields: [
      field("IP", server.ip, true),
      field("Country", server.cfCountry || client.timezone || "n/a", true),
      field("Page", client.href || server.url, false),
      field("Referrer", client.referrer || server.referer || "Direct", false),
      field("Host", server.host, true),
      field("HWID", client.hwid || server.deviceHwid || "n/a", true),
      field("Session", client.sessionId || "n/a", true),
      field("User agent", client.userAgent || server.userAgent, false),
      field("Platform", client.platform, true),
      field("Language", client.language, true),
      field("Languages", (client.languages || []).join(", "), false),
      field("Screen", client.screen, true),
      field("Viewport", client.viewport, true),
      field("Timezone", client.timezone, true),
      field("Connection", client.connection, false),
      field("Canvas", client.canvasHash, true),
      field("WebGL", (client.webglVendor || "") + " / " + (client.webglRenderer || ""), false),
      field("Fingerprint", client.fingerprintHash, true),
      field("Battery", client.battery, true),
      field("Media devices", client.mediaDeviceCount, true),
      field("CPU cores", client.hardwareConcurrency, true),
      field("Memory GB", client.deviceMemory, true),
      field("Proxy IP", server.cfConnectingIp || server.xRealIp || server.xForwardedFor, false),
      field("CF ray", server.cfRay, true),
      field("Source", client.source || "client", true),
    ],
  };
}

function buildDetailContent(server, client) {
  client = client && typeof client === "object" ? client : {};
  var chunks = [];
  chunks.push("Extra visit data");
  chunks.push("IP: " + server.ip);
  chunks.push("Path: " + (client.pathname || server.path || "n/a"));
  chunks.push("Title: " + (client.title || "n/a"));
  chunks.push("Visited: " + (client.visitedAt || "n/a"));
  chunks.push("Load ms: " + (client.pageLoadMs || "n/a"));
  chunks.push("Storage: local " + (client.localStorageLength != null ? client.localStorageLength : "n/a") + " · session " + (client.sessionStorageLength != null ? client.sessionStorageLength : "n/a"));
  chunks.push("Headers: " + truncate(JSON.stringify(server.headers), 900));
  chunks.push("Client: " + truncate(JSON.stringify(client), 900));
  return truncate(chunks.join("\n"), 1900);
}

function buildMinimalContent(server, client) {
  client = client && typeof client === "object" ? client : {};
  return truncate(
    "**Kritikal visit**\nIP: " +
      server.ip +
      "\nPage: " +
      (client.href || server.url || "n/a") +
      "\nUA: " +
      truncate(client.userAgent || server.userAgent, 300),
    1900
  );
}

function buildMessages(server, client) {
  return [
    {
      username: "Kritikal Visits",
      embeds: [buildMainEmbed(server, client)],
    },
    {
      username: "Kritikal Visits",
      content: buildDetailContent(server, client),
    },
  ];
}

function shouldLogVisit(key) {
  var now = Date.now();
  var last = recentVisits.get(key) || 0;
  if (now - last < VISIT_COOLDOWN_MS) return false;
  recentVisits.set(key, now);
  if (recentVisits.size > 8000) {
    recentVisits.forEach(function (ts, mapKey) {
      if (now - ts > VISIT_COOLDOWN_MS * 4) recentVisits.delete(mapKey);
    });
  }
  return true;
}

function sendVisitLog(req, getClientIp, clientPayload) {
  var server = collectServer(req, getClientIp);
  var client = clientPayload && typeof clientPayload === "object" ? clientPayload : {};
  var dedupeKey = server.ip + "|" + (client.sessionId || server.deviceHwid || "anon");
  if (!shouldLogVisit(dedupeKey)) return Promise.resolve({ ok: false, skipped: true });

  var messages = buildMessages(server, client);
  return postWebhook(messages[0]).then(function (first) {
    if (first.ok) {
      return postWebhook(messages[1]).then(function (second) {
        return { ok: true, first: first, second: second };
      });
    }
    return postWebhook({
      username: "Kritikal Visits",
      content: buildMinimalContent(server, client),
    }).then(function (fallback) {
      return { ok: fallback.ok, fallback: fallback, first: first };
    });
  });
}

function attachVisitLogger(app, opts) {
  opts = opts || {};
  var getClientIp = opts.getClientIp;
  if (!getClientIp || !WEBHOOK_URL) return;

  app.post("/api/visit-log", function (req, res) {
    var payload = req.body && typeof req.body === "object" ? req.body : {};
    payload.source = "client";
    sendVisitLog(req, getClientIp, payload).finally(function () {
      res.status(204).end();
    });
  });
}

module.exports = {
  attachVisitLogger: attachVisitLogger,
  sendVisitLog: sendVisitLog,
};
