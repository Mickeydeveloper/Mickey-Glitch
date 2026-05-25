const fs = require('fs');
const path = require('path');
const axios = require('axios');
const yts = require('yt-search'); 
const os = require('os');
const settings = require('./settings');
const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const TELEGRAM_DATA_DIR = path.join(__dirname, 'data');
const TELEGRAM_DATA_FILE = path.join(TELEGRAM_DATA_DIR, 'telegramPairs.json');
const TELEGRAM_BASE_URL = (token) => `https://api.telegram.org/bot${token}`;

// Store active pairing sessions
const activePairingSessions = new Map();

const AXIOS_DEFAULTS = {
    timeout: 30000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
};

// ============ FIXED PAIRING FUNCTION ============
async function generatePairingCode(phoneNumber) {
    try {
        const { version, isLatest } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState(`./pairing-${phoneNumber}`);
        
        const sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            browser: ['Mickey Glitch', 'Chrome', '120.0.0.0']
        });
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                sock.end(new Error('Timeout'));
                reject(new Error('Pairing timeout after 60 seconds'));
            }, 60000);
            
            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr, pairingCode } = update;
                
                if (pairingCode) {
                    clearTimeout(timeout);
                    await sock.end();
                    resolve({ pairingCode });
                }
                
                if (connection === 'close') {
                    clearTimeout(timeout);
                    const error = lastDisconnect?.error;
                    reject(new Error(error?.message || 'Connection closed'));
                }
            });
            
            // Request pairing code
            sock.requestPairingCode(phoneNumber);
        });
    } catch (error) {
        throw new Error(`Pairing failed: ${error.message}`);
    }
}

// ============ IMPROVED PAIR HANDLER ============
async function handlePairCommand(chatId, args, sendMessage) {
    const inputNumber = args[0] || '';
    if (!inputNumber) {
        return sendMessage(chatId, '⚠️ *Tafadhali weka namba ya simu!*\n\n📌 *Mfano:* `/pair 255612130873`\n\n💡 *Format:* Namba lazima iwe na msimbo wa nchi (255 kwa Tanzania)');
    }
    
    const cleanNumber = inputNumber.replace(/[^0-9]/g, '');
    
    // Validate phone number
    if (cleanNumber.length < 10 || cleanNumber.length > 15) {
        return sendMessage(chatId, '❌ *Namba si sahihi!*\n\n✅ Namba sahihi: 255XXXXXXXXX (hadi tarakimu 12-13)');
    }
    
    // Check if already pairing
    if (activePairingSessions.has(chatId)) {
        return sendMessage(chatId, '⏳ *Tayari una mchakato wa pairing unaoendelea!*\nTafadhali subiri au jaribu tena baada ya dakika 1.');
    }
    
    await sendMessage(chatId, `🔐 *INATENGENEZA PAIRING CODE...*\n\n📱 *Namba:* +${cleanNumber}\n⏱️ *Muda:* Sekunde 15-30\n\n⚡ *Tafadhali subiri, code inatayarishwa...*`);
    
    activePairingSessions.set(chatId, true);
    
    try {
        const result = await generatePairingCode(cleanNumber);
        
        if (result && result.pairingCode) {
            // Add to allowed chats automatically on success
            addAllowedChat(chatId);
            
            const successMsg = `🔑 *PAIRING CODE YAKO!*\n\n` +
                              `╭━━━━━━━━━━━━━━━━━━━━╮\n` +
                              `┃ 🔐 *CODE:* \`${result.pairingCode}\`\n` +
                              `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                              `📌 *JINSIA YA KUTUMIA:*\n` +
                              `1️⃣ Fungua WhatsApp\n` +
                              `2️⃣ Nenda *Settings* → *Linked Devices*\n` +
                              `3️⃣ Chagua *Link with Phone Number*\n` +
                              `4️⃣ Ingiza code hii: \`${result.pairingCode}\`\n\n` +
                              `✅ *Baada ya kuunganisha, bot itakupokea!*`;
            
            await sendMessage(chatId, successMsg);
            
            // Optional: Send to owner for monitoring
            const ownerId = String(settings.telegram?.ownerId || '').trim();
            if (ownerId && ownerId !== chatId) {
                await sendMessage(ownerId, `🔔 *New Pairing Request*\n👤 Chat ID: \`${chatId}\`\n📱 Namba: +${cleanNumber}\n✅ Status: Success`);
            }
        } else {
            await sendMessage(chatId, '❌ *IMEFELI KUPATA CODE!*\n\n💡 *Sababu:*\n• Namba inaweza kuwa na pairing active\n• Jaribu tena baada ya dakika 1\n• Hakikisha namba ni sahihi');
        }
    } catch (error) {
        console.error('Pairing Error:', error);
        
        let errorMsg = '❌ *PAIRING IMEFELI!*\n\n';
        
        if (error.message.includes('timeout')) {
            errorMsg += '⏱️ *Timeout:* Mchakato umechukua muda mrefu.\n📌 Jaribu tena baada ya sekunde 30.';
        } else if (error.message.includes('invalid')) {
            errorMsg += '📱 *Namba si sahihi:*\n• Hakikisha namba ina msimbo wa nchi\n• Tanzania: 255XXXXXXXXX';
        } else {
            errorMsg += '⚠️ *Hitilafu ya mfumo:*\n• Jaribu tena baada ya dakika 1\n• Wasiliana na owner kama inaendelea';
        }
        
        await sendMessage(chatId, errorMsg);
    } finally {
        // Remove session after 30 seconds
        setTimeout(() => {
            activePairingSessions.delete(chatId);
        }, 30000);
    }
}

