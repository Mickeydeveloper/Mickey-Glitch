const {
    downloadContentFromMessage,
} = require('@whiskeysockets/baileys');

async function annotateCommand(sock, chatId, message) {
    try {
        const contextInfo = message.message?.extendedTextMessage?.contextInfo ||
            message.message?.imageMessage?.contextInfo ||
            message.message?.videoMessage?.contextInfo ||
            message.quoted?.contextInfo || {};
        const quotedMessage = contextInfo.quotedMessage || message.quoted?.message || message.quoted;
        const sticker = quotedMessage?.stickerMessage || quotedMessage?.message?.stickerMessage;

        if (!sticker) {
            await sock.sendMessage(chatId, {
                text: 'Jibu sticker kwa .annotate ili kuituma kama sticker annotation.'
            }, { quoted: message });
            return;
        }

        if (!contextInfo.stanzaId) {
            await sock.sendMessage(chatId, {
                text: 'Sijaweza kupata ujumbe wa sticker. Jaribu kuijibu tena kwa .annotate.'
            }, { quoted: message });
            return;
        }

        const stream = await downloadContentFromMessage(sticker, 'sticker');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const stickerBuffer = Buffer.concat(chunks);

        if (!stickerBuffer.length) {
            throw new Error('Sticker haikupakuliwa.');
        }

        const quotedSticker = {
            key: {
            remoteJid: chatId,
            id: contextInfo.stanzaId
            }
        };
        if (contextInfo.participant) quotedSticker.key.participant = contextInfo.participant;
        quotedSticker.message = quotedMessage;

        await sock.sendMessage(chatId, { sticker: stickerBuffer }, { quoted: quotedSticker });
    } catch (error) {
        console.error('[annotate]', error?.message || error);
        await sock.sendMessage(chatId, {
            text: 'Imeshindikana kutuma sticker annotation. Hakikisha sticker bado inaweza kupakuliwa, kisha jaribu tena.'
        }, { quoted: message }).catch(() => {});
    }
}

annotateCommand.commandName = 'annotate';
annotateCommand.description = 'Jibu sticker kwa sticker inayooana na matoleo mengi ya WhatsApp.';
annotateCommand.category = 'MEDIA';

module.exports = annotateCommand;