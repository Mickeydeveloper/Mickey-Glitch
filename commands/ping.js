const os = require('os');
const { safeSendMessage } = require('../lib/myfunc');
const { sendButtons } = require('gifted-btns');

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
}

async function pingCommand(sock, chatId, message) {
    try {
        const start = Date.now();
        const sentMsg = await safeSendMessage(sock, chatId, { text: 'Checking...' }, { quoted: message });
        const latency = Date.now() - start;

        const uptime = formatTime(process.uptime());
        const ram = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
        const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
        const freeRam = (os.freemem() / 1024 / 1024 / 1024).toFixed(1);
        const cpu = os.cpus().length;
        const platform = os.platform();

        // System status
        const status = latency < 100 ? '🟢 Excellent' : latency < 300 ? '🟡 Good' : '🔴 Slow';

        const pingText = `
🚀 *SYSTEM STATUS CHECK*
━━━━━━━━━━━━━━━━━━━━━━
⚡ *Speed:* ${latency}ms (${status})
⏱️ *Uptime:* ${uptime}
💾 *RAM:* ${ram}MB / ${totalRam}GB
🆓 *Free RAM:* ${freeRam}GB
🖥️ *CPU Cores:* ${cpu}
💻 *Platform:* ${platform}
━━━━━━━━━━━━━━━━━━━━━━
*© 2026 Mickey Glitch Labs™*`;

        const buttons = [
            { id: 'ping', text: '🔄 REFRESH' },
            { id: 'ping_detailed', text: '📊 DETAILED INFO' },
            { id: 'help', text: '❓ HELP' }
        ];

        await sendButtons(sock, chatId, {
            title: '⚡ PING RESULTS',
            text: pingText,
            footer: 'Mickey Glitch Tech',
            buttons: buttons
        }, { quoted: message });

    } catch (error) {
        console.error('Ping command error:', error);
        // Try to send error message
        try {
            await safeSendMessage(sock, chatId, { text: '❌ Ping failed - connection issue' }, { quoted: message });
        } catch (e) {
            // Silent fail
        }
    }
}

module.exports = pingCommand;
