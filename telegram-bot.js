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

// ============ TELEGRAM MEDIA FUNCTIONS WITH AD PREVIEW ============

// Send audio with ad preview (externalAdReply style)
async function sendTelegramAudioWithPreview(chatId, audioUrl, title, thumbnailUrl, duration = '', quality = 'MP3 128kbps') {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId) return;
    
    try {
        // Create inline keyboard with buttons
        const keyboard = {
            inline_keyboard: [
                [
                    { text: "🎵 Download Audio", url: audioUrl },
                    { text: "👑 Owner", url: `https://wa.me/${settings.ownerNumber || '255612130873'}` }
                ],
                [
                    { text: "📢 Join Channel", url: "https://t.me/mickeyglitch" },
                    { text: "⭐ Support", url: `https://wa.me/${settings.ownerNumber || '255612130873'}` }
                ]
            ]
        };
        
        const caption = `🎵 *${title.substring(0, 60)}*\n${duration ? `⏱️ *Duration:* ${duration}\n` : ''}🎚️ *Quality:* ${quality}\n📡 *Source:* Nayan API\n\n⚡ *Mickey Glitch Bot*`;
        
        // Send photo as preview
        await axios.post(`${TELEGRAM_BASE_URL(token)}/sendPhoto`, {
            chat_id: String(chatId),
            photo: thumbnailUrl,
            caption: caption,
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
        
        // Send audio file
        await axios.post(`${TELEGRAM_BASE_URL(token)}/sendAudio`, {
            chat_id: String(chatId),
            audio: audioUrl,
            caption: `✅ *Audio Ready!*\n🎵 ${title.substring(0, 40)}`,
            parse_mode: 'Markdown'
        });
        
    } catch (error) {
        console.error('[AUDIO PREVIEW] Error:', error.message);
        // Fallback: send audio only
        await sendTelegramMedia(chatId, 'audio', audioUrl, `🎵 ${title}`);
    }
}

// Send video with ad preview (externalAdReply style)
async function sendTelegramVideoWithPreview(chatId, videoUrl, title, thumbnailUrl, duration = '', quality = 'HD') {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId) return;
    
    try {
        // Create inline keyboard with buttons
        const keyboard = {
            inline_keyboard: [
                [
                    { text: "📥 Download Video", url: videoUrl },
                    { text: "👑 Owner", url: `https://wa.me/${settings.ownerNumber || '255612130873'}` }
                ],
                [
                    { text: "📢 Join Channel", url: "https://t.me/mickeyglitch" },
                    { text: "⭐ Support", url: `https://wa.me/${settings.ownerNumber || '255612130873'}` }
                ]
            ]
        };
        
        const caption = `🎥 *${title.substring(0, 60)}*\n${duration ? `⏱️ *Duration:* ${duration}\n` : ''}🎚️ *Quality:* ${quality}\n📡 *Source:* Nayan API\n\n⚡ *Mickey Glitch Bot*`;
        
        // Send photo as preview
        await axios.post(`${TELEGRAM_BASE_URL(token)}/sendPhoto`, {
            chat_id: String(chatId),
            photo: thumbnailUrl,
            caption: caption,
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
        
        // Send video file
        await axios.post(`${TELEGRAM_BASE_URL(token)}/sendVideo`, {
            chat_id: String(chatId),
            video: videoUrl,
            caption: `✅ *Video Ready!*\n🎥 ${title.substring(0, 40)}`,
            parse_mode: 'Markdown',
            supports_streaming: true
        });
        
    } catch (error) {
        console.error('[VIDEO PREVIEW] Error:', error.message);
        // Fallback: send video only
        await sendTelegramMedia(chatId, 'video', videoUrl, `📹 ${title}`);
    }
}

// Basic send functions
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
        await sendTelegramMessage(chatId, `❌ Failed to send ${type}. File too large.`);
    }
}

// ============ YOUTUBE API FUNCTIONS (NAYAN ONLY) ============

