/**
 * Payment Request command: Send interactive payment request
 * Usage: .payreq [amount]
 * Example: .payreq 50000
 */
async function payReqCommand(sock, chatId, message, args = []) {
    let amountValue = 50000;
    try {
        const cleanText = (Array.isArray(args) ? args.join(' ') : String(args || '')).trim();
        amountValue = cleanText ? Number(cleanText) : 50000;

        if (!Number.isSafeInteger(amountValue) || amountValue <= 0) {
            await sock.sendMessage(chatId, {
                text: 'Tumia: .payreq [kiasi]\nMfano: .payreq 50000'
            }, { quoted: message });
            return;
        }

        const params = {
            currency: 'IDR',
            payment_type: 'upr',
            total_amount: { value: amountValue, offset: 100 },
            reference_id: `PAYREQ-${Date.now()}`,
            type: 'physical-goods',
            order: {
                status: 'pending',
                subtotal: { value: amountValue, offset: 100 },
                order_type: 'physical-goods',
                items: [{
                    retailer_id: 'payment-request',
                    name: 'Payment request',
                    amount: { value: amountValue, offset: 100 },
                    quantity: 1
                }]
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
                body: { text: `💰 *Payment Request*\nAmount: IDR ${amountValue.toLocaleString('id-ID')}` },
                footer: { text: 'Pilih tombol Review and Pay untuk melanjutkan.' },
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
                text: `❌ Button ya malipo imeshindwa kutumwa.\nKiasi: IDR ${Number.isSafeInteger(amountValue) ? amountValue.toLocaleString('id-ID') : '50.000'}\nDANA / GoPay: +62 8587107433`
            }, { quoted: message });
        } catch (err) {}
    }
}

module.exports = payReqCommand;
