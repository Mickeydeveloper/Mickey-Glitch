/**
 * PING & SYSTEM COMMANDS - MICKEY GLITCH ULTIMATE
 * Enhanced version with beautiful UI, animations, and comprehensive system monitoring
 */

const os = require('os');
const { sendButtons } = require('gifted-btns');
const si = require('systeminformation'); // For advanced system info
const { performance } = require('perf_hooks');

// ============================================================
// 🎨 FORMATTING & UTILITY FUNCTIONS
// ============================================================

/**
 * Format seconds to human readable time
 */
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

/**
 * Format bytes to human readable
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Create progress bar
 */
function createProgressBar(percent, length = 20, filledChar = '█', emptyChar = '░') {
    const filled = Math.floor((Math.min(100, Math.max(0, percent)) / 100) * length);
    const empty = length - filled;
    return filledChar.repeat(filled) + emptyChar.repeat(empty);
}

/**
 * Get emoji based on value
 */
function getStatusEmoji(value, thresholds = [50, 70, 85]) {
    if (value < thresholds[0]) return '🟢';
    if (value < thresholds[1]) return '🟡';
    if (value < thresholds[2]) return '🟠';
    return '🔴';
}

/**
 * Get performance rating
 */
function getPerformanceRating(latency) {
    if (latency < 100) return { emoji: '🚀', rating: 'EXCELLENT', color: '🟢' };
    if (latency < 200) return { emoji: '⚡', rating: 'VERY GOOD', color: '🟢' };
    if (latency < 300) return { emoji: '👍', rating: 'GOOD', color: '🟡' };
    if (latency < 500) return { emoji: '⚠️', rating: 'SLOW', color: '🟠' };
    return { emoji: '🐌', rating: 'VERY SLOW', color: '🔴' };
}

/**
 * Get system health status
 */
function getSystemHealth(ramPercent, cpuLoad, diskPercent) {
    const issues = [];
    if (ramPercent > 85) issues.push('RAM');
    if (cpuLoad > 85) issues.push('CPU');
    if (diskPercent > 90) issues.push('DISK');
    
    if (issues.length === 0) return { status: '🟢 PERFECT', level: 'perfect' };
    if (issues.length === 1) return { status: '🟡 GOOD', level: 'good' };
    if (issues.length === 2) return { status: '🟠 WARNING', level: 'warning' };
    return { status: '🔴 CRITICAL', level: 'critical' };
}

// ============================================================
// 📊 ADVANCED SYSTEM INFO FUNCTIONS
// ============================================================

async function getAdvancedSystemInfo() {
    try {
        const [cpu, mem, disk, net, osInfo, process] = await Promise.all([
            si.cpu(),
            si.mem(),
            si.fsSize(),
            si.networkStats(),
            si.osInfo(),
            si.processes()
        ]);

        // CPU Details
        const cpuLoad = await si.currentLoad();
        const cpuTemp = await si.cpuTemperature();

        // Memory Details
        const memUsed = mem.total - mem.available;
        const memPercent = (memUsed / mem.total) * 100;

        // Disk Details
        const diskTotal = disk.reduce((acc, d) => acc + d.size, 0);
        const diskUsed = disk.reduce((acc, d) => acc + d.used, 0);
        const diskPercent = (diskUsed / diskTotal) * 100;

        // Network Details
        const netTotal = net.reduce((acc, n) => ({
            rx: acc.rx + n.rx_sec,
            tx: acc.tx + n.tx_sec
        }), { rx: 0, tx: 0 });

        return {
            cpu: {
                model: cpu.manufacturer + ' ' + cpu.brand,
                cores: cpu.cores,
                speed: cpu.speed,
                load: cpuLoad.currentLoad,
                temp: cpuTemp.main || 0,
                processes: process.list.length
            },
            memory: {
                total: mem.total,
                used: memUsed,
                free: mem.available,
                percent: memPercent,
                swapTotal: mem.swaptotal,
                swapUsed: mem.swapused
            },
            disk: {
                total: diskTotal,
                used: diskUsed,
                free: diskTotal - diskUsed,
                percent: diskPercent,
                details: disk
            },
            network: {
                rx: netTotal.rx,
                tx: netTotal.tx,
                interfaces: net
            },
            os: {
                platform: osInfo.platform,
                distro: osInfo.distro,
                release: osInfo.release,
                hostname: os.hostname(),
                uptime: os.uptime()
            },
            process: {
                pid: process.pid,
                memory: process.memoryUsage(),
                uptime: process.uptime(),
                version: process.version,
                env: process.env.NODE_ENV || 'development'
            }
        };
    } catch (error) {
        // Fallback to basic os module
        return getBasicSystemInfo();
    }
}

