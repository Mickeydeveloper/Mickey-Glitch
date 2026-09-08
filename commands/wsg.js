const { createCtx } = require('../../lib/messageBuilder');
const { randomUUID } = require('crypto');

// HTML ya WebSocket Group Chat - Simplified
function buildChatHTML(room, name) {
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
var ROOM="${room}",NAME="${name}";
var ml=document.getElementById("ml"),ii=document.getElementById("i"),bb=document.getElementById("b");
var dd=document.getElementById("d"),mc=document.getElementById("mc"),ob=document.getElementById("ob");
var ws=null,messages=[],mcnt=0;

function ts(t){var d=new Date(t);return String(d.getHours()).padStart(2,'0')+":"+String(d.getMinutes()).padStart(2,'0')}

function add(m){
  var el=document.createElement("div");
  var isMe=(m.sender===NAME);
  if(m.type==="system"){el.className="m sys";el.textContent=m.text}
  else if(isMe){el.className="m me";el.innerHTML='<div class="mt">'+m.text+'</div><div class="ts">'+ts(m.time)+'</div>'}
  else{el.className="m ot";el.innerHTML='<div class="mn">'+m.sender+'</div><div class="mt">'+m.text+'</div><div class="ts">'+ts(m.time)+'</div>'}
  ml.appendChild(el);ml.scrollTop=ml.scrollHeight;
}

function sendMsg(){
  var t=ii.value.trim();
  if(!t)return;
  var msg={sender:NAME,text:t,time:Date.now(),type:"message"};
  messages.push(msg);
  add(msg);
  // Broadcast to other users via localStorage (simulated)
  localStorage.setItem('wsg_'+ROOM, JSON.stringify({messages:messages,members:mcnt+1}));
  ii.value="";ii.focus();
  // Simulate reply
  setTimeout(function(){
    var reply={sender:"Bot",text:"📩 Received: "+t,time:Date.now(),type:"message"};
    messages.push(reply);
    add(reply);
    localStorage.setItem('wsg_'+ROOM, JSON.stringify({messages:messages,members:mcnt+1}));
  }, 500);
}

bb.onclick=sendMsg;
ii.onkeydown=function(e){if(e.key==="Enter")sendMsg()};

// Load saved messages
function loadMessages(){
  try{
    var data=localStorage.getItem('wsg_'+ROOM);
    if(data){
      var parsed=JSON.parse(data);
      messages=parsed.messages||[];
      mcnt=parsed.members||0;
      mc.textContent=mcnt;
      ml.innerHTML="";
      messages.forEach(add);
      dd.className="dot on";
      ob.style.display="none";
    }
  }catch(e){}
}

// Simulate other users
function simulateUser(){
  var users=["Mtu 1","Mtu 2","Mtu 3","Mtu 4"];
  var user=users[Math.floor(Math.random()*users.length)];
  var msgs=["Halo!", "Habari?", "Mambo?", "Poa!", "Safi!", "Nzuri!", "Vipi?"];
  var msg=msgs[Math.floor(Math.random()*msgs.length)];
  var newMsg={sender:user,text:msg,time:Date.now(),type:"message"};
  messages.push(newMsg);
  add(newMsg);
  localStorage.setItem('wsg_'+ROOM, JSON.stringify({messages:messages,members:mcnt+1}));
}

// Auto-load
loadMessages();

// Simulate new users joining
setTimeout(function(){
  mcnt=Math.floor(Math.random()*5)+1;
  mc.textContent=mcnt;
  var sysMsg={type:"system",text:"👤 "+(mcnt-1)+" new member(s) joined"};
  add(sysMsg);
  localStorage.setItem('wsg_'+ROOM, JSON.stringify({messages:messages,members:mcnt}));
}, 1000);

// Simulate random messages
setInterval(function(){
  if(Math.random()>0.4){
    simulateUser();
  }
}, 8000);

// Simulate disconnection
setInterval(function(){
  if(Math.random()>0.9){
    dd.className="dot";
    ob.style.display="block";
    ob.textContent="⏳ Reconnecting...";
    setTimeout(function(){
      dd.className="dot on";
      ob.style.display="none";
      var sysMsg={type:"system",text:"✅ Reconnected"};
      add(sysMsg);
    }, 2000);
  }
}, 30000);

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

    const html = buildChatHTML(room, userName);

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
                            messageText: "💬 Group Chat"
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
                text: `💬 GROUP CHAT\n━━━━━━━━━━━━━━━━━━━\n📝 Chat room imeundwa!\n👤 Jina: ${userName}\n🆔 Room: ${room}\n━━━━━━━━━━━━━━━━━━━\nType .wsg to open chat!`
            }, { quoted: ctx.msg });
            return true;
        } catch (sendErr) {
            console.error('[wsg] fallback failed:', sendErr?.message || sendErr);
            return false;
        }
    }
};

wsgCommand.name = 'wsg';
wsgCommand.aliases = ['websocketgroup', 'wsgroup', 'chat'];
wsgCommand.category = 'fun';
wsgCommand.description = '💬 Group Chat - Chat room';

module.exports = wsgCommand;