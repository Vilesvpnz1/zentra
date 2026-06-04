const https = require("https");
const http = require("http");

const MAX_BODY = 18 * 1024 * 1024;
const TIMEOUT_MS = 20000;
const MAX_UNWRAP_DEPTH = 3;

function isBlockedCdnUrl(url) {
  const u = String(url || "").toLowerCase();
  if (/cdn\.jsdelivr\.net\/gh\/3kh0\/3kh0-lite/i.test(u)) return true;
  if (/raw\.githack\.com\/3kh0\/3kh0-lite/i.test(u)) return true;
  if (/raw\.githubusercontent\.com\/3kh0\/3kh0-lite/i.test(u)) return true;
  return false;
}

function isPrivateHost(host) {
  const h = String(host || "").toLowerCase().replace(/^\[|\]$/g, "");
  if (!h || h === "localhost" || h.endsWith(".local")) return true;
  if (h === "::1" || h.startsWith("fe80:")) return true;
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function isAllowedTarget(urlStr) {
  let parsed;
  try {
    parsed = new URL(urlStr);
  } catch (e) {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
  if (isPrivateHost(parsed.hostname)) return false;
  if (isBlockedCdnUrl(urlStr)) return false;
  return true;
}

function proxyFrameUrl(url) {
  const u = String(url || "").trim();
  if (!u || !/^https?:\/\//i.test(u)) return u;
  return "/api/game-frame?u=" + encodeURIComponent(u);
}

function fetchRemote(url, redirects) {
  redirects = redirects || 0;
  if (redirects > 6) return Promise.reject(new Error("redirects"));
  return new Promise(function (resolve, reject) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (e) {
      reject(e);
      return;
    }
    const lib = parsed.protocol === "https:" ? https : http;
    const req = lib.get(
      url,
      {
        headers: {
          "User-Agent": "KritikalGameFrame/1.0",
          Accept: "text/html,application/xhtml+xml,*/*",
        },
        timeout: TIMEOUT_MS,
      },
      function (res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const next = new URL(res.headers.location, url).href;
          res.resume();
          if (!isAllowedTarget(next)) {
            reject(new Error("redirect blocked"));
            return;
          }
          resolve(fetchRemote(next, redirects + 1));
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error("status " + res.statusCode));
          return;
        }
        const chunks = [];
        let size = 0;
        res.on("data", function (chunk) {
          size += chunk.length;
          if (size > MAX_BODY) {
            req.destroy();
            reject(new Error("too large"));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", function () {
          resolve({
            body: Buffer.concat(chunks),
            contentType: String(res.headers["content-type"] || ""),
          });
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", function () {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

function baseHrefForUrl(urlStr) {
  try {
    const parsed = new URL(urlStr);
    const path = parsed.pathname;
    const slash = path.lastIndexOf("/");
    parsed.pathname = slash >= 0 ? path.slice(0, slash + 1) : "/";
    parsed.search = "";
    parsed.hash = "";
    return parsed.href;
  } catch (e) {
    return urlStr;
  }
}

function extractBaseHref(html) {
  const m = String(html || "").match(/<base[^>]*href=["']([^"']+)["']/i);
  return m ? String(m[1]).trim() : "";
}

function hasAbsoluteBase(html) {
  const href = extractBaseHref(html);
  return /^https?:\/\//i.test(href);
}

function resolveGameUrl(base, href) {
  try {
    return new URL(href, base).href;
  } catch (e) {
    return "";
  }
}

function extractPrimaryIframeSrc(html, sourceUrl) {
  const h = String(html || "");
  let src = "";
  let m = h.match(/<iframe[^>]*id=["']gameFrame["'][^>]*src=["']([^"']+)["']/i);
  if (!m) m = h.match(/<iframe[^>]*src=["']([^"']+)["'][^>]*id=["']gameFrame["']/i);
  if (m) src = m[1].trim();
  if (!src) {
    const tags = h.match(/<iframe\b[^>]*>/gi) || [];
    for (let i = 0; i < tags.length; i++) {
      const s = tags[i].match(/\bsrc=["']([^"']+)["']/i);
      if (!s) continue;
      const cand = s[1].trim();
      if (!cand || /^about:/i.test(cand) || /^javascript:/i.test(cand)) continue;
      src = cand;
      break;
    }
  }
  if (!src) return "";
  const base = hasAbsoluteBase(h) ? extractBaseHref(h) : baseHrefForUrl(sourceUrl);
  return resolveGameUrl(base, src);
}

function looksLikeWrapper(html) {
  const h = String(html || "");
  if (!/<iframe\b/i.test(h)) return false;
  if (/id=["']gameFrame["']/i.test(h)) return true;
  if (/frame-wrapper|frameWrapper|game-frame|toolbar|frame-wrapper/i.test(h)) return true;
  if (hasAbsoluteBase(h)) return false;
  if (h.length < 12000) return true;
  return false;
}

function injectBaseTag(html, sourceUrl) {
  if (hasAbsoluteBase(html)) return html;
  const base = baseHrefForUrl(sourceUrl);
  const baseTag = '<base href="' + base.replace(/"/g, "&quot;") + '">';
  if (/<base[^>]*>/i.test(html)) {
    return html.replace(/<base[^>]*>/i, baseTag);
  }
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, function (match) {
      return match + "\n" + baseTag;
    });
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html[^>]*>/i, function (match) {
      return match + "\n<head>" + baseTag + "</head>";
    });
  }
  return baseTag + "\n" + html;
}

function prepareHtml(body, sourceUrl, depth) {
  depth = depth || 0;
  const html = body.toString("utf8");
  if (depth < MAX_UNWRAP_DEPTH && looksLikeWrapper(html)) {
    const inner = extractPrimaryIframeSrc(html, sourceUrl);
    if (inner && inner !== sourceUrl && isAllowedTarget(inner)) {
      return fetchRemote(inner).then(function (result) {
        return prepareHtml(result.body, inner, depth + 1);
      });
    }
  }
  return Promise.resolve(injectBaseTag(html, sourceUrl));
}

function createGameFrameHandler() {
  return function gameFrameHandler(req, res) {
    const raw = String(req.query.u || req.query.url || "").trim();
    if (!raw || !isAllowedTarget(raw)) {
      return res.status(400).json({ error: "bad_url" });
    }
    fetchRemote(raw)
      .then(function (result) {
        return prepareHtml(result.body, raw);
      })
      .then(function (html) {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=300");
        res.send(html);
      })
      .catch(function () {
        res.status(502).json({ error: "fetch_failed" });
      });
  };
}

module.exports = {
  proxyFrameUrl: proxyFrameUrl,
  isAllowedTarget: isAllowedTarget,
  fetchRemote: fetchRemote,
  prepareHtml: prepareHtml,
  createGameFrameHandler: createGameFrameHandler,
  isBlockedCdnUrl: isBlockedCdnUrl,
};
