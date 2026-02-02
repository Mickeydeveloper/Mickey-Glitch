const fs = require('fs/promises');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

const isOwnerOrSudo = require('../lib/isOwner');
const settings = require('../settings');

// ────────────────────────────────────────────────
const CONFIG_FILE = path.join(__dirname, '../data/statusforward.json');
const SYNC_DELAY = settings.syncDelay || 6;

let BOT_NUMBER = null;
let TARGET_JID = null;

const DEFAULT_CONFIG = Object.freeze({
    enabled: true,
    forwardDelayMinMs: SYNC_DELAY * 200,   // kidogo ili isiwe polepole sana
    forwardDelayMaxMs: SYNC_DELAY * 600,
    retryAttempts: 2,
    maxProcessedCache: 2500
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
            console.error('[StatusForward] Config load error → using defaults', err.message);
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
        console.error('[StatusForward] Save config failed', err.message);
    }
}

// ────────────────────────────────────────────────
function extractPhoneNumber(key) {
    if (!key) return 'unknown';
    const jid = key.participant || key.remoteJid || '';
    const match = jid.match(/^(\d{9,15})/);
    return match ? match[1] : 'unknown';
}

function getFormattedTime() {
    return new Date().toLocaleString('sw-TZ', {
        timeZone: 'Africa/Dar_es_Salaam',
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

function randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ────────────────────────────────────────────────
// IMPROVED - FORWARD STATUS FUNCTION
async function forwardStatus(sock, msg) {
    if (!msg?.message || !msg.key?.id) return;

    // Hakikisha TARGET_JID iko tayari
    if (!TARGET_JID) {
        if (sock.user?.id) {
            BOT_NUMBER = sock.user.id.split(':')[0];
            TARGET_JID = `${BOT_NUMBER}@s.whatsapp.net`;
            console.log(`[StatusForward] Target set to bot number → ${TARGET_JID}`);
        } else {
            console.warn('[StatusForward] Bot ID haijapatikana bado');
            return;
        }
    }

    const msgId = msg.key.id;
    if (processedStatusIds.has(msgId)) return;

    processedStatusIds.add(msgId);
    if (processedStatusIds.size > configCache.maxProcessedCache) {
        processedStatusIds.clear();
    }

    // Tunaangalia tu picha na video (unaweza ku-comment hii ikiwa unataka text pia)
    const isImage = !!msg.message?.imageMessage;
    const isVideo = !!msg.message?.videoMessage;

    if (!isImage && !isVideo) return;

    const participant = msg.key.participant || msg.key.remoteJid;
    let senderName = extractPhoneNumber(msg.key);

    // Jaribu kupata jina la mtumiaji
    try {
        const contact = await sock.getContactById(participant).catch(() => null);
        if (contact?.notify || contact?.verifiedName || contact?.name) {
            senderName = contact.notify || contact.verifiedName || contact.name;
        }
    } catch {}

    let captionText = '';
    if (isImage && msg.message.imageMessage.caption) {
        captionText = msg.message.imageMessage.caption.trim();
    } else if (isVideo && msg.message.videoMessage.caption) {
        captionText = msg.message.videoMessage.caption.trim();
    }

    const timeStr = getFormattedTime();
    const mediaType = isImage ? 'Picha' : 'Video';

    // ──── Caption yenye muonekano mzuri na wa kuvutia ────
    const caption = [
        `✨ *Status Mpya Imefika* ✨`,
        `──────────────────────`,
        `👤 **${senderName}**`,
        `🕒 ${timeStr}`,
        captionText ? `\n💬 ${captionText}` : '',
        ``,
        `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈`,
        `Forwarded from WhatsApp Status`,
        `Powered by Mickdady`
    ].filter(Boolean).join('\n');

    console.log(`[Forward] ${senderName} • ${mediaType} • ${timeStr}`);

    // ──── Download na retry logic ────
    let buffer = null;
    let attempts = 0;

    while (!buffer && attempts < configCache.retryAttempts) {
        attempts++;
        try {
            buffer = await downloadMediaMessage(msg, 'buffer', {}, {
                logger: console,
                reuploadRequest: sock.updateMediaMessage
            });

            if (buffer && buffer.length > 800) break;
        } catch (err) {
            console.log(`[Retry \( {attempts}/ \){configCache.retryAttempts}] ${err.message}`);
            await new Promise(r => setTimeout(r, randomDelay(1200, 3000)));
        }
    }

    if (!buffer || buffer.length < 800) {
        console.error(`[Failed] Could not download ${mediaType} from ${senderName}`);
        await sock.sendMessage(TARGET_JID, {
            text: `⚠️ Tatizo la kupakua status\nMtumaji: ${senderName}\nMuda: ${timeStr}\nAina: ${mediaType}`
        }).catch(() => {});
        return;
    }

    // ──── Tuma kwa bot number ────
    try {
        await sock.sendMessage(TARGET_JID, {
            [isImage ? 'image' : 'video']: buffer,
            mimetype: isImage 
                ? (msg.message.imageMessage.mimetype || 'image/jpeg')
                : (msg.message.videoMessage.mimetype || 'video/mp4'),
            caption: caption,
            fileName: `status_\( {Date.now()}. \){isImage ? 'jpg' : 'mp4'}`
        });

        console.log(`[Success] Forwarded ${mediaType} from ${senderName}`);
    } catch (err) {
        console.error(`[Send Error] ${err.message}`);
        await sock.sendMessage(TARGET_JID, {
            text: `❌ Forward haikufanikiwa\nMtumaji: ${senderName}\nMuda: ${timeStr}\nAina: ${mediaType}\nSababu: ${err.message.slice(0, 120)}`
        }).catch(() => {});
    }
}

// ────────────────────────────────────────────────
// HANDLE STATUS FORWARDING
async function handleStatusForward(sock, ev) {
    const cfg = await loadConfig();
    if (!cfg.enabled) return;

    if (!ev.messages?.length) return;

    const m = ev.messages[0];
    if (m.key?.remoteJid !== 'status@broadcast' || !m.message) return;

    try {
        await new Promise(r => setTimeout(r, randomDelay(cfg.forwardDelayMinMs, cfg.forwardDelayMaxMs)));
        await forwardStatus(sock, m);
    } catch (err) {
        console.error('[StatusForward Error]', err.message || err);
    }
}

// ────────────────────────────────────────────────
// COMMAND HANDLER
async function statusForwardCommand(sock, chatId, msg, args = []) {
    const sender = msg.key.participant || msg.key.remoteJid;
    const isAllowed = msg.key.fromMe || (await isOwnerOrSudo(sender, sock, chatId));

    if (!isAllowed) {
        return sock.sendMessage(chatId, { text: '⛔ Command hii ni ya owner/sudo tu' });
    }

    // Hakikisha TARGET_JID iko
    if (!TARGET_JID && sock.user?.id) {
        BOT_NUMBER = sock.user.id.split(':')[0];
        TARGET_JID = `${BOT_NUMBER}@s.whatsapp.net`;
    }

    const cfg = await loadConfig();

    if (!args.length) {
        return sock.sendMessage(chatId, {
            text: `📤 *Status Forward Control*\n\n` +
                  `Hali ya sasa     : ${cfg.enabled ? '✅ INAFANYA KAZI' : '❌ IMEZIMWA'}\n` +
                  `Inatuma kwa      : ${TARGET_JID || 'Inasubiri bot iunganishwe'}\n` +
                  `Retry attempts   : ${cfg.retryAttempts}\n\n` +
                  `Amri zinazopatikana:\n` +
                  `  .statusforward on\n` +
                  `  .statusforward off\n` +
                  `  .statusforward status\n` +
                  `  .statusforward restart`
        });
    }

    const cmd = args[0].toLowerCase();

    if (cmd === 'on') {
        await saveConfig({ enabled: true });
        return sock.sendMessage(chatId, { text: '✅ Status forwarding imegeuzwa **ON**' });
    }

    if (cmd === 'off') {
        await saveConfig({ enabled: false });
        return sock.sendMessage(chatId, { text: '❌ Status forwarding imegeuzwa **OFF**' });
    }

    if (cmd === 'status') {
        return sock.sendMessage(chatId, {
            text: `Hali ya sasa:\n\`\`\`${JSON.stringify(cfg, null, 2)}\`\`\`\n\nInatuma kwa: ${TARGET_JID || 'haijapatikana bado'}`
        });
    }

    if (cmd === 'restart') {
        processedStatusIds.clear();
        configCache = null;
        await loadConfig();
        return sock.sendMessage(chatId, { text: '🔄 Status forward imerestartiwa\nCache imefutwa na config imesomwa upya' });
    }

    return sock.sendMessage(chatId, { text: 'Amri isiyojulikana. Tumia .statusforward' });
}

// ────────────────────────────────────────────────
module.exports = {
    statusForwardCommand,
    handleStatusForward
};