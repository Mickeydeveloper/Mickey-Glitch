const axios = require('axios');
const { prepareWAMessageMedia, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

async function facebookCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const url = text.split(' ').slice(1).join(' ').trim();

        if (!url || !url.includes('facebook.com')) {
            return await sock.sendMessage(chatId, { text: '❌ Weka link ya Facebook. Mfano: .fb https://fb.watch/xyz' }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });

        const apiKey = "dew_SHmZ6Kcc67WTZqLfC3GGC774gANCHhtfIudTPQak";
        const apiUrl = `https://api.srihub.store/download/facebook?url=${encodeURIComponent(url)}&apikey=${apiKey}`;
        
        const res = await axios.get(apiUrl, { timeout: 20000 });
        const data = res.data;

        if (!data.success || !data.result || !data.result.result) {
            return await sock.sendMessage(chatId, { text: '❌ API haijapata data za video hii.' }, { quoted: message });
        }

        const videoInfo = data.result;
        const videoList = data.result.result; 
        const title = videoInfo.title || "Facebook Video";
        const thumbnail = videoInfo.thumbnail;

        const cards = [];

        // Kutengeneza Kadi za Slide
        for (let i = 0; i < videoList.length; i++) {
            const vid = videoList[i];
            
            // Tunachukua HD na SD pekee ili kupunguza kadi
            if (!vid.quality.includes("HD") && !vid.quality.includes("SD")) continue;

            let imageMsg = null;
            try {
                imageMsg = await prepareWAMessageMedia({ image: { url: thumbnail } }, { upload: sock.waUploadToServer });
            } catch (e) { console.log("Thumbnail error: ", e.message); }

            cards.push({
                header: proto.Message.InteractiveMessage.Header.create({
                    ...(imageMsg || {}),
                    title: `*Quality: ${vid.quality}*`,
                    hasMediaAttachment: !!imageMsg,
                }),
                body: { text: `Ubora: ${vid.quality}\nMuda: ${videoInfo.duration || '3:00'}` },
                footer: { text: "Loft Quantum X7" },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "quick_reply",
                            buttonParamsJson: JSON.stringify({
                                display_text: `PAKUA ${vid.quality}`,
                                id: `fb_v_${i}` // Hii ndio ID tutakayoisoma
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
                            body: { text: `🎬 *LOFT FB DOWNLOADER*\n\n*Title:* ${title}\n\n_Chagua ubora hapa chini:_` },
                            carouselMessage: { cards, messageVersion: 1 }
                        }
                    }
                }
            },
            { quoted: message }
        );

        // Tunatuma Carousel
        const sentMsg = await sock.relayMessage(chatId, carouselMessage.message, { messageId: carouselMessage.key.id });

        // --- SEHEMU MUHIMU: LISTENER YA KUTUMA VIDEO ---
        const fbDownloaderListener = async (m) => {
            const mek = m.messages[0];
            if (!mek.message) return;

            // 1. Kutafuta ID ya button iliyobonyezwa
            const interactiveResponse = mek.message?.interactiveResponseMessage;
            const paramsJson = interactiveResponse?.nativeFlowResponse?.paramsJson;
            
            if (!paramsJson) return;

            const buttonData = JSON.parse(paramsJson);
            
            // 2. Kuangalia kama ID inaanza na 'fb_v_'
            if (buttonData.id && buttonData.id.startsWith('fb_v_')) {
                const index = parseInt(buttonData.id.replace('fb_v_', ''));
                const selectedVideo = videoList[index];

                if (!selectedVideo) return;

                // React kuonyesha bot inapakua
                await sock.sendMessage(chatId, { react: { text: '📥', key: mek.key } });

                try {
                    // 3. Kutuma Video yenyewe
                    await sock.sendMessage(chatId, { 
                        video: { url: selectedVideo.url }, 
                        mimetype: 'video/mp4', 
                        caption: `✅ *Tayari!*\n\n*Title:* ${title}\n*Quality:* ${selectedVideo.quality}`,
                        fileName: `video.mp4`
                    }, { quoted: mek });
                } catch (err) {
                    await sock.sendMessage(chatId, { text: "❌ Imefeli kutuma file la video. Link inaweza kuwa imekufa." });
                }

                // Muhimu: Zima listener ili isijirudie
                sock.ev.off('messages.upsert', fbDownloaderListener);
            }
        };

        // Washa listener
        sock.ev.on('messages.upsert', fbDownloaderListener);

    } catch (error) {
        console.error('FB Error:', error);
        await sock.sendMessage(chatId, { text: `❌ Hitilafu: ${error.message}` });
    }
}

module.exports = facebookCommand;
