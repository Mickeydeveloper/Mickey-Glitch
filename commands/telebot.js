const settings = require('../settings');
const { startTelegramBot, isTelegramBotRunning } = require('../telegram-bot');

/**
 * .telebot command: Manages the Telegram bot bridge.
 * Usage: .telebot on
 */
async function telebotCommand(sock, chatId, message, body = '') {
    const args = body.split(' ');
    const action = args[1]?.toLowerCase();
    const hasTelegramToken = settings.telegram?.botToken && settings.telegram.botToken?.trim()?.length > 0;

    if (action === 'on') {
        if (!hasTelegramToken) {
            await sock.sendMessage(chatId, { 
                text: '⚠️ *Telegram Bot Token not configured.*\n\nPlease add your token in `settings.js` under `settings.telegram.botToken`.' 
            }, { quoted: message });
            return;
        }

        if (isTelegramBotRunning) {
            await sock.sendMessage(chatId, { text: '✅ *Telegram bot is already running!*' }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, { text: '⏳ *Attempting to start Telegram bot...*' }, { quoted: message });
        await startTelegramBot();
        await sock.sendMessage(chatId, { text: '✅ *Telegram bot startup initiated.*' }, { quoted: message });
        return;
    }

    // Default status/help message
    const status = isTelegramBotRunning ? 'Running ✅' : 'Stopped ❌';
    await sock.sendMessage(chatId, { 
        text: `🤖 *Telebot Manager*\n\n*Status:* ${status}\n\n*Usage:* \n.telebot on - To start the bot` 
    }, { quoted: message });
}

module.exports = telebotCommand;