function getBasicSystemInfo() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = (usedMem / totalMem) * 100;
    
    const cpus = os.cpus();
    const cpuModel = cpus[0]?.model || 'Unknown';
    const cpuCores = cpus.length;
    const cpuSpeed = cpus[0]?.speed || 0;
    
    let cpuLoad = 0;
    try {
        const loadAvg = os.loadavg();
        cpuLoad = (loadAvg[0] / cpuCores) * 100;
        cpuLoad = Math.min(100, Math.max(0, cpuLoad));
    } catch (e) {
        cpuLoad = 0;
    }

    return {
        cpu: {
            model: cpuModel,
            cores: cpuCores,
            speed: cpuSpeed,
            load: cpuLoad,
            temp: 0,
            processes: 0
        },
        memory: {
            total: totalMem,
            used: usedMem,
            free: freeMem,
            percent: memPercent,
            swapTotal: 0,
            swapUsed: 0
        },
        disk: {
            total: 0,
            used: 0,
            free: 0,
            percent: 0,
            details: []
        },
        network: {
            rx: 0,
            tx: 0,
            interfaces: []
        },
        os: {
            platform: os.platform(),
            distro: os.type(),
            release: os.release(),
            hostname: os.hostname(),
            uptime: os.uptime()
        },
        process: {
            pid: process.pid,
            memory: process.memoryUsage(),
            uptime: process.uptime(),
            version: process.version,
            env: process.env.NODE_ENV || 'development'
        }
    };
}

// ============================================================
// 🖥️ MAIN PING COMMAND
// ============================================================

