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
        // Check kama Bot ni Admin
        const { isBotAdmin } = await isAdmin(sock, chatId, senderId);

        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { text: '⚠️ Nifanye niwe *Admin* ili niweze ku-tag members.' }, { quoted: message });
            return;
        }

        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants;

        if (!participants || participants.length === 0) return;

        // 1. Andaa Ujumbe wa Maandishi (Text Message) kama mwanzo
        let messageText = `📢 *TAG ALL BY MICKEY GLITCH*\n\n`;
        messageText += `👥 *Jumla:* ${participants.length}\n`;
        messageText += `👤 *Aliyeita:* @${senderId.split('@')[0]}\n\n`;

        participants.forEach(p => {
            messageText += `◦ @${p.id.split('@')[0]}\n`;
        });

        messageText = stripEmoji(messageText);

        // 2. Boresha Audio (Ujumbe wa jumla kwa wote)
        // Hapa audio inakuwa fupi na inasikika vizuri zaidi
        const audioText = `Habari wanakikundi wote! Kuna ujumbe muhimu uliotumwa hapa hapa kwenye group na @${senderId.split('@')[0]}. Tafadhali kila mmoja aangalie sasa hivi asije kupitwa. Ahsanteni!`;
        
        const fileName = `tagall_voice_${Date.now()}.mp3`;
        const filePath = path.join(__dirname, fileName);
        
        const speech = new gtts(audioText, 'sw');

        speech.save(filePath, async function (err) {
            if (err) {
                console.error("gTTS Error:", err);
                return;
            }

            // A) Tuma Text Message yenye list ya majina
            const sentText = await sock.sendMessage(chatId, {
                text: messageText,
                mentions: participants.map(p => p.id)
            }, { quoted: message });

            // B) Tuma Voice Note (VN) inayojumuisha wote
            const sentAudio = await sock.sendMessage(chatId, {
                audio: { url: filePath },
                mimetype: 'audio/mp4',
                ptt: true, 
                mentions: participants.map(p => p.id) 
            }, { quoted: message });

            // Cleanup: Futa file la audio
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

            // C) Futa ujumbe wa maandishi baada ya sekunde 30
            if (sentText && sentText.key) {
                setTimeout(async () => {
                    try {
                        await sock.sendMessage(chatId, { delete: sentText.key });
                    } catch (err) {
                        console.error('Auto-delete failed:', err.message);
                    }
                }, 30000);
            }
        });

    } catch (error) {
        console.error('Error in tagall command:', error);
        await sock.sendMessage(chatId, { text: '❌ Imeshindwa kutekeleza TagAll.' });
    }
}

module.exports = tagAllCommand;
