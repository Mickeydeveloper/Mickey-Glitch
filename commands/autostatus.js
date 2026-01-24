const fs = require('fs/promises');
const path = require('path');

const settings = require('../settings');

// ────────────────────────────────────────────────
const CONFIG_FILE = path.join(__dirname, '../data/autoStatus.json');
const SYNC_DELAY = settings.syncDelay || 2;

const LIKE_EMOJIS = ['❤️', '🔥', '😍', '👏', '😂', '💯', '✨', '🙌'];
const processedStatusIds = new Set();

// DEFAULT CONFIG - ALL FEATURES ON
const DEFAULT_CONFIG = {
    enabled: true,
    autoView: true,      // Auto view status
    autoLike: true,      // Auto like with emoji
};

let configCache = null;

// ────────────────────────────────────────────────
// LOAD CONFIG
// ────────────────────────────────────────────────
async function loadConfig() {
    if (configCache) return configCache;

    try {
        const data = await fs.readFile(CONFIG_FILE, 'utf8');
        configCache = { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.debug('[AutoStatus] Config load error, using defaults', err.message);
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
// FUNCTION 1: AUTO VIEW STATUS
// ────────────────────────────────────────────────
async function autoViewStatus(sock, msg) {
    const cfg = await loadConfig();
    if (!cfg.enabled || !cfg.autoView) return;

    try {
        if (!msg?.key || msg.key.remoteJid !== 'status@broadcast') return;

        const statusKey = msg.key;

        if (!statusKey?.id) return;

        // Prevent duplicate processing
        if (processedStatusIds.has(statusKey.id)) return;
        processedStatusIds.add(statusKey.id);
        if (processedStatusIds.size > 2000) processedStatusIds.clear();

        // Mark status as read immediately (view)
        try {
            await sock.readMessages([statusKey]);
            console.log(`[AutoViewStatus] ✓ Status viewed`);
        } catch (err) {
            console.debug(`[AutoViewStatus] View failed:`, err.message);
        }

    } catch (err) {
        console.error('[AutoViewStatus] Error:', err.message);
    }
}

// ────────────────────────────────────────────────
// FUNCTION 2: AUTO STATUS LIKE
// ────────────────────────────────────────────────
async function autoStatusLike(sock, msg) {
    const cfg = await loadConfig();
    if (!cfg.enabled || !cfg.autoLike) return;

    try {
        if (!msg?.key || msg.key.remoteJid !== 'status@broadcast') return;
        
        const statusKey = msg.key;
        const participant = msg.key.participant;

        if (!statusKey?.id || !participant) return;

        // Random delay to avoid detection
        const randomDelay = Math.floor(Math.random() * (SYNC_DELAY * 1000)) + (SYNC_DELAY * 200);
        await new Promise(r => setTimeout(r, randomDelay));

        // Select random emoji from multiple like options
        const likeEmoji = LIKE_EMOJIS[Math.floor(Math.random() * LIKE_EMOJIS.length)];

        try {
            // Send reaction using sendMessage
            await sock.sendMessage('status@broadcast', {
                react: {
                    key: statusKey,
                    text: likeEmoji,
                    isBigEmoji: true
                }
            });
            console.log(`[AutoStatusLike] ✓ Reacted with ${likeEmoji}`);
        } catch (err) {
            console.debug(`[AutoStatusLike] sendMessage failed, trying proto:`, err.message);
            
            // Alternative method using proto
            try {
                const { proto } = require('@whiskeysockets/baileys');
                const reactionMsg = proto.Message.reactionMessage.encode({
                    key: statusKey,
                    text: likeEmoji,
                    isBigEmoji: true
                });
                await sock.sendMessage('status@broadcast', { reactionMessage: reactionMsg });
                console.log(`[AutoStatusLike] ✓ (Proto) Liked with ${likeEmoji}`);
            } catch (protoErr) {
                console.debug(`[AutoStatusLike] Proto failed:`, protoErr.message);
            }
        }

    } catch (err) {
        console.error('[AutoStatusLike] Error:', err.message);
    }
}

// ────────────────────────────────────────────────
// MAIN HANDLER - Combines view and like
// ────────────────────────────────────────────────
async function handleStatusUpdate(sock, ev) {
    try {
        // Extract message from event
        let statusMsg = null;

        if (ev.messages?.length) {
            const m = ev.messages[0];
            if (m.key?.remoteJid === 'status@broadcast') {
                statusMsg = m;
            }
        } else if (ev.key?.remoteJid === 'status@broadcast' && ev.message) {
            statusMsg = ev;
        }

        if (!statusMsg) return;

        // Run both functions in parallel
        await Promise.all([
            autoViewStatus(sock, statusMsg).catch(err => console.debug('[AutoViewStatus]', err.message)),
            autoStatusLike(sock, statusMsg).catch(err => console.debug('[AutoStatusLike]', err.message))
        ]);

    } catch (err) {
        console.error('[StatusHandler] Error:', err.message);
    }
}

module.exports = {
    autoViewStatus,
    autoStatusLike,
    handleStatusUpdate
};