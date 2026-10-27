'use strict';

const crypto = require('crypto');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

const sessions = new Map();
const SESSION_TTL = 60 * 60 * 1000;
const MAX_SESSIONS = 500;
const GAMES = {
    dino: { name: 'Dino Runner', pack: 'classic', aliases: ['dinojump', 'runner'] },
    snake: { name: 'Snake', pack: 'classic', aliases: ['ular', 'snakegame'] },
    ttt: { name: 'Tic-Tac-Toe', pack: 'classic', aliases: ['tictac', 'tictactoe', 'xoxo'] },
    doom: { name: 'Mini Doom', pack: 'classic', aliases: [] },
    '2048': { name: '2048', pack: 'classic', aliases: [] },
    flappy: { name: 'Flappy Bird', pack: 'action', aliases: [] },
    breakout: { name: 'Breakout', pack: 'action', aliases: ['brick', 'bricks'] },
    pong: { name: 'Pong', pack: 'action', aliases: ['ponggame', 'tenis', 'pingpong'] },
    shooter: { name: 'Space Shooter', pack: 'action', aliases: ['shooting', 'shoot'] },
    stack: { name: 'Stack', pack: 'action', aliases: [] },
    whack: { name: 'Whack-a-Mole', pack: 'action', aliases: [] },
    memory: { name: 'Memory Match', pack: 'puzzle', aliases: [] },
    mines: { name: 'Minesweeper', pack: 'puzzle', aliases: [] },
    connect4: { name: 'Connect 4', pack: 'puzzle', aliases: [] },
    simon: { name: 'Simon Says', pack: 'puzzle', aliases: [] },
    lights: { name: 'Lights Out', pack: 'puzzle', aliases: [] },
    reflex: { name: 'Reflex Test', pack: 'puzzle', aliases: [] },
};
const PACKS = {
    classic: ['dino', 'snake', 'ttt', 'doom', '2048'],
    action: ['flappy', 'breakout', 'pong', 'shooter', 'stack', 'whack'],
    puzzle: ['memory', 'mines', 'connect4', 'simon', 'lights', 'reflex'],
};
const GAME_ALIASES = new Map();
for (const [id, game] of Object.entries(GAMES)) {
    GAME_ALIASES.set(id, id);
    for (const alias of game.aliases) GAME_ALIASES.set(alias, id);
}
GAME_ALIASES.set('slot', 'slot');
GAME_ALIASES.set('jackpot', 'slot');
GAME_ALIASES.set('777', 'slot');
GAMES.slot = { name: 'Slot', pack: 'action', aliases: ['jackpot', '777'] };
PACKS.action.splice(1, 0, 'slot');

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

function newSession(kind) {
    const session = { kind, updatedAt: Date.now() };
    if (kind === 'dino') Object.assign(session, { score: 0, alive: true });
    if (kind === 'slot') Object.assign(session, { balance: 100, spins: 0 });
    if (kind === 'snake') Object.assign(session, {
        snake: [{ x: 3, y: 3 }, { x: 2, y: 3 }, { x: 1, y: 3 }],
        direction: { x: 1, y: 0 }, food: { x: 5, y: 2 }, score: 0, alive: true,
    });
    if (kind === 'ttt') Object.assign(session, { board: Array(9).fill(''), finished: false });
    if (kind === 'doom') Object.assign(session, {
        x: 2, y: 2, hp: 3, ammo: 5,
        enemies: [{ x: 0, y: 0 }, { x: 4, y: 1 }, { x: 1, y: 4 }],
    });
    if (kind === '2048') {
        session.board = Array(16).fill(0);
        session.score = 0;
        add2048Tile(session.board);
        add2048Tile(session.board);
    }
    if (kind === 'flappy') Object.assign(session, { altitude: 1, target: 1, steps: 0, score: 0, alive: true });
    if (kind === 'breakout') Object.assign(session, { paddle: 3, ball: 3, direction: 1, bricks: 14, score: 0, lives: 3 });
    if (kind === 'pong') Object.assign(session, { paddle: 3, ballY: 3, ballDir: 1, player: 0, cpu: 0 });
    if (kind === 'shooter') Object.assign(session, { lane: 2, target: Math.floor(Math.random() * 5), score: 0, lives: 3 });
    if (kind === 'stack') Object.assign(session, { width: 5, position: 0, direction: 1, height: 0, finished: false });
    if (kind === 'whack') Object.assign(session, { target: Math.floor(Math.random() * 9) + 1, score: 0, misses: 0, finished: false });
    if (kind === 'memory') {
        const symbols = ['🍎', '🚀', '🎸', '🐱', '🌵', '⚽', '🍕', '🔮'];
        session.cards = [...symbols, ...symbols].sort(() => Math.random() - 0.5);
        Object.assign(session, { matched: [], pending: null, turns: 0, finished: false });
    }
    if (kind === 'mines') Object.assign(session, {
        mines: [], revealed: [], flagged: [], firstMove: true, finished: false,
    });
    if (kind === 'connect4') Object.assign(session, { board: Array(42).fill(''), finished: false, playerWins: 0, aiWins: 0 });
    if (kind === 'simon') Object.assign(session, { sequence: [Math.floor(Math.random() * 4)], round: 1, finished: false });
    if (kind === 'lights') {
        session.board = Array(25).fill(false);
        for (let i = 0; i < 12; i++) toggleLights(session.board, Math.floor(Math.random() * 25));
        if (!session.board.some(Boolean)) toggleLights(session.board, 12);
        session.moves = 0;
        session.finished = false;
    }
    if (kind === 'reflex') Object.assign(session, { readyAt: Date.now() + 1500 + Math.floor(Math.random() * 2500), waiting: true });
    return session;
}

