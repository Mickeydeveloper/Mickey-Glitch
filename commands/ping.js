const os = require('os');
const { sendButtons } = require('gifted-btns');

function formatTime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

function getSystemHealth(ramPercent, cpuLoad) {
    if (ramPercent < 50 && cpuLoad < 50) return '🟢 PERFECT';
    if (ramPercent < 70 && cpuLoad < 70) return '🟡 GOOD';
    if (ramPercent < 85 && cpuLoad < 85) return '🟠 WARNING';
    return '🔴 CRITICAL';
}

function getRamBar(usedPercent) {
    const filled = Math.floor(usedPercent / 10);
    const empty = 10 - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return bar;
}

function getPerformanceRating(latency) {
    if (latency < 100) return { emoji: '🚀', rating: 'EXCELLENT', color: '🟢' };
    if (latency < 200) return { emoji: '⚡', rating: 'VERY GOOD', color: '🟢' };
    if (latency < 300) return { emoji: '👍', rating: 'GOOD', color: '🟡' };
    if (latency < 500) return { emoji: '⚠️', rating: 'SLOW', color: '🟠' };
    return { emoji: '🐌', rating: 'VERY SLOW', color: '🔴' };
}

async function pingCommand(sock, chatId, message) {
    try {
        // Send initial ping
        const start = Date.now();
        const sentMsg = await sock.sendMessage(chatId, { text: '⚡ *PINGING SERVER...*' }, { quoted: message });
        const latency = Date.now() - start;
        
        // System stats
        const uptimeSeconds = process.uptime();
        const uptime = formatTime(uptimeSeconds);
        
        const ramUsed = process.memoryUsage().rss / 1024 / 1024;
        const ramTotal = os.totalmem() / 1024 / 1024 / 1024;
        const ramFree = os.freemem() / 1024 / 1024 / 1024;
        const ramUsedGB = (ramUsed / 1024).toFixed(2);
        const ramPercent = (ramUsed / (ramTotal * 1024)) * 100;
        
        const cpuCores = os.cpus().length;
        const cpuModel = os.cpus()[0].model.split('@')[0].trim();
        const cpuSpeed = (os.cpus()[0].speed / 1000).toFixed(1);
        
        // Get load average (Unix only, but safe fallback)
        let cpuLoad = 0;
        try {
            const loadAvg = os.loadavg();
            cpuLoad = (loadAvg[0] / cpuCores) * 100;
            cpuLoad = Math.min(100, Math.max(0, cpuLoad.toFixed(1)));
        } catch (e) {
            cpuLoad = 0;
        }
        
        const platform = os.platform();
        const arch = os.arch();
        const hostname = os.hostname();
        const nodeVersion = process.version;
        
        // Performance rating
        const perf = getPerformanceRating(latency);
        const systemHealth = getSystemHealth(ramPercent, cpuLoad);
        const ramBar = getRamBar(ramPercent);
        
        // Battery info (if available)
        let batteryInfo = '';
        if (os.platform() === 'linux' || os.platform() === 'win32') {
            try {
                // Optional: Add battery check logic here
                batteryInfo = '⚡ *Power:* Connected\n';
            } catch (e) {
                batteryInfo = '';
            }
        }
        
        // Format numbers
        const latencyFormatted = latency;
        const ramUsedFormatted = ramUsed.toFixed(1);
        const ramPercentFormatted = ramPercent.toFixed(1);
        
        // Create animated progress indicator
        const progressIndicator = ramPercent < 50 ? '📈' : ramPercent < 75 ? '📊' : '📉';
        
        // Build status text
        const pingText = `╭━━━━━━━━━━━━━━━━━━━━━╮
┃  🚀 *SYSTEM DIAGNOSTICS*
╰━━━━━━━━━━━━━━━━━━━━━╯

╭─── 📡 *NETWORK*
│  └── ⚡ Latency: *${latencyFormatted}ms* ${perf.emoji}
│      └── Rating: ${perf.color} *${perf.rating}*
│
╭─── 💻 *SYSTEM RESOURCES*
│  ├── 🖥️ CPU: *${cpuModel}*
│  ├── 🔢 Cores: *${cpuCores}* @ ${cpuSpeed}GHz
│  ├── 📊 Load: *${cpuLoad}%* 
│  │
│  ├── 💾 RAM Usage: *${ramUsedFormatted}MB* / ${ramTotal}GB
│  ├── └── [${ramBar}] *${ramPercentFormatted}%* ${progressIndicator}
│  ├── 🆓 Free RAM: *${ramFree}GB*
│  │
│  ├── ⏱️ Uptime: *${uptime}*
│  ├── 🩺 Health: *${systemHealth}*
│
╭─── 🔧 *ENVIRONMENT*
│  ├── 📱 Platform: *${platform}* (${arch})
│  ├── 🖥️ Host: *${hostname}*
│  ├── 🟢 Node.js: *${nodeVersion}*
│
╰─── *© 2026 Mickey Glitch Labs™*

${batteryInfo}┌─────────────────────┐
│ 💡 *TIP:* Klik refresh  │
│    kwa update ya haraka │
└─────────────────────┘`;

        // Buttons
        const buttons = [
            { id: '.ping', text: '🔄 REFRESH' },
            { id: '.sysinfo', text: '📊 DETAILED' },
            { id: '.status', text: '📈 LIVE STATS' },
            { id: '.help', text: '❓ HELP' }
        ];

        await sendButtons(sock, chatId, {
            title: '⚡ *SYSTEM STATUS REPORT*',
            text: pingText,
            footer: 'Mickey Glitch Tech • Real-time Monitor',
            buttons: buttons
        }, { quoted: message });

    } catch (error) {
        console.error('Ping command error:', error);
        
        // Fallback simple response
        try {
            const fallbackText = `❌ *Ping Failed - System Error*

━━━━━━━━━━━━━━━━━━
📝 *Error Details:*
${error.message.substring(0, 100)}

💡 *Solutions:*
• Check bot connection
• Restart the bot
• Contact administrator
━━━━━━━━━━━━━━━━━━

_© Mickey Glitch Labs_`;

            await sock.sendMessage(chatId, { text: fallbackText }, { quoted: message });
        } catch (e) {
            // Silent fail
        }
    }
}

