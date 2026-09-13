async function clearCommand(sock, chatId, message, args = [], options = {}) {
    const targetChatId = chatId || message?.key?.remoteJid || options.chatId;
    const commandText = String(Array.isArray(args) ? args.join(' ') : (args || '')).trim().toLowerCase();

    const quoted = message?.quoted || message?.message?.extendedTextMessage?.contextInfo?.quotedMessage
        ? { key: message?.quoted?.key || message?.message?.extendedTextMessage?.contextInfo } : null;

    const quotedContext = message?.message?.extendedTextMessage?.contextInfo
        || message?.message?.imageMessage?.contextInfo
        || message?.message?.videoMessage?.contextInfo
        || message?.contextInfo
        || message?.quoted?.contextInfo;

    const quotedKey = quoted?.key || {
        remoteJid: targetChatId,
        id: quotedContext?.stanzaId || quotedContext?.quotedMessage?.stanzaId || message?.key?.id,
        participant: quotedContext?.participant || message?.key?.participant || message?.participant,
        fromMe: Boolean(quotedContext?.fromMe || message?.key?.fromMe),
    };

    if (!targetChatId) {
        return false;
    }

    if (['all', 'everyone', 'for-everyone', 'everyone'].includes(commandText)) {
        if (!quotedKey.id) {
            await sock.sendMessage(targetChatId, {
                text: 'Reply kwenye ujumbe unaotaka kufuta kwa everyone, kisha tumia `.clear all`.',
            }, { quoted: message });
            return false;
        }
    } else if (!quotedKey.id) {
        await sock.sendMessage(targetChatId, {
            text: 'Reply kwenye text unayotaka kufuta, kisha tumia `.clear`\nAu: `.clear all` baada ya reply.',
        }, { quoted: message });
        return false;
    }

    try {
        await sock.sendMessage(targetChatId, { delete: quotedKey });
        await sock.sendMessage(targetChatId, {
            text: '✅ Ujumbe umefutwa kwa everyone.'
        }, { quoted: message });
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
