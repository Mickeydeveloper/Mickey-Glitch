const { generateMessageIDV2 } = require('@whiskeysockets/baileys');
const isOwnerOrSudo = require('../lib/isOwner');

async function ftagCommand(sock, chatId, message, args = []) {
    const reply = (text) => sock.sendMessage(chatId, { text }, { quoted: message });

    if (!chatId?.endsWith('@g.us')) {
        return reply('❌ Command hii inatumika kwenye group pekee.');
    }

    const senderId = message?.key?.participant || message?.key?.remoteJid || '';
    if (!(await isOwnerOrSudo(senderId, sock, chatId))) {
        return reply('❌ Owner pekee ndiye anayeweza kutumia command hii.');
    }

    const body = Array.isArray(args) ? args.join(' ').trim() : String(args || '').trim();
    const match = body.match(/@(\S+)/);
    if (!match) {
        return reply(`❌ Mfano: *${global.prefix || '.'}ftag @nanazx ganteng*`);
    }

    const tag = match[1];
    const remainingText = body.slice(match.index + match[0].length).trim();
    const text = [`@${tag}`, remainingText].filter(Boolean).join(' ');

    try {
        await sock.relayMessage(chatId, {
            extendedTextMessage: {
                text,
                contextInfo: {
                    groupMentions: [{ groupJid: chatId, groupSubject: tag }],
                },
            },
        }, {
            messageId: generateMessageIDV2(sock.user?.id),
        });
    } catch (error) {
        console.error('[ftag] Failed to send group mention:', error?.message || error);
        return reply('❌ Imeshindikana kutuma group mention.');
    }
}

ftagCommand.description = 'Onyesha group mention yenye label maalum bila kuping washiriki wote';
ftagCommand.category = 'GROUP';
ftagCommand.aliases = ['fgtag'];

module.exports = ftagCommand;