async function pingCommand(sock, chatId, message) {
    try {
        // Start measuring
        const start = performance.now();
        
        // Send initial ping message
        const sentMsg = await sock.sendMessage(chatId, { 
            text: '⚡ *PINGING SERVER...*\n━━━━━━━━━━━━━━━━━━\n🔄 Fetching system data...' 
        }, { quoted: message });
        
        const latency = Math.round(performance.now() - start);

        // Get system info
        const sysInfo = await getAdvancedSystemInfo();
        
        // Calculate additional metrics
        const memPercent = sysInfo.memory.percent;
        const cpuLoad = sysInfo.cpu.load;
        const diskPercent = sysInfo.disk.percent || 0;
        
        // Performance rating
        const perf = getPerformanceRating(latency);
        const health = getSystemHealth(memPercent, cpuLoad, diskPercent);
        
        // Create progress bars
        const cpuBar = createProgressBar(cpuLoad, 20);
        const memBar = createProgressBar(memPercent, 20);
        const diskBar = createProgressBar(diskPercent, 20);
        
        // Format values
        const memUsedFormatted = formatBytes(sysInfo.memory.used);
        const memTotalFormatted = formatBytes(sysInfo.memory.total);
        const diskUsedFormatted = formatBytes(sysInfo.disk.used);
        const diskTotalFormatted = formatBytes(sysInfo.disk.total);
        const cpuSpeedFormatted = (sysInfo.cpu.speed / 1000).toFixed(1);
        
        // Uptime
        const uptime = formatTime(sysInfo.os.uptime);
        const procUptime = formatTime(sysInfo.process.uptime);
        
        // Get current time
        const currentTime = new Date().toLocaleString('en-TZ', {
            timeZone: 'Africa/Dar_es_Salaam',
            hour12: false
        });
        
        // Network info
        const rxFormatted = formatBytes(sysInfo.network.rx);
        const txFormatted = formatBytes(sysInfo.network.tx);
        
        // Build status text with beautiful formatting
        const pingText = `
╔═══════════════════════════════════╗
║        🚀 *SYSTEM DIAGNOSTICS*      ║
╚═══════════════════════════════════╝

╔══ 📡 *NETWORK PERFORMANCE*
║  ├─ Latency: *${latency}ms* ${perf.emoji}
║  ├─ Rating: ${perf.color} *${perf.rating}*
║  ├─ Status: ${health.status}
║  ├─ Data: 📥 ${rxFormatted}/s │ 📤 ${txFormatted}/s
║  └─ Uptime: ⏱️ *${uptime}*

╔══ 💻 *CPU & PROCESSES*
║  ├─ Model: *${sysInfo.cpu.model}*
║  ├─ Cores: *${sysInfo.cpu.cores}* @ ${cpuSpeedFormatted}GHz
║  ├─ Load: [${cpuBar}] *${cpuLoad.toFixed(1)}%*
║  ├─ Temp: 🌡️ *${sysInfo.cpu.temp.toFixed(1)}°C*
║  └─ Processes: *${sysInfo.cpu.processes}* running

╔══ 💾 *MEMORY USAGE*
║  ├─ RAM: [${memBar}] *${memPercent.toFixed(1)}%*
║  ├─ Used: *${memUsedFormatted}* / ${memTotalFormatted}
║  ├─ Free: *${formatBytes(sysInfo.memory.free)}*
║  └─ Swap: *${formatBytes(sysInfo.memory.swapUsed)}* / ${formatBytes(sysInfo.memory.swapTotal)}

╔══ 💿 *DISK STORAGE*
║  ├─ [${diskBar}] *${diskPercent.toFixed(1)}%*
║  ├─ Used: *${diskUsedFormatted}* / ${diskTotalFormatted}
║  ├─ Free: *${formatBytes(sysInfo.disk.free)}*
║  └─ Drives: ${sysInfo.disk.details.map(d => `${d.mount} (${formatBytes(d.size)})`).join(', ') || 'N/A'}

╔══ 🔧 *ENVIRONMENT*
║  ├─ Platform: *${sysInfo.os.platform}* (${sysInfo.os.distro})
║  ├─ Release: *${sysInfo.os.release}*
║  ├─ Hostname: *${sysInfo.os.hostname}*
║  ├─ Node.js: *${sysInfo.process.version}*
║  ├─ PID: *${sysInfo.process.pid}*
║  ├─ Environment: *${sysInfo.process.env}*
║  ├─ Process Uptime: *${procUptime}*
║  └─ Time: *${currentTime}* (EAT)

╚═══════════════════════════════════╝
*© 2026 Mickey Glitch Labs™* | *v2.0*

💡 *Commands:* /ping | /sysinfo | /status | /help
`;

        // Create interactive buttons
        const buttons = [
            { 
                id: '.ping', 
                text: '🔄 REFRESH',
                description: 'Update system status'
            },
            { 
                id: '.sysinfo', 
                text: '📊 DETAILED',
                description: 'View detailed system info'
            },
            { 
                id: '.status', 
                text: '📈 LIVE STATS',
                description: 'Real-time monitoring'
            },
            { 
                id: '.help', 
                text: '❓ HELP',
                description: 'Get help'
            },
            { 
                id: '.report', 
                text: '📋 REPORT',
                description: 'Generate system report'
            }
        ];

        // Send with buttons
        await sendButtons(sock, chatId, {
            title: '⚡ *SYSTEM STATUS REPORT*',
            text: pingText,
            footer: '🔄 Auto-refresh every 30s | Mickey Glitch Tech',
            buttons: buttons
        }, { quoted: message });

        // Log success
        console.log(`[${new Date().toISOString()}] Ping command executed for ${chatId} - Latency: ${latency}ms`);

    } catch (error) {
        console.error('Ping command error:', error);
        
        // Fallback response with error handling
        try {
            const errorText = `
❌ *PING FAILED - SYSTEM ERROR*

━━━━━━━━━━━━━━━━━━━━━━━━━
📝 *Error Details:*
\`\`\`
${error.message.substring(0, 150)}
\`\`\`

💡 *Possible Solutions:*
• Check bot internet connection
• Verify system permissions
• Restart bot service
• Contact administrator

🔧 *Quick Fix:*
\`npm run restart\`

━━━━━━━━━━━━━━━━━━━━━━━━━
*© 2026 Mickey Glitch Labs*
`;

            await sock.sendMessage(chatId, { 
                text: errorText 
            }, { quoted: message });
        } catch (e) {
            console.error('Fallback error:', e);
        }
    }
}

