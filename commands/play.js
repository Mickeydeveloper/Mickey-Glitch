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

        // 3. API Call with Fallback
        let audioUrl = null;
        let apiError = null;

        try {
            const api = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(v.url)}`;
            const res = await axios.get(api, { timeout: 30000 });

            // Check if API returned error
            if (res.data?.status === false) {
                apiError = res.data?.error || 'API error';
                throw new Error(apiError);
            }

            /**
             * DYNAMIC URL FINDER
             * Inakagua JSON yote kutafuta link ya download
             */
            const findAudioUrl = (obj, depth = 0) => {
                if (!obj || typeof obj !== 'object' || depth > 5) return null;
                
                // Angalia keys zinazotumiwa mara kwa mara
                const keys = ['high', 'low', 'url', 'link', 'download', 'audio', 'mp3', 'audioUrl', 'audioLink'];
                for (let key of keys) {
                    if (typeof obj[key] === 'string' && obj[key].startsWith('http')) {
                        return obj[key];
                    }
                }

                // Kama haipo, ingia ndani zaidi (Recursion)
                for (let key in obj) {
                    const found = findAudioUrl(obj[key], depth + 1);
                    if (found) return found;
                }
                return null;
            };

            audioUrl = findAudioUrl(res.data);

            if (!audioUrl) {
                console.error("❌ JSON Response Structure:", res.data);
                throw new Error("Invalid API response - Audio link haijapatikana");
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
