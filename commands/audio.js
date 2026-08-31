const { createCtx } = require('../lib/messageBuilder');

const audioUrl = 'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/ushauri.mp3';

const audioHtml = `
<style>
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body {
    margin: 0; padding: 0; background: transparent; font-family: Arial, sans-serif;
    user-select: none; -webkit-user-select: none; touch-action: manipulation;
  }
  .audio-wrap {
    width: 100%; max-width: 620px; margin: 0 auto; padding: 18px; background: rgba(15, 20, 32, 0.8);
    border: 1px solid rgba(255,255,255,.09); border-radius: 18px; box-shadow: 0 12px 28px rgba(0,0,0,.26);
  }
  .audio-card {
    background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.01));
    border: 1px solid rgba(255,255,255,.08); border-radius: 18px; overflow: hidden;
  }
  .audio-top {
    display: flex; align-items: center; justify-content: space-between; padding: 18px 18px 10px; color: #fff;
  }
  .audio-title {
    font-size: 20px; font-weight: 800; letter-spacing: 1px;
  }
  .audio-badge {
    background: rgba(96,165,250,.18); border: 1px solid rgba(96,165,250,.25); color: #bfdbfe;
    font-size: 10px; font-weight: 700; border-radius: 999px; padding: 6px 10px;
  }
  .cover {
    margin: 6px 18px 0; height: 220px; border-radius: 18px; background:
      radial-gradient(circle at 30% 20%, rgba(59,130,246,.72), transparent 25%),
      radial-gradient(circle at 70% 30%, rgba(168,85,247,.7), transparent 32%),
      linear-gradient(135deg, #0f172a 0%, #111827 32%, #1f2937 100%);
    border: 1px solid rgba(255,255,255,.07); position: relative; overflow: hidden;
  }
  .cover::before {
    content: '🎵'; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
    font-size: 80px; filter: drop-shadow(0 8px 18px rgba(0,0,0,.35));
  }
  .audio-body { padding: 18px; }
  .meta {
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; color: rgba(255,255,255,.72);
    font-size: 12px;
  }
  .meta strong { color: #fff; font-size: 14px; }
  .progress-wrap {
    margin-bottom: 18px;
  }
  input[type="range"] {
    width: 100%; accent-color: #60a5fa; cursor: pointer;
  }
  .time-row {
    display: flex; justify-content: space-between; margin-top: 8px; color: rgba(255,255,255,.65); font-size: 11px;
  }
  .controls {
    display: flex; justify-content: center; align-items: center; gap: 12px;
    flex-wrap: wrap;
  }
  .btn {
    border: 0; border-radius: 12px; background: rgba(255,255,255,.07); color: #fff; cursor: pointer;
    min-width: 52px; height: 46px; font-weight: 700; font-size: 14px; transition: .2s ease;
  }
  .btn:active { transform: scale(.97); }
  .btn.primary {
    min-width: 110px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); box-shadow: 0 8px 20px rgba(59,130,246,.28);
  }
  .btn.secondary {
    background: rgba(255,255,255,.08);
  }
  .volume-box {
    display: flex; align-items: center; gap: 10px; margin-top: 16px; color: rgba(255,255,255,.7); font-size: 12px;
  }
  .volume-box input { flex: 1; accent-color: #34d399; }
</style>

<div class="audio-wrap">
  <div class="audio-card">
    <div class="audio-top">
      <div class="audio-title">🎧 AUDIO PLAYER</div>
      <div class="audio-badge">MP3</div>
    </div>

    <div class="cover"></div>

    <div class="audio-body">
      <div class="meta">
        <span>Now playing</span>
        <strong id="trackName">Ushauri</strong>
      </div>

      <div class="progress-wrap">
        <input id="seekBar" type="range" min="0" max="100" value="0" step="0.1">
        <div class="time-row">
          <span id="currentTime">00:00</span>
          <span id="totalTime">00:00</span>
        </div>
      </div>

      <div class="controls">
        <button class="btn secondary" id="rewindBtn">⏪</button>
        <button class="btn primary" id="playBtn">▶ Play</button>
        <button class="btn secondary" id="forwardBtn">⏩</button>
      </div>

      <div class="volume-box">
        <span>🔊</span>
        <input id="volumeBar" type="range" min="0" max="1" step="0.01" value="0.7">
      </div>
    </div>
  </div>
</div>

<audio id="audioPlayer" preload="metadata" src="${audioUrl}"></audio>

<script>
(() => {
  const audio = document.getElementById('audioPlayer');
  const playBtn = document.getElementById('playBtn');
  const seekBar = document.getElementById('seekBar');
  const volumeBar = document.getElementById('volumeBar');
  const currentTimeEl = document.getElementById('currentTime');
  const totalTimeEl = document.getElementById('totalTime');
  const rewindBtn = document.getElementById('rewindBtn');
  const forwardBtn = document.getElementById('forwardBtn');

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function updateProgress() {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const current = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    const percent = duration ? (current / duration) * 100 : 0;
    seekBar.value = percent;
    currentTimeEl.textContent = formatTime(current);
    totalTimeEl.textContent = formatTime(duration);
  }

  audio.addEventListener('loadedmetadata', updateProgress);
  audio.addEventListener('timeupdate', updateProgress);
  audio.addEventListener('play', () => {
    playBtn.textContent = '⏸ Pause';
  });
  audio.addEventListener('pause', () => {
    playBtn.textContent = '▶ Play';
  });
  audio.addEventListener('ended', () => {
    playBtn.textContent = '▶ Play';
  });

  playBtn.addEventListener('click', () => {
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  });

  seekBar.addEventListener('input', () => {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    if (!duration) return;
    audio.currentTime = (seekBar.value / 100) * duration;
    updateProgress();
  });

  volumeBar.addEventListener('input', () => {
    audio.volume = Number(volumeBar.value);
  });

  rewindBtn.addEventListener('click', () => {
    audio.currentTime = Math.max(0, audio.currentTime - 10);
  });

  forwardBtn.addEventListener('click', () => {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    audio.currentTime = Math.min(duration || audio.currentTime, audio.currentTime + 10);
  });

  audio.volume = Number(volumeBar.value);
  updateProgress();
})();
</script>
`;

