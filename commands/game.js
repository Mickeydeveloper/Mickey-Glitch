'use strict';

const crypto = require('crypto');

const GAMES = Object.freeze({
    dino: 'Dino Runner',
    ttt: 'Tic Tac Toe vs AI',
    doom: 'Mini Doom',
    snake: 'Snake',
    g2048: '2048',
    flappy: 'Flappy Bird',
    breakout: 'Breakout',
    pong: 'Pong',
    shooter: 'Space Shooter',
    stack: 'Stack',
    whack: 'Whack-a-Mole',
    memory: 'Memory Match',
    mines: 'Minesweeper',
    connect4: 'Connect 4',
    simon: 'Simon Says',
    lights: 'Lights Out',
    reflex: 'Reflex Test'
});

const PACKS = Object.freeze({
    classic: ['dino', 'snake', 'ttt', 'doom', 'g2048'],
    action: ['flappy', 'breakout', 'pong', 'shooter', 'stack', 'whack'],
    puzzle: ['memory', 'mines', 'connect4', 'simon', 'lights', 'reflex']
});

const ALIASES = Object.freeze({
    action: 'action', actions: 'action', fast: 'action',
    puzzle: 'puzzle', puzzles: 'puzzle', brain: 'puzzle', logic: 'puzzle',
    all: 'all', everything: 'all', full: 'all', max: 'all',
    classic: 'classic', main: 'classic', classics: 'classic', default: 'classic',
    arcade: 'classic', game: 'classic'
});

function getArgs(args) {
    if (Array.isArray(args)) return args.map(String).filter(Boolean);
    if (typeof args === 'string') return args.trim().split(/\s+/).filter(Boolean);
    return args == null ? [] : [String(args)];
}

function gameHubHtml(ids) {
    const games = ids.map((id) => `
        <button class="game" data-game="${id}">
            <span class="game-name">${GAMES[id]}</span>
            <span class="game-action">OPEN</span>
        </button>`).join('');

    return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{margin:0;background:transparent;color:#f7f8fa;font-family:Arial,sans-serif;-webkit-user-select:none;user-select:none}
.wrap{max-width:620px;margin:auto;padding:14px}.panel{border:1px solid rgba(255,255,255,.14);border-radius:16px;background:rgba(18,20,27,.88);box-shadow:0 18px 44px rgba(0,0,0,.32);overflow:hidden}
.head{display:flex;align-items:center;justify-content:space-between;padding:16px;border-bottom:1px solid rgba(255,255,255,.1)}
h1{font-size:20px;margin:0}.count{font-size:12px;color:#bfc5d0}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:12px}
.game{min-height:70px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:rgba(255,255,255,.06);color:#fff;padding:12px;text-align:left;display:flex;flex-direction:column;justify-content:space-between;cursor:pointer}
.game:hover,.game:active{background:rgba(108,92,231,.28);border-color:#8e7cf0}.game-name{font-size:14px;font-weight:700}.game-action{font-size:10px;color:#aeb7cb;letter-spacing:1px}
.note{font-size:11px;color:#9ea6b5;padding:0 12px 12px;text-align:center}
@media(max-width:380px){.grid{grid-template-columns:1fr}.game{min-height:58px}}
</style></head><body><div class="wrap"><section class="panel">
<div class="head"><h1>LOFT Arcade</h1><span class="count">${ids.length} games</span></div>
<div class="grid">${games}</div><div class="note">Choose a game from the hub</div>
</section></div></body></html>`;
}

function buildGamePayload(jid, ids, title) {
    const responseId = `game-${crypto.randomUUID()}`;
    return {
        jid,
        message: {
            messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
                botMetadata: {
                    botResponseId: responseId,
                    verificationMetadata: {
                        proofs: [{ version: 1, useCase: 1, signature: 'GAME.JS-LOFT-ARCADE' }]
                    }
                }
            },
            botForwardedMessage: {
                message: {
                    richResponseMessage: {
                        messageType: 1,
                        submessages: [{ messageType: 2, messageText: title }],
                        unifiedResponse: {
                            data: Buffer.from(JSON.stringify({
                                response_id: responseId,
                                embedded_screens: [{
                                    title: 'LOFT Arcade',
                                    content: [{
                                        __typename: 'FOAIDNixelButtonSheets',
                                        tabs: [{
                                            id: 'arcade_hub',
                                            tab_header: 'Arcade',
                                            sections: [{
                                                __typename: 'GenAIUnifiedResponseSection',
                                                view_model: {
                                                    __typename: 'GenAISingleLayoutViewModel',
                                                    primitive: {
                                                        __typename: 'GenAIaeacdsnwHtmlPrimitive',
                                                        payload: gameHubHtml(ids),
                                                        url: 'https://nixel.dev',
                                                        trusted_sources: ['nixel.dev']
                                                    }
                                                }
                                            }],
                                            step_entries: []
                                        }]
                                    }]
                                }]
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
        }
    };
}

function listText(prefix) {
    const line = (key) => PACKS[key].map((id) => GAMES[id]).join(', ');
    return [
        '🎮 *LOFT ARCADE*',
        '',
        `*${prefix}game* or *${prefix}game classic*`,
        line('classic'),
        '',
        `*${prefix}game action*`,
        line('action'),
        '',
        `*${prefix}game puzzle*`,
        line('puzzle'),
        '',
        `*${prefix}game all* - all ${Object.keys(GAMES).length} games`,
        `*${prefix}game pong* / *${prefix}game ttt* - open a playable command`
    ].join('\n');
}

async function gameCommand(sock, chatId, message, args = []) {
    const [first = ''] = getArgs(args);
    const arg = first.trim().toLowerCase();
    const prefix = '.';

    if (!sock || !chatId) throw new Error('Game command requires a socket and chat id');

    if (['list', 'help', 'menu', 'games'].includes(arg)) {
        await sock.sendMessage(chatId, { text: listText(prefix) }, { quoted: message });
        return;
    }

    if (arg === 'pong' || arg === 'ttt') {
        const playable = require(arg === 'pong' ? './pong' : './tictac');
        await playable(sock, chatId, message, []);
        return;
    }

    const key = arg === 'all'
        ? 'all'
        : (!arg ? 'classic' : ALIASES[arg]);
    if (!key) {
        await sock.sendMessage(chatId, {
            text: `Unknown game pack "${arg.slice(0, 20)}".\n\n${listText(prefix)}`
        }, { quoted: message });
        return;
    }
    const ids = key === 'all'
        ? [...PACKS.classic, ...PACKS.action, ...PACKS.puzzle]
        : PACKS[key];

    await sendRichHub(sock, chatId, message, key, ids);
}

async function sendRichHub(sock, chatId, message, key, ids) {
    ids ??= key === 'all'
        ? [...PACKS.classic, ...PACKS.action, ...PACKS.puzzle]
        : PACKS[key];
    const payload = buildGamePayload(chatId, ids, `LOFT Arcade - ${key}`);

    try {
        await sock.relayMessage(payload.jid, payload.message, {});
    } catch (error) {
        console.error('[GAME] rich hub failed:', error?.stack || error);
        await sock.sendMessage(chatId, {
            text: `${listText('.')}\n\nCould not open rich arcade: ${error?.message || 'unknown error'}`
        }, { quoted: message });
    }
}

gameCommand.name = 'game';
gameCommand.aliases = ['arcade', 'minigames', 'gamehub'];
gameCommand.category = 'game';
gameCommand.description = 'LOFT Arcade hub with classic, action, and puzzle packs';
gameCommand.usage = '.game [classic|action|puzzle|all|list|pong|ttt]';

module.exports = gameCommand;
