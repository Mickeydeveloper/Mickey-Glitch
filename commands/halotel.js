/**
 * halotel.js - Sell Halotel GB packages via payment button
 * Usage: .halotel gb1
 */

const { Button, createCtx } = require('../lib/messageBuilder');

const PACKAGES = {
  gb1: { data: '5GB', price: 1500, ussd: '*150*01*1#' },
  gb2: { data: '10GB', price: 3000, ussd: '*150*01*2#' },
  gb3: { data: '15GB', price: 4500, ussd: '*150*01*3#' },
  gb4: { data: '20GB', price: 6000, ussd: '*150*01*4#' },
};

function getPackage(pkgId) {
  if (!pkgId) return null;
  const id = String(pkgId).trim().toLowerCase();
  return PACKAGES[id] || null;
}

function formatPackageList() {
  return Object.entries(PACKAGES)
    .map(([key, pkg]) => `• ${key} - ${pkg.data} for TZS ${pkg.price}`)
    .join('\n');
}

async function sendPackageButton(ctx, pkgId) {
  const pkg = getPackage(pkgId);
  if (!pkg) {
    return ctx.reply(
      `❌ Package not found. Available packages:\n${formatPackageList()}\n\nUse .halotel <package> e.g. .halotel gb1`
    );
  }

  const orderId = `halotel-${pkgId}-${Date.now()}`;
  const amountValue = pkg.price * 100;
  const paymentPayload = {
    currency: 'TZS',
    total_amount: { value: amountValue, offset: 100 },
    reference_id: orderId,
    type: 'physical-goods',
    order: {
      status: 'pending',
      subtotal: { value: amountValue, offset: 100 },
      order_type: 'ORDER',
      items: [
        {
          name: `Halotel ${pkg.data}`,
          amount: { value: amountValue, offset: 100 },
          quantity: 1,
          sale_amount: { value: amountValue, offset: 100 },
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

  const button = new Button(ctx.sock || ctx.core);
  button
    .setTitle(`Halotel ${pkg.data}`)
    .setSubtitle('Halotel Data Sale')
    .setBody(
      `📦 *${pkg.data} Halotel Bundle*\n` +
      `💰 *Price:* TZS ${pkg.price}\n` +
      `📡 *USSD:* ${pkg.ussd}\n\n` +
      `Send the code above to purchase this bundle, then use the payment button below to confirm.`
    )
    .setFooter('Select review to continue with payment details')
    .addButton('payment_key_info', paymentPayload);

  await button.send(ctx.chatId, {
    quoted: ctx.msg,
    additionalNodes: [
      {
        tag: 'biz',
        attrs: {},
        content: [
          {
            tag: 'interactive',
            attrs: { type: 'native_flow', v: '1' },
            content: [
              { tag: 'native_flow', attrs: { name: 'payment_key_info' } },
            ],
          },
        ],
      },
    ],
  });
}

async function halotelCommand(sock, chatId, message, args) {
  const ctx = createCtx(sock, chatId, message, { args });
  const pkgId = args[0]?.toLowerCase();

  if (!pkgId) {
    return ctx.reply(
      `📶 Halotel GB Sales\n\nAvailable packages:\n${formatPackageList()}\n\nUse .halotel <package> to buy, for example .halotel gb1`
    );
  }

  await sendPackageButton(ctx, pkgId);
}

function getPendingRequest() {
  return null;
}

halotelCommand.aliases = ['halotel'];
halotelCommand.description = 'Sell Halotel GB packages with payment button';
halotelCommand.category = 'utility';

module.exports = {
  halotelCommand,
  code: halotelCommand,
  default: halotelCommand,
  getPendingRequest,
  aliases: ['halotel'],
  description: 'Sell Halotel GB packages with payment button',
  category: 'utility',
};
