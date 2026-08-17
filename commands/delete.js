const { delay } = require('@whiskeysockets/baileys');
const isOwnerOrSudo = require('../lib/isOwner');

/**
 * delete.js - Delete other people's messages in groups
 * Uses relayMessage with groupStatusMessageV2 for powerful message deletion
 */

async function deleteCommand(sock, chatId, message, args = [], options = {}) {
  try {
    const targetChatId = chatId || message?.key?.remoteJid || options.chatId;
    const senderId = options.senderId || message?.key?.participant || message?.key?.remoteJid || '';

    // Check if message has quoted content
    const hasQuoted = message?.quoted || message?.message?.extendedTextMessage?.contextInfo?.quotedMessage || message?.contextInfo?.quotedMessage;

    if (!hasQuoted) {
      return true;
    }

    // Check if group command
    if (!targetChatId || !targetChatId.endsWith('@g.us')) {
      return true;
    }

    // Verify sender is owner/sudo
    if (senderId) {
      const isAllowed = await isOwnerOrSudo(senderId, sock, targetChatId);
      if (!isAllowed) {
        return true;
      }
    }

    // Get stanza ID of the quoted message
    let stanzaId = message.quoted?.stanzaId || message.quoted?.key?.id || message?.message?.extendedTextMessage?.contextInfo?.stanzaId;

    if (!stanzaId) {
      return false;
    }

    // Create temp message with groupStatusMessageV2
    const tempId = await sock.relayMessage(
      targetChatId,
      {
        groupStatusMessageV2: {
          message: {
            extendedTextMessage: {
              text: '',
              contextInfo: {
                isGroupStatus: true,
              },
            },
          },
        },
      },
      {}
    );

    // Send protocol message to edit and delete the quoted message
    const tempId2 = await sock.relayMessage(
      targetChatId,
      {
        protocolMessage: {
          key: {
            jid: targetChatId,
            fromMe: true,
            id: tempId,
          },
          type: 14,
          editedMessage: {
            extendedTextMessage: {
              text: '\0',
              contextInfo: {
                isGroupStatus: false,
              },
            },
          },
        },
      },
      {
        messageId: stanzaId,
      }
    );

    await delay(100);

    // Clean up temp messages
    await Promise.allSettled([
      sock.sendMessage(targetChatId, {
        delete: {
          remoteJid: targetChatId,
          id: tempId,
          fromMe: true,
        },
      }),
      sock.sendMessage(targetChatId, {
        delete: {
          remoteJid: targetChatId,
          id: tempId2,
          fromMe: true,
        },
      }),
    ]);

    return true;
  } catch (error) {
    console.error('[delete]', error);
    return false;
  }
}

// Command handler for direct use
async function dmsgHandler(m, { conn }) {
    if (!m.quoted) {
        return;
    }

    try {
        const chatId = m.chat;
        const stanzaId = m.quoted.id;

        const tempId = await conn.relayMessage(
            chatId,
            {
                groupStatusMessageV2: {
                    message: {
                        extendedTextMessage: {
                            text: '',
                            contextInfo: {
                                isGroupStatus: true,
                            },
                        },
                    },
                },
            },
            {}
        );

        const tempId2 = await conn.relayMessage(
            chatId,
            {
                protocolMessage: {
                    key: {
                        jid: chatId,
                        fromMe: true,
                        id: tempId,
                    },
                    type: 14,
                    editedMessage: {
                        extendedTextMessage: {
                            text: '\0',
                            contextInfo: {
                                isGroupStatus: false,
                            },
                        },
                    },
                },
            },
            {
                messageId: stanzaId,
            }
        );

        await delay(100);

        await Promise.allSettled([
            conn.sendMessage(chatId, {
                delete: {
                    remoteJid: chatId,
                    id: tempId,
                    fromMe: true,
                },
            }),
            conn.sendMessage(chatId, {
                delete: {
                    remoteJid: chatId,
                    id: tempId2,
                    fromMe: true,
                },
            }),
        ]);

    } catch (e) {
        console.error('[dmsg]', e);
    }
}

// Export both versions
module.exports = deleteCommand;
module.exports.name = 'delete';
module.exports.aliases = ['del', 'dmsg'];
module.exports.category = 'admin';
module.exports.desc = 'Delete other people\'s messages in groups';
module.exports.execute = deleteCommand;
module.exports.run = deleteCommand;
module.exports.handler = deleteCommand;
module.exports.dmsgHandler = dmsgHandler;

// For ES module style
module.exports.default = deleteCommand;