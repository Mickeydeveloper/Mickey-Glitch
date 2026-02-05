const axios = require('axios');
const { prepareWAMessageMedia, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

async function facebookCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const url = text.split(' ').slice(1).join(' ').trim();

        if (!url || !url.includes('facebook.com')) {
            return await sock.sendMessage(chatId, { text: '❌ Tafadhali weka link ya Facebook.\nMfano: .fb https://www.facebook.com/video...' }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });

        // 1. API Configuration
        const apiKey = "dew_SHmZ6Kcc67WTZqLfC3GGC774gANCHhtfIudTPQak";
        // MUHIMU: Nimesahihisha API URL hapa chini
        const apiUrl = `https://api.srihub.store/download/facebook?url=${encodeURIComponent(url)}&apikey=${apiKey}`;
        
        const res = await axios.get(apiUrl, { timeout: 15000 }).catch(() => null);
        
        if (!res || !res.data || !res.data.result) {
            return await sock.sendMessage(chatId, { text: '❌ API haijapatikana au Key imekwisha. Jaribu baadae.' }, { quoted: message });
        }

        const result = res.data.result;
        const title = result.title || "Facebook Video";
        const thumbnail = result.thumbnail || "https://wallpapercave.com/wp/wp2555083.jpg";
        
        // 2. Kutayarisha machaguo ya Video
        const cards = [];
        const mediaSources = [
            { id: 'hd', label: 'High Quality (HD)', url: result.media?.video_hd },
            { id: 'sd', label: 'Standard Quality (SD)', url: result.media?.video_sd }
        ].filter(v => v.url); // Inachuja kama HD au SD haipo

        if (mediaSources.length === 0) {
            return await sock.sendMessage(chatId, { text: '❌ Samahani, video hii haipatikani kwa sasa.' }, { quoted: message });
        }

        // 3. Kutengeneza Kadi za Slide
        for (const vid of mediaSources) {
            let imageMsg;
            try {
                // Tunatumia thumbnail ya video, kama ikigoma tunatumia picha ya kawaida
                imageMsg = await prepareWAMessageMedia({ image: { url: thumbnail } }, { upload: sock.waUploadToServer });
            } catch {
                imageMsg = null;
            }

            cards.push({
                header: proto.Message.InteractiveMessage.Header.create({
                    ...(imageMsg || {}),
                    title: `*${vid.label}*`,
                    hasMediaAttachment: !!imageMsg,
                }),
                body: { text: `Bofya hapa chini kupakua ubora wa ${vid.id.toUpperCase()}` },
                footer: { text: "Loft Quantum X7" },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "quick_reply",
                            buttonParamsJson: JSON.stringify({
                                display_text: `DOWNLOAD ${vid.id.toUpperCase()}`,
                                id: `dl_fb_${vid.id}`
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
                            body: { text: `🎬 *VIDEO FOUND*\n\n*Title:* ${title}\n\n_Slide kushoto kuona machaguo ya ubora._` },
                            carouselMessage: { cards, messageVersion: 1 }
                        }
                    }
                }
            },
            { quoted: message }
        );

        await sock.relayMessage(chatId, carouselMessage.message, { messageId: carouselMessage.key.id });

        // 4. Listener ya Button (Njia ya Uhakika)
        const fbButtonListener = async (m) => {
            const mek = m.messages[0];
            if (!mek.message || mek.key.remoteJid !== chatId) return;

            // Kupata ID ya button iliyobonyezwa
            const response = mek.message?.interactiveResponseMessage?.nativeFlowResponse?.paramsJson;
            if (!response) return;

            const parsed = JSON.parse(response);
            if (parsed.id && parsed.id.startsWith('dl_fb_')) {
                const type = parsed.id.split('_')[2]; // 'hd' au 'sd'
                const finalUrl = type === 'hd' ? result.media.video_hd : result.media.video_sd;

                await sock.sendMessage(chatId, { react: { text: '📥', key: mek.key } });
                
                // Tunatuma video
                await sock.sendMessage(chatId, { 
                    video: { url: finalUrl }, 
                    mimetype: 'video/mp4', 
                    caption: `✅ *Facebook Video (${type.toUpperCase()})*\n\n${title}` 
                }, { quoted: mek });

                // Tunajiondoa kwenye listener ili kuzuia memory leak
                sock.ev.off('messages.upsert', fbButtonListener);
            }
        };

        sock.ev.on('messages.upsert', fbButtonListener);

    } catch (error) {
        console.error('FB Fix Error:', error);
        // Hii itakupa maelezo zaidi kwenye console kwanini inafeli
        await sock.sendMessage(chatId, { text: `❌ Hitilafu ya kiufundi: ${error.message}` });
    }
}

module.exports = facebookCommand;
