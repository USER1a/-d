/**
 * Z-Player — All-in-One Cloudflare Worker (JavaScript)
 *
 * Single self-contained Worker — no TypeScript, no build step needed.
 *
 * Endpoints:
 *   GET /api/embed/<server>/<episodeId>/<audio>
 *   GET /api/embed/<server>/ani/<anilistId>/<episodeNum>/<audio>
 *   GET /api/p/<encrypted-token>
 *
 * Setup:
 *   1. wrangler init my-worker --type=hello-world
 *   2. Replace src/index.js with this file (and set main = "src/index.js" in wrangler.toml)
 *   3. wrangler secret put PROXY_SECRET   (any 32+ char random string)
 *   4. wrangler deploy
 */

const HOMEPAGE = "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\" />\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\" />\n<title>Z-Player \\u00B7 iframe generator</title>\n<link rel=\"icon\" href=\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='11' fill='%23fff'/%3E%3Cpath d='M9 7v10l8-5z' fill='%23000'/%3E%3C/svg%3E\" />\n<style>\n  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}\n  :root{--bg:#0a0a0a;--surface:#0f0f10;--border:rgba(255,255,255,.06);--border-2:rgba(255,255,255,.1);--text:#f5f5f7;--muted:rgba(245,245,247,.55);--muted-2:rgba(245,245,247,.4)}\n  html,body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,\"SF Pro Display\",\"Inter\",\"Segoe UI\",Roboto,sans-serif;-webkit-font-smoothing:antialiased;min-height:100vh}\n  body{background:radial-gradient(ellipse at top,rgba(255,255,255,.03),transparent 60%),var(--bg)}\n  header{padding:18px 32px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;background:rgba(10,10,10,.7);backdrop-filter:blur(20px);position:sticky;top:0;z-index:10}\n  .logo{width:40px;height:40px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0}\n  .logo svg{width:20px;height:20px;fill:#000;margin-left:2px}\n  .brand .nm{font-size:14px;font-weight:700;letter-spacing:.12em}\n  .brand .sub{font-size:11px;color:var(--muted);margin-top:1px}\n  main{max-width:1280px;margin:0 auto;padding:32px;display:grid;grid-template-columns:380px 1fr;gap:24px;min-height:calc(100vh - 76px)}\n  @media (max-width:880px){main{grid-template-columns:1fr;padding:18px;gap:18px}}\n  .card{background:linear-gradient(180deg,var(--surface) 0%,#0c0c0d 100%);border:1px solid var(--border);border-radius:18px;padding:24px}\n  .card h2{font-size:17px;font-weight:600;letter-spacing:-.01em}\n  .card .desc{font-size:12.5px;color:var(--muted);margin-top:4px;margin-bottom:22px}\n  .field{margin-bottom:14px}\n  .field label{display:block;font-size:10.5px;font-weight:600;letter-spacing:.12em;color:var(--muted);text-transform:uppercase;margin-bottom:7px}\n  .input,.select{width:100%;background:#0a0a0b;border:1px solid var(--border-2);border-radius:10px;padding:11px 13px;color:var(--text);font-size:13.5px;font-family:inherit;transition:border-color .15s,background .15s;font-weight:500}\n  .input:focus,.select:focus{outline:none;border-color:rgba(255,255,255,.25);background:#0d0d0e}\n  .input::placeholder{color:var(--muted-2)}\n  .select{appearance:none;-webkit-appearance:none;background-image:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ffffff' opacity='.5'><path d='M7 10l5 5 5-5z'/></svg>\");background-repeat:no-repeat;background-position:right 10px center;background-size:18px;padding-right:34px;cursor:pointer}\n  .row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}\n  .toggles{display:flex;flex-wrap:wrap;gap:6px;background:#0a0a0b;border:1px solid var(--border-2);border-radius:10px;padding:8px 4px;margin-top:4px}\n  .toggle{flex:1;min-width:0;display:flex;align-items:center;justify-content:center;gap:7px;padding:7px 8px;border-radius:8px;font-size:12px;font-weight:500;color:var(--muted);cursor:pointer;transition:color .12s,background .12s;user-select:none;white-space:nowrap}\n  .toggle .dot{width:13px;height:13px;border:1.5px solid rgba(255,255,255,.35);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;transition:border-color .12s,background .12s}\n  .toggle.on{color:#fff}\n  .toggle.on .dot{border-color:#fff;background:#fff}\n  .toggle.on .dot::after{content:'';width:5px;height:5px;border-radius:50%;background:#000}\n  .toggle:hover{color:#fff}\n  .gen{width:100%;margin-top:20px;padding:13px;background:linear-gradient(180deg,#fafafa,#d4d4d4);color:#0a0a0a;border:0;border-radius:11px;font-size:14px;font-weight:600;letter-spacing:.01em;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:transform .1s,box-shadow .15s;box-shadow:0 1px 0 rgba(255,255,255,.6) inset,0 8px 22px rgba(0,0,0,.4)}\n  .gen:hover{box-shadow:0 1px 0 rgba(255,255,255,.6) inset,0 12px 28px rgba(255,255,255,.08),0 8px 22px rgba(0,0,0,.4)}\n  .gen:active{transform:scale(.985)}\n  .gen svg{width:14px;height:14px;fill:currentColor}\n  .preview-card{display:flex;flex-direction:column;min-height:520px}\n  .empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 24px;text-align:center;gap:18px}\n  .empty .pb{width:74px;height:74px;border-radius:50%;background:rgba(255,255,255,.93);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 30px rgba(0,0,0,.4)}\n  .empty .pb svg{width:30px;height:30px;fill:#0a0a0a;margin-left:3px}\n  .empty h3{font-size:22px;font-weight:600;letter-spacing:-.01em;margin-top:6px}\n  .empty p{font-size:13.5px;color:var(--muted);max-width:420px;line-height:1.55}\n  .result{display:none;flex:1;flex-direction:column;gap:18px}\n  .result.show{display:flex}\n  .iframe-wrap{position:relative;width:100%;aspect-ratio:16/9;background:#000;border-radius:14px;overflow:hidden;border:1px solid var(--border-2)}\n  .iframe-wrap iframe{position:absolute;inset:0;width:100%;height:100%;border:0}\n  .snippet{background:#070708;border:1px solid var(--border-2);border-radius:12px;padding:14px}\n  .snippet .lbl{font-size:10px;font-weight:700;letter-spacing:.12em;color:var(--muted);text-transform:uppercase;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between}\n  .snippet code{display:block;font-family:\"JetBrains Mono\",ui-monospace,Menlo,monospace;font-size:11.5px;color:#d4d4d4;line-height:1.55;white-space:pre-wrap;word-break:break-all;max-height:160px;overflow-y:auto}\n  .copy{background:rgba(255,255,255,.07);border:1px solid var(--border-2);color:#fff;font-size:10.5px;font-weight:600;padding:4px 10px;border-radius:6px;cursor:pointer;transition:background .12s;display:inline-flex;align-items:center;gap:5px;letter-spacing:.04em;text-transform:uppercase}\n  .copy:hover{background:rgba(255,255,255,.12)}\n  .copy.ok{background:rgba(76,217,100,.18);border-color:rgba(76,217,100,.4);color:#4cd964}\n  .copy svg{width:11px;height:11px;fill:currentColor}\n  footer{text-align:center;padding:24px;font-size:11.5px;color:var(--muted-2);border-top:1px solid var(--border);margin-top:40px}\n</style>\n</head>\n<body>\n<header>\n  <div class=\"logo\"><svg viewBox=\"0 0 24 24\"><path d=\"M8 5v14l11-7z\"/></svg></div>\n  <div class=\"brand\"><div class=\"nm\">Z-PLAYER</div><div class=\"sub\">Z-player iframe generator</div></div>\n</header>\n<main>\n  <section class=\"card\">\n    <h2>Generate embed</h2>\n    <p class=\"desc\">Build an iframe URL for any Z-player episode.</p>\n    <div class=\"field\">\n      <label>Mode</label>\n      <select id=\"mode\" class=\"select\">\n        <option value=\"anilist\">AniList ID</option>\n        <option value=\"episode\">Episode ID</option>\n      </select>\n    </div>\n    <div id=\"anilistFields\">\n      <div class=\"field\"><label>AniList ID</label><input id=\"anilistId\" class=\"input\" type=\"text\" placeholder=\"169580\" value=\"169580\" /></div>\n      <div class=\"field\"><label>Episode #</label><input id=\"epNum\" class=\"input\" type=\"number\" min=\"1\" placeholder=\"1\" value=\"1\" /></div>\n    </div>\n    <div id=\"episodeFields\" style=\"display:none\">\n      <div class=\"field\"><label>Episode ID</label><input id=\"episodeId\" class=\"input\" type=\"text\" placeholder=\"solo-leveling-19413?ep=125030\" /></div>\n    </div>\n    <div class=\"row2\">\n      <div class=\"field\"><label>Server</label><select id=\"server\" class=\"select\"><option value=\"hd-1\">HD-1</option><option value=\"hd-2\">HD-2</option><option value=\"hd-3\">HD-3</option></select></div>\n      <div class=\"field\"><label>Language</label><select id=\"audio\" class=\"select\"><option value=\"sub\">Sub</option><option value=\"dub\">Dub</option></select></div>\n    </div>\n    <div class=\"field\">\n      <label>Options</label>\n      <div class=\"toggles\">\n        <div class=\"toggle\" data-tg=\"autoplay\"><span class=\"dot\"></span>Auto Play</div>\n        <div class=\"toggle\" data-tg=\"skipIntro\"><span class=\"dot\"></span>Skip Intro</div>\n        <div class=\"toggle\" data-tg=\"skipOutro\"><span class=\"dot\"></span>Skip Outro</div>\n      </div>\n    </div>\n    <button id=\"gen\" class=\"gen\"><svg viewBox=\"0 0 24 24\"><path d=\"M8 5v14l11-7z\"/></svg>Generate</button>\n  </section>\n  <section class=\"card preview-card\">\n    <div id=\"empty\" class=\"empty\">\n      <div class=\"pb\"><svg viewBox=\"0 0 24 24\"><path d=\"M8 5v14l11-7z\"/></svg></div>\n      <h3>Build your iframe embed</h3>\n      <p>Configure the source on the left and hit Generate to get a copy-paste iframe snippet plus a live preview.</p>\n    </div>\n    <div id=\"result\" class=\"result\">\n      <div class=\"iframe-wrap\"><iframe id=\"prev\" allow=\"autoplay; picture-in-picture; fullscreen\" allowfullscreen></iframe></div>\n      <div class=\"snippet\"><div class=\"lbl\">Embed URL <button class=\"copy\" data-copy=\"url\"><svg viewBox=\"0 0 24 24\"><path d=\"M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z\"/></svg>Copy</button></div><code id=\"urlOut\"></code></div>\n      <div class=\"snippet\"><div class=\"lbl\">iframe snippet <button class=\"copy\" data-copy=\"iframe\"><svg viewBox=\"0 0 24 24\"><path d=\"M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z\"/></svg>Copy</button></div><code id=\"iframeOut\"></code></div>\n    </div>\n  </section>\n</main>\n<footer>Z-Player \\u00B7 self-hosted embed proxy with encrypted streaming</footer>\n<script>\n(function(){\n  var $=function(id){return document.getElementById(id)};\n  var ORIGIN=location.origin;\n  var state={autoplay:false,skipIntro:false,skipOutro:false};\n  $('mode').addEventListener('change',function(){\n    var m=$('mode').value;\n    $('anilistFields').style.display=m==='anilist'?'':'none';\n    $('episodeFields').style.display=m==='episode'?'':'none';\n  });\n  document.querySelectorAll('.toggle').forEach(function(t){\n    t.addEventListener('click',function(){var k=t.dataset.tg;state[k]=!state[k];t.classList.toggle('on',state[k])});\n  });\n  function buildUrl(){\n    var m=$('mode').value,server=$('server').value,audio=$('audio').value,path;\n    if(m==='anilist'){\n      var aid=$('anilistId').value.trim(),ep=$('epNum').value.trim();\n      if(!aid||!ep)return null;\n      path='/api/embed/'+server+'/ani/'+encodeURIComponent(aid)+'/'+encodeURIComponent(ep)+'/'+audio;\n    } else {\n      var eid=$('episodeId').value.trim();\n      if(!eid)return null;\n      path='/api/embed/'+server+'/'+encodeURIComponent(eid)+'/'+audio;\n    }\n    var qs=[];\n    if(state.autoplay)qs.push('autoplay=1');\n    if(state.skipIntro)qs.push('skipIntro=1');\n    if(state.skipOutro)qs.push('skipOutro=1');\n    return ORIGIN+path+(qs.length?'?'+qs.join('&'):'');\n  }\n  $('gen').addEventListener('click',function(){\n    var url=buildUrl();\n    if(!url){alert('Please fill in all required fields');return}\n    $('empty').style.display='none';\n    $('result').classList.add('show');\n    $('prev').src=url;\n    $('urlOut').textContent=url;\n    $('iframeOut').textContent='<iframe\\n  src=\"'+url+'\"\\n  allow=\"autoplay; picture-in-picture; fullscreen\"\\n  allowfullscreen\\n  style=\"width:100%;aspect-ratio:16/9;border:0;border-radius:12px\">\\n</iframe>';\n  });\n  document.querySelectorAll('.copy').forEach(function(b){\n    b.addEventListener('click',function(){\n      var txt=b.dataset.copy==='url'?$('urlOut').textContent:$('iframeOut').textContent;\n      if(!txt)return;\n      navigator.clipboard.writeText(txt).then(function(){\n        var orig=b.innerHTML;\n        b.classList.add('ok');\n        b.innerHTML='<svg viewBox=\"0 0 24 24\"><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z\"/></svg>Copied';\n        setTimeout(function(){b.classList.remove('ok');b.innerHTML=orig},1600);\n      });\n    });\n  });\n})();\n</script>\n</body>\n</html>";