function add2048Tile(board) {
    const empty = board.map((value, index) => value ? -1 : index).filter((index) => index >= 0);
    if (empty.length) board[empty[Math.floor(Math.random() * empty.length)]] = Math.random() < 0.9 ? 2 : 4;
}

function toggleLights(board, index) {
    const row = Math.floor(index / 5);
    const col = index % 5;
    const positions = [index];
    if (row > 0) positions.push(index - 5);
    if (row < 4) positions.push(index + 5);
    if (col > 0) positions.push(index - 1);
    if (col < 4) positions.push(index + 1);
    for (const position of positions) board[position] = !board[position];
}

function renderTtt(board) {
    return [0, 3, 6].map((start) => board.slice(start, start + 3).map((mark, i) => mark || String(start + i + 1)).join(' | ')).join('\n---------\n');
}

function tttWinner(board) {
    const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    for (const [a, b, c] of lines) if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    return board.every(Boolean) ? 'draw' : null;
}

function chooseTttMove(board) {
    for (const mark of ['O', 'X']) {
        for (let i = 0; i < 9; i++) {
            if (board[i]) continue;
            board[i] = mark;
            const wins = tttWinner(board) === mark;
            board[i] = '';
            if (wins) return i;
        }
    }
    if (!board[4]) return 4;
    const empty = board.map((mark, i) => mark ? -1 : i).filter((i) => i >= 0);
    return empty[Math.floor(Math.random() * empty.length)];
}

function renderSnake(session) {
    const grid = Array.from({ length: 7 }, () => Array(7).fill('·'));
    grid[session.food.y][session.food.x] = '🍎';
    session.snake.forEach((part, i) => { grid[part.y][part.x] = i ? '🟩' : '🐍'; });
    return grid.map((row) => row.join(' ')).join('\n');
}

function render2048(board) {
    return [0, 4, 8, 12].map((start) => board.slice(start, start + 4).map((value) => String(value || '·').padStart(4, ' ')).join(' | ')).join('\n');
}

function renderConnect4(board) {
    const rows = [];
    for (let row = 0; row < 6; row++) rows.push(board.slice(row * 7, row * 7 + 7).map((cell) => cell || '·').join(' '));
    return `${rows.join('\n')}\n1 2 3 4 5 6 7`;
}

function renderMines(session) {
    return Array.from({ length: 5 }, (_, row) => Array.from({ length: 5 }, (_, col) => {
        const index = row * 5 + col;
        if (session.flagged.includes(index)) return '🚩';
        if (!session.revealed.includes(index)) return String(index + 1).padStart(2, '0');
        if (session.mines.includes(index)) return '💣';
        const count = neighbors(index, 5).filter((neighbor) => session.mines.includes(neighbor)).length;
        return count ? String(count) : '·';
    }).join(' ')).join('\n');
}

function neighbors(index, width) {
    const row = Math.floor(index / width);
    const col = index % width;
    const found = [];
    for (let y = Math.max(0, row - 1); y <= Math.min(width - 1, row + 1); y++) {
        for (let x = Math.max(0, col - 1); x <= Math.min(width - 1, col + 1); x++) {
            const neighbor = y * width + x;
            if (neighbor !== index) found.push(neighbor);
        }
    }
    return found;
}

function renderLights(board) {
    return [0, 5, 10, 15, 20].map((start) => board.slice(start, start + 5).map((on) => on ? '🟡' : '⚫').join(' ')).join('\n');
}

