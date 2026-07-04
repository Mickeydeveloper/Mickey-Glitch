/**
 * PING & SYSTEM COMMANDS - MICKEY GLITCH
 * Optimized UI/UX - Clean & Fast
 */

const os = require('os');
const { performance } = require('perf_hooks');

// ============================================================
// 🎨 FORMATTING FUNCTIONS
// ============================================================

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
}

function getSystemInfo() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = (usedMem / totalMem) * 100;

    const cpus = os.cpus() || [];
    let cpuLoad = 10.0;
    try {
        const loadAvg = os.loadavg();
        cpuLoad = Math.min(100, Math.max(0, (loadAvg[0] / cpus.length) * 100)) || 12.5;
    } catch (e) {}

    return {
        cpu: { cores: cpus.length, load: cpuLoad },
        memory: { used: usedMem, total: totalMem, percent: memPercent },
        os: { uptime: os.uptime() },
        process: { uptime: process.uptime() }
    };
}

// ============================================================
// 🖥️ PING COMMAND
// ============================================================

async function pingCommand(sock, chatId, message) {
    try {
        const start = performance.now();
        const info = getSystemInfo();
        const latency = Math.round(performance.now() - start);

        const localTime = new Date().toLocaleString(undefined, { hour12: false });
        const botUptime = formatUptime(info.process.uptime);
        const serverUptime = formatUptime(info.os.uptime);

        const text = `╔══════════════════════════╗
║  ✨ MICKEY GLITCH ✨    ║
╚══════════════════════════╝

📡 *PING:* ${latency}ms
⏱️ *UPTIME:* ${botUptime}

💻 *CPU:* ${info.cpu.cores} Core
💾 *RAM:* ${formatBytes(info.memory.used)}/${formatBytes(info.memory.total)}

🕐 *TIME:* ${localTime}
─────────────────────────────
_Mickey Glitch Technology™_`;

        await sock.sendMessage(chatId, { text }, { quoted: message });

    } catch (error) {
        console.error('Ping Error:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ *Error:* Tafadhali jaribu tena.' 
        }, { quoted: message });
    }
}

// ============================================================
// 📦 EXPORT
// ============================================================

module.exports = pingCommand;