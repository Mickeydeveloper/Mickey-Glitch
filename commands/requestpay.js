const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

const PAYMENT_API_URL = 'https://mickey-pterodacty.vercel.app/api/integration/payments/checkout';
const SETTINGS_PATH = path.join(__dirname, '..', 'data', 'requestpay.json');
const DEFAULT_AMOUNT = 500;
const DEFAULT_MAX_AMOUNT = 50000000;

function getSavedAmount() {
    try {
        const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
        return Number.isSafeInteger(settings.amount) && settings.amount > 0
            ? settings.amount
            : DEFAULT_AMOUNT;
    } catch {
        return DEFAULT_AMOUNT;
    }
}

function saveAmount(amount) {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify({ amount }, null, 2));
}

module.exports = {
    name: 'requestpay',
    aliases: ['requestpayment'],
    description: 'Tengeneza malipo ya PalmPesa',
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

        const firstArg = String(args[0] || '').trim();
        const amount = getSavedAmount();

        if (!firstArg || firstArg.toLowerCase() === 'info') {
            return reply(`💳 Kiasi cha sasa: *${amount.toLocaleString('en-US')} TZS*\nTuma malipo: .requestpay 255712345678\nBadili kiasi (owner/sudo): .requestpay 1000`);
        }

        const maxAmount = Number(process.env.EXTERNAL_PAYMENT_MAX_TZS) || DEFAULT_MAX_AMOUNT;
        if (/^\d+$/.test(firstArg)) {
            const newAmount = Number(firstArg);
            if (!Number.isSafeInteger(newAmount) || newAmount < 1 || newAmount > maxAmount) {
                return reply(`❌ Kiasi lazima kiwe namba kamili kati ya 1 na ${maxAmount.toLocaleString('en-US')} TZS.`);
            }

            const authorized = await isOwnerOrSudo(
                senderId || message.key?.participant || message.key?.remoteJid || '',
                sock,
                chatId
            );
            if (!authorized && !message.key?.fromMe) {
                return reply('❌ Ni owner/sudo pekee anayeweza kubadili kiasi cha malipo.');
            }

            try {
                saveAmount(newAmount);
            } catch (error) {
                console.error('[requestpay] Failed to save amount:', error?.message || error);
                return reply('❌ Imeshindwa kuhifadhi kiasi. Hakijabadilishwa.');
            }
            return reply(`✅ Kiasi cha malipo kimehifadhiwa: *${newAmount.toLocaleString('en-US')} TZS*.`);
        }

        const customerPhone = firstArg.replace(/^\+/, '').replace(/[\s()-]/g, '');
        if (!/^255\d{9}$/.test(customerPhone)) {
            return reply('❌ Namba si sahihi. Tumia mfumo wa Tanzania, mfano: .requestpay 255612130873');
        }

        const apiKey = process.env.EXTERNAL_PAYMENT_API_KEY;
        if (!apiKey) {
            return reply('❌ Malipo hayajasanidiwa: EXTERNAL_PAYMENT_API_KEY haipo kwenye server.');
        }

        try {
            const response = await axios.post(PAYMENT_API_URL, {
                orderId: `REQ-${crypto.randomUUID()}`,
                amount,
                customerName: 'WhatsApp Customer',
                customerPhone,
                description: `WhatsApp payment request for ${customerPhone}`,
            }, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 30000,
            });

            const paymentData = response.data?.data || response.data || {};
            const paymentUrl = paymentData.paymentUrl;
            const paymentMessage = paymentData.paymentMessage;
            let customerText = `💳 Malipo ya *${amount.toLocaleString('en-US')} TZS*`;
            if (paymentUrl) {
                customerText += `\nLipa hapa: ${paymentUrl}`;
            } else if (paymentMessage) {
                customerText += `\n${paymentMessage}`;
            } else {
                return reply('❌ API haikurudisha paymentUrl wala paymentMessage. Hakuna uthibitisho wa malipo uliopokelewa.');
            }

            try {
                await sock.sendMessage(`${customerPhone}@s.whatsapp.net`, { text: customerText });
            } catch (deliveryError) {
                console.error('[requestpay] Checkout created but customer delivery failed:', deliveryError?.message || deliveryError);
                return reply(`⚠️ Malipo ya *${amount.toLocaleString('en-US')} TZS* yameundwa, lakini ujumbe haujafika kwa ${customerPhone}. Usitume command tena kwa sasa ili kuepuka duplicate.`);
            }
            return reply(`✅ Ombi la malipo la *${amount.toLocaleString('en-US')} TZS* limetumwa kwa ${customerPhone}. Hali: pending mpaka API ithibitishe.`);
        } catch (error) {
            console.error('[requestpay] Error:', error);
            const apiError = error.response?.data?.message || error.response?.data?.error;
            await reply(`❌ Imeshindwa kuunda malipo: ${apiError || error.message || 'Hitilafu ya API.'}`);
        }
    },
};