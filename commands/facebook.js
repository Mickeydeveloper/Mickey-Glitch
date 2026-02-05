const axios = require('axios');
const { prepareWAMessageMedia, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

async function facebookCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const url = text.split(' ').slice(1).join(' ').trim();

        if (!url || !url.includes('facebook.com')) {
            return await sock.sendMessage(chatId, { text: '❌ Weka link ya Facebook baada ya command.\nMfano: .fb https://fb.watch/xyz' }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });

        const apiKey = "dew_SHmZ6Kcc67WTZqLfC3GGC774gANCHhtfIudTPQak";
        const apiUrl = `https://api.srihub.store/download/facebook?url=${encodeURIComponent(url)}&apikey=${apiKey}`;
        
        const res = await axios.get(apiUrl, { timeout: 20000 });
        const data = res.data;

        // UKAGUZI WA DATA (Kulingana na mfano wako)
        if (!data.success || !data.result || !data.result.result) {
            return await sock.sendMessage(chatId, { text: '❌ Video haikupatikana. API imerudisha majibu tupu.' }, { quoted: message });
        }

        const videoInfo = data.result;
        const videoList = data.result.result; // Hii ndio Array yenye HD, SD, n.k.
        const title = videoInfo.title || "Facebook Video";
        const thumbnail = videoInfo.thumbnail;

        const cards = [];

        // Tunatengeneza Kadi kwa kila Quality iliyopatikana (HD, SD, etc)
        for (let i = 0; i < videoList.length; i++) {
            const vid = videoList[i];
            
            // Tunachuja machaguo makuu tu (HD na SD) ili kadi zisiwe nyingi sana
            if (!vid.quality.includes("HD") && !vid.quality.includes("SD")) continue;

            let imageMsg;
            try {
                imageMsg = await prepareWAMessageMedia({ image: { url: thumbnail } }, { upload: sock.waUploadToServer });
            } catch {
                imageMsg = null;
            }

            cards.push({
                header: proto.Message.InteractiveMessage.Header.create({
                    ...(imageMsg || {}),
                    title: `*Quality: ${vid.quality}*`,
                    hasMediaAttachment: !!imageMsg,
                }),
                body: { text: `Ubora: ${vid.quality}\nMuda: ${videoInfo.duration || 'N/A'}` },
                footer: { text: "Loft Quantum X7" },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "quick_reply",
                            buttonParamsJson: JSON.stringify({
                                display_text: `PAKUA ${vid.quality}`,
                                id: `fb_dl_${i}` // Tunatumia index ili kupata link kirahisi
                            })
                        }
                    ]
                }
            });
        }

        const carouselMessage = generateWAMessageFromContent(
            chatId,
            {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            body: { text: `🎬 *LOFT FB DOWNLOADER*\n\n*Title:* ${title}\n\n_Slide kushoto kuchagua ubora wa video._` },
                            carouselMessage: { cards, messageVersion: 1 }
                        }
                    }
                }
            },
            { quoted: message }
        );

        await sock.relayMessage(chatId, carouselMessage.message, { messageId: carouselMessage.key.id });

        // LISTENER YA BUTTONS
        const fbListener = async (m) => {
            const mek = m.messages[0];
            if (!mek.message || mek.key.remoteJid !== chatId) return;

            const response = mek.message?.interactiveResponseMessage?.nativeFlowResponse?.paramsJson;
            if (!response) return;

            const parsed = JSON.parse(response);
            if (parsed.id && parsed.id.startsWith('fb_dl_')) {
                const index = parseInt(parsed.id.replace('fb_dl_', ''));
                const selectedVideo = videoList[index];

                await sock.sendMessage(chatId, { react: { text: '📥', key: mek.key } });

                await sock.sendMessage(chatId, { 
                    video: { url: selectedVideo.url }, 
                    mimetype: 'video/mp4', 
                    caption: `✅ *Amefanikisha!*\n\n*Title:* ${title}\n*Quality:* ${selectedVideo.quality}` 
                }, { quoted: mek });

                // Jiondoe kwenye listener baada ya kutuma
                sock.ev.off('messages.upsert', fbListener);
            }
        };

        sock.ev.on('messages.upsert', fbListener);

    } catch (error) {
        console.error('FB ERROR:', error);
        await sock.sendMessage(chatId, { text: `❌ Hitilafu: ${error.message}` });
    }
}

module.exports = facebookCommand;
