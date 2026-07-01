/**
 * PAIR COMMAND - WhatsApp Pairing via Telegram
 * Usage: /pair <phone_number>
 * Example: /pair 255612130873
 */

const credentials = require('../lib/credentials');
const axios = require('axios');

// Temporary pairing sessions storage
const pairingSessionsMap = new Map();

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
        console.error(`[PAIR CMD] Send message error: ${error.message}`);
        return false;
    }
}

async function sendTelegramPhoto(chatId, photoUrl, caption = '') {
    const settings = require('../settings');
    const token = settings.telegram?.botToken?.trim();
    if (!token) return false;

    try {
        const response = await axios.post(
            `https://api.telegram.org/bot${token}/sendPhoto`,
            {
                chat_id: String(chatId),
                photo: photoUrl,
                caption: caption,
                parse_mode: 'HTML'
            },
            { timeout: 60000 }
        );
        return response?.data?.ok === true;
    } catch (error) {
        console.error(`[PAIR CMD] Send photo error: ${error.message}`);
        return false;
    }
}

function validatePhoneNumber(phone) {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/[^0-9]/g, '');
    
    // If starts with 0, replace with 255
    if (cleaned.startsWith('0') && cleaned.length > 1) {
        cleaned = '255' + cleaned.substring(1);
    }
    // If doesn't start with 255, add it
    else if (!cleaned.startsWith('255') && cleaned.length > 0) {
        cleaned = '255' + cleaned;
    }
    
    // Validate length (Tanzania format)
    if (cleaned.startsWith('255') && cleaned.length === 12) {
        return cleaned;
    }
    
    return null;
}

/**
 * Initialize pairing with WhatsApp bot instance
 * This will be called from index.js
 */
function initiatePairing(phoneNumber, chatId, mickeyBot) {
    if (!phoneNumber || !chatId) {
        throw new Error('Phone number and chat ID are required');
    }

    // Store the session
    const sessionId = `pair_${chatId}_${Date.now()}`;
    pairingSessionsMap.set(sessionId, {
        phoneNumber,
        chatId,
        mickeyBot,
        createdAt: Date.now(),
        status: 'pending'
    });

    return sessionId;
}

/**
 * Handle QR code from Baileys and send to Telegram
 */
