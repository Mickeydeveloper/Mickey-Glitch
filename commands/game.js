'use strict';

const crypto = require('crypto');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

const sessions = new Map();
const SESSION_TTL = 60 * 60 * 1000;
const MAX_SESSIONS = 500;
const GAME_ALIASES = new Map([
    ['dino', 'dino'], ['dinojump', 'dino'], ['runner', 'dino'],
    ['slot', 'slot'], ['jackpot', 'slot'], ['777', 'slot'],
    ['snake', 'snake'], ['ular', 'snake'], ['snakegame', 'snake'],
    ['tictac', 'tictac'], ['tictactoe', 'tictac'], ['ttt', 'tictac'], ['xoxo', 'tictac'],
    ['brick', 'brick'], ['breakout', 'brick'], ['bricks', 'brick'],
    ['pong', 'pong'], ['ponggame', 'pong'], ['tenis', 'pong'], ['pingpong', 'pong'],
    ['shooting', 'shooting'], ['shoot', 'shooting'],
]);

function sessionKey(chatId, message) {
    const sender = message?.key?.participant || message?.key?.remoteJid || chatId;
    return `${chatId}:${sender}`;
}

function cleanSessions() {
    const now = Date.now();
    for (const [key, session] of sessions) {
        if (now - session.updatedAt > SESSION_TTL) sessions.delete(key);
    }
    while (sessions.size >= MAX_SESSIONS) sessions.delete(sessions.keys().next().value);
}

function renderBoard(board) {
    const rows = [];
    for (let row = 0; row < 3; row++) {
        rows.push(board.slice(row * 3, row * 3 + 3).map((cell, index) => cell || String(row * 3 + index + 1)).join(' | '));
    }
    return rows.join('\n---------\n');
}

function tictacWinner(board) {
    const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    for (const [a, b, c] of lines) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    return board.every(Boolean) ? 'draw' : null;
}

function findWinningMove(board, mark) {
    for (let index = 0; index < board.length; index++) {
        if (board[index]) continue;
        board[index] = mark;
        const wins = tictacWinner(board) === mark;
        board[index] = '';
        if (wins) return index;
    }
    return -1;
}

function chooseTictacMove(board) {
    let move = findWinningMove(board, 'O');
    if (move < 0) move = findWinningMove(board, 'X');
    if (move < 0 && !board[4]) move = 4;
    if (move < 0) {
        const corners = [0, 2, 6, 8].filter((index) => !board[index]);
        if (corners.length) move = corners[Math.floor(Math.random() * corners.length)];
    }
    if (move < 0) {
        const empty = board.map((cell, index) => cell ? -1 : index).filter((index) => index >= 0);
        move = empty[Math.floor(Math.random() * empty.length)];
    }
    return move;
}

function randomSnakeFood(snake) {
    let food;
    do {
        food = { x: Math.floor(Math.random() * 7), y: Math.floor(Math.random() * 7) };
    } while (snake.some((part) => part.x === food.x && part.y === food.y));
    return food;
}

function renderSnake(session) {
    const cells = Array.from({ length: 7 }, () => Array(7).fill('·'));
    cells[session.food.y][session.food.x] = '🍎';
    session.snake.forEach((part, index) => { cells[part.y][part.x] = index ? '🟩' : '🐍'; });
    return cells.map((row) => row.join(' ')).join('\n');
}

function startSession(kind) {
    const session = { kind, updatedAt: Date.now() };
    if (kind === 'dino') Object.assign(session, { score: 0, alive: true });
    if (kind === 'slot') Object.assign(session, { balance: 100, spins: 0 });
    if (kind === 'snake') {
        session.snake = [{ x: 3, y: 3 }, { x: 2, y: 3 }, { x: 1, y: 3 }];
        session.direction = { x: 1, y: 0 };
        session.food = randomSnakeFood(session.snake);
        session.score = 0;
        session.alive = true;
    }
    if (kind === 'tictac') Object.assign(session, { board: Array(9).fill(''), finished: false });
    if (kind === 'brick') Object.assign(session, { paddle: 3, ball: 3, direction: 1, bricks: 14, score: 0, finished: false });
    if (kind === 'pong') Object.assign(session, { playerY: 3, ballX: 3, ballY: 3, ballVx: 1, ballVy: 1, playerScore: 0, cpuScore: 0, finished: false });
    if (kind === 'shooting') Object.assign(session, { lane: 2, targetLane: Math.floor(Math.random() * 5), score: 0, lives: 3, finished: false });
    return session;
}

