const gtts = require('gtts');
const fs = require('fs');
const path = require('path');
const isAdmin = require('../lib/isAdmin'); 

function stripEmoji(text) {
    if (!text || typeof text !== 'string') return text;
    return text.replace(/[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}|\u{1F1E6}-\u{1F1FF}]/gu, '');
}

async function tagAllCommand(sock, chatId, senderId, message) {
    try {
        // Tunaita isAdmin ku-check kama Bot ni Admin (lazima iwe admin ili ipate list ya members)
        const { isBotAdmin } = await isAdmin(sock, chatId, senderId);

        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { text: '⚠️ Plz, nifanye niwe *Admin* ili niweze ku-tag members wote.' }, { quoted: message });
            return;
        }

        // Pata metadata ya group
        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants;

        if (!participants || participants.length === 0) return;

        // 1. Andaa Text ya TagAll (Normal Message)
        let messageText = `📢 *TAG ALL BY MICKEY GLITCH*\n\n`;
        messageText += `👥 *Jumla:* ${participants.length}\n`;
        messageText += `👤 *Aliyeita:* @${senderId.split('@')[0]}\n\n`;

        participants.forEach(p => {
            messageText += `◦ @${p.id.split('@')[0]}\n`;
        });

        messageText = stripEmoji(messageText);

        // 2. Tengeneza Sauti (Voice Note) kwa gTTS
        // Unaweza kubadili maneno ya kusemwa hapa
        const audioText = `Habari wanakikundi, mnaitwa wote na @${senderId.split('@')[0]}. Tafadhali angalieni tangazo hili muhimu sasa hivi.`;
        const fileName = `tagall_${Date.now()}.mp3`;
        const filePath = path.join(__dirname, fileName);
        
        const speech = new gtts(audioText, 'sw'); // Lugha ya Kiswahili

        // Hifadhi audio kisha itume
        speech.save(filePath, async function (err) {
            if (err) {
                console.error("gTTS Error:", err);
                return;
            }

            // A) Tuma Text Tag kwanza
            const sentText = await sock.sendMessage(chatId, {
                text: messageText,
                mentions: participants.map(p => p.id)
            }, { quoted: message });

            // B) Tuma Voice Note (Audio) yenye Mentions pia
            const sentAudio = await sock.sendMessage(chatId, {
                audio: { url: filePath },
                mimetype: 'audio/mp4',
                ptt: true, // Inatokea kama Voice Note (VN)
                mentions: participants.map(p => p.id)
            }, { quoted: message });

            // Futa file la audio baada ya kutuma ili kupunguza uchafu (cleanup)
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

            // C) Kufuta ujumbe wa text baada ya sekunde 30 (Kama ulivyoelekeza)
            if (sentText && sentText.key) {
                setTimeout(async () => {
                    try {
                        await sock.sendMessage(chatId, { delete: sentText.key });
                        // Unaweza kufuta na audio pia ukipenda kwa kuongeza sentAudio.key hapa
                    } catch (err) {
                        console.error('Auto-delete failed:', err.message);
                    }
                }, 30000);
            }
        });

    } catch (error) {
        console.error('Error in tagall command:', error);
        await sock.sendMessage(chatId, { text: '❌ Imeshindwa kukamilisha TagAll.' });
    }
}

module.exports = tagAllCommand;
