const { createCtx } = require('../lib/messageBuilder');

const brickHtml = `
<style>
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body {
    margin: 0; padding: 0; background: transparent; font-family: Arial, sans-serif;
    user-select: none; -webkit-user-select: none; touch-action: manipulation;
  }
  .brick-wrap {
    width: 100%; max-width: 620px; margin: 0 auto; padding: 14px; background: rgba(9, 13, 22, .72);
    border: 1px solid rgba(255,255,255,.08); border-radius: 18px; box-shadow: 0 12px 28px rgba(0,0,0,.26);
  }
  .brick-header {
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; color: white;
  }
  .brick-title { font-size: 20px; font-weight: 800; letter-spacing: 1px; }
  .brick-score { font-size: 12px; opacity: .8; }
  .brick-stage {
    position: relative; width: 100%; overflow: hidden; border-radius: 14px; border: 2px solid rgba(255,255,255,.08);
    background: linear-gradient(180deg, #0b1120, #111827);
  }
  #brickCanvas { display: block; width: 100%; height: auto; aspect-ratio: 16 / 9; }
  .brick-overlay {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; flex-direction: column;
    background: rgba(0,0,0,.35); backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px);
  }
  .brick-overlay.hidden { display: none; }
  .brick-overlay h3 { margin: 0 0 8px; color: white; font-size: 28px; letter-spacing: 2px; }
  .brick-overlay p { margin: 0 0 12px; color: rgba(255,255,255,.75); font-size: 12px; letter-spacing: 1px; text-transform: uppercase; }
  .brick-btn {
    border: none; border-radius: 10px; padding: 10px 18px; background: linear-gradient(135deg, #22c55e, #38bdf8);
    color: white; font-weight: 800; cursor: pointer;
  }
  .brick-controls {
    display: flex; justify-content: center; gap: 12px; margin-top: 12px;
  }
  .brick-pad-btn {
    border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.06); color: white;
    border-radius: 10px; padding: 8px 14px; font-size: 12px; font-weight: 700; cursor: pointer;
  }
</style>

<div class="brick-wrap">
  <div class="brick-header">
    <div class="brick-title">🧱 BRICK</div>
    <div class="brick-score">SCORE <span id="brickScore">0</span></div>
  </div>

  <div class="brick-stage">
    <canvas id="brickCanvas" width="640" height="360"></canvas>
    <div class="brick-overlay" id="brickOverlay">
      <h3>READY?</h3>
      <p>Use arrows or A / D</p>
      <button class="brick-btn" id="brickStartBtn">START</button>
    </div>
  </div>

  <div class="brick-controls">
    <button class="brick-pad-btn" data-dir="left">←</button>
    <button class="brick-pad-btn" data-dir="right">→</button>
  </div>
</div>

<script>
(() => {
  const canvas = document.getElementById('brickCanvas');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('brickOverlay');
  const scoreEl = document.getElementById('brickScore');
  const startBtn = document.getElementById('brickStartBtn');
  const padButtons = document.querySelectorAll('.brick-pad-btn');

  const state = {
    started: false,
    score: 0,
    leftPressed: false,
    rightPressed: false,
    player: { x: canvas.width / 2 - 50, y: canvas.height - 24, width: 110, height: 14, speed: 8 },
    ball: { x: canvas.width / 2, y: canvas.height - 40, radius: 8, dx: 4, dy: -4 },
    bricks: [],
    rows: 4,
    cols: 8,
    brickWidth: 64,
    brickHeight: 20,
    brickGap: 10,
    gameOver: false,
    win: false
  };

  function resetBricks() {
    state.bricks = [];
    const offsetX = 48;
    const offsetY = 36;
    for (let row = 0; row < state.rows; row++) {
      for (let col = 0; col < state.cols; col++) {
        state.bricks.push({
          x: offsetX + col * (state.brickWidth + state.brickGap),
          y: offsetY + row * (state.brickHeight + state.brickGap),
          w: state.brickWidth,
          h: state.brickHeight,
          alive: true
        });
      }
    }
  }

  function resetBall() {
    state.ball.x = state.player.x + state.player.width / 2;
    state.ball.y = state.player.y - 12;
    state.ball.dx = (Math.random() > 0.5 ? 1 : -1) * 4;
    state.ball.dy = -4;
  }

  function startGame() {
    state.started = true;
    state.score = 0;
    state.gameOver = false;
    state.win = false;
    resetBricks();
    state.player.x = canvas.width / 2 - 50;
    resetBall();
    scoreEl.textContent = '0';
    overlay.classList.add('hidden');
  }

  function updateScore() {
    scoreEl.textContent = String(state.score);
  }

  function updatePlayer() {
    if (state.leftPressed) state.player.x -= state.player.speed;
    if (state.rightPressed) state.player.x += state.player.speed;
    state.player.x = Math.max(0, Math.min(canvas.width - state.player.width, state.player.x));
  }

  function checkCollisions() {
    for (const brick of state.bricks) {
      if (!brick.alive) continue;
      const hit =
        state.ball.x + state.ball.radius > brick.x &&
        state.ball.x - state.ball.radius < brick.x + brick.w &&
        state.ball.y + state.ball.radius > brick.y &&
        state.ball.y - state.ball.radius < brick.y + brick.h;

      if (hit) {
        brick.alive = false;
        state.score += 10;
        updateScore();
        state.ball.dy *= -1;
        break;
      }
    }

    const paddleHit =
      state.ball.y + state.ball.radius >= state.player.y &&
      state.ball.y - state.ball.radius <= state.player.y + state.player.height &&
      state.ball.x >= state.player.x &&
      state.ball.x <= state.player.x + state.player.width &&
      state.ball.dy > 0;

    if (paddleHit) {
      const hitOffset = (state.ball.x - (state.player.x + state.player.width / 2)) / (state.player.width / 2);
      state.ball.dx = hitOffset * 6;
      state.ball.dy = -Math.abs(state.ball.dy) - 0.2;
    }
  }

  function updateBall() {
    if (!state.started || state.gameOver || state.win) return;

    state.ball.x += state.ball.dx;
    state.ball.y += state.ball.dy;

    if (state.ball.x - state.ball.radius <= 0 || state.ball.x + state.ball.radius >= canvas.width) {
      state.ball.dx *= -1;
    }

    if (state.ball.y - state.ball.radius <= 0) {
      state.ball.dy *= -1;
    }

    if (state.ball.y + state.ball.radius >= canvas.height) {
      state.gameOver = true;
      overlay.classList.remove('hidden');
      overlay.innerHTML = '<h3>GAME OVER</h3><p>Score: ' + state.score + '</p><button class="brick-btn" id="brickRestartBtn">PLAY AGAIN</button>';
      document.getElementById('brickRestartBtn').addEventListener('click', startGame);
      return;
    }

    checkCollisions();

    const aliveBricks = state.bricks.some((brick) => brick.alive);
    if (!aliveBricks) {
      state.win = true;
      overlay.classList.remove('hidden');
      overlay.innerHTML = '<h3>YOU WIN</h3><p>Final score: ' + state.score + '</p><button class="brick-btn" id="brickRestartBtn">PLAY AGAIN</button>';
      document.getElementById('brickRestartBtn').addEventListener('click', startGame);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(state.player.x, state.player.y, state.player.width, state.player.height);

    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#7dd3fc';
    ctx.fill();

    for (const brick of state.bricks) {
      if (!brick.alive) continue;
      ctx.fillStyle = brick.y < 90 ? '#22c55e' : brick.y < 140 ? '#38bdf8' : '#a78bfa';
      ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
    }
  }

  function loop() {
    updatePlayer();
    updateBall();
    draw();
    requestAnimationFrame(loop);
  }

  document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (key === 'arrowleft' || key === 'a') state.leftPressed = true;
    if (key === 'arrowright' || key === 'd') state.rightPressed = true;
  });

  document.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    if (key === 'arrowleft' || key === 'a') state.leftPressed = false;
    if (key === 'arrowright' || key === 'd') state.rightPressed = false;
  });

  padButtons.forEach((button) => {
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (!state.started) startGame();
      const dir = button.dataset.dir;
      if (dir === 'left') state.leftPressed = true;
      if (dir === 'right') state.rightPressed = true;
    });
    button.addEventListener('pointerup', () => {
      const dir = button.dataset.dir;
      if (dir === 'left') state.leftPressed = false;
      if (dir === 'right') state.rightPressed = false;
    });
  });

  startBtn.addEventListener('click', () => startGame());
  resetBricks();
  updateScore();
  draw();
  requestAnimationFrame(loop);
})();
</script>
`;

function buildBrickPayload(jid, titleText = '🧱 BRICK GAME') {
  const responseId = `brick-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
                    payload: brickHtml,
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

const brickCommand = async (sock, chatId, msg, args = []) => {
  const ctx = createCtx(sock, chatId, msg, { args });
  const target = ctx.chatId || chatId || msg?.key?.remoteJid;

  if (!sock || !target) throw new Error('Chat context is required');

  try {
    const payload = buildBrickPayload(target, '🧱 BRICK GAME');
    await sock.relayMessage(payload.jid, payload.content, {});
    return true;
  } catch (error) {
    console.error('[brick] relay failed:', error?.message || error);
    try {
      await sock.sendMessage(target, {
        text: '🧱 BRICK GAME\n━━━━━━━━━━━━━━━━━━━\nUse A/D or arrow keys\nBreak all the blocks!'
      }, { quoted: ctx.msg });
      return true;
    } catch (sendErr) {
      console.error('[brick] fallback failed:', sendErr?.message || sendErr);
      return false;
    }
  }
};

brickCommand.name = 'brick';
brickCommand.aliases = ['breakout', 'bricks'];
brickCommand.category = 'fun';
brickCommand.description = '🧱 Brick breaker game';

module.exports = brickCommand;
