const os = require('os');
const settings = require('../settings.js');

function formatTime(seconds) {
    seconds = Math.floor(seconds); // Ensure integer

    const days = Math.floor(seconds / 86400);
    seconds %= 86400;
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    seconds %= 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

    return parts.join(' ');
}

async function pingCommand(sock, chatId, message) {
    try {
        // Send initial Pong! and measure latency
        const start = Date.now();
        const pongMsg = await sock.sendMessage(chatId, { text: 'Pong! 🏓' }, { quoted: message });
        const latency = Date.now() - start;

        // Format uptime
        const uptimeFormatted = formatTime(process.uptime());

        // Gather additional system info for richer display
        const cpuCount = os.cpus().length;
        const totalMemGB = (os.totalmem() / (1024 ** 3)).toFixed(2);
        const freeMemGB = (os.freemem() / (1024 ** 3)).toFixed(2);

        // Improved visually appealing box with consistent alignment
        const botInfo = `
┏━━〔 *Mickey Glitch™* 〕━━┓
┃
┃ 🚀 *Ping*       : ${latency} ms
┃ ⏱️ *Uptime*     : ${uptimeFormatted}
┃ 💻 *CPU Cores*  : ${cpuCount}
┃ 🧠 *RAM*        : \( {freeMemGB} / \){totalMemGB} GB
┃ 🔖 *Version*    : v${settings.version}
┃ 📍 *Platform*   : \( {os.platform()} ( \){os.arch()})
┃
┗━━━━━━━━━━━━━━━━━━━━━━┛`.trim();

        // Edit the initial "Pong!" message to show full info (more stable and cleaner)
        await sock.sendMessage(chatId, {
            text: botInfo,
            edit: pongMsg.key
        });

    } catch (error) {
        console.error('Error in ping command:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to get bot status.' }, { quoted: message });
    }
}

module.exports = pingCommand;