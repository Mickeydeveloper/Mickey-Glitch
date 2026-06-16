const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function viewonceCommand(sock, chatId, message) {
    // Extract quoted imageMessage or videoMessage
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedImage = quoted?.imageMessage;
    const quotedVideo = quoted?.videoMessage;

    if (quotedImage && quotedImage.viewOnce) {
        // Download natively using modern array stream (Low RAM & CPU)
        const stream = await downloadContentFromMessage(quotedImage, 'image');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks); // Concat inafanyika MARA MOJA tu hapa

        await sock.sendMessage(chatId, { 
            image: buffer, 
            fileName: 'media.jpg', 
            caption: quotedImage.caption || '' 
        }, { quoted: message });

    } else if (quotedVideo && quotedVideo.viewOnce) {
        // Download natively using modern array stream (Low RAM & CPU)
        const stream = await downloadContentFromMessage(quotedVideo, 'video');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks); // Concat ya mara moja kuokoa RAM spikes

        await sock.sendMessage(chatId, { 
            video: buffer, 
            fileName: 'media.mp4', 
            caption: quotedVideo.caption || '' 
        }, { quoted: message });

    } else {
        await sock.sendMessage(chatId, { text: '❌ Please reply to a view-once image or video.' }, { quoted: message });
    }
}

module.exports = viewonceCommand;
