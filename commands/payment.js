const { generateMessageIDV2, proto } = require('@whiskeysockets/baileys');

const WALLETS = ['DANA', 'OVO', 'GoPay', 'ShopeePay', 'LinkAja'];
const DEFAULT_BANKS = ['SeaBank', 'Bank Jago', 'Bank Central Asia', 'Bank Mandiri', 'DANA', 'GoPay', 'OVO'];

const amountParts = amount => ({ value: Math.round(amount * 100), offset: 100 });

const account = (institution, beneficiary, type, identifier) => ({
    type: 'payment_account',
    payment_account: {
        account_type: type,
        identifier_type: identifier,
        identifier_value: '08888',
        institution_name: institution,
        beneficiary_name: beneficiary,
    },
});

const buildPaymentConfig = (amount, description, beneficiary, institutions) => ({
    currency: 'IDR',
    payment_configuration: '',
    payment_type: 'upr',
    total_amount: amountParts(amount),
    reference_id: `PAY-${Date.now()}`,
    type: 'physical-goods',
    order: {
        status: 'pending',
        description,
        subtotal: amountParts(amount),
        tax: { value: 0, offset: 100 },
        discount: { value: 0, offset: 100 },
        shipping: { value: 0, offset: 100 },
        order_type: 'PAYMENT_REQUEST',
        items: [{ name: description, amount: amountParts(amount), quantity: 1 }],
    },
    payment_settings: institutions.map(institution => WALLETS.includes(institution)
        ? account(institution, beneficiary, 'digital_wallet', 'phone_number')
        : account(institution, beneficiary, 'bank_account', 'id_account_number')),
    additional_note: description,
    native_payment_methods: [],
    share_payment_status: false,
    is_soft_deleted: false,
});

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

async function paymentCommand(conn, chatId, message, args = []) {
    const input = getInput(message, args);
    const [amountRaw, description, beneficiary, banksRaw] = input.split('|').map(part => part.trim());
    const amount = Number.parseFloat((amountRaw || '').replace(/[^\d.]/g, ''));

    if (!Number.isFinite(amount) || amount <= 0) {
        await conn.sendMessage(chatId, {
            text: `Matumizi: .payment <amount> | <description> | <beneficiary> | [banks;separated]\nBenki za kawaida: ${DEFAULT_BANKS.join(', ')}`,
        }, { quoted: message });
        return;
    }

    const desc = description || 'Payment';
    const who = beneficiary || 'Merchant';
    const institutions = banksRaw
        ? banksRaw.split(/[;,]/).map(bank => bank.trim()).filter(Boolean)
        : DEFAULT_BANKS;

    const interactiveMessage = proto.Message.InteractiveMessage.create({
        header: proto.Message.InteractiveMessage.Header.create({ title: desc, subtitle: who }),
        body: proto.Message.InteractiveMessage.Body.create({
            text: `Payment request for ${who}\nAmount: IDR ${amount.toLocaleString('id-ID')}`,
        }),
        footer: proto.Message.InteractiveMessage.Footer.create({ text: 'whatsapp-bot' }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
            buttons: [{
                name: 'review_and_pay',
                buttonParamsJson: JSON.stringify(buildPaymentConfig(amount, desc, who, institutions)),
            }],
            messageParamsJson: '{}',
            messageVersion: 1,
        }),
    });

    try {
        await conn.relayMessage(chatId, { interactiveMessage }, {
            messageId: generateMessageIDV2(conn.user?.id),
            additionalNodes: [{
                tag: 'biz',
                attrs: {
                    actual_actors: '2',
                    host_storage: '2',
                    native_flow_name: 'order_details',
                },
                content: [{
                    tag: 'quality_control',
                    attrs: { source_type: 'third_party' },
                    content: [{ tag: 'decision_source', attrs: { value: 'df' } }],
                }],
            }],
        });
    } catch (error) {
        console.error('[PAYMENT] Failed to send payment request:', error?.message || error);
        await conn.sendMessage(chatId, {
            text: 'Imeshindikana kutuma ombi la malipo. Hakikisha toleo la Baileys linaunga mkono review_and_pay kisha ujaribu tena.',
        }, { quoted: message });
    }
}

paymentCommand.description = 'Tuma ombi la malipo la WhatsApp kupitia benki au e-wallet.';
paymentCommand.category = 'EXPERIMENTAL';

module.exports = paymentCommand;