const fs = require('fs/promises');
const path = require('path');

const isOwnerOrSudo = require('../lib/isOwner');

// ────────────────────────────────────────────────
const CONFIG_FILE = path.join(__dirname, '../data/autoStatus.json');

const DEFAULT_CONFIG = Object.freeze({
    viewEnabled: true,      // Auto view/read status
    likeEnabled: true,      // Auto like/react with random emoji
});

const EMOJI_REACTIONS = ['❤️', '🔥', '😂', '😱', '👍', '🎉', '😍', '💯', '🙏', '😢', '🤔', '👌'];

let configCache = null;
const processedStatusIds = new Set();

// ────────────────────────────────────────────────
async function loadConfig() {
    if (configCache) return configCache;

    try {
        const data = await fs.readFile(CONFIG_FILE, 'utf8');
        configCache = { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.error('[AutoStatus] Config load error → defaults', err.message);
        }
        configCache = { ...DEFAULT_CONFIG };
        await saveConfig(configCache);
    }
    return configCache;
}

async function saveConfig(updates) {
    configCache = { ...configCache, ...updates };
    try {
        await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
        await fs.writeFile(CONFIG_FILE, JSON.stringify(configCache, null, 2));
    } catch (err) {
        console.error('[AutoStatus] Save failed', err.message);
    }
}
// ────────────────────────────────────────────────
function randomMs(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomEmoji() {
    return EMOJI_REACTIONS[Math.floor(Math.random() * EMOJI_REACTIONS.length)];
}

// ────────────────────────────────────────────────
// Function 1: AUTO VIEW - Mark status as read
async function autoView(sock, statusKey) {
    if (!statusKey?.id) return;

    try {
        await sock.readMessages([statusKey]).catch(() => {});
        console.log(`✅ [AutoStatus] Viewed status`);
    } catch (err) {
        console.debug(`[AutoView] Error:`, err.message);
    }
}

// ────────────────────────────────────────────────
// Function 2: AUTO LIKE - React with random emoji
async function autoLike(sock, statusKey) {
    if (!statusKey?.id || !statusKey?.participant) return;

    const emoji = getRandomEmoji();
    
    try {
        await new Promise(r => setTimeout(r, randomMs(300, 800)));
        
        // Correct reaction format for Baileys
        const reaction = {
            key: {
                remoteJid: 'status@broadcast',
                fromMe: false,
                id: statusKey.id,
                participant: statusKey.participant
            },
            text: emoji
        };

        // Try primary method first
        try {
            await sock.sendMessage('status@broadcast', { react: reaction });
            console.log(`❤️ [AutoStatus] Liked with ${emoji}`);
        } catch (primaryErr) {
            // Fallback: use relayMessage if sendMessage fails
            const reactionMsg = {
                reactionMessage: {
                    key: reaction.key,
                    text: emoji
                }
            };
            await sock.relayMessage('status@broadcast', reactionMsg, { messageId: statusKey.id });
            console.log(`❤️ [AutoStatus] Liked (relay) with ${emoji}`);
        }
    } catch (err) {
        console.debug(`[AutoLike] Failed to react:`, err.message);
    }
}

// ────────────────────────────────────────────────
// Handle status events
async function handleStatusUpdate(sock, ev) {
    const cfg = await loadConfig();
    
    let statusKey = null;

    // Event shape normalization
    if (ev.messages?.length) {
        const m = ev.messages[0];
        if (m.key?.remoteJid === 'status@broadcast') {
            statusKey = m.key;
        }
    } else if (ev.key?.remoteJid === 'status@broadcast') {
        statusKey = ev.key;
    }

    if (!statusKey?.id) return;

    // Deduplicate
    if (processedStatusIds.has(statusKey.id)) return;
    processedStatusIds.add(statusKey.id);
    if (processedStatusIds.size > 1200) {
        // Keep only recent 600 IDs instead of clearing all
        const idsArray = Array.from(processedStatusIds);
        processedStatusIds.clear();
        idsArray.slice(-600).forEach(id => processedStatusIds.add(id));
    }

    // Auto View with timeout
    if (cfg.viewEnabled) {
        try {
            const viewTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('View timeout')), 15000));
            await Promise.race([autoView(sock, statusKey), viewTimeout]);
        } catch (err) {
            console.debug(`[AutoView] Timeout or error:`, err.message);
        }
    }

    // Auto Like with timeout
    if (cfg.likeEnabled) {
        try {
            const likeTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Like timeout')), 15000));
            await Promise.race([autoLike(sock, statusKey), likeTimeout]);
        } catch (err) {
            console.debug(`[AutoLike] Timeout or error:`, err.message);
        }
    }
}

// ────────────────────────────────────────────────
// COMMAND HANDLER
async function autoStatusCommand(sock, chatId, msg, args = []) {
    const sender = msg.key.participant || msg.key.remoteJid;
    const isAllowed = msg.key.fromMe || (await isOwnerOrSudo(sender, sock, chatId));

    if (!isAllowed) {
        return sock.sendMessage(chatId, { text: '⛔ Owner/sudo only' });
    }

    const cfg = await loadConfig();

    if (!args.length) {
        return sock.sendMessage(chatId, {
            text: `🟢 *Auto Status Manager* (All ON by default)\n\n` +
                  `View Status  : ${cfg.viewEnabled ? '✅ ON' : '❌ OFF'}\n` +
                  `Like Status  : ${cfg.likeEnabled ? '✅ ON' : '❌ OFF'}\n\n` +
                  `Commands:\n` +
                  `  .autostatus view on/off\n` +
                  `  .autostatus like on/off\n` +
                  `  .autostatus status`
        });
    }

    const cmd = args[0].toLowerCase();

    if (cmd === 'view') {
        if (!args[1] || !['on', 'off'].includes(args[1].toLowerCase())) {
            return sock.sendMessage(chatId, { text: 'Usage: .autostatus view on/off' });
        }
        const value = args[1].toLowerCase() === 'on';
        await saveConfig({ viewEnabled: value });
        return sock.sendMessage(chatId, { text: `Auto view status → ${value ? '✅ ON' : '❌ OFF'}` });
    }

    if (cmd === 'like') {
        if (!args[1] || !['on', 'off'].includes(args[1].toLowerCase())) {
            return sock.sendMessage(chatId, { text: 'Usage: .autostatus like on/off' });
        }
        const value = args[1].toLowerCase() === 'on';
        await saveConfig({ likeEnabled: value });
        return sock.sendMessage(chatId, { text: `Auto like status → ${value ? '✅ ON (random emoji)' : '❌ OFF'}` });
    }

    if (cmd === 'status') {
        return sock.sendMessage(chatId, {
            text: `Current config:\n\`\`\`${JSON.stringify(cfg, null, 2)}\`\`\``
        });
    }

    return sock.sendMessage(chatId, { text: 'Unknown subcommand. Try .autostatus' });
}

module.exports = {
    autoStatusCommand,
    handleStatusUpdate
};