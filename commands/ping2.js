const os = require('os');
const fs = require('fs');
const { execSync } = require('child_process');
const { AIRich, createCtx } = require('../lib/messageBuilder');

const BANNER = 'https://c.termai.cc/a199/0Dw0j.jpg';

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
        const used = total - free;
        return { total, used, free, percent: +(used / total * 100).toFixed(1) };
    } catch { return null; }
}

function getNetwork() {
    const ni = os.networkInterfaces();
    let primary = '';
    for (const [, addrs] of Object.entries(ni)) {
        for (const a of addrs || []) {
            if (!a.internal && a.family === 'IPv4' && !primary) primary = a.address;
        }
    }
    return primary || '-';
}

// ===== DATA COLLECTION =====
function collect(sock) {
    const cores = os.cpus().length;
    const load = os.loadavg();
    const totalMem = os.totalmem(), freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const heap = process.memoryUsage();
    const isBun = typeof Bun !== 'undefined';
    const disk = getDisk();
    const uptime = os.uptime();
    return {
        botName: sock?.user?.name || 'MICKEYGLITCH BOT',
        cpu: +Math.min(99.9, (load[0] / Math.max(cores, 1)) * 100).toFixed(1),
        ram: +((usedMem / totalMem) * 100).toFixed(1),
        disk: disk ? disk.percent : 0,
        cores,
        osType: `${os.type()} ${os.release()}`,
        arch: os.arch(),
        heapUsed: formatSize(heap.heapUsed),
        rss: formatSize(heap.rss),
        swapTxt: (s => s ? `${formatSize(s.used)}/${formatSize(s.total)}` : '—')(getSwap()),
        net: getNetwork(),
        uptime: uptime,
        runtime: isBun ? `Bun ${Bun.version}` : `Node ${process.version}`,
        engine: isBun ? 'JSC' : `V8 ${process.versions.v8.split('.')[0]}`,
        timezone: 'Africa/Dar_es_Salaam',
        at: Date.now(),
    };
}

// ===== PAYLOAD BUILDER =====
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
                payload: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,'Segoe UI',system-ui,sans-serif;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none}
