const axios = require('axios');
const { ButtonV2, createCtx } = require('../lib/messageBuilder');
const paymentStore = require('../lib/paymentStore');
const settings = require('../settings');

const MIN_AMOUNT = 500; // Imebadilishwa kutoka 1000 hadi 500
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
  // Inaruhusu namba za Tanzania: 0712345678, 255712345678, 0621234567
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
  if (clean.length === 13 && clean.startsWith('255')) {
    return clean; // Sahihi
  }
  return null;
}

async function donateCommand(sock, chatId, message, args = []) {
  try {
    const ctx = createCtx(sock, chatId, message, { args });
    const command = (args[0] || '').toLowerCase();

    // Handle cancel command
    if (command === 'cancel') {
      return handleCancel(ctx);
    }

    if (command === 'history') {
      return showDonationHistory(ctx);
    }

    if (command === 'stats') {
      return showDonationStats(ctx);
    }

    if (command === 'help' || command === 'menu') {
      return showDonationMenu(ctx);
    }

    // Check if command has amount and phone: .donate 1000 255615944741
    const amount = normalizeAmount(args[0]);
    let phone = args[1] || '';
    
    // If amount is valid and phone is provided
    if (amount > 0 && phone) {
      const formattedPhone = isValidPhone(phone);
      if (!formattedPhone) {
        return ctx.reply(`❌ Namba ya simu isiyo sahihi.

Tumia muundo huu:
• .donate 1000 255615944741
• .donate 500 0712345678
• .donate 2000 0621234567

Kiasi cha chini ni TSh ${MIN_AMOUNT.toLocaleString()}`);
      }
      
      return createPaymentCheckout(ctx, amount, formattedPhone);
    }

    // If only amount is provided, ask for phone
    if (amount > 0) {
      return requestPhoneNumber(ctx, amount);
    }

    // Show menu if no valid arguments
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

Tafadhali *tuma namba yako ya simu* katika muundo huu:
• 0712345678
• 255712345678
• 0621234567

Au tumia: .donate ${amount} 255712345678

Namba itatumika kukutumia mwongozo wa malipo.`;

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
• 255712345678
• 0621234567

Au tuma .donate cancel kughairi.`);
  }

  // Endelea na malipo
  await createPaymentCheckout(ctx, session.amount, formattedPhone);
  
  // Ondoa session
  userSessions.delete(sessionId);
}

async function createPaymentCheckout(ctx, amount, phone) {
  const orderId = `DON-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  
  const payload = {
    packageId: `DON_${amount}`,
    serverName: 'Mickey Donation',
    paymentMethod: PROVIDER,
    phone: phone,
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
    console.log('[donate] Sending payment request:', JSON.stringify(payload, null, 2));
    
    const response = await axios.post(CHECKOUT_BASE_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 20000
    });

    const data = response?.data;
    console.log('[donate] Payment response:', JSON.stringify(data, null, 2));
    
    if (!data || !data.success || !data.data?.paymentUrl) {
      console.error('[donate] invalid checkout response:', data);
      return ctx.reply('⚠️ Ilishindikana kuanzisha malipo. Tafadhali jaribu tena baadaye.');
    }

    // Store transaction
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

💰 Kiasi: TSh ${amount.toLocaleString()}
📱 Namba: ${phone}
🆔 Order ID: ${orderId}

🔗 Endelea kwa malipo kupitia link ifuatayo:
${data.data.paymentUrl}

⏰ *Muhimu:* Hakikisha unakamilisha malipo ndani ya dakika 15.

📌 Unaweza kuangalia historia yako kwa .donate history`)
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
    if (error.response) {
      console.error('[donate] Error response:', error.response.data);
      return ctx.reply(`⚠️ Ilishindikana kuanzisha malipo: ${error.response.data?.message || 'Tafadhali jaribu tena baadaye.'}`);
    }
    return ctx.reply('⚠️ Ilishindikana kuanzisha malipo kwa sasa. Tafadhali jaribu tena baadaye.');
  }
}