function gameInstructions(kind) {
    const instructions = {
        dino: '🦖 *Dino Runner*\nTumia `.game jump` kuruka au `.game run` kusubiri. Epuka vizuizi; ukimaliza anza tena kwa `.game dino`.',
        slot: '🎰 *Slot*\nKila spin hutumia pointi 10 za mchezo. Tumia `.game spin` kucheza tena. Pointi si pesa halisi.',
        snake: '🐍 *Snake*\nElekeza kwa `.game up`, `.game down`, `.game left` au `.game right`. Kula 🍎; ukigonga ukuta au mkia mchezo unaisha.',
        tictac: '❌⭕ *Tic-Tac-Toe*\nChagua nafasi 1-9 kwa `.game 5` (badilisha 5 na namba unayotaka).',
        brick: '🧱 *Brick Breaker*\nTumia `.game left` au `.game right` kusogeza paddle na `.game launch` kuendeleza mpira.',
        pong: '🏓 *Pong*\nTumia `.game up` au `.game down` kusogeza paddle yako. Fikisha pointi 5 kabla ya CPU.',
        shooting: '🚀 *Shooting*\nSogeza kwa `.game left` / `.game right`, kisha `.game fire` ukiwa kwenye mstari wa shabaha.',
    };
    return instructions[kind];
}

function stepDino(session, action) {
    if (!session.alive) return '💥 Mchezo umeisha. Tuma `.game dino` kuanza upya.';
    const jumps = ['jump', 'kuruka'].includes(action);
    const obstacle = Math.random() < 0.55;
    if (obstacle && !jumps) {
        session.alive = false;
        return `🌵 Umegonga kizuizi! Alama: *${session.score}*. Tuma \.game dino kuanza tena.`;
    }
    session.score += obstacle ? 2 : 1;
    return `${obstacle ? '✅ Umeruka kizuizi!' : '🛣️ Njia iko wazi.'}\nAlama: *${session.score}*\nTumia \.game jump au \.game run.`;
}

function stepSnake(session, action) {
    const directions = {
        up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
        juu: { x: 0, y: -1 }, chini: { x: 0, y: 1 }, kushoto: { x: -1, y: 0 }, kulia: { x: 1, y: 0 },
    };
    const nextDirection = directions[action];
    if (!session.alive) return '💥 Mchezo umeisha. Tuma `.game snake` kuanza upya.';
    if (!nextDirection) return `${renderSnake(session)}\n\nChagua: up, down, left au right.`;
    if (nextDirection.x === -session.direction.x && nextDirection.y === -session.direction.y) {
        return `${renderSnake(session)}\n\nHuwezi kurudi upande wa nyuma moja kwa moja.`;
    }

    session.direction = nextDirection;
    const head = { x: session.snake[0].x + nextDirection.x, y: session.snake[0].y + nextDirection.y };
    const eating = head.x === session.food.x && head.y === session.food.y;
    const collisionBody = eating ? session.snake : session.snake.slice(0, -1);
    if (head.x < 0 || head.x >= 7 || head.y < 0 || head.y >= 7 || collisionBody.some((part) => part.x === head.x && part.y === head.y)) {
        session.alive = false;
        return `💥 Snake imeisha! Alama: *${session.score}*.\n${renderSnake(session)}\nTuma \.game snake kuanza tena.`;
    }

    session.snake.unshift(head);
    if (eating) {
        session.score++;
        session.food = randomSnakeFood(session.snake);
    } else {
        session.snake.pop();
    }
    return `${renderSnake(session)}\n\nAlama: *${session.score}*${eating ? ' • 🍎 Umekula!' : ''}`;
}

function stepTictac(session, action) {
    if (session.finished) return 'Mchezo umeisha. Tuma `.game tictac` kuanza tena.';
    const position = Number(action) - 1;
    if (!Number.isInteger(position) || position < 0 || position > 8 || session.board[position]) {
        return `Chagua nafasi iliyo wazi kwa namba 1-9:\n\n${renderBoard(session.board)}`;
    }
    session.board[position] = 'X';
    let winner = tictacWinner(session.board);
    if (!winner) {
        session.board[chooseTictacMove(session.board)] = 'O';
        winner = tictacWinner(session.board);
    }
    if (winner) session.finished = true;
    const result = winner === 'X' ? '\n\n🎉 Umeshinda!' : winner === 'O' ? '\n\n🤖 AI imeshinda.' : winner === 'draw' ? '\n\n🤝 Sare.' : '\n\nZamu yako: `.game <namba>`';
    return `${renderBoard(session.board)}${result}`;
}

