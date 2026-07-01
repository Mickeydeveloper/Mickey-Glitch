/**
 * STATUS COMMAND - Check WhatsApp Pairing Status
 * Usage: /status
 */

const credentials = require('../lib/credentials');
const axios = require('axios');

async function sendTelegramMessage(chatId, text) {
    const settings = require('../settings');
    const token = settings.telegram?.botToken?.trim();
    if (!token) return false;

    try {
        const response = await axios.post(
            `https://api.telegram.org/bot${token}/sendMessage`,
            {
                chat_id: String(chatId),
                text: text,
                parse_mode: 'HTML'
            },
            { timeout: 30000 }
        );
        return response?.data?.ok === true;
    } catch (error) {
        console.error(`[STATUS CMD] Send message error: ${error.message}`);
        return false;
    }
}

/**
 * Main status command handler
 */
async function execute(sock, chatId, args, message) {
    try {
        const creds = credentials.getAllCreds();
        
        if (!creds.paired) {
            return await sendTelegramMessage(
                chatId,
                '⚠️ <b>WhatsApp Status: Not Paired</b>\n\n' +
                '📱 No WhatsApp account is currently connected.\n\n' +
                '<b>To pair an account:</b>\n' +
                '<code>/pair &lt;phone_number&gt;</code>\n\n' +
                '<b>Example:</b>\n' +
                '<code>/pair 255612130873</code>'
            );
        }

        const pairedDate = new Date(creds.pairedAt);
        const pairedTime = pairedDate.toLocaleString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit'
        });

        return await sendTelegramMessage(
            chatId,
            '✅ <b>WhatsApp Status: Connected</b>\n\n' +
            '<b>📱 Phone Number:</b>\n' +
            `<code>${creds.phoneNumber}</code>\n\n` +
            '<b>🔗 Status:</b> Active\n' +
            '<b>📅 Paired Since:</b> ' + pairedTime + '\n\n' +
            '<b>Available Commands:</b>\n' +
            '• <code>/help</code> - Show all commands\n' +
            '• <code>/unpair</code> - Disconnect account\n' +
            '• <code>/alive</code> - Check bot status'
        );

    } catch (error) {
        console.error(`[STATUS CMD] Error: ${error.message}`);
        await sendTelegramMessage(
            chatId,
            `❌ <b>Error:</b> <code>${error.message}</code>`
        );
        return false;
    }
}

module.exports = {
    name: 'status',
    aliases: ['stat', 'info'],
    config: {
        description: 'Check WhatsApp pairing status',
        category: 'info'
    },
    execute
};
