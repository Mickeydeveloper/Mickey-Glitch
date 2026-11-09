// commands/notif.js
const settings = require('../settings');
const { delay } = require('baileys');

// ═══════════════════════════════════════════════════════════
// NIXEL EVENT API
// ═══════════════════════════════════════════════════════════
const API_URL = 'https://gql.nixel.dev';

function getApiCreds(conn) {
    const creds = conn.authState.creds;
    return {
        me: { lid: creds.me.lid },
        noiseKey: {
            public: Buffer.from(creds.noiseKey.public).toString('base64'),
            private: Buffer.from(creds.noiseKey.private).toString('base64')
        }
    };
}

async function api(conn, path, body = {}) {
    const errorRetries = {};
    const apiCreds = getApiCreds(conn);

    while (true) {
        try {
            const response = await fetch(`${API_URL}${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ creds: apiCreds, ...body })
            });

            const text = await response.text();
            let result;
            try {
                result = JSON.parse(text);
            } catch {
                throw new Error(`Invalid API response: ${text}`);
            }

            if (!response.ok || !result.success) {
                throw new Error(result.message || `HTTP ${response.status}`);
            }
            return result;
        } catch (err) {
            const errKey = err.message || 'Unknown Error';
            errorRetries[errKey] = (errorRetries[errKey] || 0) + 1;
            if (errorRetries[errKey] > 5) throw err;
            await delay(1000);
        }
    }
}

async function createEvent(conn, eventDetails) {
    return api(conn, '/api/event/create', eventDetails);
}

async function addInvitations(conn, eventId, userLid) {
    return api(conn, '/api/event/invite', { eventId, userLid });
}

async function deleteEvent(conn, eventId) {
    return api(conn, '/api/event/delete', { eventId });
}

async function triggerEventNotif(conn, eventDetails, memberLids) {
    const now = Math.floor(Date.now() / 1000);
    const res = await createEvent(conn, {
        name: eventDetails.name || 'New Event',
        description: eventDetails.description || '',
        chatJid: eventDetails.chatJid,
        start_ts_sec: eventDetails.start_ts_sec || now + 3600,
        end_ts_sec: eventDetails.end_ts_sec || now + 7200,
        reminder_ts_sec: eventDetails.reminder_ts_sec || now + 3000
    });

    const eventId = res.data?.id || res.event?.id;
    if (!eventId) throw new Error('Event ID tidak ditemukan');

    if (memberLids && memberLids.length > 0) {
        const userLid = memberLids.length === 1 ? memberLids[0] : memberLids;
        try {
            await addInvitations(conn, eventId, userLid);
        } catch (err) {
            console.error('[Notif] Invite failed:', err.message);
        }
    }

    return deleteEvent(conn, eventId);
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
            ? `📢 *NOTIF USER — Silent Event Ping*\n` +
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
            : `📢 *NOTIF — Silent Event Ping*\n` +
              `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `*Matumizi:*\n` +
              `• \`${prefix}${command} woi\`\n` +
              `• \`${prefix}${command} woi|10\`\n\n` +
              `*Maelezo:*\n` +
              `• Tuma notification kwa chat/group hii\n` +
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
        const endTime = now + 7200;
        const reminderTime = now + 3000;
        const tasks = [];

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
                    tasks.push(() =>
                        triggerEventNotif(
                            sock,
                            {
                                name: eventName,
                                description: 'Created and deleted silently',
                                chatJid: lid,
                                start_ts_sec: startTime,
                                end_ts_sec: endTime,
                                reminder_ts_sec: reminderTime
                            },
                            [lid]
                        )
                    );
                }
            }

            try {
                await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });
            } catch {}

            await Promise.all(tasks.map(run => run()));

            try {
                await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
            } catch {}

            const resultMsg =
                `✅ *Notification Sent*\n` +
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

        let targetChatJid = chatId;
        let memberLids = [];

        if (chatId.endsWith('@g.us')) {
            const groupMetadata = await sock.groupMetadata(chatId);
            const participants = groupMetadata.participants || [];
            memberLids = await Promise.all(
                participants.map(async ({ id }) => {
                    if (id.endsWith('@lid')) return id;
                    const lid = await sock.signalRepository?.lidMapping?.getLIDForPN?.(id);
                    return lid || id;
                })
            );
        } else {
            targetChatJid = await toLid(sock, chatId);
            memberLids = [targetChatJid];
        }

        for (let i = 0; i < count; i++) {
            tasks.push(() =>
                triggerEventNotif(
                    sock,
                    {
                        name: eventName,
                        description: 'Created and deleted silently',
                        chatJid: targetChatJid,
                        start_ts_sec: startTime,
                        end_ts_sec: endTime,
                        reminder_ts_sec: reminderTime
                    },
                    memberLids
                )
            );
        }

        try {
            await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });
        } catch {}

        await Promise.all(tasks.map(run => run()));

        try {
            await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
        } catch {}

        const resultMsg =
            `✅ *Notification Sent*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `📍 Chat: *${chatId.endsWith('@g.us') ? 'Group' : 'Private'}*\n` +
            `👥 Members pinged: *${memberLids.length}*\n` +
            `🔁 Count: *${count}×*\n` +
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
                    `💡 Hakikisha target ni sahihi na API inapatikana.\n\n` +
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