const isOwnerOrSudo = require('../lib/isOwner');

const MAX_AMOUNT = 1000000;

module.exports = async function button2Command(sock, chatId, msg, args = []) {
    const senderId = (msg.key.participant || msg.key.remoteJid || '').replace(/:\d+(?=@)/, '');
    const authorized = await isOwnerOrSudo(senderId, sock, chatId);

    if (!authorized && !msg.key.fromMe) {
        await sock.sendMessage(chatId, { text: 'Command hii ni ya owner pekee.' }, { quoted: msg });
        return;
    }

    const amount = Number(args[0] || 202.6);
    const currency = String(args[1] || 'USD').toUpperCase();
    const note = args.slice(2).join(' ').trim();

    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) {
        await sock.sendMessage(chatId, {
            text: `Kiasi si sahihi. Tumia: .button2 <kiasi> [currency] [maelezo] (kiwango cha juu ${MAX_AMOUNT})`
        }, { quoted: msg });
        return;
    }

    if (!/^[A-Z]{3}$/.test(currency)) {
        await sock.sendMessage(chatId, {
            text: 'Currency lazima iwe ISO code ya herufi 3, mfano USD, TZS au KES.'
        }, { quoted: msg });
        return;
    }

    if (!/^\d+@(s\.whatsapp\.net|lid)$/.test(senderId)) {
        await sock.sendMessage(chatId, {
            text: 'Imeshindikana kuthibitisha mtumaji wa ombi hili la malipo.'
        }, { quoted: msg });
        return;
    }

    const amount1000 = BigInt(Math.round(amount * 1000));
    const message = {
        requestPaymentMessage: {
            currencyCodeIso4217: currency,
            amount1000: {
                low: Number(BigInt.asIntN(32, amount1000 & 0xffffffffn)),
                high: Number(BigInt.asIntN(32, amount1000 >> 32n)),
                unsigned: true
            },
            requestFrom: senderId,
            noteMessage: {
                extendedTextMessage: {
                    text: note
                        ? `Ombi la malipo: ${amount.toFixed(2)} ${currency}. Maelezo: ${note}`
                        : `Ombi la malipo: ${amount.toFixed(2)} ${currency}.`
                }
            },
            expiryTimestamp: {
                low: 0,
                high: 0,
                unsigned: false
            }
        }
    };

    try {
        await sock.relayMessage(chatId, message, {
            additionalAttributes: { type: 'text' }
        });
    } catch (error) {
        console.error('[button2] payment request failed:', error?.message || error);
        await sock.sendMessage(chatId, {
            text: 'Imeshindikana kutuma ombi la malipo.'
        }, { quoted: msg });
    }
};

module.exports.name = 'button2';
module.exports.description = 'Send a transparent WhatsApp payment request';
module.exports.category = 'OWNER/ADMIN';
module.exports.aliases = [];
