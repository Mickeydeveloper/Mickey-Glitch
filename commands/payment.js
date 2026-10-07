const crypto = require('crypto');
const { generateMessageIDV2 } = require('@whiskeysockets/baileys');

const KEY_TYPES = ['PHONE', 'EVP', 'CPF', 'CNPJ', 'EMAIL'];

function getInput(message, args) {
    const text = message?.message?.conversation ||
        message?.message?.extendedTextMessage?.text ||
        message?.message?.imageMessage?.caption ||
        message?.message?.videoMessage?.caption;

    if (typeof text === 'string' && text.trim()) {
        return text.trim().replace(/^\.[^\s]+\s*/, '');
    }
    return Array.isArray(args) ? args.join(' ').trim() : String(args || '').trim();
}

async function paymentinfo(conn, chatId, message, args = []) {
    const input = getInput(message, args);
    const [merchant, key, keyTypeRaw, currencyRaw, amountRaw] = input.split('|').map(part => part.trim());
    const amount = Number.parseFloat(amountRaw || '0');

    if (!merchant || !key || !Number.isFinite(amount) || amount < 0) {
        await conn.sendMessage(chatId, {
            text: `Matumizi: .paymentinfo <merchant> | <key> | [${KEY_TYPES.join('|')}] | [currency] | [amount]`,
        }, { quoted: message });
        return;
    }

    const keyType = KEY_TYPES.includes(keyTypeRaw?.toUpperCase()) ? keyTypeRaw.toUpperCase() : 'PHONE';
    const currency = (currencyRaw || 'BRL').toUpperCase();
    const cents = Math.round(amount * 100);
    const config = {
        currency,
        total_amount: { value: cents, offset: 100 },
        reference_id: crypto.randomBytes(6).toString('hex').toUpperCase().slice(0, 11),
        type: 'physical-goods',
        order: {
            status: 'pending',
            subtotal: { value: cents, offset: 100 },
            order_type: 'ORDER',
            items: [{
                name: merchant,
                amount: { value: cents, offset: 100 },
                quantity: 1,
                sale_amount: { value: cents, offset: 100 },
            }],
        },
        payment_settings: [{
            type: 'pix_static_code',
            pix_static_code: { merchant_name: merchant, key, key_type: keyType },
        }],
        share_payment_status: false,
        is_soft_deleted: false,
        referral: 'chat_attachment',
    };

    try {
        await conn.relayMessage(chatId, {
            messageContextInfo: { messageSecret: crypto.randomBytes(32) },
            interactiveMessage: {
                nativeFlowMessage: {
                    buttons: [{ name: 'payment_info', buttonParamsJson: JSON.stringify(config) }],
                },
                contextInfo: {
                    expiration: 7776000,
                    disappearingMode: { initiator: 0, trigger: 0 },
                },
            },
        }, {
            messageId: generateMessageIDV2(conn.user?.id),
            additionalNodes: [{
                tag: 'biz',
                attrs: {},
                content: [{
                    tag: 'interactive',
                    attrs: { type: 'native_flow', v: '1' },
                    content: [{ tag: 'native_flow', attrs: { name: 'payment_info' } }],
                }],
            }],
        });
    } catch (error) {
        console.error('[PAYMENTINFO] Failed to send payment info:', error?.message || error);
        await conn.sendMessage(chatId, {
            text: 'Imeshindikana kutuma taarifa za malipo. Hakikisha toleo la Baileys linaunga mkono payment_info kisha ujaribu tena.',
        }, { quoted: message });
    }
}

paymentinfo.description = 'Tuma kadi ya payment_info yenye merchant na payment key.';
paymentinfo.category = 'EXPERIMENTAL';

module.exports = paymentinfo;