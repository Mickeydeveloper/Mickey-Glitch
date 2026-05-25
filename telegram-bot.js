const fs = require('fs');
const path = require('path');
const axios = require('axios');
const yts = require('yt-search'); 
const settings = require('./settings');
const { pairWhatsappAccount } = require('./index'); // Inavuta kazi kutoka index.js ya sasa
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const TELEGRAM_DATA_DIR = path.join(__dirname, 'data');
const TELEGRAM_DATA_FILE = path.join(TELEGRAM_DATA_DIR, 'telegramPairs.json');
const TELEGRAM_BASE_URL = (token) => `https://api.telegram.org/bot${token}`;

const AXIOS_DEFAULTS = {
    timeout: 30000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
};

// Exponential backoff retry mechanism
async function tryRequest(getter, attempts = 2) {
    let lastErr;
    for (let i = 1; i <= attempts; i++) {
        try { return await getter(); } 
        catch (err) { lastErr = err; if (i < attempts) await new Promise(r => setTimeout(r, 1000 * i)); }
    }
    throw lastErr;
}

// Get MP3/Audio Link na Multi-API JSON Fallback
async function getYoutubeMp3(ytUrl) {
    const apis = [
        async () => {
            const res = await axios.get(`https://nayan-video-downloader.vercel.app/youtube?url=${encodeURIComponent(ytUrl)}`, AXIOS_DEFAULTS);
            const formats = res.data?.data?.data?.formats || [];
            const found = formats.find(f => f.type === 'audio' || f.mimeType?.includes('audio')) || formats[formats.length - 1];
            if (found?.url) return found.url;
            throw new Error();
        },
        async () => {
            const res = await axios.get(`https://apiskeith.top/download/audio?url=${encodeURIComponent(ytUrl)}`, AXIOS_DEFAULTS);
            return res.data?.result?.url || res.data?.result?.download || res.data?.result || res.data?.url || res.data?.download || res.data?.audio;
        },
        async () => {
            const res = await axios.get(`https://eliteprotech-apis.zone.id/ytmp3?url=${encodeURIComponent(ytUrl)}`, AXIOS_DEFAULTS);
            return res.data?.result?.url || res.data?.result?.download || res.data?.url || res.data?.download;
        }
    ];

    for (const api of apis) {
        try {
            const downloadUrl = await tryRequest(api);
            if (downloadUrl && typeof downloadUrl === 'string') return downloadUrl;
        } catch { continue; }
    }
    throw new Error('API zote za MP3 zimefeli.');
}

// Get MP4/Video Link na Multi-API JSON Fallback
async function getYoutubeMp4(ytUrl) {
    const apis = [
        async () => {
            const res = await axios.get(`https://nayan-video-downloader.vercel.app/youtube?url=${encodeURIComponent(ytUrl)}`, AXIOS_DEFAULTS);
            const formats = res.data?.data?.data?.formats || [];
            const found = formats.find(f => f.type === 'video_with_audio' && f.ext === 'mp4') || formats.find(f => f.ext === 'mp4') || formats[0];
            if (found?.url) return found.url;
            throw new Error();
        },
        async () => {
            const res = await axios.get(`https://apiskeith.top/download/mp4?url=${encodeURIComponent(ytUrl)}`, AXIOS_DEFAULTS);
            return res.data?.result?.url || res.data?.result?.download || res.data?.result || res.data?.url || res.data?.download || res.data?.video;
        },
        async () => {
            const res = await axios.get(`https://eliteprotech-apis.zone.id/ytmp4?url=${encodeURIComponent(ytUrl)}`, AXIOS_DEFAULTS);
            return res.data?.result?.url || res.data?.result?.download || res.data?.url || res.data?.download;
        }
    ];

    for (const api of apis) {
        try {
            const downloadUrl = await tryRequest(api);
            if (downloadUrl && typeof downloadUrl === 'string') return downloadUrl;
        } catch { continue; }
    }
    throw new Error('API zote za MP4 zimefeli.');
}

