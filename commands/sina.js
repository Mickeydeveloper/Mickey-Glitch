const { createCtx } = require('../lib/messageBuilder');

// HTML ya Music Player - Simplified
const musicPlayerHtml = `
<!DOCTYPE html>
<html lang="sw">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>🎵 SINA MDA NAE</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
body{background:transparent;font-family:Arial,sans-serif;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:10px}
.container{width:100%;max-width:380px;padding:16px;background:linear-gradient(145deg,#1a1a2e,#16213e);border-radius:20px;border:1px solid rgba(255,255,255,0.1);box-shadow:0 20px 60px rgba(0,0,0,0.8)}
.header{text-align:center;margin-bottom:16px}
.header-title{font-size:20px;font-weight:700;background:linear-gradient(135deg,#6bcfff,#ff6b6b);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.header-sub{font-size:11px;color:#888;margin-top:2px}
.album-art{width:100%;aspect-ratio:1;max-height:250px;margin:0 auto 16px;border-radius:16px;background:linear-gradient(135deg,#2a2a4a,#1a1a2e);display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,0.08);position:relative;overflow:hidden}
.album-art .icon{font-size:60px;opacity:0.5}
.wave{position:absolute;bottom:16px;left:50%;transform:translateX(-50%);display:flex;gap:3px;align-items:center;height:25px}
.wave span{display:block;width:3px;background:#6bcfff;border-radius:2px;animation:wave 0.8s ease-in-out infinite}
.wave span:nth-child(1){height:8px;animation-delay:0s}
.wave span:nth-child(2){height:16px;animation-delay:0.1s}
.wave span:nth-child(3){height:24px;animation-delay:0.2s}
.wave span:nth-child(4){height:16px;animation-delay:0.3s}
.wave span:nth-child(5){height:8px;animation-delay:0.4s}
@keyframes wave{0%,100%{transform:scaleY(1)}50%{transform:scaleY(0.4)}}
.wave.paused span{animation-play-state:paused;opacity:0.2}
.song-info{text-align:center;margin-bottom:14px}
.song-title{font-size:17px;font-weight:600;color:#fff}
.song-artist{font-size:12px;color:#888;margin-top:3px}
.progress-container{margin-bottom:12px}
.progress-bar{width:100%;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;cursor:pointer;position:relative}
.progress-fill{height:100%;background:linear-gradient(90deg,#6bcfff,#ff6b6b);border-radius:2px;width:0%;transition:width 0.1s}
.progress-time{display:flex;justify-content:space-between;font-size:10px;color:#666;margin-top:4px}
.controls{display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:12px}
.controls button{width:50px;height:50px;border:none;border-radius:50%;font-size:22px;cursor:pointer;touch-action:manipulation;background:rgba(255,255,255,0.08);color:#fff;border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center}
.controls button:active{transform:scale(0.92);background:rgba(255,255,255,0.2)}
.controls .btn-play{width:64px;height:64px;font-size:28px;background:linear-gradient(135deg,#6bcfff,#4a9eff);border-color:transparent;box-shadow:0 6px 20px rgba(75,158,255,0.3)}
.controls .btn-play:active{transform:scale(0.9)}
.controls .btn-play.paused{background:linear-gradient(135deg,#ff6b6b,#ff4a4a);box-shadow:0 6px 20px rgba(255,75,75,0.3)}
.controls .btn-small{width:40px;height:40px;font-size:16px}
.volume-control{display:flex;align-items:center;gap:10px;margin-bottom:12px;padding:0 4px}
.volume-control .vol-icon{font-size:16px;color:#666}
.volume-slider{flex:1;height:3px;-webkit-appearance:none;appearance:none;background:rgba(255,255,255,0.1);border-radius:2px;outline:none}
.volume-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:12px;height:12px;border-radius:50%;background:linear-gradient(135deg,#6bcfff,#4a9eff);cursor:pointer;border:2px solid rgba(255,255,255,0.15)}
.volume-slider::-moz-range-thumb{width:12px;height:12px;border-radius:50%;background:linear-gradient(135deg,#6bcfff,#4a9eff);cursor:pointer;border:2px solid rgba(255,255,255,0.15)}
.url-input{display:flex;gap:6px;margin-top:8px}
.url-input input{flex:1;padding:8px 12px;border:1px solid rgba(255,255,255,0.08);border-radius:8px;background:rgba(255,255,255,0.04);color:#fff;font-size:11px;outline:none;min-width:0}
.url-input input::placeholder{color:#555}
.url-input input:focus{border-color:#6bcfff}
.url-input button{padding:8px 14px;border:none;border-radius:8px;background:linear-gradient(135deg,#6bcfff,#4a9eff);color:#fff;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap}
.url-input button:active{transform:scale(0.95)}
.status-msg{text-align:center;font-size:10px;color:#555;margin-top:8px;min-height:16px}
.hidden{display:none}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="header-title">🎵 SINA MDA NAE</div>
    <div class="header-sub">Mickey Mozy</div>
  </div>
  <div class="album-art" id="albumArt">
    <div class="icon">🎵</div>
    <div class="wave" id="wave"><span></span><span></span><span></span><span></span><span></span></div>
  </div>
  <div class="song-info">
    <div class="song-title" id="songTitle">Sina Mda Nae</div>
    <div class="song-artist" id="songArtist">Mickey Mozy</div>
  </div>
  <div class="progress-container">
    <div class="progress-bar" id="progressBar"><div class="progress-fill" id="progressFill"></div></div>
    <div class="progress-time"><span id="currentTime">0:00</span><span id="totalTime">0:00</span></div>
  </div>
  <div class="controls">
    <button class="btn-small" id="btnPrev">⏮</button>
    <button class="btn-play" id="btnPlay">▶</button>
    <button class="btn-small" id="btnNext">⏭</button>
  </div>
  <div class="volume-control">
    <span class="vol-icon">🔊</span>
    <input type="range" class="volume-slider" id="volumeSlider" min="0" max="1" step="0.01" value="0.8">
  </div>
  <div class="url-input">
    <input type="text" id="urlInput" placeholder="Paste MP3 URL...">
    <button id="btnLoad">Load</button>
  </div>
  <div class="status-msg" id="statusMsg">🎵 Paste URL & tap Load</div>
</div>
<script>
(function(){
  const audio = new Audio();
  let isPlaying = false, isLoaded = false;

  const playBtn = document.getElementById('btnPlay');
  const progressFill = document.getElementById('progressFill');
  const progressBar = document.getElementById('progressBar');
  const currentTimeEl = document.getElementById('currentTime');
  const totalTimeEl = document.getElementById('totalTime');
  const volumeSlider = document.getElementById('volumeSlider');
  const urlInput = document.getElementById('urlInput');
  const loadBtn = document.getElementById('btnLoad');
  const statusMsg = document.getElementById('statusMsg');
  const songTitle = document.getElementById('songTitle');
  const songArtist = document.getElementById('songArtist');
  const wave = document.getElementById('wave');

  // Default URL - inaweza kubadilishwa
  const defaultUrl = 'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/sina%20mda%20nae.mp3';
  urlInput.value = defaultUrl;

  function formatTime(s){ if(isNaN(s)||!isFinite(s)) return '0:00'; const m=Math.floor(s/60); const sec=Math.floor(s%60); return m+':'+(sec<10?'0':'')+sec; }

  function updateUI(){
    if(audio.duration && !isNaN(audio.duration)){
      progressFill.style.width = ((audio.currentTime/audio.duration)*100)+'%';
      currentTimeEl.textContent = formatTime(audio.currentTime);
      totalTimeEl.textContent = formatTime(audio.duration);
    }
  }

  function setStatus(msg, err){
    statusMsg.textContent = msg;
    statusMsg.style.color = err ? '#ff6b6b' : '#555';
  }

  function loadAudio(url){
    if(!url){ setStatus('❌ No URL', true); return; }
    setStatus('⏳ Loading...');
    audio.src = url;
    audio.load();
    audio.onloadedmetadata = function(){
      isLoaded = true;
      totalTimeEl.textContent = formatTime(audio.duration);
      setStatus('✅ Loaded');
      setTimeout(playAudio, 200);
    };
    audio.onerror = function(){
      setStatus('❌ Failed: '+url.substring(0,30)+'...', true);
      isLoaded = false;
      playBtn.textContent = '▶';
      isPlaying = false;
      wave.classList.add('paused');
    };
    audio.ontimeupdate = updateUI;
    audio.onended = function(){ isPlaying=false; playBtn.textContent='▶'; wave.classList.add('paused'); setStatus('⏹️ Ended'); };
    audio.onplay = function(){ isPlaying=true; playBtn.textContent='⏸'; wave.classList.remove('paused'); setStatus('▶️ Playing...'); };
    audio.onpause = function(){ isPlaying=false; playBtn.textContent='▶'; wave.classList.add('paused'); setStatus('⏸️ Paused'); };
  }

  function togglePlay(){
    if(!isLoaded){ const u=urlInput.value.trim(); if(u){ loadAudio(u); return; } setStatus('❌ No audio loaded', true); return; }
    if(isPlaying){ audio.pause(); } else { audio.play().catch(()=>setStatus('❌ Cannot play', true)); }
  }

  function playAudio(){ audio.play().catch(()=>setStatus('❌ Cannot play', true)); }

  function seek(e){
    if(!isLoaded||!audio.duration) return;
    const rect = progressBar.getBoundingClientRect();
    const x = (e.clientX||e.touches?.[0]?.clientX||0) - rect.left;
    audio.currentTime = Math.max(0, Math.min(1, x/rect.width)) * audio.duration;
    updateUI();
  }

  playBtn.addEventListener('click', togglePlay);
  progressBar.addEventListener('click', seek);
  progressBar.addEventListener('touchstart', function(e){ e.preventDefault(); seek(e); });

  volumeSlider.addEventListener('input', function(){ audio.volume = parseFloat(this.value); });

  loadBtn.addEventListener('click', function(){ const u=urlInput.value.trim(); if(u) loadAudio(u); else setStatus('❌ Enter URL', true); });
  urlInput.addEventListener('keydown', function(e){ if(e.key==='Enter') loadBtn.click(); });

  document.addEventListener('keydown', function(e){
    if(e.target.tagName==='INPUT') return;
    if(e.code==='Space'){ e.preventDefault(); togglePlay(); }
    if(e.code==='ArrowLeft' && isLoaded){ audio.currentTime = Math.max(0, audio.currentTime-5); updateUI(); }
    if(e.code==='ArrowRight' && isLoaded){ audio.currentTime = Math.min(audio.duration||0, audio.currentTime+5); updateUI(); }
  });

  // Auto-load on start
  setTimeout(function(){ if(urlInput.value.trim()) loadAudio(urlInput.value.trim()); }, 500);
  setInterval(updateUI, 500);
  wave.classList.add('paused');
  setStatus('🎵 Loaded. Tap Play');
})();
</script>
</body>
</html>
`;

