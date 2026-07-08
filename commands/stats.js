/**
 * .stats command - Show system statistics using a single AIRich Table
 * Usage: .stats
 */

const os = require('os');
const fs = require('fs');
const path = require('path');
const { AIRich } = require('../lib/messageBuilder');

// Function to get bot stats without external dependency
function getBotStats() {
    try {
        const commandsDir = path.join(process.cwd(), 'commands');
        let commandsCount = 0;
        let librariesCount = 0;

        if (fs.existsSync(commandsDir)) {
            commandsCount = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js')).length;
        }

        const libDir = path.join(process.cwd(), 'lib');
        if (fs.existsSync(libDir)) {
            librariesCount = fs.readdirSync(libDir).filter(f => f.endsWith('.js')).length;
        }

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
        return { commands: 0, libraries: 0, dataFiles: 0, specialHandlers: 0, timestamp: Date.now() };
    }
}

// Function to get detailed system stats
function getSystemStats() {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();

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
        const stats = getBotStats();
        const sysStats = getSystemStats();

        const memUsage = process.memoryUsage();
        const ramMB = (memUsage.rss / 1024 / 1024).toFixed(2);
        const heapMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
        const heapTotalMB = (memUsage.heapTotal / 1024 / 1024).toFixed(2);

        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        const uptimeStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;

        // Muundo wa AIRich kwa kutumia addTable moja tu kubwa
        const rich = new AIRich(sock)
            .setTitle('🤖 MICKEY GLITCH ENGINE')
            .addTable([
                ["METRIC / COMPONENT", "VALUE / STATUS"],
                // --- REGISTRY STATUS ---
                ["📁 [ REGISTRY ]", "---"],
                ["Commands Loaded", `${stats.commands} js`],
                ["Libraries Loaded", `${stats.libraries} js`],
                ["Data Files Registered", `${stats.dataFiles} files`],
                ["Active Handlers", `${stats.specialHandlers} active`],
                // --- MEMORY USAGE ---
                ["💾 [ MEMORY ]", "---"],
                ["Total RAM RSS", `${ramMB} MB`],
                ["Heap Used", `${heapMB} MB`],
                ["Heap Total", `${heapTotalMB} MB`],
                ["System Free/Total", `${sysStats.freeMem}G / ${sysStats.totalMem}G`],
                // --- CPU & UPTIME ---
                ["⚡ [ PERFORMANCE ]", "---"],
                ["CPU Usage", `${sysStats.cpuUsage}%`],
                ["Load Avg (1m)", sysStats.loadAvg1],
                ["System Uptime", uptimeStr],
                ["Last Updated", new Date(stats.timestamp).toLocaleTimeString()],
                // --- ENVIRONMENT INFO ---
                ["🔧 [ SYSTEM ENV ]", "---"],
                ["Node Version", process.version],
                ["Platform OS", os.platform()],
                ["CPU Cores", `${os.cpus().length} Cores`],
                ["Engine Status", "Operational ✅"]
            ]);

        // Inatuma jedwali zima kwenda kwenye chat
        await rich.send(chatId, { quoted: m, forwarded: true });

    } catch (e) {
        console.error('Stats error:', e);
        await sock.sendMessage(chatId, { text: `❌ Error: ${e.message}` }, { quoted: m });
    }
};