function getButtons(kind) {
    const sets = {
        menu: [['Classic', '.game classic'], ['Action', '.game action'], ['Puzzle', '.game puzzle']],
        classic: [['Dino', '.game dino'], ['Snake', '.game snake'], ['Tic-Tac-Toe', '.game ttt']],
        action: [['Flappy', '.game flappy'], ['Pong', '.game pong'], ['Shooter', '.game shooter']],
        puzzle: [['Memory', '.game memory'], ['Mines', '.game mines'], ['Connect 4', '.game connect4']],
        dino: [['Jump', '.game jump'], ['Run', '.game run'], ['Stop', '.game stop']],
        slot: [['Spin', '.game spin'], ['Menu', '.game'], ['Stop', '.game stop']],
        snake: [['Up', '.game up'], ['Left', '.game left'], ['Right', '.game right']],
        flappy: [['Flap', '.game flap'], ['Float', '.game float'], ['Stop', '.game stop']],
        breakout: [['Left', '.game left'], ['Right', '.game right'], ['Launch', '.game launch']],
        pong: [['Up', '.game up'], ['Down', '.game down'], ['Stop', '.game stop']],
        shooter: [['Left', '.game left'], ['Right', '.game right'], ['Fire', '.game fire']],
        stack: [['Drop', '.game drop'], ['Again', '.game stack'], ['Stop', '.game stop']],
        whack: [['Hit 1', '.game hit 1'], ['Hit 2', '.game hit 2'], ['Hit 3', '.game hit 3']],
    };
    return sets[kind] || [];
}

async function sendReply(sock, chatId, message, text, kind) {
    const buttons = getButtons(kind);
    if (!buttons.length) return sock.sendMessage(chatId, { text }, { quoted: message });
    try {
        const msg = generateWAMessageFromContent(chatId, {
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
        return await sock.relayMessage(msg.key.remoteJid, msg.message, {
            messageId: msg.key.id,
            additionalNodes: [{
                tag: 'biz', attrs: {}, content: [{
                    tag: 'interactive', attrs: { type: 'native_flow', v: '1' },
                    content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }],
                }],
            }],
        });
    } catch (error) {
        return sock.sendMessage(chatId, { text }, { quoted: message });
    }
}

function instructions(kind) {
    const descriptions = {
        dino: '🦖 Tumia `.game jump` au `.game run`. Epuka vizuizi.',
        slot: '🎰 Tumia `.game spin`. Kila spin hutumia pointi 10 za mchezo; si pesa halisi.',
        snake: '🐍 Tumia `.game up/down/left/right`; kula 🍎 bila kugonga ukuta au mkia.',
        ttt: '❌⭕ Chagua nafasi kwa `.game <1-9>`; wewe ni X.',
        doom: '🔫 Tumia `.game up/down/left/right` kutembea, `.game fire` kushambulia.',
        '2048': '🔢 Unganisha namba kwa `.game up/down/left/right` kufikia 2048.',
        flappy: '🐤 Tumia `.game flap` au `.game float` kuvuka vizuizi.',
        breakout: '🧱 Tumia `.game left/right`, kisha `.game launch` kuzuia mpira.',
        pong: '🏓 Tumia `.game up/down` kusogeza paddle na kurudisha mpira.',
        shooter: '🚀 Sogeza kwa `.game left/right`, kisha `.game fire` ukiwa mstari wa shabaha.',
        stack: '🧱 Tumia `.game drop` kuweka block juu ya nyingine.',
        whack: '🐹 Tuma `.game hit <namba>` kugonga shabaha inayoonyeshwa.',
        memory: '🧠 Tuma `.game flip <1-16>` kufungua kadi mbili zinazofanana.',
        mines: '💣 Tumia `.game dig <1-25>` au `.game flag <1-25>`.',
        connect4: '🔴 Tumia `.game drop <1-7>` kuweka token kwenye safu.',
        simon: '🎵 Kumbuka mlolongo unaoonyeshwa, kisha tuma `.game repeat <rangi...>`.',
        lights: '💡 Tumia `.game press <1-25>` kuzima taa zote.',
        reflex: '⚡ Tuma `.game tap` baada ya kuanza na kusubiri ishara.',
    };
    return descriptions[kind] || '';
}

function startText(session) {
    const kind = session.kind;
    let text = `🎮 *${GAMES[kind].name}*\n${instructions(kind)}`;
    if (kind === 'slot') text += `\nPointi zako: ${session.balance}`;
    if (kind === 'snake') text += `\n\n${renderSnake(session)}`;
    if (kind === 'ttt') text += `\n\n${renderTtt(session.board)}`;
    if (kind === 'doom') text += `\nHP: ${session.hp} | Risasi: ${session.ammo} | Adui: ${session.enemies.length}`;
    if (kind === '2048') text += `\n\n${render2048(session.board)}`;
    if (kind === 'flappy') text += `\nNafasi: ${session.altitude} | Alama: 0`;
    if (kind === 'breakout') text += `\n🧱 Blocks: ${session.bricks} | Maisha: 3`;
    if (kind === 'pong') text += `\nAlama: 0-0`;
    if (kind === 'shooter') text += `\nMchezaji: 3 | Shabaha: ${session.target + 1} | Maisha: 3`;
    if (kind === 'stack') text += `\nBlock: ${session.width} sehemu | Ghorofa: 0`;
    if (kind === 'whack') text += `\nShabaha ya sasa: *${session.target}* | Alama: 0`;
    if (kind === 'memory') text += `\nKadi 1-16 zimefichwa.`;
    if (kind === 'mines') text += `\n\n${renderMines(session)}`;
    if (kind === 'connect4') text += `\n\n${renderConnect4(session.board)}`;
    if (kind === 'simon') text += `\nRangi: 🔴 red, 🟢 green, 🔵 blue, 🟡 yellow. Mlolongo: ${session.sequence.map((v) => ['red', 'green', 'blue', 'yellow'][v]).join(' ')}`;
    if (kind === 'lights') text += `\n\n${renderLights(session.board)}`;
    if (kind === 'reflex') text += `\nSubiri sekunde chache, kisha bonyeza tap.`;
    return text;
}