async function tryRequest(getter, attempts = 2) {
    let lastErr;
    for (let i = 1; i <= attempts; i++) {
        try { return await getter(); } 
        catch (err) { lastErr = err; if (i < attempts) await new Promise(r => setTimeout(r, 1000 * i)); }
    }
    throw lastErr;
}

// Extract video ID from YouTube URL
function extractVideoId(ytUrl) {
    let videoId = '';
    if (ytUrl.includes('youtu.be/')) {
        videoId = ytUrl.split('youtu.be/')[1].split('?')[0];
    } else if (ytUrl.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(ytUrl.split('?')[1]);
        videoId = urlParams.get('v');
    }
    return videoId;
}

// Get audio from Nayan APIs
async function getYoutubeMp3(ytUrl) {
    const videoId = extractVideoId(ytUrl);
    if (!videoId) throw new Error('Invalid YouTube URL');
    
    // Try Nayan YouTube API first (better audio quality)
    try {
        const apiUrl = `https://nayan-video-downloader.vercel.app/youtube?url=https://youtu.be/${videoId}`;
        const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
        
        if (res.data?.status === true && res.data?.data?.data?.formats) {
            const formats = res.data.data.data.formats;
            const title = res.data.data.data.title;
            const thumbnail = res.data.data.data.thumbnail;
            
            // Find best audio format
            let bestAudio = null;
            let bestPriority = 0;
            
            const audioPriority = {
                '251': 100, // opus best
                '250': 90,
                '249': 85,
                '140': 80,  // m4a medium
                '139': 70
            };
            
            for (const format of formats) {
                if (format.type === 'audio') {
                    let priority = audioPriority[format.formatId] || 50;
                    if (priority > bestPriority && format.url) {
                        bestPriority = priority;
                        bestAudio = format;
                    }
                }
            }
            
            if (bestAudio?.url) {
                return {
                    url: bestAudio.url,
                    title: title,
                    thumbnail: thumbnail,
                    quality: bestAudio.quality || bestAudio.label,
                    source: 'Nayan YouTube API'
                };
            }
        }
    } catch (err) {
        console.log('[AUDIO] YouTube API failed:', err.message);
    }
    
    // Fallback to Nayan AllDown API
    try {
        const apiUrl = `https://nayan-video-downloader.vercel.app/alldown?url=https://youtu.be/${videoId}`;
        const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
        
        if (res.data?.status === true && res.data?.data) {
            const videoData = res.data.data;
            const videoUrl = videoData.high || videoData.low;
            if (videoUrl) {
                return {
                    url: videoUrl,
                    title: videoData.title,
                    thumbnail: videoData.thumbnail,
                    source: 'Nayan AllDown'
                };
            }
        }
    } catch (err) {
        console.log('[AUDIO] AllDown failed:', err.message);
    }
    
    throw new Error('All audio APIs failed');
}

