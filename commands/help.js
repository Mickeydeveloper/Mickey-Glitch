// help.js
// Last meaningful update: improved string interpolation + fallback + readability

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const settings = require('../settings');

/**
 * Command categories (update this object when adding/removing commands)
 */
const COMMAND_CATEGORIES = {
    admin:    ['ban', 'unban', 'kick', 'promote', 'demote', 'mute', 'unmute', 'warn', 'warnings', 'clear'],
    group:    ['groupmanage', 'tagall', 'tagnotadmin', 'tag', 'mention', 'hidetag'],
    fun:      ['compliment', 'character', 'wasted', 'emojimix', 'textmaker'],
    media:    ['sticker', 'sticker-alt', 'stickercrop', 'stickertelegram', 'img-blur', 'video', 'url', 'lyrics'],
    social:   ['instagram', 'facebook', 'tiktok', 'spotify', 'youtube'],
    download: ['play', 'igs', 'imagine'],
    utility:  ['ping', 'alive', 'update', 'checkupdates', 'settings', 'weather', 'translate', 'tts'],
    owner:    ['owner', 'pair', 'sudo', 'staff', 'resetlink', 'phone', 'halotel'],
    auto:     ['autostatus', 'autoread', 'autotyping', 'autobio', 'antitag', 'antidelete', 'antilink', 'antibadword'],
    ai:       ['ai', 'chatbot']
};

const EXCLUDE = ['help', 'index', 'main'];

function getUptime() {
    const t = process.uptime();
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = Math.floor(t % 60);
    return `${h}h ${m}m ${s}s`;
}

function getCommandDescription(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split(/\r?\n/).slice(0, 15);
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (trimmed.startsWith('//')) {
                return trimmed.replace(/^\/\/\s*/, '');
            }
            if (trimmed.startsWith('/*')) {
                return trimmed.replace(/^\/\*\s?/, '').replace(/\*\/$/, '');
            }
            if (trimmed.startsWith('*')) {
                return trimmed.replace(/^\*\s?/, '');
            }
        }
    } catch {
        // silent fail
    }
    return '';
}

function emojiForCategory(cat) {
    const map = {
        admin:    '👮‍♂️',
        group:    '👥',
        fun:      '🎭',
        media:    '🖼️',
        social:   '🌐',
        download: '⬇️',
        utility:  '🛠️',
        owner:    '👑',
        auto:     '🤖',
        ai:       '🧠'
    };
    return map[cat] || '📦';
}

function loadCommands() {
    const dir = __dirname;
    let files;
    try {
        files = fs.readdirSync(dir);
    } catch {
        return [];
    }

    return files
        .filter(f => f.endsWith('.js'))
        .map(f => path.basename(f, '.js'))
        .filter(name => !EXCLUDE.includes(name))
        .sort((a, b) => a.localeCompare(b))
        .map(name => {
            const fp = path.join(dir, name + '.js');
            const desc = getCommandDescription(fp);
            let category = 'other';

            for (const [cat, cmds] of Object.entries(COMMAND_CATEGORIES)) {
                if (cmds.includes(name)) {
                    category = cat;
                    break;
                }
            }

            return { name, desc, category };
        });
}

