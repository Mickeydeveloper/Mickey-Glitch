const os = require('os');
const settings = require('../settings.js');

/**
 * Mickey Glitch Ping/System Command
 * Clean, efficient, and line-free design.
 */
async function pingCommand(sock, chatId, message) {
    const startTime = Date.now();

    try {
        // 1. System Calculations
        const processUptime = formatTime(process.uptime());
        const cpuCount = os.cpus().length;
        const platform = os.platform().toUpperCase();
        
        // Memory formatting
        const totalMem = (os.totalmem() / 1024**3).toFixed(2);
        const freeMem = (os.freemem() / 1024**3).toFixed(2);
        const rssMB = (process.memoryUsage().rss / 1024**2).toFixed(2);

        // Versioning
        const botVersion = settings?.version || '2.0.1';
        
        // Final Latency
        const latency = Date.now() - startTime;

        // 2. Modern Appearance (No bulky lines)
        const statusReport = `
*⚡ MICKEY GLITCH STATUS*
_System Performance & Diagnostics_

*PERFORMANCE*
◇ *Latency:* ${latency}ms
◇ *Uptime:* ${processUptime}
◇ *Version:* v${botVersion}

*RESOURCES*
◇ *Platform:* ${platform} (${os.arch()})
◇ *CPU Cores:* ${cpuCount} Threads
◇ *Free RAM:* ${freeMem}GB / ${totalMem}GB
◇ *RSS Usage:* ${rssMB}MB

*Node.js:* ${process.version}
*Connection:* Secure & Active`.trim();

        // 3. Send Message with Premium Context
        await sock.sendMessage(chatId, { 
            text: statusReport,
            contextInfo: {
                externalAdReply: {
                    title: "Mickey Glitch Diagnostics",
                    body: `Latency: ${latency}ms | Status: Stable`,
                    thumbnailUrl: 'https://water-billimg.onrender.com/1761205727440.png',
                    sourceUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26',
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: message });

    } catch (error) {
        console.error('Ping Error:', error);
        await sock.sendMessage(chatId, { text: '_⚠️ System diagnostic failed._' }, { quoted: message });
    }
}

/**
 * Helper: Refined Time Formatter
 */
function formatTime(seconds) {
    seconds = Number(seconds);
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    let parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    
    return parts.slice(0, 3).join(' '); // Keeps it concise
}

module.exports = pingCommand;