function stepBrick(session, action) {
    if (session.finished) return `🏆 Mchezo umeisha. Alama: ${session.score}. Tuma .game brick kuanza tena.`;
    if (action === 'left') session.paddle = Math.max(0, session.paddle - 1);
    else if (action === 'right') session.paddle = Math.min(6, session.paddle + 1);
    else if (action !== 'launch') return 'Tumia `.game left`, `.game right` au `.game launch`.';

    session.ball += session.direction;
    if (session.ball < 0 || session.ball > 6) {
        session.direction *= -1;
        session.ball = Math.max(0, Math.min(6, session.ball));
    }
    const caught = Math.abs(session.ball - session.paddle) <= 1;
    if (caught) {
        session.score += 10;
        session.bricks--;
        session.direction *= -1;
    } else if (action === 'launch') {
        return `😬 Mpira umekosa paddle. Alama: ${session.score}. Tumia left/right, kisha launch.`;
    }
    if (session.bricks <= 0) {
        session.finished = true;
        return `🏆 Umeshinda Brick Breaker! Alama: ${session.score}. Tuma .game brick kucheza tena.`;
    }
    return `🧱 Brick Breaker\nPaddle: ${session.paddle} | Mpira: ${session.ball}\nMatofali: ${session.bricks} | Alama: ${session.score}\n${caught ? '💥 Umepiga tofali!' : 'Sogeza paddle kisha launch.'}`;
}

function stepPong(session, action) {
    if (session.finished) return `Mchezo umeisha. Alama: ${session.playerScore}-${session.cpuScore}. Tuma .game pong kuanza tena.`;
    if (action === 'up') session.playerY = Math.max(0, session.playerY - 1);
    else if (action === 'down') session.playerY = Math.min(6, session.playerY + 1);
    else return 'Tumia `.game up` au `.game down`.';

    session.ballX += session.ballVx;
    session.ballY += session.ballVy;
    if (session.ballY < 0 || session.ballY > 6) {
        session.ballVy *= -1;
        session.ballY = Math.max(0, Math.min(6, session.ballY));
    }
    if (session.ballX >= 6) {
        if (Math.random() < 0.25) {
            session.playerScore++;
            session.ballX = 3;
            session.ballY = 3;
            session.ballVx = 1;
        } else {
            session.ballVx = -1;
            session.ballY = Math.floor(Math.random() * 7);
        }
    } else if (session.ballX <= 0) {
        if (Math.abs(session.ballY - session.playerY) <= 1) {
            session.ballVx = 1;
            session.ballY = Math.floor(Math.random() * 7);
        } else {
            session.cpuScore++;
            session.ballX = 3;
            session.ballY = 3;
            session.ballVx = 1;
        }
    }
    if (session.cpuScore >= 5 || session.playerScore >= 5) {
        session.finished = true;
        return `${session.playerScore >= 5 ? '🎉 Umeshinda!' : '🤖 CPU imeshinda.'}\nAlama: ${session.playerScore}-${session.cpuScore}\nTuma \.game pong kucheza tena.`;
    }
    return `🏓 Alama ${session.playerScore}-${session.cpuScore}\nPaddle yako: ${session.playerY} | Mpira: ${session.ballX},${session.ballY}\nTumia up/down kuzuia mpira.`;
}

function stepShooting(session, action) {
    if (session.finished) return `Mchezo umeisha. Alama: ${session.score}. Tuma .game shooting kuanza tena.`;
    if (action === 'left') session.lane = Math.max(0, session.lane - 1);
    else if (action === 'right') session.lane = Math.min(4, session.lane + 1);
    else if (action === 'fire') {
        if (session.lane === session.targetLane) {
            session.score += 10;
            session.targetLane = Math.floor(Math.random() * 5);
            return `🎯 Umegonga shabaha! Alama: ${session.score}\nShabaha inayofuata: mstari ${session.targetLane + 1}.`;
        }
        session.lives--;
        session.targetLane = Math.floor(Math.random() * 5);
        if (session.lives <= 0) {
            session.finished = true;
            return `💥 Mchezo umeisha. Alama: ${session.score}. Tuma .game shooting kuanza tena.`;
        }
        return `❌ Ulikosa! Maisha: ${session.lives}\nShabaha mpya: mstari ${session.targetLane + 1}.`;
    } else return 'Tumia `.game left`, `.game right` au `.game fire`.';
    return `🚀 Mchezaji: mstari ${session.lane + 1}\nShabaha: mstari ${session.targetLane + 1}\nAlama: ${session.score} | Maisha: ${session.lives}\nTumia fire ukiwa kwenye mstari wa shabaha.`;
}

