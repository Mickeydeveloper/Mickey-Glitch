const { createCtx } = require('../lib/messageBuilder');
const { randomUUID } = require('crypto');

// HTML ya Mickey Advice - Music Player
const musicPlayerHtml = `
<!DOCTYPE html>
<html lang="sw">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>🎵 Mickey Advice</title>
<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  -webkit-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

body {
  background: transparent;
  font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
  color: #fff;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
}

.container {
  width: 100%;
  max-width: 420px;
  margin: auto;
  padding: 20px;
  background: linear-gradient(145deg, #0f0c29, #302b63, #24243e);
  border-radius: 28px;
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 25px 70px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.05);
  position: relative;
  overflow: hidden;
}

.container::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(ellipse at 30% 20%, rgba(108, 92, 231, 0.08), transparent 60%);
  pointer-events: none;
}

.header {
  text-align: center;
  margin-bottom: 18px;
  position: relative;
  z-index: 1;
}

.header-title {
  font-size: 26px;
  font-weight: 800;
  background: linear-gradient(135deg, #f7971e, #ffd200);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 40px rgba(255, 210, 0, 0.15);
  letter-spacing: -0.5px;
}

.header-sub {
  font-size: 13px;
  color: rgba(255,255,255,0.4);
  margin-top: 4px;
  letter-spacing: 2px;
  font-weight: 300;
}

.header-sub span {
  color: #f7971e;
  font-weight: 600;
}

.album-art {
  width: 100%;
  aspect-ratio: 1;
  max-height: 300px;
  margin: 0 auto 18px;
  border-radius: 20px;
  background: linear-gradient(135deg, #1a1a3e, #2d2b55);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255,215,0,0.15);
  overflow: hidden;
  position: relative;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5), inset 0 0 60px rgba(255,215,0,0.03);
}

.album-art .icon {
  font-size: 90px;
  opacity: 0.5;
  filter: drop-shadow(0 0 30px rgba(255,215,0,0.2));
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.album-art .wave {
  position: absolute;
  bottom: 25px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 5px;
  align-items: center;
  height: 35px;
}

.album-art .wave span {
  display: block;
  width: 5px;
  background: linear-gradient(to top, #f7971e, #ffd200);
  border-radius: 3px;
  animation: wave 0.8s ease-in-out infinite;
  box-shadow: 0 0 10px rgba(255,210,0,0.2);
}

.album-art .wave span:nth-child(1) { height: 12px; animation-delay: 0s; }
.album-art .wave span:nth-child(2) { height: 22px; animation-delay: 0.1s; }
.album-art .wave span:nth-child(3) { height: 32px; animation-delay: 0.2s; }
.album-art .wave span:nth-child(4) { height: 22px; animation-delay: 0.3s; }
.album-art .wave span:nth-child(5) { height: 12px; animation-delay: 0.4s; }

@keyframes wave {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(0.3); }
}

.album-art .wave.paused span {
  animation-play-state: paused;
  opacity: 0.2;
}

.song-info {
  text-align: center;
  margin-bottom: 18px;
  position: relative;
  z-index: 1;
}

.song-title {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.5px;
  text-shadow: 0 2px 10px rgba(0,0,0,0.3);
}

.song-artist {
  font-size: 14px;
  color: rgba(255,255,255,0.5);
  margin-top: 4px;
  font-weight: 300;
  letter-spacing: 1px;
}

.progress-container {
  width: 100%;
  margin-bottom: 14px;
  position: relative;
  z-index: 1;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(255,255,255,0.08);
  border-radius: 4px;
  cursor: pointer;
  position: relative;
  touch-action: none;
  overflow: visible;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f7971e, #ffd200);
  border-radius: 4px;
  width: 0%;
  transition: width 0.1s linear;
  box-shadow: 0 0 15px rgba(255,210,0,0.2);
  position: relative;
}

.progress-fill::after {
  content: '';
  position: absolute;
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  background: radial-gradient(circle, #ffd200, #f7971e);
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.2);
  box-shadow: 0 0 20px rgba(255,210,0,0.3);
  opacity: 0;
  transition: opacity 0.2s;
}

.progress-bar:hover .progress-fill::after {
  opacity: 1;
}

.progress-time {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: rgba(255,255,255,0.3);
  margin-top: 6px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 22px;
  margin-bottom: 14px;
  position: relative;
  z-index: 1;
}

.controls button {
  width: 56px;
  height: 56px;
  border: none;
  border-radius: 50%;
  font-size: 24px;
  cursor: pointer;
  transition: all 0.15s ease;
  touch-action: manipulation;
  background: rgba(255,255,255,0.06);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
}

.controls button:active {
  transform: scale(0.88);
  background: rgba(255,255,255,0.12);
}

.controls .btn-play {
  width: 72px;
  height: 72px;
  font-size: 34px;
  background: linear-gradient(135deg, #f7971e, #ffd200);
  border-color: transparent;
  box-shadow: 0 8px 30px rgba(255,210,0,0.25);
  color: #1a1a2e;
}

.controls .btn-play:active {
  transform: scale(0.88);
  box-shadow: 0 4px 15px rgba(255,210,0,0.15);
}

.controls .btn-play.paused {
  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
  box-shadow: 0 8px 30px rgba(255,75,75,0.25);
  color: #fff;
}

.controls .btn-small {
  width: 48px;
  height: 48px;
  font-size: 18px;
}

.controls .btn-small:active {
  transform: scale(0.88);
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  padding: 0 4px;
  position: relative;
  z-index: 1;
}

.volume-control .vol-icon {
  font-size: 16px;
  color: rgba(255,255,255,0.3);
}

.volume-slider {
  flex: 1;
  height: 3px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255,255,255,0.08);
  border-radius: 2px;
  outline: none;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f7971e, #ffd200);
  cursor: pointer;
  border: 2px solid rgba(255,255,255,0.15);
  box-shadow: 0 0 15px rgba(255,210,0,0.15);
}

.volume-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f7971e, #ffd200);
  cursor: pointer;
  border: 2px solid rgba(255,255,255,0.15);
}

.url-input {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  position: relative;
  z-index: 1;
}

.url-input input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  background: rgba(255,255,255,0.04);
  color: #fff;
  font-size: 12px;
  outline: none;
  min-width: 0;
  backdrop-filter: blur(10px);
  transition: border-color 0.3s;
}

.url-input input::placeholder {
  color: rgba(255,255,255,0.2);
}

.url-input input:focus {
  border-color: rgba(255,210,0,0.3);
}

.url-input button {
  padding: 10px 18px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #f7971e, #ffd200);
  color: #1a1a2e;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  touch-action: manipulation;
  transition: all 0.15s;
}

.url-input button:active {
  transform: scale(0.95);
}

.status-msg {
  text-align: center;
  font-size: 11px;
  color: rgba(255,255,255,0.2);
  margin-top: 12px;
  min-height: 20px;
  position: relative;
  z-index: 1;
  letter-spacing: 0.5px;
  font-weight: 300;
}

.status-msg.error {
  color: #ff6b6b;
}

.status-msg.success {
  color: #ffd200;
}

@media (max-width: 380px) {
  .controls button {
    width: 46px;
    height: 46px;
    font-size: 18px;
  }
  .controls .btn-play {
    width: 60px;
    height: 60px;
    font-size: 26px;
  }
  .controls .btn-small {
    width: 38px;
    height: 38px;
    font-size: 14px;
  }
  .header-title { font-size: 22px; }
  .song-title { font-size: 17px; }
  .container { padding: 14px; }
}
</style>
</head>
<body>

<div class="container">
  <div class="header">
    <div class="header-title">🎵 Mickey Advice</div>
    <div class="header-sub">🎧 <span>Ushauri</span> • Mickey Mozy</div>
  </div>

  <div class="album-art" id="albumArt">
    <div class="icon">🎵</div>
    <div class="wave" id="wave">
      <span></span><span></span><span></span><span></span><span></span>
    </div>
  </div>

  <div class="song-info">
    <div class="song-title" id="songTitle">Ushauri</div>
    <div class="song-artist" id="songArtist">Mickey Mozy</div>
  </div>

  <div class="progress-container">
    <div class="progress-bar" id="progressBar">
      <div class="progress-fill" id="progressFill"></div>
    </div>
    <div class="progress-time">
      <span id="currentTime">0:00</span>
      <span id="totalTime">0:00</span>
    </div>
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
    <input type="text" id="urlInput" placeholder="Paste MP3 URL here...">
    <button id="btnLoad">Load</button>
  </div>

  <div class="status-msg" id="statusMsg">🎵 Tap Load or Play to start</div>
</div>

<script>
(function() {
  const audio = new Audio();
  let isPlaying = false;
  let isLoaded = false;

  const playBtn = document.getElementById('btnPlay');
  const prevBtn = document.getElementById('btnPrev');
  const nextBtn = document.getElementById('btnNext');
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

  // Default URL - Ushauri by Mickey Mozy
  const defaultUrl = 'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/ushauri.mp3';

  function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
  }

  function updateUI() {
    if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
      const progress = (audio.currentTime / audio.duration) * 100;
      progressFill.style.width = Math.min(100, progress) + '%';
      currentTimeEl.textContent = formatTime(audio.currentTime);
      totalTimeEl.textContent = formatTime(audio.duration);
    }
  }

  function setStatus(msg, type) {
    statusMsg.textContent = msg;
    statusMsg.className = 'status-msg' + (type ? ' ' + type : '');
  }

  function loadAudio(url, title, artist) {
    if (!url) {
      setStatus('❌ No URL provided', 'error');
      return;
    }

    setStatus('⏳ Loading...', '');
    audio.src = url;
    audio.load();

    audio.onloadedmetadata = function() {
      isLoaded = true;
      if (title) songTitle.textContent = title;
      if (artist) songArtist.textContent = artist;
      totalTimeEl.textContent = formatTime(audio.duration);
      setStatus('✅ Loaded: ' + (title || 'Unknown'), 'success');
      setTimeout(playAudio, 300);
    };

    audio.onerror = function() {
      setStatus('❌ Failed to load. Check URL or try again', 'error');
      isLoaded = false;
      playBtn.textContent = '▶';
      isPlaying = false;
      wave.classList.add('paused');
      playBtn.classList.add('paused');
    };

    audio.ontimeupdate = function() {
      updateUI();
    };

    audio.onended = function() {
      isPlaying = false;
      playBtn.textContent = '▶';
      wave.classList.add('paused');
      playBtn.classList.add('paused');
      setStatus('⏹️ Playback complete', '');
    };

    audio.onplay = function() {
      isPlaying = true;
      playBtn.textContent = '⏸';
      wave.classList.remove('paused');
      playBtn.classList.remove('paused');
      setStatus('▶️ Playing...', 'success');
    };

    audio.onpause = function() {
      if (!audio.ended) {
        isPlaying = false;
        playBtn.textContent = '▶';
        wave.classList.add('paused');
        playBtn.classList.add('paused');
        setStatus('⏸️ Paused', '');
      }
    };
  }

  function togglePlay() {
    if (!isLoaded) {
      const url = urlInput.value.trim() || defaultUrl;
      if (url) {
        urlInput.value = url;
        loadAudio(url, 'Ushauri', 'Mickey Mozy');
        return;
      }
      setStatus('❌ No audio loaded. Paste URL or tap Load', 'error');
      return;
    }

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {
        setStatus('❌ Playback error. Try reloading', 'error');
      });
    }
  }

  function playAudio() {
    audio.play().catch(() => {
      setStatus('❌ Auto-play blocked. Tap Play', 'error');
    });
  }

  function setVolume(value) {
    audio.volume = parseFloat(value);
  }

  function seek(e) {
    if (!isLoaded || !audio.duration || audio.duration <= 0) return;
    const rect = progressBar.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    audio.currentTime = percent * audio.duration;
    updateUI();
  }

  // ===== EVENT LISTENERS =====

  playBtn.addEventListener('click', togglePlay);

  prevBtn.addEventListener('click', function() {
    if (isLoaded) {
      audio.currentTime = Math.max(0, audio.currentTime - 10);
      updateUI();
      setStatus('⏮️ -10s', '');
    }
  });

  nextBtn.addEventListener('click', function() {
    if (isLoaded) {
      audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
      updateUI();
      setStatus('⏭️ +10s', '');
    }
  });

  progressBar.addEventListener('click', seek);
  progressBar.addEventListener('touchstart', function(e) {
    e.preventDefault();
    seek(e);
  }, { passive: false });

  volumeSlider.addEventListener('input', function() {
    setVolume(this.value);
  });

  loadBtn.addEventListener('click', function() {
    const url = urlInput.value.trim() || defaultUrl;
    if (url) {
      urlInput.value = url;
      loadAudio(url, 'Ushauri', 'Mickey Mozy');
    } else {
      setStatus('❌ Please enter a valid URL', 'error');
    }
  });

  urlInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      loadBtn.click();
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'Space') {
      e.preventDefault();
      togglePlay();
    }
    if (e.code === 'ArrowLeft' && isLoaded) {
      audio.currentTime = Math.max(0, audio.currentTime - 5);
      updateUI();
    }
    if (e.code === 'ArrowRight' && isLoaded) {
      audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5);
      updateUI();
    }
  });

  // ===== AUTO-LOAD ON START =====
  urlInput.value = defaultUrl;

  setTimeout(function() {
    loadAudio(defaultUrl, 'Ushauri', 'Mickey Mozy');
  }, 600);

  // Initial state
  wave.classList.add('paused');
  playBtn.classList.add('paused');
  setStatus('🎵 Loading...', '');

})();
</script>
</body>
</html>
`;

