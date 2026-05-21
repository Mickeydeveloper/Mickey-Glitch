const fs = require('fs');
const path = require('path');
const axios = require('axios');
const settings = require('./settings');

const TELEGRAM_DATA_DIR = path.join(__dirname, 'data');
const TELEGRAM_DATA_FILE = path.join(TELEGRAM_DATA_DIR, 'telegramPairs.json');
const TELEGRAM_BASE_URL = (token) => `https://api.telegram.org/bot${token}`;

async function removeWebhookIfSet(token) {
  try {
    const resp = await axios.post(`${TELEGRAM_BASE_URL(token)}/deleteWebhook`);
    if (resp?.data?.ok) {
      console.log('✅ Telegram: existing webhook deleted.');
      return true;
    }
    console.log('ℹ️ Telegram deleteWebhook response:', resp?.data);
    return false;
  } catch (err) {
    console.error('Failed to delete Telegram webhook:', err?.response?.data || err.message);
    return false;
  }
}

function ensureTelegramDataFile() {
  if (!fs.existsSync(TELEGRAM_DATA_DIR)) {
    fs.mkdirSync(TELEGRAM_DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(TELEGRAM_DATA_FILE)) {
    fs.writeFileSync(TELEGRAM_DATA_FILE, JSON.stringify([]), 'utf8');
  }
}

function loadAllowedChats() {
  ensureTelegramDataFile();
  try {
    const raw = fs.readFileSync(TELEGRAM_DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((id) => String(id));
    }
    saveAllowedChats([]);
    return [];
  } catch (error) {
    saveAllowedChats([]);
    return [];
  }
}

function saveAllowedChats(chats) {
  const unique = Array.from(new Set(chats.map((id) => String(id))));
  fs.writeFileSync(TELEGRAM_DATA_FILE, JSON.stringify(unique, null, 2), 'utf8');
}

function isChatAllowed(chatId) {
  const allowed = loadAllowedChats();
  return allowed.includes(String(chatId));
}

function addAllowedChat(chatId) {
  const allowed = loadAllowedChats();
  if (!allowed.includes(String(chatId))) {
    allowed.push(String(chatId));
    saveAllowedChats(allowed);
  }
}

function removeAllowedChat(chatId) {
  const allowed = loadAllowedChats().filter((id) => id !== String(chatId));
  saveAllowedChats(allowed);
}

function formatHelpText() {
  return [
    '*Mickey Glitch Telegram Bot*',
    '',
    'Commands:',
    '/pair <code> - Pair this Telegram chat with the bot',
    '/unpair - Stop pairing this chat',
    '/help - Show this help message',
    '/ping - Check bot responsiveness',
    '/alive - Check bot status',
    '/owner - Show owner contact details',
    '/stickertelegram <t.me/addstickers/packname> - Get Telegram sticker pack info',
    '/menu - Show available commands',
    '',
    'Example:',
    '/pair 1234',
    '',
    '_Pairing is required before running bot commands._'
  ].join('\n');
}

async function sendTelegramMessage(chatId, text, extra = {}) {
  if (!chatId) {
    console.error('Telegram sendMessage failed: missing chatId');
    return;
  }
  const token = settings.telegram?.botToken?.trim();
  if (!token) {
    console.error('Telegram sendMessage failed: telegram.botToken is missing in settings.js');
    return;
  }

  try {
    await axios.post(`${TELEGRAM_BASE_URL(token)}/sendMessage`, {
      chat_id: String(chatId),
      text,
      disable_web_page_preview: true,
      ...extra
    });
  } catch (error) {
    console.error('Telegram sendMessage failed:', error?.response?.data || error.message);
  }
}

function canPair(chatId, code) {
  const ownerId = String(settings.telegram.ownerId || '').trim();
  const pairCode = String(settings.telegram.pairCode || '').trim();
  const normalizedChat = String(chatId);

  if (ownerId && normalizedChat === ownerId) return true;
  if (pairCode) return normalizedChat === ownerId || String(code || '').trim() === pairCode;
  return true;
}

async function handleStickerTelegram(chatId, args) {
  if (!args.length) {
    return sendTelegramMessage(chatId, '⚠️ Tumia: /stickertelegram https://t.me/addstickers/PackName');
  }

  const url = args[0].trim();
  const match = url.match(/(?:https?:\/\/)?t\.me\/addstickers\/(.+)/i);
  if (!match) {
    return sendTelegramMessage(chatId, '❌ URL si sahihi. Tumia link yenye muundo: https://t.me/addstickers/PackName');
  }

  const packName = match[1];

  try {
    const response = await axios.get(`${TELEGRAM_BASE_URL(settings.telegram.botToken)}/getStickerSet`, {
      params: { name: packName }
    });

    if (!response.data?.ok || !response.data.result) {
      throw new Error('Sticker set haipatikani au bot haina ruhusa');
    }

    const stickerSet = response.data.result;
    const stickers = Array.isArray(stickerSet.stickers) ? stickerSet.stickers : [];

    if (!stickers.length) {
      return sendTelegramMessage(chatId, '⚠️ Sticker pack imetumwa bila sticker yoyote. Hakikisha pack ni ya umma na inapatikana.');
    }

    const sample = stickers.slice(0, 8).map((sticker, index) => {
      const emoji = sticker.emoji || '☀️';
      const type = sticker.is_animated ? 'animated' : sticker.is_video ? 'video' : 'static';
      return `${index + 1}. ${emoji} — ${type}`;
    });

    const text = [
      `📦 Sticker Pack: ${stickerSet.title}`,
      `🆔 Name: ${stickerSet.name}`,
      `🧩 Count: ${stickers.length}`,
      `✨ Sticker type: ${stickerSet.is_animated ? 'Animated' : stickerSet.is_video ? 'Video' : 'Static'}`,
      '',
      'Sample stickers:',
      sample.join('\n'),
      '',
      'Use /pair to authorize this chat first if needed.'
    ].join('\n');

    await sendTelegramMessage(chatId, text);
  } catch (error) {
    console.error('Telegram sticker pack fetch error:', error?.response?.data || error.message);
    await sendTelegramMessage(chatId, '❌ Ilikosea kupata info ya sticker pack. Hakikisha URL ni sahihi na bot ina ruhusa ya kusoma sticker set.');
  }
}

async function handleUpdate(update) {
  const message = update.message || update.edited_message;
  if (!message || !message.text) return;

  const chatId = message.chat?.id;
  const sender = message.from;
  const rawText = String(message.text || '').trim();
  const commandText = rawText.split(/\s+/)[0].toLowerCase();
  const args = rawText.split(/\s+/).slice(1);
  const allowed = isChatAllowed(chatId);

  if (commandText === '/start' || commandText === '/menu' || commandText === '/help' || commandText === '.help') {
    await sendTelegramMessage(chatId, formatHelpText());
    return;
  }

  if (commandText === '/pair' || commandText === '.pair') {
    if (allowed) {
      return sendTelegramMessage(chatId, '✅ Hii chat tayari imepangwa. Tumia /help kuona amri zilizopo.');
    }

    const code = args[0] || '';
    if (!canPair(chatId, code)) {
      return sendTelegramMessage(chatId, '❌ Pairing imekataa. Tumia nambari sahihi ya pairing au weka telegram.ownerId sahihi kwenye settings.js');
    }

    addAllowedChat(chatId);
    return sendTelegramMessage(chatId, '✅ Bot imepangwa kwa mafanikio kwenye Telegram hii chat. Tumia /help kuona amri za bot.');
  }

  if (commandText === '/unpair' || commandText === '.unpair') {
    if (!allowed) {
      return sendTelegramMessage(chatId, 'ℹ️ Chat hii haijawa paired. Tumia /pair ili kuanza.');
    }
    removeAllowedChat(chatId);
    return sendTelegramMessage(chatId, '✅ Chat imeondolewa kwenye pairing ya bot. Tumia /pair tena ikiwa unataka kuendelea.');
  }

  if (!allowed) {
    return sendTelegramMessage(chatId, '⚠️ Chat hii haijapair. Tumia /pair <code> ili uanze kutumia bot.');
  }

  switch (commandText) {
    case '/ping':
    case '.ping':
      return sendTelegramMessage(chatId, `🏓 Pong! Bot inafanya kazi.
👤 User: ${sender?.username || sender?.first_name || 'Unknown'}`);
    case '/alive':
    case '.alive':
      return sendTelegramMessage(chatId, `✅ Bot iko mtandaoni.
✨ Mode: Telegram
🔧 Imewezeshwa kupitia settings.js`);
    case '/owner':
    case '.owner':
      return sendTelegramMessage(chatId, `👤 Bot Owner: ${settings.botOwner || 'Owner'}\n📱 WhatsApp: ${settings.ownerNumber ? `https://wa.me/${settings.ownerNumber}` : 'Not configured'}\n🟦 Telegram Owner ID: ${settings.telegram.ownerId || 'Not configured'}`);
    case '/stickertelegram':
    case '.stickertelegram':
      return handleStickerTelegram(chatId, args);
    default:
      if (commandText.startsWith('/')) {
        return sendTelegramMessage(chatId, `❌ Amri '${commandText}' haipatani.
Tumia /help kuona amri zinazopatikana.`);
      }
      await sendTelegramMessage(chatId, '📌 Tumia /help kuona amri zilizotolewa au /pair kuanzisha pairing.');
      return;
  }
}

async function startTelegramBot() {
  const token = settings.telegram?.botToken?.trim();
  if (!token) {
    console.error('Telegram mode imewezeshwa lakini telegram.botToken haijatajwa kwenye settings.js');
    process.exit(1);
  }

  ensureTelegramDataFile();
  // Ensure no webhook is active (prevents 409 conflict when using getUpdates)
  try { await removeWebhookIfSet(token); } catch (e) {}

  let offset = 0;
  console.log('✅ Telegram bot mode imeanzishwa. Inasubiri updates...');

  while (true) {
    try {
      const response = await axios.get(`${TELEGRAM_BASE_URL(token)}/getUpdates`, {
        params: {
          offset: offset + 1,
          timeout: 30,
          allowed_updates: ['message', 'edited_message']
        },
        timeout: 60000
      });

      if (!response.data?.ok) {
        throw new Error(`Telegram getUpdates failed: ${JSON.stringify(response.data)}`);
      }

      const updates = Array.isArray(response.data.result) ? response.data.result : [];
      for (const update of updates) {
        offset = update.update_id;
        await handleUpdate(update);
      }
    } catch (error) {
      const errData = error?.response?.data;
      console.error('Telegram polling error:', errData || error.message);

      // If webhook is active, attempt to delete it and continue polling
      if (errData?.error_code === 409) {
        console.log('⚠️ Detected active webhook; attempting to delete it and resume polling...');
        try { await removeWebhookIfSet(token); } catch (e) {}
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

module.exports = { startTelegramBot, isChatAllowed, addAllowedChat, removeAllowedChat };
