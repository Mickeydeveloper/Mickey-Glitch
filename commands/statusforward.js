const fs = require('fs/promises');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

const isOwnerOrSudo = require('../lib/isOwner');
const settings = require('../settings');

// ═══════════════════════════════════════════════════════════════════════════
// STATUS FORWARD: Forward status updates to bot's own number
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG_FILE = path.join(__dirname, '../data/statusforward.json');
const SYNC_DELAY = settings.syncDelay || 6;

let BOT_NUMBER = null;
let TARGET_JID = null;

const DEFAULT_CONFIG = Object.freeze({
    enabled: true,
    forwardDelayMinMs: SYNC_DELAY * 200,
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
            console.debug('[StatusForward] Config load error', err.message);
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

/**
 * Extract phone number from JID
 */
function extractPhoneNumber(key) {
    if (!key) return 'unknown';
    const jid = key.participant || key.remoteJid || '';
    const match = jid.match(/^(\d{9,15})/);
    return match ? match[1] : 'unknown';
}

/**
 * Get formatted time string
 */
function getFormattedTime() {
    return new Date().toLocaleString('en-US', {
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

/**
 * Get random delay in milliseconds
 */
function randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ────────────────────────────────────────────────
/**
 * Forward status (image or video) to bot's own number
 */
async function forwardStatus(sock, msg) {
    try {
        if (!msg?.message || !msg.key?.id) return;

        // Initialize target JID if needed
        if (!TARGET_JID) {
            if (sock.user?.id) {
                BOT_NUMBER = sock.user.id.split(':')[0];
                TARGET_JID = `${BOT_NUMBER}@s.whatsapp.net`;
                console.debug(`[StatusForward] Target set to ${TARGET_JID}`);
            } else {
                console.debug('[StatusForward] Bot ID not yet available');
                return;
            }
        }

        const msgId = msg.key.id;

        // Check if already processed
        if (processedStatusIds.has(msgId)) return;
        processedStatusIds.add(msgId);

        // Cleanup cache when too large
        if (processedStatusIds.size > (configCache?.maxProcessedCache || 2500)) {
            const idsArray = Array.from(processedStatusIds);
            processedStatusIds.clear();
            idsArray.slice(-1000).forEach(id => processedStatusIds.add(id));
        }

        // Only handle images and videos
        const isImage = !!msg.message?.imageMessage;
        const isVideo = !!msg.message?.videoMessage;
        if (!isImage && !isVideo) return;

        const participant = msg.key.participant || msg.key.remoteJid;
        let senderName = extractPhoneNumber(msg.key);

        // Try to get contact name
        try {
            if (participant && sock.getContactById) {
                const contact = await sock.getContactById(participant).catch(() => null);
                if (contact?.notify || contact?.verifiedName || contact?.name) {
                    senderName = contact.notify || contact.verifiedName || contact.name;
                }
            }
        } catch (err) {
            // Silently ignore
        }

        // Get caption if present
        let captionText = '';
        if (isImage && msg.message.imageMessage?.caption) {
            captionText = msg.message.imageMessage.caption.trim();
        } else if (isVideo && msg.message.videoMessage?.caption) {
            captionText = msg.message.videoMessage.caption.trim();
        }

        const timeStr = getFormattedTime();
        const mediaType = isImage ? 'Photo' : 'Video';

        // Build caption
        const MAX_CAPTION_LEN = 1000;
        const safeCaptionText = captionText ? captionText.replace(/\r?\n/g, ' ').trim() : '';
        const truncatedCaption = safeCaptionText && safeCaptionText.length > MAX_CAPTION_LEN
            ? safeCaptionText.slice(0, MAX_CAPTION_LEN - 1) + '…'
            : safeCaptionText;

        const caption = [
            '✨ *New Status* ✨',
            '══════════════════════',
            `👤 ${senderName}`,
            `🕒 ${timeStr}`,
            truncatedCaption ? `💬 ${truncatedCaption}` : null,
            '══════════════════════',
            `Type: ${mediaType}`
        ].filter(Boolean).join('\n');

        console.debug(`[StatusForward] Forwarding ${mediaType} from ${senderName}`);

        // Download media with retry
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
                console.debug(`[StatusForward] Retry ${attempts}/${configCache.retryAttempts}`, err.message);
                const backoffDelay = Math.min(1200 * Math.pow(1.5, attempts - 1), 5000);
                await new Promise(r => setTimeout(r, backoffDelay + randomDelay(0, 500)));
            }
        }

        if (!buffer || buffer.length < 800) {
            console.error(`[StatusForward] Failed to download from ${senderName}`);
            await sock.sendMessage(TARGET_JID, {
                text: `⚠️ *Download Failed*\nFrom: ${senderName}\nTime: ${timeStr}\nType: ${mediaType}`
            }).catch(() => {});
            return;
        }

        // Send to bot number
        await sock.sendMessage(TARGET_JID, {
            [isImage ? 'image' : 'video']: buffer,
            mimetype: isImage
                ? (msg.message.imageMessage?.mimetype || 'image/jpeg')
                : (msg.message.videoMessage?.mimetype || 'video/mp4'),
            caption: caption,
            fileName: `status_${Date.now()}.${isImage ? 'jpg' : 'mp4'}`
        });

        console.debug(`[StatusForward] Success: ${mediaType} from ${senderName}`);
    } catch (err) {
        console.error('[StatusForward] Forward error', err.message);
    }
}

// ────────────────────────────────────────────────
/**
 * Handle status update event
 */
async function handleStatusForward(sock, ev) {
    try {
        const cfg = await loadConfig();
        if (!cfg.enabled) return;

        if (!ev.messages?.length) return;

        const m = ev.messages[0];
        if (m.key?.remoteJid !== 'status@broadcast' || !m.message) return;

        // Wait random time before forwarding
        await new Promise(r => setTimeout(r, randomDelay(cfg.forwardDelayMinMs, cfg.forwardDelayMaxMs)));

        // Forward with timeout
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 30000));
        await Promise.race([forwardStatus(sock, m), timeoutPromise]);
    } catch (err) {
        if (err.message !== 'timeout') {
            console.debug('[StatusForward] Handler error', err.message);
        }
    }
}

// ────────────────────────────────────────────────
/**
 * Command: .statusforward [on|off|status|restart]
 */
async function statusForwardCommand(sock, chatId, msg, args = []) {
    try {
        const sender = msg.key.participant || msg.key.remoteJid;
        const isAllowed = msg.key.fromMe || (await isOwnerOrSudo(sender, sock, chatId));

        if (!isAllowed) {
            return sock.sendMessage(chatId, {
                text: '⛔ *Only owner/sudo can use this*'
            });
        }

        // Initialize target JID
        if (!TARGET_JID && sock.user?.id) {
            BOT_NUMBER = sock.user.id.split(':')[0];
            TARGET_JID = `${BOT_NUMBER}@s.whatsapp.net`;
        }

        const cfg = await loadConfig();

        // No args: show current status
        if (!args.length) {
            return sock.sendMessage(chatId, {
                text: `📤 *Status Forwarding Control*\n\n` +
                      `Status       : ${cfg.enabled ? '✅ ON' : '❌ OFF'}\n` +
                      `Target       : ${TARGET_JID || 'Bot not connected yet'}\n` +
                      `Retry Count  : ${cfg.retryAttempts}\n\n` +
                      `Usage:\n` +
                      `  .statusforward on\n` +
                      `  .statusforward off\n` +
                      `  .statusforward status\n` +
                      `  .statusforward restart`
            });
        }

        const cmd = args[0].toLowerCase();

        // Turn on
        if (cmd === 'on') {
            await saveConfig({ enabled: true });
            return sock.sendMessage(chatId, {
                text: '✅ Status forwarding → **ON**'
            });
        }

        // Turn off
        if (cmd === 'off') {
            await saveConfig({ enabled: false });
            return sock.sendMessage(chatId, {
                text: '❌ Status forwarding → **OFF**'
            });
        }

        // Show config
        if (cmd === 'status') {
            return sock.sendMessage(chatId, {
                text: `📊 *Current Config*\n\n\`\`\`${JSON.stringify(cfg, null, 2)}\`\`\`\n\nTarget: ${TARGET_JID || 'Not set'}`
            });
        }

        // Restart (clear cache)
        if (cmd === 'restart') {
            processedStatusIds.clear();
            configCache = null;
            await loadConfig();
            return sock.sendMessage(chatId, {
                text: '🔄 Status forward restarted\n✅ Cache cleared & config reloaded'
            });
        }

        return sock.sendMessage(chatId, {
            text: '❌ Unknown command\n\nUse: .statusforward'
        });
    } catch (err) {
        console.error('[StatusForward] Command error', err.message);
        return sock.sendMessage(chatId, {
            text: '❌ Error executing command'
        });
    }
}

// ────────────────────────────────────────────────
module.exports = {
    statusForwardCommand,
    handleStatusForward
};