// Get video from Nayan APIs
async function getYoutubeMp4(ytUrl) {
    const videoId = extractVideoId(ytUrl);
    if (!videoId) throw new Error('Invalid YouTube URL');
    
    // Try Nayan AllDown API first
    try {
        const apiUrl = `https://nayan-video-downloader.vercel.app/alldown?url=https://youtu.be/${videoId}`;
        const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
        
        if (res.data?.status === true && res.data?.data) {
            const videoData = res.data.data;
            const videoUrl = videoData.high || videoData.low;
            if (videoUrl) {
                return {
                    url: videoUrl,
                    title: videoData.title,
                    thumbnail: videoData.thumbnail,
                    source: 'Nayan AllDown'
                };
            }
        }
    } catch (err) {
        console.log('[VIDEO] AllDown failed, trying YouTube API...');
    }
    
    // Fallback to Nayan YouTube API for better quality
    try {
        const apiUrl = `https://nayan-video-downloader.vercel.app/youtube?url=https://youtu.be/${videoId}`;
        const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
        
        if (res.data?.status === true && res.data?.data?.data?.formats) {
            const formats = res.data.data.data.formats;
            const title = res.data.data.data.title;
            const thumbnail = res.data.data.data.thumbnail;
            
            // Find best video format
            let bestVideo = null;
            let bestQuality = 0;
            
            const qualityPriority = {
                '2160p': 100,
                '1440p': 90,
                '1080p': 80,
                '720p': 70,
                '480p': 60,
                '360p': 50
            };
            
            for (const format of formats) {
                if (format.type === 'video_with_audio' || format.type === 'video_only') {
                    let quality = format.quality || format.label || '';
                    let priority = 0;
                    
                    for (const [q, p] of Object.entries(qualityPriority)) {
                        if (quality.includes(q)) {
                            priority = p;
                            break;
                        }
                    }
                    
                    if (priority > bestQuality && format.url) {
                        bestQuality = priority;
                        bestVideo = format;
                    }
                }
            }
            
            if (bestVideo?.url) {
                return {
                    url: bestVideo.url,
                    title: title,
                    thumbnail: thumbnail,
                    quality: bestVideo.quality || bestVideo.label,
                    source: 'Nayan YouTube API'
                };
            }
        }
    } catch (err) {
        console.log('[VIDEO] YouTube API failed:', err.message);
    }
    
    throw new Error('All video APIs failed');
}

// ============ PAIRING FUNCTIONS ============

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

            sock.requestPairingCode(phoneNumber);
        });
    } catch (error) {
        throw new Error(`Pairing failed: ${error.message}`);
    }
}

async function handlePairCommand(chatId, args, sendMessage) {
    const inputNumber = args[0] || '';
    if (!inputNumber) {
        return sendMessage(chatId, '⚠️ *Please enter phone number!*\n\n📌 *Example:* `/pair 255612130873`');
    }

    const cleanNumber = inputNumber.replace(/[^0-9]/g, '');

    if (cleanNumber.length < 10 || cleanNumber.length > 15) {
        return sendMessage(chatId, '❌ *Invalid number!*\n\n✅ Valid: 255XXXXXXXXX');
    }

    if (activePairingSessions.has(chatId)) {
        return sendMessage(chatId, '⏳ *Pairing already in progress!*');
    }

    await sendMessage(chatId, `🔐 *GENERATING PAIRING CODE...*\n\n📱 *Number:* +${cleanNumber}\n⏱️ *Time:* 15-30 seconds`);

    activePairingSessions.set(chatId, true);

    try {
        const result = await generatePairingCode(cleanNumber);

        if (result && result.pairingCode) {
            addAllowedChat(chatId);

            const successMsg = `🔑 *YOUR PAIRING CODE!*\n\n` +
                              `╭━━━━━━━━━━━━━━━━━━━━╮\n` +
                              `┃ 🔐 *CODE:* \`${result.pairingCode}\`\n` +
                              `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                              `📌 *HOW TO USE:*\n` +
                              `1️⃣ Open WhatsApp\n` +
                              `2️⃣ Go *Settings* → *Linked Devices*\n` +
                              `3️⃣ Select *Link with Phone Number*\n` +
                              `4️⃣ Enter this code: \`${result.pairingCode}\`\n\n` +
                              `✅ *Bot will connect automatically!*`;

            await sendMessage(chatId, successMsg);

            const ownerId = String(settings.telegram?.ownerId || '').trim();
            if (ownerId && ownerId !== chatId) {
                await sendMessage(ownerId, `🔔 *New Pairing Request*\n👤 Chat ID: \`${chatId}\`\n📱 Number: +${cleanNumber}\n✅ Status: Success`);
            }
        } else {
            await sendMessage(chatId, '❌ *FAILED TO GET CODE!*');
        }
    } catch (error) {
        console.error('Pairing Error:', error);
        await sendMessage(chatId, '❌ *PAIRING FAILED!*\n\nTry again later.');
    } finally {
        setTimeout(() => {
            activePairingSessions.delete(chatId);
        }, 30000);
    }
}

// ============ TELEGRAM DATA MANAGEMENT ============

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

