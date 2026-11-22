// commands/notif.js
const { randomUUID } = require('node:crypto');
const sharp = require('sharp');
const settings = require('../settings');

const THUMBNAIL_URL = 'https://cdn.ornzora.eu.cc/4d4f3591-1c3e-4e1b-b1c2-45faeb91b781-FIORA.jpg';
const MAX_THUMBNAIL_BYTES = 2 * 1024 * 1024;
const MAX_EVENT_TITLE_LENGTH = 256;
const MAX_EVENT_INVITES = 3;
const EVENT_DELAY_MS = 500;

async function getEventThumbnail() {
    const response = await fetch(THUMBNAIL_URL, {
        signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`Thumbnail download failed: HTTP ${response.status}`);

    const contentLength = Number(response.headers.get('content-length'));
    if (contentLength > MAX_THUMBNAIL_BYTES) {
        throw new Error('Event thumbnail is larger than 2 MB');
    }

    const image = Buffer.from(await response.arrayBuffer());
    if (image.length > MAX_THUMBNAIL_BYTES) {
        throw new Error('Event thumbnail is larger than 2 MB');
    }

    const thumbnail = await sharp(image, { limitInputPixels: 16000000 })
        .rotate()
        .resize({ width: 320, height: 320, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

    if (!thumbnail.length || thumbnail.length > MAX_THUMBNAIL_BYTES) {
        throw new Error('Converted event thumbnail is invalid');
    }
    return thumbnail;
}

async function sendEventInvite(sock, chatId, title, thumbnail, startTime) {
    await sock.relayMessage(chatId, {
        eventInviteMessage: {
            eventId: randomUUID(),
            eventTitle: title.slice(0, MAX_EVENT_TITLE_LENGTH),
            jpegThumbnail: thumbnail,
            startTime
        }
    }, {
        additionalNodes: [{
            tag: 'meta',
            attrs: { context_source: 'event_invitation' }
        }]
    });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
const getBotName = () => {
    return settings.botName || settings.botname || global.botName || 'Mickey Glitch';
};

const getPrefix = () => {
    if (Array.isArray(settings.prefix)) return settings.prefix[0];
    if (typeof settings.prefix === 'string') return settings.prefix.split('')[0];
    return '.';
};

function parseNotifUserArgs(text) {
    const parts = text.split('|').map(v => v.trim());
    let targetPart = '';
    let eventName = 'Woi';
    let count = 1;

    if (parts.length >= 3) {
        targetPart = parts[0];
        eventName = parts[1] || 'Woi';
        const n = parseInt(parts[2]);
        if (!isNaN(n) && n > 0) count = n;
    } else if (parts.length === 2) {
        if (/^\d+$/.test(parts[1])) {
            count = parseInt(parts[1]);
            const numMatch = parts[0].match(/^(\+?\d{8,16})\s+([\s\S]+)$/);
            if (numMatch) {
                targetPart = numMatch[1];
                eventName = numMatch[2].trim();
            } else {
                targetPart = parts[0];
                eventName = parts[0].replace(/@\S+/g, '').trim() || 'Woi';
            }
        } else {
            targetPart = parts[0];
            eventName = parts[1] || 'Woi';
        }
    } else {
        const numMatch = parts[0].match(/^(\+?\d{8,16})\s+([\s\S]+)$/);
        if (numMatch) {
            targetPart = numMatch[1];
            eventName = numMatch[2].trim();
        } else {
            targetPart = parts[0];
            eventName = parts[0].replace(/@\S+/g, '').trim() || 'Woi';
        }
    }

    if (count === 1) {
        const tail = eventName.match(/^(.+?)\s+(\d+)$/);
        if (tail) {
            eventName = tail[1].trim();
            count = parseInt(tail[2]);
        }
    }

    return { targetPart, eventName, count };
}

function normalizeEventTarget(target) {
    const value = String(target || '').trim();
    if (/^\d{8,16}$/.test(value)) return `${value}@s.whatsapp.net`;
    if (/^[^@\s]+@(s\.whatsapp\.net|g\.us|lid)$/.test(value)) return value;
    return null;
}

function validateEventCount(count) {
    if (!Number.isInteger(count) || count < 1 || count > MAX_EVENT_INVITES) {
        throw new Error(`Idadi ya event invite lazima iwe kati ya 1 na ${MAX_EVENT_INVITES}.`);
    }
}

function parseNotifArgs(text) {
    const trimmed = text.trim();
    let eventName = trimmed;
    let count = 1;

    if (trimmed.includes('|')) {
        const parts = trimmed.split('|').map(v => v.trim());
        eventName = parts[0] || 'Woi';
        const n = parseInt(parts[1]);
        if (!isNaN(n) && n > 0) count = n;
    } else {
        const match = trimmed.match(/^(.+?)\s+(\d+)$/);
        if (match) {
            eventName = match[1].trim();
            count = parseInt(match[2]);
        }
    }

    return { eventName, count };
}

// ═══════════════════════════════════════════════════════════
// MAIN COMMAND
// ═══════════════════════════════════════════════════════════
const notifCommand = async (sock, chatId, message, args = [], command = 'notif') => {
    const botName = getBotName();
    const prefix = getPrefix();
    const text = (args || []).join(' ').trim();
    const isNotifUser = command === 'notifuser';

    if (!text) {
        const usage = isNotifUser
            ? `📢 *NOTIF USER — Event Invitation*\n` +
              `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `*Matumizi:*\n` +
              `• \`${prefix}${command} @user|woi\`\n` +
              `• \`${prefix}${command} @user1 @user2|woi|3\`\n` +
              `• \`${prefix}${command} 62858xxx|woi|3\`\n` +
              `• \`${prefix}${command} 62858xxx Gw jago 2\`\n\n` +
              `*Maelezo:*\n` +
              `• Target: @mention au namba (628xxx)\n` +
              `• Jina la event: maandishi yoyote\n` +
              `• Idadi: 1-${MAX_EVENT_INVITES} (default 1)\n\n` +
              `_${botName}™_`
            : `📢 *NOTIF — Event Invitation*\n` +
              `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `*Matumizi:*\n` +
              `• \`${prefix}${command} woi\`\n` +
              `• \`${prefix}${command} Mickey 3\`\n` +
              `• \`${prefix}${command} Mickey|3\`\n\n` +
              `*Maelezo:*\n` +
              `• Tuma event invitation halisi kwa chat/group hii\n` +
              `• Idadi: 1-${MAX_EVENT_INVITES} (default 1)\n\n` +
              `_${botName}™_`;

        try {
            await sock.sendMessage(chatId, { text: usage }, { quoted: message });
        } catch (e) {
            console.error('[Notif] Usage send failed:', e.message);
        }
        return;
    }

    try {
        await sock.sendMessage(chatId, { react: { text: '⌛', key: message.key } });
    } catch {}

    try {
        const startTime = Math.floor(Date.now() / 1000);
        // ─── NOTIFUSER MODE ────────────────────────────────
        if (isNotifUser) {
            const { targetPart, eventName, count } = parseNotifUserArgs(text);
            validateEventCount(count);

            let rawTargets = sock.parseMention?.(targetPart) || [];

            if (rawTargets.length === 0) {
                const numbers = targetPart.match(/\d{8,16}/g) || [];
                for (const num of numbers) {
                    rawTargets.push(`${num}@s.whatsapp.net`);
                }
            }

            if (rawTargets.length === 0) {
                throw new Error('Target tidak valid! Gunakan @mention atau nomor (628xxx).');
            }

            const targets = [...new Set(rawTargets.map(normalizeEventTarget).filter(Boolean))];
            if (targets.length === 0) {
                throw new Error('Target tidak valid! Gunakan @mention atau nomor (628xxx).');
            }

            const jpegThumbnail = await getEventThumbnail();
            let sent = 0;

            for (const target of targets) {
                for (let i = 0; i < count; i++) {
                    await sendEventInvite(sock, target, eventName, jpegThumbnail, startTime);
                    sent++;
                    if (i < count - 1) await sleep(EVENT_DELAY_MS);
                }
            }

            try {
                await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
                await sock.sendMessage(chatId, {
                    text: `✅ Event ${sent} zimetumwa kwa ${targets.length} target.\n📌 Jina: ${eventName}`
                }, { quoted: message });
            } catch {}
            return;
        }

        // ─── NOTIF MODE (current chat) ─────────────────────
        const { eventName, count } = parseNotifArgs(text);
        validateEventCount(count);
        const jpegThumbnail = await getEventThumbnail();

        let sent = 0;
        for (let i = 0; i < count; i++) {
            await sendEventInvite(sock, chatId, eventName, jpegThumbnail, startTime);
            sent++;
            if (i < count - 1) await sleep(EVENT_DELAY_MS);
        }

        try {
            await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
            await sock.sendMessage(chatId, {
                text: `✅ Event invite ${sent}/${count} zimetumwa.\n📌 Jina: ${eventName}`
            }, { quoted: message });
        } catch {}

    } catch (error) {
        console.error('[Notif] Error:', error);
        try {
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        } catch {}

        try {
            await sock.sendMessage(chatId, {
                text:
                    `❌ *Notification Failed*\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `⚠️ ${error.message || error}\n\n` +
                    `💡 Hakikisha target ni sahihi na thumbnail inapatikana.\n\n` +
                    `_${botName}™_`
            }, { quoted: message });
        } catch (e) {
            console.error('[Notif] Error reply failed:', e.message);
        }
    }
};

// ═══════════════════════════════════════════════════════════
// MODULE EXPORTS
// ═══════════════════════════════════════════════════════════
notifCommand.command = ['notif', 'notifuser'];
notifCommand.help = [
    'notif <jina> [idadi]',
    'notifuser <@user/nomor>|<jina>|<idadi>'
];
notifCommand.tags = ['owner'];
notifCommand.group = false;
notifCommand.owner = true;

module.exports = notifCommand;