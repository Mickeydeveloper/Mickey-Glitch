const fs = require('fs');
const path = require('path');
const axios = require('axios');
const yts = require('yt-search'); 
const os = require('os');
const settings = require('./settings');
const { pairWhatsappAccount } = require('./index'); 
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

async function tryRequest(getter, attempts = 2) {
    let lastErr;
    for (let i = 1; i <= attempts; i++) {
        try { return await getter(); } 
        catch (err) { lastErr = err; if (i < attempts) await new Promise(r => setTimeout(r, 1000 * i)); }
    }
    throw lastErr;
}

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
        }
    ];
    for (const api of apis) {
        try { const downloadUrl = await tryRequest(api); if (downloadUrl && typeof downloadUrl === 'string') return downloadUrl; } catch { continue; }
    }
    throw new Error('API zote zimefeli.');
}

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
            return res.data?.result?.url || res.data?.result?.download || res.data?.url || res.data?.download;
        }
    ];
    for (const api of apis) {
        try { const downloadUrl = await tryRequest(api); if (downloadUrl && typeof downloadUrl === 'string') return downloadUrl; } catch { continue; }
    }
    throw new Error('API zote zimefeli.');
}

async function removeWebhookIfSet(token) {
  try { const resp = await axios.post(`${TELEGRAM_BASE_URL(token)}/deleteWebhook`); return resp?.data?.ok || false; } catch (err) { return false; }
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
  if (!allowed.includes(String(chatId))) { allowed.push(String(chatId)); saveAllowedChats(allowed); }
}

function removeAllowedChat(chatId) {
  const allowed = loadAllowedChats().filter(id => id !== String(chatId)); saveAllowedChats(allowed);
}

function formatHelpText() {
  return [
    '┏━━━━━━━━━━━━━━━━━━━━┓',
    '┃   *MICKEY GLITCH TELEGRAM BOT* ┃',
    '┗━━━━━━━━━━━━━━━━━━━━┛',
    '',
    '🛡️ *PAIRING SYSTEM*',
    '┣ /pair `<namba_ya_simu>` ➔ Unganisha namba ya WhatsApp',
    '┗ /unpair ➔ Tenganisha chat hii',
    '',
    '🤖 *CORE COMMANDS*',
    '┣ /menu , /help ➔ Orodha ya amri zote',
    '┣ /ping ➔ Angalia wepesi wa bot',
    '┣ /alive ➔ Angalia hali ya mfumo',
    '┣ /owner ➔ Maelezo ya mtengenezaji',
    '',
    '📊 *ADVANCED / OWNER COMMANDS*',
    '┣ /stats ➔ Angalia RAM, CPU na Uptime ya Server',
    '┣ /chats ➔ Angalia ID za magroup yote yaliyopairishwa',
    '┣ /update ➔ Vuta kodi mpya kutoka GitHub',
    '┗ /exec `<command>` ➔ Run Linux Command Terminal',
    '',
    '🎵 *MEDIA & DOWNLOADS*',
    '┣ /play `<jina la wimbo>` ➔ Pakua Audio (YT)',
    '┣ /video `<jina la video>` ➔ Pakua Video (YT)',
    '┣ /shazam ➔ Tambua sauti ya wimbo uliorepliwa',
    '┗ /stickertelegram `<link>` ➔ Info za sticker',
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
  } catch (error) {}
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
  } catch (error) {}
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
    await sendTelegramMessage(chatId, `❌ Kushindwa kutuma ${type}. Faili ni kubwa mno.`);
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
    const stickerSet = response.data.result;
    const stickers = stickerSet.stickers || [];
    const sample = stickers.slice(0, 8).map((st, i) => `${i + 1}. ${st.emoji || '☀️'}`);
    const text = [`📦 Sticker Pack: ${stickerSet.title}`, `🆔 Name: ${stickerSet.name}`, `🧩 Count: ${stickers.length}`, '', 'Samples:', sample.join('\n')].join('\n');
    await sendTelegramMessage(chatId, text);
  } catch (error) { await sendTelegramMessage(chatId, '❌ Ilifeli kupata maelezo ya sticker pack.'); }
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
    } else { throw new Error(); }
  } catch (error) { await sendTelegramMessage(chatId, `❌ *Mchakato umefeli.*`); }
}

