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

function injectHeadScript(html, scriptBody) {
  const tag = "<script>" + scriptBody + "<\/script>";
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, function (match) {
      return match + tag;
    });
  }
  return tag + html;
}

function isHighwayRacerUrl(url) {
  let u = String(url || "");
  try {
    u = decodeURIComponent(u);
  } catch (e) {}
  return /highway[\s_-]?racer|highwayracer|cg-rip@main\/highway-racer/i.test(u);
}

function patchUnityBootHtml(html) {
  return String(html || "").replace(
    /\.then\(\(unityInstance\)\s*=>\s*\{\s*window\.gameInstance\s*=\s*unityInstance;\s*\}\)/,
    ".then((unityInstance)=>{window.gameInstance=unityInstance;if(window.__hrCoins)window.__hrCoins(unityInstance);})"
  );
}

function highwayRacerPatchScript() {
  return [
    "(function(){",
    "var C=500000;",
    "var KEYS=['totalMoney','subTotalMoney','Money','money','Coins','coins','COINS','TotalMoney','AllMoney','Cash','currency'];",
    "function writeKeys(){",
    "KEYS.forEach(function(k){try{localStorage.setItem(k,String(C));}catch(e){}});",
    "try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&/coin|money|cash|gold|currency|totalmoney|hr_/i.test(k))localStorage.setItem(k,String(C));}}catch(e){}",
    "}",
    "function clearIDB(){",
    "if(!window.indexedDB||!indexedDB.databases)return Promise.resolve();",
    "return indexedDB.databases().then(function(dbs){",
    "return Promise.all((dbs||[]).map(function(db){",
    "if(!db||!db.name)return Promise.resolve();",
    "var n=String(db.name).toLowerCase();",
    "if(n.indexOf('idbfs')<0&&n.indexOf('unity')<0&&n.indexOf('file_data')<0&&n.indexOf('ems')<0)return Promise.resolve();",
    "return new Promise(function(done){var r=indexedDB.deleteDatabase(db.name);r.onsuccess=r.onerror=r.onblocked=function(){done();};});",
    "}));",
    "}).catch(function(){});",
    "}",
    "function prefsBytes(){",
    "var enc=new TextEncoder(),chunks=[],dv;",
    "function u32(n){var b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,n>>>0,true);return b;}",
    "function i32(n){var b=new Uint8Array(4);new DataView(b.buffer).setInt32(0,n|0,true);return b;}",
    "chunks.push(i32(KEYS.length));",
    "KEYS.forEach(function(k){var kb=enc.encode(k);chunks.push(i32(kb.length));chunks.push(kb);chunks.push(i32(1));chunks.push(i32(C));});",
    "var n=chunks.reduce(function(a,c){return a+c.length;},0),out=new Uint8Array(n),o=0;",
    "chunks.forEach(function(c){out.set(c,o);o+=c.length;});return out;",
    "}",
    "function writePrefsFS(M){",
    "if(!M||!M.FS)return;",
    "var data=prefsBytes();",
    "function put(p){try{if(M.FS.analyzePath(p).exists)M.FS.unlink(p);M.FS.writeFile(p,data);}catch(e){}}",
    "try{",
    "var root=M.FS.readdir('/idbfs');",
    "root.forEach(function(d){",
    "if(d==='.'||d==='..')return;",
    "var base='/idbfs/'+d;",
    "put(base+'/prefs');",
    "try{var sub=M.FS.readdir(base);sub.forEach(function(f){if(f==='.'||f==='..')return;put(base+'/'+f+'/prefs');});}catch(e){}",
    "});",
    "}catch(e){}",
    "}",
    "function hookFS(M){",
    "if(!M||!M.FS||M.__hrFS)return;",
    "M.__hrFS=1;",
    "var orig=M.FS.syncfs;",
    "M.FS.syncfs=function(populate,cb){",
    "return orig.call(M.FS,populate,function(err){",
    "if(!err){writePrefsFS(M);writeKeys();}",
    "if(cb)cb(err);",
    "});",
    "};",
    "}",
    "function sendCoins(u){",
    "if(!u||!u.SendMessage)return;",
    "var os=['HR_MainMenuHandler','HR_GamePlayHandler','HR_ModHandler','HR_ModApplier','HR_PlayerHandler','HR_OptionsHandler','GotCoins','GameManager','MainMenu','MenuManager'];",
    "var ms=['SetMoney','SetCoins','SetCash','AddMoney','AddCoins','SetTotalMoney','GiveCoins','GotCoins','WatchAdforCoins','ApplyMod'];",
    "for(var a=0;a<os.length;a++){for(var b=0;b<ms.length;b++){try{u.SendMessage(os[a],ms[b],C);}catch(e){}try{u.SendMessage(os[a],ms[b],String(C));}catch(e){}}}",
    "}",
    "function afterUnity(inst){",
    "window.gameInstance=inst;",
    "var M=inst&&inst.Module;",
    "hookFS(M);",
    "writeKeys();",
    "writePrefsFS(M);",
    "sendCoins(inst);",
    "try{if(M&&M.FS)M.FS.syncfs(true,function(){writePrefsFS(M);writeKeys();sendCoins(inst);});}catch(e){}",
    "setInterval(function(){writeKeys();writePrefsFS(M);sendCoins(inst);},900);",
    "}",
    "window.__hrCoins=afterUnity;",
    "function wrapCui(fn){",
    "return function(canvas,config,progress){",
    "writeKeys();",
    "return clearIDB().then(function(){return fn.call(this,canvas,config,progress);}).then(function(inst){if(inst)afterUnity(inst);return inst;});",
    "};",
    "}",
    "var _cui;",
    "try{Object.defineProperty(window,'createUnityInstance',{configurable:true,enumerable:true,get:function(){return _cui;},set:function(fn){_cui=wrapCui(fn);}});}catch(e){}",
    "function hookExisting(){if(typeof window.createUnityInstance==='function'&&!window.createUnityInstance.__hr){var w=wrapCui(window.createUnityInstance);w.__hr=1;window.createUnityInstance=w;}}",
    "hookExisting();",
    "setInterval(function(){hookExisting();writeKeys();if(window.gameInstance)afterUnity(window.gameInstance);},700);",
    "clearIDB().then(writeKeys);",
    "})();",
  ].join("");
}

function applyGamePatches(html, sourceUrl) {
  if (!isHighwayRacerUrl(sourceUrl)) return html;
  return injectHeadScript(patchUnityBootHtml(html), highwayRacerPatchScript());
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
  return Promise.resolve(applyGamePatches(injectBaseTag(html, sourceUrl), sourceUrl));
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