function buildSinaPayload(jid, resultText = '🎵 SINA MDA NAE') {
    const responseId = `sina-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

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
                            messageText: resultText
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
                                            payload: musicPlayerHtml,
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

const sinaCommand = async (sock, chatId, msg, args = []) => {
    const ctx = createCtx(sock, chatId, msg, { args });
    const target = ctx.chatId || chatId || msg?.key?.remoteJid;

    if (!sock || !target) {
        throw new Error('Chat context is required');
    }

    try {
        const payload = buildSinaPayload(target, '🎵 SINA MDA NAE');
        await sock.relayMessage(payload.jid, payload.content, {});
        return true;
    } catch (error) {
        console.error('[sina] relay failed:', error?.message || error);

        try {
            await sock.sendMessage(target, {
                text: `🎵 SINA MDA NAE\n━━━━━━━━━━━━━━━━━━━\n🎤 Mickey Mozy\n━━━━━━━━━━━━━━━━━━━\nType .sina to play!`
            }, { quoted: ctx.msg });
            return true;
        } catch (sendErr) {
            console.error('[sina] fallback failed:', sendErr?.message || sendErr);
            return false;
        }
    }
};

sinaCommand.name = 'sina';
sinaCommand.aliases = ['mickey', 'mda'];
sinaCommand.category = 'fun';
sinaCommand.description = '🎵 Sina Mda Nae - Mickey Mozy';

module.exports = sinaCommand;