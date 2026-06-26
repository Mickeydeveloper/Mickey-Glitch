/**
 * PING & SYSTEM COMMANDS - MICKEY GLITCH ULTIMATE
 * Highly Optimized UI/UX & Built-in Modules Only
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { performance } = require('perf_hooks');

// 🔗 Picha kutoka GitHub uliyoweka
const BOT_IMAGE_URL = 'https://raw.githubusercontent.com/Mickeymozy/Mickey-Water/main/1761205727440.png';

// ============================================================
// 🎨 FORMATTING & UTILITY FUNCTIONS
// ============================================================

function formatTime(seconds) {
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
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function createProgressBar(percent) {
    const filled = Math.floor((Math.min(100, Math.max(0, percent)) / 100) * 10);
    return '🟩'.repeat(filled) + '⬜'.repeat(10 - filled);
}

function getAdvancedSystemInfo() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = (usedMem / totalMem) * 100;

    const cpus = os.cpus() || [];
    const cpuModel = cpus[0]?.model?.replace(/\s+/g, ' ').trim() || 'Host CPU';
    
    // Kurahisisha hesabu ya CPU Load (Safi na nyepesi)
    let cpuLoad = 10.0;
    try {
        const loadAvg = os.loadavg();
        cpuLoad = Math.min(100, Math.max(0, (loadAvg[0] / cpus.length) * 100)) || 12.5;
    } catch (e) {}

    return {
        cpu: { model: cpuModel, cores: cpus.length, load: cpuLoad },
        memory: { total: totalMem, used: usedMem, free: freeMem, percent: memPercent },
        os: { platform: os.platform(), distro: os.type(), uptime: os.uptime() },
        process: { pid: process.pid, uptime: process.uptime(), version: process.version }
    };
}

// ============================================================
// 🖥️ COMMANDS (CLEAN & LOCAL TIME)
// ============================================================

async function pingCommand(sock, chatId, message) {
    try {
        const start = performance.now();
        const sysInfo = getAdvancedSystemInfo();
        const latency = Math.round(performance.now() - start);
        
        const cpuBar = createProgressBar(sysInfo.cpu.load);
        const memBar = createProgressBar(sysInfo.memory.percent);

        // 🌍 Imetofautishwa: Inasoma LOCAL time ya vigezo vya server yako moja kwa moja
        const localTime = new Date().toLocaleString(undefined, { hour12: false });

        const diagnosticsText = `✨ *MICKEY DIAGNOSTICS* ✨
─────────────────────────────
📡 *STATUS*
• Latency: *${latency}ms* 🚀
• Uptime: *${formatTime(sysInfo.os.uptime)}*

💻 *CPU*
• Model: \`${sysInfo.cpu.model}\`
• Usage: [${cpuBar}] *${sysInfo.cpu.load.toFixed(1)}%*

💾 *RAM*
• Usage: [${memBar}] *${sysInfo.memory.percent.toFixed(1)}%*
• Used: *${formatBytes(sysInfo.memory.used)}* / ${formatBytes(sysInfo.memory.total)}

⚙️ *ENV*
• OS: *${sysInfo.os.platform}* | Node: *${sysInfo.process.version}*
• Time (Local): *${localTime}*
─────────────────────────────
*© 2026 Mickey Glitch Labs™*`;

        await sock.sendMessage(chatId, {
            image: { url: BOT_IMAGE_URL },
            caption: diagnosticsText
        }, { quoted: message });

    } catch (error) {
        console.error('Ping Error:', error);
    }
}

async function sysInfoCommand(sock, chatId, message) {
    try {
        const sysInfo = getAdvancedSystemInfo();
        const infoText = `📊 *SPECIFICATIONS*
─────────────────────────────
🖥️ *CPU*: ${sysInfo.cpu.model} (${sysInfo.cpu.cores} Cores)
💾 *RAM*: ${formatBytes(sysInfo.memory.used)} / ${formatBytes(sysInfo.memory.total)} (${sysInfo.memory.percent.toFixed(1)}%)
🌐 *OS*: ${sysInfo.os.platform} (${os.arch()})
─────────────────────────────`;
        await sock.sendMessage(chatId, { text: infoText }, { quoted: message });
    } catch (e) { console.error(e); }
}

async function statusCommand(sock, chatId, message) {
    try {
        const sysInfo = getAdvancedSystemInfo();
        const statusText = `📈 *LIVE STATS*
─────────────────────────────
• CPU: ${sysInfo.cpu.load.toFixed(1)}%
• RAM: ${sysInfo.memory.percent.toFixed(1)}%
• Uptime: ${formatTime(sysInfo.os.uptime)}
─────────────────────────────`;
        await sock.sendMessage(chatId, { text: statusText }, { quoted: message });
    } catch (e) { console.error(e); }
}

async function reportCommand(sock, chatId, message) {
    try {
        const sysInfo = getAdvancedSystemInfo();
        const report = `📋 SYSTEM REPORT\n\nTimestamp: ${new Date().toLocaleString()}\nPlatform: ${sysInfo.os.platform}\nNode: ${sysInfo.process.version}`;

        const tmpDir = path.join(__dirname, '..', 'tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        const reportPath = path.join(tmpDir, `report_${Date.now()}.txt`);
        fs.writeFileSync(reportPath, report, 'utf8');

        await sock.sendMessage(chatId, {
            document: fs.readFileSync(reportPath),
            filename: `mickey_report.txt`,
            mimetype: 'text/plain',
            caption: '📋 *System Log Generated.*'
        }, { quoted: message });

        fs.unlinkSync(reportPath);
    } catch (e) { console.error(e); }
}

// ============================================================
// 📦 MODULE EXPORTS
// ============================================================

module.exports = pingCommand;
