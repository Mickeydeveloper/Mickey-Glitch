const os = require('os');
const { performance } = require('perf_hooks');

module.exports = {
    name: "ping",
    aliases: ["latency", "speed", "test"],
    category: "utility",
    permissions: {
        coin: 0
    },
    code: async (ctx) => {
        try {
            const start = performance.now();
            
            // Kupata info ya system
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const usedMem = totalMem - freeMem;
            const memPercent = ((usedMem / totalMem) * 100).toFixed(1);
            
            const latency = Math.round(performance.now() - start);
            const pingEmoji = latency < 100 ? '🟢' : latency < 200 ? '🟡' : '🔴';
            
            // Kupunguza bytes
            const formatBytes = (bytes) => {
                if (bytes === 0) return '0B';
                const k = 1024;
                const sizes = ['B', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
            };
            
            // Uptime formatting
            const formatUptime = (seconds) => {
                const days = Math.floor(seconds / 86400);
                const hours = Math.floor((seconds % 86400) / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                const secs = Math.floor(seconds % 60);
                const parts = [];
                if (days > 0) parts.push(`${days}d`);
                if (hours > 0) parts.push(`${hours}h`);
                if (minutes > 0) parts.push(`${minutes}m`);
                parts.push(`${secs}s`);
                return parts.join(' ');
            };
            
            const botUptime = formatUptime(process.uptime());
            const cpuCores = os.cpus().length;
            
            const text = `📡 *Mickey Glitch - Speedtest*

*— PERFORMANCE —*
⚡ *Ping:* ${latency}ms ${pingEmoji}
⏱️ *Uptime:* ${botUptime}

*— SERVER STATS —*
🖥️ *CPU:* ${cpuCores} Cores
💾 *RAM:* ${formatBytes(usedMem)} / ${formatBytes(totalMem)} (${memPercent}%)

_Mickey Glitch Technology™_`;

            return await ctx.reply(text);
        } catch (error) {
            await tools.cmd.handleError(ctx, error, true);
        }
    }
};
