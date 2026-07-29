const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const https = require("https");
const http = require("http");
const zlib = require("zlib");

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  } catch (e) {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function requestRaw(url, opts) {
  opts = opts || {};
  return new Promise(function (resolve, reject) {
    var u = new URL(url);
    var lib = u.protocol === "http:" ? http : https;
    var req = lib.request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === "http:" ? 80 : 443),
        path: u.pathname + u.search,
        method: opts.method || "GET",
        headers: opts.headers || {},
      },
      function (res) {
        var chunks = [];
        res.on("data", function (c) {
          chunks.push(c);
        });
        res.on("end", function () {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks),
          });
        });
      }
    );
    req.on("error", reject);
    req.setTimeout(45000, function () {
      req.destroy(new Error("timeout"));
    });
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

function deviceFields(sn) {
  return {
    sn: sn || crypto.randomBytes(16).toString("hex").toUpperCase(),
    model: "Chrome",
    version_code: "1",
    version_name: "1.0.0",
    device_name: "PC",
    os: "pc",
  };
}

function extractCode(text) {
  if (!text) return null;
  var s = String(text);
  var m =
    s.match(/(?:code|CAPTCHA|验证码|verification)[^\d]{0,40}(\d{4,8})/i) ||
    s.match(/【\s*(\d{4,8})\s*】/) ||
    s.match(/\b(\d{6})\b/) ||
    s.match(/\b(\d{4,8})\b/);
  return m ? m[1] : null;
}

function cookieHeader(setCookies) {
  if (!setCookies || !setCookies.length) return "";
  return setCookies
    .map(function (c) {
      return String(c).split(";")[0];
    })
    .join("; ");
}

function pickToken(setCookies, bodyJson) {
  if (bodyJson && bodyJson.data && bodyJson.data.user_token) {
    return String(bodyJson.data.user_token);
  }
  var header = cookieHeader(setCookies);
  var m = header.match(/(?:^|;\s*)as_user_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

async function raccoonPost(pathname, fields, cookie) {
  var body = new URLSearchParams(fields).toString();
  var headers = {
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "Content-Length": Buffer.byteLength(body),
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Accept: "application/json, text/javascript, */*; q=0.01",
    "X-Requested-With": "XMLHttpRequest",
    Origin: "https://www.raccoongame.com",
    Referer: "https://www.raccoongame.com/login?lang=en",
  };
  if (cookie) headers.Cookie = cookie;
  var res = await requestRaw("https://www.raccoongame.com" + pathname, {
    method: "POST",
    headers: headers,
    body: body,
  });
  var text = res.body.toString("utf8");
  return {
    status: res.status,
    headers: res.headers,
    body: text,
    json: parseJsonSafe(text),
    cookies: res.headers["set-cookie"] || [],
  };
}

async function guerrillaCreate() {
  var res = await requestRaw(
    "https://api.guerrillamail.com/ajax.php?f=get_email_address&lang=en",
    {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    }
  );
  var json = parseJsonSafe(res.body.toString("utf8"));
  if (!json || !json.email_addr || !json.sid_token) {
    throw new Error("temp_mail_create_failed");
  }
  return { email: json.email_addr, sid: json.sid_token };
}

async function guerrillaWaitCode(sid, timeoutMs) {
  var deadline = Date.now() + (timeoutMs || 120000);
  var seen = {};
  while (Date.now() < deadline) {
    await sleep(1500);
    var res = await requestRaw(
      "https://api.guerrillamail.com/ajax.php?f=check_email&sid_token=" +
        encodeURIComponent(sid) +
        "&seq=0",
      { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } }
    );
    var json = parseJsonSafe(res.body.toString("utf8"));
    var list = (json && json.list) || [];
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      var id = String(item.mail_id || "");
      if (!id || seen[id]) continue;
      seen[id] = true;
      var from = String(item.mail_from || "");
      var subject = String(item.mail_subject || "");
      if (/guerrilla/i.test(from) && /welcome/i.test(subject)) continue;
      var code = extractCode(
        String(item.mail_excerpt || "") + "\n" + String(item.mail_subject || "")
      );
      if (code) return code;
      var msgRes = await requestRaw(
        "https://api.guerrillamail.com/ajax.php?f=fetch_email&sid_token=" +
          encodeURIComponent(sid) +
          "&email_id=" +
          encodeURIComponent(id),
        { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } }
      );
      var msg = parseJsonSafe(msgRes.body.toString("utf8")) || {};
      var blob =
        String(msg.mail_body || "") +
        "\n" +
        String(msg.mail_excerpt || "") +
        "\n" +
        String(msg.mail_subject || "");
      code = extractCode(blob);
      if (code) return code;
    }
  }
  throw new Error("verification_timeout");
}

function decodeProxyBody(buf, encoding) {
  encoding = String(encoding || "").toLowerCase();
  if (!buf || !buf.length) return Buffer.alloc(0);
  try {
    if (encoding.includes("br")) return zlib.brotliDecompressSync(buf);
    if (encoding.includes("gzip")) return zlib.gunzipSync(buf);
    if (encoding.includes("deflate")) return zlib.inflateSync(buf);
  } catch (e) {}
  return buf;
}