// ============ REST OF YOUR CODE (Keep as is but improve) ============

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
    '┣ /pair `<namba>` ➔ Unganisha WhatsApp',
    '┗ /unpair ➔ Tenganisha chat hii',
    '',
    '🤖 *CORE COMMANDS*',
    '┣ /menu, /help ➔ Orodha ya amri',
    '┣ /ping ➔ Angalia wepesi',
    '┣ /alive ➔ Hali ya mfumo',
    '┣ /owner ➔ Maelezo ya mtengenezaji',
    '',
    '📊 *OWNER COMMANDS*',
    '┣ /stats ➔ RAM, CPU, Uptime',
    '┣ /chats ➔ Magroup yaliyopairishwa',
    '┣ /update ➔ Sasisha kodi kutoka GitHub',
    '┗ /exec `<cmd>` ➔ Run terminal command',
    '',
    '🎵 *MEDIA & DOWNLOADS*',
    '┣ /play `<jina>` ➔ Pakua Audio (YT)',
    '┣ /video `<jina>` ➔ Pakua Video (YT)',
    '┣ /shazam ➔ Tambua wimbo',
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

async function handleUpdateCommand(chatId, isActiveOwner, sendMessage) {
  if (!isActiveOwner) return sendMessage(chatId, '🚷 Amri hii ni maalum kwa Owner tu!');
  await sendMessage(chatId, '⏳ *Inatafuta mabadiliko kutoka GitHub...*');
  const rawUrl = 'https://raw.githubusercontent.com/Mickeydeveloper/Mickey-Glitch/main/telegram-bot.js';
  try {
    const response = await axios.get(rawUrl, { responseType: 'text' });
    if (response.status === 200 && response.data) {
      fs.writeFileSync(__filename, response.data, 'utf8');
      await sendMessage(chatId, '✅ *Msimbo umesasishwa!* Inajiwasha upya...');
      setTimeout(() => { process.exit(0); }, 2000);
    } else { throw new Error(); }
  } catch (error) { await sendMessage(chatId, `❌ *Mchakato umefeli.*`); }
}

async function handleShazamCommand(chatId, repliedMessage, sendMessage) {
    const token = settings.telegram?.botToken?.trim();
    const media = repliedMessage.audio || repliedMessage.video || repliedMessage.voice;
    if (!media || !media.file_id) return sendMessage(chatId, '❌ *Tafadhali reply kwenye audio/video kisha uandike /shazam*');
    if (!settings.acrcloud || !settings.acrcloud.access_key) return sendMessage(chatId, '❌ *ACRCloud API haijawekwa!*');
    await sendMessage(chatId, '🔍 *Inatambua wimbo, subiri kidogo...*');
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
            const caption = `🎵 *SHAZAM IDENTIFIED!*\n━━━━━━━━━━━━━━━━━━━━━━\n📌 *Title:* ${title}\n👤 *Artist:* ${artist}\n━━━━━━━━━━━━━━━━━━━━━━\n\n💡 *Tumia* /play ${title} *kupakua*`;
            await sendMessage(chatId, caption);
        } else { await sendMessage(chatId, '❌ *Wimbo haukutambulika.*'); }
    } catch (err) { await sendMessage(chatId, '❌ Mfumo wa Shazam umepata tatizo.'); }
}

