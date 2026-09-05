const { AIRich, createCtx } = require('../lib/messageBuilder');

// ===== MICKEY AVIATOR HTML & JS UI PAYLOAD =====
function buildAviatorPayload() {
    const htmlContent = `<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-tap-highlight-color:transparent;user-select:none}
body{background:#000;color:#fff;padding:4px;overflow-x:hidden}
#app{max-width:420px;margin:0 auto;background:#121212;border-radius:12px;overflow:hidden;border:1px solid #222}

/* Header UI */
.top-nav{background:#000;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #1a1a1a}
.brand{color:#e52d27;font-weight:900;font-size:18px;font-style:italic;display:flex;align-items:center;gap:6px}
.brand span{color:#fff;font-style:normal;font-weight:700;font-size:14px}
.bal-box{font-size:14px;font-weight:700;color:#fff}

/* History Bar */
.hist-bar{display:flex;gap:6px;padding:6px 10px;background:#0a0a0a;overflow-x:auto;white-space:nowrap;border-bottom:1px solid #1a1a1a}
.hist-item{font-size:11px;font-weight:700;padding:2px 7px;border-radius:10px;background:#1a1c23;color:#3b82f6}
.hist-item.purple{color:#a855f7}

/* Canvas Display Area */
.display-area{position:relative;width:100%;height:210px;background:radial-gradient(circle at center,#1e293b 0%,#0f172a 70%,#020617 100%);overflow:hidden}
#aviatorCanvas{width:100%;height:100%;display:block}
.mult-text{position:absolute;top:45%;left:50%;transform:translate(-50%,-50%);font-size:48px;font-weight:900;color:#fff;text-shadow:0 0 20px rgba(0,0,0,0.8);z-index:10}
.mult-text.flew{color:#dc2626}
.flew-label{position:absolute;top:28%;left:50%;transform:translateX(-50%);font-size:14px;font-weight:800;color:#dc2626;letter-spacing:2px;z-index:10;display:none}

/* Bet Control Panel */
.bet-panel{background:#18181c;padding:10px;margin:6px;border-radius:12px;border:1px solid #26262b}
.tab-row{display:flex;justify-content:center;gap:15px;margin-bottom:8px}
.tab-btn{background:none;border:none;color:#a1a1aa;font-size:12px;font-weight:600;padding-bottom:2px}
.tab-btn.active{color:#fff;border-bottom:2px solid #e52d27}

.controls{display:flex;gap:8px;align-items:center}
.amount-box{flex:1;background:#09090b;border-radius:8px;padding:6px;border:1px solid #27272a}
.amt-input{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.amt-btn{background:#27272a;border:none;color:#fff;width:24px;height:24px;border-radius:50%;font-weight:bold;cursor:pointer}
.amt-val{font-size:15px;font-weight:700;color:#fff}

.preset-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px}
.preset-btn{background:#27272a;border:none;color:#a1a1aa;padding:4px;border-radius:4px;font-size:10px;font-weight:600}

/* Big Green Action Button */
.action-btn{flex:1.2;height:72px;background:#16a34a;border:none;border-radius:12px;color:#fff;font-weight:800;font-size:15px;cursor:pointer;display:flex;flex-direction:column;justify-content:center;align-items:center;box-shadow:0 4px 12px rgba(22,163,74,0.3)}
.action-btn.cashout{background:#d97706;box-shadow:0 4px 12px rgba(217,119,6,0.3)}
.action-btn.disabled{background:#3f3f46;color:#71717a;cursor:not-allowed;box-shadow:none}
.btn-sub{font-size:12px;font-weight:600;margin-top:2px}
</style>

<div id="app">
    <!-- Header -->
    <div class="top-nav">
        <div class="brand">✈️ Mickey Aviator</div>
        <div class="bal-box"><span id="bal">10,000.00</span> TZS</div>
    </div>

    <!-- Multiplier History -->
    <div class="hist-bar" id="histBar">
        <span class="hist-item">1.03x</span>
        <span class="hist-item purple">2.53x</span>
        <span class="hist-item">1.72x</span>
        <span class="hist-item">1.11x</span>
        <span class="hist-item purple">4.55x</span>
        <span class="hist-item">1.75x</span>
    </div>

    <!-- Game Canvas -->
    <div class="display-area">
        <div class="flew-label" id="flewLabel">IMEPERUKA!</div>
        <div class="mult-text" id="multText">1.00x</div>
        <canvas id="aviatorCanvas" width="380" height="210"></canvas>
    </div>

    <!-- Bet Controls Panel -->
    <div class="bet-panel">
        <div class="tab-row">
            <button class="tab-btn active">Weka dau</button>
            <button class="tab-btn">Ototomatiki</button>
        </div>
        <div class="controls">
            <div class="amount-box">
                <div class="amt-input">
                    <button class="amt-btn" onclick="adj(-1000)">-</button>
                    <span class="amt-val" id="betAmt">5,000.00</span>
                    <button class="amt-btn" onclick="adj(1000)">+</button>
                </div>
                <div class="preset-grid">
                    <button class="preset-btn" onclick="setBet(1000)">1,000</button>
                    <button class="preset-btn" onclick="setBet(5000)">5,000</button>
                    <button class="preset-btn" onclick="setBet(10000)">10,000</button>
                </div>
            </div>
            <button id="mainBtn" class="action-btn" onclick="handleAction()">
                <span>Weka dau</span>
                <span class="btn-sub" id="btnSub">5,000.00 TZS</span>
            </button>
        </div>
    </div>
</div>

<script>
let balance = 10000, currentBet = 5000, multiplier = 1.00, crashPoint = 0;
let gameState = 'IDLE', timer = null, progress = 0;

const canvas = document.getElementById('aviatorCanvas');
const ctx = canvas.getContext('2d');
const multText = document.getElementById('multText');
const flewLabel = document.getElementById('flewLabel');
const mainBtn = document.getElementById('mainBtn');
const btnSub = document.getElementById('btnSub');
const balEl = document.getElementById('bal');
const betAmtEl = document.getElementById('betAmt');

function setBet(v){ if(gameState==='IDLE'){ currentBet=v; updateUI(); } }
function adj(v){ if(gameState==='IDLE' && currentBet+v>=1000){ currentBet+=v; updateUI(); } }

function updateUI(){
    betAmtEl.textContent = currentBet.toLocaleString('en-US') + '.00';
    if(gameState==='IDLE') btnSub.textContent = currentBet.toLocaleString('en-US') + ' TZS';
}

function drawScene(p, crashed) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width, h = canvas.height;
    
    // Draw Curved Flight Path
    ctx.beginPath();
    ctx.moveTo(0, h);
    const endX = w * 0.75 * p;
    const endY = h - (h * 0.65 * Math.pow(p, 0.8));
    ctx.quadraticCurveTo(endX * 0.5, h, endX, endY);
    
    // Fill Under Curve
    ctx.lineTo(endX, h);
    ctx.closePath();
    ctx.fillStyle = crashed ? 'rgba(220, 38, 38, 0.2)' : 'rgba(229, 45, 39, 0.25)';
    ctx.fill();

    // Red Curve Line
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.quadraticCurveTo(endX * 0.5, h, endX, endY);
    ctx.strokeStyle = crashed ? '#dc2626' : '#e52d27';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Red Plane Icon
    if(!crashed && p > 0){
        ctx.save();
        ctx.translate(endX, endY);
        ctx.fillStyle = '#e52d27';
        ctx.beginPath();
        ctx.ellipse(0, 0, 12, 5, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function handleAction() {
    if(gameState === 'IDLE') {
        if(balance < currentBet) return alert('Salio halitoshi!');
        balance -= currentBet;
        balEl.textContent = balance.toLocaleString('en-US') + '.00';
        
        gameState = 'FLYING';
        multiplier = 1.00;
        progress = 0;
        crashPoint = (Math.random() < 0.1) ? 1.00 : +(1 + Math.pow(Math.random(), 2) * 5).toFixed(2);
        
        flewLabel.style.display = 'none';
        multText.classList.remove('flew');
        mainBtn.className = 'action-btn cashout';
        mainBtn.querySelector('span').textContent = 'CHUKUA PESA';
        
        let t = 0;
        timer = setInterval(() => {
            t += 0.04;
            progress = Math.min(1, t / 4);
            multiplier += Math.pow(t, 1.5) * 0.03;

            if(multiplier >= crashPoint) {
                endGame(false);
            } else {
                multText.textContent = multiplier.toFixed(2) + 'x';
                btnSub.textContent = (currentBet * multiplier).toFixed(0) + ' TZS';
                drawScene(progress, false);
            }
        }, 60);

    } else if(gameState === 'FLYING') {
        endGame(true);
    }
}

function endGame(win) {
    clearInterval(timer);
    if(win) {
        const winAmt = Math.floor(currentBet * multiplier);
        balance += winAmt;
        balEl.textContent = balance.toLocaleString('en-US') + '.00';
        mainBtn.className = 'action-btn disabled';
        mainBtn.querySelector('span').textContent = 'USHINDI!';
        btnSub.textContent = '+' + winAmt.toLocaleString('en-US') + ' TZS';
    } else {
        flewLabel.style.display = 'block';
        multText.classList.add('flew');
        multText.textContent = crashPoint.toFixed(2) + 'x';
        mainBtn.className = 'action-btn disabled';
        mainBtn.querySelector('span').textContent = 'IMEPERUKA';
        btnSub.textContent = '0.00 TZS';
        drawScene(progress, true);
    }

    // Add to history
    const item = document.createElement('span');
    item.className = 'hist-item ' + (crashPoint >= 2 ? 'purple' : '');
    item.textContent = crashPoint.toFixed(2) + 'x';
    document.getElementById('histBar').prepend(item);

    gameState = 'ENDED';
    setTimeout(() => {
        gameState = 'IDLE';
        flewLabel.style.display = 'none';
        multText.classList.remove('flew');
        multText.textContent = '1.00x';
        mainBtn.className = 'action-btn';
        mainBtn.querySelector('span').textContent = 'Weka dau';
        updateUI();
        ctx.clearRect(0,0,canvas.width,canvas.height);
    }, 2500);
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
const aviatorCommand = async (sock, chatId, msg, args) => {
    const ctx = createCtx(sock, chatId, msg, { args });

    const rich = new AIRich(ctx.sock || ctx.core)
        .setTitle('✈️ MICKEY AVIATOR')
        .setFooter('Mickey Aviator • Chukua pesa kabla ndege haijaperuka!');

    rich.addSection(buildAviatorPayload());

    try {
        await rich.send(ctx.chatId, { quoted: ctx.msg });
    } catch (error) {
        console.error('Mickey Aviator Error:', error?.message || error);
        await ctx.reply('⚠️ Imeshindikana kufungua Mickey Aviator.');
    }
};

module.exports = aviatorCommand;
