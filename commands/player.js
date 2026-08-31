const { createCtx } = require('../lib/messageBuilder');

// HTML ya Music Player
const musicPlayerHtml = `
<!DOCTYPE html>
<html lang="sw">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>🎵 Music Player</title>
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
  font-family: Arial, Helvetica, sans-serif;
  color: #fff;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
}

.container {
  width: 100%;
  max-width: 400px;
  margin: auto;
  padding: 20px;
  background: linear-gradient(145deg, #1a1a2e, #16213e);
  border-radius: 24px;
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 20px 60px rgba(0,0,0,0.8);
}

.header {
  text-align: center;
  margin-bottom: 20px;
}

.header-title {
  font-size: 22px;
  font-weight: 700;
  background: linear-gradient(135deg, #6bcfff, #ff6b6b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header-sub {
  font-size: 12px;
  color: #888;
  margin-top: 4px;
}

.album-art {
  width: 100%;
  aspect-ratio: 1;
  max-height: 300px;
  margin: 0 auto 20px;
  border-radius: 16px;
  background: linear-gradient(135deg, #2a2a4a, #1a1a2e);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255,255,255,0.08);
  overflow: hidden;
  position: relative;
}

.album-art .icon {
  font-size: 80px;
  opacity: 0.6;
}

.album-art .wave {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  align-items: center;
  height: 30px;
}

.album-art .wave span {
  display: block;
  width: 4px;
  background: #6bcfff;
  border-radius: 2px;
  animation: wave 0.8s ease-in-out infinite;
}

.album-art .wave span:nth-child(1) { height: 10px; animation-delay: 0s; }
.album-art .wave span:nth-child(2) { height: 20px; animation-delay: 0.1s; }
.album-art .wave span:nth-child(3) { height: 30px; animation-delay: 0.2s; }
.album-art .wave span:nth-child(4) { height: 20px; animation-delay: 0.3s; }
.album-art .wave span:nth-child(5) { height: 10px; animation-delay: 0.4s; }

@keyframes wave {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(0.4); }
}

.album-art .wave.paused span {
  animation-play-state: paused;
  opacity: 0.3;
}

.song-info {
  text-align: center;
  margin-bottom: 20px;
}

.song-title {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.song-artist {
  font-size: 13px;
  color: #888;
  margin-top: 4px;
}

.progress-container {
  width: 100%;
  margin-bottom: 16px;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  cursor: pointer;
  position: relative;
  touch-action: none;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #6bcfff, #ff6b6b);
  border-radius: 2px;
  width: 0%;
  transition: width 0.1s linear;
}

.progress-time {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #888;
  margin-top: 6px;
}

.controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 16px;
}

.controls button {
  width: 60px;
  height: 60px;
  border: none;
  border-radius: 50%;
  font-size: 28px;
  cursor: pointer;
  transition: all 0.15s ease;
  touch-action: manipulation;
  background: rgba(255,255,255,0.08);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.controls button:active {
  transform: scale(0.92);
  background: rgba(255,255,255,0.2);
}

.controls .btn-play {
  width: 72px;
  height: 72px;
  font-size: 34px;
  background: linear-gradient(135deg, #6bcfff, #4a9eff);
  border-color: transparent;
  box-shadow: 0 8px 25px rgba(75, 158, 255, 0.3);
}

.controls .btn-play:active {
  transform: scale(0.9);
}

.controls .btn-play.paused {
  background: linear-gradient(135deg, #ff6b6b, #ff4a4a);
  box-shadow: 0 8px 25px rgba(255, 75, 75, 0.3);
}

.controls .btn-small {
  width: 48px;
  height: 48px;
  font-size: 18px;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 0 10px;
}

.volume-control .vol-icon {
  font-size: 18px;
  color: #888;
}

.volume-slider {
  flex: 1;
  height: 3px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  outline: none;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6bcfff, #4a9eff);
  cursor: pointer;
  border: 2px solid rgba(255,255,255,0.2);
}

.volume-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6bcfff, #4a9eff);
  cursor: pointer;
  border: 2px solid rgba(255,255,255,0.2);
}

.url-input {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.url-input input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  background: rgba(255,255,255,0.05);
  color: #fff;
  font-size: 12px;
  outline: none;
  min-width: 0;
}

.url-input input::placeholder {
  color: #666;
}

.url-input input:focus {
  border-color: #6bcfff;
}

.url-input button {
  padding: 10px 18px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #6bcfff, #4a9eff);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  touch-action: manipulation;
}

.url-input button:active {
  transform: scale(0.95);
}

.status-msg {
  text-align: center;
  font-size: 11px;
  color: #666;
  margin-top: 12px;
  min-height: 20px;
}

@media (max-width: 380px) {
  .controls button {
    width: 50px;
    height: 50px;
    font-size: 22px;
  }
  .controls .btn-play {
    width: 62px;
    height: 62px;
    font-size: 28px;
  }
  .controls .btn-small {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }
  .header-title { font-size: 18px; }
}
</style>
</head>
<body>

<div class="container">
  <div class="header">
    <div class="header-title">🎵 MUSIC PLAYER</div>
    <div class="header-sub">Raw MP3 Player</div>
  </div>

  <div class="album-art" id="albumArt">
    <div class="icon">🎵</div>
    <div class="wave" id="wave">
      <span></span><span></span><span></span><span></span><span></span>
    </div>
  </div>

  <div class="song-info">
    <div class="song-title" id="songTitle">Sina Mda Nae</div>
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
    <input type="text" id="urlInput" placeholder="Paste MP3 URL here..." value="https://github.com/Mickeymozy/Mickey-Vip/raw/main/sina%20mda%20nae.mp3">
    <button id="btnLoad">Load</button>
  </div>

  <div class="status-msg" id="statusMsg">🎵 Ready to play</div>
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
  const albumArt = document.getElementById('albumArt');

  const playlist = [
    { title: 'Sina Mda Nae', artist: 'Mickey Mozy', url: 'https://github.com/Mickeymozy/Mickey-Vip/raw/main/sina%20mda%20nae.mp3' }
  ];

  let currentIndex = 0;

  function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
  }

  function updateUI() {
    if (audio.duration && !isNaN(audio.duration)) {
      const progress = (audio.currentTime / audio.duration) * 100;
      progressFill.style.width = progress + '%';
      currentTimeEl.textContent = formatTime(audio.currentTime);
      totalTimeEl.textContent = formatTime(audio.duration);
    }
  }

  function setStatus(msg, isError = false) {
    statusMsg.textContent = msg;
    statusMsg.style.color = isError ? '#ff6b6b' : '#666';
  }

  function loadAudio(url, title, artist) {
    if (!url) {
      setStatus('❌ No URL provided', true);
      return;
    }

    setStatus('⏳ Loading...');

    audio.src = url;
    audio.load();

    audio.onloadedmetadata = function() {
      isLoaded = true;
      if (title) songTitle.textContent = title;
      if (artist) songArtist.textContent = artist;
      totalTimeEl.textContent = formatTime(audio.duration);
      setStatus('✅ Loaded: ' + (title || 'Unknown'));
      playAudio();
    };

    audio.onerror = function() {
      setStatus('❌ Failed to load audio. Check URL', true);
      isLoaded = false;
      playBtn.textContent = '▶';
      isPlaying = false;
      wave.classList.add('paused');
    };

    audio.ontimeupdate = function() {
      updateUI();
    };

    audio.onended = function() {
      isPlaying = false;
      playBtn.textContent = '▶';
      wave.classList.add('paused');
      setStatus('⏹️ Playback ended');
    };

    audio.onplay = function() {
      isPlaying = true;
      playBtn.textContent = '⏸';
      wave.classList.remove('paused');
      setStatus('▶️ Playing...');
    };

    audio.onpause = function() {
      isPlaying = false;
      playBtn.textContent = '▶';
      wave.classList.add('paused');
      setStatus('⏸️ Paused');
    };
  }

  function togglePlay() {
    if (!isLoaded) {
      const url = urlInput.value.trim();
      if (url) {
        loadAudio(url);
        return;
      }
      setStatus('❌ No audio loaded. Paste URL or use Load button', true);
      return;
    }

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {
        setStatus('❌ Cannot play. Check URL', true);
      });
    }
  }

  function playAudio() {
    audio.play().catch(() => {
      setStatus('❌ Cannot play. Check URL', true);
    });
  }

  function setVolume(value) {
    audio.volume = parseFloat(value);
  }

  function seek(e) {
    if (!isLoaded || !audio.duration) return;
    const rect = progressBar.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    audio.currentTime = percent * audio.duration;
    updateUI();
  }

  playBtn.addEventListener('click', togglePlay);

  prevBtn.addEventListener('click', function() {
    if (isLoaded) {
      audio.currentTime = 0;
      updateUI();
      setStatus('⏮️ Restarted');
    }
  });

  nextBtn.addEventListener('click', function() {
    if (isLoaded) {
      audio.currentTime = 0;
      updateUI();
      setStatus('⏭️ Restarted');
    }
  });

  progressBar.addEventListener('click', seek);
  progressBar.addEventListener('touchstart', function(e) {
    e.preventDefault();
    seek(e);
  });

  volumeSlider.addEventListener('input', function() {
    setVolume(this.value);
  });

  loadBtn.addEventListener('click', function() {
    const url = urlInput.value.trim();
    if (!url) {
      setStatus('❌ Please enter a URL', true);
      return;
    }
    loadAudio(url);
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
    if (e.code === 'ArrowLeft') {
      audio.currentTime = Math.max(0, audio.currentTime - 5);
    }
    if (e.code === 'ArrowRight') {
      audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5);
    }
  });

  setTimeout(function() {
    const defaultUrl = urlInput.value.trim();
    if (defaultUrl) {
      loadAudio(defaultUrl, 'Sina Mda Nae', 'Mickey Mozy');
    }
  }, 500);

  setInterval(updateUI, 1000);

  wave.classList.add('paused');
  setStatus('🎵 Enter MP3 URL and tap Load');

  console.log('🎵 Music Player loaded');
})();
</script>
</body>
</html>
`;

