/**
 * UNPAIR COMMAND - Clear WhatsApp Pairing
 * Usage: /unpair
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
        console.error(`[UNPAIR CMD] Send message error: ${error.message}`);
        return false;
    }
}

/**
 * Main unpair command handler
 */
async function execute(sock, chatId, args, message) {
    try {
        if (!credentials.isPaired()) {
            return await sendTelegramMessage(
                chatId,
                '⚠️ <b>Not Paired</b>\n\n' +
                'No WhatsApp account is currently paired.\n\n' +
                'To pair an account, use:\n' +
                '<code>/pair &lt;phone_number&gt;</code>'
            );
        }

        const currentNumber = credentials.getPairedNumber();
        
        // Clear the pairing
        credentials.clearPairing();

        await sendTelegramMessage(
            chatId,
            '✅ <b>Pairing Cleared!</b>\n\n' +
            `📱 <b>Unpaired:</b> <code>${currentNumber}</code>\n` +
            '<b>Status:</b> Disconnected\n\n' +
            'To pair a new account, use:\n' +
            '<code>/pair &lt;phone_number&gt;</code>'
        );

        return true;

    } catch (error) {
        console.error(`[UNPAIR CMD] Error: ${error.message}`);
        await sendTelegramMessage(
            chatId,
            `❌ <b>Error:</b> <code>${error.message}</code>\n\n` +
            'Please try again later.'
        );
        return false;
    }
}

module.exports = {
    name: 'unpair',
    aliases: ['unlink', 'disconnect'],
    config: {
        description: 'Disconnect WhatsApp pairing',
        category: 'account'
    },
    execute
};