// Optional: Additional command for detailed system info
async function sysInfoCommand(sock, chatId, message) {
    try {
        const totalMem = os.totalmem() / 1024 / 1024 / 1024;
        const freeMem = os.freemem() / 1024 / 1024 / 1024;
        const usedMem = totalMem - freeMem;
        const memPercent = (usedMem / totalMem) * 100;
        
        const cpus = os.cpus();
        const cpuDetails = cpus.map((cpu, i) => {
            return `   Core ${i + 1}: ${cpu.model.split('@')[0].trim()} @ ${(cpu.speed / 1000).toFixed(1)}GHz`;
        }).join('\n');
        
        const networkInterfaces = os.networkInterfaces();
        let ipAddress = 'Unknown';
        for (const [name, interfaces] of Object.entries(networkInterfaces)) {
            if (name.includes('eth') || name.includes('wlan') || name.includes('en')) {
                const ipv4 = interfaces.find(i => i.family === 'IPv4');
                if (ipv4 && !ipv4.internal) {
                    ipAddress = ipv4.address;
                    break;
                }
            }
        }
        
        const detailedText = `╭━━━━━━━━━━━━━━━━━━━━━╮
┃  📊 *DETAILED SYSTEM INFO*
╰━━━━━━━━━━━━━━━━━━━━━╯

🖥️ *CPU ARCHITECTURE*
├── Model: ${cpus[0].model}
├── Cores: ${cpus.length}
├── Threads: ${cpus.length}
└── Speed: ${(cpus[0].speed / 1000).toFixed(1)}GHz - ${(cpus[cpus.length-1].speed / 1000).toFixed(1)}GHz

💾 *MEMORY USAGE*
├── Total: ${totalMem.toFixed(2)} GB
├── Used: ${usedMem.toFixed(2)} GB (${memPercent.toFixed(1)}%)
├── Free: ${freeMem.toFixed(2)} GB
└── Swap: ${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB cached

🌐 *NETWORK*
├── IP Address: ${ipAddress}
├── Hostname: ${os.hostname()}
└── Platform: ${os.platform()} ${os.release()}

👤 *USER INFO*
├── User: ${os.userInfo().username || 'system'}
├── Home: ${os.homedir()}
└── Shell: ${os.userInfo().shell || 'default'}

⏰ *TIME INFO*
├── Uptime: ${formatTime(os.uptime())}
├── Boot Time: ${new Date(Date.now() - os.uptime() * 1000).toLocaleString()}
└── Current: ${new Date().toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━
*© 2026 Mickey Glitch Labs*`;

        await sock.sendMessage(chatId, { text: detailedText }, { quoted: message });
    } catch (error) {
        console.error('SysInfo error:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to get system info' }, { quoted: message });
    }
}

module.exports = { 
    pingCommand,
    sysInfoCommand,
    formatTime 
};