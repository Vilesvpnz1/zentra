const https = require("https");
const http = require("http");
const { isAllowedTarget } = require("./game-frame-proxy");

const TIMEOUT_MS = 35000;
const MAX_HTML = 14 * 1024 * 1024;
const MAX_ASSET = 18 * 1024 * 1024;
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function siteOrigin(req) {
  var host = (req && req.get && req.get("host")) || "localhost:3080";
  var proto = (req && req.get && req.get("x-forwarded-proto")) || "http";
  return proto + "://" + host;
}

function framePath(url) {
  return "/api/browser/frame?u=" + encodeURIComponent(url);
}

function assetPath(url) {
  return "/api/browser/asset?u=" + encodeURIComponent(url);
}

function absFrame(origin, url) {
  return origin + framePath(url);
}

function absAsset(origin, url) {
  return origin + assetPath(url);
}

function pageBase(sourceUrl) {
  try {
    var parsed = new URL(sourceUrl);
    var path = parsed.pathname;
    var slash = path.lastIndexOf("/");
    parsed.pathname = slash >= 0 ? path.slice(0, slash + 1) : "/";
    parsed.search = "";
    parsed.hash = "";
    return parsed.href;
  } catch (e) {
    return sourceUrl;
  }
}

function resolveRef(ref, pageUrl) {
  if (!ref) return "";
  var raw = String(ref).trim();
  if (!raw || raw.charAt(0) === "#" || /^javascript:/i.test(raw) || /^data:/i.test(raw) || /^blob:/i.test(raw)) {
    return "";
  }
  try {
    return new URL(raw, pageUrl).href;
  } catch (e) {
    return "";
  }
}

function collectBrowseResponse(req, res, url, max, resolve, reject) {
  if (res.statusCode < 200 || res.statusCode >= 400) {
    res.resume();
    reject(new Error("status " + res.statusCode));
    return;
  }
  var chunks = [];
  var size = 0;
  res.on("data", function (chunk) {
    size += chunk.length;
    if (size > max) {
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
      statusCode: res.statusCode,
    });
  });
}