async function removeWebhookIfSet(token) {
  try {
    const resp = await axios.post(`${TELEGRAM_BASE_URL(token)}/deleteWebhook`);
    return resp?.data?.ok || false;
  } catch (err) { return false; }
}

function ensureTelegramDataFile() {
  if (!fs.existsSync(TELEGRAM_DATA_DIR)) fs.mkdirSync(TELEGRAM_DATA_DIR, { recursive: true });
  if (!fs.existsSync(TELEGRAM_DATA_FILE)) fs.writeFileSync(TELEGRAM_DATA_FILE, JSON.stringify([]), 'utf8');
}

function loadAllowedChats() {
  ensureTelegramDataFile();
  try {
    const raw = fs.readFileSync(TELEGRAM_DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(id => String(id)) : [];
  } catch (error) { return []; }
}

function saveAllowedChats(chats) {
  const unique = Array.from(new Set(chats.map(id => String(id))));
  fs.writeFileSync(TELEGRAM_DATA_FILE, JSON.stringify(unique, null, 2), 'utf8');
}

function isChatAllowed(chatId) { return loadAllowedChats().includes(String(chatId)); }

function addAllowedChat(chatId) {
  const allowed = loadAllowedChats();
  if (!allowed.includes(String(chatId))) {
    allowed.push(String(chatId));
    saveAllowedChats(allowed);
  }
}

function removeAllowedChat(chatId) {
  const allowed = loadAllowedChats().filter(id => id !== String(chatId));
  saveAllowedChats(allowed);
}

// 👑 MENU APPEARANCE UPGRADE
function formatHelpText() {
  return [
    '┏━━━━━━━━━━━━━━━━━━━━┓',
    '┃   *MICKEY GLITCH TELEGRAM BOT* ┃',
    '┗━━━━━━━━━━━━━━━━━━━━┛',
    '',
    '🛡️ *PAIRING SYSTEM (INDEX)*',
    '┣ /pair `<namba_ya_simu>` ➔ Mfano: /pair 255615858685',
    '┗ /unpair ➔ Tenganisha chat na mfumo',
    '',
    '🤖 *CORE COMMANDS*',
    '┣ /menu , /help ➔ Orodha ya amri zote',
    '┣ /ping ➔ Angalia wepesi wa bot',
    '┣ /alive ➔ Angalia hali ya mfumo',
    '┣ /owner ➔ Maelezo ya mtengenezaji',
    '┗ /update ➔ Vuta code mpya kutoka GitHub',
    '',
    '🎵 *MEDIA & AUTOMATION*',
    '┣ /play `<jina la wimbo>` ➔ Pakua YT Audio',
    '┣ /video `<jina la video>` ➔ Pakua YT Video',
    '┣ /shazam ➔ Tambua wimbo uliorepliwa',
    '┗ /stickertelegram `<link>` ➔ Pata info za sticker pack',
    '',
    '⏳ _Powered by Mickey Developer_'
  ].join('\n');
}

function isOwnerChat(chatId) {
  const ownerId = String(settings.telegram?.ownerId || '').trim();
  return ownerId && String(chatId) === ownerId;
}

function isTelegramAuthorized(chatId) {
  if (isChatAllowed(chatId)) return true;
  if (isOwnerChat(chatId)) return true;
  if (String(settings.commandMode || '').toLowerCase() === 'public') return true;
  return false;
}

async function sendTelegramMessage(chatId, text, extra = {}) {
  const token = settings.telegram?.botToken?.trim();
  if (!token || !chatId) return;
  try {
    await axios.post(`${TELEGRAM_BASE_URL(token)}/sendMessage`, {
      chat_id: String(chatId),
      text,
      disable_web_page_preview: true,
      parse_mode: 'Markdown',
      ...extra
    });
  } catch (error) {
    console.error('Telegram sendMessage failed:', error?.response?.data || error.message);
  }
}

async function sendTelegramPhoto(chatId, photoUrl, caption = '') {
  const token = settings.telegram?.botToken?.trim();
  if (!token || !chatId) return;
  try {
    await axios.post(`${TELEGRAM_BASE_URL(token)}/sendPhoto`, {
      chat_id: String(chatId),
      photo: photoUrl,
      caption: caption,
      parse_mode: 'Markdown'
                });
  } catch (error) {
    console.error('Telegram sendPhoto failed:', error?.response?.data || error.message);
  }
}

async function sendTelegramMedia(chatId, type, url, caption = '') {
  const token = settings.telegram?.botToken?.trim();
  if (!token || !chatId) return;
  const endpoint = type === 'audio' ? 'sendAudio' : 'sendVideo';
  try {
    await axios.post(`${TELEGRAM_BASE_URL(token)}/${endpoint}`, {
      chat_id: String(chatId),
      [type]: url,
      caption: caption,
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error(`Telegram ${endpoint} failed:`, error?.response?.data || error.message);
    await sendTelegramMessage(chatId, `❌ Kushindwa kutuma ${type}. Faili limezuiwa au ni kubwa mno.`);
  }
}

async function handleStickerTelegram(chatId, args) {
  if (!args.length) return sendTelegramMessage(chatId, '⚠️ Tumia: /stickertelegram https://t.me/addstickers/PackName');
  const url = args[0].trim();
  const match = url.match(/(?:https?:\/\/)?t\.me\/addstickers\/(.+)/i);
  if (!match) return sendTelegramMessage(chatId, '❌ URL ya Sticker si sahihi.');

  const packName = match[1];
  try {
    const response = await axios.get(`${TELEGRAM_BASE_URL(settings.telegram.botToken)}/getStickerSet`, { params: { name: packName } });
    if (!response.data?.ok || !response.data.result) throw new Error();

    const stickerSet = response.data.result;
    const stickers = stickerSet.stickers || [];
    const sample = stickers.slice(0, 8).map((st, i) => `${i + 1}. ${st.emoji || '☀️'}`);

    const text = [`📦 Sticker Pack: ${stickerSet.title}`, `🆔 Name: ${stickerSet.name}`, `🧩 Count: ${stickers.length}`, '', 'Samples:', sample.join('\n')].join('\n');
    await sendTelegramMessage(chatId, text);
  } catch (error) {
    await sendTelegramMessage(chatId, '❌ Ilifeli kupata maelezo ya sticker pack.');
  }
}

async function handleUpdateCommand(chatId, isActiveOwner) {
  if (!isActiveOwner) return sendTelegramMessage(chatId, '🚷 Amri hii ni maalum kwa Owner tu!');
  await sendTelegramMessage(chatId, '⏳ *Inatafuta mabadiliko kutoka GitHub (Mickey-Glitch)...*');

  const rawUrl = 'https://raw.githubusercontent.com/Mickeydeveloper/Mickey-Glitch/main/telegram-bot.js';
  try {
    const response = await axios.get(rawUrl, { responseType: 'text' });
    if (response.status === 200 && response.data) {
      fs.writeFileSync(__filename, response.data, 'utf8');
      await sendTelegramMessage(chatId, '✅ *Msimbo umesasishwa kwa mafanikio!* Inajiwasha upya...');
      setTimeout(() => { process.exit(0); }, 2000);
    } else { throw new Error('Data haikupatikana'); }
  } catch (error) {
    await sendTelegramMessage(chatId, `❌ *Mchakato umefeli:* ${error.message}`);
  }
}

async function handleShazamCommand(chatId, repliedMessage) {
    const token = settings.telegram?.botToken?.trim();
    const media = repliedMessage.audio || repliedMessage.video || repliedMessage.voice;

    if (!media || !media.file_id) {
        return sendTelegramMessage(chatId, '❌ *Tafadhali reply ujumbe wa audio au video kwa kutumia /shazam*');
    }

    if (!settings.acrcloud || !settings.acrcloud.access_key) {
        return sendTelegramMessage(chatId, '❌ *ACRCloud API haijawekwa kwenye settings.js!*');
    }

    await sendTelegramMessage(chatId, '🔍 *Inatambua wimbo, subiri kidogo...*');

    try {
        const fileRes = await axios.get(`${TELEGRAM_BASE_URL(token)}/getFile?file_id=${media.file_id}`);
        if (!fileRes.data?.ok) throw new Error("Mchakato wa kupata faili umefeli.");

        const filePath = fileRes.data.result.file_path;
        const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

        const responseBuffer = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const mediaBuffer = Buffer.from(responseBuffer.data);

        const tempDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const tempInput = path.join(tempDir, `shazam_in_${Date.now()}`);
        const tempAudio = path.join(tempDir, `shazam_out_${Date.now()}.wav`);

        fs.writeFileSync(tempInput, mediaBuffer);

        try {
            await execAsync(`ffmpeg -i "${tempInput}" -vn -acodec pcm_s16le -ar 44100 -ac 2 -t 15 "${tempAudio}" -y`);
        } catch (e) {
            fs.writeFileSync(tempAudio, fs.readFileSync(tempInput));
        }

        const acrcloud = require('acrcloud');
        const acr = new acrcloud({
            host: settings.acrcloud.host,
            access_key: settings.acrcloud.access_key,
            access_secret: settings.acrcloud.access_secret
        });

        const result = await acr.identify(fs.readFileSync(tempAudio));

        if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
        if (fs.existsSync(tempAudio)) fs.unlinkSync(tempAudio);

        if (result.status?.code === 0 && result.metadata?.music?.length > 0) {
            const song = result.metadata.music[0];
            const title = song.title || 'Unknown';
            const artist = song.artists?.[0]?.name || 'Unknown';

            const caption = `🎵 *SHAZAM IDENTIFIED!*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━\n` +
                `📌 *Title:* ${title}\n` +
                `👤 *Artist:* ${artist}\n` +
                `💿 *Album:* ${song.album?.name || 'N/A'}\n` +
                `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

            await sendTelegramMessage(chatId, caption, {
                reply_markup: {
                    inline_keyboard: [[
                        { text: `📥 Download MP3`, callback_data: `play_${title}` }
                    ]]
                }
            });
        } else {
            await sendTelegramMessage(chatId, '❌ *Wimbo haukutambulika.* Jaribu kipande chenye sauti safi.');
        }
    } catch (err) {
        console.error("SHAZAM ERROR:", err);
        await sendTelegramMessage(chatId, '❌ Mfumo wa Shazam umepata tatizo la kiufundi.');
    }
}

async function handleUpdate(update) {
  if (update.callback_query) {
      const callback = update.callback_query;
      const chatId = callback.message.chat.id;
      const data = callback.data;
      if (data.startsWith('play_')) {
          const trackTitle = data.replace('play_', '');
          await sendTelegramMessage(chatId, `🎵 *Inasindika amri ya kupakua:* _${trackTitle}_...`);
          const searchResult = await yts(trackTitle);
          const video = searchResult.videos[0];
          if (video) {
              await sendTelegramPhoto(chatId, video.thumbnail, `🎵 *${video.title}*\n📥 *Inapakua Audio...*`);
              const audioUrl = await getYoutubeMp3(video.url);
              await sendTelegramMedia(chatId, 'audio', audioUrl, `🎵 *Title:* ${video.title}`);
          }
      }
      return;
  }

  const message = update.message || update.edited_message;
  if (!message) return;

  const chatId = message.chat?.id;
  const sender = message.from;
  const rawText = String(message.text || '').trim();

  if (rawText.toLowerCase().startsWith('/shazam') || rawText.toLowerCase().startsWith('.shazam')) {
      if (message.reply_to_message) {
          await handleShazamCommand(chatId, message.reply_to_message);
      } else {
          await sendTelegramMessage(chatId, '❌ *Tafadhali reply kwenye audio/video kisha uandike /shazam*');
      }
      return;
  }

  if (!rawText.startsWith('/') && !rawText.startsWith('.')) return;

  const cleanText = rawText.substring(1);
  const parts = cleanText.split(/\s+/);
  const commandText = parts[0].toLowerCase();
  const args = parts.slice(1);
  const fullArgs = args.join(' ');

  const allowed = isTelegramAuthorized(chatId);
  const isActiveOwner = isOwnerChat(chatId);

  if (commandText === 'start' || commandText === 'menu' || commandText === 'help') {
    await sendTelegramMessage(chatId, formatHelpText());
    return;
  }

  // 🛡️ MFUMO MPYA WA KUPAIR WHATSAPP KUPITIA INDEX DIRECTLY
  if (commandText === 'pair') {
    const inputNumber = args[0] || '';
    if (!inputNumber) {
      return sendTelegramMessage(chatId, '⚠️ *Tafadhali weka namba ya simu!*\nMfano: `/pair 255615858685`');
    }

    // Safisha namba ili ibaki safi isiyo na herufi
    const cleanNumber = inputNumber.replace(/[^0-9]/g, '');
    await sendTelegramMessage(chatId, `⏳ *Inawasiliana na Mfumo wa Index kuomba Pairing Code ya WhatsApp kwa namba ${cleanNumber}...*`);

    try {
      // INAPITISHWA: Namba halisi iliyoandikwa na mtumiaji inatumwa kwenda index.js
      const result = await pairWhatsappAccount({
        phoneNumber: cleanNumber,
        deviceName: settings.telegram?.pairCode || 'MICKDADY'
      });

      addAllowedChat(chatId); // Ruhusu chat hii itumie amri za bot

      if (result && result.pairingCode) {
        const successMsg = `🔑 *YOUR WHATSAPP PAIRING CODE*\n\n` +
                           `Code: \`${result.pairingCode}\`\n\n` +
                           `👉 Fungua WhatsApp ➔ Settings ➔ Linked Devices ➔ Link with Phone Number kisha ingiza code hiyo hapo juu.`;
        return sendTelegramMessage(chatId, successMsg);
      } else {
        return sendTelegramMessage(chatId, '✅ Ombi limetumwa lakini hakuna code iliyorudishwa. Angalia terminal/panel.');
      }
    } catch (error) {
      console.error("Pairing flow error:", error);
      return sendTelegramMessage(chatId, `❌ *Pairing Flow Imefeli:* Namba inaweza kuwa tayari imeunganishwa au session ina hitilafu.`);
    }
  }

  if (commandText === 'unpair') {
    if (!isChatAllowed(chatId)) return sendTelegramMessage(chatId, 'ℹ️ Chat hii haijawa paired bado.');
    removeAllowedChat(chatId);
    return sendTelegramMessage(chatId, '✅ Chat imeondolewa kwenye pairing kwa mafanikio.');
  }

  if (commandText === 'update') {
    await handleUpdateCommand(chatId, isActiveOwner);
    return;
  }

  if (!allowed) {
    return sendTelegramMessage(chatId, '⚠️ Chat hii haijapairishwa bado. Andika `/pair <namba_ya_simu>` ili kuitumia.');
  }

  switch (commandText) {
    case 'ping':
      return sendTelegramMessage(chatId, `🏓 Pong! Inaitikia vizuri kabisa.\n👤 Mtumiaji: ${sender?.username || sender?.first_name || 'Mgeni'}`);

    case 'alive':
      return sendTelegramMessage(chatId, `✅ Mickey Glitch Bot iko Active.\n✨ Jukwaa: Telegram Engine\n⚙️ Usanidi: Safi`);

    case 'owner':
      return sendTelegramMessage(chatId, `👤 Mmiliki: ${settings.botOwner || 'Mickey Developer'}\n📱 WhatsApp: https://wa.me/${settings.ownerNumber}`);

    case 'stickertelegram':
      return handleStickerTelegram(chatId, args);

    case 'play': {
      if (!fullArgs) return sendTelegramMessage(chatId, '⚠️ Tafadhali weka jina la wimbo! Mfano: `/play Jux Enjoy`');
      await sendTelegramMessage(chatId, `🎵 *Inatafuta wimbo:* _${fullArgs}_...`);

      try {
        const searchResult = await yts(fullArgs);
        const video = searchResult.videos[0];
        if (!video) return sendTelegramMessage(chatId, '❌ Wimbo haukupatikana YouTube.');

        await sendTelegramPhoto(chatId, video.thumbnail, `🎵 *${video.title}*\n⏱️ Muda: ${video.timestamp}\n📥 *Inapakua Audio hivi sasa...*`);

        const audioUrl = await getYoutubeMp3(video.url);
        await sendTelegramMedia(chatId, 'audio', audioUrl, `🎵 *Title:* ${video.title}\n🔗 *Link:* ${video.url}\n\n> *Mickey Developer* ⚡`);
      } catch (err) {
        console.error(err);
        await sendTelegramMessage(chatId, '❌ Ilitokea hitilafu wakati wa kupakua audio.');
      }
      return;
    }

    case 'video': {
      if (!fullArgs) return sendTelegramMessage(chatId, '⚠️ Tafadhali weka jina la video! Mfano: `/video Marioo Mi Amor`');
      await sendTelegramMessage(chatId, `📹 *Inatafuta video:* _${fullArgs}_...`);

      try {
        const searchResult = await yts(fullArgs);
        const video = searchResult.videos[0];
        if (!video) return sendTelegramMessage(chatId, '❌ Video haikutumbukia kwenye utafutaji.');

        await sendTelegramPhoto(chatId, video.thumbnail, `🎥 *${video.title}*\n⏱️ Muda: ${video.timestamp}\n📥 *Inapakua Video hivi sasa...*`);

        const videoUrl = await getYoutubeMp4(video.url);
        await sendTelegramMedia(chatId, 'video', videoUrl, `📹 *Title:* ${video.title}\n🔗 *Link:* ${video.url}\n\n> *Mickey Developer* ⚡`);
      } catch (err) {
        console.error(err);
        await sendTelegramMessage(chatId, '❌ Imefeli kupata link ya video kutoka kwenye seva.');
      }
      return;
    }

    default:
      if (rawText.startsWith('/') || rawText.startsWith('.')) {
        return sendTelegramMessage(chatId, `❌ Amri ya '${commandText}' haipo.\nTumia /menu kuona zilizopo.`);
      }
      return;
  }
}

async function startTelegramBot() {
  const token = settings.telegram?.botToken?.trim();
  if (!token) {
    console.error('Telegram botToken haipo kwenye settings.js');
    process.exit(1);
  }

  ensureTelegramDataFile();
  try { await removeWebhookIfSet(token); } catch (e) {}

  let offset = 0;
  console.log('✅ Telegram Bot Engine Imewashwa Vizuri kwa Mfumo wa Index.');

  while (true) {
    try {
      const response = await axios.get(`${TELEGRAM_BASE_URL(token)}/getUpdates`, {
        params: { offset: offset + 1, timeout: 30, allowed_updates: ['message', 'edited_message', 'callback_query'] },
        timeout: 60000
      });

      if (!response.data?.ok) throw new Error();
      const updates = response.data.result || [];
      for (const update of updates) {
        offset = update.update_id;
        await handleUpdate(update);
      }
    } catch (error) {
      if (error?.response?.data?.error_code === 409) {
        try { await removeWebhookIfSet(token); } catch (e) {}
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

module.exports = { startTelegramBot, isChatAllowed, addAllowedChat, removeAllowedChat };
