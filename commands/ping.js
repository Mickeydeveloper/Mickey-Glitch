const os = require('os');
const { safeSendMessage } = require('../lib/myfunc');

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

        // Monospace font style used below
        const smallInfo = `\`\`\`
[ MICKEY GLITCH ]
• Speed  : ${latency}ms
• Online : ${uptime}
• Memory : ${ram}MB
\`\`\``;

        await safeSendMessage(sock, chatId, { text: smallInfo }, { edit: sentMsg.key });

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
