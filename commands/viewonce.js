const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function viewonceCommand(sock, chatId, message) {
    try {
        // Extract quoted imageMessage or videoMessage
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedImage = quoted?.imageMessage;
        const quotedVideo = quoted?.videoMessage;

        // Namba ya bot (weka namba yako ya WhatsApp bot hapa)
        const botNumber = '2557XXXXXXXX@s.whatsapp.net'; // mfano: 2557... ni namba yako

        if (quotedImage && quotedImage.viewOnce) {
            // Download image
            const stream = await downloadContentFromMessage(quotedImage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

            // Tuma kwenye chat iliyotumika command
            await sock.sendMessage(chatId, { 
                image: buffer, 
                fileName: 'media.jpg', 
                caption: quotedImage.caption || '' 
            }, { quoted: message });

            // Tuma direct inbox ya bot number
            await sock.sendMessage(botNumber, { 
                image: buffer, 
                fileName: 'media.jpg', 
                caption: quotedImage.caption || '' 
            });

        } else if (quotedVideo && quotedVideo.viewOnce) {
            // Download video
            const stream = await downloadContentFromMessage(quotedVideo, 'video');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

            // Tuma kwenye chat iliyotumika command
            await sock.sendMessage(chatId, { 
                video: buffer, 
                fileName: 'media.mp4', 
                caption: quotedVideo.caption || '' 
            }, { quoted: message });

            // Tuma direct inbox ya bot number
            await sock.sendMessage(botNumber, { 
                video: buffer, 
                fileName: 'media.mp4', 
                caption: quotedVideo.caption || '' 
            });

        } else {
            await sock.sendMessage(chatId, { 
                text: '❌ Tafadhali reply kwenye *view-once* image au video.' 
            }, { quoted: message });
        }
    } catch (err) {
        console.error('[VIEWONCE] Error:', err);
        await sock.sendMessage(chatId, { 
            text: '⚠️ Hitilafu imetokea, jaribu tena.' 
        }, { quoted: message });
    }
}

module.exports = viewonceCommand;