async function handleUpdate(update) {
  if (update.callback_query) {
      const callback = update.callback_query;
      const chatId = callback.message.chat.id;
      const data = callback.data;
      if (data.startsWith('play_')) {
          const trackTitle = data.replace('play_', '');
          await sendTelegramMessage(chatId, `🎵 *Inasindika:* _${trackTitle}_...`);
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

  // Helper send function
  const sendMsg = async (id, txt, extra = {}) => sendTelegramMessage(id, txt, extra);

  if (rawText.toLowerCase().startsWith('/shazam') || rawText.toLowerCase().startsWith('.shazam')) {
      if (message.reply_to_message) { await handleShazamCommand(chatId, message.reply_to_message, sendMsg); } 
      else { await sendMsg(chatId, '❌ *Tafadhali reply kwenye audio/video kisha uandike /shazam*'); }
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

  // Handle start/menu/help
  if (commandText === 'start' || commandText === 'menu' || commandText === 'help') {
    await sendMsg(chatId, formatHelpText());
    return;
  }

  // Handle pair command - USING IMPROVED VERSION
  if (commandText === 'pair') {
    await handlePairCommand(chatId, args, sendMsg);
    return;
  }

  // Handle unpair
  if (commandText === 'unpair') {
    if (!isChatAllowed(chatId)) return sendMsg(chatId, 'ℹ️ Chat hii haijawa paired bado.');
    removeAllowedChat(chatId);
    return sendMsg(chatId, '✅ Chat imeondolewa kwenye pairing.');
  }

  // Handle update
  if (commandText === 'update') {
    await handleUpdateCommand(chatId, isActiveOwner, sendMsg);
    return;
  }

  // Handle stats
  if (commandText === 'stats') {
    const uptime = Math.floor(process.uptime());
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;
    const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
    const serverFreeRam = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
    const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);

    const statsText = `📊 *SYSTEM STATS*\n━━━━━━━━━━━━━━━━━━━━━━\n⏱️ *Uptime:* ${hours}h ${minutes}m ${seconds}s\n💾 *RAM:* ${ramUsage} MB\n🖥️ *Server:* ${serverFreeRam}GB Free / ${totalRam}GB Total\n⚙️ *Platform:* ${os.platform()} (${os.arch()})\n💻 *CPU Cores:* ${os.cpus().length}\n━━━━━━━━━━━━━━━━━━━━━━`;
    return sendMsg(chatId, statsText);
  }

  // Handle chats list
  if (commandText === 'chats') {
    if (!isActiveOwner) return sendMsg(chatId, '🚷 Amri hii ni ya Owner tu.');
    const list = loadAllowedChats();
    if (!list.length) return sendMsg(chatId, 'ℹ️ Hakuna Chat yoyote iliyopairishwa.');
    return sendMsg(chatId, `📝 *CHATS PAIRED (${list.length}):*\n\n` + list.map((id, index) => `${index + 1}. ID: \`${id}\``).join('\n'));
  }

  // Handle exec command
  if (commandText === 'exec') {
    if (!isActiveOwner) return sendMsg(chatId, '🚷 Amri hii ni ya Owner tu!');
    if (!fullArgs) return sendMsg(chatId, '⚠️ Weka command. Mfano: `/exec ls`');
    await sendMsg(chatId, `💻 *Running command...*`);
    try {
        const { stdout, stderr } = await execAsync(fullArgs);
        const output = stdout || stderr || 'No output.';
        return sendMsg(chatId, `📤 *Output:*\n\`\`\`bash\n${output.substring(0, 3500)}\n\`\`\``);
    } catch (e) {
        return sendMsg(chatId, `❌ *Error:*\n\`\`\`bash\n${e.message}\n\`\`\``);
    }
  }

  // Check authorization for other commands
  if (!allowed) {
    return sendMsg(chatId, '⚠️ Chat hii haijapairishwa. Tumia `/pair <namba>` kuanza.');
  }

  // Handle other commands
  switch (commandText) {
    case 'ping':
      return sendMsg(chatId, `🏓 Pong! Bot iko active.\n👤 ${sender?.username || sender?.first_name || 'User'}`);
      
    case 'alive':
      return sendMsg(chatId, `✅ *MICKEY GLITCH BOT* iko Active!\n⚙️ Telegram Engine | ✅ All Systems Operational`);
      
    case 'owner':
      return sendMsg(chatId, `👑 *Owner:* ${settings.botOwner || 'Mickey Developer'}\n📱 *WhatsApp:* wa.me/${settings.ownerNumber || '255612130873'}\n📢 *Channel:* t.me/mickeyglitch`);
      
    case 'stickertelegram':
      if (!args.length) return sendMsg(chatId, '⚠️ Tumia: `/stickertelegram https://t.me/addstickers/PackName`');
      const url = args[0].trim();
      const match = url.match(/(?:https?:\/\/)?t\.me\/addstickers\/(.+)/i);
      if (!match) return sendMsg(chatId, '❌ URL si sahihi.');
      const packName = match[1];
      try {
        const response = await axios.get(`${TELEGRAM_BASE_URL(settings.telegram.botToken)}/getStickerSet`, { params: { name: packName } });
        const stickerSet = response.data.result;
        const stickers = stickerSet.stickers || [];
        const text = `📦 *${stickerSet.title}*\n🆔 *Name:* ${stickerSet.name}\n🧩 *Count:* ${stickers.length}\n\n✨ *Mickey Glitch Bot*`;
        await sendMsg(chatId, text);
      } catch (error) { await sendMsg(chatId, '❌ Imefeli kupata sticker pack.'); }
      return;

    case 'play': {
      if (!fullArgs) return sendMsg(chatId, '⚠️ Weka jina la wimbo! Mfano: `/play Jux Enjoy`');
      await sendMsg(chatId, `🎵 *Inatafuta:* _${fullArgs}_...`);
      try {
        const searchResult = await yts(fullArgs);
        const video = searchResult.videos[0];
        if (!video) return sendMsg(chatId, '❌ Wimbo haukupatikana.');
        await sendTelegramPhoto(chatId, video.thumbnail, `🎵 *${video.title}*\n⏱️ ${video.timestamp}\n📥 *Inapakua...*`);
        const audioUrl = await getYoutubeMp3(video.url);
        await sendTelegramMedia(chatId, 'audio', audioUrl, `🎵 *${video.title}*\n\n> *Mickey Glitch Bot* ⚡`);
      } catch (err) { await sendMsg(chatId, '❌ Hitilafu wakati wa kupakua.'); }
      return;
    }

    case 'video': {
      if (!fullArgs) return sendMsg(chatId, '⚠️ Weka jina la video! Mfano: `/video Marioo Mi Amor`');
      await sendMsg(chatId, `📹 *Inatafuta:* _${fullArgs}_...`);
      try {
        const searchResult = await yts(fullArgs);
        const video = searchResult.videos[0];
        if (!video) return sendMsg(chatId, '❌ Video haikupatikana.');
        await sendTelegramPhoto(chatId, video.thumbnail, `🎥 *${video.title}*\n⏱️ ${video.timestamp}\n📥 *Inapakua...*`);
        const videoUrl = await getYoutubeMp4(video.url);
        await sendTelegramMedia(chatId, 'video', videoUrl, `📹 *${video.title}*\n\n> *Mickey Glitch Bot* ⚡`);
      } catch (err) { await sendMsg(chatId, '❌ Hitilafu wakati wa kupakua.'); }
      return;
    }

    default:
      if (rawText.startsWith('/') || rawText.startsWith('.')) {
        return sendMsg(chatId, `❌ Amri '${commandText}' haipo.\nTumia /menu kuona zilizopo.`);
      }
      return;
  }
}

// ============ START TELEGRAM BOT ============
async function startTelegramBot() {
  const token = settings.telegram?.botToken?.trim();
  if (!token) { console.error('❌ Telegram botToken haipo kwenye settings.js'); process.exit(1); }
  
  ensureTelegramDataFile();
  try { await removeWebhookIfSet(token); } catch (e) {}
  
  // Notify owner on startup
  const ownerId = String(settings.telegram?.ownerId || '').trim();
  if (ownerId) {
      const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
      const startMsg = `✅ *MICKEY GLITCH BOT IMEWASHWA!*\n\n🟢 *Status:* Online\n💾 *RAM:* ${ramUsage} MB\n⏱️ *Started:* ${new Date().toLocaleString()}\n\n✨ *Bot iko tayari kupokea maagizo!*`;
      await sendTelegramMessage(ownerId, startMsg).catch(() => {});
  }
  
  console.log('✅ Telegram Bot Engine Imewashwa!');
  
  let offset = 0;
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