/**
 * Z-Player — All-in-One Cloudflare Worker
 *
 * Single self-contained Worker that handles:
 *   GET /api/embed/<server>/<episodeId>/<audio>
 *   GET /api/embed/<server>/ani/<anilistId>/<episodeNum>/<audio>
 *   GET /api/p/<encrypted-token>          (obfuscated stream/track/poster proxy)
 *
 * All upstream URLs (m3u8, .ts segments, vtt subtitles, posters) are encrypted
 * with AES-GCM and routed back through /api/p/* — the browser never sees the
 * upstream CDN domain or any reusable token.
 *
 * Setup:
 *   1. wrangler init my-worker
 *   2. Replace src/index.ts with this file
 *   3. wrangler secret put PROXY_SECRET   (any 32+ char random string)
 *   4. wrangler deploy
 *
 * wrangler.toml:
 *   name = "z-player"
 *   main = "src/index.ts"
 *   compatibility_date = "2024-09-23"
 *   compatibility_flags = ["nodejs_compat"]
 */

function pickFirstString(html, key) {
  const re = new RegExp(`(?:const|let|var)\\s+${key}\\s*=\\s*(['"\`])((?:\\\\.|(?!\\1).)*)\\1`, "i");
  const m = html.match(re);
  return m ? m[2] : null;
}
function pickFirstJson(html, key) {
  const re = new RegExp(`(?:const|let|var)\\s+${key}\\s*=\\s*([\\[{][\\s\\S]*?[\\]}])\\s*;`, "i");
  const m = html.match(re);
  if (!m) return null;
  try {
    const cleaned = m[1].replace(/([\{,]\s*)([a-zA-Z_$][\w$]*)\s*:/g, '$1"$2":').replace(/'/g, '"');
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}
function htmlError(message, status = 500) {
  const body = `<!doctype html><html><head><meta charset="utf-8"><title>Embed error</title>
<style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#000;color:#fff;font-family:system-ui,sans-serif;text-align:center;padding:24px}</style>
</head><body><div><h2 style="margin:0 0 8px;font-weight:600">Playback unavailable</h2><p style="opacity:.7;font-size:14px">${message}</p></div></body></html>`;
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8"
    }
  });
}