function createKritikalRaccoonAuth(options) {
  var dataPath = options.dataPath;
  var store = readJson(dataPath, { accounts: {}, bridges: {} });
  var inflight = Object.create(null);
  var PREFIX = "/rac-play";

  function save() {
    writeJson(dataPath, store);
  }

  if (!store.ledgers) store.ledgers = {};

  function publicAccount(account) {
    if (!account) return null;
    return {
      email: account.email || "",
      password: account.password || "",
      nickname: account.nickname || "game player",
      phone: account.phone || "1234567890",
      country: account.country || "Myanmar",
      sn: account.sn || "",
      user_key: account.user_key || "",
      gold: Number(account.gold || 0),
      coins: Number(account.coins || 0),
      free_times: Number(account.free_times || 0),
      credits: Number(account.gold || 0) + Number(account.coins || 0),
      exhausted: isCreditsExhausted(account),
      created_at: account.created_at || Date.now(),
      updated_at: account.updated_at || Date.now(),
    };
  }

  function isCreditsExhausted(account) {
    if (!account || !account.wallet_checked) return false;
    var gold = Number(account.gold || 0);
    var coins = Number(account.coins || 0);
    var freeTimes = Number(account.free_times || 0);
    return gold <= 0 && coins <= 0 && freeTimes <= 0;
  }

  function rememberAccount(sid, account, status) {
    if (!sid || !account || !account.email) return;
    if (!store.ledgers[sid]) store.ledgers[sid] = [];
    var list = store.ledgers[sid];
    var entry = Object.assign(publicAccount(account), {
      status: status || (isCreditsExhausted(account) ? "exhausted" : "active"),
    });
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].email === account.email) {
        idx = i;
        break;
      }
    }
    if (idx >= 0) list[idx] = Object.assign({}, list[idx], entry);
    else list.unshift(entry);
    for (var j = 0; j < list.length; j++) {
      if (list[j] && list[j].email !== account.email && list[j].status === "active") {
        list[j].status = "replaced";
      }
    }
    store.ledgers[sid] = list.slice(0, 40);
  }

  async function refreshAccountProfile(account) {
    if (!account || !account.user_token) return account;
    var base = {
      user_token: account.user_token,
      sn: account.sn,
      model: "Chrome",
      version_code: "1",
      version_name: "1.0.0",
      device_name: "PC",
      os: "pc",
    };
    try {
      var info = await raccoonPost("/api/user/info", base, account.cookie || "");
      if (info.json && info.json.status === 200 && info.json.data && info.json.data.user_info) {
        var ui = info.json.data.user_info;
        if (ui.nickname) account.nickname = String(ui.nickname);
        if (ui.user_key != null) account.user_key = String(ui.user_key);
        if (ui.sn_user_id != null && !account.user_key) {
          account.user_key = String(ui.sn_user_id);
        }
      }
    } catch (e) {}
    try {
      var wallet = await raccoonPost("/users/account", base, account.cookie || "");
      if (wallet.json && (wallet.json.status === 200 || wallet.json.status === 100) && wallet.json.data) {
        var w = wallet.json.data;
        account.wallet_checked = true;
        if (w.gold != null) account.gold = Number(w.gold) || 0;
        else account.gold = 0;
        if (w.coins != null) account.coins = Number(w.coins) || 0;
        else account.coins = 0;
        if (w.free_times != null) account.free_times = Number(w.free_times) || 0;
        else account.free_times = 0;
        if (w.nickname) account.nickname = String(w.nickname);
        if (w.user_key != null) account.user_key = String(w.user_key);
        if (w.phone) account.phone = String(w.phone);
      }
    } catch (e) {}
    account.updated_at = Date.now();
    return account;
  }

  async function rotateAccount(sid, reason) {
    var old = store.accounts[sid];
    if (old && old.email) {
      try {
        await refreshAccountProfile(old);
      } catch (e) {}
      rememberAccount(sid, old, reason || "exhausted");
    }
    delete store.accounts[sid];
    save();
    var created = await ensureAccount(sid);
    await refreshAccountProfile(created);
    rememberAccount(sid, created, "active");
    store.accounts[sid] = created;
    save();
    return created;
  }

  function getSid(req, res) {
    var cookies = String(req.headers.cookie || "");
    var m = cookies.match(/(?:^|;\s*)kritikal_rac_sid=([a-zA-Z0-9_-]+)/);
    var sid = m ? m[1] : "";
    if (!sid || sid.length < 16) {
      sid = crypto.randomBytes(24).toString("hex");
      res.append(
        "Set-Cookie",
        "kritikal_rac_sid=" +
          sid +
          "; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly"
      );
    }
    return sid;
  }

  function readSid(req) {
    var cookies = String(req.headers.cookie || "");
    var m = cookies.match(/(?:^|;\s*)kritikal_rac_sid=([a-zA-Z0-9_-]+)/);
    return m ? m[1] : "";
  }

  async function loginAccount(account) {
    var d = deviceFields(account.sn);
    var res = await raccoonPost(
      "/users/emailLogin",
      {
        email: account.email,
        password: account.password,
        sn: d.sn,
        model: d.model,
        version_code: d.version_code,
        version_name: d.version_name,
        device_name: d.device_name,
        os: d.os,
      },
      ""
    );
    if (!res.json || res.json.status !== 200) {
      throw new Error((res.json && res.json.msg) || "login_failed");
    }
    account.user_token = pickToken(res.cookies, res.json);
    account.sn = d.sn;
    account.cookie = cookieHeader(res.cookies) || ("as_user_token=" + encodeURIComponent(account.user_token));
    account.updated_at = Date.now();
    return account;
  }

  async function registerFresh() {
    var box = await guerrillaCreate();
    var sn = crypto.randomBytes(16).toString("hex").toUpperCase();
    var d = deviceFields(sn);
    var password = "Lm" + crypto.randomBytes(5).toString("hex");
    var send = await raccoonPost("/users/sendEmail", {
      email: box.email,
      type: "register",
      sn: d.sn,
      model: d.model,
      version_code: d.version_code,
      version_name: d.version_name,
      device_name: d.device_name,
      os: d.os,
    });
    if (!send.json || send.json.status !== 200) {
      throw new Error((send.json && send.json.msg) || "send_email_failed");
    }
    var code = await guerrillaWaitCode(box.sid, 90000);
    var phone = "1234567890";
    var reg = await raccoonPost("/users/emailRegister", {
      email: box.email,
      code: code,
      password: password,
      phone: phone,
      country: "Myanmar",
      sn: d.sn,
      model: d.model,
      version_code: d.version_code,
      version_name: d.version_name,
      device_name: d.device_name,
      os: d.os,
    });
    if (!reg.json || reg.json.status !== 200) {
      throw new Error((reg.json && reg.json.msg) || "register_failed");
    }
    var account = {
      email: box.email,
      password: password,
      sn: d.sn,
      phone: phone,
      country: "Myanmar",
      user_token: pickToken(reg.cookies, reg.json),
      cookie: cookieHeader(reg.cookies),
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    try {
      await loginAccount(account);
    } catch (e) {
      if (!account.user_token) throw e;
    }
    if (!account.cookie && account.user_token) {
      account.cookie = "as_user_token=" + encodeURIComponent(account.user_token);
    }
    return account;
  }

  async function borrowWorkingAccount(sid) {
    var keys = Object.keys(store.accounts || {});
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (key === sid) continue;
      var cand = store.accounts[key];
      if (!cand || !cand.email || !cand.password) continue;
      try {
        var copy = {
          email: cand.email,
          password: cand.password,
          sn: crypto.randomBytes(16).toString("hex").toUpperCase(),
          phone: cand.phone || "1234567890",
          country: cand.country || "Myanmar",
          created_at: Date.now(),
          updated_at: Date.now(),
        };
        await loginAccount(copy);
        var info = await raccoonPost(
          "/api/user/info",
          {
            user_token: copy.user_token,
            sn: copy.sn,
            model: "Chrome",
            version_code: "1",
            version_name: "1.0.0",
            device_name: "PC",
            os: "pc",
          },
          copy.cookie || ""
        );
        if (!info.json || info.json.status !== 200) continue;
        return copy;
      } catch (e) {}
    }
    return null;
  }

  async function ensureAccount(sid) {
    if (inflight[sid]) return inflight[sid];
    inflight[sid] = (async function () {
      var existing = store.accounts[sid];
      if (existing && existing.email && existing.password) {
        try {
          await loginAccount(existing);
          var info = await raccoonPost(
            "/api/user/info",
            {
              user_token: existing.user_token,
              sn: existing.sn,
              model: "Chrome",
              version_code: "1",
              version_name: "1.0.0",
              device_name: "PC",
              os: "pc",
            },
            existing.cookie || ""
          );
          if (!info.json || info.json.status !== 200) {
            throw new Error("login_invalid");
          }
          await refreshAccountProfile(existing);
          if (isCreditsExhausted(existing)) {
            rememberAccount(sid, existing, "exhausted");
            delete store.accounts[sid];
            save();
          } else {
            store.accounts[sid] = existing;
            rememberAccount(sid, existing, "active");
            save();
            return existing;
          }
        } catch (e) {
          delete store.accounts[sid];
          save();
        }
      }
      try {
        var borrowedFirst = await borrowWorkingAccount(sid);
        if (borrowedFirst) {
          await refreshAccountProfile(borrowedFirst);
          if (!isCreditsExhausted(borrowedFirst)) {
            store.accounts[sid] = borrowedFirst;
            rememberAccount(sid, borrowedFirst, "active");
            save();
            return borrowedFirst;
          }
        }
        var created = await registerFresh();
        await refreshAccountProfile(created);
        store.accounts[sid] = created;
        rememberAccount(sid, created, "active");
        save();
        return created;
      } catch (regErr) {
        var borrowed = await borrowWorkingAccount(sid);
        if (borrowed) {
          await refreshAccountProfile(borrowed);
          store.accounts[sid] = borrowed;
          rememberAccount(sid, borrowed, "active");
          save();
          return borrowed;
        }
        throw regErr;
      }
    })();
    try {
      return await inflight[sid];
    } finally {
      delete inflight[sid];
    }
  }

  function rewriteClientJs(text) {
    var out = String(text || "")
      .replace(/https:\/\/www\.raccoongame\.com/g, PREFIX)
      .replace(/http:\/\/www\.raccoongame\.com/g, PREFIX);
    out = out.replace(/base:"\/wap\/dist\//g, 'base:"' + PREFIX + "/wap/dist/");
    out = out.replace(/base:'\/wap\/dist\//g, "base:'" + PREFIX + "/wap/dist/");
    out = out.replace(/c\.p="\/wap\/dist\/"/g, 'c.p="' + PREFIX + '/wap/dist/"');
    out = out.replace(/__webpack_require__\.p="\/wap\/dist\/"/g, '__webpack_require__.p="' + PREFIX + '/wap/dist/"');
    out = out.replace(/(["'])\/wap\/dist\//g, function (m, q) {
      return q + PREFIX + "/wap/dist/";
    });
    out = out.replace(/(["'])\/wap\//g, function (m, q) {
      if (m.indexOf(PREFIX) !== -1) return m;
      return q + PREFIX + "/wap/";
    });
    return out;
  }

  function injectBootstrap(html, account) {
    var token = String(account.user_token || "");
    var sn = String(account.sn || "");
    var boot =
      "<script>(function(){try{" +
      "var TOKEN=" +
      JSON.stringify(token) +
      ";" +
      "var SN=" +
      JSON.stringify(sn) +
      ";" +
      "var PREFIX=" +
      JSON.stringify(PREFIX) +
      ";" +
      "var PUBLIC=" +
      JSON.stringify(PREFIX + "/wap/dist/") +
      ";" +
      "window.asToken=TOKEN;" +
      "try{__webpack_public_path__=PUBLIC;}catch(e){}" +
      "document.cookie='as_user_token='+encodeURIComponent(TOKEN)+'; path=/';" +
      "document.cookie='JY-HASH=lumina; path=/; max-age=31536000';" +
      "var device={sn:SN,model:'Chrome',version_code:'1',version_name:'1.0.0',device_name:'PC',os:'pc'};" +
      "window.getHash=function(){return SN;};" +
      "function applyInteract(obj){if(!obj)return;obj.GetMultiConfigFormTool=function(str,cb){try{cb(JSON.stringify(device));}catch(e){}};" +
      "obj.GetConfigFormTool=function(str,cb){try{var j=JSON.parse(str);if(j.key==='sn')return cb(SN);if(j.key==='model')return cb('Chrome');if(j.key==='version_code')return cb('1');if(j.key==='version_name')return cb('1.0.0');if(j.key==='device_name')return cb('PC');if(j.key==='os')return cb('pc');if(String(j.key||'').indexOf(',')>-1)return cb(JSON.stringify(device));cb('');}catch(e){cb('');}};" +
      "obj.SetUserToken=obj.SetUserToken||function(){};obj.SetConfigToTool=obj.SetConfigToTool||function(s,cb){if(cb)cb(true);};}" +
      "var _io={};applyInteract(_io);" +
      "try{Object.defineProperty(window,'interactObj',{configurable:true,enumerable:true,get:function(){return _io;},set:function(v){_io=v&&typeof v==='object'?v:{};applyInteract(_io);}});}catch(e){window.interactObj=_io;}" +
      "setInterval(function(){applyInteract(_io);try{if(window.__webpack_require__&&window.__webpack_require__.p!==undefined)window.__webpack_require__.p=PUBLIC;}catch(e){}},20);" +
      "function patchHosts(){try{if(window.JYSDK&&!window.JYSDK.__lum){var _init=window.JYSDK.prototype.initObj;window.JYSDK.prototype.initObj=function(){var r=_init.apply(this,arguments);this.interactObj=_io;applyInteract(_io);this.asHost=location.origin+PREFIX;this.rtHost=location.origin;this.host=location.origin+PREFIX;this.platform=1;return r;};window.JYSDK.__lum=1;}if(window.jy){window.jy.asHost=location.origin+PREFIX;window.jy.rtHost=location.origin;window.jy.host=location.origin+PREFIX;window.jy.platform=1;window.jy.interactObj=_io;applyInteract(_io);if(typeof window.jy.initObj==='function'&&!window.jy.__lumInit){try{window.jy.initObj();}catch(e){}window.jy.__lumInit=1;}}}catch(e){}}" +
      "patchHosts();setInterval(patchHosts,20);" +
      "window.asToken=TOKEN;window.getHash=function(){return SN;};setInterval(function(){window.asToken=TOKEN;window.getHash=function(){return SN;};},50);" +
      "function rewrite(u){if(!u)return u;var s=String(u);var H='https://www.raccoongame.com';var H2='http://www.raccoongame.com';if(s.indexOf(H)===0)s=PREFIX+s.slice(H.length);else if(s.indexOf(H2)===0)s=PREFIX+s.slice(H2.length);if(/^dist(\\/|$)/i.test(s))s=PREFIX+'/wap/'+s;if(/^(?:\\.\\/)?(?:pages|game|users|api|jyapi|archive|userGame)\\b/i.test(s))s=PREFIX+'/'+s.replace(/^\\.\\//,'');if(s.indexOf('/wap/dist/')===0&&/\\/(pages|game|users|api|jyapi|archive|userGame)\\//i.test(s))s=PREFIX+s.replace(/^\\/wap\\/dist/,'');if(s.indexOf(PREFIX+'/wap/dist/')===0&&/\\/(pages|game|users|api|jyapi|archive|userGame)\\//i.test(s))s=s.replace(PREFIX+'/wap/dist','');if(s.charAt(0)==='/'&&s.indexOf(PREFIX)!==0&&!/^\\/\\//.test(s)&&!/^\\/(lumina|admin|chat|api\\/lumina|api\\/tools|api\\/movies|api\\/sports|api\\/wallpaper|favicon\\.ico)(\\b|\\/|\\?|#|$)/.test(s))s=PREFIX+s;return s;}" +
      "function patchAjax(){try{if(!window.jQuery||!window.jQuery.ajax||window.jQuery.ajax.__lum)return;var oa=window.jQuery.ajax;window.jQuery.ajax=function(url,options){if(typeof url==='object'){url=Object.assign({},url);if(url.url)url.url=rewrite(url.url);return oa.call(this,url);}options=options||{};if(options.url)options.url=rewrite(options.url);return oa.call(this,rewrite(url),options);};window.jQuery.ajax.__lum=1;}catch(e){}}" +
      "patchAjax();setInterval(patchAjax,20);" +
      "function withToken(body){" +
      "var extra='user_token='+encodeURIComponent(TOKEN)+'&sn='+encodeURIComponent(SN)+'&model='+encodeURIComponent(device.model)+'&version_code='+encodeURIComponent(device.version_code)+'&version_name='+encodeURIComponent(device.version_name)+'&device_name='+encodeURIComponent(device.device_name)+'&os='+encodeURIComponent(device.os);" +
      "if(body==null||body===undefined||body==='')return extra;" +
      "if(typeof body==='string'){" +
      "try{if(body.charAt(0)==='{'||body.charAt(0)==='['){var j=JSON.parse(body);if(j&&typeof j==='object'&&!Array.isArray(j)){if(!j.user_token)j.user_token=TOKEN;if(!j.sn)j.sn=SN;if(!j.model)j.model=device.model;if(!j.version_code)j.version_code=device.version_code;if(!j.version_name)j.version_name=device.version_name;if(!j.device_name)j.device_name=device.device_name;if(!j.os)j.os=device.os;return JSON.stringify(j);}}}catch(e){}" +
      "if(body.indexOf('user_token=')===-1)body+=(body?'&':'')+'user_token='+encodeURIComponent(TOKEN);" +
      "if(body.indexOf('sn=')===-1)body+='&sn='+encodeURIComponent(SN);" +
      "if(body.indexOf('model=')===-1)body+='&model='+encodeURIComponent(device.model);" +
      "if(body.indexOf('version_code=')===-1)body+='&version_code='+encodeURIComponent(device.version_code);" +
      "if(body.indexOf('version_name=')===-1)body+='&version_name='+encodeURIComponent(device.version_name);" +
      "if(body.indexOf('device_name=')===-1)body+='&device_name='+encodeURIComponent(device.device_name);" +
      "if(body.indexOf('os=')===-1)body+='&os='+encodeURIComponent(device.os);" +
      "return body;}" +
      "if(typeof FormData!=='undefined'&&body instanceof FormData){if(!body.has('user_token'))body.append('user_token',TOKEN);if(!body.has('sn'))body.append('sn',SN);if(!body.has('model'))body.append('model',device.model);if(!body.has('version_code'))body.append('version_code',device.version_code);if(!body.has('version_name'))body.append('version_name',device.version_name);if(!body.has('device_name'))body.append('device_name',device.device_name);if(!body.has('os'))body.append('os',device.os);return body;}" +
      "if(typeof URLSearchParams!=='undefined'&&body instanceof URLSearchParams){if(!body.get('user_token'))body.set('user_token',TOKEN);if(!body.get('sn'))body.set('sn',SN);if(!body.get('model'))body.set('model',device.model);if(!body.get('version_code'))body.set('version_code',device.version_code);if(!body.get('version_name'))body.set('version_name',device.version_name);if(!body.get('device_name'))body.set('device_name',device.device_name);if(!body.get('os'))body.set('os',device.os);return body;}" +
      "return body;}" +
      "if(!XMLHttpRequest.prototype.__lumXhr){var xo=XMLHttpRequest.prototype.open,xs=XMLHttpRequest.prototype.send,xsh=XMLHttpRequest.prototype.setRequestHeader;" +
      "XMLHttpRequest.prototype.open=function(m,u){arguments[1]=rewrite(u);this.__m=m;this.__lumCt=false;return xo.apply(this,arguments);};" +
      "XMLHttpRequest.prototype.setRequestHeader=function(n,v){if(String(n||'').toLowerCase()==='content-type')this.__lumCt=true;return xsh.apply(this,arguments);};" +
      "XMLHttpRequest.prototype.send=function(b){if(String(this.__m||'GET').toUpperCase()==='POST'){b=withToken(b);if(typeof b==='string'&&!this.__lumCt){try{this.setRequestHeader('Content-Type','application/x-www-form-urlencoded; charset=UTF-8');}catch(e){}}}return xs.call(this,b);};" +
      "XMLHttpRequest.prototype.__lumXhr=1;}" +
      "if(window.fetch){var of=window.fetch;window.fetch=function(input,init){init=init||{};var url=typeof input==='string'?input:(input&&input.url);url=rewrite(url);if(typeof input==='string')input=url;else if(input&&input.url)input=new Request(url,input);if(String((init.method||'GET')).toUpperCase()==='POST'){init.body=withToken(init.body);if(typeof init.body==='string'){init.headers=init.headers||{};if(init.headers instanceof Headers){if(!init.headers.has('Content-Type'))init.headers.set('Content-Type','application/x-www-form-urlencoded; charset=UTF-8');}else if(!init.headers['Content-Type']&&!init.headers['content-type']){init.headers['Content-Type']='application/x-www-form-urlencoded; charset=UTF-8';}}}return of.call(this,input,init);};}" +
      "var sa=Element.prototype.setAttribute;" +
      "Element.prototype.setAttribute=function(name,value){if((name==='src'||name==='href')&&typeof value==='string'){value=rewrite(value);}return sa.call(this,name,value);};" +
      "try{var desc=Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype,'src');if(desc&&desc.set){Object.defineProperty(HTMLScriptElement.prototype,'src',{configurable:true,enumerable:true,get:desc.get,set:function(v){desc.set.call(this,rewrite(v));}});}}catch(e){}" +
      "var __lumRotating=false;function __lumWatchCredits(){if(__lumRotating)return;fetch('/api/kritikal/raccoon/account',{credentials:'same-origin'}).then(function(r){return r.json();}).then(function(j){if(!j||!j.ok)return;try{localStorage.setItem('kritikal_rac_accounts_sync',JSON.stringify({account:j.account,accounts:j.accounts||[],at:Date.now()}));}catch(e){}if(j.exhausted){__lumRotating=true;fetch('/api/kritikal/raccoon/rotate',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason:'exhausted',url:location.href})}).then(function(r){return r.json();}).then(function(out){try{localStorage.setItem('kritikal_rac_accounts_sync',JSON.stringify({account:out.account,accounts:out.accounts||[],at:Date.now(),rotated:true}));}catch(e){}location.reload();}).catch(function(){__lumRotating=false;});}}).catch(function(){});}setInterval(__lumWatchCredits,20000);setTimeout(__lumWatchCredits,5000);" +
      "}catch(e){}})();</script>";

    var out = rewriteClientJs(String(html || ""));
    out = out.replace(/(src|href)=["']\/(?!rac-play\/)/gi, function (m, attr) {
      return attr + '="' + PREFIX + "/";
    });
    if (/<head[^>]*>/i.test(out)) {
      out = out.replace(/<head[^>]*>/i, function (m) {
        return m + boot;
      });
    } else {
      out = boot + out;
    }
    return out;
  }

  function accountFromReq(req) {
    var sid = readSid(req);
    return sid && store.accounts[sid] && store.accounts[sid].user_token
      ? store.accounts[sid]
      : null;
  }

  async function proxyRequest(req, res, account, pathPrefix) {
    var rel = req.url || "/";
    if (rel.charAt(0) !== "/") rel = "/" + rel;
    if (pathPrefix) {
      rel = String(pathPrefix).replace(/\/$/, "") + rel;
    }
    rel = rel.replace(
      /^\/wap\/dist\/(?=(?:pages|game|users|api|jyapi|archive|userGame)(?:\/|\?|$))/i,
      "/"
    );
    var method = req.method || "GET";
    var target = "https://www.raccoongame.com" + rel;
    if (
      account &&
      account.user_token &&
      /\/(api|jyapi|users)\//i.test(rel) &&
      String(method).toUpperCase() === "GET"
    ) {
      try {
        var tu = new URL(target);
        if (!tu.searchParams.get("user_token")) {
          tu.searchParams.set("user_token", account.user_token);
        }
        if (account.sn && !tu.searchParams.get("sn")) {
          tu.searchParams.set("sn", account.sn);
        }
        target = tu.toString();
      } catch (e) {}
    }
    var headers = {
      "User-Agent":
        req.headers["user-agent"] ||
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: req.headers.accept || "*/*",
      Origin: "https://www.raccoongame.com",
      Referer: "https://www.raccoongame.com/wap/dist/",
    };
    if (account.cookie) headers.Cookie = account.cookie;
    else if (account.user_token) {
      headers.Cookie = "as_user_token=" + encodeURIComponent(account.user_token);
    }
    if (req.headers["content-type"]) headers["Content-Type"] = req.headers["content-type"];
    if (req.headers["x-requested-with"]) {
      headers["X-Requested-With"] = req.headers["x-requested-with"];
    }

    var chunks = [];
    req.on("data", function (c) {
      chunks.push(c);
    });
    req.on("end", async function () {
      try {
        var bodyBuf = Buffer.concat(chunks);
        var ctypeIn = String(headers["Content-Type"] || "");
        var isForm =
          !ctypeIn ||
          /application\/x-www-form-urlencoded/i.test(ctypeIn) ||
          (!bodyBuf.length && String(method).toUpperCase() === "POST");
        var isJson = /application\/json/i.test(ctypeIn);
        if (String(method).toUpperCase() === "POST" && (isForm || isJson || !bodyBuf.length)) {
          if (isJson && bodyBuf.length) {
            try {
              var j = JSON.parse(bodyBuf.toString("utf8"));
              if (j && typeof j === "object" && !Array.isArray(j)) {
                if (account.user_token) j.user_token = account.user_token;
                if (account.sn) j.sn = account.sn;
                if (!j.model) j.model = "Chrome";
                if (!j.version_code) j.version_code = "1";
                if (!j.version_name) j.version_name = "1.0.0";
                if (!j.device_name) j.device_name = "PC";
                if (!j.os) j.os = "pc";
                bodyBuf = Buffer.from(JSON.stringify(j), "utf8");
                headers["Content-Type"] = "application/json";
                headers["Content-Length"] = Buffer.byteLength(bodyBuf);
              }
            } catch (e) {}
          } else if (isForm || !bodyBuf.length) {
            var params = new URLSearchParams(bodyBuf.length ? bodyBuf.toString("utf8") : "");
            if (account.user_token) params.set("user_token", account.user_token);
            if (account.sn) params.set("sn", account.sn);
            if (!params.get("model")) params.set("model", "Chrome");
            if (!params.get("version_code")) params.set("version_code", "1");
            if (!params.get("version_name")) params.set("version_name", "1.0.0");
            if (!params.get("device_name")) params.set("device_name", "PC");
            if (!params.get("os")) params.set("os", "pc");
            bodyBuf = Buffer.from(params.toString(), "utf8");
            headers["Content-Type"] =
              "application/x-www-form-urlencoded; charset=UTF-8";
            headers["Content-Length"] = Buffer.byteLength(bodyBuf);
          }
        } else if (bodyBuf.length) {
          headers["Content-Length"] = bodyBuf.length;
        }

        var upstream = await requestRaw(target, {
          method: method,
          headers: headers,
          body: bodyBuf.length ? bodyBuf : undefined,
        });

        if (upstream.headers["set-cookie"]) {
          var merged = cookieHeader(upstream.headers["set-cookie"]);
          if (merged) {
            account.cookie = merged;
            var tok = pickToken(upstream.headers["set-cookie"], null);
            if (tok) account.user_token = tok;
            save();
          }
        }

        var skip = {
          "content-encoding": 1,
          "content-length": 1,
          "transfer-encoding": 1,
          connection: 1,
          "content-security-policy": 1,
          "content-security-policy-report-only": 1,
          "x-frame-options": 1,
        };
        Object.keys(upstream.headers || {}).forEach(function (k) {
          if (skip[k.toLowerCase()]) return;
          var val = upstream.headers[k];
          if (val == null) return;
          res.setHeader(k, val);
        });

        var ctype = String(upstream.headers["content-type"] || "");
        var raw = decodeProxyBody(upstream.body, upstream.headers["content-encoding"]);
        if (/text\/html/i.test(ctype)) {
          var html = injectBootstrap(raw.toString("utf8"), account);
          res.status(upstream.status || 200);
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.setHeader("Cache-Control", "no-store");
          res.send(html);
          return;
        }
        if (/javascript|ecmascript/i.test(ctype) || /\.js(\?|$)/i.test(rel)) {
          var jsText = rewriteClientJs(raw.toString("utf8"));
          res.status(upstream.status || 200);
          res.setHeader(
            "Content-Type",
            ctype || "application/javascript; charset=utf-8"
          );
          res.setHeader("Cache-Control", "no-store");
          res.send(jsText);
          return;
        }
        res.status(upstream.status || 200);
        res.send(raw);
      } catch (e) {
        if (!res.headersSent) {
          res.status(502).type("text").send("proxy_failed");
        }
      }
    });
  }

  function toPlayPath(raccoonUrl) {
    try {
      var u = new URL(raccoonUrl);
      if (u.hostname.indexOf("raccoongame.com") === -1) return null;
      return PREFIX + u.pathname + u.search + u.hash;
    } catch (e) {
      return null;
    }
  }

  function attach(app) {
    app.post("/api/kritikal/raccoon/ensure", async function (req, res) {
      try {
        var sid = getSid(req, res);
        var account = await ensureAccount(sid);
        await refreshAccountProfile(account);
        if (isCreditsExhausted(account)) {
          account = await rotateAccount(sid, "exhausted");
        } else {
          store.accounts[sid] = account;
          rememberAccount(sid, account, "active");
          save();
        }
        var playTo = "";
        if (req.body && req.body.url) playTo = toPlayPath(String(req.body.url)) || "";
        res.json({
          ok: true,
          ready: true,
          play: playTo || PREFIX + "/wap/dist/",
          nickname: account.nickname || "game player",
          account: publicAccount(account),
          accounts: store.ledgers[sid] || [],
          rotated: false,
        });
      } catch (e) {
        res.status(502).json({
          ok: false,
          error: String((e && e.message) || e || "ensure_failed"),
        });
      }
    });

    app.get("/api/kritikal/raccoon/status", function (req, res) {
      var sid = readSid(req);
      var acc = sid && store.accounts[sid];
      res.json({
        ok: true,
        hasAccount: !!(acc && acc.email),
        account: publicAccount(acc),
      });
    });

    app.get("/api/kritikal/raccoon/account", async function (req, res) {
      try {
        var sid = getSid(req, res);
        var account = store.accounts[sid];
        if (!account) {
          res.json({ ok: true, hasAccount: false, account: null, accounts: store.ledgers[sid] || [] });
          return;
        }
        await refreshAccountProfile(account);
        store.accounts[sid] = account;
        rememberAccount(sid, account, isCreditsExhausted(account) ? "exhausted" : "active");
        save();
        res.json({
          ok: true,
          hasAccount: true,
          account: publicAccount(account),
          accounts: store.ledgers[sid] || [],
          exhausted: isCreditsExhausted(account),
        });
      } catch (e) {
        res.status(502).json({
          ok: false,
          error: String((e && e.message) || e || "account_failed"),
        });
      }
    });

    app.get("/api/kritikal/raccoon/accounts", function (req, res) {
      var sid = readSid(req);
      res.json({
        ok: true,
        accounts: (sid && store.ledgers[sid]) || [],
        current: publicAccount(sid && store.accounts[sid]),
      });
    });

    app.post("/api/kritikal/raccoon/rotate", async function (req, res) {
      try {
        var sid = getSid(req, res);
        var reason =
          req.body && req.body.reason ? String(req.body.reason) : "rotated";
        var account = await rotateAccount(sid, reason);
        var playTo = "";
        if (req.body && req.body.url) playTo = toPlayPath(String(req.body.url)) || "";
        res.json({
          ok: true,
          ready: true,
          rotated: true,
          play: playTo || PREFIX + "/wap/dist/",
          nickname: account.nickname || "game player",
          account: publicAccount(account),
          accounts: store.ledgers[sid] || [],
        });
      } catch (e) {
        res.status(502).json({
          ok: false,
          error: String((e && e.message) || e || "rotate_failed"),
        });
      }
    });

    app.post("/api/kritikal/raccoon/logout", async function (req, res) {
      try {
        var sid = getSid(req, res);
        var account = await rotateAccount(sid, "logged_out");
        res.json({
          ok: true,
          rotated: true,
          account: publicAccount(account),
          accounts: store.ledgers[sid] || [],
        });
      } catch (e) {
        res.status(502).json({
          ok: false,
          error: String((e && e.message) || e || "logout_failed"),
        });
      }
    });

    app.use("/wap", async function (req, res, next) {
      var account = accountFromReq(req);
      if (!account) {
        try {
          var sid = getSid(req, res);
          account = await ensureAccount(sid);
        } catch (e) {
          return next();
        }
      }
      proxyRequest(req, res, account, "/wap");
    });

    app.use(PREFIX, async function (req, res) {
      var account = accountFromReq(req);
      if (!account) {
        try {
          var sid = getSid(req, res);
          account = await ensureAccount(sid);
        } catch (e) {
          res
            .status(401)
            .type("html")
            .send(
              "<!DOCTYPE html><html><body style='background:#0a0a0a;color:#fff;font-family:system-ui;padding:24px'>Account not ready. Go back to Kritikal and press Play again.</body></html>"
            );
          return;
        }
      }
      proxyRequest(req, res, account, "");
    });
  }

  return { attach: attach, toPlayPath: toPlayPath };
}

module.exports = { createKritikalRaccoonAuth: createKritikalRaccoonAuth };
