const os = require('os');
const { performance } = require('perf_hooks');
const { ButtonV2 } = require('gifted-btns'); // Hakikisha umeseti ButtonV2 kutoka gifted-btns

/**
 * Formats seconds into a human-readable string (d h m s)
 */
const formatUptime = (seconds) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);

    return parts.join(' ');
};

/**
 * Main command handler
 */
const aliveCommand = async (sock, chatId, msg) => {
    if (!sock) return;

    const startTime = performance.now();

    try {
        // System Calculations
        const time = new Date().toLocaleTimeString('en-US', { 
            timeZone: 'Africa/Dar_es_Salaam', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true
        });

        const latency = (performance.now() - startTime).toFixed(0);
        const totalRam = os.totalmem() / Math.pow(1024, 3);
        const usedRam = process.memoryUsage().heapUsed / Math.pow(1024, 3);
        const ramPercent = ((usedRam / totalRam) * 100).toFixed(1);
        const cpuModel = os.cpus()[0]?.model.split('@')[0].trim() || 'Generic CPU';

        const imageUrl = 'https://raw.githubusercontent.com/Mickeydeveloper/water-billing/main/1761205727440.png';

        const statusMessage = `╭━━━〔 *ＭＩＣＫＥＹ-Ｖ３* 〕━━━┈⊷
┃ 👤 *User:* ${msg.pushName || 'Guest'}
┃ 🕒 *Time:* ${time} EAT
┃ 🚀 *Latency:* ${latency}ms
╰━━━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 *SYSTEM STATUS* 〕━━━┈⊷
┃ ⏳ *Uptime:* ${formatUptime(process.uptime())}
┃ 🧠 *RAM:* ${usedRam.toFixed(2)}GB / ${totalRam.toFixed(0)}GB (${ramPercent}%)
┃ 🔧 *CPU:* ${cpuModel}
┃ 🟢 *Status:* Online & Stable
╰━━━━━━━━━━━━━━━━━━┈⊷`;

        // Tumia ButtonV2 muundo (Hapa tunatumia sock kama core)
        await new ButtonV2(sock)
            .setTitle('SYSTEM ACTIVE')
            .setSubtitle('Mickey Glitch Technology')
            .setBody(statusMessage)
            .setFooter('© 2026 Mickey Glitch Technology')
            .setThumbnail(imageUrl)
            .addButton('🆘 Menu', '.menu')
            .addButton('📡 Speed', '.ping')
            .addButton('👑 Support', '.owner')
            .send(chatId);

    } catch (error) {
        console.error('Critical Error in Alive Command:', error);
    }
};

module.exports = aliveCommand;