// ============= URL CIPHER (AES-GCM) =============
const FALLBACK_SECRET = "z-player-default-do-not-use-in-prod-please-set-PROXY_SECRET-env-var-32b";
let cachedKey = null;
let secretValue = FALLBACK_SECRET;
function setSecret(s) {
  if (s && s.length > 0) {
    secretValue = s;
    cachedKey = null; // force re-derive
  }
}
function getKey() {
  if (cachedKey) return cachedKey;
  cachedKey = (async () => {
    const enc = new TextEncoder().encode(secretValue);
    const hash = await crypto.subtle.digest("SHA-256", enc);
    return crypto.subtle.importKey("raw", hash, {
      name: "AES-GCM"
    }, false, ["encrypt", "decrypt"]);
  })();
  return cachedKey;
}
function b64urlEncode(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(str) {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - str.length % 4);
  const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function encryptUrl(url) {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({
    name: "AES-GCM",
    iv
  }, key, new TextEncoder().encode(url)));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv, 0);
  out.set(ct, iv.length);
  return b64urlEncode(out);
}
async function decryptUrl(token) {
  const key = await getKey();
  const raw = b64urlDecode(token);
  if (raw.length < 13) throw new Error("Token too short");
  const iv = raw.slice(0, 12);
  const ct = raw.slice(12);
  const pt = await crypto.subtle.decrypt({
    name: "AES-GCM",
    iv
  }, key, ct);
  return new TextDecoder().decode(pt);
}
async function proxify(url) {
  return `/api/p/${await encryptUrl(url)}`;
}

