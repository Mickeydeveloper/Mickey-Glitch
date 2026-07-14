const { downloadMediaMessage } = require('@whiskeysockets/baileys');

const gpstatusCommand = async (sock, chatId, message) => {
    try {
        // 1. Get message text
        const messageText = message.message?.conversation?.trim() || 
                           message.message?.extendedTextMessage?.text?.trim() || '';
        const caption = messageText.slice(8).trim(); // Remove '.gpstatus' prefix
        
        // 2. Check for help or options
        if (caption === 'help' || caption === '--help') {
            await sock.sendMessage(chatId, {
                text: `📢 *GROUP STATUS COMMAND*\n\n` +
                      `*Usage:* Reply to picha/video na:\n` +
                      `• \`.gpstatus\` - Tuma kwenye Official WA Status\n` +
                      `• \`.gpstatus viewonce\` - Tuma kama view once Status\n` +
                      `• \`.gpstatus <caption>\` - Tuma na caption`
            }, { quoted: message });
            return;
        }

        // 3. Check for quoted media (image/video)
        const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (!quotedMsg) {
            await sock.sendMessage(chatId, {
                text: `📸 *Matumizi:* Reply picha/video ukizindikiza na amri \`.gpstatus\` ili kupost kwenye WhatsApp Official Status.\n\n` +
                      `📌 *Options:*\n` +
                      `• \`.gpstatus\` - Post status\n` +
                      `• \`.gpstatus viewonce\` - Post kama view once\n` +
                      `• \`.gpstatus caption text\` - Tuma na caption`
            }, { quoted: message });
            return;
        }

        const mediaMessage = quotedMsg.imageMessage || quotedMsg.videoMessage;
        
        if (!mediaMessage) {
            await sock.sendMessage(chatId, {
                text: `❌ *Error:* Tafadhali reply ujumbe wa picha au video pekee.`
            }, { quoted: message });
            return;
        }

        // 4. Determine media type
        const mediaType = quotedMsg.imageMessage ? 'image' : 'video';
        const isViewOnce = caption.toLowerCase().includes('viewonce');

        // 5. Show processing message
        await sock.sendMessage(chatId, {
            text: `⏳ *Processing...* Inadownload media na kupost kwenye Official Status.`
        }, { quoted: message });

        // 6. Download media
        const mediaBuffer = await downloadMediaMessage(
            {
                key: {
                    remoteJid: chatId,
                    id: message.message?.extendedTextMessage?.contextInfo?.stanzaId,
                    participant: message.message?.extendedTextMessage?.contextInfo?.participant
                },
                message: quotedMsg
            },
            'buffer',
            {},
            { logger: console }
        );

        if (!mediaBuffer || mediaBuffer.length === 0) {
            throw new Error('Failed to download media');
        }

        // 7. Extract caption from quoted media
        const statusCaption = caption.replace(/viewonce/gi, '').trim() || 
                             mediaMessage.caption || 
                             (mediaType === 'image' ? '📸 Status' : '🎥 Status');

        // 8. Send to Official WhatsApp Status
        const statusPayload = mediaType === 'image'
            ? { 
                image: mediaBuffer, 
                caption: statusCaption, 
                viewOnce: isViewOnce
              }
            : { 
                video: mediaBuffer, 
                caption: statusCaption, 
                gifPlayback: false,
                viewOnce: isViewOnce
              };

        await sock.sendMessage('status@broadcast', statusPayload);

        // 9. Success response
        await sock.sendMessage(chatId, {
            text: `✅ *Success!* Status imetumwa kwenye Official WhatsApp Status.\n\n` +
                  `📊 *Type:* ${mediaType === 'image' ? '🖼️ Image' : '🎥 Video'}\n` +
                  `📝 *Caption:* ${statusCaption}`
        }, { quoted: message });

    } catch (error) {
        console.error('gpstatus command error:', error);
        await sock.sendMessage(chatId, {
            text: `❌ *Error:* ${error.message || 'Failed to send status. Try again later.'}`
        }, { quoted: message });
    }
};

module.exports = gpstatusCommand;
