const crypto = require('crypto');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

const DEFAULT_AMOUNT = 19000000;
const BENEFICIARY = 'Aevendria VRA';
const IDENTIFIER = '08888';
const BANKS = ['SeaBank', 'Bank Jago', 'Bank Central Asia', 'Bank Mandiri'];
const WALLETS = ['DANA', 'GoPay', 'OVO'];

function makeAmount(value) {
    return { value, offset: 100 };
}

function makePaymentParams(amount) {
    const paymentAccounts = [
        ...BANKS.map((institutionName) => ({
            type: 'payment_account',
            payment_account: {
                account_type: 'bank_account',
                identifier_type: 'account_number',
                identifier_value: IDENTIFIER,
                institution_name: institutionName,
                beneficiary_name: BENEFICIARY
            }
        })),
        ...WALLETS.map((institutionName) => ({
            type: 'payment_account',
            payment_account: {
                account_type: 'digital_wallet',
                identifier_type: 'phone_number',
                identifier_value: IDENTIFIER,
                institution_name: institutionName,
                beneficiary_name: BENEFICIARY
            }
        }))
    ];

    return {
        currency: 'IDR',
        total_amount: makeAmount(amount),
        reference_id: `REF_${Date.now()}`,
        type: 'physical-goods',
        order: {
            status: 'pending',
            subtotal: makeAmount(amount),
            order_type: 'ORDER',
            items: [{
                name: 'ESPADA',
                amount: makeAmount(amount),
                quantity: 1,
                sale_amount: makeAmount(amount)
            }]
        },
        payment_settings: paymentAccounts,
        share_payment_status: false,
        is_soft_deleted: false,
        referral: 'chat_attachment'
    };
}

function formatPaymentDetails(amount) {
    const formattedAmount = amount.toLocaleString('en-US');
    const bankLines = BANKS.map((bank) => `- ${bank}: ${IDENTIFIER}`).join('\n');
    const walletLines = WALLETS.map((wallet) => `- ${wallet}: ${IDENTIFIER}`).join('\n');

    return [
        '*ESPADA*',
        '',
        `Payment details for ${BENEFICIARY}`,
        `Amount: IDR ${formattedAmount}`,
        '',
        '*Bank transfers*',
        bankLines,
        '',
        '*Digital wallets*',
        walletLines,
        '',
        `Beneficiary: ${BENEFICIARY}`
    ].join('\n');
}

module.exports = {
    name: 'payment',
    aliases: ['pay'],
    description: 'Show bank and digital wallet payment details',
    category: 'UTILITY',
    code: async (ctx) => {
        const { sock, chatId, msg, args = [], reply } = ctx || {};
        if (!sock || !chatId || typeof reply !== 'function') {
            throw new Error('Payment command context is incomplete.');
        }

        const textMode = String(args[0] || '').toLowerCase() === 'text';
        const rawAmount = String(args[textMode ? 1 : 0] ?? '').trim();
        const amount = rawAmount ? Number(rawAmount) : DEFAULT_AMOUNT;

        if (!Number.isSafeInteger(amount) || amount <= 0) {
            return reply('Kiasi si sahihi. Tumia: .payment [kiasi cha IDR] au .payment text [kiasi cha IDR].');
        }

        if (textMode) return reply(formatPaymentDetails(amount));

        const params = makePaymentParams(amount);
        const body = {
            messageContextInfo: {
                messageSecret: crypto.randomBytes(32)
            },
            interactiveMessage: {
                body: {
                    text: `*ESPADA*\n\nPayment request for ${BENEFICIARY}\nAmount: IDR ${amount.toLocaleString('en-US')}\n\nwhatsapp-bot`
                },
                nativeFlowMessage: {
                    buttons: [{
                        name: 'payment_info',
                        buttonParamsJson: JSON.stringify(params)
                    }]
                }
            }
        };

        const messageOptions = {
            userJid: sock.user?.id || '',
            ...(msg ? { quoted: msg } : {})
        };

        try {
            try {
                await sock.sendPresenceUpdate('composing', chatId);
            } catch {}

            const generated = await generateWAMessageFromContent(chatId, body, messageOptions);
            await sock.relayMessage(generated.key.remoteJid, generated.message, {
                messageId: generated.key.id,
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
            console.error('[payment] Payment info send failed:', error?.message || error);
            return reply(`${formatPaymentDetails(amount)}\n\n_Native payment button haikutumwa; haya ni maelezo ya maandishi._`);
        } finally {
            try {
                await sock.sendPresenceUpdate('paused', chatId);
            } catch {}
        }
    }
};
