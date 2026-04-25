/**
 * ============================================================================
 *  Z-PLAYER · ALL-IN-ONE CLOUDFLARE WORKER (HEAVY NUMERIC OBFUSCATION)
 * ============================================================================
 *
 *  Frontend (UI generator)  +  Backend (player + encrypted proxy)
 *  Network tab me sirf numeric bytecode dikhta hai. No readable URLs.
 *
 *  Routes:
 *    GET  /                       → Frontend UI (iframe generator)
 *    GET  /health                 → "OK"
 *    GET  /e/:server/:id/:audio   → Player page (HD-1, HD-2, HD-3 / sub|dub)
 *    GET  /v/:k/:blob             → Obfuscated stream proxy (m3u8/ts/vtt)
 *
 *  Setup:
 *    wrangler secret put PROXY_SECRET   (32+ random chars; REQUIRED)
 *    wrangler deploy
 * ============================================================================
 */

// ---------------------------------------------------------------------------
//  CONFIG
// ---------------------------------------------------------------------------

const FALLBACK_SECRET =
  "z-player-default-do-not-use-in-prod-please-set-PROXY_SECRET-env-var-32b";

const UPSTREAM_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Referer: "https://cdn.4animo.xyz/",
  Origin:  "https://cdn.4animo.xyz",
};

// 4animo upstream API (server scraper)
const SOURCE_API = "https://4animo.xyz/api/v1/episode/sources";

// ---------------------------------------------------------------------------
//  HEAVY NUMERIC OBFUSCATION LAYER
//  ---------------------------------------------------------------------------
//  Pipeline (encode):
//     plain URL string
//       → UTF-8 bytes
//       → AES-GCM encrypt (12-byte IV prepended)
//       → XOR-rolled with key-derived stream
//       → split into 2-byte words
//       → each word → base36 (0..zzzz)
//       → joined with "." separator
//
//  Result example (network tab):
//     /v/7f/3a8x.9k2.bn4.zz1.4mp.q8w.a3e.0xx.92k.lm5.pr3.ee9.7tb...
//
//  No domain, no extension, no readable hex. Decoder reverses everything.
// ---------------------------------------------------------------------------

let _keyPromise = null;
function getSecret(env) {
  return (env && env.PROXY_SECRET) || FALLBACK_SECRET;
}
function getKey(env) {
  if (_keyPromise) return _keyPromise;
  _keyPromise = (async () => {
    const raw = new TextEncoder().encode(getSecret(env));
    const hash = await crypto.subtle.digest("SHA-256", raw);
    return crypto.subtle.importKey(
      "raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]
    );
  })();
  return _keyPromise;
}

// Derive a deterministic XOR keystream from secret + nonce
async function deriveStream(env, nonce, length) {
  const enc = new TextEncoder();
  const seed = enc.encode(getSecret(env) + ":" + nonce);
  let h = await crypto.subtle.digest("SHA-256", seed);
  const out = new Uint8Array(length);
  let pos = 0;
  while (pos < length) {
    const view = new Uint8Array(h);
    const take = Math.min(view.length, length - pos);
    out.set(view.subarray(0, take), pos);
    pos += take;
    // chain: rehash for next block
    h = await crypto.subtle.digest("SHA-256", view);
  }
  return out;
}

// Convert bytes -> array of base36 "words" joined by "."
function bytesToNumericBlob(bytes) {
  // Pad to even length
  const padded = bytes.length % 2 === 0
    ? bytes
    : (() => {
        const p = new Uint8Array(bytes.length + 1);
        p.set(bytes); p[bytes.length] = 0xAA; // pad marker
        return p;
      })();
  const parts = [];
  for (let i = 0; i < padded.length; i += 2) {
    const word = (padded[i] << 8) | padded[i + 1]; // 0..65535
    parts.push(word.toString(36));
  }
  return parts.join(".");
}

