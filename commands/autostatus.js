const fs = require('fs/promises');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

const CONFIG_FILE = path.join(__dirname, '../data/autoStatus.json');
const DEFAULT_CONFIG = Object.freeze({
    enabled: true,
    viewEnabled: true,
    likeEnabled: true,
});

const EMOJI_REACTIONS = ['❤️', '🔥', '😂', '😱', '👍', '🎉', '😍', '💯', '🙏', '😢', '🤔', '😁'];

let configCache = null;
const processedStatusIds = new Set();

async function loadConfig() {
    if (configCache) return configCache;
    try {
        const data = await fs.readFile(CONFIG_FILE, 'utf8');
        configCache = { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    } catch (err) {
        configCache = { ...DEFAULT_CONFIG };
        await saveConfig(configCache);
    }

    // Backward compatibility: if enabled is not set, derive from features.
    if (typeof configCache.enabled !== 'boolean') {
        configCache.enabled = true;
    }

    return configCache;
}

async function saveConfig(updates) {
    configCache = { ...configCache, ...updates };
    try {
        await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
        await fs.writeFile(CONFIG_FILE, JSON.stringify(configCache, null, 2), 'utf8');
    } catch (err) {
        console.error('[AutoStatus] Save failed:', err.message);
    }
}

function getRandomEmoji() {
    return EMOJI_REACTIONS[Math.floor(Math.random() * EMOJI_REACTIONS.length)];
}

// AUTO VIEW - Sasa ni HARAKA (Immediate)
async function autoView(sock, statusKey) {
    if (!statusKey?.id) return;
    try {
        await sock.readMessages([statusKey]);
    } catch (err) {
        console.error(`[AutoView] Failed:`, err.message);
    }
}

// AUTO LIKE - Sasa ni HARAKA (Immediate)
async function autoLike(sock, statusKey) {
    if (!statusKey?.id || !statusKey?.participant) return;

    const emoji = getRandomEmoji();
    const participantJid = statusKey.participant;

    try {
        await sock.sendMessage('status@broadcast', {
            react: {
                text: emoji,
                key: statusKey
            }
        }, {
            statusJidList: [participantJid]
        });
    } catch (err) {
        console.error(`[AutoLike] Failed:`, err.message || err);
    }
}

async function handleStatusUpdate(sock, ev) {
    const cfg = await loadConfig();
    if (!cfg.enabled) return;

    let statusKey = null;

    if (ev.messages?.[0]?.key?.remoteJid === 'status@broadcast') {
        statusKey = ev.messages[0].key;
    } else if (ev.key?.remoteJid === 'status@broadcast') {
        statusKey = ev.key;
    }

    if (!statusKey?.id || processedStatusIds.has(statusKey.id)) return;
    
    processedStatusIds.add(statusKey.id);

    // Limit memory
    if (processedStatusIds.size > 1500) {
        const arr = Array.from(processedStatusIds);
        processedStatusIds.clear();
        arr.slice(-750).forEach(id => processedStatusIds.add(id));
    }

    const promises = [];
    if (cfg.viewEnabled) promises.push(autoView(sock, statusKey));
    if (cfg.likeEnabled) promises.push(autoLike(sock, statusKey));
    
    await Promise.allSettled(promises);
}

async function autoStatusCommand(sock, chatId, msg, args = []) {
    try {
        const sender = msg.key.participant || msg.key.remoteJid;
        const isAllowed = msg.key.fromMe || (await isOwnerOrSudo(sender, sock, chatId));
        if (!isAllowed) return;

        const sub = (args[0] || '').toLowerCase();
        const option = (args[1] || '').toLowerCase();

        if (sub === 'on') {
            await saveConfig({ enabled: true, viewEnabled: true, likeEnabled: true });
            return sock.sendMessage(chatId, { text: '✅ *Auto Status:* Enabled (view + like).' });
        }

        if (sub === 'off') {
            await saveConfig({ enabled: false });
            return sock.sendMessage(chatId, { text: '❌ *Auto Status:* Disabled.' });
        }

        if (sub === 'view') {
            if (option === 'on' || option === 'off') {
                const enabledValue = option === 'on';
                await saveConfig({ viewEnabled: enabledValue, enabled: enabledValue || (await loadConfig()).likeEnabled });
                return sock.sendMessage(chatId, { text: `✅ *Auto Status View:* ${enabledValue ? 'ON' : 'OFF'}` });
            }
        }

        if (sub === 'like') {
            if (option === 'on' || option === 'off') {
                const enabledValue = option === 'on';
                await saveConfig({ likeEnabled: enabledValue, enabled: enabledValue || (await loadConfig()).viewEnabled });
                return sock.sendMessage(chatId, { text: `✅ *Auto Status Like:* ${enabledValue ? 'ON' : 'OFF'}` });
            }
        }

        const cfg = await loadConfig();
        const overall = cfg.enabled ? 'ON' : 'OFF';
        const view = cfg.viewEnabled ? 'ON' : 'OFF';
        const like = cfg.likeEnabled ? 'ON' : 'OFF';

        return sock.sendMessage(chatId, {
            text: `📊 *Auto Status Settings:*
• Status: ${overall}
• View: ${view}
• Like: ${like}

Use .autostatus on|off|view on|off|like on|off`,
        });

    } catch (err) {
        console.error('[AutoStatus] Command error', err.message);
    }
}

module.exports = {
    autoStatusCommand,
    handleStatusUpdate,
    autoLike,
    autoView
};
