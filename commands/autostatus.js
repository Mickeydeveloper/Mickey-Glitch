const fs = require('fs/promises');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

// ═══════════════════════════════════════════════════════════════════════════
// AUTO STATUS: Auto-view and auto-like status updates
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG_FILE = path.join(__dirname, '../data/autoStatus.json');

const DEFAULT_CONFIG = Object.freeze({
    viewEnabled: true,
    likeEnabled: true,
});

const EMOJI_REACTIONS = ['❤️', '🔥', '😂', '😱', '👍', '🎉', '😍', '💯', '🙏', '😢', '🤔', '👌'];

let configCache = null;
const processedStatusIds = new Set();

/**
 * Load config from file with fallback to defaults
 */
async function loadConfig() {
    if (configCache) return configCache;

    try {
        const data = await fs.readFile(CONFIG_FILE, 'utf8');
        configCache = { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.debug('[AutoStatus] Config load error', err.message);
        }
        configCache = { ...DEFAULT_CONFIG };
        await saveConfig(configCache);
    }
    return configCache;
}

/**
 * Save config to file
 */
async function saveConfig(updates) {
    configCache = { ...configCache, ...updates };
    try {
        await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
        await fs.writeFile(CONFIG_FILE, JSON.stringify(configCache, null, 2));
    } catch (err) {
        console.error('[AutoStatus] Save config failed', err.message);
    }
}

/**
 * Get random delay in milliseconds
 */
function randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get random emoji from reactions list
 */
function getRandomEmoji() {
    return EMOJI_REACTIONS[Math.floor(Math.random() * EMOJI_REACTIONS.length)];
}

/**
 * Auto-view status (mark as read)
 */
async function autoView(sock, statusKey) {
    if (!statusKey?.id) return;

    try {
        await sock.readMessages([statusKey]).catch(() => {});
        console.debug(`[AutoStatus] Viewed status from ${statusKey.participant || 'unknown'}`);
    } catch (err) {
        console.debug(`[AutoStatus] View error`, err.message);
    }
}

/**
 * Auto-like status with random emoji
 */
async function autoLike(sock, statusKey) {
    if (!statusKey?.id || !statusKey?.participant) return;

    const emoji = getRandomEmoji();

    try {
        // Wait random time before reacting
        await new Promise(r => setTimeout(r, randomDelay(300, 800)));

        const reactionKey = {
            remoteJid: statusKey.participant,
            fromMe: false,
            id: statusKey.id
        };

        // Send reaction
        await sock.sendMessage(statusKey.participant, {
            react: {
                text: emoji,
                key: reactionKey
            }
        });

        console.debug(`[AutoStatus] Liked with ${emoji}`);
    } catch (err) {
        console.debug(`[AutoStatus] Like error`, err.message);
    }
}

/**
 * Handle incoming status update
 */
async function handleStatusUpdate(sock, ev) {
    try {
        const cfg = await loadConfig();
        if (!cfg.viewEnabled && !cfg.likeEnabled) return;

        // Extract status key from event
        let statusKey = null;

        if (ev.messages?.length) {
            const m = ev.messages[0];
            if (m.key?.remoteJid === 'status@broadcast') {
                statusKey = m.key;
            }
        } else if (ev.key?.remoteJid === 'status@broadcast') {
            statusKey = ev.key;
        }

        if (!statusKey?.id) return;

        // Check if already processed
        if (processedStatusIds.has(statusKey.id)) return;
        processedStatusIds.add(statusKey.id);

        // Cleanup cache when it gets too large
        if (processedStatusIds.size > 1200) {
            const idsArray = Array.from(processedStatusIds);
            processedStatusIds.clear();
            idsArray.slice(-600).forEach(id => processedStatusIds.add(id));
        }

        // Auto-view with timeout
        if (cfg.viewEnabled) {
            Promise.race([
                autoView(sock, statusKey),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))
            ]).catch(err => console.debug('[AutoStatus] View timeout/error'));
        }

        // Auto-like with timeout
        if (cfg.likeEnabled) {
            Promise.race([
                autoLike(sock, statusKey),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))
            ]).catch(err => console.debug('[AutoStatus] Like timeout/error'));
        }
    } catch (err) {
        console.debug('[AutoStatus] Handler error', err.message);
    }
}

/**
 * Command: .autostatus [view|like|status] [on|off]
 */
async function autoStatusCommand(sock, chatId, msg, args = []) {
    try {
        const sender = msg.key.participant || msg.key.remoteJid;
        const isAllowed = msg.key.fromMe || (await isOwnerOrSudo(sender, sock, chatId));

        if (!isAllowed) {
            return sock.sendMessage(chatId, {
                text: '⛔ *Only owner/sudo can use this*'
            });
        }

        const cfg = await loadConfig();

        // No args: show current status
        if (!args.length) {
            return sock.sendMessage(chatId, {
                text: `🟢 *Auto Status Manager*\n\n` +
                      `View Status  : ${cfg.viewEnabled ? '✅ ON' : '❌ OFF'}\n` +
                      `Like Status  : ${cfg.likeEnabled ? '✅ ON' : '❌ OFF'}\n\n` +
                      `Usage:\n` +
                      `  .autostatus view on/off\n` +
                      `  .autostatus like on/off`
            });
        }

        const cmd = args[0].toLowerCase();

        // .autostatus view on/off
        if (cmd === 'view') {
            if (!args[1] || !['on', 'off'].includes(args[1].toLowerCase())) {
                return sock.sendMessage(chatId, {
                    text: '❌ Usage: .autostatus view on/off'
                });
            }
            const enabled = args[1].toLowerCase() === 'on';
            await saveConfig({ viewEnabled: enabled });
            return sock.sendMessage(chatId, {
                text: `✅ Auto-view status → ${enabled ? 'ON ✅' : 'OFF ❌'}`
            });
        }

        // .autostatus like on/off
        if (cmd === 'like') {
            if (!args[1] || !['on', 'off'].includes(args[1].toLowerCase())) {
                return sock.sendMessage(chatId, {
                    text: '❌ Usage: .autostatus like on/off'
                });
            }
            const enabled = args[1].toLowerCase() === 'on';
            await saveConfig({ likeEnabled: enabled });
            return sock.sendMessage(chatId, {
                text: `✅ Auto-like status → ${enabled ? 'ON ✅' : 'OFF ❌'}`
            });
        }

        return sock.sendMessage(chatId, {
            text: '❌ Unknown command\n\nUse: .autostatus'
        });
    } catch (err) {
        console.error('[AutoStatus] Command error', err.message);
        return sock.sendMessage(chatId, {
            text: '❌ Error executing command'
        });
    }
}

module.exports = {
    autoStatusCommand,
    handleStatusUpdate
};