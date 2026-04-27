/**
 * play.js - MIKI MUSIC (DYNAMIC VERSION)
 * Inatafuta URL ya audio moja kwa moja bila kujali muundo wa JSON
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

    // Reaction ya kutafuta
    await sock.sendMessage(chatId, {
        react: { text: '🔍', key: message.key }
    }).catch(() => {});

    try {
        // 1. YouTube Search
        const search = await yts(query);
        const v = search?.videos?.[0];

        if (!v) {
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
            return sock.sendMessage(chatId, { text: '❌ *Sikuipata!*' }, { quoted: message });
        }

        // 2. Tuma Thumbnail na Info
        await sock.sendMessage(chatId, {
            image: { url: v.thumbnail },
            caption: `╭━━━━〔 *PLAYING* 〕━━━━┈⊷\n┃ 🎵 *Title:* ${v.title}\n┃ ⏳ *Duration:* ${v.timestamp}\n┃ 👤 *Channel:* ${v.author.name}\n╰━━━━━━━━━━━━━━━━━━━━┈⊷`
        }, { quoted: message });

        // 3. API Call - New YouTube API Structure
        let audioUrl = null;

        try {
            const api = `https://nayan-video-downloader.vercel.app/youtube?url=${encodeURIComponent(v.url)}`;
            const res = await axios.get(api, { timeout: 30000 });

            // Check if API request was successful (accept 200 or true)
            const topStatus = res.data?.status;
            if (topStatus !== 200 && topStatus !== true) {
                throw new Error(`API Error - Invalid status: ${topStatus}`);
            }

            // Check if API data processing was successful
            if (!res.data?.data || !res.data.data.status) {
                const error = res.data?.data?.error || 'API processing failed';
                throw new Error(error);
            }

            // Extract formats array from nested structure
            const formats = res.data?.data?.data?.formats;
            
            if (!Array.isArray(formats) || formats.length === 0) {
                console.error("❌ API Response:", res.data);
                throw new Error("No formats available in API response");
            }

            // Find audio format - prefer audio_only or video_with_audio
            const audioFormat = formats.find(f => 
                f.type === 'audio' || f.type === 'audio_only' || f.ext === 'mp3' || f.ext === 'aac'
            ) || formats[formats.length - 1]; // Fallback to last format

            audioUrl = audioFormat?.url;

            if (!audioUrl || !audioUrl.startsWith('http')) {
                console.error("❌ Formats available:", formats.map(f => ({ type: f.type, ext: f.ext })));
                throw new Error("Audio URL not found in formats");
            }
        } catch (apiErr) {
            console.error("❌ API Error:", apiErr.message);
            throw new Error(`API Error: ${apiErr.message}`);
        }

        if (!audioUrl) {
            throw new Error("Failed to extract audio URL");
        }

        // 4. Download Audio kama Buffer
        const audioRes = await axios.get(audioUrl, { 
            responseType: 'arraybuffer', 
            timeout: 60000,
            headers: { 'User-Agent': 'Mozilla/5.0' } 
        });
        const audioBuffer = Buffer.from(audioRes.data);

        // 5. Tuma Audio kulingana na muundo wa Baileys
        await sock.sendMessage(chatId, {
            audio: audioBuffer,
            mimetype: 'audio/mp4', // 'audio/mp4' inafanya kazi vizuri zaidi kwny WA
            fileName: `${v.title}.mp3`,
            ptt: false
        }, { quoted: message });

        // Success Reaction
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
