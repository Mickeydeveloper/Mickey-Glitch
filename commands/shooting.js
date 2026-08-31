const { createCtx } = require('../lib/messageBuilder');

const shootingHtml = `
<style>
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body {
    margin: 0; padding: 0; background: transparent; font-family: Arial, sans-serif;
    user-select: none; -webkit-user-select: none; touch-action: manipulation;
  }
  .shoot-wrap {
    width: 100%; max-width: 620px; margin: 0 auto; padding: 14px; background: rgba(8, 10, 25, .72);
    border: 1px solid rgba(255,255,255,.08); border-radius: 18px; box-shadow: 0 12px 28px rgba(0,0,0,.26);
  }
  .shoot-header {
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; color: white;
  }
  .shoot-title { font-size: 20px; font-weight: 800; letter-spacing: 1px; }
  .shoot-score { font-size: 12px; opacity: .8; }
  .shoot-stage { position: relative; width: 100%; border-radius: 14px; overflow: hidden; border: 2px solid rgba(255,255,255,.08); }
  #shootCanvas { display: block; width: 100%; height: auto; aspect-ratio: 16 / 9; background: linear-gradient(180deg, #020617, #111827); }
  .shoot-overlay {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; flex-direction: column;
    background: rgba(0,0,0,.35); backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px);
  }
  .shoot-overlay.hidden { display: none; }
  .shoot-overlay h3 { margin: 0 0 8px; color: white; font-size: 28px; letter-spacing: 2px; }
  .shoot-overlay p { margin: 0 0 12px; color: rgba(255,255,255,.75); font-size: 12px; letter-spacing: 1px; text-transform: uppercase; }
  .shoot-btn {
    border: none; border-radius: 10px; padding: 10px 18px; background: linear-gradient(135deg, #8b5cf6, #ec4899);
    color: white; font-weight: 800; cursor: pointer;
  }
  .shoot-controls {
    display: flex; justify-content: center; gap: 12px; margin-top: 12px;
  }
  .shoot-pad-btn {
    border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.06); color: white;
    border-radius: 10px; padding: 8px 14px; font-size: 12px; font-weight: 700; cursor: pointer;
  }
</style>

<div class="shoot-wrap">
  <div class="shoot-header">
    <div class="shoot-title">🚀 SHOOTING</div>
    <div class="shoot-score">SCORE <span id="shootScore">0</span></div>
  </div>

  <div class="shoot-stage">
    <canvas id="shootCanvas" width="640" height="360"></canvas>
    <div class="shoot-overlay" id="shootOverlay">
      <h3>READY?</h3>
      <p>Move + Space to shoot</p>
      <button class="shoot-btn" id="shootStartBtn">START</button>
    </div>
  </div>

  <div class="shoot-controls">
    <button class="shoot-pad-btn" data-dir="left">←</button>
    <button class="shoot-pad-btn" data-dir="right">→</button>
    <button class="shoot-pad-btn" data-dir="shoot">FIRE</button>
  </div>
</div>

<script>
(() => {
  const canvas = document.getElementById('shootCanvas');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('shootOverlay');
  const scoreEl = document.getElementById('shootScore');
  const startBtn = document.getElementById('shootStartBtn');
  const padButtons = document.querySelectorAll('.shoot-pad-btn');

  const game = {
    started: false,
    score: 0,
    lives: 3,
    player: { x: canvas.width / 2 - 30, y: canvas.height - 36, w: 60, h: 18 },
    bullets: [],
    enemies: [],
    leftPressed: false,
    rightPressed: false,
    firing: false,
    tick: 0
  };

  function shootBullet() {
    if (!game.started) return;
    game.bullets.push({ x: game.player.x + game.player.w / 2, y: game.player.y - 8, r: 4, vy: -6 });
  }

  function spawnEnemy() {
    const w = 30;
    const x = Math.random() * (canvas.width - w);
    game.enemies.push({ x, y: -20, w, h: 20, vy: 2 + Math.random() * 1.8 });
  }

  function startGame() {
    game.started = true;
    game.score = 0;
    game.lives = 3;
    game.player.x = canvas.width / 2 - 30;
    game.bullets = [];
    game.enemies = [];
    scoreEl.textContent = '0';
    overlay.classList.add('hidden');
  }

  function updatePlayer() {
    if (game.leftPressed) game.player.x -= 8;
    if (game.rightPressed) game.player.x += 8;
    game.player.x = Math.max(0, Math.min(canvas.width - game.player.w, game.player.x));
  }

  function updateBullets() {
    for (let i = game.bullets.length - 1; i >= 0; i--) {
      const bullet = game.bullets[i];
      bullet.y += bullet.vy;
      if (bullet.y < -10) game.bullets.splice(i, 1);
    }
  }

  function updateEnemies() {
    for (let i = game.enemies.length - 1; i >= 0; i--) {
      const enemy = game.enemies[i];
      enemy.y += enemy.vy;
      if (enemy.y > canvas.height) {
        game.enemies.splice(i, 1);
        game.lives -= 1;
        if (game.lives <= 0) {
          game.started = false;
          overlay.classList.remove('hidden');
          overlay.innerHTML = '<h3>GAME OVER</h3><p>Score: ' + game.score + '</p><button class="shoot-btn" id="shootRestartBtn">PLAY AGAIN</button>';
          document.getElementById('shootRestartBtn').addEventListener('click', startGame);
        }
      }
    }
  }

  function checkCollisions() {
    for (let i = game.bullets.length - 1; i >= 0; i--) {
      const bullet = game.bullets[i];
      for (let j = game.enemies.length - 1; j >= 0; j--) {
        const enemy = game.enemies[j];
        const hit =
          bullet.x > enemy.x &&
          bullet.x < enemy.x + enemy.w &&
          bullet.y > enemy.y &&
          bullet.y < enemy.y + enemy.h;

        if (hit) {
          game.bullets.splice(i, 1);
          game.enemies.splice(j, 1);
          game.score += 10;
          scoreEl.textContent = String(game.score);
          break;
        }
      }
    }
  }

  function drawShip() {
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(game.player.x, game.player.y, game.player.w, game.player.h);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(game.player.x + 22, game.player.y - 8, 16, 12);
  }

  function drawBullets() {
    ctx.fillStyle = '#facc15';
    for (const bullet of game.bullets) {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawEnemies() {
    ctx.fillStyle = '#f87171';
    for (const enemy of game.enemies) {
      ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
    }
  }

  function drawHud() {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('LIVES: ' + game.lives, 16, 26);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 40; i++) {
      const x = (i * 53) % canvas.width;
      const y = ((i * 67 + game.tick * 2) % (canvas.height + 30)) - 30;
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(x, y, 2, 2);
    }

    drawShip();
    drawBullets();
    drawEnemies();
    drawHud();
  }

  function loop() {
    if (game.started) {
      updatePlayer();
      if (game.firing) shootBullet();
      updateBullets();
      updateEnemies();
      checkCollisions();
      if (Math.random() < 0.03) spawnEnemy();
    }

    game.tick += 1;
    draw();
    requestAnimationFrame(loop);
  }

  document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (key === 'arrowleft' || key === 'a') game.leftPressed = true;
    if (key === 'arrowright' || key === 'd') game.rightPressed = true;
    if (event.code === 'Space') {
      event.preventDefault();
      shootBullet();
    }
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
      if (dir === 'shoot') shootBullet();
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

function buildShootingPayload(jid, titleText = '🚀 SHOOTING GAME') {
  const responseId = `shooting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
                    payload: shootingHtml,
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

const shootingCommand = async (sock, chatId, msg, args = []) => {
  const ctx = createCtx(sock, chatId, msg, { args });
  const target = ctx.chatId || chatId || msg?.key?.remoteJid;

  if (!sock || !target) throw new Error('Chat context is required');

  try {
    const payload = buildShootingPayload(target, '🚀 SHOOTING GAME');
    await sock.relayMessage(payload.jid, payload.content, {});
    return true;
  } catch (error) {
    console.error('[shooting] relay failed:', error?.message || error);
    try {
      await sock.sendMessage(target, {
        text: '🚀 SHOOTING GAME\n━━━━━━━━━━━━━━━━━━━\nUse A/D to move and Space to fire\nDestroy the enemies!'
      }, { quoted: ctx.msg });
      return true;
    } catch (sendErr) {
      console.error('[shooting] fallback failed:', sendErr?.message || sendErr);
      return false;
    }
  }
};

shootingCommand.name = 'shooting';
shootingCommand.aliases = ['space', 'shooter', 'shoot'];
shootingCommand.category = 'fun';
shootingCommand.description = '🚀 Space shooting game';

module.exports = shootingCommand;
