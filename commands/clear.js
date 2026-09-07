async function clearCommand(sock, chatId, message, args = [], options = {}) {
    const targetChatId = chatId || message?.key?.remoteJid || options.chatId;
    const quoted = message?.quoted;
    const quotedContext = message?.message?.extendedTextMessage?.contextInfo
        || message?.message?.imageMessage?.contextInfo
        || message?.message?.videoMessage?.contextInfo
        || message?.contextInfo;

    const quotedKey = quoted?.key || {
        remoteJid: targetChatId,
        id: quoted?.stanzaId || quotedContext?.stanzaId,
        participant: quoted?.participant || quotedContext?.participant,
        fromMe: Boolean(quoted?.fromMe),
    };

    if (!targetChatId || !quotedKey.id) {
        await sock.sendMessage(targetChatId, {
            text: 'Reply kwenye text unayotaka kufuta, kisha tumia .clear',
        }, { quoted: message });
        return false;
    }

    try {
        await sock.sendMessage(targetChatId, { delete: quotedKey });
        return true;
    } catch (error) {
        console.error('[clear] Failed to delete replied message:', error);
        await sock.sendMessage(targetChatId, {
            text: 'Imeshindikana kufuta hiyo text. Hakikisha ume-reply ujumbe sahihi.',
        }, { quoted: message });
        return false;
    }
}

module.exports = { clearCommand };
