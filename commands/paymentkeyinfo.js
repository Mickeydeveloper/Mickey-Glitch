const { Button } = require('../lib/messageBuilder');

const paymentKeyInfoCommand = async (sock, chatId, msg, args) => {
    const title = args && args.length ? args.join(' ') : 'Pembayaran';

    const payload = {
        currency: 'IDR',
        total_amount: { value: 0, offset: 100 },
        reference_id: '4V9BSF0BT66',
        type: 'physical-goods',
        order: {
            status: 'pending',
            subtotal: { value: 0, offset: 100 },
            order_type: 'ORDER',
            items: [
                {
                    name: '',
                    amount: { value: 0, offset: 100 },
                    quantity: 0,
                    sale_amount: { value: 0, offset: 100 },
                },
            ],
        },
        payment_settings: [
            {
                type: 'payment_key',
                payment_key: {
                    type: 'IDPAYMENTACCOUNT',
                    key: '124012401001',
                    name: 'Bank CIMB Niaga',
                    institution_name: 'Bank CIMB Niaga',
                    full_name_on_account: 'Nixel',
                },
            },
        ],
        share_payment_status: false,
        is_soft_deleted: false,
        referral: 'quick_reply',
    };

    try {
        const button = new Button(sock);

        button.setTitle(title).addButton('payment_key_info', payload);

        await button.send(chatId, {
            quoted: msg,
            fallbackText: 'Informasi pembayaran dikirim.',
            additionalNodes: [
                {
                    tag: 'biz',
                    attrs: {},
                    content: [
                        {
                            tag: 'interactive',
                            attrs: { type: 'native_flow', v: '1' },
                            content: [
                                {
                                    tag: 'native_flow',
                                    attrs: { name: 'payment_key_info' },
                                },
                            ],
                        },
                    ],
                },
            ],
        });
    } catch (error) {
        console.error('paymentKeyInfoCommand error:', error);
        if (sock?.sendMessage) {
            await sock.sendMessage(chatId, { text: '❌ Hitilafu kutuma payment_key_info.' }, { quoted: msg });
        }
    }
};

paymentKeyInfoCommand.description = 'Kuwaonyesha native payment key info';
paymentKeyInfoCommand.aliases = ['paymentkeyinfo', 'payment-key-info'];

module.exports = paymentKeyInfoCommand;
