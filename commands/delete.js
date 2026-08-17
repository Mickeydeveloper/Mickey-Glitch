const { delay } = require('@whiskeysockets/baileys');
const isOwnerOrSudo = require('../lib/isOwner');

/**
 * delete.js
 * Delete other people's messages in groups (requires admin role)
 * Uses relayMessage with groupStatusMessageV2 for powerful message deletion
 */

async function deleteCommand(sock, chatId, message, args = [], options = {}) {
  try {
    const targetChatId = chatId || message?.key?.remoteJid || options.chatId;
    const senderId = options.senderId || message?.key?.participant || message?.key?.remoteJid || '';

    // Check if message has quoted content
    const hasQuoted = message?.quoted || message?.message?.extendedTextMessage?.contextInfo?.quotedMessage || message?.contextInfo?.quotedMessage;
    
    if (!hasQuoted) {
      await sock?.sendMessage?.(targetChatId, { text: 'Please reply to a message to delete it.' }, { quoted: message });
      return true;
    }

    // Check if group command
    if (!targetChatId || !targetChatId.endsWith('@g.us')) {
      await sock?.sendMessage?.(targetChatId, { text: 'This command only works in groups.' }, { quoted: message });
      return true;
    }

    // Verify sender is owner/sudo
    if (senderId) {
      const isAllowed = await isOwnerOrSudo(senderId, sock, targetChatId);
      if (!isAllowed) {
        await sock?.sendMessage?.(targetChatId, { text: '⚠️ Only the owner can use this command.' }, { quoted: message });
        return true;
      }
    }

    // Get stanza ID of the quoted message
    const stanzaId = message.quoted?.stanzaId || message.quoted?.key?.id || message.key?.id;
    const quotedParticipant = message.quoted?.participant || message.quoted?.key?.participant;

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

    // Send protocol message to edit and delete
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
      { messageId: stanzaId }
    );

    await delay(100);

    // Delete the quoted message first
    await Promise.allSettled([
      sock.sendMessage(targetChatId, {
        delete: {
          remoteJid: targetChatId,
          id: stanzaId,
          fromMe: false,
          participant: quotedParticipant,
        },
      }),
    ]);

    await delay(50);

    // Then clean up temp messages
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
    if (sock && message) {
      await sock.sendMessage(chatId || message?.key?.remoteJid, {
        text: 'Error: ' + (error?.message || error),
      }, { quoted: message }).catch(() => {});
    }
    return false;
  }
}

module.exports = deleteCommand;
module.exports.name = 'delete';
module.exports.aliases = ['del', 'dmsg'];
module.exports.category = 'admin';
module.exports.desc = 'Delete other people\'s messages in groups';
module.exports.execute = deleteCommand;
module.exports.run = deleteCommand;
module.exports.handler = deleteCommand;