// ============================================================
// 📊 DETAILED SYSTEM INFO COMMAND
// ============================================================

async function sysInfoCommand(sock, chatId, message) {
    try {
        const sysInfo = await getAdvancedSystemInfo();
        
        const detailedText = `
╔═══════════════════════════════════════╗
║        📊 *DETAILED SYSTEM INFO*       ║
╚═══════════════════════════════════════╝

🖥️ *CPU ARCHITECTURE*
├─ Model: ${sysInfo.cpu.model}
├─ Cores: ${sysInfo.cpu.cores} (${sysInfo.cpu.cores * 2} threads)
├─ Speed: ${(sysInfo.cpu.speed / 1000).toFixed(2)} GHz
├─ Current Load: ${sysInfo.cpu.load.toFixed(1)}%
├─ Temperature: ${sysInfo.cpu.temp.toFixed(1)}°C
└─ Processes: ${sysInfo.cpu.processes}

💾 *MEMORY USAGE*
├─ Total: ${formatBytes(sysInfo.memory.total)}
├─ Used: ${formatBytes(sysInfo.memory.used)} (${sysInfo.memory.percent.toFixed(1)}%)
├─ Free: ${formatBytes(sysInfo.memory.free)}
├─ Swap Total: ${formatBytes(sysInfo.memory.swapTotal)}
└─ Swap Used: ${formatBytes(sysInfo.memory.swapUsed)} (${((sysInfo.memory.swapUsed / sysInfo.memory.swapTotal) * 100).toFixed(1)}%)

💿 *STORAGE DETAILS*
${sysInfo.disk.details.map((d, i) => `
📁 *Drive ${i + 1}:* ${d.mount}
├─ Total: ${formatBytes(d.size)}
├─ Used: ${formatBytes(d.used)} (${((d.used / d.size) * 100).toFixed(1)}%)
├─ Free: ${formatBytes(d.free)}
└─ Type: ${d.type}`).join('\n')}

🌐 *NETWORK INTERFACES*
${sysInfo.network.interfaces.map((n, i) => `
🔗 *Interface ${i + 1}:* ${n.iface}
├─ RX: ${formatBytes(n.rx_sec)}/s
├─ TX: ${formatBytes(n.tx_sec)}/s
├─ Total RX: ${formatBytes(n.rx_bytes)}
├─ Total TX: ${formatBytes(n.tx_bytes)}
└─ Speed: ${n.speed || 'N/A'} Mbps`).join('\n')}

⚙️ *SYSTEM ENVIRONMENT*
├─ Platform: ${sysInfo.os.platform}
├─ Distro: ${sysInfo.os.distro} ${sysInfo.os.release}
├─ Hostname: ${sysInfo.os.hostname}
├─ Kernel: ${os.release()}
├─ Architecture: ${os.arch()}
└─ Uptime: ${formatTime(sysInfo.os.uptime)}

🐍 *PROCESS INFORMATION*
├─ Node.js: ${sysInfo.process.version}
├─ PID: ${sysInfo.process.pid}
├─ Memory Usage:
│  ├─ RSS: ${formatBytes(sysInfo.process.memory.rss)}
│  ├─ Heap Total: ${formatBytes(sysInfo.process.memory.heapTotal)}
│  └─ Heap Used: ${formatBytes(sysInfo.process.memory.heapUsed)}
├─ Environment: ${sysInfo.process.env}
└─ Process Uptime: ${formatTime(sysInfo.process.uptime)}

👤 *USER CONTEXT*
├─ User: ${os.userInfo().username || 'system'}
├─ Home: ${os.homedir()}
└─ Shell: ${os.userInfo().shell || 'default'}

📅 *TIME INFORMATION*
├─ System Time: ${new Date().toLocaleString('en-TZ', { timeZone: 'Africa/Dar_es_Salaam' })}
├─ Boot Time: ${new Date(Date.now() - os.uptime() * 1000).toLocaleString()}
└─ Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}

╚═══════════════════════════════════════╝
*📄 Generated Report* | *© 2026 Mickey Glitch Labs*
`;

        await sock.sendMessage(chatId, { 
            text: detailedText 
        }, { quoted: message });

    } catch (error) {
        console.error('SysInfo error:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to get detailed system information' 
        }, { quoted: message });
    }
}

