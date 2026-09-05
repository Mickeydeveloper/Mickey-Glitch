const { AIRich, createCtx } = require('../lib/messageBuilder');

// ===== CRASH GAME HTML & JS PAYLOAD =====
function buildCrashPayload() {
    const htmlContent = `<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',Roboto,sans-serif;-webkit-tap-highlight-color:transparent;user-select:none}
body{background:#0b0e14;color:#fff;padding:10px;text-align:center;overflow:hidden}
#app{max-width:400px;margin:0 auto;background:#151922;border-radius:16px;padding:15px;border:1px solid #2a3245;box-shadow:0 10px 25px rgba(0,0,0,0.5)}
.hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.hdr h2{font-size:18px;color:#00e676;font-weight:900;letter-spacing:1px}
.bal{background:#202736;padding:5px 12px;border-radius:20px;font-size:13px;font-weight:bold;color:#ffb300}
.canvas-con{position:relative;width:100%;height:180px;background:#0d1117;border-radius:12px;overflow:hidden;border:1px solid #232d3f;margin-bottom:12px}
#mult{position:absolute;top:40%;left:50%;transform:translate(-50%,-50%);font-size:38px;font-weight:900;color:#fff;text-shadow:0 0 10px rgba(255,255,255,0.2)}
.btn-m{width:100%;padding:14px;border:none;border-radius:10px;font-size:16px;font-weight:bold;cursor:pointer;transition:0.2s;margin-top:5px}
.btn-bet{background:#00c853;color:#fff;box-shadow:0 4px 12px rgba(0,200,83,0.3)}
.btn-cash{background:#ff9100;color:#fff;box-shadow:0 4px 12px rgba(255,145,0,0.3)}
.btn-dis{background:#37474f;color:#78909c;cursor:not-allowed}
.hist{display:flex;gap:5px;overflow-x:auto;margin-top:10px;padding-bottom:5px}
.tag{padding:3px 8px;border-radius:6px;font-size:11px;font-weight:bold;background:#202736}
.tag.win{color:#00e676}.tag.loss{color:#ff5252}
</style>
<div id="app">
    <div class="hdr">
        <h2>🚀 CRASHER LIVE</h2>
        <div class="bal">💰 <span id="bal">1000</span> PTS</div>
    </div>
    <div class="canvas-con">
        <canvas id="c" width="350" height="180"></canvas>
        <div id="mult">1.00x</div>
    </div>
    <button id="btn" class="btn-m btn-bet" onclick="action()">START BET (100 PTS)</button>
    <div class="hist" id="hist"></div>
</div>
<script>
let bal=1000, mult=1.00, crashAt=0, st='idle', timer=null, pts=[], history=[];
const c=document.getElementById('c'), x=c.getContext('2d');
const mEl=document.getElementById('mult'), bEl=document.getElementById('btn'), balEl=document.getElementById('bal'), hEl=document.getElementById('hist');

function drawGraph(){
    x.clearRect(0,0,c.width,c.height);
    if(pts.length<2) return;
    x.beginPath();
    x.moveTo(pts[0].x, pts[0].y);
    for(let p of pts) x.lineTo(p.x, p.y);
    x.strokeStyle = st==='crashed' ? '#ff5252' : '#00e676';
    x.lineWidth = 3;
    x.stroke();
}

function action(){
    if(st==='idle'){
        if(bal<100) return alert('Points hazitoshi!');
        bal-=100; balEl.textContent=bal;
        st='running'; mult=1.00; pts=[{x:0, y:170}];
        crashAt = (Math.random() < 0.05) ? 1.00 : (1 + Math.random()*Math.random()*8).toFixed(2);
        bEl.textContent='CASH OUT ('+(mult.toFixed(2))+'x)';
        bEl.className='btn-m btn-cash';
        
        let t=0;
        timer = setInterval(()=>{
            t += 0.05;
            mult += Math.pow(t, 1.8) * 0.02;
            mEl.textContent = mult.toFixed(2) + 'x';
            mEl.style.color = '#fff';
            
            let px = Math.min(c.width, (mult-1)*35);
            let py = Math.max(10, 170 - (mult-1)*25);
            pts.push({x: px, y: py});
            drawGraph();

            if(st==='running') bEl.textContent = 'CASH OUT (' + (100*mult).toFixed(0) + ' PTS)';

            if(mult >= crashAt){
                endGame(false);
            }
        }, 80);
    } else if(st==='running'){
        endGame(true);
    }
}

function endGame(win){
    clearInterval(timer);
    if(win){
        let winAmt = Math.floor(100 * mult);
        bal += winAmt;
        balEl.textContent = bal;
        mEl.style.color = '#00e676';
        bEl.textContent = 'WON +' + winAmt + ' PTS!';
        addHist(mult.toFixed(2) + 'x', true);
    } else {
        mEl.textContent = 'CRASHED @ ' + crashAt + 'x';
        mEl.style.color = '#ff5252';
        bEl.textContent = 'BOOM! YOU LOST';
        addHist(crashAt + 'x', false);
    }
    st='crashed';
    bEl.className='btn-m btn-dis';
    setTimeout(()=>{
        st='idle';
        bEl.textContent='START BET (100 PTS)';
        bEl.className='btn-m btn-bet';
        mEl.textContent='1.00x';
        mEl.style.color='#fff';
        x.clearRect(0,0,c.width,c.height);
    }, 2500);
}

function addHist(val, win){
    let span = document.createElement('span');
    span.className = 'tag ' + (win ? 'win' : 'loss');
    span.textContent = val;
    hEl.prepend(span);
}
</script>`;

    return {
        view_model: {
            __typename: 'GenAISingleLayoutViewModel',
            primitive: {
                __typename: 'FOAHtmlPrimitiveDemoDONOTUSE',
                trusted_sources: [],
                payload: htmlContent
            }
        }
    };
}

// ===== COMMAND HANDLER =====
const crasherCommand = async (sock, chatId, msg, args) => {
    const ctx = createCtx(sock, chatId, msg, { args });

    const rich = new AIRich(ctx.sock || ctx.core)
        .setTitle('🚀 CRASHER MULTIPLIER GAME')
        .setFooter('Weka dau, Cash Out kabla ya Rocket ku-crash!');

    // Kuongeza HTML UI Payload
    rich.addSection(buildCrashPayload());

    try {
        await rich.send(ctx.chatId, { quoted: ctx.msg });
    } catch (error) {
        console.error('Crasher Game Error:', error?.message || error);
        await ctx.reply('⚠️ Imeshindikana kufungua Crasher Game.');
    }
};

module.exports = crasherCommand;
