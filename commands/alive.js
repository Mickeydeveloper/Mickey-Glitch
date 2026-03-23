const os = require('os');
const { performance } = require('perf_hooks');

const formatUptime = (secs) => {
    const d = Math.floor(secs / (3600 * 24));
    const h = Math.floor((secs % (3600 * 24)) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return `${d > 0 ? d + 'd ' : ''}${h}h ${m}m ${s}s`;
};

const aliveCommand = async (sock, chatId, msg) => {
    if (!sock || typeof sock.sendMessage !== 'function') return;

    const start = performance.now();

    try {
        await sock.sendPresenceUpdate('composing', chatId);

        const time = new Date().toLocaleTimeString('en-GB', { 
            timeZone: 'Africa/Dar_es_Salaam', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const ping = (performance.now() - start).toFixed(0);
        const totalRam = os.totalmem() / 1024 / 1024 / 1024;
        const usedRam = (process.memoryUsage().heapUsed / 1024 / 1024 / 1024);
        const ramPercent = ((usedRam / totalRam) * 100).toFixed(1);
        const imageUrl = 'https://water-billing-292n.onrender.com/1761205727440.png';

        const textMessage = `╭━━━〔 *ＭＩＣＫＥＹ-Ｖ３* 〕━━━┈⊷
┃ 👤 *Mtumiaji:* ${msg.pushName || 'User'}
┃ 🕒 *Muda:* ${time} EAT
┃ 🚀 *Ping:* ${ping}ms ⚡
╰━━━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 *SYSTEM STATUS* 〕━━━┈⊷
┃ ⏳ *Uptime:* ${formatUptime(process.uptime())}
┃ 🧠 *RAM:* ${usedRam.toFixed(1)}GB / ${totalRam.toFixed(0)}GB (${ramPercent}%)
┃ 🔧 *CPU:* ${os.cpus()[0]?.model.split('@')[0].trim()}
┃ 🟢 *Hali:* Stable & Active
╰━━━━━━━━━━━━━━━━━━┈⊷

_© 2026 Mickey Glitch Technology_`;

        // ────────────────────────────────────────────────
        // MBINU YA AD PEKEE (No Second Media Message)
        // ────────────────────────────────────────────────
        await sock.sendMessage(chatId, {
            text: textMessage, // Tuma kama Text Message
            contextInfo: {
                isForwarded: true,
                forwardingScore: 999,
                showAdAttribution: true, // Lebo ya 'Ad'
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363398106360290@newsletter',
                    newsletterName: '🅼🅸🅲🅺🅴𝚈-𝐆𝐋𝐈𝐓𝐂𝐇 🚀',
                    serverMessageId: 1
                },
                externalAdReply: {
                    title: 'ＭＩＣＫＥＹ 𝐕𝟑 𝐈𝐒 𝐀𝐂𝐓𝐈𝐕𝐄',
                    body: `Speed: ${ping}ms | Stable & Secure`,
                    thumbnailUrl: imageUrl, // Hii ndio picha ya AD pekee
                    sourceUrl: 'https://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A', 
                    mediaType: 1,
                    renderLargerThumbnail: true // Fanya picha iwe kubwa (AD style)
                }
            }
        }, { quoted: msg });

    } catch (e) {
        console.error('❌ Alive Ad Error:', e);
    }
};

module.exports = aliveCommand;