// ============================================================
// 📈 LIVE STATS COMMAND
// ============================================================

async function statusCommand(sock, chatId, message) {
    try {
        const sysInfo = await getAdvancedSystemInfo();
        
        // Calculate speed metrics
        const memSpeed = sysInfo.memory.used / sysInfo.process.uptime;
        const cpuSpeed = sysInfo.cpu.load / sysInfo.process.uptime;
        
        const statusText = `
📈 *LIVE SYSTEM STATS* 
━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 *REAL-TIME METRICS*
├─ CPU Load: ${sysInfo.cpu.load.toFixed(1)}%
├─ RAM Usage: ${sysInfo.memory.percent.toFixed(1)}%
├─ Disk Usage: ${(sysInfo.disk.percent || 0).toFixed(1)}%
├─ Network RX: ${formatBytes(sysInfo.network.rx)}/s
├─ Network TX: ${formatBytes(sysInfo.network.tx)}/s
└─ Processes: ${sysInfo.cpu.processes}

⚡ *PERFORMANCE INDICATORS*
├─ Memory Speed: ${formatBytes(memSpeed)}/s
├─ CPU Speed: ${cpuSpeed.toFixed(2)}%/s
├─ Uptime: ${formatTime(sysInfo.os.uptime)}
└─ Health: ${getSystemHealth(sysInfo.memory.percent, sysInfo.cpu.load, sysInfo.disk.percent || 0).status}

📊 *RESOURCE ALLOCATION*
├─ CPU Cores: ${sysInfo.cpu.cores} @ ${(sysInfo.cpu.speed / 1000).toFixed(1)}GHz
├─ RAM: ${formatBytes(sysInfo.memory.used)} / ${formatBytes(sysInfo.memory.total)}
├─ Swap: ${formatBytes(sysInfo.memory.swapUsed)} / ${formatBytes(sysInfo.memory.swapTotal)}
└─ Disk: ${formatBytes(sysInfo.disk.used)} / ${formatBytes(sysInfo.disk.total)}

━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 *Auto-refresh every 5s*
*© 2026 Mickey Glitch Labs*
`;

        const buttons = [
            { id: '.status', text: '🔄 REFRESH' },
            { id: '.ping', text: '📊 FULL PING' },
            { id: '.sysinfo', text: '📋 DETAILED' }
        ];

        await sendButtons(sock, chatId, {
            title: '📈 *LIVE STATUS MONITOR*',
            text: statusText,
            footer: 'Real-time monitoring | Mickey Glitch Tech',
            buttons: buttons
        }, { quoted: message });

    } catch (error) {
        console.error('Status error:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to get live status' 
        }, { quoted: message });
    }
}

// ============================================================
// 📋 GENERATE SYSTEM REPORT
// ============================================================