async function handleShazamCommand(chatId, repliedMessage) {
    const token = settings.telegram?.botToken?.trim();
    const media = repliedMessage.audio || repliedMessage.video || repliedMessage.voice;
    if (!media || !media.file_id) return sendTelegramMessage(chatId, '❌ *Tafadhali reply ujumbe wa audio/video uandike /shazam*');
    if (!settings.acrcloud || !settings.acrcloud.access_key) return sendTelegramMessage(chatId, '❌ *ACRCloud API haijawekwa!*');
    await sendTelegramMessage(chatId, '🔍 *Inatambua wimbo, subiri kidogo...*');
    try {
        const fileRes = await axios.get(`${TELEGRAM_BASE_URL(token)}/getFile?file_id=${media.file_id}`);
        const filePath = fileRes.data.result.file_path;
        const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
        const responseBuffer = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const mediaBuffer = Buffer.from(responseBuffer.data);
        const tempDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const tempInput = path.join(tempDir, `shazam_in_${Date.now()}`);
        const tempAudio = path.join(tempDir, `shazam_out_${Date.now()}.wav`);
        fs.writeFileSync(tempInput, mediaBuffer);
        try { await execAsync(`ffmpeg -i "${tempInput}" -vn -acodec pcm_s16le -ar 44100 -ac 2 -t 15 "${tempAudio}" -y`); } catch (e) { fs.writeFileSync(tempAudio, fs.readFileSync(tempInput)); }
        const acrcloud = require('acrcloud');
        const acr = new acrcloud({ host: settings.acrcloud.host, access_key: settings.acrcloud.access_key, access_secret: settings.acrcloud.access_secret });
        const result = await acr.identify(fs.readFileSync(tempAudio));
        if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
        if (fs.existsSync(tempAudio)) fs.unlinkSync(tempAudio);
        if (result.status?.code === 0 && result.metadata?.music?.length > 0) {
            const song = result.metadata.music[0];
            const title = song.title || 'Unknown';
            const artist = song.artists?.[0]?.name || 'Unknown';
            const caption = `🎵 *SHAZAM IDENTIFIED!*\n━━━━━━━━━━━━━━━━━━━━━━\n📌 *Title:* ${title}\n👤 *Artist:* ${artist}\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            await sendTelegramMessage(chatId, caption, { reply_markup: { inline_keyboard: [[{ text: `📥 Download MP3`, callback_data: `play_${title}` }]] } });
        } else { await sendTelegramMessage(chatId, '❌ *Wimbo haukutambulika.*'); }
    } catch (err) { await sendTelegramMessage(chatId, '❌ Mfumo wa Shazam umepata tatizo.'); }
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
      if (message.reply_to_message) { await handleShazamCommand(chatId, message.reply_to_message); } 
      else { await sendTelegramMessage(chatId, '❌ *Tafadhali reply kwenye audio/video kisha uandike /shazam*'); }
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

  // 🛡️ REFIXED: PAIR COMMAND INAYOMALIZA MATATIZO YA DELAY
  if (commandText === 'pair') {
    const inputNumber = args[0] || '';
    if (!inputNumber) {
      return sendTelegramMessage(chatId, '⚠️ *Tafadhali weka namba ya simu!*\nMfano: `/pair 255615858685`');
    }
    const cleanNumber = inputNumber.replace(/[^0-9]/g, '');
    await sendTelegramMessage(chatId, `⏳ *Inatengeneza muunganisho mpya (Baileys Engine) kwa namba ${cleanNumber}...\nInaweza kuchukua hadi sekunde 10, subiri...*`);
    try {
      const result = await pairWhatsappAccount({
        phoneNumber: cleanNumber,
        deviceName: settings.telegram?.pairCode || 'MICKDADY'
      });
      if (result && result.pairingCode) {
        addAllowedChat(chatId);
        const successMsg = `🔑 *YOUR WHATSAPP PAIRING CODE*\n\n` +
                           `Code: \`${result.pairingCode}\`\n\n` +
                           `👉 Fungua WhatsApp ➔ Settings ➔ Linked Devices ➔ Link with Phone Number kisha ingiza code hiyo hapo juu.`;
        return sendTelegramMessage(chatId, successMsg);
      } else {
        return sendTelegramMessage(chatId, '❌ *Imefeli kupata code kutoka WhatsApp.* Hakikisha namba haina matatizo, na haina mchakato mwingine wa pairing unaoendelea hivi sasa.');
      }
    } catch (error) {
      return sendTelegramMessage(chatId, `❌ *Pairing Error:* Seva imeshindwa kusindika ombi.`);
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

  // 📈 COMMAND MPYA: /stats (Orodha ya Resource za Panel)
  if (commandText === 'stats') {
    const uptime = Math.floor(process.uptime());
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;
    const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
    const serverFreeRam = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
    const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);

    const statsText = `📊 *SYSTEM PERFORMANCE STATS*\n` +
                      `━━━━━━━━━━━━━━━━━━━━━━\n` +
                      `⏱️ *Bot Uptime:* ${hours}h ${minutes}m ${seconds}s\n` +
                      `💾 *Process RAM:* ${ramUsage} MB\n` +
                      `🖥️ *Server RAM:* ${serverFreeRam}GB Free / ${totalRam}GB Total\n` +
                      `⚙️ *Platform:* ${os.platform()} (${os.arch()})\n` +
                      `💻 *CPU Cores:* ${os.cpus().length}\n` +
                      `━━━━━━━━━━━━━━━━━━━━━━`;
    return sendTelegramMessage(chatId, statsText);
  }

  // 📝 COMMAND MPYA: /chats (Kuona Idadi ya Magroup yaliyopairishwa)
  if (commandText === 'chats') {
    if (!isActiveOwner) return sendTelegramMessage(chatId, '🚷 Amri hii ni ya Owner tu.');
    const list = loadAllowedChats();
    if (!list.length) return sendTelegramMessage(chatId, 'ℹ️ Hakuna Chat yoyote iliyopairishwa kwa sasa.');
    return sendTelegramMessage(chatId, `📝 *CHATS ZILIZOPAIRISHWA (${list.length}):*\n\n` + list.map((id, index) => `${index + 1}. ID: \`${id}\``).join('\n'));
  }

  // 💻 COMMAND MAALUM YA USIMAMIZI: /exec (Inakimbiza Terminal Commands za Linux)
  if (commandText === 'exec') {
    if (!isActiveOwner) return sendTelegramMessage(chatId, '🚷 Amri hii ni maalum kwa Mmiliki wa Mfumo pekee!');
    if (!fullArgs) return sendTelegramMessage(chatId, '⚠️ Weka command unayotaka ku-execute. Mfano: `/exec ls` au `/exec pm2 status`');
    await sendTelegramMessage(chatId, `💻 *Running terminal command...*`);
    try {
        const { stdout, stderr } = await execAsync(fullArgs);
        const output = stdout || stderr || 'Command executed with no output.';
        return sendTelegramMessage(chatId, `📤 *Terminal Output:*\n\`\`\`bash\n${output.substring(0, 3500)}\n\`\`\``);
    } catch (e) {
        return sendTelegramMessage(chatId, `❌ *Terminal Error:*\n\`\`\`bash\n${e.message}\n\`\`\``);
    }
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
      } catch (err) { await sendTelegramMessage(chatId, '❌ Ilitokea hitilafu wakati wa kupakua audio.'); }
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
      } catch (err) { await sendTelegramMessage(chatId, '❌ Imefeli kupata link ya video kutoka kwenye seva.'); }
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
  if (!token) { console.error('Telegram botToken haipo kwenye settings.js'); process.exit(1); }
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
      for (const update of updates) { offset = update.update_id; await handleUpdate(update); }
    } catch (error) {
      if (error?.response?.data?.error_code === 409) { try { await removeWebhookIfSet(token); } catch (e) {} }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

module.exports = { startTelegramBot, isChatAllowed, addAllowedChat, removeAllowedChat };
