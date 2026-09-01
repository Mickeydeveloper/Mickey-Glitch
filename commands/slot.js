const { createCtx } = require('../lib/messageBuilder');

// HTML ya Slot Game (iliyorekebishwa kutoka mfano wako)
const slotHtml = `
<style>
*{
  box-sizing:border-box;
  -webkit-tap-highlight-color:transparent;
  -webkit-user-select:none;
  user-select:none;
  -webkit-touch-callout:none
}

html,body{
  margin:0;
  padding:0;
  width:100%;
  min-height:100%;
  background:transparent;
  font-family:Arial,Helvetica,sans-serif;
  color:#fff;
  overflow:hidden;
  touch-action:manipulation
}

.wrap{
  width:100%;
  max-width:620px;
  margin:auto;
  padding:7px
}

.card{
  position:relative;
  overflow:hidden;
  border-radius:24px;
  background:linear-gradient(180deg,#171525 0%,#0b0a12 100%);
  border:1px solid rgba(255,255,255,.13);
  box-shadow:0 20px 55px rgba(0,0,0,.55),inset 0 1px rgba(255,255,255,.08)
}

.glow{
  position:absolute;
  width:220px;
  height:220px;
  left:50%;
  top:160px;
  transform:translateX(-50%);
  background:rgba(105,87,229,.16);
  filter:blur(65px);
  pointer-events:none
}

.header{
  position:relative;
  z-index:2;
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:13px 15px;
  border-bottom:1px solid rgba(255,255,255,.08);
  background:rgba(255,255,255,.025)
}

.brand{
  display:flex;
  align-items:center
}

.logo{
  width:43px;
  height:43px;
  display:flex;
  align-items:center;
  justify-content:center;
  border-radius:14px;
  margin-right:10px;
  font-size:14px;
  font-weight:900;
  letter-spacing:-1px;
  background:linear-gradient(145deg,#8b79ff,#5541c5);
  box-shadow:0 7px 25px rgba(105,87,229,.4),inset 0 1px rgba(255,255,255,.25)
}

.mini{
  font-size:8px;
  letter-spacing:2px;
  color:#77748c;
  margin-bottom:4px
}

.title{
  font-size:18px;
  font-weight:800
}

.balance{
  text-align:right
}

.balance-label{
  font-size:8px;
  letter-spacing:1.3px;
  color:#77748c
}

.balance-value{
  margin-top:4px;
  font-size:18px;
  font-weight:800
}

.main{
  position:relative;
  z-index:1;
  padding:15px 12px 13px
}

.jackpot{
  text-align:center;
  margin-bottom:13px
}

.jackpot-label{
  font-size:8px;
  letter-spacing:2.4px;
  color:#77748c;
  margin-bottom:4px
}

.jackpot-value{
  font-size:25px;
  font-weight:900;
  letter-spacing:3px;
  text-shadow:0 0 12px rgba(139,121,255,.6),0 0 30px rgba(105,87,229,.35)
}

.machine{
  position:relative;
  padding:13px 10px 14px;
  border-radius:21px;
  background:linear-gradient(180deg,#211e35,#0d0c15);
  border:1px solid rgba(255,255,255,.14);
  box-shadow:inset 0 1px rgba(255,255,255,.1),inset 0 -15px 35px rgba(0,0,0,.35),0 13px 35px rgba(0,0,0,.35)
}

.machine-light{
  display:flex;
  justify-content:center;
  gap:7px;
  margin-bottom:10px
}

.light{
  width:6px;
  height:6px;
  border-radius:50%;
  background:#6957e5;
  box-shadow:0 0 10px rgba(105,87,229,.9)
}

.reels{
  display:flex;
  gap:7px;
  justify-content:center;
  padding:11px 8px;
  border-radius:17px;
  background:#07070b;
  border:1px solid rgba(255,255,255,.09);
  box-shadow:inset 0 7px 18px rgba(0,0,0,.7),inset 0 -7px 18px rgba(0,0,0,.7)
}

.reel{
  position:relative;
  width:33%;
  height:124px;
  overflow:hidden;
  display:flex;
  align-items:center;
  justify-content:center;
  border-radius:15px;
  background:linear-gradient(180deg,#252438,#11101b);
  border:2px solid rgba(255,255,255,.12);
  box-shadow:inset 0 0 18px rgba(0,0,0,.6),0 4px 10px rgba(0,0,0,.4)
}

.reel:before{
  content:"";
  position:absolute;
  left:0;
  right:0;
  top:0;
  height:34%;
  z-index:3;
  background:linear-gradient(180deg,rgba(0,0,0,.65),transparent)
}

.reel:after{
  content:"";
  position:absolute;
  left:0;
  right:0;
  bottom:0;
  height:34%;
  z-index:3;
  background:linear-gradient(0deg,rgba(0,0,0,.7),transparent)
}

.symbol{
  position:relative;
  z-index:2;
  font-size:52px;
  line-height:1;
  filter:drop-shadow(0 6px 8px rgba(0,0,0,.55))
}

.reel.spinning .symbol{
  animation:slotblur .09s linear infinite
}

@keyframes slotblur{
  0%{transform:translateY(-11px);filter:blur(3px)}
  50%{transform:translateY(11px);filter:blur(4px)}
  100%{transform:translateY(-11px);filter:blur(3px)}
}

.reel.win{
  animation:winner .65s ease-in-out
}

@keyframes winner{
  0%{transform:scale(1)}
  30%{transform:scale(1.08)}
  60%{transform:scale(.97)}
  100%{transform:scale(1)}
}

.payline{
  height:3px;
  margin:-2px 21px 0;
  position:relative;
  z-index:5;
  border-radius:10px;
  background:#8b79ff;
  box-shadow:0 0 10px rgba(139,121,255,.9),0 0 22px rgba(105,87,229,.5)
}

.paytable{
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-top:12px;
  padding:0 4px;
  font-size:8px;
  color:#716e83
}

.paytable strong{
  color:#fff
}

.button{
  width:100%;
  height:51px;
  margin-top:12px;
  border:0;
  border-radius:15px;
  font-size:13px;
  font-weight:900;
  letter-spacing:1.5px;
  color:#fff;
  background:linear-gradient(135deg,#8270ff,#5946cc);
  box-shadow:0 9px 27px rgba(105,87,229,.35),inset 0 1px rgba(255,255,255,.2);
  transition:.15s
}

.button:active{
  transform:scale(.97)
}

.button.disabled{
  opacity:.45
}

.result{
  min-height:44px;
  display:flex;
  align-items:center;
  justify-content:center;
  text-align:center;
  margin-top:10px;
  padding:10px;
  border-radius:13px;
  background:rgba(255,255,255,.035);
  border:1px solid rgba(255,255,255,.07);
  font-size:10px;
  line-height:15px;
  color:#77748a
}

.result.win{
  color:#fff;
  background:rgba(105,87,229,.1);
  border-color:rgba(139,121,255,.38);
  box-shadow:0 0 20px rgba(105,87,229,.08)
}

.footer{
  position:relative;
  z-index:2;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:7px;
  padding:0 0 13px;
  font-size:8px;
  letter-spacing:1px;
  color:#5e5b70
}

.dot{
  width:5px;
  height:5px;
  border-radius:50%;
  background:#67e6a5;
  box-shadow:0 0 9px rgba(103,230,165,.9)
}
</style>

<div class="wrap">
  <div class="card">
    <div class="glow"></div>
    
    <div class="header">
      <div class="brand">
        <div class="logo">MICK</div>
        <div>
          <div class="mini">MICKEY GLITCH GAME</div>
          <div class="title">Mickey slot</div>
        </div>
      </div>
      <div class="balance">
        <div class="balance-label">GAME POINT</div>
        <div id="balance" class="balance-value">1,000</div>
      </div>
    </div>

    <div class="main">
      <div class="jackpot">
        <div class="jackpot-label">CURRENT JACKPOT</div>
        <div id="jackpot" class="jackpot-value">777,777</div>
      </div>

      <div class="machine">
        <div class="machine-light">
          <div class="light"></div>
          <div class="light"></div>
          <div class="light"></div>
          <div class="light"></div>
          <div class="light"></div>
          <div class="light"></div>
          <div class="light"></div>
        </div>

        <div class="reels">
          <div id="reel1" class="reel">
            <div id="symbol1" class="symbol">7️⃣</div>
          </div>
          <div id="reel2" class="reel">
            <div id="symbol2" class="symbol">💎</div>
          </div>
          <div id="reel3" class="reel">
            <div id="symbol3" class="symbol">🍒</div>
          </div>
        </div>

        <div class="payline"></div>

        <div class="paytable">
          <span>SPIN <strong>10 GP</strong></span>
          <span>3× 777 <strong>JACKPOT</strong></span>
        </div>

        <button id="spin" class="button">SPIN 777</button>

        <div id="result" class="result">Tekan SPIN 777 untuk memutar mesin</div>
      </div>
    </div>

    <div class="footer">
      <span class="dot"></span>
      <span>MICKEY GLITCH</span>
      <span>•</span>
      <span>MICKEY SLOT</span>
    </div>
  </div>
</div>

<script>
(function(){
  var symbols = ["7️⃣","💎","🍒","🍋","🍇","⭐","🔔"];
  var reel1 = document.getElementById("reel1");
  var reel2 = document.getElementById("reel2");
  var reel3 = document.getElementById("reel3");
  var symbol1 = document.getElementById("symbol1");
  var symbol2 = document.getElementById("symbol2");
  var symbol3 = document.getElementById("symbol3");
  var button = document.getElementById("spin");
  var result = document.getElementById("result");
  var balanceEl = document.getElementById("balance");
  var jackpotEl = document.getElementById("jackpot");
  
  var balance = 1000;
  var cost = 10;
  var jackpot = 777777;
  var spinning = false;

  function format(n){
    return String(Math.floor(n)).replace(/\\B(?=(\\d{3})+(?!\\d))/g,",");
  }

  function update(){
    balanceEl.textContent = format(balance);
    jackpotEl.textContent = format(jackpot);
  }

  function randomSymbol(){
    return symbols[Math.floor(Math.random() * symbols.length)];
  }

  function animateReel(reel, symbol, delay){
    setTimeout(function(){
      reel.classList.add("spinning");
      var count = 0;
      var timer = setInterval(function(){
        symbol.textContent = randomSymbol();
        count++;
        if(count >= 17){
          clearInterval(timer);
          reel.classList.remove("spinning");
        }
      }, 70);
    }, delay);
  }

  function spin(){
    if(spinning) return;
    if(balance < cost){
      result.className = "result";
      result.textContent = "Game Point kamu tidak cukup.";
      return;
    }

    spinning = true;
    balance -= cost;
    jackpot += cost;
    update();

    button.className = "button disabled";
    button.textContent = "SPINNING...";
    result.className = "result";
    result.textContent = "Mesin sedang berputar...";

    animateReel(reel1, symbol1, 0);
    animateReel(reel2, symbol2, 180);
    animateReel(reel3, symbol3, 360);

    setTimeout(finish, 1550);
  }

  function finish(){
    var a = randomSymbol();
    var b = randomSymbol();
    var c = randomSymbol();
    var roll = Math.random();

    // Jackpot chances
    if(roll < 0.035){
      a = "7️⃣"; b = "7️⃣"; c = "7️⃣";
    }else if(roll < 0.13){
      var lucky = randomSymbol();
      a = lucky; b = lucky; c = lucky;
    }else if(roll < 0.34){
      var pair = randomSymbol();
      a = pair; b = pair; c = randomSymbol();
    }

    symbol1.textContent = a;
    symbol2.textContent = b;
    symbol3.textContent = c;

    reel1.classList.add("win");
    reel2.classList.add("win");
    reel3.classList.add("win");

    setTimeout(function(){
      reel1.classList.remove("win");
      reel2.classList.remove("win");
      reel3.classList.remove("win");
    }, 700);

    var reward = 0;
    var message = "";

    if(a === "7️⃣" && b === "7️⃣" && c === "7️⃣"){
      reward = 7770;
      message = "🎰 JACKPOT 777! +7,770 GP";
    }else if(a === b && b === c){
      reward = 1000;
      message = "🎉 THREE MATCH! +1,000 GP";
    }else if(a === b || a === c || b === c){
      reward = 100;
      message = "✨ DOUBLE MATCH! +100 GP";
    }else if(a === "💎" || b === "💎" || c === "💎"){
      reward = 50;
      message = "💎 DIAMOND! +50 GP";
    }else{
      message = "Belum beruntung — coba lagi!";
    }

    balance += reward;
    update();

    result.className = reward > 0 ? "result win" : "result";
    result.textContent = message;

    spinning = false;
    button.className = "button";
    button.textContent = "SPIN 777";
  }

  button.addEventListener("click", function(e){
    e.preventDefault();
    spin();
  });

  update();
})();
</script>
`;