async function removeWebhookIfSet(token) {
    try { const resp = await axios.post(`${TELEGRAM_BASE_URL(token)}/deleteWebhook`); return resp?.data?.ok || false; } 
    catch (err) { return false; }
}

// ============ COMMAND HANDLERS ============

function formatHelpText() {
    return [
        '┏━━━━━━━━━━━━━━━━━━━━┓',
        '┃   *MICKEY GLITCH BOT* ┃',
        '┗━━━━━━━━━━━━━━━━━━━━┛',
        '',
        '🛡️ *PAIRING SYSTEM*',
        '┣ /pair `<number>` ➔ Connect WhatsApp',
        '┗ /unpair ➔ Disconnect this chat',
        '',
        '🤖 *CORE COMMANDS*',
        '┣ /menu, /help ➔ Show all commands',
        '┣ /ping ➔ Check bot status',
        '┣ /alive ➔ System health',
        '┣ /owner ➔ Developer info',
        '',
        '📊 *OWNER COMMANDS*',
        '┣ /stats ➔ RAM, CPU, Uptime',
        '┣ /chats ➔ Paired groups list',
        '┣ /update ➔ Update from GitHub',
        '┗ /exec `<cmd>` ➔ Run terminal command',
        '',
        '🎵 *MEDIA & DOWNLOADS*',
        '┣ /play `<name>` ➔ Download Audio (YT)',
        '┣ /video `<name>` ➔ Download Video (YT)',
        '┣ /shazam ➔ Identify song',
        '┗ /stickertelegram `<link>` ➔ Sticker pack info',
        '',
        '⏳ *Powered by Mickey Developer*'
    ].join('\n');
}

async function handleShazamCommand(chatId, repliedMessage, sendMessage) {
    const token = settings.telegram?.botToken?.trim();
    const media = repliedMessage.audio || repliedMessage.video || repliedMessage.voice;
    if (!media || !media.file_id) return sendMessage(chatId, '❌ *Reply to an audio/video with /shazam*');
    if (!settings.acrcloud || !settings.acrcloud.access_key) return sendMessage(chatId, '❌ *ACRCloud API not configured!*');
    
    await sendMessage(chatId, '🔍 *Identifying song, please wait...*');
    
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
        
        try { await execAsync(`ffmpeg -i "${tempInput}" -vn -acodec pcm_s16le -ar 44100 -ac 2 -t 15 "${tempAudio}" -y`); } 
        catch (e) { fs.writeFileSync(tempAudio, fs.readFileSync(tempInput)); }
        
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
            const caption = `🎵 *SHAZAM IDENTIFIED!*\n━━━━━━━━━━━━━━━━━━━━━━\n📌 *Title:* ${title}\n👤 *Artist:* ${artist}\n━━━━━━━━━━━━━━━━━━━━━━\n\n💡 *Use* /play ${title} *to download*`;
            await sendMessage(chatId, caption);
        } else { 
            await sendMessage(chatId, '❌ *Song not recognized.*'); 
        }
    } catch (err) { 
        await sendMessage(chatId, '❌ Shazam system error.'); 
    }
}

async function handleUpdateCommand(chatId, isActiveOwner, sendMessage) {
    if (!isActiveOwner) return sendMessage(chatId, '🚷 Owner only command!');
    await sendMessage(chatId, '⏳ *Checking for updates from GitHub...*');
    const rawUrl = 'https://raw.githubusercontent.com/Mickeydeveloper/Mickey-Glitch/main/telegram-bot.js';
    try {
        const response = await axios.get(rawUrl, { responseType: 'text' });
        if (response.status === 200 && response.data) {
            fs.writeFileSync(__filename, response.data, 'utf8');
            await sendMessage(chatId, '✅ *Code updated!* Restarting...');
            setTimeout(() => { process.exit(0); }, 2000);
        } else { throw new Error(); }
    } catch (error) { 
        await sendMessage(chatId, `❌ *Update failed.*`); 
    }
}

// ============ PLAY & VIDEO COMMAND HANDLERS ============

