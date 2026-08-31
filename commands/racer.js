const { createCtx } = require('../lib/messageBuilder');

const racerHtml = `
<style>
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body {
    margin: 0; padding: 0; background: transparent; font-family: Arial, sans-serif;
    user-select: none; -webkit-user-select: none; touch-action: manipulation;
  }
  .racer-wrap {
    width: 100%; max-width: 620px; margin: 0 auto; padding: 14px; background: rgba(6, 12, 26, .72);
    border: 1px solid rgba(255,255,255,.08); border-radius: 18px; box-shadow: 0 12px 28px rgba(0,0,0,.26);
  }
  .racer-header {
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; color: white;
  }
  .racer-title { font-size: 20px; font-weight: 800; letter-spacing: 1px; }
  .racer-score { font-size: 12px; opacity: .8; }
  .racer-stage { position: relative; width: 100%; border-radius: 14px; overflow: hidden; border: 2px solid rgba(255,255,255,.08); }
  #racerCanvas { display: block; width: 100%; height: auto; aspect-ratio: 16 / 9; background: linear-gradient(180deg, #09111d, #111827); }
  .racer-overlay {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; flex-direction: column;
    background: rgba(0,0,0,.35); backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px);
  }
  .racer-overlay.hidden { display: none; }
  .racer-overlay h3 { margin: 0 0 8px; color: white; font-size: 28px; letter-spacing: 2px; }
  .racer-overlay p { margin: 0 0 12px; color: rgba(255,255,255,.75); font-size: 12px; letter-spacing: 1px; text-transform: uppercase; }
  .racer-btn {
    border: none; border-radius: 10px; padding: 10px 18px; background: linear-gradient(135deg, #f97316, #ef4444);
    color: white; font-weight: 800; cursor: pointer;
  }
  .racer-controls {
    display: flex; justify-content: center; gap: 12px; margin-top: 12px;
  }
  .racer-pad-btn {
    border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.06); color: white;
    border-radius: 10px; padding: 8px 14px; font-size: 12px; font-weight: 700; cursor: pointer;
  }
</style>

<div class="racer-wrap">
  <div class="racer-header">
    <div class="racer-title">🏎️ RACER</div>
    <div class="racer-score">SCORE <span id="racerScore">0</span></div>
  </div>

  <div class="racer-stage">
    <canvas id="racerCanvas" width="640" height="360"></canvas>
    <div class="racer-overlay" id="racerOverlay">
      <h3>READY?</h3>
      <p>Use arrows or A / D</p>
      <button class="racer-btn" id="racerStartBtn">START</button>
    </div>
  </div>

  <div class="racer-controls">
    <button class="racer-pad-btn" data-dir="left">←</button>
    <button class="racer-pad-btn" data-dir="right">→</button>
  </div>
</div>

<script>
(() => {
  const canvas = document.getElementById('racerCanvas');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('racerOverlay');
  const scoreEl = document.getElementById('racerScore');
  const startBtn = document.getElementById('racerStartBtn');
  const padButtons = document.querySelectorAll('.racer-pad-btn');

  const game = {
    started: false,
    score: 0,
    laneCount: 5,
    laneWidth: canvas.width / 5,
    playerX: canvas.width / 2 - 30,
    playerY: canvas.height - 55,
    playerW: 60,
    playerH: 80,
    obstacles: [],
    leftPressed: false,
    rightPressed: false,
    crash: false,
    speed: 4
  };

  function spawnObstacle() {
    const lane = Math.floor(Math.random() * game.laneCount);
    const x = lane * game.laneWidth + (game.laneWidth - 46) / 2;
    const y = -80;
    game.obstacles.push({ x, y, w: 46, h: 70, lane });
  }

  function startGame() {
    game.started = true;
    game.score = 0;
    game.crash = false;
    game.speed = 4;
    game.playerX = canvas.width / 2 - game.playerW / 2;
    game.obstacles = [];
    scoreEl.textContent = '0';
    overlay.classList.add('hidden');
  }

  function updatePlayer() {
    if (game.leftPressed) game.playerX -= 9;
    if (game.rightPressed) game.playerX += 9;
    game.playerX = Math.max(0, Math.min(canvas.width - game.playerW, game.playerX));
  }

  function updateObstacles() {
    if (!game.started || game.crash) return;

    for (let i = 0; i < game.obstacles.length; i++) {
      const obs = game.obstacles[i];
      obs.y += game.speed;
    }

    game.obstacles = game.obstacles.filter((obs) => obs.y < canvas.height + 100);

    if (Math.random() < 0.03) spawnObstacle();

    for (const obs of game.obstacles) {
      const colliding =
        game.playerX < obs.x + obs.w &&
        game.playerX + game.playerW > obs.x &&
        game.playerY < obs.y + obs.h &&
        game.playerY + game.playerH > obs.y;

      if (colliding) {
        game.crash = true;
        game.started = false;
        overlay.classList.remove('hidden');
        overlay.innerHTML = '<h3>CRASH!</h3><p>Score: ' + game.score + '</p><button class="racer-btn" id="racerRestartBtn">PLAY AGAIN</button>';
        document.getElementById('racerRestartBtn').addEventListener('click', startGame);
      }
    }
  }

  function updateScore() {
    if (!game.crash) {
      game.score += 1;
      scoreEl.textContent = String(game.score);
      if (game.score % 40 === 0) game.speed += 0.4;
    }
  }

  function drawRoad() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 3;
    ctx.setLineDash([24, 18]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    for (let i = 1; i < game.laneCount; i++) {
      const x = i * game.laneWidth;
      ctx.strokeStyle = 'rgba(255,255,255,.2)';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
  }

  function drawPlayer() {
    ctx.fillStyle = '#f97316';
    ctx.fillRect(game.playerX, game.playerY, game.playerW, game.playerH);
    ctx.fillStyle = '#fff';
    ctx.fillRect(game.playerX + 10, game.playerY + 16, 12, 12);
    ctx.fillRect(game.playerX + 38, game.playerY + 16, 12, 12);
  }

  function drawObstacles() {
    for (const obs of game.obstacles) {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
    }
  }

  function draw() {
    drawRoad();
    drawObstacles();
    drawPlayer();
  }

  function loop() {
    updatePlayer();
    updateObstacles();
    draw();
    requestAnimationFrame(loop);
  }

  setInterval(() => {
    if (game.started) updateScore();
  }, 130);

  document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (key === 'arrowleft' || key === 'a') game.leftPressed = true;
    if (key === 'arrowright' || key === 'd') game.rightPressed = true;
  });

  document.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    if (key === 'arrowleft' || key === 'a') game.leftPressed = false;
    if (key === 'arrowright' || key === 'd') game.rightPressed = false;
  });

  padButtons.forEach((button) => {
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (!game.started) startGame();
      const dir = button.dataset.dir;
      if (dir === 'left') game.leftPressed = true;
      if (dir === 'right') game.rightPressed = true;
    });
    button.addEventListener('pointerup', () => {
      const dir = button.dataset.dir;
      if (dir === 'left') game.leftPressed = false;
      if (dir === 'right') game.rightPressed = false;
    });
  });

  startBtn.addEventListener('click', startGame);
  draw();
  requestAnimationFrame(loop);
})();
</script>
`;

function buildRacerPayload(jid, titleText = '🏎️ RACER GAME') {
  const responseId = `racer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
                    payload: racerHtml,
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

const racerCommand = async (sock, chatId, msg, args = []) => {
  const ctx = createCtx(sock, chatId, msg, { args });
  const target = ctx.chatId || chatId || msg?.key?.remoteJid;

  if (!sock || !target) throw new Error('Chat context is required');

  try {
    const payload = buildRacerPayload(target, '🏎️ RACER GAME');
    await sock.relayMessage(payload.jid, payload.content, {});
    return true;
  } catch (error) {
    console.error('[racer] relay failed:', error?.message || error);
    try {
      await sock.sendMessage(target, {
        text: '🏎️ RACER GAME\n━━━━━━━━━━━━━━━━━━━\nUse arrows or A/D to dodge\nAvoid the traffic!'
      }, { quoted: ctx.msg });
      return true;
    } catch (sendErr) {
      console.error('[racer] fallback failed:', sendErr?.message || sendErr);
      return false;
    }
  }
};

racerCommand.name = 'racer';
racerCommand.aliases = ['car', 'race'];
racerCommand.category = 'fun';
racerCommand.description = '🏎️ Endless racer game';

module.exports = racerCommand;