body{background:radial-gradient(circle at 20% 0%,#0f1e3d 0%,#0a1526 35%,#050a15 100%);padding:10px;color:#e8f0ff;min-height:100vh;overflow-x:hidden}
#app{max-width:430px;margin:0 auto;position:relative}

/* ambient glow */
#app::before{content:'';position:absolute;top:-40px;left:50%;transform:translateX(-50%);width:260px;height:260px;background:radial-gradient(circle,rgba(59,130,246,.28),transparent 65%);filter:blur(30px);pointer-events:none;z-index:0}

.hdr{position:relative;display:flex;gap:11px;align-items:center;padding:12px;border-radius:18px;background:linear-gradient(145deg,rgba(40,90,180,.22),rgba(10,25,50,.55));border:1px solid rgba(96,165,250,.28);box-shadow:0 8px 28px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.06);margin-bottom:10px;backdrop-filter:blur(8px);z-index:1}
.hdr img{width:54px;height:54px;border-radius:14px;object-fit:cover;border:1.5px solid rgba(120,180,255,.5);box-shadow:0 0 18px rgba(59,130,246,.4)}
.hdr .info{flex:1;min-width:0}
.hdr h1{font-size:16px;font-weight:900;color:#fff;letter-spacing:.3px;display:flex;align-items:center;gap:6px}
.hdr .st{display:flex;align-items:center;gap:6px;font-size:9.5px;color:#4ade80;margin-top:4px;font-weight:600;letter-spacing:.4px}
.hdr .dot{width:7px;height:7px;border-radius:50%;background:#4ade80;box-shadow:0 0 10px #4ade80;animation:pulse-dot 1.6s ease-in-out infinite}
.hdr .badge{margin-left:auto;font-size:8.5px;font-weight:800;padding:4px 8px;border-radius:8px;background:rgba(74,222,128,.15);color:#4ade80;border:1px solid rgba(74,222,128,.35);letter-spacing:.6px}
@keyframes pulse-dot{50%{opacity:.35;transform:scale(.85)}}

.clock-card{position:relative;padding:12px 14px;border-radius:16px;background:linear-gradient(135deg,rgba(34,211,238,.1),rgba(59,130,246,.06));border:1px solid rgba(34,211,238,.28);margin-bottom:10px;box-shadow:0 4px 20px rgba(34,211,238,.08);z-index:1}
.clock-card .lbl{font-size:8.5px;font-weight:800;letter-spacing:2px;color:#67e8f9;opacity:.85;display:flex;align-items:center;gap:5px}
.clock-card .time{font-size:26px;font-weight:900;color:#fff;letter-spacing:1px;font-variant-numeric:tabular-nums;margin:4px 0 2px;text-shadow:0 0 20px rgba(34,211,238,.4);font-family:'Arial Black',monospace}
.clock-card .date{font-size:10px;color:#94a3b8;font-weight:600;letter-spacing:.5px}

.section-title{font-size:9px;font-weight:800;letter-spacing:2px;color:#64748b;margin:12px 2px 7px;display:flex;align-items:center;gap:6px}
.section-title::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,rgba(100,116,139,.4),transparent)}

.gauge{position:relative;padding:11px 13px;border-radius:14px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08);margin-bottom:8px;box-shadow:inset 0 1px 0 rgba(255,255,255,.03);z-index:1}
.gl{display:flex;justify-content:space-between;align-items:center;font-size:11px;font-weight:700;margin-bottom:7px}
.gl .name{display:flex;align-items:center;gap:6px;color:#93c5fd;letter-spacing:.5px}
.gl .name i{font-style:normal;font-size:13px}
.gl .val{color:#fff;font-variant-numeric:tabular-nums;font-weight:800;font-size:12px}
.bar{height:10px;border-radius:8px;background:rgba(0,0,0,.5);overflow:hidden;position:relative;box-shadow:inset 0 1px 3px rgba(0,0,0,.6)}
.bar>i{display:block;height:100%;border-radius:8px;background:linear-gradient(90deg,#3b82f6,#22d3ee,#67e8f9);transition:width 1.6s cubic-bezier(.4,.05,.3,1);box-shadow:0 0 12px rgba(34,211,238,.5);position:relative;overflow:hidden}
.bar>i::after{content:'';position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent);animation:shimmer 2.4s ease-in-out infinite}
@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
.bar.warn>i{background:linear-gradient(90deg,#f59e0b,#fbbf24,#fde047)}
.bar.danger>i{background:linear-gradient(90deg,#ef4444,#f43f5e,#fb7185);box-shadow:0 0 12px rgba(239,68,68,.6)}

.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px;z-index:1;position:relative}
.cell{padding:9px 11px;border-radius:12px;background:linear-gradient(145deg,rgba(255,255,255,.05),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.08);box-shadow:inset 0 1px 0 rgba(255,255,255,.03)}
.cell .k{font-size:7.5px;font-weight:800;letter-spacing:1.2px;color:#64748b;display:flex;align-items:center;gap:4px;margin-bottom:3px}
.cell .k i{font-style:normal;font-size:10px}
.cell .v{font-size:10.5px;font-weight:700;color:#e2e8f0;word-break:break-word;font-family:ui-monospace,monospace;line-height:1.35}
.cell.full{grid-column:1/-1}
.cell.accent{border-color:rgba(59,130,246,.35);background:linear-gradient(145deg,rgba(59,130,246,.1),rgba(59,130,246,.03))}

.ft{display:flex;justify-content:space-between;align-items:center;font-size:8.5px;font-weight:600;color:#475569;padding:10px 4px 4px;margin-top:6px;position:relative;z-index:1}
.ft b{color:#3b82f6;letter-spacing:.5px}
.live-dot{display:inline-block;width:5px;height:5px;border-radius:50%;background:#ef4444;box-shadow:0 0 6px #ef4444;margin-right:3px;animation:pulse-dot 1.2s infinite;vertical-align:middle}
</style>
<div id="app">

<div class="hdr">
  <img src="${BANNER}" onerror="this.style.display='none'">
  <div class="info">
    <h1>📡 Live Monitor</h1>
    <div class="st"><span class="dot"></span>REALTIME · <span id="spd">${d.speed || 0}ms</span></div>
  </div>
  <div class="badge">● LIVE</div>
</div>

<div class="clock-card">
  <div class="lbl">🕒 MUDA WA SASA · EAT</div>
  <div class="time" id="clock">--:--:--</div>
  <div class="date" id="date">--</div>
</div>

<div class="section-title">📊 SYSTEM RESOURCES</div>

<div class="gauge">
  <div class="gl"><span class="name"><i>⚡</i>CPU LOAD</span><span class="val" id="cv">-</span></div>
  <div class="bar" id="cb"><i style="width:0%"></i></div>
</div>

<div class="gauge">
  <div class="gl"><span class="name"><i>🧠</i>RAM</span><span class="val" id="rv">-</span></div>
  <div class="bar" id="rb"><i style="width:0%"></i></div>
</div>

<div class="gauge">
  <div class="gl"><span class="name"><i>💾</i>DISK</span><span class="val" id="dv">-</span></div>
  <div class="bar" id="db"><i style="width:0%"></i></div>
</div>

<div class="section-title">🔧 SYSTEM INFO</div>

<div class="grid">
  <div class="cell"><div class="k"><i>💻</i>OS</div><div class="v">${d.osType}</div></div>
  <div class="cell"><div class="k"><i>🏗️</i>ARCH</div><div class="v">${d.arch}</div></div>
  <div class="cell"><div class="k"><i>⚙️</i>CPU</div><div class="v">${d.cores} cores</div></div>
  <div class="cell"><div class="k"><i>📦</i>HEAP/RSS</div><div class="v">${d.heapUsed} / ${d.rss}</div></div>
  <div class="cell"><div class="k"><i>🔄</i>SWAP</div><div class="v">${d.swapTxt}</div></div>
  <div class="cell"><div class="k"><i>🌐</i>IP</div><div class="v">${d.net}</div></div>
  <div class="cell accent full"><div class="k"><i>🚀</i>RUNTIME</div><div class="v">${d.runtime} · ${d.engine}</div></div>
</div>

<div class="ft">
  <span id="age"><span class="live-dot"></span>imepimwa 0s zilizopita</span>
  <b>${d.botName}</b>
</div>

</div>
<script>
var D=${DATA};
function $(i){return document.getElementById(i)}

function paint(cpu,ram,disk){
  var set=function(barId,valId,v){
    var b=$(barId),i=b.firstChild;
    i.style.width=Math.min(100,v)+'%';
    $(valId).textContent=v.toFixed(1)+'%';
    b.className='bar'+(v>90?' danger':v>75?' warn':'');
  };
  set('cb','cv',cpu);set('rb','rv',ram);set('db','dv',disk);
}

function tick(){
  var now=new Date();
  try{
    var t=new Intl.DateTimeFormat('sw-TZ',{timeZone:D.timezone,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now);
    var d=new Intl.DateTimeFormat('sw-TZ',{timeZone:D.timezone,weekday:'short',day:'2-digit',month:'short',year:'numeric'}).format(now);
    $('clock').textContent=t;
    $('date').textContent=d;
  }catch(e){}
  var s=Math.floor((Date.now()-D.at)/1000);
  $('age').innerHTML='<span class="live-dot"></span>imepimwa '+s+'s zilizopita';
}

function breathe(){
  var n=function(v,amp,lo,hi){
    var x=v+(Math.random()*2-1)*amp;
    return Math.max(lo,Math.min(hi,x));
  };
  paint(n(D.cpu,2.5,1,99),n(D.ram,1.2,1,99),n(D.disk,.4,.5,99));
}

paint(0,0,0);
setTimeout(breathe,300);
setInterval(breathe,2200);
setInterval(tick,1000);tick();
</script>
</body></html>`
            }
        }
    };
}

// ===== MAIN COMMAND =====
const ping2Command = async (sock, chatId, msg, args) => {
    const start = Date.now();
    const ctx = createCtx(sock, chatId, msg, { args });

    const d = collect(ctx.sock || ctx.core);
    d.speed = Date.now() - start;

    const rich = new AIRich(ctx.sock || ctx.core)
        .setTitle('📡 SERVER LIVE MONITOR')
        .setFooter('Real-time · Breathing UI · MICKEYGLITCH');

    rich.addSection(buildPayload(d));

    try {
        await rich.send(ctx.chatId, { quoted: ctx.msg });
    } catch (error) {
        console.error('ping2Command error:', error?.message || error);
        await ctx.reply('⚠️ Imeshindikana kutuma Live Monitor UI.');
    }
};

module.exports = ping2Command;