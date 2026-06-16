/**
 * .stats command - Show system statistics
 * Usage: .stats
 */

const os = require('os');
const fs = require('fs');
const path = require('path');

// Function to get bot stats without external dependency
function getBotStats() {
    try {
        // Count command files
        const commandsDir = path.join(process.cwd(), 'commands');
        let commandsCount = 0;
        let librariesCount = 0;
        
        if (fs.existsSync(commandsDir)) {
            commandsCount = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js')).length;
        }
        
        // Count library files
        const libDir = path.join(process.cwd(), 'lib');
        if (fs.existsSync(libDir)) {
            librariesCount = fs.readdirSync(libDir).filter(f => f.endsWith('.js')).length;
        }
        
        // Count data files
        const dataDir = path.join(process.cwd(), 'data');
        let dataFiles = 0;
        if (fs.existsSync(dataDir)) {
            dataFiles = fs.readdirSync(dataDir).length;
        }
        
        return {
            commands: commandsCount,
            libraries: librariesCount,
            dataFiles: dataFiles,
            specialHandlers: 4,
            timestamp: Date.now()
        };
    } catch (err) {
        console.error('Error getting stats:', err);
        return {
            commands: 0,
            libraries: 0,
            dataFiles: 0,
            specialHandlers: 0,
            timestamp: Date.now()
        };
    }
}

// Function to get detailed system stats
function getSystemStats() {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    
    // Calculate CPU usage
    let totalIdle = 0;
    let totalTick = 0;
    cpus.forEach(cpu => {
        for (let type in cpu.times) {
            totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
    });
    
    const cpuUsage = ((1 - totalIdle / totalTick) * 100).toFixed(2);
    
    return {
        cpuUsage: cpuUsage,
        loadAvg1: loadAvg[0].toFixed(2),
        loadAvg5: loadAvg[1].toFixed(2),
        loadAvg15: loadAvg[2].toFixed(2),
        totalMem: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2),
        freeMem: (os.freemem() / 1024 / 1024 / 1024).toFixed(2)
    };
}

module.exports = async (sock, chatId, senderId, args, m) => {
    try {
        // Get bot stats
        const stats = getBotStats();
        
        // Get system stats
        const sysStats = getSystemStats();

        // Get memory usage
        const memUsage = process.memoryUsage();
        const ramMB = (memUsage.rss / 1024 / 1024).toFixed(2);
        const heapMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
        const heapTotalMB = (memUsage.heapTotal / 1024 / 1024).toFixed(2);

        // Get uptime
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        // Build stats message
        const statsMsg = `
🤖 *MICKEY GLITCH SYSTEM STATS*

📊 *Registry Status:*
├ Commands: ${stats.commands} loaded
├ Libraries: ${stats.libraries} loaded
├ Data Files: ${stats.dataFiles} registered
└ Handlers: ${stats.specialHandlers} active

💾 *Memory Usage:*
├ Total RAM: ${ramMB} MB
├ Heap Used: ${heapMB} MB
├ Heap Total: ${heapTotalMB} MB
└ System Free: ${sysStats.freeMem} GB / ${sysStats.totalMem} GB

⚡ *CPU Status:*
├ Usage: ${sysStats.cpuUsage}%
├ Load Avg (1m): ${sysStats.loadAvg1}
├ Load Avg (5m): ${sysStats.loadAvg5}
└ CPU Cores: ${os.cpus().length}

⏱️ *Uptime:*
├ ${days}d ${hours}h ${minutes}m ${seconds}s
└ Updated: ${new Date(stats.timestamp).toLocaleTimeString()}

🔧 *System:*
├ Node Version: ${process.version}
├ Platform: ${os.platform()}
└ CPU Cores: ${os.cpus().length}

✅ *Status:* All Systems Operational
`;

        await sock.sendMessage(chatId, { text: statsMsg.trim() });

    } catch (e) {
        console.error('Stats error:', e);
        await sock.sendMessage(chatId, { text: `❌ Error: ${e.message}` });
    }
};