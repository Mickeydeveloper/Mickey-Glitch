const os = require('os');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createCtx } = require('../lib/messageBuilder');

// ===== CHROME / PUPPETEER RESOLVER =====
let puppeteer;
try {
    puppeteer = require('puppeteer');
} catch {
    try { puppeteer = require('puppeteer-core'); } catch { puppeteer = null; }
}

const CHROME_PATHS = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean);

function findChrome() {
    for (const p of CHROME_PATHS) {
        try { if (fs.existsSync(p)) return p; } catch {}
    }
    return null;
}

// ===== HELPERS =====
function formatSize(bytes) {
    const u = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0, v = bytes;
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(i === 0 ? 0 : 2)} ${u[i]}`;
}

function getDisk() {
    try {
        const out = execSync('df -kP /', { timeout: 3000 }).toString().trim().split('\n');
        const r = out.slice(1).map(l => l.trim().split(/\s+/))[0];
        const total = +r[1] * 1024, used = +r[2] * 1024;
        return { total, used, percent: +(used / total * 100).toFixed(1) };
    } catch { return null; }
}

function getSwap() {
    try {
        const f = fs.readFileSync('/proc/meminfo', 'utf8');
        const total = (f.match(/^SwapTotal:\s+(\d+)/) || [0, 0])[1] * 1024;
        const free = (f.match(/^SwapFree:\s+(\d+)/) || [0, 0])[1] * 1024;
        if (!total) return null;
        return { total, used: total - free, percent: +((total - free) / total * 100).toFixed(1) };
    } catch { return null; }
}

function getNetwork() {
    const ni = os.networkInterfaces();
    for (const addrs of Object.values(ni)) {
        for (const a of addrs || []) {
            if (!a.internal && a.family === 'IPv4') return a.address;
        }
    }
    return '-';
}

// ===== BROWSER BENCHMARK =====
async function runBrowserBenchmark() {
    if (!puppeteer) {
        throw new Error('Puppeteer haijawekwa. Endesha: npm install puppeteer');
    }
    const chromePath = findChrome();
    const launchOpts = {
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote',
            '--single-process',
        ],
    };
    if (chromePath) launchOpts.executablePath = chromePath;

    const t0 = Date.now();
    const browser = await puppeteer.launch(launchOpts);
    const launchTime = Date.now() - t0;

    let result = { launchTime, engine: 'unknown', chromeVersion: '?', jsScore: 0, domReady: 0, gpu: '?' };
    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 400, height: 800, deviceScaleFactor: 2 });

        const navStart = Date.now();
        await page.goto('about:blank', { waitUntil: 'domcontentloaded' });
        result.domReady = Date.now() - navStart;

        // Detect engine info
        const info = await page.evaluate(() => {
            const ua = navigator.userAgent;
            const gpuCanvas = document.createElement('canvas');
            let gpu = 'software';
            try {
                const gl = gpuCanvas.getContext('webgl') || gpuCanvas.getContext('experimental-webgl');
                if (gl) {
                    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
                    if (dbg) gpu = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || 'webgl';
                    else gpu = 'webgl';
                }
            } catch {}
            return { ua, gpu };
        });
        result.engine = /Chrome\/(\d+)/.exec(info.ua)?.[0] || 'Chrome';
        result.chromeVersion = /Chrome\/([\d.]+)/.exec(info.ua)?.[1] || '?';
        result.gpu = String(info.gpu).split('(')[0].trim().slice(0, 40) || '?';

        // JS benchmark: fibonacci + array sort
        const score = await page.evaluate(() => {
            const t = performance.now();
            // fib(28)
            const fib = (n) => n < 2 ? n : fib(n - 1) + fib(n - 2);
            fib(28);
            // sort 50k random
            const arr = Array.from({ length: 50000 }, () => Math.random());
            arr.sort((a, b) => a - b);
            return Math.round(performance.now() - t);
        });
        // Lower ms = better; normalize to a 0-100 score
        result.jsScore = Math.max(1, Math.min(100, Math.round(10000 / Math.max(score, 50))));
        result.jsRawMs = score;
    } finally {
        await browser.close().catch(() => {});
    }
    return result;
}

// ===== DATA COLLECTION =====
function collect(sock, bench) {
    const cores = os.cpus().length;
    const load = os.loadavg();
    const totalMem = os.totalmem(), freeMem = os.freemem();
    const heap = process.memoryUsage();
    const isBun = typeof Bun !== 'undefined';
    const disk = getDisk();
    return {
        botName: sock?.user?.name || 'MICKEYGLITCH',
        cpu: +Math.min(99.9, (load[0] / Math.max(cores, 1)) * 100).toFixed(1),
        ram: +(((totalMem - freeMem) / totalMem) * 100).toFixed(1),
        disk: disk ? disk.percent : 0,
        cores,
        osType: `${os.type()} ${os.release()}`,
        arch: os.arch(),
        heapUsed: formatSize(heap.heapUsed),
        rss: formatSize(heap.rss),
        swapTxt: (s => s ? `${formatSize(s.used)}/${formatSize(s.total)}` : '—')(getSwap()),
        net: getNetwork(),
        uptime: os.uptime(),
        runtime: isBun ? `Bun ${Bun.version}` : `Node ${process.version}`,
        timezone: 'Africa/Dar_es_Salaam',
        at: Date.now(),
        // browser benchmark
        chromeVersion: bench.chromeVersion,
        launchTime: bench.launchTime,
        domReady: bench.domReady,
        jsScore: bench.jsScore,
        jsRawMs: bench.jsRawMs,
        gpu: bench.gpu,
        engineName: bench.engine,
    };
}

// ===== PAYLOAD (same aesthetics, browser-powered numbers) =====
function buildPayload(d) {
    const DATA = JSON.stringify({
        cpu: d.cpu, ram: d.ram, disk: d.disk,
        timezone: d.timezone, at: d.at,
    }).replace(/</g, '\\u003c');

    return {
        view_model: {
            __typename: 'GenAISingleLayoutViewModel',
            primitive: {
                __typename: 'FOAHtmlPrimitiveDemoDONOTUSE',
                trusted_sources: [],
                payload: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,'Segoe UI',system-ui,sans-serif;-webkit-tap-highlight-color:transparent;user-select:none}
body{background:radial-gradient(circle at 30% 0%,#112b4d 0%,#0a1526 40%,#050a15 100%);padding:10px;color:#e8f0ff;min-height:100vh}
#app{max-width:430px;margin:0 auto;position:relative}

.hdr{display:flex;gap:11px;align-items:center;padding:12px;border-radius:18px;background:linear-gradient(145deg,rgba(234,88,12,.18),rgba(10,25,50,.55));border:1px solid rgba(251,146,60,.32);box-shadow:0 8px 28px rgba(0,0,0,.35);margin-bottom:10px;backdrop-filter:blur(8px)}
.hdr .ico{width:54px;height:54px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:28px;background:linear-gradient(135deg,#ea580c,#f59e0b);box-shadow:0 0 20px rgba(245,158,11,.45)}
.hdr h1{font-size:15px;font-weight:900;color:#fff;letter-spacing:.3px}
.hdr .st{font-size:9.5px;color:#fdba74;font-weight:700;letter-spacing:.5px;margin-top:3px;display:flex;align-items:center;gap:5px}
.dot{width:7px;height:7px;border-radius:50%;background:#fb923c;box-shadow:0 0 10px #fb923c;animation:p 1.4s infinite}
@keyframes p{50%{opacity:.35;transform:scale(.85)}}
.badge{margin-left:auto;font-size:8.5px;font-weight:800;padding:4px 8px;border-radius:8px;background:rgba(251,146,60,.18);color:#fdba74;border:1px solid rgba(251,146,60,.4);letter-spacing:.6px}

.hero{padding:14px;border-radius:16px;background:linear-gradient(135deg,rgba(34,211,238,.12),rgba(59,130,246,.05));border:1px solid rgba(34,211,238,.3);margin-bottom:10px;text-align:center;box-shadow:0 4px 24px rgba(34,211,238,.1)}
.hero .lbl{font-size:8.5px;font-weight:800;letter-spacing:2px;color:#67e8f9;margin-bottom:4px}
.hero .big{font-size:34px;font-weight:900;font-family:'Arial Black',monospace;letter-spacing:1px;background:linear-gradient(90deg,#22d3ee,#3b82f6,#67e8f9);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;text-shadow:0 0 24px rgba(34,211,238,.3)}
.hero .sub{font-size:10px;color:#94a3b8;font-weight:600;margin-top:2px}

.sec{font-size:9px;font-weight:800;letter-spacing:2px;color:#64748b;margin:12px 2px 7px;display:flex;align-items:center;gap:6px}
.sec::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,rgba(100,116,139,.4),transparent)}

.g{padding:11px 13px;border-radius:14px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08);margin-bottom:8px}
.gl{display:flex;justify-content:space-between;align-items:center;font-size:11px;font-weight:700;margin-bottom:7px}
.gl .n{color:#93c5fd;display:flex;gap:6px;align-items:center}
.gl .v{color:#fff;font-weight:800;font-variant-numeric:tabular-nums;font-size:12px}
.bar{height:10px;border-radius:8px;background:rgba(0,0,0,.5);overflow:hidden}
.bar>i{display:block;height:100%;border-radius:8px;background:linear-gradient(90deg,#3b82f6,#22d3ee,#67e8f9);transition:width 1.6s cubic-bezier(.4,.05,.3,1);box-shadow:0 0 12px rgba(34,211,238,.5);position:relative;overflow:hidden}
.bar>i::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent);animation:sh 2.4s infinite}
@keyframes sh{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
.bar.w>i{background:linear-gradient(90deg,#f59e0b,#fbbf24,#fde047)}
.bar.d>i{background:linear-gradient(90deg,#ef4444,#f43f5e,#fb7185);box-shadow:0 0 12px rgba(239,68,68,.6)}

.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.c{padding:9px 11px;border-radius:12px;background:linear-gradient(145deg,rgba(255,255,255,.05),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.08)}
.c .k{font-size:7.5px;font-weight:800;letter-spacing:1.2px;color:#64748b;margin-bottom:3px;display:flex;gap:4px}
.c .v{font-size:10.5px;font-weight:700;color:#e2e8f0;font-family:ui-monospace,monospace;word-break:break-word;line-height:1.3}
.c.full{grid-column:1/-1}
.c.accent{border-color:rgba(251,146,60,.35);background:linear-gradient(145deg,rgba(251,146,60,.12),rgba(251,146,60,.03))}

.ft{display:flex;justify-content:space-between;font-size:8.5px;font-weight:600;color:#475569;padding:10px 4px 4px;margin-top:6px}
.ft b{color:#fb923c;letter-spacing:.5px}
</style>
<div id="app">
  <div class="hdr">
    <div class="ico">🏓</div>
    <div>
      <h1>PONG · BROWSER TEST</h1>
      <div class="st"><span class="dot"></span>CHROME ENGINE · ${d.engineName}</div>
    </div>
    <div class="badge">REAL</div>
  </div>

  <div class="hero">
    <div class="lbl">⚡ JS PERFORMANCE SCORE</div>
    <div class="big" id="score">0</div>
    <div class="sub">fib(28) + sort 50k · ${d.jsRawMs}ms raw</div>
  </div>

  <div class="sec">🚀 CHROME METRICS</div>
  <div class="grid">
    <div class="c"><div class="k">🌐 CHROME</div><div class="v">v${d.chromeVersion}</div></div>
    <div class="c"><div class="k">⏱️ LAUNCH</div><div class="v">${d.launchTime}ms</div></div>
    <div class="c"><div class="k">📄 DOM READY</div><div class="v">${d.domReady}ms</div></div>
    <div class="c"><div class="k">🎨 GPU</div><div class="v">${d.gpu}</div></div>
  </div>

  <div class="sec">📊 SYSTEM</div>
  <div class="g"><div class="gl"><span class="n">⚡ CPU</span><span class="v" id="cv">-</span></div><div class="bar" id="cb"><i style="width:0%"></i></div></div>
  <div class="g"><div class="gl"><span class="n">🧠 RAM</span><span class="v" id="rv">-</span></div><div class="bar" id="rb"><i style="width:0%"></i></div></div>
  <div class="g"><div class="gl"><span class="n">💾 DISK</span><span class="v" id="dv">-</span></div><div class="bar" id="db"><i style="width:0%"></i></div></div>

  <div class="grid" style="margin-top:10px">
    <div class="c"><div class="k">💻 OS</div><div class="v">${d.osType}</div></div>
    <div class="c"><div class="k">🏗️ ARCH</div><div class="v">${d.arch}</div></div>
    <div class="c"><div class="k">⚙️ CPU</div><div class="v">${d.cores}c</div></div>
    <div class="c"><div class="k">🌐 IP</div><div class="v">${d.net}</div></div>
    <div class="c accent full"><div class="k">🚀 RUNTIME</div><div class="v">${d.runtime} · Chrome ${d.chromeVersion}</div></div>
  </div>

  <div class="ft"><span>${d.botName}</span><b>● ${new Date(d.at).toLocaleTimeString('sw-TZ',{timeZone:d.timezone})} EAT</b></div>
</div>
<script>
var D=${DATA};
function $(i){return document.getElementById(i)}
function set(id,val,v){
  var b=$(id),x=b.firstChild;
  x.style.width=Math.min(100,v)+'%';
  $(val).textContent=v.toFixed(1)+'%';
  b.className='bar'+(v>90?' d':v>75?' w':'');
}
function paint(c,r,d){set('cb','cv',c);set('rb','rv',r);set('db','dv',d)}
function breathe(){
  var n=(v,a,l,h)=>Math.max(l,Math.min(h,v+(Math.random()*2-1)*a));
  paint(n(D.cpu,2.5,1,99),n(D.ram,1.2,1,99),n(D.disk,.4,.5,99));
}
paint(0,0,0);setTimeout(breathe,300);setInterval(breathe,2200);
// animate score counter
var target=${d.jsScore},cur=0;
var iv=setInterval(function(){
  cur+=Math.max(1,Math.ceil((target-cur)/8));
  if(cur>=target){cur=target;clearInterval(iv)}
  $('score').textContent=cur;
},40);
</script>
</body></html>`
            }
        }
    };
}

