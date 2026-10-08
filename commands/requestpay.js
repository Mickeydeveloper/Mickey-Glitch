// @generated-by:addcmd
const { Button, ButtonV2, Carousel, AIRich, Toolkit, createCtx } = require('../lib/messageBuilder');

module.exports = {
    name: 'requestpay',
    description: 'Tuma requestPaymentMessage',
    category: 'UTILITY',
    code: async (sock, chatId, message, args = [], options = {}) => {
        // ─── Badilisha hapa ─────────────────────────────────────────
        const CURRENCY = 'USD';        // USD, TZS, KES, n.k.
        const AMOUNT = 202600;         // Kiasi (low value)
        const REQUEST_FROM = '0@lid';  // Namba ya mpokeaji
        const NOTE = 'O(a) adminstrador(a) *@{"id":"0* foi rebaixado(a) à membro comum por: *@0*.';
        const REMOTE_JID = '120363410933636228@g.us'; // Group ID
        const MENTIONED = [
            '{"id":"0@lid","phoneNumber":"0@s.whatsapp.net","admin":null}',
            '0@lid'
        ];
        // ────────────────────────────────────────────────────────────

        // Kama mtumiaji ametoa args, tumia args
        const amount = args[0] ? Number(args[0]) * 1000 : AMOUNT;
        const currency = args[1] || CURRENCY;
        const requestFrom = args[2] || REQUEST_FROM;

        try {
            await sock.relayMessage(chatId, {
                requestPaymentMessage: {
                    currencyCodeIso4217: currency,
                    amount1000: {
                        low: amount,
                        high: 0,
                        unsigned: true
                    },
                    requestFrom: requestFrom,
                    noteMessage: {
                        extendedTextMessage: {
                            endCardTiles: [],
                            text: NOTE,
                            contextInfo: {
                                mentionedJid: MENTIONED,
                                groupMentions: [],
                                statusAttributions: [],
                                remoteJid: REMOTE_GROUP_ID
                            }
                        }
                    },
                    expiryTimestamp: {
                        low: 0,
                        high: 0,
                        unsigned: false
                    }
                }
            }, {
                additionalAttributes: { type: 'text' }
            });

            // Tuma taarifa ya mafanikio
            await sock.sendMessage(chatId, {
                text: `✅ Payment request imetumwa!\n\n💰 Kiasi: ${amount / 1000} ${currency}\n📤 Kwa: ${requestFrom}`
            }, { quoted: message });

        } catch (error) {
            console.error('[requestpay] Error:', error);
            await sock.sendMessage(chatId, {
                text: `❌ Imeshindwa kutuma payment request:\n${error.message}`
            }, { quoted: message });
        }
    }
};