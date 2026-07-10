const axios = require('axios');
const { prepareWAMessageMedia } = require('@whiskeysockets/baileys');

const AXIOS_DEFAULTS = {
    timeout: 60000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
};

async function tryRequest(getter, attempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await getter();
        } catch (err) {
            lastError = err;
            if (attempt < attempts) await new Promise(r => setTimeout(r, 1000 * attempt));
        }
    }
    throw lastError;
}

// Function ya kupata data kutoka kwenye API
async function getTiktokDownload(url) {
    const apiUrl = `https://api-aswin-sparky.koyeb.app/api/downloader/tiktok?url=${encodeURIComponent(url)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));

    if (!res || !res.data || !res.data.status || !res.data.data) {
        throw new Error('No response from TikTok API');
    }

    const d = res.data.data;
    const videoUrl = d.video;
    if (!videoUrl) throw new Error('Could not find video URL in API response');

    return { 
        url: videoUrl, 
        title: d.title, 
        nickname: d.author?.nickname,
        thumbnail: d.thumbnail 
    };
}

async function tiktokCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const url = text.split(' ').slice(1).join(' ').trim();

        if (!url || !url.includes('tiktok.com')) {
            return await sock.sendMessage(chatId, { 
                text: '❌ Weka link ya TikTok. Mfano: .tiktok https://www.tiktok.com/@user/video/123' 
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

        let tikData;
        try {
            tikData = await getTiktokDownload(url);
        } catch (err) {
            console.error("API Error:", err.message);
            return await sock.sendMessage(chatId, { text: '❌ API imeshindwa (Error). Jaribu tena baadaye.' }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

        // ==============================================
        // 🤖 META AI VIDEO LAYOUT INTEGRATION (FIXED)
        // ==============================================
        try {
            const captionText = `✅ *TikTok Downloader*\n\n👤 *Author:* ${tikData.nickname || 'N/A'}\n📝 *Title:* ${tikData.title || 'No Title'}\n🔗 *Source:* ${url}`;

            // Kuandaa video message structure kupitia Baileys ili ipate token ya server
            const mediaUploaded = await prepareWAMessageMedia(
                { video: { url: tikData.url } }, 
                { upload: sock.waUploadToServer }
            );

            const metaAiVideoMessage = {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            header: {
                                title: "✨ MICKEY VIDEO ENGINE",
                                hasMediaAttachment: true,
                                videoMessage: mediaUploaded.videoMessage
                            },
                            body: {
                                text: captionText
                            },
                            footer: {
                                text: "⚡ Mickey Glitch v3.0.5"
                            },
                            nativeFlowMessage: {
                                buttons: [
                                    {
                                        name: "cta_url",
                                        buttonParamsJson: JSON.stringify({
                                            display_text: "Fungua Source Link 🌐",
                                            url: url
                                        })
                                    },
                                    {
                                        name: "quick_reply",
                                        buttonParamsJson: JSON.stringify({
                                            display_text: "Owner 👑",
                                            id: ".owner"
                                        })
                                    }
                                ]
                            }
                        }
                    }
                }
            };

            // Kutuma ujumbe kwa kutumia njia salama kabisa ya relayMessage
            await sock.relayMessage(chatId, metaAiVideoMessage, { quoted: message });

        } catch (err) {
            console.error("Meta AI Layout Send Error:", err.message);
            await sock.sendMessage(chatId, { text: '🚨 *Hitilafu ya kutuma!* Muundo wa kadi umefeli kwenye video hii.' });
            return;
        }

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error("TIKTOK CMD ERROR:", err.message);
        await sock.sendMessage(chatId, { text: '🚨 *Hitilafu!* Jaribu tena baadae.' });
    }
}

module.exports = tiktokCommand;