function stepGame(session, action) {
    session.updatedAt = Date.now();
    if (session.kind === 'dino') return stepDino(session, action || 'run');
    if (session.kind === 'slot') {
        if (!['spin', 'roll', ''].includes(action)) return 'Tumia `.game spin`.';
        if (session.balance < 10) return `Pointi zimeisha. Alama ya mwisho: ${session.balance}. Tuma \.game slot kuanza upya.`;
        const symbols = ['🍒', '7️⃣', '💎', '⭐', '🍋', '🍇', '🔔'];
        const result = Array.from({ length: 3 }, () => symbols[Math.floor(Math.random() * symbols.length)]);
        session.balance -= 10;
        session.spins++;
        let reward = 0;
        if (result.every((symbol) => symbol === '7️⃣')) reward = 500;
        else if (result.every((symbol) => symbol === result[0])) reward = 100;
        else if (new Set(result).size === 2) reward = 20;
        session.balance += reward;
        return `🎰 ${result.join(' | ')}\n${reward ? `✅ Pointi +${reward}` : 'Jaribu tena!'}\nPointi: *${session.balance}* | Spins: ${session.spins}\nPointi hizi ni za mchezo tu, si pesa.`;
    }
    if (session.kind === 'snake') return stepSnake(session, action);
    if (session.kind === 'tictac') return stepTictac(session, action);
    if (session.kind === 'brick') return stepBrick(session, action);
    if (session.kind === 'pong') return stepPong(session, action);
    if (session.kind === 'shooting') return stepShooting(session, action);
    return 'Mchezo haujatambuliwa. Tuma `.game` kuona michezo.';
}

function quickReplies(kind) {
    const buttons = {
        menu: [['🦖 Dino', '.game dino'], ['🎰 Slot', '.game slot'], ['Michezo zaidi', '.game more']],
        more: [['🐍 Snake', '.game snake'], ['❌⭕ Tic-Tac-Toe', '.game tictac'], ['🧱 Brick', '.game brick']],
        dino: [['Kuruka', '.game jump'], ['Kimbia', '.game run'], ['Sitisha', '.game stop']],
        slot: [['Spin', '.game spin'], ['Menyu', '.game'], ['Sitisha', '.game stop']],
        snake: [['Juu', '.game up'], ['Kushoto', '.game left'], ['Kulia', '.game right']],
        tictac: [],
        brick: [['Kushoto', '.game left'], ['Kulia', '.game right'], ['Launch', '.game launch']],
        pong: [['Juu', '.game up'], ['Chini', '.game down'], ['Sitisha', '.game stop']],
        shooting: [['Kushoto', '.game left'], ['Kulia', '.game right'], ['Fire', '.game fire']],
    };
    return buttons[kind] || [];
}

async function sendGameReply(sock, chatId, message, text, kind) {
    const buttons = quickReplies(kind);
    if (!buttons.length) {
        return sock.sendMessage(chatId, { text }, { quoted: message });
    }

    try {
        const interactive = generateWAMessageFromContent(chatId, {
            messageContextInfo: { messageSecret: crypto.randomBytes(32) },
            interactiveMessage: {
                body: { text },
                nativeFlowMessage: {
                    buttons: buttons.map(([label, id]) => ({
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({ display_text: label, id }),
                    })),
                    messageParamsJson: '{}',
                    messageVersion: 1,
                },
            },
        }, { quoted: message });

        return await sock.relayMessage(interactive.key.remoteJid, interactive.message, {
            messageId: interactive.key.id,
            additionalNodes: [{
                tag: 'biz',
                attrs: {},
                content: [{
                    tag: 'interactive',
                    attrs: { type: 'native_flow', v: '1' },
                    content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }],
                }],
            }],
        });
    } catch (error) {
        return sock.sendMessage(chatId, { text }, { quoted: message });
    }
}