function move2048(session, direction) {
    const board = session.board;
    const lines = [];
    for (let i = 0; i < 4; i++) {
        lines.push(Array.from({ length: 4 }, (_, j) => direction === 'left' ? i * 4 + j
            : direction === 'right' ? i * 4 + 3 - j
                : direction === 'up' ? j * 4 + i : (3 - j) * 4 + i));
    }
    let changed = false;
    for (const line of lines) {
        const values = line.map((index) => board[index]).filter(Boolean);
        for (let i = 0; i < values.length - 1; i++) {
            if (values[i] === values[i + 1]) {
                values[i] *= 2;
                session.score += values[i];
                values.splice(i + 1, 1);
            }
        }
        while (values.length < 4) values.push(0);
        line.forEach((index, i) => {
            if (board[index] !== values[i]) changed = true;
            board[index] = values[i];
        });
    }
    if (!changed) return `Hakuna mwendo hapo.\n\n${render2048(board)}`;
    add2048Tile(board);
    return `Alama: ${session.score}\n\n${render2048(board)}\n\nTumia up/down/left/right.`;
}

function step(session, actionParts) {
    const action = String(actionParts[0] || '').toLowerCase();
    const value = Number(actionParts[1]);
    const response = (text) => text;
    if (session.kind === 'dino') {
        if (!session.alive) return response(`Mchezo umeisha. Alama: ${session.score}. Tuma .game dino kuanza tena.`);
        const jumped = ['jump', 'kuruka'].includes(action);
        if (Math.random() < 0.5 && !jumped) {
            session.alive = false;
            return response(`🌵 Umegonga kizuizi! Alama: ${session.score}. Tuma .game dino kuanza tena.`);
        }
        session.score++;
        return response(`🦖 ${jumped ? 'Umeruka!' : 'Umeendelea!'} Alama: ${session.score}. Tuma jump au run.`);
    }
    if (session.kind === 'slot') {
        if (!['spin', 'roll', ''].includes(action)) return response('Tumia `.game spin`.');
        if (session.balance < 10) return response('Pointi zimeisha. Tuma `.game slot` kuanza upya.');
        const symbols = ['🍒', '7️⃣', '💎', '⭐', '🍋', '🍇', '🔔'];
        const result = Array.from({ length: 3 }, () => symbols[Math.floor(Math.random() * symbols.length)]);
        const reward = result.every((symbol) => symbol === result[0]) ? (result[0] === '7️⃣' ? 500 : 100)
            : new Set(result).size === 2 ? 20 : 0;
        session.balance += reward - 10;
        session.spins++;
        return response(`🎰 ${result.join(' | ')}\n${reward ? `Pointi +${reward}` : 'Jaribu tena'}\nPointi: ${session.balance} • Spins: ${session.spins}\nPointi za mchezo tu.`);
    }
    if (session.kind === 'snake') {
        const directions = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0], juu: [0, -1], chini: [0, 1], kushoto: [-1, 0], kulia: [1, 0] };
        if (!session.alive) return response('Game over. Tuma `.game snake` kuanza tena.');
        const vector = directions[action];
        if (!vector) return response(`${renderSnake(session)}\nChagua up, down, left au right.`);
        if (vector[0] === -session.direction.x && vector[1] === -session.direction.y) return response('Huwezi kurudi nyuma moja kwa moja.');
        session.direction = { x: vector[0], y: vector[1] };
        const head = { x: session.snake[0].x + vector[0], y: session.snake[0].y + vector[1] };
        const eating = head.x === session.food.x && head.y === session.food.y;
        const body = eating ? session.snake : session.snake.slice(0, -1);
        if (head.x < 0 || head.x >= 7 || head.y < 0 || head.y >= 7 || body.some((part) => part.x === head.x && part.y === head.y)) {
            session.alive = false;
            return response(`💥 Game over! Alama: ${session.score}\n${renderSnake(session)}\nTuma .game snake kuanza tena.`);
        }
        session.snake.unshift(head);
        if (eating) {
            session.score++;
            do { session.food = { x: Math.floor(Math.random() * 7), y: Math.floor(Math.random() * 7) }; }
            while (session.snake.some((part) => part.x === session.food.x && part.y === session.food.y));
        } else session.snake.pop();
        return response(`${renderSnake(session)}\nAlama: ${session.score}${eating ? ' • 🍎' : ''}`);
    }
    if (session.kind === 'ttt') {
        if (session.finished) return response(`Mchezo umeisha. Tuma .game ttt kuanza tena.\n${renderTtt(session.board)}`);
        const position = Number(action) - 1;
        if (!Number.isInteger(position) || position < 0 || position > 8 || session.board[position]) return response(`Chagua nafasi 1-9:\n${renderTtt(session.board)}`);
        session.board[position] = 'X';
        let winner = tttWinner(session.board);
        if (!winner) {
            session.board[chooseTttMove(session.board)] = 'O';
            winner = tttWinner(session.board);
        }
        if (winner) session.finished = true;
        return response(`${renderTtt(session.board)}\n${winner === 'X' ? '🎉 Umeshinda!' : winner === 'O' ? 'AI imeshinda.' : winner === 'draw' ? 'Sare.' : 'Zamu yako: .game <1-9>'}`);
    }
    if (session.kind === 'doom') {
        if (session.finished) return response('🏆 Level imeisha. Tuma .game doom kuanza tena.');
        if (action === 'fire') {
            if (!session.ammo) return response(`Risasi zimeisha. HP: ${session.hp}.`);
            session.ammo--;
            const enemyIndex = session.enemies.findIndex((enemy) => Math.abs(enemy.x - session.x) + Math.abs(enemy.y - session.y) <= 1);
            if (enemyIndex >= 0) session.enemies.splice(enemyIndex, 1);
            if (!session.enemies.length) session.finished = true;
            return response(`🔫 ${enemyIndex >= 0 ? 'Umemshinda adui!' : 'Hakuna adui karibu.'}\nHP: ${session.hp} | Risasi: ${session.ammo} | Adui: ${session.enemies.length}${session.enemies.length ? '' : '\n🏆 Umeshinda!'}`);
        }
        const moves = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
        if (!moves[action]) return response('Tumia up/down/left/right au fire.');
        const [dx, dy] = moves[action];
        session.x = Math.max(0, Math.min(4, session.x + dx));
        session.y = Math.max(0, Math.min(4, session.y + dy));
        const closeEnemy = session.enemies.some((enemy) => Math.abs(enemy.x - session.x) + Math.abs(enemy.y - session.y) <= 1);
        if (closeEnemy && Math.random() < 0.35) session.hp--;
        if (session.hp <= 0) { session.finished = true; return response('💥 Umeshindwa. Tuma `.game doom` kuanza tena.'); }
        return response(`🚪 Umefika ${session.x + 1},${session.y + 1}. ${closeEnemy ? 'Adui karibu!' : ''}\nHP: ${session.hp} | Risasi: ${session.ammo} | Adui: ${session.enemies.length}`);
    }
    if (session.kind === '2048') {
        if (!['up', 'down', 'left', 'right'].includes(action)) return response(`Tumia up/down/left/right.\n\n${render2048(session.board)}`);
        return response(move2048(session, action));
    }
    if (session.kind === 'flappy') {
        if (!session.alive) return response(`Game over! Alama: ${session.score}. Tuma .game flappy kuanza tena.`);
        if (action === 'flap') session.altitude = Math.min(3, session.altitude + 1);
        else if (action === 'float') session.altitude = Math.max(0, session.altitude - 1);
        else return response('Tumia flap au float.');
        session.steps++;
        if (session.steps % 3 === 0) {
            if (Math.abs(session.altitude - session.target) > 1) {
                session.alive = false;
                return response(`🐤 Umegonga bomba! Alama: ${session.score}. Tuma .game flappy kuanza tena.`);
            }
            session.score++;
            session.target = Math.floor(Math.random() * 4);
        }
        return response(`🐤 Nafasi: ${session.altitude} | Alama: ${session.score}\nKizuizi baada ya ${3 - session.steps % 3} hatua. Tumia flap/float.`);
    }
    if (session.kind === 'breakout') {
        if (session.finished) return response(`Game over. Alama: ${session.score}. Tuma .game breakout kuanza tena.`);
        if (action === 'left') session.paddle = Math.max(0, session.paddle - 1);
        else if (action === 'right') session.paddle = Math.min(6, session.paddle + 1);
        else if (action !== 'launch') return response('Tumia left, right au launch.');
        const hit = Math.abs(session.ball - session.paddle) <= 1;
        session.ball += session.direction;
        if (session.ball < 0 || session.ball > 6) { session.ball = Math.max(0, Math.min(6, session.ball)); session.direction *= -1; }
        if (hit) { session.bricks--; session.score += 10; session.direction *= -1; }
        else if (action === 'launch') {
            session.lives--;
            if (session.lives <= 0) { session.finished = true; return response(`Game over! Alama: ${session.score}. Tuma .game breakout kuanza tena.`); }
        }
        if (session.bricks <= 0) session.finished = true;
        return response(`🧱 Paddle ${session.paddle} | Mpira ${session.ball}\nBlocks: ${session.bricks} | Maisha: ${session.lives} | Alama: ${session.score}${session.bricks <= 0 ? '\n🏆 Umeshinda!' : ''}`);
    }
    if (session.kind === 'pong') {
        if (session.finished) return response(`Mchezo umeisha: ${session.player}-${session.cpu}. Tuma .game pong kuanza tena.`);
        if (action === 'up') session.paddle = Math.max(0, session.paddle - 1);
        else if (action === 'down') session.paddle = Math.min(6, session.paddle + 1);
        else return response('Tumia up au down.');
        session.ballY += session.ballDir;
        if (session.ballY < 0 || session.ballY > 6) { session.ballY = Math.max(0, Math.min(6, session.ballY)); session.ballDir *= -1; }
        if (Math.random() < 0.3) {
            if (Math.abs(session.ballY - session.paddle) <= 1) session.player++;
            else session.cpu++;
            session.ballY = Math.floor(Math.random() * 7);
        }
        if (session.player >= 5 || session.cpu >= 5) session.finished = true;
        return response(`🏓 ${session.player}-${session.cpu} | Paddle: ${session.paddle} | Mpira: ${session.ballY}${session.finished ? `\n${session.player >= 5 ? '🎉 Umeshinda!' : 'CPU imeshinda.'} Tuma .game pong kuanza tena.` : ''}`);
    }
    if (session.kind === 'shooter') {
        if (session.finished) return response(`Game over. Alama: ${session.score}. Tuma .game shooter kuanza tena.`);
        if (action === 'left') session.lane = Math.max(0, session.lane - 1);
        else if (action === 'right') session.lane = Math.min(4, session.lane + 1);
        else if (action === 'fire') {
            const hitTarget = session.lane === session.target;
            if (hitTarget) { session.score += 10; session.target = Math.floor(Math.random() * 5); }
            else session.lives--;
            if (session.lives <= 0) session.finished = true;
            return response(`${hitTarget ? '🎯 Shabaha!' : '❌ Umekosa!'} Alama: ${session.score} | Maisha: ${session.lives}\nShabaha: ${session.target + 1}${session.finished ? '\nGame over. Tuma .game shooter kuanza tena.' : ''}`);
        } else return response('Tumia left/right/fire.');
        return response(`🚀 Wewe: ${session.lane + 1} | Shabaha: ${session.target + 1} | Alama: ${session.score} | Maisha: ${session.lives}`);
    }
    if (session.kind === 'stack') {
        if (session.finished) return response(`Game over. Ghorofa: ${session.height}. Tuma .game stack kuanza tena.`);
        if (action !== 'drop') return response('Tumia `.game drop`.');
        const offset = Math.floor(Math.random() * 3) - 1;
        if (Math.abs(offset) >= session.width) { session.finished = true; return response(`Block imeanguka! Ghorofa: ${session.height}. Tuma .game stack kuanza tena.`); }
        session.width -= Math.abs(offset);
        session.height++;
        if (session.width <= 0 || session.height >= 10) session.finished = true;
        return response(`${session.finished ? '🏆 Umeshinda!' : '🧱 Block imekaa.'} Ghorofa: ${session.height} | Upana: ${session.width}${session.finished ? '\nTuma .game stack kuanza tena.' : '\nTumia drop.'}`);
    }
    if (session.kind === 'whack') {
        if (action !== 'hit' || !Number.isInteger(value) || value < 1 || value > 9) return response(`Shabaha: ${session.target}. Tumia .game hit <1-9>.`);
        const hitTarget = value === session.target;
        if (hitTarget) session.score++;
        else session.misses++;
        session.target = Math.floor(Math.random() * 9) + 1;
        return response(`${hitTarget ? '🎯 Umepata!' : '🙈 Ulikosa.'}\nShabaha mpya: ${session.target} | Alama: ${session.score} | Misses: ${session.misses}`);
    }
    if (session.kind === 'memory') {
        if (action !== 'flip' || !Number.isInteger(value) || value < 1 || value > 16) return response('Tumia `.game flip <1-16>`.');
        const index = value - 1;
        if (session.matched.includes(index)) return response('Kadi hiyo tayari imefunguliwa. Chagua nyingine.');
        if (session.pending === null) {
            session.pending = index;
            return response(`Umefungua ${value}: ${session.cards[index]}. Chagua kadi ya pili (1-16).\nZilizolingana: ${session.matched.length / 2}/8`);
        }
        if (session.pending === index) return response('Chagua namba tofauti ya kadi.');
        const first = session.pending;
        session.turns++;
        session.pending = null;
        if (session.cards[first] === session.cards[index]) {
            session.matched.push(first, index);
            if (session.matched.length === 16) session.finished = true;
            return response(`✅ Jozi: ${session.cards[index]} (${first + 1}, ${index + 1})\nJozi: ${session.matched.length / 2}/8 | Zamu: ${session.turns}${session.finished ? '\n🏆 Umemaliza!' : ''}`);
        }
        return response(`Hazifanani: ${first + 1}=${session.cards[first]}, ${index + 1}=${session.cards[index]}. Jozi ${session.matched.length / 2}/8. Jaribu tena.`);
    }
    if (session.kind === 'mines') {
        if (session.finished) return response(`Mchezo umeisha. Tuma .game mines kuanza tena.\n${renderMines(session)}`);
        const mode = action;
        const index = value - 1;
        if (!['dig', 'flag'].includes(mode) || !Number.isInteger(value) || value < 1 || value > 25) return response('Tumia `.game dig <1-25>` au `.game flag <1-25>`.');
        if (mode === 'flag') {
            if (!session.revealed.includes(index)) session.flagged = session.flagged.includes(index) ? session.flagged.filter((i) => i !== index) : [...session.flagged, index];
            return response(`${renderMines(session)}\nBendera: ${session.flagged.length}. Tumia dig/flag <namba>.`);
        }
        if (session.firstMove) {
            session.mines = Array.from({ length: 25 }, (_, i) => i).filter((i) => i !== index).sort(() => Math.random() - 0.5).slice(0, 5);
            session.firstMove = false;
        }
        if (session.mines.includes(index)) {
            session.finished = true;
            session.revealed = Array.from({ length: 25 }, (_, i) => i);
            return response(`💥 Umegonga bomu!\n${renderMines(session)}\nTuma .game mines kuanza tena.`);
        }
        session.revealed = [...new Set([...session.revealed, index])];
        const adjacent = neighbors(index, 5).filter((i) => session.mines.includes(i));
        if (adjacent.length === 0) {
            for (const neighbor of neighbors(index, 5)) if (!session.mines.includes(neighbor)) session.revealed.push(neighbor);
            session.revealed = [...new Set(session.revealed)];
        }
        if (session.revealed.length >= 20) session.finished = true;
        return response(`${renderMines(session)}\n${session.finished ? '🏆 Umeshinda!' : 'Salama. Tumia dig/flag <namba>.'}`);
    }
    if (session.kind === 'connect4') {
        if (session.finished) return response(`Mchezo umeisha. Tuma .game connect4 kuanza tena.\n${renderConnect4(session.board)}`);
        if (!['drop', ''].includes(action) || !Number.isInteger(value) || value < 1 || value > 7) return response(`Tumia .game drop <1-7>.\n${renderConnect4(session.board)}`);
        let row = -1;
        for (let r = 5; r >= 0; r--) if (!session.board[r * 7 + value - 1]) { row = r; break; }
        if (row < 0) return response('Safu imejaa. Chagua safu nyingine 1-7.');
        session.board[row * 7 + value - 1] = '🔴';
        const wins = (mark) => {
            for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) {
                for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
                    const cells = Array.from({ length: 4 }, (_, k) => [r + dr * k, c + dc * k]);
                    if (cells.every(([y, x]) => y >= 0 && y < 6 && x >= 0 && x < 7 && session.board[y * 7 + x] === mark)) return true;
                }
            }
            return false;
        };
        if (wins('🔴')) session.finished = true;
        else {
            const columns = [3, 2, 4, 1, 5, 0, 6];
            const col = columns.find((c) => session.board[c] === '' || session.board[7 + c] === '' || session.board[14 + c] === '' || session.board[21 + c] === '' || session.board[28 + c] === '' || session.board[35 + c] === '');
            if (col !== undefined) {
                for (let r = 5; r >= 0; r--) if (!session.board[r * 7 + col]) { session.board[r * 7 + col] = '🟡'; break; }
            }
            if (wins('🟡') || session.board.every(Boolean)) session.finished = true;
        }
        return response(`${renderConnect4(session.board)}\n${session.finished ? (wins('🔴') ? '🎉 Umeshinda!' : wins('🟡') ? 'AI imeshinda.' : 'Sare.') : 'Zamu yako: .game drop <1-7>'}`);
    }
    if (session.kind === 'simon') {
        if (action !== 'repeat') return response(`Rudia: ${session.sequence.map((v) => ['red', 'green', 'blue', 'yellow'][v]).join(' ')}\nTuma .game repeat <rangi...>.`);
        const colors = { red: 0, green: 1, blue: 2, yellow: 3, r: 0, g: 1, b: 2, y: 3 };
        const answer = actionParts.slice(1).map((part) => colors[part.toLowerCase()]);
        if (answer.length !== session.sequence.length || answer.some((color, i) => color !== session.sequence[i])) {
            session.finished = true;
            return response(`❌ Mlolongo si sahihi. Umefika raundi ${session.round}. Tuma .game simon kuanza tena.`);
        }
        session.sequence.push(Math.floor(Math.random() * 4));
        session.round++;
        return response(`✅ Sawa! Raundi ${session.round}: ${session.sequence.map((v) => ['red', 'green', 'blue', 'yellow'][v]).join(' ')}\nTuma .game repeat <rangi...>.`);
    }
    if (session.kind === 'lights') {
        if (action !== 'press' || !Number.isInteger(value) || value < 1 || value > 25) return response(`Tumia .game press <1-25>.\n${renderLights(session.board)}`);
        toggleLights(session.board, value - 1);
        session.moves++;
        if (!session.board.some(Boolean)) session.finished = true;
        return response(`${renderLights(session.board)}\n${session.finished ? `🏆 Umezima taa zote kwa ${session.moves} moves!` : `Moves: ${session.moves}. Tumia press <1-25>.`}`);
    }
    if (session.kind === 'reflex') {
        if (action === 'start') {
            session.readyAt = Date.now() + 1500 + Math.floor(Math.random() * 2500);
            return response('Subiri ishara kwa sekunde chache, kisha tuma `.game tap`.');
        }
        if (action !== 'tap') return response('Tumia `.game start`, subiri sekunde chache, kisha `.game tap`.');
        if (Date.now() < session.readyAt) {
            session.readyAt = Date.now() + 1800 + Math.floor(Math.random() * 2200);
            return response('Umebonyeza mapema! Subiri tena, kisha tuma `.game tap`.');
        }
        const reaction = Math.max(120, Date.now() - session.readyAt + 220);
        session.readyAt = Date.now() + 1800 + Math.floor(Math.random() * 2500);
        return response(`⚡ Muda wako: ${reaction} ms. Tuma .game tap baada ya kusubiri kwa raundi nyingine.`);
    }
    return 'Mchezo haujatambuliwa. Tuma `.game` kuona menyu.';
}

