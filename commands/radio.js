const { createCtx } = require('../lib/messageBuilder');

const radioStations = [
  {
    name: 'Mickey FM',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
  },
  {
    name: 'Chill Mix',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
  },
  {
    name: 'Night Wave',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
  }
];

const radioHtml = `
<style>
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body {
    margin: 0; padding: 0; background: transparent; font-family: Arial, sans-serif;
    user-select: none; -webkit-user-select: none; touch-action: manipulation;
  }
  .radio-wrap {
    width: 100%; max-width: 620px; margin: 0 auto; padding: 18px; background: rgba(12, 15, 25, 0.8);
    border: 1px solid rgba(255,255,255,.09); border-radius: 18px; box-shadow: 0 12px 28px rgba(0,0,0,.26);
  }
  .radio-box {
    background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.01));
    border: 1px solid rgba(255,255,255,.06); border-radius: 18px; overflow: hidden;
  }
  .radio-head {
    display: flex; justify-content: space-between; align-items: center; padding: 18px 18px 10px;
    color: white;
  }
  .radio-title {
    font-size: 20px; font-weight: 800; letter-spacing: 1.1px;
  }
  .radio-live {
    background: rgba(239,68,68,.15); color: #fecaca; border: 1px solid rgba(239,68,68,.4);
    border-radius: 999px; padding: 6px 10px; font-size: 10px; font-weight: 800; letter-spacing: 1px;
  }
  .radio-screen {
    margin: 0 18px; height: 220px; border-radius: 18px; position: relative; overflow: hidden;
    background: radial-gradient(circle at 50% 30%, rgba(59,130,246,.38), transparent 25%),
      linear-gradient(145deg, #111827 0%, #0f172a 28%, #111827 100%);
    border: 1px solid rgba(255,255,255,.06);
  }
  .radio-screen::before {
    content: '📻'; position: absolute; inset: 50% auto auto 50%; transform: translate(-50%, -50%);
    font-size: 78px; filter: drop-shadow(0 10px 20px rgba(0,0,0,.38));
  }
  .radio-screen::after {
    content: ''; position: absolute; left: 50%; bottom: 18px; transform: translateX(-50%);
    width: 128px; height: 18px; border-radius: 999px; background: rgba(255,255,255,.1);
    box-shadow: 0 0 20px rgba(96,165,250,.4);
  }
  .radio-body { padding: 18px; }
  .station-name {
    color: white; font-size: 18px; font-weight: 800; margin-bottom: 12px;
  }
  .controls {
    display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 16px;
    flex-wrap: wrap;
  }
  .btn {
    border: 0; border-radius: 12px; color: white; font-weight: 800; cursor: pointer;
    min-width: 58px; height: 46px; background: rgba(255,255,255,.08);
  }
  .btn.primary {
    min-width: 120px; background: linear-gradient(135deg, #ef4444, #f59e0b);
    box-shadow: 0 10px 18px rgba(239,68,68,.2);
  }
  .station-list {
    display: grid; gap: 8px;
  }
  .station-item {
    background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.06); border-radius: 10px;
    color: rgba(255,255,255,.9); font-size: 12px; font-weight: 700; padding: 10px 12px; cursor: pointer; text-align: left;
  }
  .station-item.active {
    background: rgba(96,165,250,.12); border-color: rgba(96,165,250,.3);
    color: #dbeafe;
  }
  .volume-box {
    display: flex; align-items: center; gap: 10px; margin-top: 14px; color: rgba(255,255,255,.7); font-size: 12px;
  }
  .volume-box input { flex: 1; accent-color: #34d399; }
</style>

<div class="radio-wrap">
  <div class="radio-box">
    <div class="radio-head">
      <div class="radio-title">📻 RADIO</div>
      <div class="radio-live">LIVE</div>
    </div>

    <div class="radio-screen"></div>

    <div class="radio-body">
      <div class="station-name" id="stationName">Mickey FM</div>

      <div class="controls">
        <button class="btn" id="prevBtn">⏮</button>
        <button class="btn primary" id="playBtn">▶ Play</button>
        <button class="btn" id="nextBtn">⏭</button>
      </div>

      <div class="station-list" id="stationList"></div>

      <div class="volume-box">
        <span>🔊</span>
        <input id="volumeBar" type="range" min="0" max="1" step="0.01" value="0.7">
      </div>
    </div>
  </div>
</div>

<audio id="radioPlayer" preload="auto"></audio>

<script>
(() => {
  const stations = ${JSON.stringify(radioStations)};
  const audio = document.getElementById('radioPlayer');
  const playBtn = document.getElementById('playBtn');
  const stationName = document.getElementById('stationName');
  const stationList = document.getElementById('stationList');
  const volumeBar = document.getElementById('volumeBar');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  let currentIndex = 0;

  function renderStations() {
    stationList.innerHTML = '';
    stations.forEach((station, index) => {
      const btn = document.createElement('button');
      btn.className = 'station-item' + (index === currentIndex ? ' active' : '');
      btn.textContent = station.name;
      btn.addEventListener('click', () => {
        currentIndex = index;
        loadStation();
      });
      stationList.appendChild(btn);
    });
  }

  function loadStation() {
    const station = stations[currentIndex];
    stationName.textContent = station.name;
    audio.src = station.url;
    audio.volume = Number(volumeBar.value);
    renderStations();
    if (!audio.paused) {
      audio.play().catch(() => {});
    }
  }

  function togglePlay() {
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }

  audio.addEventListener('play', () => {
    playBtn.textContent = '⏸ Pause';
  });

  audio.addEventListener('pause', () => {
    playBtn.textContent = '▶ Play';
  });

  volumeBar.addEventListener('input', () => {
    audio.volume = Number(volumeBar.value);
  });

  prevBtn.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + stations.length) % stations.length;
    loadStation();
  });

  nextBtn.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % stations.length;
    loadStation();
  });

  playBtn.addEventListener('click', togglePlay);
  audio.volume = Number(volumeBar.value);
  renderStations();
  loadStation();
})();
</script>
`;