// ===== MAIN COMMAND =====
const pongCommand = async (sock, chatId, msg, args) => {
    const start = Date.now();
    const ctx = createCtx(sock, chatId, msg, { args });

    try {
        // Notify user (benchmark inaweza kuchukua sekunde 2-8)
        await ctx.reply('🏓 Pong! Inafungua browser halisi ya Google Chrome...');

        const bench = await runBrowserBenchmark();
        const d = collect(ctx.sock || ctx.core, bench);
        d.speed = Date.now() - start;

        const rich = new AIRich(ctx.sock || ctx.core)
            .setTitle('🏓 PONG · REAL BROWSER')
            .setFooter(`Chrome ${d.chromeVersion} · ${d.launchTime}ms launch`);

        rich.addSection(buildPayload(d));
        await rich.send(ctx.chatId, { quoted: ctx.msg });

    } catch (error) {
        console.error('pongCommand error:', error?.message || error);
        const hint = String(error.message || '').includes('Puppeteer')
            ? '📦 Endesha: `npm install puppeteer`'
            : 'Hakikisha Chrome imewekwa au weka `CHROME_PATH` kwenye env.';
        await ctx.reply(`⚠️ *Browser test imeshindikana*\n\n${error.message}\n\n${hint}`);
    }
};

module.exports = pongCommand;