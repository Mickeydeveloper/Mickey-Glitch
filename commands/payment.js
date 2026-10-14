const crypto = require('crypto');

const DEFAULT_AMOUNT = 19000000;

function makeAmount(value) {
    return {
        value,
        offset: 100
    };
}

module.exports = async function paymentCommand(sock, chatId, message, args = []) {
    const rawAmount = String(args[0] ?? '').trim();
    const amountValue = rawAmount ? Number(rawAmount) : DEFAULT_AMOUNT;

    if (!Number.isSafeInteger(amountValue) || amountValue <= 0) {
        await sock.sendMessage(chatId, {
            text: 'Kiasi si sahihi. Tumia: .payment [kiasi cha IDR, namba kamili]'
        }, { quoted: message });
        return;
    }

    const params = {
        currency: 'IDR',
        total_amount: makeAmount(amountValue),
        reference_id: `REF_${Date.now()}`,
        type: 'physical-goods',
        order: {
            status: 'pending',
            subtotal: makeAmount(amountValue),
            order_type: 'ORDER',
            items: [{
                name: 'ESPADA',
                amount: makeAmount(amountValue),
                quantity: 1,
                sale_amount: makeAmount(amountValue)
            }]
        },
        payment_settings: [
            ...['SeaBank', 'Bank Jago', 'Bank Central Asia', 'Bank Mandiri'].map((institutionName) => ({
                type: 'payment_account',
                payment_account: {
                    account_type: 'bank_account',
                    identifier_type: 'account_number',
                    identifier_value: '08888',
                    institution_name: institutionName,
                    beneficiary_name: 'Aevendria VRA'
                }
            })),
            ...['DANA', 'GoPay', 'OVO'].map((institutionName) => ({
                type: 'payment_account',
                payment_account: {
                    account_type: 'digital_wallet',
                    identifier_type: 'phone_number',
                    identifier_value: '08888',
                    institution_name: institutionName,
                    beneficiary_name: 'Aevendria VRA'
                }
            }))
        ],
        share_payment_status: false,
        is_soft_deleted: false,
        referral: 'chat_attachment'
    };

    try {
        try {
            await sock.sendPresenceUpdate('composing', chatId);
        } catch {}

        await sock.relayMessage(chatId, {
            messageContextInfo: {
                messageSecret: crypto.randomBytes(32).toString('base64')
            },
            interactiveMessage: {
                body: {
                    text: `*ESPADA*\n\nPayment request for Aevendria VRA\nAmount: IDR ${amountValue.toLocaleString('en-US')}\n\nwhatsapp-bot`
                },
                nativeFlowMessage: {
                    buttons: [{
                        name: 'payment_info',
                        buttonParamsJson: JSON.stringify(params)
                    }]
                }
            }
        }, {
            additionalNodes: [{
                tag: 'biz',
                attrs: {},
                content: [{
                    tag: 'interactive',
                    attrs: { type: 'native_flow', v: '1' },
                    content: [{
                        tag: 'native_flow',
                        attrs: { name: 'payment_info' }
                    }]
                }]
            }]
        });
    } catch (error) {
        console.error('[payment] Sending payment info failed:', error?.message || error);
        try {
            await sock.sendMessage(chatId, {
                text: 'Imeshindikana kutuma maelezo ya malipo.'
            }, { quoted: message });
        } catch (replyError) {
            console.error('[payment] Error reply failed:', replyError?.message || replyError);
        }
    }
};

module.exports.name = 'payment';
module.exports.description = 'Show bank and digital wallet payment details';
module.exports.category = 'UTILITY';
module.exports.aliases = ['pay'];
