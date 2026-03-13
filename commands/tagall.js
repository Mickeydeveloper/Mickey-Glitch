const gtts = require('gtts');
const fs = require('fs');
const path = require('path');
const isAdmin = require('../lib/isAdmin'); 

// Kazi ya kusafisha majina (Ondoa emoji na alama zisizohitajika kwa sauti)
function cleanName(name) {
    if (!name) return "Mwanachama";
    return name.replace(/[^\w\s]/gi, '').trim();
}

async function tagAllCommand(sock, chatId, senderId, message) {
    try {
        // Bot lazima iwe admin ili kupata majina ya washiriki
        const { isBotAdmin } = await isAdmin(sock, chatId, senderId);

        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { text: '⚠️ Nifanye niwe *Admin* ili niweze kusoma majina ya washiriki.' }, { quoted: message });
            return;
        }

        // Pata metadata ya group
        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants;

        if (!participants || participants.length === 0) return;

        // 1. Tengeneza list ya majina (Badala ya namba)
        // Tunatumia 'notify' name ambayo ndio jina la mtumiaji wa WhatsApp
        let namesList = participants.map(p => cleanName(p.notify || "Mwanachama")).join(", ");

        // 2. Script ya audio
        const audioText = `Habari wanakikundi! Mnaitwa wote na @${senderId.split('@')[0]}. Washiriki wafuatao tafadhali sikilizeni: ${namesList}.`;
        
        const fileName = `tagvoice_${Date.now()}.mp3`;
        const filePath = path.join(__dirname, fileName);
        
        const speech = new gtts(audioText, 'sw'); // Swahili language

        // Hifadhi na Tuma
        speech.save(filePath, async function (err) {
            if (err) {
                console.error("gTTS Error:", err);
                return;
            }

            // Tuma Voice Note (VN) pekee yenye Mentions za siri
            // Hii itawapa notification watu wote bila kutuma text ya majina
            const sentAudio = await sock.sendMessage(chatId, {
                audio: { url: filePath },
                mimetype: 'audio/mp4',
                ptt: true, // Inatokea kama Voice Note
                mentions: participants.map(p => p.id) // Tag za siri
            }, { quoted: message });

            // Futa file la audio baada ya kutumwa
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            // Kufuta Voice Note baada ya sekunde 30 (Kama ukihitaji)
            if (sentAudio && sentAudio.key) {
                setTimeout(async () => {
                    try {
                        await sock.sendMessage(chatId, { delete: sentAudio.key });
                    } catch (err) {
                        console.error('Delete failed:', err.message);
                    }
                }, 30000);
            }
        });

    } catch (error) {
        console.error('Error in tagall command:', error);
        await sock.sendMessage(chatId, { text: '❌ Imeshindwa kutengeneza audio ya tag.' });
    }
}

module.exports = tagAllCommand;
