const { createCtx } = require('../../lib/messageBuilder');
const { randomUUID } = require('crypto');

// HTML ya WebSocket Group Chat - Real WebSocket
function buildChatHTML(wsUrl, room, name) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>💬 Group Chat</title>
<style>
*{-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
:root{--bg:transparent;--card:#202c33;--bubble-me:#005c4b;--ink:#e9edef;--ink-soft:#aebac1;--muted:#8696a0;--accent:#00a884;--line:#2a3942}
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:transparent;color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;min-height:100vh;overflow-x:hidden}
.stage{min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:16px 14px}
.card{width:100%;max-width:430px;flex:1;display:flex;flex-direction:column}
.header{display:flex;align-items:center;gap:10px;padding-bottom:10px;margin-bottom:10px;border-bottom:1px solid var(--line)}
.dot{width:13px;height:13px;border-radius:50%;background:#ea4335;flex-shrink:0;transition:background .3s}
.dot.on{background:var(--accent);box-shadow:0 0 8px #00a88488}
.hdr-t{flex:1;font-size:18px;font-weight:700;color:var(--accent);letter-spacing:.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mc{font-size:14px;color:var(--muted);background:var(--card);padding:4px 12px;border-radius:16px;font-weight:600}
.msgs{flex:1;min-height:56vh;overflow-y:auto;display:flex;flex-direction:column;gap:7px;padding:6px 2px}
.m{padding:9px 13px;border-radius:14px;max-width:85%;font-size:17px;line-height:1.5;animation:fi .2s}
@keyframes fi{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
.m.sys{align-self:center;color:var(--muted);font-size:13px;background:none;padding:5px 0;max-width:100%;text-align:center}
.m.me{align-self:flex-end;background:var(--bubble-me);border-bottom-right-radius:4px}
.m.ot{align-self:flex-start;background:var(--card);border:1px solid var(--line);border-bottom-left-radius:4px}
.mn{font-size:14px;color:var(--accent);font-weight:700;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.mt{word-break:break-word;white-space:pre-wrap}
.ts{font-size:11px;color:#ffffff99;margin-top:3px;text-align:right}
.inp{display:flex;gap:8px;padding:12px 0 2px}
.inp input{flex:1;min-width:0;background:var(--card);border:1px solid var(--line);color:var(--ink);padding:15px 18px;border-radius:26px;font-size:17px;outline:none;transition:border-color .2s}
.inp input:focus{border-color:var(--accent)}
.inp input::placeholder{color:var(--muted)}
.inp button{background:var(--accent);color:#fff;border:none;padding:15px 24px;border-radius:26px;font-size:20px;font-weight:700;cursor:pointer;flex-shrink:0;transition:transform .1s}
.inp button:active{transform:scale(.95)}
.ob{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:9;background:rgba(234,67,53,.94);color:#fff;padding:10px 20px;border-radius:22px;font-size:14px;font-weight:600;box-shadow:0 4px 16px #000a}
</style>
</head>
<body>
<main class="stage"><div class="card">
  <div class="header"><div class="dot" id="d"></div><span class="hdr-t">💬 Group Chat</span><span class="mc" id="mc">0</span></div>
  <div class="msgs" id="ml"></div>
  <div class="inp"><input id="i" placeholder="Ketik pesan..." autocomplete="off"><button id="b">➤</button></div>
</div></main>
<div class="ob" id="ob" style="display:none">⏳ Menghubungkan...</div>

<script>
var ROOM="${room}", NAME="${name}", WS_URL="${wsUrl}";
var ml=document.getElementById("ml"), ii=document.getElementById("i"), bb=document.getElementById("b");
var dd=document.getElementById("d"), mc=document.getElementById("mc"), ob=document.getElementById("ob");
var ws=null, sid="u_"+Math.random().toString(36).slice(2)+Date.now().toString(36);
var mcnt=0;

function ts(t){var d=new Date(t);return String(d.getHours()).padStart(2,'0')+":"+String(d.getMinutes()).padStart(2,'0')}
function esc(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}

function add(m){
  var el=document.createElement("div");
  var isMe=(m.sid===sid)||(m.name===NAME);
  if(m.type==="chat:system"){el.className="m sys";el.textContent=m.text}
  else if(isMe){el.className="m me";el.innerHTML='<div class="mt">'+esc(m.text)+'</div><div class="ts">'+ts(m.ts)+'</div>'}
  else{el.className="m ot";el.innerHTML='<div class="mn">'+esc(m.name)+'</div><div class="mt">'+esc(m.text)+'</div><div class="ts">'+ts(m.ts)+'</div>'}
  ml.appendChild(el);ml.scrollTop=ml.scrollHeight;
}

function sendMsg(){
  var t=ii.value.trim();
  if(!t||!ws||ws.readyState!==1)return;
  ws.send(JSON.stringify({type:"chat:msg", room:ROOM, text:t, name:NAME}));
  ii.value="";ii.focus();
}

bb.onclick=sendMsg;
ii.onkeydown=function(e){if(e.key==="Enter")sendMsg()};

function connect(){
  if(ws){try{ws.onclose=null;ws.close()}catch(e){}}
  try{
    ws=new WebSocket(WS_URL);
  }catch(e){
    ob.style.display="block";
    ob.textContent="❌ Connection failed";
    setTimeout(connect, 5000);
    return;
  }
  
  ws.onopen=function(){
    dd.className="dot on";
    ob.style.display="none";
    ws.send(JSON.stringify({type:"chat:join", room:ROOM, name:NAME, sid:sid}));
  };
  
  ws.onclose=function(){
    dd.className="dot";
    ob.style.display="block";
    ob.textContent="⏳ Reconnecting...";
    setTimeout(connect, 3000);
  };
  
  ws.onerror=function(err){
    console.error("WebSocket error:", err);
    ob.style.display="block";
    ob.textContent="⚠️ Connection error";
  };
  
  ws.onmessage=function(e){
    var m;
    try{m=JSON.parse(e.data)}catch(err){return}
    if(m.type==="chat:welcome"){
      sid=m.sid||sid;
      mcnt=m.members?m.members.length:0;
      mc.textContent=mcnt;
      if(m.history) m.history.forEach(add);
    }else if(m.type==="chat:msg"){
      add(m);
    }else if(m.type==="chat:system"){
      add(m);
      if(m.text.indexOf("masuk")>-1){mcnt++;mc.textContent=mcnt}
      else if(m.text.indexOf("keluar")>-1){mcnt=Math.max(0,mcnt-1);mc.textContent=mcnt}
    }
  };
}

connect();

document.addEventListener("visibilitychange", function(){
  if(!document.hidden && (!ws || ws.readyState>1)){
    connect();
  }
});

window.onpagehide=function(){
  if(ws) ws.close();
};
</script>
</body>
</html>`;
}

const wsgCommand = async (sock, chatId, msg, args = []) => {
    const ctx = createCtx(sock, chatId, msg, { args });
    const target = ctx.chatId || chatId || msg?.key?.remoteJid;

    if (!sock || !target) {
        throw new Error('Chat context is required');
    }

    // Generate unique room ID
    const room = `wsg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const responseId = `wsg-${Date.now()}-${randomUUID().substr(0, 6)}`;

    // Get user name
    const userName = msg?.pushName || 'User';

    // WebSocket URL - default to echo server if no args
    const wsUrl = args[0] || 'wss://echo.websocket.org';

    const html = buildChatHTML(wsUrl, room, userName);

    const payload = {
        messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
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
                            messageText: "💬 WebSocket Group Chat"
                        }
                    ],
                    unifiedResponse: {
                        data: Buffer.from(JSON.stringify({
                            response_id: responseId,
                            sections: [
                                {
                                    view_model: {
                                        primitive: {
                                            __typename: "GenAIaeacdsnwHtmlPrimitive",
                                            payload: html,
                                            trusted_sources: ["cylic.dev"]
                                        },
                                        __typename: "GenAISingleLayoutViewModel"
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

    try {
        await sock.relayMessage(target, payload, {});
        return true;
    } catch (error) {
        console.error('[wsg] relay failed:', error?.message || error);

        try {
            await sock.sendMessage(target, {
                text: `💬 WEBSOCKET GROUP CHAT\n━━━━━━━━━━━━━━━━━━━\n🌐 Server: ${wsUrl}\n📝 Room: ${room}\n👤 Name: ${userName}\n━━━━━━━━━━━━━━━━━━━\nType .wsg [ws_url] to connect!\n━━━━━━━━━━━━━━━━━━━\nExample: .wsg wss://echo.websocket.org`
            }, { quoted: ctx.msg });
            return true;
        } catch (sendErr) {
            console.error('[wsg] fallback failed:', sendErr?.message || sendErr);
            return false;
        }
    }
};

wsgCommand.name = 'wsg';
wsgCommand.aliases = ['websocketgroup', 'wsgroup', 'websocket'];
wsgCommand.category = 'fun';
wsgCommand.description = '💬 WebSocket Group Chat - Real WebSocket';

module.exports = wsgCommand;