const moment = require('moment-timezone');

const aliveCommand = async (conn, chatId, msg) => {
    try {
        // 1. Fanya bot ionekane inaandika (Typing...)
        await conn.sendPresenceUpdate('composing', chatId);
        
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);

        const statusText = `*MICKEY GLITCH V3* 🚀
        
*User*: ${msg.pushName}
*Status*: Active 🟢
*Uptime*: ${hours}h ${minutes}m
*Ping*: ${Date.now() - msg.messageTimestamp * 1000}ms

_Mickey Glitch Bot sasa inatumia mfumo wa v3.2.0 wenye kasi zaidi. Andika .menu kuona amri zote._`;

        // 2. Tuma ujumbe wenye Kadi kubwa (AdReply)
        await conn.sendMessage(chatId, {
            text: statusText,
            contextInfo: {
                isForwarded: true,
                forwardingScore: 999,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363398106360290@newsletter',
                    newsletterName: '🅼🅸🅲🅺🅴𝚈',
                    serverMessageId: 143
                },
                externalAdReply: {
                    title: "ᴍɪᴄᴋᴇʏ ɢʟɪᴛᴄʜ ᴠ3 ᴏɴʟɪɴᴇ",
                    body: "Click here to Join Support Channel",
                    thumbnailUrl: 'https://water-billimg.onrender.com/1761205727440.png',
                    sourceUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26',
                    mediaType: 1,
                    renderLargerThumbnail: true // Hii ndio siri ya muonekano mzuri
                }
            }
        }, { quoted: msg });

    } catch (e) {
        console.log(e);
    }
};

module.exports = aliveCommand;
