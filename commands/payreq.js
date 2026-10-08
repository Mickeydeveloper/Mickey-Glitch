const isAdmin = require('../lib/isAdmin');

/**
 * Payment Request command: Send interactive payment request
 * Usage: .payreq [amount]
 * Example: .payreq 50000
 */
async function payReqCommand(sock, chatId, senderId, text, message) {
    try {
        // Extract amount from text or default to 0
        const cleanText = (text || '').trim();
        const amountValue = cleanText && !isNaN(cleanText) ? parseInt(cleanText) : 0;

        const params = {
            currency: 'IDR',
            payment_type: 'upr',
            total_amount: { value: amountValue, offset: 100 },
            reference_id: '4WE1QWVYL6Z',
            type: 'physical-goods',
            order: { 
                status: 'pending', 
                order_type: 'PAYMENT_REQUEST' 
            },
            payment_settings: [
                {
                    type: 'payment_account',
                    payment_account: {
                        account_type: 'digital_wallet',
                        identifier_type: 'phone_number',
                        identifier_value: '+62 8587107433',
                        institution_name: 'DANA',
                        beneficiary_name: 'halahjembot'
                    }
                },
                {
                    type: 'payment_account',
                    payment_account: {
                        account_type: 'digital_wallet',
                        identifier_type: 'phone_number',
                        identifier_value: '+62 85871074338',
                        institution_name: 'GoPay',
                        beneficiary_name: 'halahjembot'
                    }
                }
            ]
        };

        // Show typing indicator
        await sock.sendPresenceUpdate('composing', chatId);

        // Send payment request interactive message
        await sock.sendMessage(chatId, {
            interactiveMessage: {
                body: { text: '💰 *Payment Request*' },
                footer: { text: 'Review detail di bawah' },
                nativeFlowMessage: {
                    messageVersion: 1,
                    buttons: [
                        {
                            name: 'review_and_pay',
                            buttonParamsJson: JSON.stringify(params)
                        }
                    ]
                }
            }
        }, { quoted: message });

    } catch (e) {
        console.error('payReqCommand error:', e && e.message ? e.message : e);
        try {
            await sock.sendMessage(chatId, { 
                text: '❌ An error occurred while sending payment request.' 
            }, { quoted: message });
        } catch (err) {}
    }
}

module.exports = payReqCommand;