function buildPlayerPayload(jid, resultText = '🎵 MUSIC PLAYER') {
    const responseId = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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

const playerCommand = async (sock, chatId, msg, args = []) => {
    const ctx = createCtx(sock, chatId, msg, { args });
    const target = ctx.chatId || chatId || msg?.key?.remoteJid;

    if (!sock || !target) {
        throw new Error('Chat context is required');
    }

    try {
        const payload = buildPlayerPayload(target, '🎵 MUSIC PLAYER');
        await sock.relayMessage(payload.jid, payload.content, {});
        return true;
    } catch (error) {
        console.error('[player] relay failed:', error?.message || error);

        try {
            await sock.sendMessage(target, {
                text: `🎵 MUSIC PLAYER\n━━━━━━━━━━━━━━━━━━━\n🎶 Paste MP3 URL to play\n━━━━━━━━━━━━━━━━━━━\n📝 Example: .player [url]\n━━━━━━━━━━━━━━━━━━━\nType .player to open!`
            }, { quoted: ctx.msg });
            return true;
        } catch (sendErr) {
            console.error('[player] fallback failed:', sendErr?.message || sendErr);
            return false;
        }
    }
};

playerCommand.name = 'player';
playerCommand.aliases = ['music', 'mp3', 'play'];
playerCommand.category = 'fun';
playerCommand.description = '🎵 Music Player - Play MP3 from URL';

module.exports = playerCommand;