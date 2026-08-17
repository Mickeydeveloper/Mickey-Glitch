const { delay } = require('@whiskeysockets/baileys');
const isOwnerOrSudo = require('../lib/isOwner');

async function fakemsgCommand(sock, chatId, msg, args = [], options = {}) {
    try {
        const targetChatId = chatId || msg?.key?.remoteJid || options.chatId;
        const senderId = options.senderId || msg?.key?.participant || msg?.key?.remoteJid || '';

        // Check if message has quoted/replied content
        const hasQuoted = msg?.quoted || msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage || msg?.contextInfo?.quotedMessage;
        
        if (!hasQuoted) {
            await sock?.sendMessage?.(targetChatId, { text: 'Please reply to a message to process it.' }, { quoted: msg });
            return true;
        }

        const text = Array.isArray(args) ? args.join(' ') : String(args || '');
        if (!text.trim()) {
            await sock?.sendMessage?.(targetChatId, { text: 'Please provide replacement text.' }, { quoted: msg });
            return true;
        }

        if (!targetChatId || !targetChatId.endsWith('@g.us')) {
            await sock?.sendMessage?.(targetChatId, { text: 'This command only works in groups.' }, { quoted: msg });
            return true;
        }

        if (senderId) {
            const isAllowed = await isOwnerOrSudo(senderId, sock, targetChatId);
            if (!isAllowed) {
                await sock?.sendMessage?.(targetChatId, { text: '⚠️ Only the owner can use this command.' }, { quoted: msg });
                return true;
            }
        }

        const stanzaId = msg.quoted?.stanzaId || msg.quoted?.key?.id || msg.key?.id;

        const tempId = await sock.relayMessage(
            targetChatId,
            {
                extendedTextMessage: {
                    text: '',
                    contextInfo: {
                        isGroupStatus: true
                    }
                }
            },
            { quoted: msg }
        );

        const tempId2 = await sock.relayMessage(
            targetChatId,
            {
                protocolMessage: {
                    key: {
                        jid: targetChatId,
                        fromMe: true,
                        id: tempId
                    },
                    type: 14,
                    editedMessage: {
                        extendedTextMessage: {
                            text,
                            contextInfo: {
                                isGroupStatus: false
                            }
                        }
                    }
                }
            },
            { messageId: stanzaId }
        );

        await delay(100);

        await Promise.allSettled([
            sock.sendMessage(targetChatId, {
                delete: {
                    remoteJid: targetChatId,
                    id: tempId,
                    fromMe: true
                }
            }),
            sock.sendMessage(targetChatId, {
                delete: {
                    remoteJid: targetChatId,
                    id: tempId2,
                    fromMe: true
                }
            })
        ]);

        return true;
    } catch (error) {
        console.error('[fakemsg]', error);
        if (sock && msg) {
            await sock.sendMessage(chatId || msg?.key?.remoteJid, {
                text: 'Error: ' + (error?.message || error)
            }, { quoted: msg }).catch(() => {});
        }
        return false;
    }
}

module.exports = fakemsgCommand;
module.exports.name = 'fakemsg';
module.exports.aliases = ['fake', 'fmsg'];
module.exports.category = 'owner';
module.exports.desc = 'Fake status message from quoted text';
module.exports.execute = fakemsgCommand;
module.exports.run = fakemsgCommand;
module.exports.handler = fakemsgCommand;
