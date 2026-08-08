const axios = require('axios');
const { ButtonV2, createCtx } = require('../lib/messageBuilder');
const paymentStore = require('../lib/paymentStore');
const settings = require('../settings');

const MIN_AMOUNT = 1000;
const MAX_AMOUNT = 200000;
const PROVIDER = 'palmpesa';
const CHECKOUT_BASE_URL = process.env.PAYMENT_API_BASE_URL || 'https://mickey-pterodacty.vercel.app/api/payment/checkout';
const WEBHOOK_URL = process.env.PAYMENT_WEBHOOK_URL || 'https://mickey-pterodacty.vercel.app/api/payment/webhook';

function normalizeAmount(value) {
  const parsed = Number(String(value || '').replace(/[^0-9]/g, ''));
  return Number.isNaN(parsed) ? 0 : parsed;
}

async function donateCommand(sock, chatId, message, args = []) {
  try {
    const ctx = createCtx(sock, chatId, message, { args });
    const command = (args[0] || '').toLowerCase();

    if (command === 'history') {
      return showDonationHistory(ctx);
    }

    if (command === 'stats') {
      return showDonationStats(ctx);
    }

    if (command === 'help' || command === 'menu') {
      return showDonationMenu(ctx);
    }

    const amount = normalizeAmount(args[0]);
    if (amount > 0) {
      return createPaymentCheckout(ctx, amount);
    }

    return showDonationMenu(ctx);
  } catch (error) {
    console.error('[donate]', error);
    await sock.sendMessage(chatId, {
      text: `⚠️ Donation command failed. Tafadhali jaribu tena baadaye.`
    }, { quoted: message });
  }
}

async function createPaymentCheckout(ctx, amount) {
  if (amount < MIN_AMOUNT) {
    return ctx.reply(`⚠️ Kiasi cha chini ni TSh ${MIN_AMOUNT.toLocaleString()}.`);
  }

  if (amount > MAX_AMOUNT) {
    return ctx.reply(`⚠️ Kiasi cha juu ni TSh ${MAX_AMOUNT.toLocaleString()}.`);
  }

  const orderId = `DON-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const payload = {
    packageId: `DON_${amount}`,
    serverName: 'Mickey Donation',
    paymentMethod: PROVIDER,
    phone: `255${String(ctx.senderId || '').replace(/[^0-9]/g, '').slice(-9)}`,
    amount,
    currency: 'TZS',
    orderId,
    metadata: {
      userId: ctx.chatId,
      userName: ctx.msg.pushName || ctx.msg?.message?.senderName || '',
      type: 'donation',
      command: '.donate'
    },
    webhookUrl: WEBHOOK_URL,
  };

  try {
    const response = await axios.post(CHECKOUT_BASE_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 20000
    });

    const data = response?.data;
    if (!data || !data.success || !data.data?.paymentUrl) {
      console.error('[donate] invalid checkout response:', data);
      return ctx.reply('⚠️ Ilishindikana kuanzisha malipo. Tafadhali jaribu tena baadaye.');
    }

    paymentStore.addTransaction({
      orderId,
      userId: ctx.chatId,
      senderId: ctx.senderId,
      amount,
      currency: 'TZS',
      provider: PROVIDER,
      paymentUrl: data.data.paymentUrl,
      transactionId: data.data.transactionId || null,
      reference: data.data.reference || null,
      status: 'pending',
      createdAt: new Date().toISOString(),
      metadata: payload.metadata,
    });

    const button = new ButtonV2(ctx.sock)
      .text(`Umechagua kutoa TSh ${amount.toLocaleString()}.

Endelea kwa malipo kupitia link ifuatayo:
${data.data.paymentUrl}`)
      .footer('Donate kupitia API ya malipo ya nje')
      .addButton('Historia', '.donate history')
      .addButton('Takwimu', '.donate stats');

    await button.send(ctx.chatId, {
      quoted: ctx.msg,
      fallbackText: `Tumia link ifuatayo kufanya malipo: ${data.data.paymentUrl}`
    });
  } catch (error) {
    console.error('[donate] createPaymentCheckout failed:', error?.message || error);
    return ctx.reply('⚠️ Ilishindikana kuanzisha malipo kwa sasa. Tafadhali jaribu tena baadaye.');
  }
}

async function showDonationMenu(ctx) {
  const text = `*Msaada kwa Mickey Glitch*

` +
    `• .donate <kiasi> - Tumia malipo ya moja kwa moja
` +
    `• .donate menu - Tazama njia za malipo
` +
    `• .donate history - Historia yako
` +
    `• .donate stats - Takwimu za msaada

` +
    `Kiasi cha chini: TSh ${MIN_AMOUNT.toLocaleString()}
` +
    `Kiasi cha juu: TSh ${MAX_AMOUNT.toLocaleString()}

` +
    `Malipo yanafanyika kwa API ya nje. Huna haja ya kuweka namba au pesa hapa.`;

  const button = new ButtonV2(ctx.sock)
    .text(text)
    .footer('Tumia .donate <kiasi> kuendelea')
    .addButton('Msaada', '.donate help')
    .addButton('Historia', '.donate history')
    .addButton('Takwimu', '.donate stats');

  await button.send(ctx.chatId, {
    quoted: ctx.msg,
    fallbackText: 'Tuma .donate <kiasi> kuanzisha malipo ya msaada.'
  });
}

async function showDonationHistory(ctx) {
  const history = paymentStore.getTransactionHistory(ctx.chatId);
  if (!history.length) {
    return ctx.reply('Hakuna historia ya malipo. Tumia .donate <kiasi> kuanza.');
  }

  const lines = history.slice(0, 8).map((item, index) => {
    return `${index + 1}. TSh ${Number(item.amount).toLocaleString()} - ${item.status.toUpperCase()}\nID: ${item.orderId}`;
  });

  await ctx.reply(`*Historia ya Malipo*

${lines.join('\n\n')}`);
}

async function showDonationStats(ctx) {
  const summary = paymentStore.getSummary();
  const provider = PROVIDER;
  await ctx.reply(`*Takwimu za Msaada*

` +
    `• Jumla ya mapato: TSh ${Number(summary.total).toLocaleString()}
` +
    `• Miamala: ${summary.transactions}
` +
    `• Thibitisho: ${summary.confirmed || 0}
` +
    `• Zinazosubiri: ${summary.pending || 0}
` +
    `• Provider: ${provider}`
  );
}

module.exports = donateCommand;
module.exports.commandName = 'donate';
module.exports.aliases = ['makeadonation'];
module.exports.description = 'Donate through external payment API';
module.exports.category = 'GENERAL';
