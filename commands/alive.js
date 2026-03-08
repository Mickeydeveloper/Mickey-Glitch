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
    // Check if socket is ready
    if (!conn || typeof conn.sendMessage !== 'function') {
        return;
    }

    // Anza kupiga picha ya muda (Start timer for speed)
    const start = performance.now();
    
    try {
        // Typing indicator fast (safe)
        try {
            await conn.sendPresenceUpdate('composing', chatId);
        } catch (e) {
            // Silent
        }

        const dateObj = new Date();
        const options = { timeZone: 'Africa/Dar_es_Salaam', hour12: true };
        const time = dateObj.toLocaleTimeString('en-GB', options);
        const date = dateObj.toLocaleDateString('en-GB', options);

        // System Stats Fix
        const end = performance.now();
        const ping = (end - start).toFixed(0); // Real-time response speed
        const ram = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
        const cpu = os.cpus()[0]?.model.split('@')[0].trim() || 'Generic';

        const imageUrl = 'https://water-billing-292n.onrender.com/1761205727440.png';

        const caption = `*ＭＩＣＫＥＹ-ＧＬＩＴＣＨ-Ｖ３*

┌─〔 *USER INFO* 〕──
┃ 👤 *User:* \`${msg.pushName || 'User'}\`
┃ 🕒 *Time:* \`${time}\`
┃ 📅 *Date:* \`${date}\`
└───────────────

┌─〔 *SYSTEM STATUS* 〕──
┃ 🚀 *Ping:* \`${ping}ms\` ${ping < 100 ? '⚡' : ping < 500 ? '🟢' : '🟡'}
┃ ⏳ *Uptime:* \`${formatUptime(process.uptime())}\`
┃ 🧠 *RAM:* \`${ram}MB / ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(0)}GB\`
┃ 💾 *Free RAM:* \`${(os.freemem() / 1024 / 1024 / 1024).toFixed(1)}GB\`
┃ 🔧 *CPU:* \`${cpu}\`
┃ 🖥️ *Platform:* \`${os.platform()}\`
┃ 🟢 *Status:* \`Active & Stable\`
┃ 📊 *Node.js:* \`${process.version}\`
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
                    title: '𝐌𝐈𝐂𝐊𝐄𝐘 𝐕𝟑 𝐀𝐋𝐈𝐕𝐄',
                    body: `⚡ Speed: ${ping}ms | 🟢 Status: Stable | ⏳ Uptime: ${formatUptime(process.uptime())}`,
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
        
        // Fallback message if something goes wrong
        try {
            await conn.sendMessage(chatId, {
                text: `🟢 *BOT IS ALIVE*\n\n⚡ Response Time: ${performance.now().toFixed(0)}ms\n⏳ Uptime: ${formatUptime(process.uptime())}\n\n_Powered by Mickey Glitch_`
            }, { quoted: msg });
        } catch (fallbackErr) {
            console.error('❌ Fallback Alive Err:', fallbackErr);
        }
    }
};

module.exports = aliveCommand;