function numericBlobToBytes(blob) {
  const parts = blob.split(".");
  const out = new Uint8Array(parts.length * 2);
  for (let i = 0; i < parts.length; i++) {
    const word = parseInt(parts[i], 36);
    if (!Number.isFinite(word) || word < 0 || word > 0xFFFF) {
      throw new Error("Bad word at " + i);
    }
    out[i * 2]     = (word >> 8) & 0xFF;
    out[i * 2 + 1] = word & 0xFF;
  }
  return out;
}

// Encode upstream URL → { k, blob } (both numeric strings)
async function encodeUrl(env, url) {
  const key = await getKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv }, key, new TextEncoder().encode(url)
    )
  );

  // [iv(12) | ct]
  const buf = new Uint8Array(iv.length + ct.length);
  buf.set(iv, 0);
  buf.set(ct, iv.length);

  // XOR with rolling stream derived from a per-token nonce
  const nonceBytes = crypto.getRandomValues(new Uint8Array(3));
  const nonce = bytesToNumericBlob(nonceBytes); // short numeric "k"
  const stream = await deriveStream(env, nonce, buf.length);
  for (let i = 0; i < buf.length; i++) buf[i] ^= stream[i];

  // Pad with random length prefix to disguise size
  const pad = crypto.getRandomValues(new Uint8Array(1))[0] & 0x07; // 0..7
  const padded = new Uint8Array(1 + pad + buf.length);
  padded[0] = pad;
  if (pad > 0) padded.set(crypto.getRandomValues(new Uint8Array(pad)), 1);
  padded.set(buf, 1 + pad);

  const blob = bytesToNumericBlob(padded);
  return { k: nonce, blob };
}

async function decodeUrl(env, k, blob) {
  const padded = numericBlobToBytes(blob);
  if (padded.length < 1) throw new Error("Empty");
  const pad = padded[0];
  let buf = padded.slice(1 + pad);

  // Strip pad-marker byte if odd-padding was added
  // (we can't know reliably here, decryption GCM tag will fail if wrong;
  //  so try the raw buffer, then trimmed version)
  const stream = await deriveStream(env, k, buf.length);
  const xored = new Uint8Array(buf.length);
  for (let i = 0; i < buf.length; i++) xored[i] = buf[i] ^ stream[i];

  const key = await getKey(env);
  const iv = xored.slice(0, 12);
  let ct = xored.slice(12);

  // Try as-is, then with trailing pad-marker byte stripped
  for (const candidate of [ct, ct.slice(0, ct.length - 1)]) {
    try {
      const pt = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv }, key, candidate
      );
      return new TextDecoder().decode(pt);
    } catch (_) { /* try next */ }
  }
  throw new Error("Decrypt failed");
}

async function proxify(env, url) {
  const { k, blob } = await encodeUrl(env, url);
  return `/v/${k}/${blob}`;
}

// ---------------------------------------------------------------------------
//  M3U8 REWRITER
// ---------------------------------------------------------------------------

function isM3U8(url, contentType) {
  if (contentType && /mpegurl|m3u8/i.test(contentType)) return true;
  return /\.m3u8(\?|$)/i.test(url);
}

async function rewriteM3U8(env, text, baseUrl) {
  const base = new URL(baseUrl);
  const lines = text.split(/\r?\n/);
  const out = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { out.push(line); continue; }

    if (trimmed.startsWith("#")) {
      // Rewrite URI="..." attrs
      const re = /URI="([^"]+)"/g;
      let result = line;
      const found = [];
      let m;
      while ((m = re.exec(line)) !== null) found.push({ raw: m[0], url: m[1] });
      for (const { raw, url } of found) {
        try {
          const abs = new URL(url, base).toString();
          const proxied = await proxify(env, abs);
          result = result.replace(raw, `URI="${proxied}"`);
        } catch (_) { /* skip */ }
      }
      out.push(result);
      continue;
    }

    try {
      const abs = new URL(trimmed, base).toString();
      out.push(await proxify(env, abs));
    } catch (_) {
      out.push(line);
    }
  }

  return out.join("\n");
}

// ---------------------------------------------------------------------------
//  UPSTREAM SOURCE FETCH (server scraper)
// ---------------------------------------------------------------------------

