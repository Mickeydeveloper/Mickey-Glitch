const settings = require('../settings');
const {
    startTelegramBot,
    stopTelegramBot,
    isTelegramBotRunning,
    isTelegramBotEnabled,
} = require('../glitch/telegram-bot');

/**
 * .telebot command: Manages the Telegram bot bridge.
 * Usage: .telebot on
 */
async function telebotCommand(sock, chatId, message, body = '') {
    const args = Array.isArray(body)
        ? body.map(String).filter(Boolean)
        : String(body || '').trim().split(/\s+/).filter(Boolean);
    const action = args[1]?.toLowerCase();
    const hasTelegramToken = settings.telegram?.botToken && settings.telegram.botToken?.trim()?.length > 0;

    if (action === 'on') {
        if (!hasTelegramToken) {
            await sock.sendMessage(chatId, { 
                text: '⚠️ *Telegram Bot Token not configured.*\n\nPlease add your token in `settings.js` under `settings.telegram.botToken`.' 
            }, { quoted: message });
            return;
        }

        if (isTelegramBotRunning()) {
            await sock.sendMessage(chatId, { text: '✅ *Telegram bot is already running!*' }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, { text: '⏳ *Attempting to start Telegram bot...*' }, { quoted: message });
        const started = await startTelegramBot(sock);
        await sock.sendMessage(chatId, {
            text: started ? '✅ *Telegram bot imewashwa kikamilifu.*' : '❌ *Telegram bot haikuwashwa.*',
        }, { quoted: message });
        return;
    }

    if (action === 'off' || action === 'stop') {
        if (!isTelegramBotRunning()) {
            await stopTelegramBot();
            await sock.sendMessage(chatId, { text: 'ℹ️ *Telegram bot tayari imezimwa.*' }, { quoted: message });
            return;
        }

        await stopTelegramBot();
        await sock.sendMessage(chatId, { text: '🛑 *Telegram bot imezimwa kikamilifu.*' }, { quoted: message });
        return;
    }

    // Default status/help message
    const status = isTelegramBotRunning() ? 'Running ✅' : 'Stopped ❌';
    const enabled = isTelegramBotEnabled() ? 'Enabled' : 'Disabled';
    await sock.sendMessage(chatId, { 
        text: `🤖 *Telebot Manager*\n\n*Status:* ${status}\n*Control:* ${enabled}\n\n*Usage:* \n.telebot on - Start the bot\n.telebot off - Stop the bot` 
    }, { quoted: message });
}

module.exports = telebotCommand;