async function handlePlayCommand(chatId, query, sendMessage) {
    if (!query) return sendMessage(chatId, '⚠️ *Usage:* `/play song name`\n📌 *Example:* `/play Jux Enjoy`');
    
    await sendMessage(chatId, `🎵 *Searching:* _${query.substring(0, 50)}_...`);
    
    try {
        const searchResult = await yts(query);
        const video = searchResult.videos[0];
        if (!video) return sendMessage(chatId, '❌ *Song not found.*');
        
        // Get audio data
        const audioData = await getYoutubeMp3(video.url);
        
        // Send with ad preview
        await sendTelegramAudioWithPreview(
            chatId, 
            audioData.url, 
            video.title, 
            video.thumbnail, 
            video.timestamp,
            audioData.quality || 'MP3 128kbps'
        );
        
    } catch (err) {
        console.error('[PLAY] Error:', err);
        await sendMessage(chatId, '❌ *Download failed.* Try again later.');
    }
}

async function handleVideoCommand(chatId, query, sendMessage) {
    if (!query) return sendMessage(chatId, '⚠️ *Usage:* `/video video name`\n📌 *Example:* `/video Marioo Mi Amor`');
    
    await sendMessage(chatId, `📹 *Searching:* _${query.substring(0, 50)}_...`);
    
    try {
        const searchResult = await yts(query);
        const video = searchResult.videos[0];
        if (!video) return sendMessage(chatId, '❌ *Video not found.*');
        
        // Get video data
        const videoData = await getYoutubeMp4(video.url);
        
        // Send with ad preview
        await sendTelegramVideoWithPreview(
            chatId,
            videoData.url,
            video.title,
            video.thumbnail,
            video.timestamp,
            videoData.quality || 'HD'
        );
        
    } catch (err) {
        console.error('[VIDEO] Error:', err);
        await sendMessage(chatId, '❌ *Download failed.* Try again later.');
    }
}

// ============ MAIN UPDATE HANDLER ============