async function gameCommand(sock, chatId, message, args = []) {
    const key = `${chatId}:${message?.key?.participant || message?.key?.remoteJid || chatId}`;
    const text = String(message?.message?.conversation || message?.message?.extendedTextMessage?.text || '').trim();
    const words = text.split(/\s+/).filter(Boolean);
    const commandName = String(words[0] || '.game').replace(/^\./, '').toLowerCase();
    const commandArgs = words.length > 1 ? words.slice(1) : (Array.isArray(args) ? args : []);
    let kind = GAME_ALIASES.get(commandName);
    let actionParts = commandArgs;
    if (commandName === 'game' || commandName === 'arcade' || commandName === 'minigames' || commandName === 'gamehub') {
        const requested = String(commandArgs[0] || '').toLowerCase();
        if (!requested || ['list', 'menu', 'help', 'games'].includes(requested)) {
            return sendReply(sock, chatId, message,
                '🎮 *LOFT ARCADE • 18 games*\n\n' +
                '*Classic:* Dino, Snake, Tic-Tac-Toe, Doom, 2048\n' +
                '*Action:* Flappy, Slot, Breakout, Pong, Shooter, Stack, Whack-a-Mole\n' +
                '*Puzzle:* Memory, Minesweeper, Connect 4, Simon Says, Lights Out, Reflex\n\n' +
                'Chagua pack kwa `.game classic`, `.game action` au `.game puzzle`.\n' +
                'Tuma `.game all` kuona orodha kamili; `.game stop` kusitisha.', 'menu');
        }
        if (requested === 'all') {
            const names = Object.values(GAMES).map((game) => game.name).join(', ');
            return sendReply(sock, chatId, message, `🎮 *Michezo yote*\n${names}\n\nAnza kwa .game <jina>.`, 'menu');
        }
        if (PACKS[requested]) {
            const names = PACKS[requested].map((id) => GAMES[id].name).join(', ');
            return sendReply(sock, chatId, message, `🎮 *${requested.toUpperCase()} PACK*\n${names}\n\nAnza kwa .game <jina>.`, requested);
        }
        if (requested === 'stop' || requested === 'exit' || requested === 'quit') {
            sessions.delete(key);
            return sendReply(sock, chatId, message, '🛑 Mchezo umesitishwa. Tuma `.game` kufungua menyu tena.');
        }
        kind = GAME_ALIASES.get(requested);
        actionParts = kind ? commandArgs.slice(1) : commandArgs;
    }

    if (kind) {
        const session = newSession(kind);
        cleanSessions();
        sessions.set(key, session);
        if (actionParts.length) {
            const result = step(session, actionParts);
            session.updatedAt = Date.now();
            return sendReply(sock, chatId, message, `${startText(session)}\n\n${result}`, kind);
        }
        return sendReply(sock, chatId, message, startText(session), kind);
    }

    const session = sessions.get(key);
    if (!session) return sendReply(sock, chatId, message, 'Tuma `.game` kuchagua pack au mchezo.', 'menu');
    const action = commandArgs.length ? commandArgs : words.slice(1);
    if (action[0]?.toLowerCase() === 'stop') {
        sessions.delete(key);
        return sendReply(sock, chatId, message, '🛑 Mchezo umesitishwa. Tuma `.game` kufungua menyu tena.');
    }
    session.updatedAt = Date.now();
    return sendReply(sock, chatId, message, step(session, action), session.kind);
}

gameCommand.category = 'fun';
gameCommand.description = 'Play 18 chat-based mini games';

module.exports = gameCommand;