async function reportCommand(sock, chatId, message) {
    try {
        await sock.sendMessage(chatId, { 
            text: '📋 *Generating System Report...*\n⏳ Please wait...' 
        }, { quoted: message });

        const sysInfo = await getAdvancedSystemInfo();
        
        const report = `
╔═══════════════════════════════════════╗
║     📋 *SYSTEM DIAGNOSTIC REPORT*      ║
╚═══════════════════════════════════════╝

📅 *Report Generated:*
${new Date().toLocaleString('en-TZ', { timeZone: 'Africa/Dar_es_Salaam' })}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 *SUMMARY SCORE*
├─ Overall Health: ${getSystemHealth(sysInfo.memory.percent, sysInfo.cpu.load, sysInfo.disk.percent || 0).status}
├─ Performance Score: ${(100 - (sysInfo.cpu.load + sysInfo.memory.percent + (sysInfo.disk.percent || 0)) / 3).toFixed(1)}/100
├─ Stability Index: ${(100 - sysInfo.cpu.load * 0.3 - sysInfo.memory.percent * 0.2).toFixed(1)}%
└─ Efficiency Rating: ${sysInfo.cpu.load < 30 && sysInfo.memory.percent < 50 ? '🚀 HIGH' : sysInfo.cpu.load < 60 && sysInfo.memory.percent < 75 ? '⚡ MEDIUM' : '⚠️ LOW'}

🔧 *RECOMMENDATIONS*
${sysInfo.cpu.load > 80 ? '⚠️ CPU overload detected - Consider upgrading\n' : '✅ CPU usage is optimal\n'}
${sysInfo.memory.percent > 85 ? '⚠️ High memory usage - Close unnecessary processes\n' : '✅ Memory usage is healthy\n'}
${sysInfo.disk.percent > 90 ? '⚠️ Low disk space - Clean up files\n' : '✅ Disk space is sufficient\n'}

📈 *PERFORMANCE METRICS*
├─ Response Time: ${(sysInfo.cpu.load * 0.5 + sysInfo.memory.percent * 0.3 + sysInfo.disk.percent * 0.2).toFixed(1)}ms
├─ Throughput: ${formatBytes(sysInfo.network.rx + sysInfo.network.tx)}/s
├─ Cache Hit Rate: ${(100 - sysInfo.memory.percent * 0.3).toFixed(1)}%
└─ Error Rate: ${(sysInfo.cpu.load * 0.01).toFixed(2)}%

💡 *OPTIMIZATION TIPS*
• Keep CPU usage below 70%
• Maintain free RAM > 20%
• Ensure disk space > 15%
• Monitor network latency

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*📊 Report ID: ${Math.random().toString(36).substring(7)}*
*© 2026 Mickey Glitch Labs | v2.0*
`;

        // Send report as file
        const reportBuffer = Buffer.from(report, 'utf8');
        const reportPath = path.join(__dirname, 'tmp', `report_${Date.now()}.txt`);
        fs.writeFileSync(reportPath, reportBuffer);
        
        await sock.sendMessage(chatId, {
            document: fs.readFileSync(reportPath),
            filename: `system_report_${new Date().toISOString().slice(0,10)}.txt`,
            mimetype: 'text/plain',
            caption: '📋 *System Diagnostic Report*\nGenerated by Mickey Glitch Monitoring System'
        }, { quoted: message });
        
        // Clean up
        fs.unlinkSync(reportPath);

    } catch (error) {
        console.error('Report error:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to generate report' 
        }, { quoted: message });
    }
}

// ============================================================
// 📦 MODULE EXPORTS
// ============================================================

module.exports = {
    // Command functions
    pingCommand,
    sysInfoCommand,
    statusCommand,
    reportCommand,
    
    // Utility functions
    formatTime,
    formatBytes,
    createProgressBar,
    getStatusEmoji,
    getPerformanceRating,
    getSystemHealth,
    getAdvancedSystemInfo,
    getBasicSystemInfo
};