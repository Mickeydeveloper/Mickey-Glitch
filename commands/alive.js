const os = require('os');
const { performance } = require('perf_hooks');
const { sendButtons } = require('gifted-btns');

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
    if (!sock?.sendMessage) return;

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

        const imageUrl = 'https://water-billing-292n.onrender.com/1761205727440.png';

        // Message Template
        const statusMessage = `
╭━━━〔 *ＭＩＣＫＥＹ-Ｖ３* 〕━━━┈⊷
┃ 👤 *User:* ${msg.pushName || 'Guest'}
┃ 🕒 *Time:* ${time} EAT
┃ 🚀 *Latency:* ${latency}ms
╰━━━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 *SYSTEM STATUS* 〕━━━┈⊷
┃ ⏳ *Uptime:* ${formatUptime(process.uptime())}
┃ 🧠 *RAM:* ${usedRam.toFixed(2)}GB / ${totalRam.toFixed(0)}GB (${ramPercent}%)
┃ 🔧 *CPU:* ${cpuModel}
┃ 🟢 *Status:* Online & Stable
╰━━━━━━━━━━━━━━━━━━┈⊷

*© 2026 Mickey Glitch Technology*`.trim();

        // Send interactive response directly
        await sendButtons(sock, chatId, {
            title: 'SYSTEM ACTIVE',
            text: statusMessage,
            footer: 'Powered by Mickey Glitch Tech',
            image: { url: imageUrl },
            buttons: [
                { id: '.menu', text: '🆘 Menu' },
                { id: '.ping', text: '📡 Speed' },
                { id: '.owner', text: '👑 Support' }
            ]
        }, { quoted: msg });

    } catch (error) {
        console.error('Critical Error in Alive Command:', error);
    }
};

module.exports = aliveCommand;
