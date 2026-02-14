const moment = require('moment-timezone');

const aliveCommand = async (conn, chatId, msg) => {
    try {
        // Show typing presence
        await conn.sendPresenceUpdate('composing', chatId);

        // ===== UPTIME =====
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        // ===== PING SAFE =====
        let ping = 0;
        if (msg.messageTimestamp) {
            ping = Date.now() - (msg.messageTimestamp * 1000);
        }

        // ===== TIME =====
        const time = moment().tz('Africa/Dar_es_Salaam').format('HH:mm:ss');

        // ===== STATUS TEXT (Improved UI) =====
        const statusText = `
╭━━〔 *MICKEY GLITCH V3* 🚀 〕━━⬣
┃ 👤 User : ${msg.pushName || 'User'}
┃ 🟢 Status : Online & Active
┃ ⏰ Time : ${time}
┃ ⚡ Ping : ${ping} ms
┃ 🖥 Uptime : ${hours}h ${minutes}m ${seconds}s
╰━━━━━━━━━━━━━━━━⬣

💡 _System v3.2.0 Fast Performance_
📌 Andika *.menu* kuona commands zote.
`;

        // ===== SEND MESSAGE WITH BIG PREVIEW CARD =====
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
                    title: "MICKEY GLITCH V3 ONLINE",
                    body: "Join Support Channel",
                    thumbnailUrl: 'https://water-billimg.onrender.com/1761205727440.png',
                    sourceUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26',
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: msg });

    } catch (error) {
        console.log('Alive Command Error:', error);
    }
};

module.exports = aliveCommand;