function buildRadioPayload(jid, titleText = '📻 RADIO') {
  const responseId = `radio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
            { messageType: 2, messageText: titleText }
          ],
          unifiedResponse: {
            data: Buffer.from(JSON.stringify({
              response_id: responseId,
              sections: [{
                view_model: {
                  primitive: {
                    __typename: 'GenAIaeacdsnwHtmlPrimitive',
                    payload: radioHtml,
                    trusted_sources: ['nixel.dev']
                  },
                  __typename: 'GenAISingleLayoutViewModel'
                }
              }]
            })).toString('base64')
          },
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' },
            forwardOrigin: 4
          }
        }
      }
    }
  };

  return { jid, content: payload };
}

const radioCommand = async (sock, chatId, msg, args = []) => {
  const ctx = createCtx(sock, chatId, msg, { args });
  const target = ctx.chatId || chatId || msg?.key?.remoteJid;

  if (!sock || !target) {
    throw new Error('Chat context is required');
  }

  try {
    const payload = buildRadioPayload(target, '📻 RADIO');
    await sock.relayMessage(payload.jid, payload.content, {});
    return true;
  } catch (error) {
    console.error('[radio] relay failed:', error?.message || error);

    try {
      await sock.sendMessage(target, {
        text: '📻 RADIO\n━━━━━━━━━━━━━━━━━━━\nPlay live station stream from the bot UI.'
      }, { quoted: ctx.msg });
      return true;
    } catch (sendErr) {
      console.error('[radio] fallback failed:', sendErr?.message || sendErr);
      return false;
    }
  }
};

radioCommand.name = 'radio';
radioCommand.aliases = ['fm', 'live', 'station'];
radioCommand.category = 'fun';
radioCommand.description = '📻 Radio player interface with station switching';

module.exports = radioCommand;
