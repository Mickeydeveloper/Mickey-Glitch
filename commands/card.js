const axios = require('axios');

const MUSIC_CARD_API = 'https://api.nexray.eu.cc/canvas/musiccard';

async function cardCommand(sock, chatId, message, args = []) {
    const input = Array.isArray(args) ? args.join(' ').trim() : String(args || '').trim();
    const [judul, nama, imageUrl] = input.split('|').map((value) => value.trim());

    if (!judul || !nama || !imageUrl) {
        await sock.sendMessage(chatId, {
            text: '*Card Usage*\n\n.card judul | nama | image_url\n\nExample:\n.card dady bwai | mickey | https://files.catbox.moe/xmy96l.png'
        }, { quoted: message });
        return;
    }

    try {
        new URL(imageUrl);
    } catch {
        await sock.sendMessage(chatId, {
            text: '*Image URL si sahihi. Tumia URL kamili inayoanza na https://*'
        }, { quoted: message });
        return;
    }

    await sock.sendMessage(chatId, { text: '🎵 Inatengeneza card...' }, { quoted: message });

    try {
        const response = await axios.get(MUSIC_CARD_API, {
            params: { judul, nama, image_url: imageUrl },
            responseType: 'arraybuffer',
            timeout: 60000,
            validateStatus: (status) => status >= 200 && status < 300,
        });

        const imageBuffer = Buffer.from(response.data);
        if (!imageBuffer.length) throw new Error('API imerudisha image tupu');

        await sock.sendMessage(chatId, {
            image: imageBuffer,
            caption: `🎵 *${judul}*\n👤 ${nama}`
        }, { quoted: message });
    } catch (error) {
        console.error('Card generation error:', error?.message || error);
        await sock.sendMessage(chatId, {
            text: `❌ Imeshindwa kutengeneza card.\n${error?.response?.data?.message || 'Jaribu tena baada ya muda.'}`
        }, { quoted: message });
    }
}

module.exports = cardCommand;