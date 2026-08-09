const axios = require('axios');
const { ButtonV2, createCtx } = require('../lib/messageBuilder');
const paymentStore = require('../lib/paymentStore');
const settings = require('../settings');

const MIN_AMOUNT = 1000;
const MAX_AMOUNT = 200000;
const PROVIDER = 'palmpesa';
const CHECKOUT_BASE_URL = process.env.PAYMENT_API_BASE_URL || 'https://mickey-pterodacty.vercel.app/api/payment/checkout';
const WEBHOOK_URL = process.env.PAYMENT_WEBHOOK_URL || 'https://mickey-pterodacty.vercel.app/api/payment/webhook';

// Store za kuhifadhi data za mteja kwa muda
const userSessions = new Map();

function normalizeAmount(value) {
  const parsed = Number(String(value || '').replace(/[^0-9]/g, ''));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isValidPhone(phone) {
  // Inaruhusu namba za Tanzania: 0712345678, 0754123456, 0621234567
  const clean = phone.replace(/[^0-9]/g, '');
  if (clean.length === 9) {
    return `255${clean}`; // Ongeza 255 mwanzoni
  }
  if (clean.length === 10 && clean.startsWith('0')) {
    return `255${clean.slice(1)}`; // Badilisha 0 kuwa 255
  }
  if (clean.length === 12 && clean.startsWith('255')) {
    return clean; // Tayari ni sahihi
  }
  return null;
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
      // Ikiwa kuna amount, omba namba ya simu
      return requestPhoneNumber(ctx, amount);
    }

    return showDonationMenu(ctx);
  } catch (error) {
    console.error('[donate]', error);
    await sock.sendMessage(chatId, {
      text: `⚠️ Donation command failed. Tafadhali jaribu tena baadaye.`
    }, { quoted: message });
  }
}

async function requestPhoneNumber(ctx, amount) {
  if (amount < MIN_AMOUNT) {
    return ctx.reply(`⚠️ Kiasi cha chini ni TSh ${MIN_AMOUNT.toLocaleString()}.`);
  }

  if (amount > MAX_AMOUNT) {
    return ctx.reply(`⚠️ Kiasi cha juu ni TSh ${MAX_AMOUNT.toLocaleString()}.`);
  }

  // Hifadhi session ya mteja
  const sessionId = ctx.chatId;
  userSessions.set(sessionId, {
    step: 'awaiting_phone',
    amount: amount,
    timestamp: Date.now()
  });

  // Safisha session baada ya dakika 5
  setTimeout(() => {
    if (userSessions.has(sessionId)) {
      userSessions.delete(sessionId);
    }
  }, 300000); // 5 minutes

  const text = `💰 *Mchakato wa Malipo*

Umechagua kutoa: *TSh ${amount.toLocaleString()}*

` +
    `Tafadhali *tuma namba yako ya simu* katika muundo huu:
` +
    `• 0712345678
` +
    `• 0754123456
` +
    `• 0621234567

` +
    `Namba itatumika kukutumia mwongozo wa malipo.`;

  const button = new ButtonV2(ctx.sock)
    .text(text)
    .footer('Tuma namba yako ya simu sasa')
    .addButton('Ghairi', '.donate cancel');

  await button.send(ctx.chatId, {
    quoted: ctx.msg,
    fallbackText: `Tuma namba yako ya simu kama: 0712345678`
  });
}

async function handlePhoneInput(ctx, phoneNumber) {
  const sessionId = ctx.chatId;
  const session = userSessions.get(sessionId);
  
  if (!session || session.step !== 'awaiting_phone') {
    return ctx.reply('⚠️ Tafadhali anza mchakato upya kwa .donate <kiasi>');
  }

  const formattedPhone = isValidPhone(phoneNumber);
  if (!formattedPhone) {
    return ctx.reply(`❌ Namba isiyo sahihi.

Tafadhali tuma namba sahihi kama:
• 0712345678
• 0754123456
• 0621234567

Au tuma .donate cancel kughairi.`);
  }

  // Endelea na malipo
  await createPaymentCheckout(ctx, session.amount, formattedPhone);
  
  // Ondoa session
  userSessions.delete(sessionId);
}

// Ongeza hii kwenye message handler yako kuu
async function handleIncomingMessage(sock, message) {
  // ... code yako ya message handling ...
  
  // Kama message ni namba na iko kwenye session
  const text = message.body || '';
  const chatId = message.key.remoteJid;
  
  if (userSessions.has(chatId) && /^[0-9]{9,12}$/.test(text.replace(/[^0-9]/g, ''))) {
    const ctx = createCtx(sock, chatId, message, { args: [] });
    await handlePhoneInput(ctx, text);
    return;
  }
  
  // ... rest of your message handler ...
}