function fetchBrowseRemote(url, referer, redirects) {
  redirects = redirects || 0;
  return new Promise(function (resolve, reject) {
    var parsed;
    try {
      parsed = new URL(url);
    } catch (e) {
      reject(e);
      return;
    }
    var lib = parsed.protocol === "https:" ? https : http;
    var headers = {
      "User-Agent": BROWSER_UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Upgrade-Insecure-Requests": "1",
    };
    if (referer) headers.Referer = referer;
    var req = lib.get(
      url,
      { headers: headers, timeout: TIMEOUT_MS },
      function (res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects < 6) {
          var next = new URL(res.headers.location, url).href;
          res.resume();
          if (!isAllowedTarget(next)) {
            reject(new Error("redirect blocked"));
            return;
          }
          fetchBrowseRemote(next, referer, redirects + 1).then(resolve).catch(reject);
          return;
        }
        var max = /\.css(\?|$)/i.test(url) || /text\/css/i.test(res.headers["content-type"] || "") ? MAX_ASSET : MAX_HTML;
        collectBrowseResponse(req, res, url, max, resolve, reject);
      }
    );
    req.on("error", reject);
    req.on("timeout", function () {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

function fetchBrowsePost(url, body, referer, redirects) {
  redirects = redirects || 0;
  return new Promise(function (resolve, reject) {
    var parsed;
    try {
      parsed = new URL(url);
    } catch (e) {
      reject(e);
      return;
    }
    var lib = parsed.protocol === "https:" ? https : http;
    var payload = String(body || "");
    var headers = {
      "User-Agent": BROWSER_UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(payload),
      Origin: parsed.origin,
    };
    if (referer) headers.Referer = referer;
    var req = lib.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: "POST",
        headers: headers,
        timeout: TIMEOUT_MS,
      },
      function (res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects < 6) {
          var next = new URL(res.headers.location, url).href;
          res.resume();
          if (!isAllowedTarget(next)) {
            reject(new Error("redirect blocked"));
            return;
          }
          fetchBrowseRemote(next, referer, redirects + 1).then(resolve).catch(reject);
          return;
        }
        collectBrowseResponse(req, res, url, MAX_HTML, resolve, reject);
      }
    );
    req.on("error", reject);
    req.on("timeout", function () {
      req.destroy();
      reject(new Error("timeout"));
    });
    req.write(payload);
    req.end();
  });
}

function stripBlocking(html) {
  return String(html || "")
    .replace(/<meta[^>]+http-equiv=["']content-security-policy["'][^>]*>/gi, "")
    .replace(/<meta[^>]+http-equiv=["']x-frame-options["'][^>]*>/gi, "")
    .replace(/\sintegrity=(["'])[^"']*\1/gi, "")
    .replace(/\scrossorigin=(["'])[^"']*\1/gi, "");
}

function proxyAttr(abs, attr, tag, origin) {
  if (!abs || !isAllowedTarget(abs)) return null;
  var a = attr.toLowerCase();
  var t = String(tag || "").toLowerCase();
  if (a === "href" && t === "a") return absFrame(origin, abs);
  if (a === "action") return absFrame(origin, abs);
  return absAsset(origin, abs);
}

function rewriteAttrValue(val, pageUrl, attr, tag, origin) {
  var abs = resolveRef(val, pageUrl);
  var proxied = proxyAttr(abs, attr, tag, origin);
  if (!proxied) return val;
  return proxied;
}

function rewriteTagUrls(html, pageUrl, origin) {
  return String(html || "").replace(/<([a-z0-9-]+)([^>]*?)>/gi, function (_full, tag, attrs) {
    var lower = tag.toLowerCase();
    var out = attrs;
    out = out.replace(/\b(href|src|action|poster|data-src)\s*=\s*(["'])([^"']+)\2/gi, function (_m, attr, q, val) {
      return attr + "=" + q + rewriteAttrValue(val, pageUrl, attr.toLowerCase(), lower, origin) + q;
    });
    out = out.replace(/\b(href|src|action|poster|data-src)\s*=\s*([^\s"'=<>`]+)/gi, function (_m, attr, val) {
      if (/^(javascript:|data:|blob:|#)/i.test(val)) return attr + "=" + val;
      return attr + '="' + rewriteAttrValue(val, pageUrl, attr.toLowerCase(), lower, origin) + '"';
    });
    out = out.replace(/\bsrcset\s*=\s*(["'])([^"']+)\1/gi, function (_m, q, val) {
      var parts = val.split(",").map(function (part) {
        var bits = part.trim().split(/\s+/);
        bits[0] = rewriteAttrValue(bits[0], pageUrl, "src", lower, origin);
        return bits.join(" ");
      });
      return "srcset=" + q + parts.join(", ") + q;
    });
    return "<" + tag + out + ">";
  });
}

function rewriteCssUrls(css, cssUrl, origin) {
  return String(css || "").replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, function (_m, _q, val) {
    var abs = resolveRef(val.trim(), cssUrl);
    if (!abs || !isAllowedTarget(abs)) return "url(" + val + ")";
    return "url(" + absAsset(origin, abs) + ")";
  });
}

function rewriteCssImports(css, cssUrl, origin) {
  return String(css || "").replace(/@import\s+(?:url\(\s*(['"]?)([^'")]+)\1\s*\)|(['"])([^'"]+)\3)/gi, function (m, _q1, u1, _q2, u2) {
    var raw = u1 || u2 || "";
    var abs = resolveRef(raw.trim(), cssUrl);
    if (!abs || !isAllowedTarget(abs)) return m;
    return '@import url("' + absAsset(origin, abs) + '")';
  });
}

function injectBaseTag(html, sourceUrl) {
  var base = pageBase(sourceUrl);
  var baseTag = '<base href="' + base.replace(/"/g, "&quot;") + '">';
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

function injectBrowseScript() {
  return [
    "<script>",
    "(function(){",
    "var O=location.origin||'';",
    "var F=O+'/api/browser/frame?u=',A=O+'/api/browser/asset?u=';",
    "function unwrap(u){",
    "try{var x=new URL(u,location.href);",
    "if(x.pathname.indexOf('/api/browser/frame')===0){return x.searchParams.get('u')||u;}",
    "if(x.pathname.indexOf('/api/browser/asset')===0){return x.searchParams.get('u')||u;}",
    "}catch(e){}return u;}",
    "function go(u){location.href=F+encodeURIComponent(unwrap(u));}",
    "document.addEventListener('click',function(e){",
    "var a=e.target.closest('a');",
    "if(!a)return;",
    "var h=a.getAttribute('href');",
    "if(!h||h.charAt(0)==='#'||/^javascript:/i.test(h))return;",
    "try{var u=unwrap(new URL(h,document.baseURI).href);",
    "if(/^https?:/i.test(u)){e.preventDefault();go(u);}}catch(err){}",
    "},true);",
    "document.addEventListener('submit',function(e){",
    "var f=e.target;if(!f||!f.action)return;",
    "try{var u=unwrap(new URL(f.action,document.baseURI).href);",
    "if(!/^https?:/i.test(u))return;e.preventDefault();",
    "var fd=new FormData(f),qs=new URLSearchParams(fd).toString();",
    "if((f.method||'GET').toUpperCase()==='GET'){go(qs?(u+(u.indexOf('?')>-1?'&':'?')+qs):u);}",
    "else{go(qs?u+(u.indexOf('?')>-1?'&':'?')+qs:u);}",
    "}catch(err){}",
    "},true);",
    "})();",
    "<\/script>",
  ].join("");
}

function isGoogleSearchUrl(url) {
  try {
    var parsed = new URL(url);
    return /\.google\./i.test(parsed.hostname) && parsed.pathname.indexOf("/search") === 0;
  } catch (e) {
    return false;
  }
}

function searchQueryFromUrl(url) {
  try {
    var parsed = new URL(url);
    return (
      parsed.searchParams.get("q") ||
      parsed.searchParams.get("query") ||
      parsed.searchParams.get("p") ||
      ""
    );
  } catch (e) {
    return "";
  }
}

var DDG_HTML_URL = "https://html.duckduckgo.com/html/";

function isDuckDuckGoHtmlUrl(url) {
  try {
    var parsed = new URL(url);
    var host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    return (
      (host === "duckduckgo.com" || host === "html.duckduckgo.com" || host === "lite.duckduckgo.com") &&
      (/\/html/i.test(parsed.pathname) || /\/lite/i.test(parsed.pathname) || parsed.pathname === "/")
    );
  } catch (e) {
    return false;
  }
}

function duckduckgoQuery(urlOrBody) {
  var raw = String(urlOrBody || "").trim();
  if (!raw) return "";
  try {
    if (/^https?:\/\//i.test(raw)) {
      return searchQueryFromUrl(raw);
    }
    var params = new URLSearchParams(raw);
    return String(params.get("q") || params.get("query") || "").trim();
  } catch (e) {
    return "";
  }
}

function duckduckgoPostBody(url) {
  try {
    var parsed = new URL(url);
    if (!parsed.searchParams.has("q") && !parsed.searchParams.has("query")) return "";
    return parsed.searchParams.toString();
  } catch (e) {
    return "";
  }
}

function fetchDuckDuckGoHtmlSearch(bodyOrUrl) {
  var q = duckduckgoQuery(bodyOrUrl);
  if (!q) {
    var asBody = String(bodyOrUrl || "").trim();
    if (asBody && asBody.indexOf("=") !== -1) q = duckduckgoQuery(asBody);
  }
  if (!q) return Promise.reject(new Error("empty query"));
  var encoded = "q=" + encodeURIComponent(q);
  var getUrl = DDG_HTML_URL + "?" + encoded;
  return fetchBrowseRemote(getUrl, DDG_HTML_URL)
    .then(function (result) {
      var html = result.body.toString("utf8");
      if (isBrokenSearchHtml(html) || !hasSearchResults(html)) {
        throw new Error("ddg_get_bad");
      }
      return { body: result.body, sourceUrl: getUrl, raw: false };
    })
    .catch(function () {
      return fetchBrowsePost(DDG_HTML_URL, encoded, DDG_HTML_URL).then(function (result) {
        var html = result.body.toString("utf8");
        if (isBrokenSearchHtml(html) && !hasSearchResults(html)) {
          throw new Error("ddg_post_bad");
        }
        return { body: result.body, sourceUrl: DDG_HTML_URL, raw: false };
      });
    });
}

function prepareGoogleSearchUrl(url) {
  try {
    var parsed = new URL(url);
    if (!/\.google\./i.test(parsed.hostname)) return url;
    if (parsed.pathname.indexOf("/search") === 0) {
      var q = searchQueryFromUrl(url);
      if (!q) return "https://www.google.com/webhp?igu=1";
      parsed.searchParams.set("q", q);
      parsed.searchParams.set("gbv", "1");
      parsed.searchParams.set("igu", "1");
      return parsed.href;
    }
    if (parsed.pathname === "/" || parsed.pathname === "/webhp") {
      parsed.searchParams.set("igu", "1");
      return parsed.href;
    }
    return url;
  } catch (e) {
    return url;
  }
}

function isGoogleBlockedHtml(html) {
  return /trouble accessing Google Search|having trouble accessing Google|unusual traffic from your computer network|automated queries|\/sorry\/index|consent\.google/i.test(
    String(html || "")
  );
}

function isLikelySearchUrl(url) {
  try {
    var parsed = new URL(url);
    var host = parsed.hostname.toLowerCase();
    var path = parsed.pathname.toLowerCase();
    var hasQuery =
      parsed.searchParams.has("q") || parsed.searchParams.has("p") || parsed.searchParams.has("query");
    if (!hasQuery) return false;
    if (/\/search|\/sp\/search|\/html/.test(path)) return true;
    return /google\.|bing\.|yahoo\.|brave\.|ecosia\.|startpage\.|qwant\.|duckduckgo\./i.test(host);
  } catch (e) {
    return false;
  }
}

function hasSearchResults(html) {
  return /class=["']result__a["']|class=["']b_algo["']|result-link|w-gl__result|algo-sr|search-result/i.test(
    String(html || "")
  );
}

function isBrokenSearchHtml(html) {
  var text = String(html || "");
  if (isGoogleBlockedHtml(text)) return true;
  if (/anomaly-modal|bots use duckduckgo|Please complete the security check|checkbox challenge/i.test(text)) {
    return true;
  }
  return false;
}

function resolveSearchFetch(url) {
  if (isDuckDuckGoHtmlUrl(url)) {
    var q = searchQueryFromUrl(url) || duckduckgoQuery(url);
    if (q) return fetchDuckDuckGoHtmlSearch("q=" + encodeURIComponent(q));
    return fetchBrowseRemote(DDG_HTML_URL, DDG_HTML_URL).then(function (result) {
      return { body: result.body, sourceUrl: DDG_HTML_URL, raw: false };
    });
  }
  if (isGoogleSearchUrl(url)) {
    var gq = searchQueryFromUrl(url);
    if (gq) return fetchDuckDuckGoHtmlSearch("q=" + encodeURIComponent(gq));
  }
  return null;
}

function searchFallback(url) {
  var q = searchQueryFromUrl(url);
  if (!q) return Promise.resolve(null);
  return fetchDuckDuckGoHtmlSearch("q=" + encodeURIComponent(q)).catch(function () {
    return null;
  });
}

function fetchBrowseHtml(url, referer) {
  var direct = resolveSearchFetch(url);
  if (direct) return direct;
  return fetchBrowseRemote(url, referer || url).then(function (result) {
    var type = String(result.contentType || "").toLowerCase();
    if (type.indexOf("text/html") === -1 && type.indexOf("application/xhtml") === -1) {
      return { body: result.body, contentType: result.contentType, sourceUrl: url, raw: true };
    }
    var htmlText = result.body.toString("utf8");
    var broken = isBrokenSearchHtml(htmlText) || (isLikelySearchUrl(url) && !hasSearchResults(htmlText));
    if (!broken) {
      return { body: result.body, sourceUrl: url, raw: false };
    }
    return searchFallback(url).then(function (fallback) {
      if (fallback) return fallback;
      return { body: result.body, sourceUrl: url, raw: false };
    });
  });
}


function deliverBrowseHtml(res, body, sourceUrl, origin, devtools) {
  var html = prepareBrowseHtml(body, sourceUrl, origin, !!devtools);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.send(html);
}

function injectDevtools(html) {
  var tag = '<script src="https://cdn.jsdelivr.net/npm/eruda"></script><script>eruda.init();</script>';
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, tag + "</body>");
  }
  return html + tag;
}

function prepareBrowseHtml(body, sourceUrl, origin, devtools) {
  var html = body.toString("utf8");
  html = stripBlocking(html);
  html = rewriteTagUrls(html, sourceUrl, origin);
  html = injectBaseTag(html, sourceUrl);
  var script = injectBrowseScript();
  if (/<\/head>/i.test(html)) {
    html = html.replace(/<\/head>/i, script + "</head>");
  } else {
    html = script + html;
  }
  if (devtools) html = injectDevtools(html);
  return html;
}

function createBrowseFrameHandler() {
  return function browseFrameHandler(req, res) {
    var raw = String(req.query.u || req.query.url || "").trim();
    if (!raw || !isAllowedTarget(raw)) {
      return res.status(400).send("Invalid URL");
    }
    var origin = siteOrigin(req);
    var target = prepareGoogleSearchUrl(raw);
    var devtools = String(req.query.devtools || "") === "1";
    fetchBrowseHtml(target, target)
      .then(function (result) {
        if (result.raw) {
          res.setHeader("Content-Type", result.contentType || "application/octet-stream");
          res.setHeader("Cache-Control", "public, max-age=300");
          return res.send(result.body);
        }
        deliverBrowseHtml(res, result.body, result.sourceUrl || target, origin, devtools);
      })
      .catch(function () {
        res.status(502).send("Could not load page");
      });
  };
}

function createBrowseAssetHandler() {
  return function browseAssetHandler(req, res) {
    var raw = String(req.query.u || req.query.url || "").trim();
    if (!raw || !isAllowedTarget(raw)) {
      return res.status(400).end();
    }
    var origin = siteOrigin(req);
    var referer = raw;
    try {
      referer = new URL(raw).origin + "/";
    } catch (e) {}
    fetchBrowseRemote(raw, referer)
      .then(function (result) {
        var type = String(result.contentType || "").toLowerCase();
        var body = result.body;
        if (type.indexOf("text/css") !== -1 || /\.css(\?|$)/i.test(raw)) {
          var css = rewriteCssImports(body.toString("utf8"), raw, origin);
          css = rewriteCssUrls(css, raw, origin);
          body = Buffer.from(css, "utf8");
          res.setHeader("Content-Type", "text/css; charset=utf-8");
        } else if (result.contentType) {
          res.setHeader("Content-Type", result.contentType);
        }
        res.setHeader("Cache-Control", "public, max-age=3600");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.send(body);
      })
      .catch(function () {
        res.status(502).end();
      });
  };
}

module.exports = {
  absFrame: absFrame,
  absAsset: absAsset,
  createBrowseFrameHandler: createBrowseFrameHandler,
  createBrowseAssetHandler: createBrowseAssetHandler,
};