async function handleCancel(ctx) {
  const sessionId = ctx.chatId;
  if (userSessions.has(sessionId)) {
    userSessions.delete(sessionId);
    return ctx.reply('✅ Mchakato wa malipo umeghairiwa.');
  }
  return ctx.reply('ℹ️ Hakuna mchakato wa malipo unaoendelea.');
}

async function showDonationMenu(ctx) {
  const text = `💰 *Msaada kwa Mickey Glitch*

📌 *Njia za Matumizi:*

1️⃣ *Malipo ya Moja kwa Moja:*
.donate <kiasi> <namba>
Mfano: .donate 1000 255615944741

2️⃣ *Malipo kwa Hatua:*
.donate <kiasi>
Kisha tuma namba yako

3️⃣ *Commands:*
• .donate menu - Menyu hii
• .donate history - Historia yako
• .donate stats - Takwimu
• .donate cancel - Ghairi mchakato

💰 Kiasi cha chini: TSh ${MIN_AMOUNT.toLocaleString()}
💰 Kiasi cha juu: TSh ${MAX_AMOUNT.toLocaleString()}

*Mchakato:* Tuma namba → Thibitisha → Malipo`;

  const button = new ButtonV2(ctx.sock)
    .text(text)
    .footer('Tumia .donate <kiasi> <namba> kuendelea')
    .addButton('Historia', '.donate history')
    .addButton('Takwimu', '.donate stats')
    .addButton('Ghairi', '.donate cancel');

  await button.send(ctx.chatId, {
    quoted: ctx.msg,
    fallbackText: 'Tuma .donate <kiasi> <namba> kuanzisha malipo.'
  });
}

async function showDonationHistory(ctx) {
  const history = paymentStore.getTransactionHistory(ctx.chatId);
  if (!history.length) {
    return ctx.reply('📭 Hakuna historia ya malipo. 
Tumia .donate <kiasi> <namba> kuanza.');
  }

  const lines = history.slice(0, 8).map((item, index) => {
    const phone = item.phone ? `📱 ${item.phone}` : '';
    const status = item.status === 'completed' ? '✅ Imethibitishwa' : 
                   item.status === 'pending' ? '⏳ Inasubiri' : '❌ Imeshindwa';
    return `${index + 1}. TSh ${Number(item.amount).toLocaleString()} - ${status}
🆔 ${item.orderId}
${phone}`;
  });

  const total = history.reduce((sum, item) => {
    return sum + (item.status === 'completed' ? Number(item.amount) : 0);
  }, 0);

  await ctx.reply(`📋 *Historia ya Malipo*

${lines.join('\n\n')}

📊 *Jumla:* TSh ${total.toLocaleString()}
📝 *Miamala yote:* ${history.length}`);
}

async function showDonationStats(ctx) {
  const summary = paymentStore.getSummary();
  const provider = PROVIDER.toUpperCase();
  
  await ctx.reply(`📊 *Takwimu za Msaada*

💰 Jumla ya mapato: TSh ${Number(summary.total).toLocaleString()}
🔄 Miamala yote: ${summary.transactions}
✅ Imethibitishwa: ${summary.confirmed || 0}
⏳ Inasubiri: ${summary.pending || 0}
📱 Provider: ${provider}
🏦 Kiasi cha chini: TSh ${MIN_AMOUNT.toLocaleString()}

*Asante kwa kuunga mkono!* ❤️`);
}

// Function ya ku-expose kwa message handler
async function handleIncomingMessage(sock, message) {
  const text = message.body || '';
  const chatId = message.key.remoteJid;
  
  // Check if this is a phone number input during session
  if (userSessions.has(chatId) && /^[0-9]{9,13}$/.test(text.replace(/[^0-9]/g, ''))) {
    const ctx = createCtx(sock, chatId, message, { args: [] });
    await handlePhoneInput(ctx, text);
    return true;
  }
  
  return false;
}

// Export command
module.exports = donateCommand;
module.exports.commandName = 'donate';
module.exports.aliases = ['makeadonation', 'donation', 'donate'];
module.exports.description = 'Donate through external payment API';
module.exports.category = 'GENERAL';
module.exports.handleIncomingMessage = handleIncomingMessage;
module.exports.handlePhoneInput = handlePhoneInput;
module.exports.handleCancel = handleCancel;