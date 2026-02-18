const moment = require('moment-timezone');

const aliveCommand = async (conn, chatId, msg) => {
    try {
        // Show typing presence
        await conn.sendPresenceUpdate('composing', chatId);

        // ===== UPTIME =====
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        // ===== PING SAFE =====
        let ping = 0;
        if (msg.messageTimestamp) {
            ping = Date.now() - (msg.messageTimestamp * 1000);
        }

        // ===== TIME & DATE (TANZANIA - 12 HOUR FORMAT) =====
        const time = moment().tz('Africa/Dar_es_Salaam').format('hh:mm:ss A');
        const date = moment().tz('Africa/Dar_es_Salaam').format('DD/MM/YYYY');

        // ===== MEMORY USAGE =====
        const memUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        const memTotal = Math.round(process.memoryUsage().heapTotal / 1024 / 1024);

        // ===== STATUS TEXT (Compact UI) =====
        const statusText = `🤖 *MICKEY GLITCH V3*

👤 User: ${msg.pushName || 'User'}
🟢 Status: Online & Active
🕐 Time: ${time}
📅 Date: ${date}
⚡ Ping: ${ping} ms
⏳ Uptime: ${days}d ${hours}h ${minutes}m ${seconds}s
🧠 Memory: ${memUsage}MB / ${memTotal}MB

💡 Fast • Reliable • Powerful
`;

        // ===== SEND MESSAGE WITH PREVIEW CARD =====
        await conn.sendMessage(chatId, {
            text: statusText,
            contextInfo: {
                isForwarded: true,
                forwardingScore: 999,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363398106360290@newsletter',
                    newsletterName: '🅼🅸🅲🅺🅴𝚈 🚀',
                    serverMessageId: 143
                },
                externalAdReply: {
                    title: "⚡ MICKEY GLITCH V3 - ONLINE",
                    body: "Fast • Reliable • Powerful | Join Support",
                    thumbnailUrl: 'https://water-billimg.onrender.com/1761205727440.png',
                    sourceUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26',
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: msg });

    } catch (error) {
        console.log('❌ Alive Command Error:', error);
    }
};

module.exports = aliveCommand;