async function createPaymentCheckout(ctx, amount, phone) {
  const orderId = `DON-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  
  const payload = {
    packageId: `DON_${amount}`,
    serverName: 'Mickey Donation',
    paymentMethod: PROVIDER,
    phone: phone, // Sasa phone inatumwa kwa API
    amount: amount,
    currency: 'TZS',
    orderId: orderId,
    metadata: {
      userId: ctx.chatId,
      userName: ctx.msg.pushName || ctx.msg?.message?.senderName || '',
      phone: phone,
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
      phone: phone,
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
      .text(`✅ *Malipo Yameanzishwa*

Kiasi: TSh ${amount.toLocaleString()}
Namba: ${phone}
Order ID: ${orderId}

` +
        `Endelea kwa malipo kupitia link ifuatayo:
${data.data.paymentUrl}

` +
        `*Muhimu:* Hakikisha unakamilisha malipo ndani ya dakika 15.`)
      .footer('Donate kupitia API ya malipo ya nje')
      .addButton('Historia', '.donate history')
      .addButton('Takwimu', '.donate stats')
      .addButton('Msaada', '.donate help');

    await button.send(ctx.chatId, {
      quoted: ctx.msg,
      fallbackText: `Link ya malipo: ${data.data.paymentUrl}`
    });
  } catch (error) {
    console.error('[donate] createPaymentCheckout failed:', error?.message || error);
    return ctx.reply('⚠️ Ilishindikana kuanzisha malipo kwa sasa. Tafadhali jaribu tena baadaye.');
  }
}

async function handleCancel(ctx) {
  const sessionId = ctx.chatId;
  if (userSessions.has(sessionId)) {
    userSessions.delete(sessionId);
    return ctx.reply('✅ Mchakato wa malipo umeghairiwa.');
  }
  return ctx.reply('Hakuna mchakato wa malipo unaoendelea.');
}

async function showDonationMenu(ctx) {
  const text = `*💰 Msaada kwa Mickey Glitch*

` +
    `• .donate <kiasi> - Anza mchakato wa malipo
` +
    `• .donate menu - Tazama njia za malipo
` +
    `• .donate history - Historia yako
` +
    `• .donate stats - Takwimu za msaada
` +
    `• .donate cancel - Ghairi mchakato

` +
    `📌 Kiasi cha chini: TSh ${MIN_AMOUNT.toLocaleString()}
` +
    `📌 Kiasi cha juu: TSh ${MAX_AMOUNT.toLocaleString()}

` +
    `*Mchakato:*
` +
    `1. Tuma .donate <kiasi>
` +
    `2. Tuma namba yako ya simu
` +
    `3. Kamilisha malipo kwenye link`;

  const button = new ButtonV2(ctx.sock)
    .text(text)
    .footer('Tumia .donate <kiasi> kuendelea')
    .addButton('Msaada', '.donate help')
    .addButton('Historia', '.donate history')
    .addButton('Takwimu', '.donate stats')
    .addButton('Ghairi', '.donate cancel');

  await button.send(ctx.chatId, {
    quoted: ctx.msg,
    fallbackText: 'Tuma .donate <kiasi> kuanzisha malipo ya msaada.'
  });
}

async function showDonationHistory(ctx) {
  const history = paymentStore.getTransactionHistory(ctx.chatId);
  if (!history.length) {
    return ctx.reply('📭 Hakuna historia ya malipo. Tumia .donate <kiasi> kuanza.');
  }

  const lines = history.slice(0, 8).map((item, index) => {
    const phone = item.phone ? `📱 ${item.phone}` : '';
    return `${index + 1}. TSh ${Number(item.amount).toLocaleString()} - ${item.status.toUpperCase()}
ID: ${item.orderId}
${phone}`;
  });

  await ctx.reply(`📋 *Historia ya Malipo*

${lines.join('\n\n')}

*Jumla:* TSh ${Number(history.reduce((sum, item) => sum + (item.status === 'completed' ? Number(item.amount) : 0), 0)).toLocaleString()}`);
}

async function showDonationStats(ctx) {
  const summary = paymentStore.getSummary();
  const provider = PROVIDER.toUpperCase();
  await ctx.reply(`📊 *Takwimu za Msaada*

` +
    `💰 Jumla ya mapato: TSh ${Number(summary.total).toLocaleString()}
` +
    `🔄 Miamala yote: ${summary.transactions}
` +
    `✅ Thibitisho: ${summary.confirmed || 0}
` +
    `⏳ Zinazosubiri: ${summary.pending || 0}
` +
    `📱 Provider: ${provider}

*Asante kwa kuunga mkono!*`);
}

// Export command
module.exports = donateCommand;
module.exports.commandName = 'donate';
module.exports.aliases = ['makeadonation', 'donation'];
module.exports.description = 'Donate through external payment API';
module.exports.category = 'GENERAL';
module.exports.handlePhoneInput = handlePhoneInput;
module.exports.handleCancel = handleCancel;