async function fetchSources(server, episodeId, audio) {
  const url = `${SOURCE_API}?id=${encodeURIComponent(episodeId)}` +
              `&server=${encodeURIComponent(server)}` +
              `&type=${encodeURIComponent(audio)}`;
  const r = await fetch(url, { headers: UPSTREAM_HEADERS });
  if (!r.ok) throw new Error(`Upstream ${r.status}`);
  return await r.json();
}

// ---------------------------------------------------------------------------
//  PLAYER HTML (served at /e/:server/:id/:audio)
// ---------------------------------------------------------------------------

function playerHTML({ src, tracks, color, autoplay, intro, outro }) {
  const safeColor = /^#?[0-9a-fA-F]{3,8}$/.test(color)
    ? (color.startsWith("#") ? color : "#" + color)
    : "#ff5722";
  const data = JSON.stringify({ src, tracks, color: safeColor, autoplay: !!autoplay, intro, outro });

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<meta name="referrer" content="no-referrer"/>
<title>Player</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:100%;height:100%;background:#000;overflow:hidden;font-family:system-ui,sans-serif}
  #wrap{position:fixed;inset:0;background:#000}
  video{width:100%;height:100%;object-fit:contain;background:#000}
  #ld{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;background:#000;z-index:5}
  .sp{width:36px;height:36px;border:3px solid rgba(255,255,255,.15);border-top-color:${safeColor};border-radius:50%;animation:s 1s linear infinite}
  @keyframes s{to{transform:rotate(360deg)}}
  #er{position:absolute;inset:0;display:none;align-items:center;justify-content:center;color:#fff;background:#000;text-align:center;padding:20px;z-index:6}
  #skip{position:absolute;right:18px;bottom:80px;background:${safeColor};color:#fff;border:0;padding:10px 18px;border-radius:6px;font-weight:600;cursor:pointer;display:none;z-index:10;box-shadow:0 4px 16px rgba(0,0,0,.5)}
</style>
</head><body>
<div id="wrap">
  <video id="v" controls playsinline crossorigin="anonymous" disablepictureinpicture controlslist="nodownload"></video>
  <div id="ld"><div class="sp"></div></div>
  <div id="er">⚠ Playback failed.</div>
  <button id="skip">Skip</button>
</div>
<script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js"></script>
<script>
(function(){
  var D = ${data};
  var v = document.getElementById('v');
  var ld = document.getElementById('ld');
  var er = document.getElementById('er');
  var skip = document.getElementById('skip');

  function showErr(){ ld.style.display='none'; er.style.display='flex'; }
  function hideLd(){ ld.style.display='none'; }

  // attach subtitle tracks
  (D.tracks||[]).forEach(function(t,i){
    if(!t || !t.file) return;
    var tr = document.createElement('track');
    tr.kind = (t.kind||'subtitles');
    tr.label = t.label || ('Track '+(i+1));
    tr.srclang = t.lang || 'en';
    tr.src = t.file;
    if(t.default) tr.default = true;
    v.appendChild(tr);
  });

  function play(){
    if(D.autoplay){ v.muted=true; v.play().catch(function(){}); }
  }

  if(window.Hls && Hls.isSupported()){
    var h = new Hls({ maxBufferLength:30, lowLatencyMode:false });
    h.loadSource(D.src);
    h.attachMedia(v);
    h.on(Hls.Events.MANIFEST_PARSED, function(){ hideLd(); play(); });
    h.on(Hls.Events.ERROR, function(_,d){ if(d.fatal) showErr(); });
  } else if(v.canPlayType('application/vnd.apple.mpegurl')){
    v.src = D.src;
    v.addEventListener('loadedmetadata', function(){ hideLd(); play(); });
    v.addEventListener('error', showErr);
  } else { showErr(); }

  // intro/outro skip
  function inRange(t,r){ return r && r.length===2 && t>=r[0] && t<r[1]; }
  v.addEventListener('timeupdate', function(){
    var t = v.currentTime, show = false, target = 0;
    if(inRange(t, D.intro)){ show = true; target = D.intro[1]; skip.textContent='Skip Intro'; }
    else if(inRange(t, D.outro)){ show = true; target = D.outro[1]; skip.textContent='Skip Outro'; }
    skip.style.display = show ? 'block' : 'none';
    skip.onclick = function(){ v.currentTime = target; skip.style.display='none'; };
  });
})();
</script>
</body></html>`;
}

// ---------------------------------------------------------------------------
//  EMBED ROUTE HANDLER (/e/:server/:id/:audio)
// ---------------------------------------------------------------------------

async function handleEmbed(env, url, server, id, audio) {
  try {
    const data = await fetchSources(server, id, audio);
    // Expecting: { sources:[{file,type}], tracks:[...], intro:[s,e], outro:[s,e] }
    const file = data?.sources?.[0]?.file;
    if (!file) {
      return new Response("No stream found", { status: 404 });
    }

    const proxiedSrc = await proxify(env, file);

    // Proxy subtitle tracks too
    const tracks = [];
    for (const t of (data.tracks || [])) {
      if (!t || !t.file) continue;
      tracks.push({
        file: await proxify(env, t.file),
        kind: t.kind || "subtitles",
        label: t.label,
        lang: t.lang,
        default: !!t.default,
      });
    }

    const params = url.searchParams;
    const html = playerHTML({
      src: proxiedSrc,
      tracks,
      color: params.get("color") || "ff5722",
      autoplay: params.get("autoplay") === "1",
      intro: data.intro && data.intro.length === 2 ? data.intro : null,
      outro: data.outro && data.outro.length === 2 ? data.outro : null,
    });

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Frame-Options": "ALLOWALL",
        "Content-Security-Policy": "frame-ancestors *",
      },
    });
  } catch (e) {
    return new Response("Embed error: " + (e?.message || e), { status: 502 });
  }
}

// ---------------------------------------------------------------------------
//  PROXY ROUTE HANDLER (/v/:k/:blob)
// ---------------------------------------------------------------------------

async function handleProxy(env, request, k, blob) {
  let upstreamUrl;
  try {
    upstreamUrl = await decodeUrl(env, k, blob);
  } catch (_) {
    return new Response("Invalid", { status: 403 });
  }

  const fwd = { ...UPSTREAM_HEADERS };
  const range = request.headers.get("range");
  if (range) fwd["Range"] = range;

  const upstream = await fetch(upstreamUrl, { headers: fwd });
  const ct = upstream.headers.get("content-type");

  if (isM3U8(upstreamUrl, ct)) {
    const text = await upstream.text();
    const rewritten = await rewriteM3U8(env, text, upstreamUrl);
    return new Response(rewritten, {
      status: upstream.status,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  const headers = new Headers();
  for (const h of ["content-type","content-length","content-range",
                   "accept-ranges","cache-control","etag","last-modified"]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  headers.set("Access-Control-Allow-Origin", "*");

  return new Response(upstream.body, { status: upstream.status, headers });
}

// ---------------------------------------------------------------------------
//  HOMEPAGE (frontend iframe generator)
// ---------------------------------------------------------------------------

const HOMEPAGE = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Z-Player · Embed Generator</title>
<style>
  :root{--bg:#0a0a0f;--panel:#13131c;--panel2:#1a1a26;--border:#252535;--text:#e8e8ee;--mute:#7a7a8c;--accent:#ff5722;--accent2:#ff7849}
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--text);font-family:'Inter',system-ui,sans-serif;min-height:100vh;line-height:1.5}
  .container{max-width:1200px;margin:0 auto;padding:32px 24px}
  header{display:flex;align-items:center;gap:12px;margin-bottom:32px}
  .logo{width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,var(--accent),var(--accent2));display:grid;place-items:center;font-weight:800;font-size:20px}
  h1{font-size:22px;font-weight:700;letter-spacing:-.02em}
  .sub{color:var(--mute);font-size:13px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}
  @media(max-width:900px){.grid{grid-template-columns:1fr}}
  .card{background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:24px}
  .card h2{font-size:14px;text-transform:uppercase;letter-spacing:.08em;color:var(--mute);margin-bottom:16px;font-weight:600}
  label{display:block;font-size:12px;color:var(--mute);margin-bottom:6px;font-weight:500;text-transform:uppercase;letter-spacing:.05em}
  input,select{width:100%;background:var(--panel2);border:1px solid var(--border);color:var(--text);padding:11px 14px;border-radius:8px;font-size:14px;font-family:inherit;transition:border .15s}
  input:focus,select:focus{outline:none;border-color:var(--accent)}
  .row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
  .field{margin-bottom:14px}
  .pills{display:flex;gap:8px;flex-wrap:wrap}
  .pill{flex:1;min-width:80px;background:var(--panel2);border:1px solid var(--border);padding:10px;border-radius:8px;text-align:center;cursor:pointer;font-size:13px;font-weight:500;transition:all .15s;user-select:none}
  .pill:hover{border-color:#3a3a50}
  .pill.active{background:linear-gradient(135deg,var(--accent),var(--accent2));border-color:transparent;color:#fff}
  .toggles{display:flex;flex-direction:column;gap:10px}
  .toggle{display:flex;align-items:center;gap:10px;background:var(--panel2);padding:10px 14px;border-radius:8px;border:1px solid var(--border);cursor:pointer;font-size:13px}
  .toggle input{width:auto;margin:0}
  .preview{aspect-ratio:16/9;background:#000;border-radius:10px;overflow:hidden;border:1px solid var(--border);margin-bottom:14px}
  .preview iframe{width:100%;height:100%;border:0}
  .empty{display:grid;place-items:center;width:100%;height:100%;color:var(--mute);font-size:13px}
  textarea{width:100%;min-height:110px;background:#000;border:1px solid var(--border);color:#9affc4;padding:12px;border-radius:8px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;resize:vertical;line-height:1.6}
  .btn{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;border:0;padding:12px 18px;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;width:100%;margin-top:10px;transition:transform .1s}
  .btn:hover{transform:translateY(-1px)}
  .btn:active{transform:translateY(0)}
  .info{margin-top:24px;padding:16px;background:var(--panel);border:1px solid var(--border);border-radius:10px;font-size:12px;color:var(--mute);line-height:1.7}
  .info code{background:#000;padding:2px 6px;border-radius:4px;color:var(--accent2);font-family:ui-monospace,monospace}
  footer{margin-top:32px;text-align:center;color:var(--mute);font-size:12px}
</style>
</head><body>
<div class="container">
  <header>
    <div class="logo">Z</div>
    <div>
      <h1>Z-Player Embed Generator</h1>
      <div class="sub">Heavy obfuscated stream proxy · Numeric bytecode network layer</div>
    </div>
  </header>

  <div class="grid">
    <div class="card">
      <h2>Configuration</h2>

      <div class="field">
        <label>Mode</label>
        <div class="pills" id="mode">
          <div class="pill active" data-v="ep">Episode ID</div>
          <div class="pill" data-v="al">AniList ID</div>
        </div>
      </div>

      <div class="field">
        <label id="idLabel">Episode ID</label>
        <input id="id" placeholder="e.g. one-piece-100?ep=1"/>
      </div>

      <div class="row">
        <div>
          <label>Server</label>
          <div class="pills" id="server">
            <div class="pill active" data-v="hd-1">HD-1</div>
            <div class="pill" data-v="hd-2">HD-2</div>
            <div class="pill" data-v="hd-3">HD-3</div>
          </div>
        </div>
        <div>
          <label>Audio</label>
          <div class="pills" id="audio">
            <div class="pill active" data-v="sub">Sub</div>
            <div class="pill" data-v="dub">Dub</div>
          </div>
        </div>
      </div>

      <div class="row">
        <div>
          <label>Accent Color</label>
          <input id="color" value="ff5722"/>
        </div>
        <div>
          <label>Episode # (optional)</label>
          <input id="epnum" placeholder="1" type="number" min="1"/>
        </div>
      </div>

      <div class="field">
        <label>Options</label>
        <div class="toggles">
          <label class="toggle"><input type="checkbox" id="autoplay" checked/> Auto Play</label>
          <label class="toggle"><input type="checkbox" id="intro" checked/> Skip Intro Button</label>
          <label class="toggle"><input type="checkbox" id="outro" checked/> Skip Outro Button</label>
        </div>
      </div>

      <button class="btn" onclick="gen()">Generate Embed</button>
    </div>

    <div class="card">
      <h2>Live Preview</h2>
      <div class="preview" id="prev">
        <div class="empty">Configure and click Generate</div>
      </div>
      <label>Embed Code</label>
      <textarea id="code" readonly placeholder="Iframe code appears here..."></textarea>
      <button class="btn" onclick="copyCode()">Copy Embed Code</button>
    </div>
  </div>

  <div class="info">
    <strong style="color:var(--text)">How obfuscation works:</strong><br/>
    Stream URLs are AES-GCM encrypted, XOR-rolled with a per-token keystream, then
    encoded as base36 numeric words separated by dots. In your browser's Network tab,
    you'll only see paths like <code>/v/7f3/3a8x.9k2.bn4.zz1.4mp...</code> —
    no domains, no extensions, no readable hex. Set <code>PROXY_SECRET</code> via
    <code>wrangler secret put PROXY_SECRET</code> for production use.
  </div>

  <footer>Z-Player · Single Worker · Frontend + Backend</footer>
</div>

<script>
  var state = { mode:'ep', server:'hd-1', audio:'sub' };
  document.querySelectorAll('.pills').forEach(function(g){
    g.addEventListener('click', function(e){
      var p = e.target.closest('.pill'); if(!p) return;
      g.querySelectorAll('.pill').forEach(function(x){x.classList.remove('active')});
      p.classList.add('active');
      state[g.id] = p.dataset.v;
      if(g.id==='mode'){
        document.getElementById('idLabel').textContent = p.dataset.v==='al' ? 'AniList ID' : 'Episode ID';
        document.getElementById('id').placeholder = p.dataset.v==='al' ? 'e.g. 21' : 'e.g. one-piece-100?ep=1';
      }
    });
  });

  function gen(){
    var id = document.getElementById('id').value.trim();
    if(!id){ alert('Enter an ID'); return; }
    var color = document.getElementById('color').value.trim().replace('#','') || 'ff5722';
    var ap = document.getElementById('autoplay').checked ? '1' : '0';
    var origin = location.origin;
    var url = origin + '/e/' + state.server + '/' + encodeURIComponent(id) + '/' + state.audio
            + '?autoplay=' + ap + '&color=' + color;
    var iframe = '<iframe src="' + url + '" '
               + 'allowfullscreen allow="autoplay; picture-in-picture; fullscreen" '
               + 'style="width:100%;aspect-ratio:16/9;border:0"></iframe>';
    document.getElementById('prev').innerHTML = '<iframe src="'+url+'" allowfullscreen allow="autoplay" style="width:100%;height:100%;border:0"></iframe>';
    document.getElementById('code').value = iframe;
  }
  function copyCode(){
    var t = document.getElementById('code');
    if(!t.value){ alert('Generate first'); return; }
    t.select(); document.execCommand('copy');
    alert('Copied!');
  }
</script>
</body></html>`;

// ---------------------------------------------------------------------------
//  ROUTER
// ---------------------------------------------------------------------------

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Range, Content-Type",
        },
      });
    }

    // Health
    if (p === "/health") {
      return new Response("OK", { headers: { "Content-Type": "text/plain" } });
    }

    // Homepage
    if (p === "/" || p === "/index.html") {
      return new Response(HOMEPAGE, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    // Embed: /e/:server/:id/:audio
    let m = p.match(/^\/e\/([^\/]+)\/([^\/]+)\/([^\/]+)\/?$/);
    if (m) {
      return handleEmbed(env, url, decodeURIComponent(m[1]),
                         decodeURIComponent(m[2]), decodeURIComponent(m[3]));
    }

    // Proxy: /v/:k/:blob
    m = p.match(/^\/v\/([^\/]+)\/(.+)$/);
    if (m) {
      return handleProxy(env, request, m[1], m[2]);
    }

    return new Response("Not found", { status: 404 });
  },
};