async function gameCommand(sock, chatId, message, args = []) {
    const key = sessionKey(chatId, message);
    const commandText = String(
        message?.message?.conversation ||
        message?.message?.extendedTextMessage?.text ||
        message?.message?.imageMessage?.caption ||
        message?.message?.videoMessage?.caption ||
        ''
    ).trim();
    const words = commandText.split(/\s+/).filter(Boolean);
    const invokedAs = String(words[0] || '.game').replace(/^\./, '').toLowerCase();
    const commandArgs = words.slice(1).length ? words.slice(1) : (Array.isArray(args) ? args : String(args || '').split(/\s+/));
    let selectedGame = GAME_ALIASES.get(invokedAs);
    let actionParts = commandArgs;

    if (invokedAs === 'game') {
        const requested = String(commandArgs[0] || '').toLowerCase();
        if (!requested || ['help', 'menu'].includes(requested)) {
            return sendGameReply(sock, chatId, message,
                '🎮 *MICKEY CHAT GAMES*\n\n' +
                    '🦖 `.game dino`\n🎰 `.game slot`\n🐍 `.game snake`\n' +
                    '❌ `.game tictac`\n🧱 `.game brick`\n🏓 `.game pong`\n🚀 `.game shooting`\n\n' +
                    'Baada ya kuanza, tuma `.game <move>` kufuata maelekezo ya mchezo.\n' +
                    'Mfano: `.game jump`, `.game spin`, `.game up`, `.game 5`.\n' +
                    'Tuma `.game stop` kusitisha session.', 'menu');
        }
        if (requested === 'more') {
            return sendGameReply(sock, chatId, message,
                '🎮 *Michezo zaidi*\n\n' +
                    '🐍 Snake\n❌⭕ Tic-Tac-Toe\n🧱 Brick\n🏓 Pong\n🚀 Shooting\n\n' +
                    'Chagua kwa vitufe au tuma `.game pong` / `.game shooting`.', 'more');
        }
        if (requested === 'stop' || requested === 'exit' || requested === 'quit') {
            sessions.delete(key);
            return sendGameReply(sock, chatId, message, '🛑 Mchezo umesitishwa. Tuma `.game` kufungua menyu tena.');
        }
        selectedGame = GAME_ALIASES.get(requested);
        actionParts = commandArgs.slice(selectedGame ? 1 : 0);
    }

    let session = sessions.get(key);
    if (selectedGame) {
        if (!session || session.kind !== selectedGame || !actionParts.length || selectedGame !== 'slot') {
            session = startSession(selectedGame);
            cleanSessions();
            sessions.set(key, session);
            session.updatedAt = Date.now();
            const intro = gameInstructions(selectedGame);
            if (selectedGame === 'slot') {
                const spinResult = stepGame(session, 'spin');
                return sendGameReply(sock, chatId, message, `${intro}\n\n${spinResult}`, 'slot');
            }
            if (selectedGame === 'tictac') {
                return sendGameReply(sock, chatId, message, `${intro}\n\n${renderBoard(session.board)}`, 'tictac');
            }
            if (selectedGame === 'snake') {
                return sendGameReply(sock, chatId, message, `${intro}\n\n${renderSnake(session)}`, 'snake');
            }
            if (selectedGame === 'shooting') {
                return sendGameReply(sock, chatId, message, `${intro}\n\nMchezaji: mstari 3 | Shabaha: mstari ${session.targetLane + 1} | Maisha: 3`, 'shooting');
            }
            if (selectedGame === 'pong') {
                return sendGameReply(sock, chatId, message, `${intro}\n\nAlama 0-0 | Paddle yako: mstari 4`, 'pong');
            }
            if (selectedGame === 'brick') {
                return sendGameReply(sock, chatId, message, `${intro}\n\n🧱 Matofali: 14 | Paddle: 3. Tumia left/right, kisha launch.`, 'brick');
            }
            return sendGameReply(sock, chatId, message, intro, selectedGame);
        }
        if (selectedGame === 'slot' && !actionParts.length) actionParts = ['spin'];
    }

    if (!session) {
        return sendGameReply(sock, chatId, message, 'Tuma `.game` kuchagua mchezo, au mfano `.game snake`.', 'menu');
    }

    const action = String(actionParts[0] || '').toLowerCase();
    const response = stepGame(session, action);
    return sendGameReply(sock, chatId, message, response, session.kind);
}

gameCommand.category = 'fun';
gameCommand.description = 'Play chat-based games';
gameCommand.aliases = [...GAME_ALIASES.keys()];

module.exports = gameCommand;