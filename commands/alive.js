const os = require('os');

/**
 * Formats uptime into a very compact string
 */
const formatUptime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return `${h}h ${m}m ${s}s`;
};

const aliveCommand = async (conn, chatId, msg) => {
    try {
        // Alama ya compose kuanza mara moja kwa spidi
        await conn.sendPresenceUpdate('composing', chatId);

        // Muda na Tarehe bila kutumia moment (Faster performance)
        const dateObj = new Date();
        const time = dateObj.toLocaleTimeString('en-GB', { timeZone: 'Africa/Dar_es_Salaam' });
        const date = dateObj.toLocaleDateString('en-GB', { timeZone: 'Africa/Dar_es_Salaam' });

        // Speed & System Stats
        const stats = {
            ping: msg?.messageTimestamp ? `${Date.now() - (msg.messageTimestamp * 1000)}ms` : '0ms',
            uptime: formatUptime(process.uptime()),
            ram: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(1)}MB`,
            cpu: os.cpus()[0]?.model.replace(/\(R\)|\(TM\)|Core|Processor|CPU/g, '').trim() || 'System',
        };

        const imageUrl = 'https://water-billimg.onrender.com/1761205727440.png';

        // Custom Appearance (Minimalist & Professional)
        const caption = `*ＭＩＣＫＥＹ-ＧＬＩＴＣＨ-Ｖ３*

┌─〔 *USER INFO* 〕──
┃ 👤 *User:* \`${msg.pushName || 'Guest'}\`
┃ 🕒 *Time:* \`${time}\`
┃ 📅 *Date:* \`${date}\`
└───────────────

┌─〔 *SYSTEM STATUS* 〕──
┃ 🚀 *Ping:* \`${stats.ping}\`
┃ ⏳ *Uptime:* \`${stats.uptime}\`
┃ 🧠 *RAM:* \`${stats.ram}\`
┃ 🔧 *CPU:* \`${stats.cpu}\`
┃ 🟢 *Status:* \`Operational\`
└───────────────

_Powered by Mickey Glitch_`;

        await conn.sendMessage(chatId, {
            text: caption,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363398106360290@newsletter',
                    newsletterName: '🅼🅸🅲🅺🅴𝚈 🚀',
                    serverMessageId: 1
                },
                externalAdReply: {
                    title: 'MICKEY GLITCH V3: ONLINE',
                    body: `Latency: ${stats.ping} | Speed: 100%`,
                    thumbnailUrl: imageUrl,
                    sourceUrl: 'https://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A',
                    mediaType: 1,
                    renderLargerThumbnail: true, // Hii inaleta ule muonekano mkubwa wa picha
                    showAdAttribution: true
                }
            }
        }, { quoted: msg });

    } catch (error) {
        console.error('❌ Alive Error:', error);
    }
};

module.exports = aliveCommand;