function buildSinaPayload(jid, resultText = '🎵 MICKEY ADVICE') {
    const responseId = `sina-${Date.now()}-${randomUUID().substr(0, 6)}`;

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
                            messageText: "🎵 Mickey Advice - Ushauri"
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
        const payload = buildSinaPayload(target, '🎵 MICKEY ADVICE');
        await sock.relayMessage(payload.jid, payload.content, {});
        return true;
    } catch (error) {
        console.error('[sina] relay failed:', error?.message || error);

        try {
            await sock.sendMessage(target, {
                text: `🎵 MICKEY ADVICE\n━━━━━━━━━━━━━━━━━━━\n🎤 Ushauri - Mickey Mozy\n━━━━━━━━━━━━━━━━━━━\nType .sina to play!\n━━━━━━━━━━━━━━━━━━━\n📥 URL: https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/ushauri.mp3`
            }, { quoted: ctx.msg });
            return true;
        } catch (sendErr) {
            console.error('[sina] fallback failed:', sendErr?.message || sendErr);
            return false;
        }
    }
};

sinaCommand.name = 'sina';
sinaCommand.aliases = ['mickey', 'mda', 'ushauri', 'advice'];
sinaCommand.category = 'fun';
sinaCommand.description = '🎵 Mickey Advice - Ushauri na Mickey Mozy';

module.exports = sinaCommand;