function buildHelpMessage(cmds, opts = {}) {
    const {
        runtime   = getUptime(),
        mode      = settings.commandMode || 'public',
        prefix    = settings.prefix || '.',
        ramUsed   = (process.memoryUsage().rss / 1e9).toFixed(2),
        ramTotal  = (os.totalmem() / 1e9).toFixed(2),
        time      = new Date().toLocaleTimeString('en-GB', { hour12: false }),
        username  = 'Unknown'
    } = opts;

    const groups = { other: [] };
    Object.keys(COMMAND_CATEGORIES).forEach(c => groups[c] = []);

    cmds.forEach(cmd => {
        (groups[cmd.category] || groups.other).push(cmd);
    });

    let text = `🎯 *${settings.botName || 'Mickey Glitch'} Commands*  v ${settings.version || '?.?'}\n\n`;

    text += `▸ Uptime    : ${runtime}\n`;
    text += `▸ Mode      : ${mode}\n`;
    text += `▸ Prefix    : ${prefix}\n`;
    text += `▸ RAM       : ${ramUsed} / ${ramTotal} GB\n`;
    text += `▸ Time      : ${time}\n`;
    text += `▸ User      : ${username}\n\n`;

    for (const [cat, list] of Object.entries(groups)) {
        if (list.length === 0) continue;

        const emoji = emojiForCategory(cat);
        const title = cat.charAt(0).toUpperCase() + cat.slice(1);

        text += `${emoji} *${title}* (${list.length})\n`;

        list.forEach(cmd => {
            const desc = cmd.desc ? ` — ${cmd.desc}` : '';
            text += `  • ${prefix}${cmd.name}${desc}\n`;
        });

        text += '\n';
    }

    text += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `✨ Total: ${cmds.length} commands   |   Prefix: ${prefix}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━`;

    return text;
}

const FALLBACK = `⚠️  Could not generate command list right now.\nPlease try again later.`;

async function helpCommand(sock, chatId, msg) {
    if (!sock || !chatId) {
        console.error("[help] sock or chatId missing");
        return;
    }

    try {
        // Basic info
        const runtime = getUptime();
        const prefix  = settings.prefix || '.';
        const timeNow = new Date().toLocaleTimeString('en-GB', { hour12: false });
        const usedGB  = (process.memoryUsage().rss / 1e9).toFixed(2);
        const totalGB = (os.totalmem() / 1e9).toFixed(2);

        // Try to get better username
        let username = 'Unknown';
        try {
            const jid = msg.key?.participant || msg.key?.remoteJid;
            if (jid?.includes('@s.whatsapp.net')) {
                username = (await sock.getName?.(jid)) || jid.split('@')[0];
            }
        } catch {}

        const commands = loadCommands();

        if (commands.length === 0) {
            await sock.sendMessage(chatId, { text: FALLBACK }, { quoted: msg });
            return;
        }

        const content = buildHelpMessage(commands, {
            runtime,
            mode: settings.commandMode,
            prefix,
            ramUsed: usedGB,
            ramTotal: totalGB,
            time: timeNow,
            username
        });

        // Safe send with splitting
        const MAX = 3800;
        if (content.length <= MAX) {
            await sock.sendMessage(chatId, {
                text: content,
                contextInfo: {
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363398106360290@newsletter',
                        newsletterName: 'ѪЇCКЄЧ',
                        serverMessageId: -1
                    },
                    externalAdReply: {
                        title: `${settings.botName || 'Mickey Glitch'} Commands`,
                        body: `Available Commands: ${commands.length}`,
                        thumbnailUrl: 'https://water-billimg.onrender.com/1761205727440.png',
                        sourceUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26',
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: msg });
            return;
        }

        // split into chunks
        const parts = [];
        let part = '';
        content.split('\n').forEach(line => {
            if (part.length + line.length + 1 > MAX) {
                parts.push(part.trimEnd());
                part = line + '\n';
            } else {
                part += line + '\n';
            }
        });
        if (part.trim()) parts.push(part.trimEnd());

        for (let i = 0; i < parts.length; i++) {
            await sock.sendMessage(chatId, {
                text: parts[i],
                contextInfo: {
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363398106360290@newsletter',
                        newsletterName: 'Mickey From Tanzania',
                        serverMessageId: -1
                    },
                    externalAdReply: {
                        title: `${settings.botName || 'Mickey Glitch'} Commands`,
                        body: `Available Commands: ${commands.length}`,
                        thumbnailUrl: 'https://water-billimg.onrender.com/1761205727440.png',
                        sourceUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26',
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: msg });
            if (i < parts.length - 1) await new Promise(r => setTimeout(r, 700));
        }

    } catch (err) {
        console.error("[help] error:", err);
        await sock.sendMessage(chatId, {
            text: `Error generating help:\n${err.message || '?'}\n\n${FALLBACK}`
        }, { quoted: msg });
    }
}

module.exports = helpCommand;