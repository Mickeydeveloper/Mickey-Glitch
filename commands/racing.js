const { createCtx } = require('../lib/messageBuilder');

// HTML ya Car Racing Game
const carRacingHtml = `
<!DOCTYPE html>
<html lang="sw">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>🏎️ Car Racing</title>
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
  overflow: hidden;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.container {
  width: 100%;
  max-width: 420px;
  margin: auto;
  padding: 10px;
  background: rgba(0, 0, 0, 0.85);
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 20px 60px rgba(0,0,0,0.8);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 10px;
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.08);
}

.header-title {
  font-size: 16px;
  font-weight: 700;
  background: linear-gradient(135deg, #ff6b6b, #ffd93d);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header-stats {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #aaa;
}

.header-stats span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.header-stats .value {
  color: #fff;
  font-weight: 600;
  font-size: 14px;
}

#gameCanvas {
  width: 100%;
  height: auto;
  aspect-ratio: 360 / 500;
  background: #1a1a2e;
  border-radius: 12px;
  border: 2px solid rgba(255,255,255,0.1);
  display: block;
  image-rendering: pixelated;
  touch-action: none;
}

.controls {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 8px;
  margin-top: 10px;
  padding: 8px;
  background: rgba(255,255,255,0.03);
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.05);
}

.controls button {
  padding: 14px 8px;
  border: none;
  border-radius: 12px;
  font-size: 22px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.1s ease;
  touch-action: manipulation;
  min-height: 55px;
  background: rgba(255,255,255,0.08);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.1);
}

.controls button:active {
  transform: scale(0.92);
  background: rgba(255,255,255,0.2);
}

.controls .btn-left {
  grid-column: 1;
  grid-row: 1 / 3;
  background: rgba(255, 107, 107, 0.2);
  border-color: rgba(255, 107, 107, 0.3);
}

.controls .btn-left:active {
  background: rgba(255, 107, 107, 0.5);
}

.controls .btn-right {
  grid-column: 3;
  grid-row: 1 / 3;
  background: rgba(107, 197, 255, 0.2);
  border-color: rgba(107, 197, 255, 0.3);
}

.controls .btn-right:active {
  background: rgba(107, 197, 255, 0.5);
}

.controls .btn-up {
  grid-column: 2;
  grid-row: 1;
  background: rgba(0, 168, 132, 0.25);
  border-color: rgba(0, 168, 132, 0.3);
}

.controls .btn-up:active {
  background: rgba(0, 168, 132, 0.5);
}

.controls .btn-down {
  grid-column: 2;
  grid-row: 2;
  background: rgba(255, 200, 0, 0.2);
  border-color: rgba(255, 200, 0, 0.3);
}

.controls .btn-down:active {
  background: rgba(255, 200, 0, 0.5);
}

.controls .btn-reset {
  grid-column: 2;
  grid-row: 3;
  background: rgba(255, 70, 70, 0.15);
  border-color: rgba(255, 70, 70, 0.2);
  font-size: 14px;
  color: #ff6b6b;
}

.controls .btn-reset:active {
  background: rgba(255, 70, 70, 0.4);
}

.status-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 10px;
  padding: 8px;
  border-radius: 10px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.05);
  font-size: 13px;
  color: #aaa;
  min-height: 40px;
  gap: 12px;
}

.status-bar .live {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #51cf66;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.status-bar .game-over-text {
  color: #ff6b6b;
  font-weight: 700;
}

@media (max-width: 380px) {
  .controls button {
    font-size: 18px;
    padding: 10px 6px;
    min-height: 45px;
  }
  .header-title { font-size: 14px; }
  .header-stats { font-size: 10px; }
}
</style>
</head>
<body>

<div class="container">
  <div class="header">
    <div class="header-title">🏎️ CAR RACING</div>
    <div class="header-stats">
      <span>🏆 <span class="value" id="scoreDisplay">0</span></span>
      <span>⚡ <span class="value" id="speedDisplay">0</span></span>
      <span>❤️ <span class="value" id="livesDisplay">3</span></span>
    </div>
  </div>

  <canvas id="gameCanvas" width="360" height="500"></canvas>

  <div class="controls">
    <button class="btn-left" id="btnLeft">◀️</button>
    <button class="btn-up" id="btnUp">⬆️</button>
    <button class="btn-right" id="btnRight">▶️</button>
    <button class="btn-down" id="btnDown">⬇️</button>
    <button class="btn-reset" id="btnReset">🔄 RESET</button>
  </div>

  <div class="status-bar" id="statusBar">
    <span class="live"></span>
    <span id="statusText">🚗 Drive & avoid obstacles!</span>
  </div>
</div>

<script>
(function() {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const W = 360, H = 500;

  const scoreDisplay = document.getElementById('scoreDisplay');
  const speedDisplay = document.getElementById('speedDisplay');
  const livesDisplay = document.getElementById('livesDisplay');
  const statusText = document.getElementById('statusText');

  const state = {
    car: { x: 160, y: 410, w: 40, h: 55 },
    obstacles: [],
    roadOffset: 0,
    score: 0,
    lives: 3,
    speed: 3,
    maxSpeed: 8,
    gameOver: false,
    frame: 0,
    spawnRate: 30,
    spawnCounter: 0,
    keys: { left: false, right: false, up: false, down: false },
    difficulty: 1,
    roadLines: []
  };

  for (let i = 0; i < 15; i++) {
    state.roadLines.push({ y: i * 35 });
  }

  const carColors = ['#ff6b6b', '#ffd93d', '#6bcfff', '#51cf66', '#cc5de8'];
  let carColor = carColors[Math.floor(Math.random() * carColors.length)];
  const obsColors = ['#ff6b6b', '#ff922b', '#fcc419', '#20c997', '#5c7cfa'];

  let audioCtx = null;

  function getAudio() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch(e) { return null; }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playBeep(freq, duration, type = 'sine') {
    try {
      const ctx = getAudio();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration + 0.05);
    } catch(e) {}
  }

  function resetGame() {
    state.car.x = 160;
    state.car.y = 410;
    state.obstacles = [];
    state.score = 0;
    state.lives = 3;
    state.speed = 3;
    state.gameOver = false;
    state.difficulty = 1;
    state.spawnCounter = 0;
    state.frame = 0;
    updateUI();
    statusText.textContent = '🚗 Game restarted!';
    statusText.className = '';
    playBeep(600, 0.15, 'sine');
    setTimeout(() => {
      statusText.textContent = '🚗 Drive & avoid obstacles!';
    }, 1000);
  }

  function spawnObstacle() {
    const types = ['car', 'car', 'car', 'truck', 'rock'];
    const type = types[Math.floor(Math.random() * types.length)];
    const w = type === 'truck' ? 50 + Math.random() * 20 : 30 + Math.random() * 15;
    const h = type === 'truck' ? 50 + Math.random() * 15 : 35 + Math.random() * 15;
    const x = 20 + Math.random() * (W - w - 40);
    const color = obsColors[Math.floor(Math.random() * obsColors.length)];
    state.obstacles.push({
      x: x,
      y: -h - Math.random() * 100,
      w: w,
      h: h,
      color: color,
      type: type,
      speed: state.speed * (0.6 + Math.random() * 0.4)
    });
  }

  function checkCollision(a, b) {
    const shrink = 0.75;
    const ax = a.x + a.w * (1 - shrink) / 2;
    const ay = a.y + a.h * (1 - shrink) / 2;
    const aw = a.w * shrink;
    const ah = a.h * shrink;
    const bx = b.x + b.w * (1 - shrink) / 2;
    const by = b.y + b.h * (1 - shrink) / 2;
    const bw = b.w * shrink;
    const bh = b.h * shrink;
    return ax < bx + bw && ax + aw > bx &&
           ay < by + bh && ay + ah > by;
  }

  function updateUI() {
    scoreDisplay.textContent = Math.floor(state.score);
    speedDisplay.textContent = Math.floor(state.speed * 10);
    livesDisplay.textContent = state.lives;
  }

  function gameOver() {
    state.gameOver = true;
    statusText.textContent = '💥 GAME OVER! Press RESET to retry';
    statusText.className = 'game-over-text';
    playBeep(200, 0.6, 'sawtooth');
    setTimeout(() => playBeep(150, 0.8, 'sawtooth'), 300);
  }

  function hitObstacle(obs) {
    state.lives--;
    playBeep(300, 0.3, 'square');
    const idx = state.obstacles.indexOf(obs);
    if (idx > -1) state.obstacles.splice(idx, 1);
    updateUI();
    if (state.lives <= 0) {
      gameOver();
    } else {
      statusText.textContent = `💥 Crash! ${state.lives} lives remaining`;
      setTimeout(() => {
        if (!state.gameOver) {
          statusText.textContent = '🚗 Drive carefully!';
        }
      }, 1500);
    }
  }

  function update() {
    if (state.gameOver) return;

    state.frame++;
    state.difficulty = 1 + Math.floor(state.score / 100) * 0.5;
    state.maxSpeed = Math.min(12, 3 + state.difficulty * 0.8);
    state.speed = Math.min(state.maxSpeed, state.speed + 0.002);

    const moveSpeed = state.speed * 1.2;
    if (state.keys.left && state.car.x > 10) {
      state.car.x -= moveSpeed;
    }
    if (state.keys.right && state.car.x < W - state.car.w - 10) {
      state.car.x += moveSpeed;
    }
    if (state.keys.up && state.car.y > 50) {
      state.car.y -= moveSpeed * 0.8;
    }
    if (state.keys.down && state.car.y < H - state.car.h - 10) {
      state.car.y += moveSpeed * 0.8;
    }

    state.roadOffset = (state.roadOffset + state.speed) % 70;

    state.spawnCounter++;
    const spawnRate = Math.max(12, 30 - state.difficulty * 2);
    if (state.spawnCounter >= spawnRate) {
      state.spawnCounter = 0;
      if (Math.random() < 0.6 + state.difficulty * 0.03) {
        spawnObstacle();
        if (Math.random() < 0.2 + state.difficulty * 0.02) {
          spawnObstacle();
        }
      }
    }

    for (let i = state.obstacles.length - 1; i >= 0; i--) {
      const obs = state.obstacles[i];
      obs.y += state.speed + obs.speed * 0.3;

      if (!state.gameOver && checkCollision(state.car, obs)) {
        hitObstacle(obs);
        continue;
      }

      if (obs.y > H + 50) {
        state.obstacles.splice(i, 1);
        state.score += 5 + state.difficulty * 2;
        updateUI();
        if (state.speed < state.maxSpeed) {
          state.speed += 0.003;
        }
      }
    }

    state.score += 0.1 * state.difficulty;
    updateUI();
  }

  function drawRoad() {
    ctx.fillStyle = '#2d2d44';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 30]);
    ctx.lineDashOffset = -state.roadOffset;
    ctx.beginPath();
    ctx.moveTo(W/2, 0);
    ctx.lineTo(W/2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(15, H);
    ctx.moveTo(W - 15, 0);
    ctx.lineTo(W - 15, H);
    ctx.stroke();

    const grad = ctx.createLinearGradient(0, 0, 15, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0.03)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 15, H);
    ctx.fillRect(W - 15, 0, 15, H);
  }

  function drawCar(x, y, w, h, color) {
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 5;

    const r = 6;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x + w * 0.15, y + h * 0.1, w * 0.3, h * 0.15);
    ctx.fillRect(x + w * 0.55, y + h * 0.1, w * 0.3, h * 0.15);

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(x + w * 0.2, y + h * 0.25, w * 0.25, h * 0.25);
    ctx.fillRect(x + w * 0.55, y + h * 0.25, w * 0.25, h * 0.25);

    ctx.fillStyle = '#ffd93d';
    ctx.shadowColor = '#ffd93d';
    ctx.shadowBlur = 10;
    ctx.fillRect(x + 3, y + 2, 6, 4);
    ctx.fillRect(x + w - 9, y + 2, 6, 4);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ff6b6b';
    ctx.shadowColor = '#ff6b6b';
    ctx.shadowBlur = 8;
    ctx.fillRect(x + 3, y + h - 6, 6, 4);
    ctx.fillRect(x + w - 9, y + h - 6, 6, 4);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(x - 2, y + 6, 4, 12);
    ctx.fillRect(x - 2, y + h - 18, 4, 12);
    ctx.fillRect(x + w - 2, y + 6, 4, 12);
    ctx.fillRect(x + w - 2, y + h - 18, 4, 12);
  }

  function drawObstacle(obs) {
    if (obs.type === 'truck') {
      ctx.fillStyle = obs.color;
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 10;
      ctx.fillRect(obs.x, obs.y + 8, obs.w, obs.h - 8);
      ctx.fillStyle = '#2a2a4a';
      ctx.fillRect(obs.x + obs.w - 15, obs.y, 12, 20);
      ctx.fillStyle = 'rgba(100,200,255,0.3)';
      ctx.fillRect(obs.x + obs.w - 12, obs.y + 3, 6, 8);
    } else if (obs.type === 'rock') {
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#6b6b7b';
      ctx.beginPath();
      ctx.ellipse(obs.x + obs.w/2, obs.y + obs.h/2, obs.w/2, obs.h/2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5a5a6a';
      ctx.beginPath();
      ctx.ellipse(obs.x + obs.w/2 - 3, obs.y + obs.h/2 - 3, obs.w/3, obs.h/3, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      drawCar(obs.x, obs.y, obs.w, obs.h, obs.color);
    }
    ctx.shadowBlur = 0;
  }

  function draw() {
    drawRoad();

    for (const obs of state.obstacles) {
      drawObstacle(obs);
    }

    ctx.shadowColor = 'rgba(255,255,255,0.1)';
    ctx.shadowBlur = 20;
    drawCar(state.car.x, state.car.y, state.car.w, state.car.h, carColor);
    ctx.shadowBlur = 0;

    if (state.speed > 5) {
      const alpha = (state.speed - 5) / 5 * 0.3;
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const x = Math.random() * W;
        const y = Math.random() * H;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (Math.random() - 0.5) * 20, y + 20 + Math.random() * 30);
        ctx.stroke();
      }
    }

    if (state.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ff6b6b';
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('💥 GAME OVER', W/2, H/2 - 20);
      ctx.fillStyle = '#aaa';
      ctx.font = '16px Arial';
      ctx.fillText('Press RESET', W/2, H/2 + 40);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('🏆 ' + Math.floor(state.score), 12, 25);
    ctx.textAlign = 'right';
    ctx.fillText('⚡ ' + Math.floor(state.speed * 10), W - 12, 25);
  }

  function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
  }

  function setupButton(id, key) {
    const btn = document.getElementById(id);
    if (!btn) return;

    const start = (e) => {
      e.preventDefault();
      state.keys[key] = true;
      btn.style.transform = 'scale(0.92)';
      btn.style.background = 'rgba(255,255,255,0.2)';
    };

    const end = (e) => {
      e.preventDefault();
      state.keys[key] = false;
      btn.style.transform = 'scale(1)';
      btn.style.background = '';
    };

    btn.addEventListener('mousedown', start);
    btn.addEventListener('mouseup', end);
    btn.addEventListener('mouseleave', end);
    btn.addEventListener('touchstart', start, { passive: false });
    btn.addEventListener('touchend', end, { passive: false });
    btn.addEventListener('touchcancel', end, { passive: false });
  }

  setupButton('btnLeft', 'left');
  setupButton('btnRight', 'right');
  setupButton('btnUp', 'up');
  setupButton('btnDown', 'down');

  document.getElementById('btnReset').addEventListener('click', (e) => {
    e.preventDefault();
    resetGame();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); state.keys.left = true; }
    if (e.key === 'ArrowRight') { e.preventDefault(); state.keys.right = true; }
    if (e.key === 'ArrowUp') { e.preventDefault(); state.keys.up = true; }
    if (e.key === 'ArrowDown') { e.preventDefault(); state.keys.down = true; }
    if (e.key === 'r' || e.key === 'R') { resetGame(); }
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); state.keys.left = false; }
    if (e.key === 'ArrowRight') { e.preventDefault(); state.keys.right = false; }
    if (e.key === 'ArrowUp') { e.preventDefault(); state.keys.up = false; }
    if (e.key === 'ArrowDown') { e.preventDefault(); state.keys.down = false; }
  });

  document.addEventListener('touchmove', (e) => {
    e.preventDefault();
  }, { passive: false });

  resetGame();
  gameLoop();

})();
</script>
</body>
</html>
`;