function buildSlotPayload(jid, resultText = 'CYLICDEV • SLOT 777', prize = '0') {
    const responseId = `cylicdev-slot-${Date.now()}`;
    
    const payload = {
        messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
            messageSecret: "0cCzjnQ5ERoqM2QrQ7KjmMfxsyeWYu+61/chr2wioyE=",
            botMetadata: {
                messageDisclaimerText: "",
                botResponseId: responseId
            }
        },
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    messageType: 1,
                    submessages: [
                        {
                            messageType: 2,
                            messageText: resultText
                        }
                    ],
                    unifiedResponse: {
                        data: Buffer.from(JSON.stringify({
                            "response_id": responseId,
                            "sections": [
                                {
                                    "view_model": {
                                        "primitive": {
                                            "__typename": "GenAIaeacdsnwHtmlPrimitive",
                                            "payload": slotHtml,
                                            "trusted_sources": ["cylic.dev"]
                                        },
                                        "__typename": "GenAISingleLayoutViewModel"
                                    }
                                }
                            ]
                        })).toString('base64')
                    },
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedAiBotMessageInfo: {
                            botJid: "867051314767696@bot"
                        },
                        forwardOrigin: 4
                    }
                }
            }
        }
    };

    return { jid, content: payload };
}

const slotCommand = async (sock, chatId, msg, args = []) => {
    const ctx = createCtx(sock, chatId, msg, { args });
    const target = ctx.chatId || chatId || msg?.key?.remoteJid;

    if (!sock || !target) {
        throw new Error('Chat context is required');
    }

    // Game logic ya slot - hii ina-run kwenye server
    const symbols = ['🍒', '7️⃣', '💎', '⭐', '🍋', '🍇', '🔔'];
    const spin = () => symbols[Math.floor(Math.random() * symbols.length)];
    const result = [spin(), spin(), spin()];
    
    let prize = 0;
    let resultText = '';

    // Check for wins
    if (result[0] === '7️⃣' && result[1] === '7️⃣' && result[2] === '7️⃣') {
        prize = 7777;
        resultText = `🎰 JACKPOT 777! ${result.join(' | ')} • +${prize} GP`;
    } else if (result[0] === result[1] && result[1] === result[2]) {
        prize = 1000;
        resultText = `🎉 THREE MATCH! ${result.join(' | ')} • +${prize} GP`;
    } else if (result[0] === result[1] || result[0] === result[2] || result[1] === result[2]) {
        prize = 100;
        resultText = `✨ DOUBLE MATCH! ${result.join(' | ')} • +${prize} GP`;
    } else if (result.includes('💎')) {
        prize = 50;
        resultText = `💎 DIAMOND! ${result.join(' | ')} • +${prize} GP`;
    } else {
        resultText = `🎰 SPIN ${result.join(' | ')} • Try again`;
    }

    try {
        const payload = buildSlotPayload(target, resultText, String(prize));
        await sock.relayMessage(payload.jid, payload.content, {});
        return true;
    } catch (error) {
        console.error('[slot] relay failed:', error?.message || error);

        // Fallback - send plain text
        try {
            await sock.sendMessage(target, {
                text: `🎰 SLOT GAME\n━━━━━━━━━━━━━━━━━━━\n${result.join(' | ')}\n${prize > 0 ? '✅ WIN: +' + prize + ' GP' : '❌ No win'}\n━━━━━━━━━━━━━━━━━━━\n${resultText}`
            }, { quoted: ctx.msg });
            return true;
        } catch (sendErr) {
            console.error('[slot] fallback failed:', sendErr?.message || sendErr);
            return false;
        }
    }
};

slotCommand.name = 'slot';
slotCommand.aliases = ['game', 'jackpot', '777'];
slotCommand.category = 'fun';
slotCommand.description = 'Slot 777 game with interactive HTML + canvas';

module.exports = slotCommand;