// ============= STREAM PROXY =============
const UPSTREAM_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Referer: "https://cdn.4animo.xyz/",
  Origin: "https://cdn.4animo.xyz"
};
function isM3U8(url, contentType) {
  if (contentType && /mpegurl|m3u8/i.test(contentType)) return true;
  return /\.m3u8(\?|$)/i.test(url);
}
async function rewriteUriAttrs(line, base) {
  const re = /URI="([^"]+)"/g;
  const matches = [];
  let m;
  while ((m = re.exec(line)) !== null) matches.push({
    match: m[0],
    url: m[1]
  });
  if (matches.length === 0) return line;
  let result = line;
  for (const {
    match,
    url
  } of matches) {
    try {
      const abs = new URL(url, base).toString();
      const tok = await encryptUrl(abs);
      result = result.replace(match, `URI="/api/p/${tok}"`);
    } catch {}
  }
  return result;
}
async function rewriteM3U8(text, baseUrl) {
  const base = new URL(baseUrl);
  const lines = text.split(/\r?\n/);
  const out = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      out.push(line);
      continue;
    }
    if (trimmed.startsWith("#")) {
      out.push(await rewriteUriAttrs(line, base));
      continue;
    }
    try {
      const abs = new URL(trimmed, base).toString();
      const tok = await encryptUrl(abs);
      out.push(`/api/p/${tok}`);
    } catch {
      out.push(line);
    }
  }
  return out.join("\n");
}
async function handleProxy(request, token) {
  if (!token) return new Response("Missing token", {
    status: 400
  });
  let upstreamUrl;
  try {
    upstreamUrl = await decryptUrl(token);
  } catch {
    return new Response("Invalid token", {
      status: 403
    });
  }
  const fwdHeaders = {
    ...UPSTREAM_HEADERS
  };
  const range = request.headers.get("range");
  if (range) fwdHeaders["Range"] = range;
  const upstream = await fetch(upstreamUrl, {
    headers: fwdHeaders
  });
  const ct = upstream.headers.get("content-type");
  if (isM3U8(upstreamUrl, ct)) {
    const text = await upstream.text();
    const rewritten = await rewriteM3U8(text, upstreamUrl);
    return new Response(rewritten, {
      status: upstream.status,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  const headers = new Headers();
  for (const h of ["content-type", "content-length", "content-range", "accept-ranges", "cache-control", "etag", "last-modified"]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  headers.set("Access-Control-Allow-Origin", "*");
  return new Response(upstream.body, {
    status: upstream.status,
    headers
  });
}
function buildPlayerHtml(opts) {
  const accent = /^[0-9a-fA-F]{6}$/.test(opts.accent) ? opts.accent : "ffffff";
  const data = JSON.stringify({
    stream: opts.stream,
    tracks: opts.tracks,
    intro: opts.intro,
    outro: opts.outro,
    poster: opts.poster,
    autoplay: opts.autoplay,
    skipIntro: opts.skipIntro,
    skipOutro: opts.skipOutro,
    nextUrl: opts.nextUrl
  });
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<title>${opts.title}</title>
<style>
  :root{--accent:#${accent};--accent-rgb:${parseInt(accent.slice(0, 2), 16)},${parseInt(accent.slice(2, 4), 16)},${parseInt(accent.slice(4, 6), 16)};--cue-size:90%;--cue-bg:.78;--cue-color:#ffffff}
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{height:100%;width:100%;background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",Roboto,sans-serif;overflow:hidden;-webkit-font-smoothing:antialiased}
  #wrap{position:absolute;inset:0;background:#000;display:flex;align-items:center;justify-content:center;overflow:hidden}
  video{width:100%;height:100%;object-fit:contain;background:#000;display:block}
  #wrap::before{content:'';position:absolute;inset:-10%;background:radial-gradient(circle at 50% 50%,rgba(var(--accent-rgb),.08),transparent 60%);pointer-events:none;z-index:0}

  .ui{position:absolute;inset:0;pointer-events:none;transition:opacity .25s ease;z-index:5}
  .ui.hide{opacity:0;cursor:none}
  .ui>*{pointer-events:auto}

  /* Top bar */
  .top{position:absolute;top:0;left:0;right:0;padding:12px 14px 28px;background:linear-gradient(to bottom,rgba(0,0,0,.75),transparent);display:flex;align-items:center;gap:10px;font-size:12px;font-weight:500}
  .top .dot{width:6px;height:6px;border-radius:50%;background:var(--accent);box-shadow:0 0 10px var(--accent)}
  .top .ttl{opacity:.92;text-shadow:0 1px 4px rgba(0,0,0,.6);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:60%}
  .top .badge{margin-left:auto;display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border:1px solid rgba(255,255,255,.15);border-radius:99px;font-size:10px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;opacity:.8;backdrop-filter:blur(8px)}
  .credit{margin-left:auto;display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border:1px solid rgba(255,255,255,.12);border-radius:99px;font-size:10px;font-weight:600;letter-spacing:.04em;color:rgba(255,255,255,.78);background:rgba(0,0,0,.35);backdrop-filter:blur(10px);text-decoration:none;transition:color .15s,border-color .15s,background .15s}
  .credit:hover{color:#fff;border-color:rgba(var(--accent-rgb),.55);background:rgba(var(--accent-rgb),.18)}
  .credit svg{width:11px;height:11px;fill:currentColor;opacity:.9}
  .credit .by{opacity:.6;font-weight:500}
  .credit .nm{color:#fff;font-weight:700;letter-spacing:.02em}

  /* Loading + error overlays */
  .center{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;z-index:6}
  .spinner{width:38px;height:38px;border:2.5px solid rgba(255,255,255,.12);border-top-color:var(--accent);border-radius:50%;animation:sp .9s linear infinite}
  @keyframes sp{to{transform:rotate(360deg)}}
  .err{max-width:80%;text-align:center;color:rgba(var(--accent-rgb),.95);font-size:13px;background:rgba(0,0,0,.6);padding:14px 20px;border-radius:12px;backdrop-filter:blur(20px);border:1px solid rgba(var(--accent-rgb),.25)}

  /* Center play overlay */
  .play-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;cursor:pointer;background:rgba(0,0,0,.35);backdrop-filter:blur(2px);z-index:7;transition:opacity .2s}
  .play-overlay.hide{opacity:0;pointer-events:none}
  .play-overlay .pb{width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 32px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.15);transition:transform .2s,background .2s}
  .play-overlay:hover .pb{transform:scale(1.08);background:rgba(var(--accent-rgb),.85);border-color:rgba(var(--accent-rgb),.6)}
  .play-overlay svg{width:26px;height:26px;fill:#fff;margin-left:3px}

  /* Bottom controls */
  .bottom{position:absolute;left:0;right:0;bottom:0;padding:42px 12px 6px;background:linear-gradient(to top,rgba(0,0,0,.88) 0%,rgba(0,0,0,.55) 50%,transparent 100%)}

  /* Seek bar */
  .bar-wrap{padding:6px 4px;cursor:pointer;position:relative}
  .bar{position:relative;height:3px;background:rgba(255,255,255,.18);border-radius:99px;transition:height .15s ease}
  .bar-wrap:hover .bar,.bar-wrap.dragging .bar{height:5px}
  .buf,.prog,.mark,.hover-prog{position:absolute;top:0;bottom:0;border-radius:99px;pointer-events:none}
  .buf{background:rgba(255,255,255,.3);left:0}
  .hover-prog{background:rgba(255,255,255,.2);left:0;transition:width .05s linear}
  .prog{background:linear-gradient(90deg,var(--accent),rgba(var(--accent-rgb),.7));left:0;box-shadow:0 0 6px rgba(var(--accent-rgb),.45)}
  .mark{background:rgba(255,200,0,.7);box-shadow:0 0 4px rgba(255,200,0,.4)}
  .thumb{position:absolute;top:50%;width:12px;height:12px;border-radius:50%;background:#fff;transform:translate(-50%,-50%) scale(0);transition:transform .15s ease;box-shadow:0 0 0 4px rgba(var(--accent-rgb),.3),0 2px 6px rgba(0,0,0,.5);pointer-events:none}
  .bar-wrap:hover .thumb,.bar-wrap.dragging .thumb{transform:translate(-50%,-50%) scale(1)}

  /* Hover preview tooltip */
  .preview{position:absolute;bottom:18px;transform:translateX(-50%);background:rgba(10,10,12,.92);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.1);padding:4px 8px;border-radius:6px;font-size:10.5px;font-variant-numeric:tabular-nums;font-weight:500;display:none;pointer-events:none;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,.5)}
  .bar-wrap:hover .preview{display:block}

  /* Controls row — like reference */
  .row{display:flex;align-items:center;gap:1px;margin-top:2px;color:#fff;padding:0 4px}
  .btn{background:none;border:0;color:rgba(255,255,255,.92);cursor:pointer;padding:7px 8px;display:inline-flex;align-items:center;justify-content:center;border-radius:6px;transition:color .15s,background .15s,transform .1s;position:relative;gap:3px}
  .btn:hover{color:#fff;background:rgba(255,255,255,.08)}
  .btn:active{transform:scale(.92)}
  .btn svg{width:18px;height:18px;fill:currentColor;display:block}
  .btn.lg svg{width:20px;height:20px}
  .btn[disabled]{opacity:.35;cursor:not-allowed}
  .btn .lbl-sm{font-size:8.5px;font-weight:700;letter-spacing:.02em;opacity:.95;line-height:1}
  .btn.accent{color:var(--accent)}
  .btn.has-badge{padding-right:4px}
  .btn-badge{font-size:8.5px;font-weight:700;letter-spacing:.04em;padding:2px 4px;border:1px solid rgba(255,255,255,.4);border-radius:3px;line-height:1;color:#fff;text-transform:uppercase}

  /* Tooltip on buttons */
  .btn[data-tip]:hover::after{content:attr(data-tip);position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:rgba(15,15,18,.95);backdrop-filter:blur(10px);color:#fff;font-size:10px;font-weight:500;padding:4px 8px;border-radius:5px;white-space:nowrap;pointer-events:none;border:1px solid rgba(255,255,255,.08);z-index:10}

  .time{font-variant-numeric:tabular-nums;font-size:12px;font-weight:500;opacity:.95;padding:0 8px;letter-spacing:.02em}
  .time .sep{opacity:.45;margin:0 4px}

  .vol{display:flex;align-items:center}
  .vol .slider{width:0;overflow:hidden;transition:width .25s cubic-bezier(.4,0,.2,1);display:flex;align-items:center}
  .vol:hover .slider,.vol.active .slider{width:64px;padding:0 6px}
  .vol input{width:60px;height:3px;-webkit-appearance:none;appearance:none;background:rgba(255,255,255,.2);border-radius:99px;outline:none;cursor:pointer}
  .vol input::-webkit-slider-thumb{-webkit-appearance:none;width:11px;height:11px;border-radius:50%;background:#fff;cursor:pointer;box-shadow:0 0 0 3px rgba(var(--accent-rgb),.35)}
  .vol input::-moz-range-thumb{width:11px;height:11px;border:0;border-radius:50%;background:#fff;cursor:pointer}

  .right{margin-left:auto;display:flex;align-items:center;gap:0;position:relative}

  /* Settings menu */
  .menu{position:absolute;right:0;bottom:46px;width:260px;background:rgba(12,12,14,.92);backdrop-filter:blur(28px) saturate(180%);-webkit-backdrop-filter:blur(28px) saturate(180%);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:10px;font-size:12px;display:none;max-height:380px;overflow-y:auto;box-shadow:0 16px 40px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.06);scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.15) transparent;z-index:9}
  .menu::-webkit-scrollbar{width:5px}
  .menu::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:99px}
  .menu.show{display:block;animation:fadeUp .18s ease}
  @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  .menu-head{display:flex;align-items:center;justify-content:space-between;padding:2px 4px 8px;border-bottom:1px solid rgba(255,255,255,.06);margin-bottom:8px}
  .menu-head .title{font-size:10.5px;font-weight:700;letter-spacing:.12em;color:#fff;text-transform:uppercase}
  .menu-head .close{background:none;border:0;color:rgba(255,255,255,.55);cursor:pointer;padding:2px;font-size:16px;line-height:1;border-radius:4px}
  .menu-head .close:hover{color:#fff;background:rgba(255,255,255,.08)}
  .menu .lbl{padding:10px 4px 6px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.1em;font-size:9.5px;font-weight:600;display:flex;align-items:center;gap:6px}
  .menu .lbl svg{width:11px;height:11px;opacity:.7}
  .menu button.opt{display:flex;align-items:center;justify-content:space-between;width:100%;text-align:left;padding:7px 10px;background:none;border:0;color:rgba(255,255,255,.85);border-radius:7px;cursor:pointer;font-size:12px;font-weight:450;transition:background .12s,color .12s}
  .menu button.opt:hover{background:rgba(255,255,255,.07);color:#fff}
  .menu button.opt.on{color:var(--accent);background:rgba(var(--accent-rgb),.1)}
  .menu button.opt.on::after{content:'✓';color:var(--accent);font-weight:600}
  .menu .field{padding:4px 4px 8px}
  .menu .field-head{display:flex;align-items:center;justify-content:space-between;font-size:11px;color:rgba(255,255,255,.78);margin-bottom:8px}
  .menu .field-head .val{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;color:rgba(255,255,255,.55);letter-spacing:.04em}
  .swatches{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  .swatch{width:22px;height:22px;border-radius:50%;cursor:pointer;border:2px solid rgba(255,255,255,.15);transition:transform .12s,border-color .12s;padding:0;background-clip:padding-box}
  .swatch:hover{transform:scale(1.08)}
  .swatch.on{border-color:#fff;box-shadow:0 0 0 2px rgba(0,0,0,.5),0 0 0 3px #fff}
  .swatch.rainbow{background:conic-gradient(#ff0040,#ff8a00,#ffd500,#3eff7a,#00d4ff,#7a5cff,#ff3da6,#ff0040)}
  .menu .sub-row{display:flex;align-items:center;padding:2px 4px;gap:8px}
  .menu .sub-row input[type=range]{flex:1;accent-color:#fff;height:3px}
  .cue-preview{margin-top:10px;padding:14px 8px;background:rgba(255,255,255,.03);border:1px dashed rgba(255,255,255,.08);border-radius:8px;text-align:center}
  .cue-preview span{background:rgba(0,0,0,var(--cue-bg));color:var(--cue-color);font-size:13px;padding:3px 8px;border-radius:3px;font-weight:500}

  /* Skip pill */
  .skip{position:absolute;right:18px;bottom:78px;background:rgba(15,15,18,.88);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.14);color:#fff;padding:9px 16px 9px 14px;border-radius:99px;font-size:12px;font-weight:600;letter-spacing:.02em;cursor:pointer;display:none;align-items:center;gap:7px;transition:background .15s,border-color .15s,transform .15s;box-shadow:0 8px 24px rgba(0,0,0,.4);z-index:8}
  .skip:hover{background:var(--accent);border-color:var(--accent);transform:translateY(-1px)}
  .skip.show{display:inline-flex;animation:slideUp .25s ease}
  @keyframes slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  .skip svg{width:12px;height:12px;fill:currentColor}

  /* Next-episode card */
  .next-card{position:absolute;right:18px;bottom:78px;background:rgba(15,15,18,.92);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.14);color:#fff;padding:12px 14px;border-radius:12px;display:none;flex-direction:column;gap:8px;z-index:8;min-width:200px;box-shadow:0 8px 24px rgba(0,0,0,.5)}
  .next-card.show{display:flex;animation:slideUp .25s ease}
  .next-card .nl{font-size:10px;text-transform:uppercase;letter-spacing:.08em;opacity:.6;font-weight:600}
  .next-card .nb{display:flex;gap:6px}
  .next-card button{flex:1;padding:8px 10px;border-radius:8px;border:0;font-size:12px;font-weight:600;cursor:pointer;transition:opacity .15s,transform .1s}
  .next-card .play-next{background:var(--accent);color:#fff}
  .next-card .play-next:hover{opacity:.9}
  .next-card .dismiss{background:rgba(255,255,255,.1);color:#fff}
  .next-card .dismiss:hover{background:rgba(255,255,255,.18)}

  /* Double-tap seek flash */
  .seek-flash{position:absolute;top:50%;transform:translateY(-50%);background:rgba(0,0,0,.65);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.1);color:#fff;padding:10px 14px;border-radius:99px;font-size:12px;font-weight:600;display:none;align-items:center;gap:6px;pointer-events:none;z-index:9}
  .seek-flash svg{width:14px;height:14px;fill:currentColor}
  .seek-flash.show{display:inline-flex;animation:flashIn .6s ease forwards}
  @keyframes flashIn{0%{opacity:0;transform:translateY(-50%) scale(.9)}30%{opacity:1;transform:translateY(-50%) scale(1)}100%{opacity:0;transform:translateY(-50%) scale(1)}}

  ::cue{background:rgba(0,0,0,var(--cue-bg));color:var(--cue-color);font-family:inherit;font-size:var(--cue-size);line-height:1.3;padding:2px 6px;border-radius:3px}


  @media (max-width:480px){
    .btn{padding:6px 5px}
    .btn svg{width:15px;height:15px}
    .btn.lg svg{width:17px;height:17px}
    .time{font-size:10.5px;padding:0 4px;white-space:nowrap}
    .top{padding:10px 12px 24px;font-size:11px}
    .bottom{padding:34px 6px 4px}
    .top .badge{display:none}
    .row{gap:0;padding:0 2px}
    /* Hide non-essential controls so fullscreen stays visible */
    #pipBtn,#qBtn{display:none}
    /* Always show volume slider collapsed on mobile (toggle via tap) */
    .vol .slider{display:none}
  }

</style>
</head>
<body>
<div id="wrap">
  <video id="v" playsinline crossorigin="anonymous" ${opts.poster ? `poster="${opts.poster}"` : ""}></video>

  <div id="loading" class="center"><div class="spinner"></div></div>
  <div id="error" class="center" style="display:none"><div class="err"></div></div>

  <div id="playOverlay" class="play-overlay${opts.autoplay ? " hide" : ""}">
    <div class="pb"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
  </div>

  <div id="seekBack" class="seek-flash" style="left:18%"><svg viewBox="0 0 24 24"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg> -10s</div>
  <div id="seekFwd" class="seek-flash" style="right:18%"><svg viewBox="0 0 24 24"><path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/></svg> +10s</div>

  <button id="skipBtn" class="skip"><svg viewBox="0 0 24 24"><path d="M5 4l10 8-10 8V4zm12 0h2v16h-2V4z"/></svg><span id="skipLbl">Skip Intro</span></button>

  <div id="nextCard" class="next-card">
    <div class="nl">Up next in <span id="nextCount">10</span>s</div>
    <div class="nb">
      <button class="play-next" id="playNext">Play now</button>
      <button class="dismiss" id="dismissNext">Dismiss</button>
    </div>
  </div>

  

  <div id="ui" class="ui">
    <div class="top"><a class="credit" href="https://zane-dev-bio.vercel.app/" target="_blank" rel="noopener"><span class="by">made by</span><span class="nm">Zane</span></a></div>
    <div class="bottom">
      <div class="bar-wrap" id="barWrap">
        <div id="preview" class="preview">00:00</div>
        <div id="bar" class="bar">
          <div id="buf" class="buf"></div>
          <div id="hoverProg" class="hover-prog"></div>
          <div id="introMark" class="mark" style="display:none"></div>
          <div id="outroMark" class="mark" style="display:none"></div>
          <div id="prog" class="prog"></div>
          <div id="thumb" class="thumb"></div>
        </div>
      </div>
      <div class="row">
        <button id="play" class="btn lg" data-tip="Play (k)" aria-label="Play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>
        <button id="back60" class="btn" data-tip="-1m (j)" aria-label="Back 1 minute"><svg viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg><span class="lbl-sm">1m</span></button>
        
        <button id="fwd60" class="btn" data-tip="+1m (l)" aria-label="Forward 1 minute"><svg viewBox="0 0 24 24"><path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/></svg><span class="lbl-sm">1m</span></button>
        <button id="nextBtn" class="btn" data-tip="Next episode" aria-label="Next" style="display:none"><svg viewBox="0 0 24 24"><path d="M10 17l5-5-5-5v10z"/></svg></button>
        <span class="time"><span id="cur">0:00</span><span class="sep">/</span><span id="dur">0:00</span></span>
        <div class="right">
          <button id="qBtn" class="btn has-badge" data-tip="Quality" aria-label="Quality"><span id="qBadge" class="btn-badge">AUTO</span></button>
          <div id="volWrap" class="vol">
            <button id="mute" class="btn accent" data-tip="Mute (m)" aria-label="Mute"><svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/></svg></button>
            <div class="slider"><input id="vol" type="range" min="0" max="1" step="0.05" value="1" /></div>
          </div>
          <button id="ccBtn" class="btn" data-tip="Captions (c)" aria-label="Captions" style="display:none"><svg viewBox="0 0 24 24"><path d="M21 4H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-10 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z"/></svg></button>
          <button id="settingsBtn" class="btn has-badge" data-tip="Settings" aria-label="Settings"><svg viewBox="0 0 24 24"><path d="M19.14 12.94a7.49 7.49 0 0 0 .05-.94 7.49 7.49 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7 7 0 0 0-1.62-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.84a.5.5 0 0 0-.49.42l-.36 2.54a7 7 0 0 0-1.62.94l-2.39-.96a.5.5 0 0 0-.61.22L2.67 8.48a.5.5 0 0 0 .12.64L4.82 10.7a7.49 7.49 0 0 0 0 1.88l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .61.22l2.39-.96a7 7 0 0 0 1.62.94l.36 2.54a.5.5 0 0 0 .49.42h3.84a.5.5 0 0 0 .49-.42l.36-2.54a7 7 0 0 0 1.62-.94l2.39.96a.5.5 0 0 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5z"/></svg><span id="rateBadge" class="btn-badge">AUTO</span></button>
          <div id="menu" class="menu"></div>
          <button id="pipBtn" class="btn" data-tip="PiP (p)" aria-label="Picture-in-picture"><svg viewBox="0 0 24 24"><path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 1.98 2 1.98h18c1.1 0 2-.88 2-1.98V5c0-1.1-.9-2-2-2zm0 16.01H3V4.98h18v14.03z"/></svg></button>
          <button id="fs" class="btn" data-tip="Fullscreen (f)" aria-label="Fullscreen"><svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg></button>
        </div>
      </div>
    </div>
  </div>
</div>

<script>window.__EMBED__=${data};</script>
<script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js"></script>
<script>
(function(){
  var D=window.__EMBED__;
  var $=function(id){return document.getElementById(id)};
  var v=$('v'),wrap=$('wrap'),loading=$('loading'),errorEl=$('error'),playOverlay=$('playOverlay'),ui=$('ui');
  var barWrap=$('barWrap'),bar=$('bar'),buf=$('buf'),prog=$('prog'),thumb=$('thumb'),preview=$('preview'),hoverProg=$('hoverProg');
  var introMark=$('introMark'),outroMark=$('outroMark');
  var playBtn=$('play'),play2=$('play2'),back60=$('back60'),fwd60=$('fwd60'),nextBtn=$('nextBtn');
  var qBtn=$('qBtn'),qBadge=$('qBadge'),rateBadge=$('rateBadge');
  var muteBtn=$('mute'),volEl=$('vol'),volWrap=$('volWrap');
  var curEl=$('cur'),durEl=$('dur');
  var settingsBtn=$('settingsBtn'),menu=$('menu'),fsBtn=$('fs'),pipBtn=$('pipBtn'),ccBtn=$('ccBtn');
  var skipBtn=$('skipBtn'),skipLbl=$('skipLbl');
  var seekBack=$('seekBack'),seekFwd=$('seekFwd');
  var nextCard=$('nextCard'),nextCount=$('nextCount'),playNext=$('playNext'),dismissNext=$('dismissNext');

  var ICON_PLAY='<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  var ICON_PAUSE='<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';
  var ICON_VOL='<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/></svg>';
  var ICON_VOL_LOW='<svg viewBox="0 0 24 24"><path d="M7 9v6h4l5 5V4l-5 5H7z"/></svg>';
  var ICON_MUTE='<svg viewBox="0 0 24 24"><path d="M16.5 12A4.5 4.5 0 0 0 14 8v2.18l2.45 2.45a4.22 4.22 0 0 0 .05-.63zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25a7 7 0 0 1-2.25 1.21v2.06a9.06 9.06 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3z"/></svg>';

  function fmt(s){if(!isFinite(s)||s<0)return '00:00';var h=Math.floor(s/3600),m=Math.floor((s%3600)/60),x=Math.floor(s%60);var mm=(m<10?'0':'')+m,ss=(x<10?'0':'')+x;return h>0?h+':'+mm+':'+ss:mm+':'+ss}

  // localStorage helpers
  var LS={get:function(k,d){try{var v=localStorage.getItem('animo:'+k);return v===null?d:v}catch(e){return d}},set:function(k,v){try{localStorage.setItem('animo:'+k,v)}catch(e){}}};

  // Subtitles
  var subs=(D.tracks||[]).filter(function(t){return t.file && (t.kind==='captions'||t.kind==='subtitles'||!t.kind)});
  subs.forEach(function(t,i){var tr=document.createElement('track');tr.kind='subtitles';tr.src=t.file;tr.label=t.label||('Track '+(i+1));tr.srclang=(t.label||'en').toLowerCase().slice(0,2);if(t.default)tr.default=true;v.appendChild(tr)});
  if(subs.length)ccBtn.style.display='';

  // State
  var hls=null,levels=[],currentLevel=-1,activeSub='off',rate=1;
  var RATES=[0.5,0.75,1,1.25,1.5,1.75,2];
  var savedQ=parseInt(LS.get('quality','-1'));
  var cueSize=parseInt(LS.get('cueSize','100'));
  var cueBg=parseInt(LS.get('cueBg','78'));
  var cueColor=LS.get('cueColor','#ffffff');
  document.documentElement.style.setProperty('--cue-size',cueSize+'%');
  document.documentElement.style.setProperty('--cue-bg',(cueBg/100));
  document.documentElement.style.setProperty('--cue-color',cueColor==='rainbow'?'#ffeb3b':cueColor);
  function defaultSub(){var d=subs.find(function(t){return t.default});var saved=LS.get('sub','');if(saved && (saved==='off'||subs.find(function(t){return t.label===saved})))return saved;return d?(d.label||''):'off'}
  activeSub=defaultSub();

  function applySub(){for(var i=0;i<v.textTracks.length;i++){var tt=v.textTracks[i];tt.mode=(activeSub!=='off' && tt.label===activeSub)?'showing':'hidden'}LS.set('sub',activeSub);ccBtn.style.opacity=activeSub==='off'?'.55':'1'}

  function loadStream(){
    if(window.Hls && Hls.isSupported()){
      hls=new Hls({lowLatencyMode:true,backBufferLength:60,maxBufferLength:30});
      hls.loadSource(D.stream);hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED,function(_,d){
        levels=d.levels.map(function(l,i){return {i:i,h:l.height,b:l.bitrate}});
        if(savedQ!==-1 && levels.find(function(l){return l.i===savedQ})){hls.currentLevel=savedQ;currentLevel=savedQ}
        loading.style.display='none';renderMenu();applySub();
        if(D.autoplay)v.play().then(function(){playOverlay.classList.add('hide')}).catch(function(){playOverlay.classList.remove('hide')});
      });
      hls.on(Hls.Events.LEVEL_SWITCHED,function(_,d){currentLevel=d.level;LS.set('quality',String(d.level));renderMenu()});
      hls.on(Hls.Events.ERROR,function(_,d){if(d.fatal)showError('Stream error: '+d.details)});
    } else if(v.canPlayType('application/vnd.apple.mpegurl')){
      v.src=D.stream;
      v.addEventListener('loadedmetadata',function(){loading.style.display='none';renderMenu();applySub();if(D.autoplay)v.play().catch(function(){})});
    } else {showError('HLS not supported in this browser')}
  }
  function showError(msg){loading.style.display='none';errorEl.style.display='flex';errorEl.querySelector('.err').textContent=msg}
  loadStream();

  // Restore volume
  var savedVol=parseFloat(LS.get('vol','1'));if(!isNaN(savedVol)){v.volume=savedVol;volEl.value=savedVol}
  var savedRate=parseFloat(LS.get('rate','1'));if(!isNaN(savedRate)){rate=savedRate;v.playbackRate=rate}

  // Play / pause
  function togglePlay(){if(v.paused){v.play().then(function(){playOverlay.classList.add('hide')}).catch(function(){})}else{v.pause()}}
  playBtn.addEventListener('click',togglePlay);
  if(play2)play2.addEventListener('click',togglePlay);
  playOverlay.addEventListener('click',togglePlay);
  v.addEventListener('play',function(){playBtn.innerHTML=ICON_PAUSE;if(play2)play2.innerHTML=ICON_PAUSE;playOverlay.classList.add('hide')});
  v.addEventListener('pause',function(){playBtn.innerHTML=ICON_PLAY;if(play2)play2.innerHTML=ICON_PLAY});
  v.addEventListener('waiting',function(){loading.style.display='flex'});
  v.addEventListener('playing',function(){loading.style.display='none'});

  // Click + double-click on video
  var clickT=null;
  v.addEventListener('click',function(e){
    if(clickT){clearTimeout(clickT);clickT=null;
      var r=v.getBoundingClientRect();
      var x=e.clientX-r.left;
      if(x<r.width/2){v.currentTime=Math.max(0,v.currentTime-10);flash(seekBack,'-10s')}
      else{v.currentTime=Math.min(v.duration||0,v.currentTime+10);flash(seekFwd,'+10s')}
    } else {clickT=setTimeout(function(){togglePlay();clickT=null},220)}
  });
  function flash(el,txt){var l=el.querySelector('.lbl');if(l&&txt)l.textContent=txt;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');setTimeout(function(){el.classList.remove('show')},600)}

  back60.addEventListener('click',function(){v.currentTime=Math.max(0,v.currentTime-60);flash(seekBack,'-1m')});
  fwd60.addEventListener('click',function(){v.currentTime=Math.min(v.duration||0,v.currentTime+60);flash(seekFwd,'+1m')});
  qBtn.addEventListener('click',function(e){e.stopPropagation();menu.classList.toggle('show')});

  // Volume
  muteBtn.addEventListener('click',function(){v.muted=!v.muted});
  volEl.addEventListener('input',function(){v.volume=parseFloat(volEl.value);if(v.volume>0)v.muted=false;LS.set('vol',String(v.volume))});
  v.addEventListener('volumechange',function(){
    var icon=v.muted||v.volume===0?ICON_MUTE:(v.volume<0.5?ICON_VOL_LOW:ICON_VOL);
    muteBtn.innerHTML=icon;
    volEl.value=v.muted?0:v.volume;
  });

  // CC toggle
  ccBtn.addEventListener('click',function(){if(activeSub==='off'){var pref=LS.get('subPref','');var t=subs.find(function(x){return x.label===pref})||subs.find(function(x){return x.default})||subs[0];activeSub=t.label||'Track 1'}else{LS.set('subPref',activeSub);activeSub='off'}applySub();renderMenu()});

  // Time + markers + next-episode
  var introSkipped=false,outroSkipped=false,nextShown=false,nextTimer=null;
  function setMark(el,m,dur){if(!m||!dur)return;el.style.display='block';el.style.left=(m.start/dur*100)+'%';el.style.width=((m.end-m.start)/dur*100)+'%'}
  v.addEventListener('durationchange',function(){durEl.textContent=fmt(v.duration);setMark(introMark,D.intro,v.duration);setMark(outroMark,D.outro,v.duration)});
  v.addEventListener('timeupdate',function(){
    var t=v.currentTime,d=v.duration||0;
    curEl.textContent=fmt(t);
    var p=d?(t/d*100):0;
    prog.style.width=p+'%';thumb.style.left=p+'%';
    try{if(v.buffered.length){buf.style.width=(v.buffered.end(v.buffered.length-1)/d*100)+'%'}}catch(e){}

    var inIntro=D.intro&&t>=D.intro.start&&t<D.intro.end-0.5;
    var inOutro=D.outro&&t>=D.outro.start&&t<D.outro.end-0.5;
    if(inIntro){skipLbl.textContent='Skip Intro';skipBtn.classList.add('show');skipBtn.onclick=function(){v.currentTime=D.intro.end}}
    else if(inOutro){skipLbl.textContent='Skip Outro';skipBtn.classList.add('show');skipBtn.onclick=function(){v.currentTime=D.outro.end}}
    else{skipBtn.classList.remove('show')}
    if(D.skipIntro&&D.intro&&!introSkipped&&inIntro){v.currentTime=D.intro.end;introSkipped=true}
    if(D.skipOutro&&D.outro&&!outroSkipped&&inOutro){v.currentTime=D.outro.end;outroSkipped=true}

    // Next-episode card in last 20s
    if(D.nextUrl && d>0 && (d-t)<=20 && (d-t)>1 && !nextShown){
      nextShown=true;showNextCard();
    }
  });

  function showNextCard(){
    if(!D.nextUrl)return;
    var c=10;nextCount.textContent=c;nextCard.classList.add('show');
    nextTimer=setInterval(function(){c--;nextCount.textContent=c;if(c<=0){clearInterval(nextTimer);goNext()}},1000);
  }
  function goNext(){if(D.nextUrl){window.top?(window.top.location.href=D.nextUrl):(window.location.href=D.nextUrl)}}
  playNext.addEventListener('click',function(){clearInterval(nextTimer);goNext()});
  dismissNext.addEventListener('click',function(){clearInterval(nextTimer);nextCard.classList.remove('show')});
  if(D.nextUrl){nextBtn.style.display='';nextBtn.addEventListener('click',goNext)}

  // Seek + hover preview
  function seekFromEvent(e){
    var r=barWrap.getBoundingClientRect();
    var pct=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
    if(v.duration)v.currentTime=pct*v.duration;
  }
  barWrap.addEventListener('click',seekFromEvent);
  barWrap.addEventListener('mousemove',function(e){
    var r=barWrap.getBoundingClientRect();
    var pct=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
    var x=pct*r.width;
    preview.style.left=x+'px';
    preview.textContent=fmt(pct*(v.duration||0));
    hoverProg.style.width=(pct*100)+'%';
  });
  barWrap.addEventListener('mouseleave',function(){hoverProg.style.width='0'});

  // Drag scrubbing
  var dragging=false;
  barWrap.addEventListener('mousedown',function(e){dragging=true;barWrap.classList.add('dragging');seekFromEvent(e)});
  document.addEventListener('mousemove',function(e){if(dragging)seekFromEvent(e)});
  document.addEventListener('mouseup',function(){if(dragging){dragging=false;barWrap.classList.remove('dragging')}});

  // Settings menu — quality, speed, captions, captions size/bg/color
  var SUB_COLORS=['#ffffff','#ffeb3b','#00e5ff','#ff5fa8','#4ade80','#ff9500','rainbow'];

  function renderMenu(){
    var html='';
    html+='<div class="menu-head"><span class="title">Settings</span><button class="close" id="menuClose" aria-label="Close">×</button></div>';
    html+='<div class="lbl">Quality</div>';
    html+='<button class="opt" data-q="-1" class="'+(currentLevel===-1?'on':'')+'">Auto</button>';
    levels.slice().sort(function(a,b){return b.h-a.h}).forEach(function(l){
      html+='<button class="opt'+(currentLevel===l.i?' on':'')+'" data-q="'+l.i+'">'+(l.h?l.h+'p':Math.round(l.b/1000)+'k')+'</button>';
    });
    html+='<div class="lbl">Speed</div>';
    RATES.forEach(function(r){html+='<button class="opt'+(rate===r?' on':'')+'" data-r="'+r+'">'+(r===1?'Normal':r+'×')+'</button>'});
    if(subs.length){
      html+='<div class="lbl"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 4H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-10 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z"/></svg>Subtitles</div>';
      html+='<button class="opt'+(activeSub==='off'?' on':'')+'" data-s="off">Off</button>';
      subs.forEach(function(t){var lbl=t.label||'Unknown';html+='<button class="opt'+(activeSub===lbl?' on':'')+'" data-s="'+lbl.replace(/"/g,'&quot;')+'">'+lbl+'</button>'});
      html+='<div class="field"><div class="field-head"><span>Color</span><span class="val">'+(cueColor==='rainbow'?'RAINBOW':cueColor.toUpperCase())+'</span></div><div class="swatches" id="swatches">';
      SUB_COLORS.forEach(function(c){
        var on=(c===cueColor)?' on':'';
        if(c==='rainbow')html+='<button class="swatch rainbow'+on+'" data-c="rainbow" aria-label="Rainbow"></button>';
        else html+='<button class="swatch'+on+'" data-c="'+c+'" style="background:'+c+'" aria-label="'+c+'"></button>';
      });
      html+='</div></div>';
      html+='<div class="field"><div class="field-head"><span>BG Opacity</span><span class="val">'+cueBg+'%</span></div><div class="sub-row"><input type="range" id="bgInp" min="0" max="100" step="5" value="'+cueBg+'"></div></div>';
      html+='<div class="field"><div class="field-head"><span>Size</span><span class="val">'+cueSize+'%</span></div><div class="sub-row"><input type="range" id="szInp" min="70" max="160" step="10" value="'+cueSize+'"></div></div>';
      html+='<div class="cue-preview"><span>Subtitle preview</span></div>';
    }
    menu.innerHTML=html;
    var menuClose=$('menuClose');
    if(menuClose)menuClose.addEventListener('click',function(){menu.classList.remove('show')});
    menu.querySelectorAll('button.opt').forEach(function(btn){
      btn.addEventListener('click',function(){
        if(btn.dataset.q!==undefined){if(hls)hls.currentLevel=parseInt(btn.dataset.q);currentLevel=parseInt(btn.dataset.q);LS.set('quality',btn.dataset.q)}
        if(btn.dataset.r!==undefined){rate=parseFloat(btn.dataset.r);v.playbackRate=rate;LS.set('rate',String(rate))}
        if(btn.dataset.s!==undefined){activeSub=btn.dataset.s;applySub()}
        renderMenu();
      });
    });
    menu.querySelectorAll('.swatch').forEach(function(sw){
      sw.addEventListener('click',function(){
        cueColor=sw.dataset.c;
        var applied=cueColor==='rainbow'?'#ffeb3b':cueColor;
        document.documentElement.style.setProperty('--cue-color',applied);
        LS.set('cueColor',cueColor);renderMenu();
      });
    });
    var szInp=$('szInp'),bgInp=$('bgInp');
    if(szInp)szInp.addEventListener('input',function(){cueSize=parseInt(szInp.value);document.documentElement.style.setProperty('--cue-size',cueSize+'%');LS.set('cueSize',String(cueSize));var v2=szInp.closest('.field').querySelector('.val');if(v2)v2.textContent=cueSize+'%'});
    if(bgInp)bgInp.addEventListener('input',function(){cueBg=parseInt(bgInp.value);document.documentElement.style.setProperty('--cue-bg',(cueBg/100));LS.set('cueBg',String(cueBg));var v2=bgInp.closest('.field').querySelector('.val');if(v2)v2.textContent=cueBg+'%'});
    syncBadges();
  }
  function syncBadges(){
    if(qBadge){
      if(currentLevel===-1)qBadge.textContent='AUTO';
      else{var lv=levels.find(function(l){return l.i===currentLevel});qBadge.textContent=lv&&lv.h?lv.h+'p':'AUTO'}
    }
    if(rateBadge)rateBadge.textContent=rate===1?'AUTO':rate+'×';
  }
  settingsBtn.addEventListener('click',function(e){e.stopPropagation();menu.classList.toggle('show')});
  document.addEventListener('click',function(e){if(!menu.contains(e.target)&&e.target!==settingsBtn&&!settingsBtn.contains(e.target))menu.classList.remove('show')});

  // PiP
  pipBtn.addEventListener('click',function(){
    try{if(document.pictureInPictureElement)document.exitPictureInPicture();else v.requestPictureInPicture&&v.requestPictureInPicture()}catch(e){}
  });
  if(!document.pictureInPictureEnabled)pipBtn.style.display='none';

  // Fullscreen
  fsBtn.addEventListener('click',function(){
    if(document.fullscreenElement)document.exitFullscreen();
    else (wrap.requestFullscreen||wrap.webkitRequestFullscreen||wrap.msRequestFullscreen).call(wrap);
  });

  // Auto-hide UI
  var hideT=null;
  function showUi(){ui.classList.remove('hide');clearTimeout(hideT);hideT=setTimeout(function(){if(!v.paused&&!menu.classList.contains('show'))ui.classList.add('hide')},2800)}
  document.addEventListener('mousemove',showUi);
  document.addEventListener('touchstart',showUi,{passive:true});
  v.addEventListener('pause',function(){ui.classList.remove('hide');clearTimeout(hideT)});
  showUi();

  // Keyboard
  document.addEventListener('keydown',function(e){
    if(e.target.tagName==='INPUT')return;
    if(e.code==='Space'||e.code==='KeyK'){e.preventDefault();togglePlay()}
    else if(e.code==='KeyJ'){v.currentTime=Math.max(0,v.currentTime-60);flash(seekBack,'-1m')}
    else if(e.code==='KeyL'){v.currentTime=Math.min(v.duration||0,v.currentTime+60);flash(seekFwd,'+1m')}
    else if(e.code==='ArrowRight'){v.currentTime=Math.min((v.duration||0),v.currentTime+10);flash(seekFwd,'+10s')}
    else if(e.code==='ArrowLeft'){v.currentTime=Math.max(0,v.currentTime-10);flash(seekBack,'-10s')}
    else if(e.code==='ArrowUp'){e.preventDefault();v.volume=Math.min(1,v.volume+0.1)}
    else if(e.code==='ArrowDown'){e.preventDefault();v.volume=Math.max(0,v.volume-0.1)}
    else if(e.code==='KeyM')v.muted=!v.muted;
    else if(e.code==='KeyF')fsBtn.click();
    else if(e.code==='KeyP')pipBtn.click();
    else if(e.code==='KeyC' && subs.length)ccBtn.click();
    else if(e.code==='KeyN' && D.nextUrl)goNext();
    else if(e.code.startsWith('Digit')){var n=parseInt(e.code.slice(5));if(!isNaN(n)&&v.duration){v.currentTime=v.duration*(n/10)}}
  });
})();
</script>
</body>
</html>`;
}
// ============= EMBED SCRAPER =============
async function handleEmbed(request, splat) {
  try {
    const url = new URL(request.url);
    const parts = splat.split("/").filter(Boolean);
    let mode = "episode";
    let server = "hd-1";
    let audio = "sub";
    let episodeId;
    let anilistId;
    let episodeNum;
    if (parts.length === 3) {
      [server, episodeId, audio] = parts;
    } else if (parts.length === 5 && parts[1] === "ani") {
      mode = "anilist";
      server = parts[0];
      anilistId = parts[2];
      episodeNum = parts[3];
      audio = parts[4];
    } else {
      return htmlError("Invalid embed path", 400);
    }
    const autoplay = url.searchParams.get("autoplay") === "1";
    const skipIntro = url.searchParams.get("skipIntro") === "1";
    const skipOutro = url.searchParams.get("skipOutro") === "1";
    const accent = (url.searchParams.get("color") || "ffffff").replace(/^#/, "");
    const nextUrl = url.searchParams.get("next");
    const upstream = mode === "episode" ? `https://cdn.4animo.xyz/api/embed/${server}/${episodeId}/${audio}?k=1` : `https://cdn.4animo.xyz/api/embed/${server}/ani/${anilistId}/${episodeNum}/${audio}?k=1`;
    const res = await fetch(upstream, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Referer: "https://cdn.4animo.xyz/",
        Accept: "text/html,application/xhtml+xml"
      }
    });
    if (!res.ok) return htmlError(`Upstream returned ${res.status}`, 502);
    const html = await res.text();
    const m3u8Path = pickFirstString(html, "m3u8Url");
    if (!m3u8Path) return htmlError("Could not locate stream", 404);
    const streamRaw = m3u8Path.startsWith("http") ? m3u8Path : `https://cdn.4animo.xyz${m3u8Path}`;
    const stream = await proxify(streamRaw);
    const rawTracks = (pickFirstJson(html, "tracks") ?? []).filter(t => t.file && t.kind !== "thumbnails");
    const tracks = await Promise.all(rawTracks.map(async t => {
      const abs = t.file.startsWith("http") ? t.file : `https://cdn.4animo.xyz${t.file}`;
      return {
        ...t,
        file: await proxify(abs)
      };
    }));
    const intro = pickFirstJson(html, "intro");
    const outro = pickFirstJson(html, "outro");
    const posterRaw = pickFirstString(html, "posterImage");
    const poster = posterRaw && posterRaw !== "null" ? await proxify(posterRaw.startsWith("http") ? posterRaw : `https://cdn.4animo.xyz${posterRaw}`) : null;
    const page = buildPlayerHtml({
      stream,
      tracks,
      intro,
      outro,
      poster,
      autoplay,
      skipIntro,
      skipOutro,
      title: `Embed · ${episodeId ?? `${anilistId}-${episodeNum}`}`,
      accent,
      nextUrl
    });
    return new Response(page, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "X-Frame-Options": "ALLOWALL",
        "Content-Security-Policy": "frame-ancestors *"
      }
    });
  } catch (err) {
    return htmlError(err instanceof Error ? err.message : "Unknown error", 500);
  }
}

// ============= WORKER ENTRY =============

export default {
  async fetch(request, env) {
    setSecret(env.PROXY_SECRET);
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Range, Content-Type"
        }
      });
    }

    // /api/p/<token>
    if (path.startsWith("/api/p/")) {
      const token = path.slice("/api/p/".length);
      return handleProxy(request, token);
    }

    // /api/embed/<...>
    if (path.startsWith("/api/embed/")) {
      const splat = path.slice("/api/embed/".length);
      return handleEmbed(request, splat);
    }

    // Homepage — iframe generator UI
    if (path === "/" || path === "/index.html") {
      return new Response(HOMEPAGE, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300"
        }
      });
    }

    // Health check
    if (path === "/health") {
      return new Response("Z-Player Worker · OK", {
        status: 200,
        headers: {
          "Content-Type": "text/plain"
        }
      });
    }
    return new Response("Not found", {
      status: 404
    });
  }
};