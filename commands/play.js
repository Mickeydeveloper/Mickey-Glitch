const axios = require('axios');
const yts = require('yt-search');
const { sendButtons } = require('gifted-btns');

async function songCommand(sock, chatId, message) {
    if (!sock) return;

    const textBody = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const query = textBody.split(" ").slice(1).join(" ");

    if (!query) {
        return sock.sendMessage(chatId, { text: '🎵 *Andika jina la wimbo!*\nExample: .play Adele Hello' }, { quoted: message });
    }

    try {
        await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

        const { videos } = await yts(query);
        if (!videos || !videos.length) return sock.sendMessage(chatId, { text: '❌ *Haikupatikana!*' });

        const vid = videos[0];
        const url = vid.url;

        // --- SEHEMU YA KUREKEBISHA TATIZO LA KUTOPLAY ---
        // Tunatumia API kupata direct link ya audio inayokubalika na WA
        try {
            const downloadRes = await axios.get(`https://api.giftedtech.my.id/api/download/dl?url=${encodeURIComponent(url)}`);
            const dlData = downloadRes.data;

            if (dlData.success) {
                const audioUrl = dlData.result.download_url;

                // Tuma audio ikiwa na mimetype sahihi (audio/mpeg) ili icheze
                await sock.sendMessage(chatId, { 
                    audio: { url: audioUrl }, 
                    mimetype: 'audio/mpeg', 
                    fileName: `${vid.title}.mp3`,
                    ptt: false // Hii inafanya iwe wimbo unaopitika (playable)
                }, { quoted: message });

                await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
            } else {
                throw new Error("Failed to get download link");
            }

        } catch (downloadErr) {
            console.error("DOWNLOAD ERROR:", downloadErr.message);
            // Kama ikishindika kutuma moja kwa moja, tuma angalau taarifa za wimbo na buttons
            const playText = `🎵 *Wimbo Umepatikana lakini kuna tatizo la kupakua.*\n📝 *Title:* ${vid.title}`;
            
            await sock.sendMessage(chatId, { 
                image: { url: vid.thumbnail }, 
                caption: playText 
            }, { quoted: message });
        }

    } catch (err) {
        console.error("PLAY ERROR:", err.message);
        await sock.sendMessage(chatId, { text: '🚨 *Hitilafu!* Jaribu tena baadae.' }, { quoted: message });
    }
}

module.exports = songCommand;
