const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const isOwnerOrSudo = require('../lib/isOwner');

// Disk cleanup function
async function diskCleanup() {
    const tempDir = path.join(process.cwd(), 'temp');
    const tmpDir = path.join(process.cwd(), 'tmp');
    const dirs = [tempDir, tmpDir];
    let totalDeleted = 0;

    for (const dir of dirs) {
        if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                try {
                    const filePath = path.join(dir, file);
                    const stat = fs.statSync(filePath);
                    // Delete files older than 1 hour for immediate cleanup
                    if (Date.now() - stat.mtimeMs > 60 * 60 * 1000) {
                        if (stat.isDirectory()) {
                            fs.rmSync(filePath, { recursive: true, force: true });
                        } else {
                            fs.unlinkSync(filePath);
                        }
                        totalDeleted++;
                    }
                } catch (err) {
                    // Silent fail
                }
            }
        }
    }

    return totalDeleted;
}

// RAM cleanup function
async function ramCleanup() {
    try {
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
            return true;
        }
        return false;
    } catch (err) {
        return false;
    }
}

// CPU and system optimization
async function getSystemInfo() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(2);

    const cpus = os.cpus();
    const loadAvg = os.loadavg();

    return {
        memory: {
            total: (totalMem / 1024 / 1024 / 1024).toFixed(2) + ' GB',
            used: (usedMem / 1024 / 1024 / 1024).toFixed(2) + ' GB',
            free: (freeMem / 1024 / 1024 / 1024).toFixed(2) + ' GB',
            usagePercent: memUsagePercent + '%'
        },
        cpu: {
            cores: cpus.length,
            model: cpus[0].model,
            loadAvg: loadAvg.map(l => l.toFixed(2))
        },
        platform: os.platform(),
        uptime: (os.uptime() / 3600).toFixed(2) + ' hours'
    };
}

// Quick response optimization
async function optimizePerformance() {
    // Clear Node.js cache (selective)
    const cacheSize = Object.keys(require.cache).length;

    // Clear old cache entries (older than 1 hour)
    const now = Date.now();
    let clearedCache = 0;
    for (const key in require.cache) {
        try {
            const stat = fs.statSync(key);
            if (now - stat.mtimeMs > 60 * 60 * 1000) {
                delete require.cache[key];
                clearedCache++;
            }
        } catch (err) {
            // File might not exist
        }
    }

    return { cacheSize, clearedCache };
}

// Main cleanup command
async function cleanupCommand(sock, chatId, msg) {
    try {
        const senderId = msg.key.participant || msg.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

        if (!msg.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, {
                text: '❌ This command is only available for the owner!'
            });
            return;
        }

        // Start cleanup process
        await sock.sendMessage(chatId, {
            text: '🧹 Starting comprehensive system cleanup...\n⏳ Please wait...'
        });

        // Run all cleanup operations
        const [diskCleaned, ramCleaned, sysInfo, perfOpt] = await Promise.all([
            diskCleanup(),
            ramCleanup(),
            getSystemInfo(),
            optimizePerformance()
        ]);

        // Build response message
        let response = '✅ *SYSTEM CLEANUP COMPLETED*\n\n';

        // Disk cleanup results
        response += `🗂️ *Disk Cleanup:*\n`;
        response += `• Files cleaned: ${diskCleaned}\n\n`;

        // RAM cleanup results
        response += `🧠 *RAM Cleanup:*\n`;
        response += `• GC executed: ${ramCleaned ? '✅' : '❌ (GC not available)'}\n\n`;

        // Performance optimization
        response += `⚡ *Performance Optimization:*\n`;
        response += `• Cache cleared: ${perfOpt.clearedCache} entries\n`;
        response += `• Cache size: ${perfOpt.cacheSize} modules\n\n`;

        // System information
        response += `📊 *System Status:*\n`;
        response += `• Memory: ${sysInfo.memory.used}/${sysInfo.memory.total} (${sysInfo.memory.usagePercent})\n`;
        response += `• CPU Cores: ${sysInfo.cpu.cores}\n`;
        response += `• Load Average: ${sysInfo.cpu.loadAvg.join(', ')}\n`;
        response += `• Uptime: ${sysInfo.uptime}\n\n`;

        // Performance tips
        response += `💡 *Performance Tips:*\n`;
        response += `• Use .cleartmp for manual temp cleanup\n`;
        response += `• Use .clearsession for session optimization\n`;
        response += `• Bot is now optimized for quick responses!`;

        await sock.sendMessage(chatId, { text: response });

    } catch (error) {
        console.error('Error in cleanup command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to complete system cleanup!'
        });
    }
}

module.exports = cleanupCommand;