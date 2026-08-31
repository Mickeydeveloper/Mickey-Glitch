const { createCtx } = require('../lib/messageBuilder');

const pongHtml = `
<style>
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body {
    margin: 0; padding: 0; background: transparent; font-family: Arial, sans-serif;
    user-select: none; -webkit-user-select: none; touch-action: manipulation;
  }
  .pong-wrap {
    width: 100%; max-width: 620px; margin: 0 auto; padding: 14px; background: rgba(15, 16, 26, 0.7);
    border: 1px solid rgba(255,255,255,0.08); border-radius: 18px; box-shadow: 0 12px 28px rgba(0,0,0,.26);
  }
  .pong-header {
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
    font-weight: 700; color: #fff; letter-spacing: 1.2px;
  }
  .pong-title { font-size: 18px; }
  .pong-score {
    display: flex; gap: 18px; align-items: center; font-size: 12px; color: rgba(255,255,255,.72);
  }
  .pong-score b { font-size: 28px; color: #fff; }
  .pong-stage {
    position: relative; width: 100%; border-radius: 14px; overflow: hidden;
    border: 2px solid rgba(255,255,255,.09); background: linear-gradient(180deg, #111827, #030712);
  }
  #pongCanvas { display: block; width: 100%; height: auto; aspect-ratio: 16 / 9; }
  .pong-overlay {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; flex-direction: column;
    background: rgba(0,0,0,.38); backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px);
  }
  .pong-overlay.hidden { display: none; }
  .pong-overlay h3 {
    margin: 0 0 8px; font-size: 28px; color: #fff; letter-spacing: 2px;
  }
  .pong-overlay p {
    margin: 0 0 12px; color: rgba(255,255,255,.8); font-size: 12px; letter-spacing: 1px; text-transform: uppercase;
  }
  .pong-btn {
    border: none; border-radius: 10px; padding: 10px 18px; background: linear-gradient(135deg, #38bdf8, #8b5cf6);
    color: #fff; font-weight: 800; letter-spacing: 1px; cursor: pointer;
  }
  .pong-controls {
    display: flex; justify-content: center; gap: 12px; margin-top: 12px; flex-wrap: wrap;
  }
  .pong-pad-btn {
    border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.06); color: #fff;
    border-radius: 10px; padding: 8px 14px; font-size: 12px; font-weight: 700; cursor: pointer;
  }
</style>

<div class="pong-wrap">
  <div class="pong-header">
    <div class="pong-title">🏓 PONG</div>
    <div class="pong-score">
      <span>YOU <b id="leftScore">0</b></span>
      <span>CPU <b id="rightScore">0</b></span>
    </div>
  </div>

  <div class="pong-stage">
    <canvas id="pongCanvas" width="640" height="360"></canvas>
    <div class="pong-overlay" id="pongOverlay">
      <h3>READY?</h3>
      <p>W / S or ↑ / ↓ to play</p>
      <button class="pong-btn" id="startBtn">START</button>
    </div>
  </div>

  <div class="pong-controls">
    <button class="pong-pad-btn" data-dir="up">↑ Move</button>
    <button class="pong-pad-btn" data-dir="down">↓ Move</button>
  </div>
</div>

<script>
(() => {
  const canvas = document.getElementById('pongCanvas');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('pongOverlay');
  const startBtn = document.getElementById('startBtn');
  const leftScoreEl = document.getElementById('leftScore');
  const rightScoreEl = document.getElementById('rightScore');
  const padButtons = document.querySelectorAll('.pong-pad-btn');

  const paddleWidth = 12;
  const paddleHeight = 78;
  const padding = 18;
  const ballRadius = 8;

  const game = {
    leftY: canvas.height / 2 - paddleHeight / 2,
    rightY: canvas.height / 2 - paddleHeight / 2,
    leftScore: 0,
    rightScore: 0,
    ballX: canvas.width / 2,
    ballY: canvas.height / 2,
    ballVx: 5,
    ballVy: 2.3,
    started: false,
    keys: { up: false, down: false }
  };

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function updateScore() {
    leftScoreEl.textContent = String(game.leftScore);
    rightScoreEl.textContent = String(game.rightScore);
  }

  function resetBall(direction = 1) {
    game.ballX = canvas.width / 2;
    game.ballY = canvas.height / 2;
    const speed = 5 + (game.leftScore + game.rightScore) * 0.08;
    const angle = (Math.random() * 1.6) - 0.8;
    game.ballVx = direction * speed;
    game.ballVy = angle * speed;
  }

  function startGame() {
    game.started = true;
    overlay.classList.add('hidden');
    resetBall(Math.random() < 0.5 ? -1 : 1);
  }

  function moveLeftPaddle(dir) {
    const delta = 8;
    if (dir === 'up') game.leftY -= delta;
    if (dir === 'down') game.leftY += delta;
    game.leftY = clamp(game.leftY, 0, canvas.height - paddleHeight);
  }

  function update() {
    if (!game.started) return;

    if (game.keys.up) moveLeftPaddle('up');
    if (game.keys.down) moveLeftPaddle('down');

    const target = game.ballY - (game.rightY + paddleHeight / 2);
    game.rightY += clamp(target * 0.12, -8, 8);
    game.rightY = clamp(game.rightY, 0, canvas.height - paddleHeight);

    game.ballX += game.ballVx;
    game.ballY += game.ballVy;

    if (game.ballY <= 0 || game.ballY >= canvas.height) {
      game.ballVy *= -1;
      game.ballY = clamp(game.ballY, 0, canvas.height);
    }

    const collideLeft =
      game.ballX - ballRadius <= padding + paddleWidth &&
      game.ballX + ballRadius >= padding &&
      game.ballY >= game.leftY &&
      game.ballY <= game.leftY + paddleHeight;

    const collideRight =
      game.ballX + ballRadius >= canvas.width - padding - paddleWidth &&
      game.ballX - ballRadius <= canvas.width - padding &&
      game.ballY >= game.rightY &&
      game.ballY <= game.rightY + paddleHeight;

    if (collideLeft) {
      game.ballX = padding + paddleWidth + ballRadius;
      const offset = (game.ballY - (game.leftY + paddleHeight / 2)) / (paddleHeight / 2);
      game.ballVx = Math.abs(game.ballVx) + 0.2;
      game.ballVy = offset * 5.2;
    }

    if (collideRight) {
      game.ballX = canvas.width - padding - paddleWidth - ballRadius;
      const offset = (game.ballY - (game.rightY + paddleHeight / 2)) / (paddleHeight / 2);
      game.ballVx = -Math.abs(game.ballVx) - 0.2;
      game.ballVy = offset * 5.2;
    }

    if (game.ballX < -20) {
      game.rightScore += 1;
      updateScore();
      resetBall(1);
    }

    if (game.ballX > canvas.width + 20) {
      game.leftScore += 1;
      updateScore();
      resetBall(-1);
    }
  }

  function drawField() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 12]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(padding, game.leftY, paddleWidth, paddleHeight);
    ctx.fillRect(canvas.width - padding - paddleWidth, game.rightY, paddleWidth, paddleHeight);

    ctx.beginPath();
    ctx.arc(game.ballX, game.ballY, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
  }

  function loop() {
    update();
    drawField();
    requestAnimationFrame(loop);
  }

  function onKeyChange(event, isDown) {
    const key = event.key.toLowerCase();
    if (key === 'w' || key === 'arrowup') game.keys.up = isDown;
    if (key === 's' || key === 'arrowdown') game.keys.down = isDown;
    if (event.key === ' ') {
      event.preventDefault();
      if (!game.started) startGame();
    }
  }

  document.addEventListener('keydown', (event) => onKeyChange(event, true));
  document.addEventListener('keyup', (event) => onKeyChange(event, false));

  padButtons.forEach((button) => {
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (!game.started) startGame();
      const dir = button.dataset.dir;
      if (dir === 'up') game.keys.up = true;
      if (dir === 'down') game.keys.down = true;
    });

    button.addEventListener('pointerup', () => {
      const dir = button.dataset.dir;
      if (dir === 'up') game.keys.up = false;
      if (dir === 'down') game.keys.down = false;
    });

    button.addEventListener('pointerleave', () => {
      const dir = button.dataset.dir;
      if (dir === 'up') game.keys.up = false;
      if (dir === 'down') game.keys.down = false;
    });
  });

  startBtn.addEventListener('click', () => startGame());
  updateScore();
  drawField();
  requestAnimationFrame(loop);
})();
</script>
`;

