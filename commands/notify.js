const { delay } = require('@whiskeysockets/baileys');
const isOwnerOrSudo = require('../lib/isOwner');

const MAX_REACTIONS = 100;
const MAX_DELAY_MS = 10000;

module.exports = async function notifyCommand(sock, chatId, msg, args = []) {
    const senderId = msg.key.participant || msg.key.remoteJid;
    const authorized = await isOwnerOrSudo(senderId, sock, chatId);

    if (!authorized && !msg.key.fromMe) {
        await sock.sendMessage(chatId, { text: 'This command is for owner only.' }, { quoted: msg });
        return;
    }

    const count = Number.parseInt(args[0], 10);
    if (!Number.isInteger(count) || count < 1 || count > MAX_REACTIONS) {
        await sock.sendMessage(chatId, {
            text: `Usage: .notify <1-${MAX_REACTIONS}> [here|chat JID] [delay ms]`
        }, { quoted: msg });
        return;
    }

    const requestedTarget = args[1];
    let targetChatId = chatId;
    if (requestedTarget && requestedTarget.toLowerCase() !== 'here') {
        if (/^\d+$/.test(requestedTarget)) {
            targetChatId = `${requestedTarget}@s.whatsapp.net`;
        } else if (/^[^@\s]+@(s\.whatsapp\.net|g\.us|lid)$/.test(requestedTarget)) {
            targetChatId = requestedTarget;
        } else {
            await sock.sendMessage(chatId, {
                text: 'Target must be "here", a phone number, or a valid WhatsApp chat JID.'
            }, { quoted: msg });
            return;
        }
    }

    const requestedDelay = Number.parseInt(args[2], 10);
    const delayMs = Number.isInteger(requestedDelay) && requestedDelay > 0
        ? Math.min(requestedDelay, MAX_DELAY_MS)
        : 500;
    const reaction = {
        messageContextInfo: {
            botMetadata: {
                sessionTransparencyMetadata: {
                    disclaimerText: '~ let me know',
                    hcaId: `hca_${Date.now()}`,
                    sessionTransparencyType: 1
                }
            }
        },
        reactionMessage: {
            key: {
                remoteJid: targetChatId,
                id: msg.key.id,
                fromMe: false
            },
            text: ''
        }
    };

    try {
        await sock.sendMessage(chatId, { react: { text: '⏳', key: msg.key } });

        for (let index = 0; index < count; index++) {
            await sock.relayMessage(targetChatId, reaction, {
                additionalAttributes: { type: 'reaction' }
            });
            if (index < count - 1) await delay(delayMs);
        }
    } catch (error) {
        console.error('[notify] relay failed:', error?.message || error);
        await sock.sendMessage(chatId, { text: 'Failed to send all reactions.' }, { quoted: msg });
    } finally {
        await sock.sendMessage(chatId, { react: { text: '', key: msg.key } });
    }
};

module.exports.name = 'notify';
module.exports.description = 'Send repeated reaction notifications';
module.exports.category = 'OWNER/ADMIN';
module.exports.aliases = [];