function buildCarRacingPayload(jid, resultText = '🏎️ CAR RACING GAME') {
    const responseId = `car-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
                                            payload: carRacingHtml,
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

const carCommand = async (sock, chatId, msg, args = []) => {
    const ctx = createCtx(sock, chatId, msg, { args });
    const target = ctx.chatId || chatId || msg?.key?.remoteJid;

    if (!sock || !target) {
        throw new Error('Chat context is required');
    }

    try {
        const payload = buildCarRacingPayload(target, '🏎️ CAR RACING GAME');
        await sock.relayMessage(payload.jid, payload.content, {});
        return true;
    } catch (error) {
        console.error('[car] relay failed:', error?.message || error);

        try {
            await sock.sendMessage(target, {
                text: `🏎️ CAR RACING GAME\n━━━━━━━━━━━━━━━━━━━\n🚗 Drive & avoid obstacles!\n━━━━━━━━━━━━━━━━━━━\n🎮 Controls: Left/Right/Up/Down\n🔄 Press R to restart\n━━━━━━━━━━━━━━━━━━━\nType .car to play!`
            }, { quoted: ctx.msg });
            return true;
        } catch (sendErr) {
            console.error('[car] fallback failed:', sendErr?.message || sendErr);
            return false;
        }
    }
};

carCommand.name = 'car';
carCommand.aliases = ['racing', 'drive', 'carrace'];
carCommand.category = 'fun';
carCommand.description = '🏎️ Car Racing Game with button controls';

module.exports = carCommand;