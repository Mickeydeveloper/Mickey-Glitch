const { createCtx } = require('../lib/messageBuilder');
const { randomUUID } = require('crypto');

// HTML ya Piano Game
const pianoHtml = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
html,body{margin:0;padding:0;background:linear-gradient(#5c94fc,#8fc4ff);font-family:Arial,sans-serif;overflow-x:hidden;}
body{padding:20px 0;}
.title{text-align:center;color:white;font-size:22px;font-weight:bold;text-shadow:0 2px 10px rgba(0,0,0,0.2);}
.sub{text-align:center;color:white;font-size:13px;margin:6px 0 25px;opacity:0.8;}
.piano-wrap{width:100%;padding:0 12px;}
.piano{position:relative;width:100%;height:52vw;max-height:260px;min-height:170px;display:flex;touch-action:none;}
.white{position:relative;width:12.5%;flex:1 1 12.5%;height:100%;padding:0;margin:0;background:#fff;border:1px solid #222;border-radius:0 0 8px 8px;color:#222;font-size:11px;font-weight:bold;display:flex;align-items:flex-end;justify-content:center;padding-bottom:14px;box-shadow:0 5px 0 #aaa;z-index:1;cursor:pointer;touch-action:manipulation;}
.white:first-child{border-radius:10px 0 0 10px;}
.white:last-child{border-radius:0 10px 10px 0;}
.white:active,.white.active{background:#ddd;transform:translateY(5px);box-shadow:0 1px 0 #888;}
.black{position:absolute;top:0;width:9%;height:58%;padding:0;margin:0;background:linear-gradient(90deg,#111,#333,#050505);border:2px solid #000;border-radius:0 0 6px 6px;color:white;font-size:9px;font-weight:bold;display:flex;align-items:flex-end;justify-content:center;padding-bottom:10px;box-shadow:0 6px 5px rgba(0,0,0,.5);z-index:5;cursor:pointer;touch-action:manipulation;}
.black:active,.black.active{background:#555;transform:translateY(4px);box-shadow:0 2px 3px rgba(0,0,0,.5);}
.b1{left:7.8%}.b2{left:20.3%}.b3{left:45.3%}.b4{left:57.8%}.b5{left:70.3%}
#note{text-align:center;color:white;font-size:22px;font-weight:bold;margin-top:25px;text-shadow:0 2px 10px rgba(0,0,0,0.2);}
.record-btn{display:block;margin:15px auto 0;padding:10px 30px;border:none;border-radius:30px;background:rgba(255,255,255,0.25);color:white;font-size:14px;font-weight:bold;cursor:pointer;backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.2);touch-action:manipulation;}
.record-btn:active{transform:scale(0.95);background:rgba(255,255,255,0.15);}
.record-btn.recording{background:rgba(255,50,50,0.4);border-color:rgba(255,50,50,0.5);}
.footer{text-align:center;color:rgba(255,255,255,0.5);font-size:10px;margin-top:15px;}
</style>
</head>
<body>
<div class="title">🎹 PIANO</div>
<div class="sub">Do - Re - Mi - Fa - Sol - La - Si - Do</div>
<div class="piano-wrap">
<div class="piano">
<button class="white" data-freq="261.63" data-name="Do">Do</button>
<button class="white" data-freq="293.66" data-name="Re">Re</button>
<button class="white" data-freq="329.63" data-name="Mi">Mi</button>
<button class="white" data-freq="349.23" data-name="Fa">Fa</button>
<button class="white" data-freq="392.00" data-name="Sol">Sol</button>
<button class="white" data-freq="440.00" data-name="La">La</button>
<button class="white" data-freq="493.88" data-name="Si">Si</button>
<button class="white" data-freq="523.25" data-name="Do">Do</button>
<button class="black b1" data-freq="277.18" data-name="Do#">Do#</button>
<button class="black b2" data-freq="311.13" data-name="Re#">Re#</button>
<button class="black b3" data-freq="369.99" data-name="Fa#">Fa#</button>
<button class="black b4" data-freq="415.30" data-name="Sol#">Sol#</button>
<button class="black b5" data-freq="466.16" data-name="La#">La#</button>
</div>
</div>
<div id="note">🎵 Tekan piano</div>
<button class="record-btn" id="recordBtn">🎙️ RECORD</button>
<div class="footer">Tap keys to play • Piano by Mickey</div>

<script>
let audioContext = null;
let isRecording = false;
let recordedNotes = [];
let recordStartTime = 0;

function initAudio(){
if(!audioContext){
const AudioContext = window.AudioContext || window.webkitAudioContext;
if(!AudioContext){document.getElementById('note').textContent='❌ Audio not supported';return null;}
audioContext = new AudioContext();
}
if(audioContext.state === 'suspended'){audioContext.resume();}
return audioContext;
}

function playPiano(freq, duration = 1.3){
const ctx = initAudio();
if(!ctx) return;
const now = ctx.currentTime;
const master = ctx.createGain();
master.gain.setValueAtTime(0, now);
master.gain.linearRampToValueAtTime(0.5, now + 0.015);
master.gain.exponentialRampToValueAtTime(0.001, now + duration);
master.connect(ctx.destination);

const osc1 = ctx.createOscillator();
const osc2 = ctx.createOscillator();
const osc3 = ctx.createOscillator();
const gain1 = ctx.createGain();
const gain2 = ctx.createGain();
const gain3 = ctx.createGain();

osc1.type = 'triangle';
osc2.type = 'sine';
osc3.type = 'sine';
osc1.frequency.value = freq;
osc2.frequency.value = freq * 2;
osc3.frequency.value = freq * 3;
gain1.gain.value = 1;
gain2.gain.value = 0.22;
gain3.gain.value = 0.08;

osc1.connect(gain1);
osc2.connect(gain2);
osc3.connect(gain3);
gain1.connect(master);
gain2.connect(master);
gain3.connect(master);

osc1.start(now);
osc2.start(now);
osc3.start(now);
osc1.stop(now + duration + 0.1);
osc2.stop(now + duration + 0.1);
osc3.stop(now + duration + 0.1);
}

function playNote(name, freq){
document.getElementById('note').textContent = '🎵 ' + name;
playPiano(freq);
if(isRecording){
recordedNotes.push({
name: name,
freq: freq,
time: Date.now() - recordStartTime
});
}
}

// Piano keys
document.querySelectorAll('.white,.black').forEach(function(key){
function press(e){
e.preventDefault();
key.classList.add('active');
const name = key.dataset.name;
const freq = parseFloat(key.dataset.freq);
playNote(name, freq);
}
function release(e){
e.preventDefault();
key.classList.remove('active');
}
key.addEventListener('pointerdown', press);
key.addEventListener('pointerup', release);
key.addEventListener('pointercancel', release);
key.addEventListener('pointerleave', release);
});

// Record button
const recordBtn = document.getElementById('recordBtn');
recordBtn.addEventListener('click', function(e){
e.preventDefault();
if(!isRecording){
// Start recording
isRecording = true;
recordedNotes = [];
recordStartTime = Date.now();
this.textContent = '⏹️ Stop';
this.classList.add('recording');
document.getElementById('note').textContent = '🔴 Recording...';
} else {
// Stop recording
isRecording = false;
this.textContent = '🎙️ Rekam';
this.classList.remove('recording');
if(recordedNotes.length > 0){
document.getElementById('note').textContent = '✅ Recorded ' + recordedNotes.length + ' notes';
// Playback recorded notes
playbackRecording();
} else {
document.getElementById('note').textContent = '⚠️ No notes recorded';
}
}
});

function playbackRecording(){
if(recordedNotes.length === 0) return;
document.getElementById('note').textContent = '▶️ Playing back...';
let index = 0;
const startTime = Date.now();

function playNext(){
if(index >= recordedNotes.length){
document.getElementById('note').textContent = '✅ Playback complete!';
return;
}
const note = recordedNotes[index];
const elapsed = Date.now() - startTime;
const delay = note.time - elapsed;
if(delay > 0){
setTimeout(() => {
playNote(note.name, note.freq);
index++;
playNext();
}, delay);
} else {
playNote(note.name, note.freq);
index++;
playNext();
}
}
playNext();
}

// Keyboard support
document.addEventListener('keydown', function(e){
const keyMap = {
'a': 'Do', 's': 'Re', 'd': 'Mi', 'f': 'Fa',
'g': 'Sol', 'h': 'La', 'j': 'Si', 'k': 'Do',
'w': 'Do#', 'e': 'Re#', 't': 'Fa#', 'y': 'Sol#', 'u': 'La#'
};
const freqMap = {
'Do': 261.63, 'Re': 293.66, 'Mi': 329.63, 'Fa': 349.23,
'Sol': 392.00, 'La': 440.00, 'Si': 493.88, 'Do': 523.25,
'Do#': 277.18, 'Re#': 311.13, 'Fa#': 369.99, 'Sol#': 415.30, 'La#': 466.16
};
const note = keyMap[e.key];
if(note){
e.preventDefault();
const freq = freqMap[note];
playNote(note, freq);
// Visual feedback
document.querySelectorAll('.white,.black').forEach(el => {
if(el.dataset.name === note){
el.classList.add('active');
setTimeout(() => el.classList.remove('active'), 300);
}
});
}
});

// Auto-init on click anywhere
document.addEventListener('click', function(){
initAudio();
}, { once: true });
</script>
</body>
</html>
`;

function buildPianoPayload(jid, resultText = '🎹 PIANO GAME') {
    const responseId = `piano-${Date.now()}-${randomUUID().substr(0, 6)}`;

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
                            messageText: "🎹 Piano - Play music!"
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
                                            payload: pianoHtml,
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

    return { jid, content: payload };
}

const pianoCommand = async (sock, chatId, msg, args = []) => {
    const ctx = createCtx(sock, chatId, msg, { args });
    const target = ctx.chatId || chatId || msg?.key?.remoteJid;

    if (!sock || !target) {
        throw new Error('Chat context is required');
    }

    try {
        const payload = buildPianoPayload(target, '🎹 PIANO GAME');
        await sock.relayMessage(payload.jid, payload.content, {});
        return true;
    } catch (error) {
        console.error('[piano] relay failed:', error?.message || error);

        try {
            await sock.sendMessage(target, {
                text: `🎹 PIANO\n━━━━━━━━━━━━━━━━━━━\n🎵 Do - Re - Mi - Fa - Sol - La - Si - Do\n━━━━━━━━━━━━━━━━━━━\n🎮 Tap keys to play music!\n⌨️ Keyboard: A S D F G H J K\n━━━━━━━━━━━━━━━━━━━\nType .piano to play!`
            }, { quoted: ctx.msg });
            return true;
        } catch (sendErr) {
            console.error('[piano] fallback failed:', sendErr?.message || sendErr);
            return false;
        }
    }
};

pianoCommand.name = 'piano';
pianoCommand.aliases = ['pianogame', 'keyboard', 'music'];
pianoCommand.category = 'fun';
pianoCommand.description = '🎹 Piano Game - Play music with virtual piano';

module.exports = pianoCommand;