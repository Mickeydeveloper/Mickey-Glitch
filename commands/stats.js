/**
 * .stats command - Show system statistics
 * Usage: .stats
 */

const os = require('os');
const fs = require('fs');
const path = require('path');

// Hakikisha ume-import AIRich hapa kama haipo kwenye global scope
// Mfano: const AIRich = require('../lib/AIRich'); (rekebisha path kulingana na muundo wako)

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
        // Pata data zote za takwimu
        const stats = getBotStats();
        const sysStats = getSystemStats();

        const memUsage = process.memoryUsage();
        const ramMB = (memUsage.rss / 1024 / 1024).toFixed(2);
        const heapMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);

        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        const uptimeStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;

        // --- MATUMIZI YA FORMULA YA AIRich (TABLES) ---
        // Tunaunda meza nne tofauti kwa ajili ya Registry, Memory, CPU na System Info
        const richMessage = new AIRich(sock)
            .text("🤖 *MICKEY GLITCH SYSTEM STATS*\n")
            
            .text("\n📊 *REGISTRY STATUS*")
            .addTable([
                ["Kipengele", "Idadi / Hali"],
                ["Commands", `${stats.commands} loaded`],
                ["Libraries", `${stats.libraries} loaded`],
                ["Data Files", `${stats.dataFiles} reg`],
                ["Handlers", `${stats.specialHandlers} active`]
            ])

            .text("\n💾 *MEMORY USAGE*")
            .addTable([
                ["Aina", "Kipimo"],
                ["Total RAM", `${ramMB} MB`],
                ["Heap Used", `${heapMB} MB`],
                ["Sys Free", `${sysStats.freeMem} / ${sysStats.totalMem} GB`]
            ])

            .text("\n⚡ *CPU & UPTIME STATUS*")
            .addTable([
                ["Kipengele", "Thamani"],
                ["CPU Usage", `${sysStats.cpuUsage}%`],
                ["Load Avg", `${sysStats.loadAvg1} | ${sysStats.loadAvg5}`],
                ["Uptime", uptimeStr],
                ["Cores", `${os.cpus().length}`]
            ])

            .text("\n🔧 *SYSTEM ENGINE*")
            .addTable([
                ["Engine", "Toleo / Aina"],
                ["Node Ver", process.version],
                ["Platform", os.platform()]
            ])
            
            .text("\n✅ *Status:* All Systems Operational")
            .build(); // Jenga ujumbe wa mwisho

        // Tunatuma ujumbe uliosindikwa na AIRich
        await sock.sendMessage(chatId, richMessage, { quoted: m });

    } catch (e) {
        console.error('Stats error:', e);
        try {
            await sock.sendMessage(chatId, { text: `❌ Error: ${e.message}` }, { quoted: m });
        } catch (err) {}
    }
};
