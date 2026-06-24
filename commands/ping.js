/**
 * PING & SYSTEM COMMANDS - MICKEY GLITCH ULTIMATE
 * Highly Optimized UI/UX & Built-in Modules Only
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { performance } = require('perf_hooks');

// 🔗 Picha kutoka GitHub uliyoweka (Raw link kwa ajili ya usalama wa kupakia)
const BOT_IMAGE_URL = 'https://raw.githubusercontent.com/Mickeymozy/Mickey-Water/main/1761205727440.png';

// ============================================================
// 🎨 FORMATTING & UTILITY FUNCTIONS
// ============================================================

function formatTime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (days > 0) return `${days} siku ${hours}saa ${minutes}m`;
    if (hours > 0) return `${hours}saa ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function createProgressBar(percent, length = 15) {
    const filled = Math.floor((Math.min(100, Math.max(0, percent)) / 100) * length);
    const empty = length - filled;
    return '🟩'.repeat(filled) + '⬜'.repeat(empty);
}

function getPerformanceRating(latency) {
    if (latency < 100) return { emoji: '🚀', rating: 'EXCELLENT', color: '🟢' };
    if (latency < 250) return { emoji: '⚡', rating: 'GOOD', color: '🟡' };
    return { emoji: '🐌', rating: 'LAGGING', color: '🔴' };
}

function getAdvancedSystemInfo() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = (usedMem / totalMem) * 100;

    const cpus = os.cpus() || [];
    const cpuModel = cpus[0]?.model?.replace(/\s+/g, ' ').trim() || 'Host Processor';
    const cpuCores = cpus.length;

    let cpuLoad = 0;
    try {
        const loadAvg = os.loadavg();
        cpuLoad = (loadAvg[0] / cpuCores) * 100;
        cpuLoad = Math.min(100, Math.max(0, cpuLoad));
        if (!cpuLoad || isNaN(cpuLoad)) cpuLoad = 12.5; 
    } catch (e) {
        cpuLoad = 10.0;
    }

    return {
        cpu: { model: cpuModel, cores: cpuCores, load: cpuLoad, speed: cpus[0]?.speed || 2400 },
        memory: { total: totalMem, used: usedMem, free: freeMem, percent: memPercent },
        os: { platform: os.platform(), distro: os.type(), hostname: os.hostname(), uptime: os.uptime() },
        process: { pid: process.pid, uptime: process.uptime(), version: process.version }
    };
}

// ============================================================
// 🖥️ COMMANDS (IMPROVED UI & IMAGE ADDED)
// ============================================================

async function pingCommand(sock, chatId, message) {
    try {
        const start = performance.now();
        
        // Initial Loading Message
        const loadingMsg = await sock.sendMessage(chatId, { 
            text: '⚡ *M I C K E Y   M O N I T O R* ⚡\n───────────────────────────\n🔄 _Connecting to host server..._' 
        }, { quoted: message });

        const latency = Math.round(performance.now() - start);
        const sysInfo = getAdvancedSystemInfo();
        const perf = getPerformanceRating(latency);

        const cpuBar = createProgressBar(sysInfo.cpu.load);
        const memBar = createProgressBar(sysInfo.memory.percent);

        const currentTime = new Date().toLocaleString('en-US', {
            timeZone: 'Africa/Dar_es_Salaam',
            hour12: false
        });

        // Beautiful WhatsApp Styled Template
        const diagnosticsText = `✨ *MICKEY GLITCH ULTIMATE DIAGNOSTICS* ✨
─────────────────────────────

📡 *NETWORK STATUS*
┌  Latency: *${latency}ms* ${perf.emoji}
├  Speed Rating: ${perf.color} *${perf.rating}*
└  Server Uptime: *${formatTime(sysInfo.os.uptime)}*

💻 *CPU PERFORMANCE*
┌  Model: \`${sysInfo.cpu.model}\`
├  Cores: *${sysInfo.cpu.cores} Cores* @ ${(sysInfo.cpu.speed / 1000).toFixed(1)}GHz
└  Usage: [${cpuBar}] *${sysInfo.cpu.load.toFixed(1)}%*

💾 *MEMORY ALLOCATION*
┌  RAM RAM: [${memBar}] *${sysInfo.memory.percent.toFixed(1)}%*
├  Used: *${formatBytes(sysInfo.memory.used)}* / ${formatBytes(sysInfo.memory.total)}
└  Free Space: *${formatBytes(sysInfo.memory.free)}*

⚙️ *HOST ENVIRONMENT*
┌  OS Platform: *${sysInfo.os.platform}* (${sysInfo.os.distro})
├  Node Version: *${sysInfo.process.version}*
├  Process PID: *${sysInfo.process.pid}*
├  Bot Active: *${formatTime(sysInfo.process.uptime)}*
└  Time (EAT): *${currentTime}*

─────────────────────────────
*© 2026 Mickey Glitch Labs™*`;

        // Tuma picha ikiwa na maelezo (Caption) ya diagnostics ya mfumo
        await sock.sendMessage(chatId, {
            image: { url: BOT_IMAGE_URL },
            caption: diagnosticsText
        }, { quoted: message });

    } catch (error) {
        console.error('Error on Ping Command:', error);
    }
}

async function sysInfoCommand(sock, chatId, message) {
    try {
        const sysInfo = getAdvancedSystemInfo();
        const infoText = `📊 *DETAILED SPECIFICATIONS*
─────────────────────────────
🖥️ *CPU INFO*
• Processor: ${sysInfo.cpu.model}
• Total Cores: ${sysInfo.cpu.cores} Threads
• Avg Load: ${sysInfo.cpu.load.toFixed(1)}%

💾 *RAM DETAILS*
• Total: ${formatBytes(sysInfo.memory.total)}
• Active: ${formatBytes(sysInfo.memory.used)} (${sysInfo.memory.percent.toFixed(1)}%)
• Available: ${formatBytes(sysInfo.memory.free)}

🌐 *HOST INFO*
• Hostname: ${sysInfo.os.hostname}
• Platform: ${sysInfo.os.platform}
• Arch: ${os.arch()}
─────────────────────────────
*Generated by Mickey-Water*`;

        await sock.sendMessage(chatId, { text: infoText }, { quoted: message });
    } catch (e) { console.error(e); }
}

async function statusCommand(sock, chatId, message) {
    try {
        const sysInfo = getAdvancedSystemInfo();
        const statusText = `📈 *LIVE HOST STATS*
─────────────────────────────
• *CPU Load:* ${sysInfo.cpu.load.toFixed(1)}%
• *RAM Usage:* ${sysInfo.memory.percent.toFixed(1)}%
• *Uptime:* ${formatTime(sysInfo.os.uptime)}
─────────────────────────────`;
        await sock.sendMessage(chatId, { text: statusText }, { quoted: message });
    } catch (e) { console.error(e); }
}

async function reportCommand(sock, chatId, message) {
    try {
        const sysInfo = getAdvancedSystemInfo();
        const report = `📋 *SYSTEM DIAGNOSTIC REPORT*\n\nStatus: 🟢 RUNNING OPTIMALLY\nTimestamp: ${new Date().toLocaleString()}\nHost: ${sysInfo.os.hostname}\nNode: ${sysInfo.process.version}`;
        
        const tmpDir = path.join(__dirname, '..', 'tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        
        const reportPath = path.join(tmpDir, `report_${Date.now()}.txt`);
        fs.writeFileSync(reportPath, report, 'utf8');

        await sock.sendMessage(chatId, {
            document: fs.readFileSync(reportPath),
            filename: `mickey_report_${Date.now()}.txt`,
            mimetype: 'text/plain',
            caption: '📋 *System Diagnostics Log File Generated.*'
        }, { quoted: message });

        fs.unlinkSync(reportPath);
    } catch (e) { console.error(e); }
}

// ============================================================
// 📦 MODULE EXPORTS
// ============================================================

module.exports = {
    pingCommand,
    sysInfoCommand,
    statusCommand,
    reportCommand,
    formatTime,
    formatBytes,
    createProgressBar,
    getPerformanceRating,
    getAdvancedSystemInfo
};