async function handleQRCode(qrCode, chatId) {
    try {
        const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrCode)}`;
        
        await sendTelegramMessage(
            chatId,
            '📱 <b>WhatsApp QR Code Generated!</b>\n\n' +
            '<i>1. Open WhatsApp on your phone</i>\n' +
            '<i>2. Go to Settings → Linked Devices</i>\n' +
            '<i>3. Click "Link a Device"</i>\n' +
            '<i>4. Scan the QR code below</i>\n\n' +
            '⚠️ <b>QR Code expires in 2 minutes</b>'
        );

        await sendTelegramPhoto(
            chatId,
            qrImageUrl,
            '📱 <b>Scan this QR Code with WhatsApp</b>'
        );

        return true;
    } catch (error) {
        console.error(`[PAIR CMD] QR code handling error: ${error.message}`);
        return false;
    }
}

/**
 * Handle successful pairing
 */
async function handlePairingSuccess(phoneNumber, chatId, sessionId) {
    try {
        // Mark as paired in credentials
        credentials.markAsPaired(phoneNumber, chatId, sessionId);

        // Send success message
        await sendTelegramMessage(
            chatId,
            '✅ <b>WhatsApp Successfully Paired!</b>\n\n' +
            `📱 <b>Phone:</b> <code>${phoneNumber}</code>\n` +
            '<b>Status:</b> Connected and ready to use\n\n' +
            'You can now:\n' +
            '• Send and receive messages\n' +
            '• Use WhatsApp commands\n' +
            '• Manage groups\n\n' +
            '<b>Type /help for available commands</b>'
        );

        pairingSessionsMap.delete(sessionId);
        return true;
    } catch (error) {
        console.error(`[PAIR CMD] Pairing success handling error: ${error.message}`);
        return false;
    }
}

/**
 * Handle pairing failure
 */
async function handlePairingFailure(chatId, error) {
    try {
        await sendTelegramMessage(
            chatId,
            '❌ <b>Pairing Failed!</b>\n\n' +
            `<b>Error:</b> <code>${error.message || 'Unknown error'}</code>\n\n` +
            '💡 <b>Troubleshooting:</b>\n' +
            '• Make sure WhatsApp is installed on your phone\n' +
            '• Ensure you have internet connection\n' +
            '• Try scanning the QR code again\n' +
            '• Don\'t take a screenshot of the QR code\n\n' +
            '<b>Try again:</b> /pair &lt;your_number&gt;'
        );
        return false;
    } catch (error) {
        console.error(`[PAIR CMD] Pairing failure handling error: ${error.message}`);
        return false;
    }
}

/**
 * Main pair command handler
 */
async function execute(sock, chatId, args, message) {
    try {
        // Check if phone number is provided
        if (!args || args.trim().length === 0) {
            return await sendTelegramMessage(
                chatId,
                '📱 <b>WhatsApp Pairing Guide</b>\n\n' +
                '<b>Usage:</b> <code>/pair &lt;phone_number&gt;</code>\n\n' +
                '<b>Examples:</b>\n' +
                '• <code>/pair 255612130873</code> (Tanzania)\n' +
                '• <code>/pair 0612130873</code> (with 0)\n' +
                '• <code>/pair 612130873</code> (without country code)\n\n' +
                '⚠️ <b>Important:</b>\n' +
                '• Only <b>ONE</b> WhatsApp account can be paired\n' +
                '• Make sure the number is active and accessible\n' +
                '• You\'ll need to scan a QR code on the next step'
            );
        }

        const phoneNumber = validatePhoneNumber(args.trim());
        if (!phoneNumber) {
            return await sendTelegramMessage(
                chatId,
                '❌ <b>Invalid Phone Number!</b>\n\n' +
                'Format should be:\n' +
                '• Tanzania: +255612130873 or 0612130873\n' +
                '• Or just: 612130873 (will add +255 prefix)\n\n' +
                'Try again: /pair &lt;phone_number&gt;'
            );
        }

        // Check if already paired with different number
        if (credentials.isPaired()) {
            const currentNumber = credentials.getPairedNumber();
            if (currentNumber === phoneNumber) {
                return await sendTelegramMessage(
                    chatId,
                    '✅ <b>Already Paired</b>\n\n' +
                    `📱 <b>Phone:</b> <code>${phoneNumber}</code>\n` +
                    '<b>Status:</b> Active\n\n' +
                    'To pair a different number, first use /unpair'
                );
            } else {
                return await sendTelegramMessage(
                    chatId,
                    '⚠️ <b>Already Paired with Another Number</b>\n\n' +
                    `📱 <b>Current:</b> <code>${currentNumber}</code>\n` +
                    `📱 <b>Trying:</b> <code>${phoneNumber}</code>\n\n` +
                    'To pair this number instead, first unpair:\n' +
                    '• <code>/unpair</code> - Clear current pairing\n' +
                    '• Then try again: <code>/pair ${phoneNumber}</code>'
                );
            }
        }

        // Notify user that we're starting pairing
        await sendTelegramMessage(
            chatId,
            '⏳ <b>Initializing Pairing...</b>\n\n' +
            `📱 <b>Phone Number:</b> <code>${phoneNumber}</code>\n` +
            '<b>Status:</b> Connecting to WhatsApp...\n\n' +
            'Please wait while we generate your QR code...'
        );

        // Set pairing in progress
        const sessionId = initiatePairing(phoneNumber, chatId, sock);
        credentials.setPairingInProgress(phoneNumber, chatId);

        return {
            sessionId,
            phoneNumber,
            chatId,
            status: 'waiting_for_qr'
        };

    } catch (error) {
        console.error(`[PAIR CMD] Error: ${error.message}`);
        await sendTelegramMessage(
            chatId,
            `❌ <b>Error:</b> <code>${error.message}</code>\n\n` +
            'Please try again later or contact support.'
        );
        return null;
    }
}

module.exports = {
    name: 'pair',
    aliases: ['pairing', 'link'],
    config: {
        description: 'Pair WhatsApp account via Telegram',
        category: 'account'
    },
    execute,
    // Additional exports for integration with index.js
    validatePhoneNumber,
    initiatePairing,
    handleQRCode,
    handlePairingSuccess,
    handlePairingFailure,
    pairingSessionsMap,
    getPairingSession: (sessionId) => pairingSessionsMap.get(sessionId),
    removePairingSession: (sessionId) => pairingSessionsMap.delete(sessionId)
};
