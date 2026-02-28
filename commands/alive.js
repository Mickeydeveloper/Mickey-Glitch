const os = require('os');
const { performance } = require('perf_hooks');

/**
 * Fupisha uptime (Shorten uptime)
 */
const formatUptime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return `${h}h ${m}m ${s}s`;
};

const aliveCommand = async (conn, chatId, msg) => {
    // Anza kupiga picha ya muda (Start timer for speed)
    const start = performance.now();
    
    try {
        // Typing indicator fast
        await conn.sendPresenceUpdate('composing', chatId);

        const dateObj = new Date();
        const options = { timeZone: 'Africa/Dar_es_Salaam', hour12: true };
        const time = dateObj.toLocaleTimeString('en-GB', options);
        const date = dateObj.toLocaleDateString('en-GB', options);

        // System Stats Fix
        const end = performance.now();
        const ping = (end - start).toFixed(0); // Real-time response speed
        const ram = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
        const cpu = os.cpus()[0]?.model.split('@')[0].trim() || 'Generic';

        const imageUrl = 'https://water-billimg.onrender.com/1761205727440.png';

        const caption = `*ＭＩＣＫＥＹ-ＧＬＩＴＣＨ-Ｖ３*

┌─〔 *USER INFO* 〕──
┃ 👤 *User:* \`${msg.pushName || 'User'}\`
┃ 🕒 *Time:* \`${time}\`
┃ 📅 *Date:* \`${date}\`
└───────────────

┌─〔 *SYSTEM STATUS* 〕──
┃ 🚀 *Ping:* \`${ping}ms\`
┃ ⏳ *Uptime:* \`${formatUptime(process.uptime())}\`
┃ 🧠 *RAM:* \`${ram}MB / ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(0)}GB\`
┃ 🔧 *CPU:* \`${cpu}\`
┃ 🟢 *Status:* \`Active\`
└───────────────

_Powered by Mickey Glitch_`;

        // Tuma kwa haraka (Quick send)
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
                    title: 'ＭＩＣＫＥＹ Ｖ３ ＡＬＩＶＥ',
                    body: `Speed: ${ping}ms | Status: Stable`,
                    thumbnailUrl: imageUrl,
                    sourceUrl: 'https://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A',
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    showAdAttribution: true
                }
            }
        }, { quoted: msg });

    } catch (e) {
        console.error('❌ Alive Err:', e);
    }
};

module.exports = aliveCommand;