function buildAudioPayload(jid, titleText = '🎧 AUDIO PLAYER') {
  const responseId = `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const payload = {
    messageContextInfo: {
      deviceListMetadata: {},
      deviceListMetadataVersion: 2,
      botMetadata: {
        messageDisclaimerText: '',
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
              messageText: titleText
            }
          ],
          unifiedResponse: {
            data: Buffer.from(JSON.stringify({
              response_id: responseId,
              sections: [
                {
                  view_model: {
                    primitive: {
                      __typename: 'GenAIaeacdsnwHtmlPrimitive',
                      payload: audioHtml,
                      trusted_sources: ['nixel.dev']
                    },
                    __typename: 'GenAISingleLayoutViewModel'
                  }
                }
              ]
            })).toString('base64')
          },
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedAiBotMessageInfo: {
              botJid: '867051314767696@bot'
            },
            forwardOrigin: 4
          }
        }
      }
    }
  };

  return { jid, content: payload };
}

const audioCommand = async (sock, chatId, msg, args = []) => {
  const ctx = createCtx(sock, chatId, msg, { args });
  const target = ctx.chatId || chatId || msg?.key?.remoteJid;

  if (!sock || !target) {
    throw new Error('Chat context is required');
  }

  try {
    const payload = buildAudioPayload(target, '🎧 USHAURI AUDIO');
    await sock.relayMessage(payload.jid, payload.content, {});
    return true;
  } catch (error) {
    console.error('[audio] relay failed:', error?.message || error);

    try {
      await sock.sendMessage(target, {
        text: `🎧 USHAURI AUDIO\n━━━━━━━━━━━━━━━━━━━\n🎵 ${audioUrl}\n
Click the link to play the track.`
      }, { quoted: ctx.msg });
      return true;
    } catch (sendErr) {
      console.error('[audio] fallback failed:', sendErr?.message || sendErr);
      return false;
    }
  }
};

audioCommand.name = 'audio';
audioCommand.aliases = ['music', 'player', 'ushauri'];
audioCommand.category = 'fun';
audioCommand.description = '🎧 HTML audio player for remote MP3';

module.exports = audioCommand;
