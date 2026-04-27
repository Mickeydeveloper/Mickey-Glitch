/**
 * play.js - MIKI MUSIC (DYNAMIC VERSION)
 * Imeboreshwa kulingana na JSON mpya ya Nayan API
 */

const yts = require('yt-search');
const axios = require('axios');

async function playCommand(sock, chatId, message, args) {
    const query = Array.isArray(args) ? args.join(' ') : args;

    if (!query) {
        return sock.sendMessage(chatId, {
            text: '╭━━━━〔 *MICKEY MUSIC* 〕━━━━┈⊷\n┃ 📝 `.play [jina la wimbo]`\n╰━━━━━━━━━━━━━━━━━━━━┈⊷'
        }, { quoted: message });
    }

    // Reaction (itikia) kuanza kutafuta
    await sock.sendMessage(chatId, {
        react: { text: '🔍', key: message.key }
    }).catch(() => {});

    try {
        // 1. YouTube Search (Tafuta YT)
        const search = await yts(query);
        const v = search?.videos?.[0];

        if (!v) {
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
            return sock.sendMessage(chatId, { text: '❌ *Sikuipata!*' }, { quoted: message });
        }

        // 2. Tuma Thumbnail na Info (Maelezo)
        await sock.sendMessage(chatId, {
            image: { url: v.thumbnail },
            caption: `╭━━━━〔 *PLAYING* 〕━━━━┈⊷\n┃ 🎵 *Title:* ${v.title}\n┃ ⏳ *Duration:* ${v.timestamp}\n┃ 👤 *Channel:* ${v.author.name}\n╰━━━━━━━━━━━━━━━━━━━━┈⊷`
        }, { quoted: message });

        // 3. API Call - Imebadilishwa kulingana na JSON yako
        let audioUrl = null;

        try {
            // Kutumia endpoint ya 'alldown' kama JSON yako ilivyoonyesha
            const api = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(v.url)}`;
            const res = await axios.get(api, { timeout: 30000 });

            // Kukagua kama status ni 200 (OK)
            if (res.data?.status !== 200 || !res.data?.data?.status) {
                throw new Error("API haijatoa majibu sahihi.");
            }

            // Kuchukua link ya audio (Prefer 'high' quality)
            const videoData = res.data.data.data;
            audioUrl = videoData.high || videoData.low;

            if (!audioUrl) {
                throw new Error("Link ya audio haikupatikana.");
            }
        } catch (apiErr) {
            console.error("❌ API Error:", apiErr.message);
            throw new Error(`API Error: ${apiErr.message}`);
        }

        // 4. Download Audio kama Buffer (Pakua audio)
        const audioRes = await axios.get(audioUrl, { 
            responseType: 'arraybuffer', 
            timeout: 60000,
            headers: { 
                'User-Agent': 'Mozilla/5.0',
                'Referer': 'https://nayan-video-downloader.vercel.app/' 
            } 
        });
        const audioBuffer = Buffer.from(audioRes.data);

        // 5. Tuma Audio (Send to WA)
        await sock.sendMessage(chatId, {
            audio: audioBuffer,
            mimetype: 'audio/mp4', 
            fileName: `${v.title}.mp3`,
            ptt: false
        }, { quoted: message });

        // Success Reaction (Imefanikiwa)
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        }).catch(() => {});

    } catch (err) {
        console.error("❌ PLAY ERROR:", err.message);

        await sock.sendMessage(chatId, {
            react: { text: '❌', key: message.key }
        }).catch(() => {});

        await sock.sendMessage(chatId, {
            text: `❌ *Audio Error!*\n\n_Sababu: ${err.message}_`
        }, { quoted: message });
    }
}

module.exports = playCommand;
