// @generated-by:addcmd
module.exports = {
    name: 'requestpay',
    aliases: ['requestpayment'],
    description: 'Tuma requestPaymentMessage',
    category: 'UTILITY',
    code: async (ctx) => {
        const { sock, chatId, msg: message, args = [], senderId } = ctx || {};

        if (!sock || !chatId || !message) {
            throw new Error('Request payment command context is incomplete.');
        }

        const reply = async (text) => {
            if (typeof ctx.reply === 'function') {
                return ctx.reply(text);
            }
            return sock.sendMessage(chatId, { text }, { quoted: message });
        };

        if (String(args[0] || '').toLowerCase() === 'info') {
            return reply('💳 Tumia kitufe cha WhatsApp *Pay* kukamilisha malipo. Kuomba tena: .requestpay <kiasi> <currency> [namba]');
        }

        const amountValue = args[0] === undefined ? 202.6 : Number(args[0]);
        const currency = String(args[1] || 'USD').trim().toUpperCase();
        const requester = String(args[2] || senderId || message.key?.participant || message.key?.remoteJid || '')
            .trim()
            .replace(/:\d+(?=@)/, '');
        const requestFrom = requester.includes('@')
            ? requester
            : `${requester.replace(/\D/g, '')}@s.whatsapp.net`;

        if (!Number.isFinite(amountValue) || amountValue <= 0 || amountValue > 1000000000) {
            return reply('❌ Kiasi si sahihi. Mfano: .requestpay 202.60 USD');
        }
        if (!/^[A-Z]{3}$/.test(currency)) {
            return reply('❌ Currency lazima iwe ISO code ya herufi 3, mfano USD, TZS au KES.');
        }
        if (!/^\d+@(s\.whatsapp\.net|lid)$/.test(requestFrom)) {
            return reply('❌ Namba/JID ya mpokeaji si sahihi. Mfano: .requestpay 202.60 USD 255712345678');
        }

        const amount1000 = Math.round(amountValue * 1000);
        const amountLong = BigInt(amount1000);
        const paymentRequest = {
            requestPaymentMessage: {
                currencyCodeIso4217: currency,
                amount1000: {
                    low: Number(BigInt.asIntN(32, amountLong & 0xffffffffn)),
                    high: Number(BigInt.asIntN(32, amountLong >> 32n)),
                    unsigned: true,
                },
                requestFrom,
                noteMessage: {
                    extendedTextMessage: {
                        text: `Payment request for ${amountValue.toFixed(2)} ${currency}`,
                    },
                },
                expiryTimestamp: {
                    low: 0,
                    high: 0,
                    unsigned: false,
                },
            },
        };

        try {
            await sock.relayMessage(chatId, paymentRequest, {
                messageId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            });

            try {
                await sock.sendMessage(chatId, {
                    interactiveMessage: {
                        body: { text: `💳 Request ya ${amountValue.toFixed(2)} ${currency} imetumwa.` },
                        footer: { text: 'Tumia kitufe cha Pay kwenye payment request.' },
                        nativeFlowMessage: {
                            messageVersion: 1,
                            buttons: [{
                                name: 'quick_reply',
                                buttonParamsJson: JSON.stringify({
                                    display_text: 'Maelezo ya malipo',
                                    id: '.requestpay info',
                                }),
                            }],
                        },
                    },
                }, { quoted: message });
            } catch (buttonError) {
                console.error('[requestpay] Details button unavailable:', buttonError?.message || buttonError);
                await reply(`✅ Payment request imetumwa: ${amountValue.toFixed(2)} ${currency}. Tumia kitufe cha Pay kwenye ujumbe wa request.`);
            }
        } catch (error) {
            console.error('[requestpay] Error:', error);
            await reply(`❌ Imeshindwa kutuma payment request: ${error?.message || error}`);
        }
    },
};