function buildPongPayload(jid, titleText = '🏓 PONG') {
  const responseId = `pong-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const payload = {
    messageContextInfo: {
      deviceListMetadata: {},
      deviceListMetadataVersion: 2,
      botMetadata: {
        messageDisclaimerText: '',
        botResponseId: responseId,
        verificationMetadata: {
          proofs: [
            {
              version: 1,
              useCase: 1,
              signature: 'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YeN55YRyad2+ZA==',
              certificateChain: [
                'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGEOvtJr968bbpKdZreOTwkk9aPN++XPE60RfuzNLkXXc7LE8BOkJOWRpo2oNXaRJ3uCNJ43HY3A+oetnvHSfcxWqmvvTSrBOI5V1NOD6RMsZ/st1XVPUx83AGps1l5jYBOYzqMNy6un2tToJ2Bt9bXRo29tWLZTu8m7TNY/hISwVpVc5tjSet5U7btPN+dMIx2UvykB1jcbWGsdklheeuz8RXSStNXzeaGvsf1lpZ/ugLE4b2BdmlRNKrY6zLE4qFtRYQoS7axOyQX+4QUyN2m9bfm7urQmn+QRSXJwMO7X5kAJJLbkVGJFt9Pm9VXPwQVrK2aaqiXlpusj+7DfDw00OULmYMmZDTqXM0nUVLxj13z0LhMQoQhhNG8utdUn4uKOFceliTZ/xiP+A54GnX9620641bqw3ctfh9NNXPsTEK8hAUD7FDqUhVntHmoEYYEHq8X1tHHZYP49/f2iezTiE8AUaoZo42/jIWQIKohOGNUib2hEqMkW8NsR8vPihvNuqPc0zKZcl6359YFQdjiiW8kCRD/rsDOr9v1eYLFZKYloFyzFqEgj+jcG/V47elOjShJ5CCPwatXwP6HIloVwtgygFsnOFmCg6Ojoivfoz8Nw1qxFwg5OU2cq/1WbWNELKnaFg4eUWCAIJ/3ZIJsEPkgemZxGhE+hdiNn9dkQYBJs1kx2BxdIkJmQ9vJSKkrMz6lTxZM3IJ9mhmKS6zYdU1ppeAao0/ayte997DQParb/AHLN79g0iW1ad0z8ir5jAl0q3a+UZPTSa4YiSqC2PZ/gfxG5wvL2mKmeKowG0RXjmEp5iNxrni+T/HRLZOoH7y0DQ24nMCPg',
                'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGHsL0Ccm0ELINFZ2IaBhKaeWnVuh0o6nZLCioCn9xpSADzwIS5VCWO+1eVXT2atJOyf7FYlpB0/JA3Us+aQtekuIkHu/zBXijORZ4ClF4+sF3cSTNg6gY/+6iwLK/zs3bMg+GeJrcI65vXfs95Shxlb2Rd5GRT2/2yBmR6Zkf5QwMJuptUHWtM26WY7/xlkEKGFYDZVqOSylusiOzSALa815zC6dCiHoJNLBEKMlaZZQOk57/+OYoU5zzTaEgLhyvNFHSyAlyLQ3SGFtVHAaJZHSmmSPyJowCOB+92Gkk6SWVMsk6FbU8QJWFtlhzV/W/gZ7WzUlS/AKgN0th9/cq20ToFkW7X9c+rtYavufmuieqFhXgaMD8AGsoN9QC/HzNC9D1nydPfFYEUr9BHVy2nF5gM58Y59r2rT8p5LPARIkUp8g+5DLhyW0tdZFZ1305o4AHCayZnp5rjcU2Xi/c1Qf/djBGakmijlMs4aMzKJYD0c4Q8jdI7sNyd876K2wRD+L6KeD2QB3PtCS4P7BWAl5gh5CJ6ZBrwcaKXZqcSjEwm52MqVCgYZdapAaNYUy/QndttjLOG0wxxwuX1hIhMjPnIKZR1kwnqD5EqlHpilrnojRZvjVGN4zEKmilS8rNstt4HHs/D849W+Q6LRVWiWMs0cT2IugrX+Skxd8En7Gq52UEmuVBrSTpN+UpIu20NsVb9lsvuYh3XO441606tOEY2eKcZJdTtqrOTNqbbTk0zVn1yhbOCvmfctBNDhTwaC5QMi0P9wjU5XI9SBtkdQLizc5oqpoiHeqgb8+aJHVLcbgIJ/KLZKtRWFDfzRNM02Csx4etUUapVd2NA/L0oMs/O5T9sVj9FBJ7q99GWr3PVmxJb36mHZLXC4k1gGN9swE0LtzYsUdT5tUo9ri/hS3W/SM+F1p4Kh4QIgRcG3ciIHGN44bnDh3HDCz0fDnzKYw0bclMxZPctEyJ5gEOPF6OAkjD9dEaRGq/tEPf1k9Aub+v2dEjnfrYWAm4E5Zfhs2Xh0CT0k+SzhgKd0K/46ChJ20G5+blwpIvahvTVS68+aVIX6CwXs4tcVx6FnmVsMOOkIasfaqQLZYbNBkuLoZnQAq4j8yRekrQ=='
              ]
            }
          ]
        }
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
                      payload: pongHtml,
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

const pongCommand = async (sock, chatId, msg, args = []) => {
  const ctx = createCtx(sock, chatId, msg, { args });
  const target = ctx.chatId || chatId || msg?.key?.remoteJid;

  if (!sock || !target) {
    throw new Error('Chat context is required');
  }

  try {
    const payload = buildPongPayload(target, '🏓 PONG GAME');
    await sock.relayMessage(payload.jid, payload.content, {});
    return true;
  } catch (error) {
    console.error('[pong] relay failed:', error?.message || error);

    try {
      await sock.sendMessage(target, {
        text: '🏓 PONG GAME\n━━━━━━━━━━━━━━━━━━━\nW/S or ↑/↓ to move\nFirst to 5 wins!'
      }, { quoted: ctx.msg });
      return true;
    } catch (sendErr) {
      console.error('[pong] fallback failed:', sendErr?.message || sendErr);
      return false;
    }
  }
};

pongCommand.name = 'pong';
pongCommand.aliases = ['ponggame', 'tenis', 'pingpong'];
pongCommand.category = 'fun';
pongCommand.description = '🏓 Pong game with keyboard and touch controls';

module.exports = pongCommand;
