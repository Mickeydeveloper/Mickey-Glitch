// commands/notif.js
const settings = require('../settings');
const { randomUUID } = require('node:crypto');

const THUMBNAIL_URL = 'https://cdn.ornzora.eu.cc/4d4f3591-1c3e-4e1b-b1c2-45faeb91b781-FIORA.jpg';
const MAX_THUMBNAIL_BYTES = 2 * 1024 * 1024;

async function getEventThumbnail() {
    const response = await fetch(THUMBNAIL_URL, {
        signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`Thumbnail download failed: HTTP ${response.status}`);

    const contentLength = Number(response.headers.get('content-length'));
    if (contentLength > MAX_THUMBNAIL_BYTES) {
        throw new Error('Event thumbnail is larger than 2 MB');
    }

    const thumbnail = Buffer.from(await response.arrayBuffer());
    if (thumbnail.length > MAX_THUMBNAIL_BYTES) {
        throw new Error('Event thumbnail is larger than 2 MB');
    }
    return thumbnail;
}

async function triggerEventNotif(conn, chatJid, eventTitle, jpegThumbnail, startTime) {
    return conn.relayMessage(
        chatJid,
        {
            eventInviteMessage: {
                eventId: randomUUID(),
                eventTitle,
                jpegThumbnail,
                startTime
            }
        },
        {
            additionalNodes: [
                {
                    tag: 'meta',
                    attrs: { context_source: 'event_invitation' }
                }
            ]
        }
    );
}

async function toLid(conn, jid) {
    if (jid.endsWith('@lid') || jid.endsWith('@g.us')) return jid;
    const pn = jid.includes('@') ? jid : `${jid.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
    const lid = await conn.signalRepository?.lidMapping?.getLIDForPN?.(pn);
    if (!lid) throw new Error(`LID tidak ditemukan untuk ${pn}`);
    return lid;
}

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

    return { targetPart, eventName, count };
}

function parseNotifArgs(text) {
    const parts = text.split('|').map(v => v.trim());
    const eventName = parts[0] || 'Woi';
    const n = parseInt(parts[1]);
    const count = !isNaN(n) && n > 0 ? n : 1;
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

    // ─── Usage / help ──────────────────────────────────────
    if (!text) {
        const usage = isNotifUser
            ? `📢 *NOTIF USER — Event Invitation*\n` +
              `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `*Matumizi:*\n` +
              `• \`${prefix}${command} @user|woi\`\n` +
              `• \`${prefix}${command} @user1 @user2|woi|5\`\n` +
              `• \`${prefix}${command} 62858xxx|woi|10\`\n` +
              `• \`${prefix}${command} 62858xxx Gw jago | 2\`\n\n` +
              `*Maelezo:*\n` +
              `• Target: @mention au namba (628xxx)\n` +
              `• Jina la event: maandishi yoyote\n` +
              `• Idadi: namba (default 1)\n\n` +
              `_${botName}™_`
            : `📢 *NOTIF — Event Invitation*\n` +
              `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `*Matumizi:*\n` +
              `• \`${prefix}${command} woi\`\n` +
              `• \`${prefix}${command} woi|10\`\n\n` +
              `*Maelezo:*\n` +
              `• Tuma event invitation kwa chat/group hii\n` +
              `• Idadi: namba (default 1)\n\n` +
              `_${botName}™_`;

        try {
            await sock.sendMessage(chatId, { text: usage }, { quoted: message });
        } catch (e) {
            console.error('[Notif] Usage send failed:', e.message);
        }
        return;
    }

    // React: processing
    try {
        await sock.sendMessage(chatId, { react: { text: '⌛', key: message.key } });
    } catch {}

    try {
        const now = Math.floor(Date.now() / 1000);
        const startTime = now + 3600;
        const jpegThumbnail = await getEventThumbnail();

        // ─── NOTIFUSER MODE ────────────────────────────────
        if (isNotifUser) {
            const { targetPart, eventName, count } = parseNotifUserArgs(text);

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

            const targetLids = [
                ...new Set(await Promise.all(rawTargets.map(jid => toLid(sock, jid))))
            ];

            for (const lid of targetLids) {
                for (let i = 0; i < count; i++) {
                    await triggerEventNotif(sock, lid, eventName, jpegThumbnail, startTime);
                }
            }

            try {
                await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });
            } catch {}

            try {
                await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
            } catch {}

            const resultMsg =
                `✅ *Event Invitation Sent*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `👤 Targets: *${targetLids.length}*\n` +
                `🔁 Per target: *${count}×*\n` +
                `📌 Total pings: *${targetLids.length * count}*\n` +
                `💬 Message: _"${eventName}"_\n\n` +
                `_${botName}™_`;

            await sock.sendMessage(chatId, { text: resultMsg }, { quoted: message });
            return;
        }

        // ─── NOTIF MODE (current chat) ─────────────────────
        const { eventName, count } = parseNotifArgs(text);

        for (let i = 0; i < count; i++) {
            await triggerEventNotif(sock, chatId, eventName, jpegThumbnail, startTime);
        }

        try {
            await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });
        } catch {}

        try {
            await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
        } catch {}

        const resultMsg =
            `✅ *Event Invitation Sent*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `📍 Chat: *${chatId.endsWith('@g.us') ? 'Group' : 'Private'}*\n` +
            `🔁 Invitations sent: *${count}*\n` +
            `💬 Message: _"${eventName}"_\n\n` +
            `_${botName}™_`;

        await sock.sendMessage(chatId, { text: resultMsg }, { quoted: message });

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
    'notif <teks>|<jumlah>',
    'notifuser <@user/nomor>|<teks>|<jumlah>'
];
notifCommand.tags = ['owner'];
notifCommand.group = false;
notifCommand.owner = true;

module.exports = notifCommand;