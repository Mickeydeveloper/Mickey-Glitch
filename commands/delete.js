const isAdmin = require('../lib/isAdmin');

/**
 * delete.js
 * Simplified .delete command: when replied, delete the replied message and the command message.
 * Works in groups (requires sender + bot admin) and private chats (no admin required).
 */

async function deleteCommand(sock, chatId, message, senderId) {
  try {
    const isGroup = chatId && String(chatId).endsWith('@g.us');

    if (isGroup) {
      const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);
      if (!isBotAdmin) {
        await sock.sendMessage(chatId, { text: 'I need to be an admin to delete other users\' messages in groups.' }, { quoted: message });
        return;
      }
      if (!isSenderAdmin) {
        await sock.sendMessage(chatId, { text: 'Only group admins can use this command.' }, { quoted: message });
        return;
      }
    }

    const ctxInfo = message.message?.extendedTextMessage?.contextInfo || {};
    const repliedId = ctxInfo?.stanzaId || ctxInfo?.stanzaId; // stanzaId holds the replied message id
    if (!repliedId) {
      await sock.sendMessage(chatId, { text: '❌ Please reply to the message you want to delete and run the command.' }, { quoted: message });
      return;
    }

    const participant = ctxInfo.participant || message.key.participant || message.key.remoteJid;

    // Attempt to delete the replied message
    try {
      await sock.sendMessage(chatId, { delete: { remoteJid: chatId, fromMe: false, id: repliedId, participant } });
    } catch (e) {
      // fallback try (older API shapes)
      try {
        await sock.sendMessage(chatId, { delete: { remoteJid: chatId, id: repliedId } });
      } catch (_) {}
    }

    // Delete the command message itself
    try {
      const cmdParticipant = message.key.participant || message.key.remoteJid;
      await sock.sendMessage(chatId, { delete: { remoteJid: chatId, fromMe: false, id: message.key.id, participant: cmdParticipant } });
    } catch (e) {
      try { await sock.sendMessage(chatId, { delete: message.key }); } catch (_) {}
    }

  } catch (err) {
    try { await sock.sendMessage(chatId, { text: 'Failed to delete the message.' }, { quoted: message }); } catch (_) {}
  }
}

module.exports = deleteCommand;

