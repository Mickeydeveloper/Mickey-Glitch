const os = require('os');
const { performance } = require('perf_hooks');

// --- MSAIDIZI WA MUDA (UPTIME) ---
const formatUptime = (secs) => {
    const d = Math.floor(secs / (3600 * 24));
    const h = Math.floor((secs % (3600 * 24)) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    const dDisplay = d > 0 ? `${d}d ` : "";
    return `${dDisplay}${h}h ${m}m ${s}s`;
};

// --- MAIN ALIVE COMMAND (.alive) ---
const aliveCommand = async (sock, chatId, msg) => {
    // Hakikisha socket ipo
    if (!sock || typeof sock.sendMessage !== 'function') return;

    const start = performance.now();

    try {
        // Typing effect kwa sekunde 1
        await sock.sendPresenceUpdate('composing', chatId);

        const dateObj = new Date();
        const options = { timeZone: 'Africa/Dar_es_Salaam', hour12: true, hour: '2-digit', minute: '2-digit' };
        const time = dateObj.toLocaleTimeString('en-GB', options);
        
        // System Stats
        const end = performance.now();
        const ping = (end - start).toFixed(0);
        const totalRam = os.totalmem() / 1024 / 1024 / 1024;
        const freeRam = os.freemem() / 1024 / 1024 / 1024;
        const usedRam = totalRam - freeRam;
        const ramPercent = ((usedRam / totalRam) * 100).toFixed(1);
        const cpuModel = os.cpus()[0]?.model.split('@')[0].trim() || 'Standard';

        const imageUrl = 'https://water-billing-292n.onrender.com/1761205727440.png';

        // --- MUUNDO MPYA NA WA KITAALUMU ---
        const caption = `╭━━━〔 *ＭＩＣＫＥＹ-Ｖ３* 〕━━━┈⊷
┃ 👤 *Mtumiaji:* ${msg.pushName || 'User'}
┃ 🕒 *Muda:* ${time} EAT
┃ 🚀 *Ping:* ${ping}ms ${ping < 100 ? '🚀' : '🟢'}
╰━━━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 *SYSTEM STATUS* 〕━━━┈⊷
┃ ⏳ *Uptime:* ${formatUptime(process.uptime())}
┃ 🧠 *RAM:* ${usedRam.toFixed(1)}GB / ${totalRam.toFixed(0)}GB (${ramPercent}%)
┃ 💾 *Free:* ${freeRam.toFixed(1)}GB
┃ 🔧 *CPU:* ${cpuModel}
┃ 🖥 *OS:* ${os.platform()} (${os.arch()})
┃ 🟢 *Hali:* Stable & Active
╰━━━━━━━━━━━━━━━━━━┈⊷

*Channel:* https://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A
_© 2026 Mickey Glitch Technology_`;

        // --- TUMA ALIVE MESSAGE NA PICHA (Mbinu iliyoboreshwa) ---
        await sock.sendMessage(chatId, {
            image: { url: imageUrl }, // Pakia picha moja kwa moja kutoka URL
            caption: caption,
            contextInfo: {
                isForwarded: true,
                forwardingScore: 999,
                showAdAttribution: true, // Imerudishwa (Restored)
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363398106360290@newsletter',
                    newsletterName: '🅼🅸🅲🅺🅴𝚈-𝐆𝐋𝐈𝐓𝐂𝐇 🚀',
                    serverMessageId: 1
                },
                externalAdReply: {
                    title: 'ＭＩＣＫＥＹ 𝐕𝟑 𝐀𝐋𝐈𝐕𝐄',
                    body: `Speed: ${ping}ms | Status: Active`,
                    thumbnailUrl: imageUrl,
                    sourceUrl: 'https://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A', 
                    mediaType: 1,
                    renderLargerThumbnail: true,
                }
            }
        }, { quoted: msg });

    } catch (e) {
        console.error('❌ Alive Error:', e);
        // Fallback message ikiwa picha itagoma kabisa
        await sock.sendMessage(chatId, { 
            text: `🟢 *Bot is Active!* (Picha imefeli)\n\n⚡ Speed: ${performance.now().toFixed(0)}ms` 
        }, { quoted: msg });
    }
};

module.exports = aliveCommand;