async function handleUpdate(update) {
    // Handle callback queries
    if (update.callback_query) {
        const callback = update.callback_query;
        const chatId = callback.message.chat.id;
        const data = callback.data;
        
        if (data.startsWith('play_')) {
            const trackTitle = data.replace('play_', '');
            await handlePlayCommand(chatId, trackTitle, (id, msg) => sendTelegramMessage(id, msg));
        }
        return;
    }

    const message = update.message || update.edited_message;
    if (!message) return;

    const chatId = message.chat?.id;
    const sender = message.from;
    const rawText = String(message.text || '').trim();

    const sendMsg = async (id, txt, extra = {}) => sendTelegramMessage(id, txt, extra);

    // Handle Shazam
    if (rawText.toLowerCase().startsWith('/shazam') || rawText.toLowerCase().startsWith('.shazam')) {
        if (message.reply_to_message) { 
            await handleShazamCommand(chatId, message.reply_to_message, sendMsg); 
        } else { 
            await sendMsg(chatId, '❌ *Reply to an audio/video with /shazam*'); 
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

    // Public commands (no auth needed)
    if (commandText === 'start' || commandText === 'menu' || commandText === 'help') {
        await sendMsg(chatId, formatHelpText());
        return;
    }

    if (commandText === 'pair') {
        await handlePairCommand(chatId, args, sendMsg);
        return;
    }

    if (commandText === 'unpair') {
        if (!isChatAllowed(chatId)) return sendMsg(chatId, 'ℹ️ Chat not paired.');
        removeAllowedChat(chatId);
        return sendMsg(chatId, '✅ Chat unpaired successfully.');
    }

    if (commandText === 'update') {
        await handleUpdateCommand(chatId, isActiveOwner, sendMsg);
        return;
    }

    if (commandText === 'stats') {
        const uptime = Math.floor(process.uptime());
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = uptime % 60;
        const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
        const serverFreeRam = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
        const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);

        const statsText = `📊 *SYSTEM STATS*\n━━━━━━━━━━━━━━━━━━━━━━\n⏱️ *Uptime:* ${hours}h ${minutes}m ${seconds}s\n💾 *RAM:* ${ramUsage} MB\n🖥️ *Server:* ${serverFreeRam}GB / ${totalRam}GB Free\n⚙️ *Platform:* ${os.platform()} (${os.arch()})\n💻 *CPU Cores:* ${os.cpus().length}`;
        return sendMsg(chatId, statsText);
    }

    if (commandText === 'chats') {
        if (!isActiveOwner) return sendMsg(chatId, '🚷 Owner only command.');
        const list = loadAllowedChats();
        if (!list.length) return sendMsg(chatId, 'ℹ️ No paired chats.');
        return sendMsg(chatId, `📝 *PAIRED CHATS (${list.length}):*\n\n` + list.map((id, index) => `${index + 1}. ID: \`${id}\``).join('\n'));
    }

    if (commandText === 'exec') {
        if (!isActiveOwner) return sendMsg(chatId, '🚷 Owner only command!');
        if (!fullArgs) return sendMsg(chatId, '⚠️ Usage: `/exec ls`');
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
        return sendMsg(chatId, '⚠️ Chat not paired. Use `/pair <number>` to start.');
    }

    // Handle other commands
    switch (commandText) {
        case 'ping':
            return sendMsg(chatId, `🏓 *Pong!* Bot is active.\n👤 ${sender?.username || sender?.first_name || 'User'}`);
        
        case 'alive':
            return sendMsg(chatId, `✅ *MICKEY GLITCH BOT* is Active!\n⚙️ Telegram Engine | ✅ All Systems Operational`);
        
        case 'owner':
            return sendMsg(chatId, `👑 *Owner:* ${settings.botOwner || 'Mickey Developer'}\n📱 *WhatsApp:* wa.me/${settings.ownerNumber || '255612130873'}\n📢 *Channel:* t.me/mickeyglitch`);
        
        case 'stickertelegram':
            if (!args.length) return sendMsg(chatId, '⚠️ Usage: `/stickertelegram https://t.me/addstickers/PackName`');
            const url = args[0].trim();
            const match = url.match(/(?:https?:\/\/)?t\.me\/addstickers\/(.+)/i);
            if (!match) return sendMsg(chatId, '❌ Invalid URL.');
            const packName = match[1];
            try {
                const response = await axios.get(`${TELEGRAM_BASE_URL(settings.telegram.botToken)}/getStickerSet`, { params: { name: packName } });
                const stickerSet = response.data.result;
                const stickers = stickerSet.stickers || [];
                const text = `📦 *${stickerSet.title}*\n🆔 *Name:* ${stickerSet.name}\n🧩 *Count:* ${stickers.length}\n\n✨ *Mickey Glitch Bot*`;
                await sendMsg(chatId, text);
            } catch (error) { 
                await sendMsg(chatId, '❌ Failed to get sticker pack.'); 
            }
            return;
        
        case 'play':
            await handlePlayCommand(chatId, fullArgs, sendMsg);
            return;
        
        case 'video':
            await handleVideoCommand(chatId, fullArgs, sendMsg);
            return;
        
        default:
            if (rawText.startsWith('/') || rawText.startsWith('.')) {
                return sendMsg(chatId, `❌ Command '${commandText}' not found.\nUse /menu to see available commands.`);
            }
            return;
    }
}

// ============ START TELEGRAM BOT ============

async function startTelegramBot() {
    const token = settings.telegram?.botToken?.trim();
    if (!token) { 
        console.error('❌ Telegram botToken not found in settings.js'); 
        process.exit(1); 
    }

    ensureTelegramDataFile();
    try { await removeWebhookIfSet(token); } catch (e) {}

    // Notify owner on startup
    const ownerId = String(settings.telegram?.ownerId || '').trim();
    if (ownerId) {
        const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
        const startMsg = `✅ *MICKEY GLITCH BOT STARTED!*\n\n🟢 *Status:* Online