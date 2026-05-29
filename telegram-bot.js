/**
 * TELEGRAM BOT MODULE - MICKEY GLITCH
 * Updated with Full Features & Error Fixes
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const yts = require('yt-search'); 
const os = require('os');
const settings = require('./settings');
const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, delay } = require('@whiskeysockets/baileys');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// ============================================================
// 📁 DIRECTORIES & CONFIGURATION
// ============================================================
const TELEGRAM_DATA_DIR = path.join(__dirname, 'data');
const TELEGRAM_DATA_FILE = path.join(TELEGRAM_DATA_DIR, 'telegramPairs.json');
const TELEGRAM_BASE_URL = (token) => `https://api.telegram.org/bot${token}`;
const TEMP_DIR = path.join(__dirname, 'tmp');

// Store active pairing sessions
const activePairingSessions = new Map();

// Default axios config
const AXIOS_DEFAULTS = {
    timeout: 60000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
};

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// ============================================================
// 🎨 COLORED LOGGING
// ============================================================
const colors = {
    green: (t) => `\x1b[32m${t}\x1b[0m`,
    red: (t) => `\x1b[31m${t}\x1b[0m`,
    yellow: (t) => `\x1b[33m${t}\x1b[0m`,
    blue: (t) => `\x1b[34m${t}\x1b[0m`,
    cyan: (t) => `\x1b[36m${t}\x1b[0m`,
    magenta: (t) => `\x1b[35m${t}\x1b[0m`
};

function logSuccess(text) { console.log(colors.green('✅ ' + text)); }
function logError(text) { console.log(colors.red('❌ ' + text)); }
function logWarning(text) { console.log(colors.yellow('⚠️ ' + text)); }
function logInfo(text) { console.log(colors.blue('ℹ️ ' + text)); }
function logDebug(text) { console.log(colors.cyan('🐛 ' + text)); }

// ============================================================
// 📱 TELEGRAM MEDIA FUNCTIONS WITH AD PREVIEW
// ============================================================

// Send audio with ad preview (externalAdReply style)
async function sendTelegramAudioWithPreview(chatId, audioUrl, title, thumbnailUrl, duration = '', quality = 'MP3 128kbps') {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId) return false;

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
        }, AXIOS_DEFAULTS);

        return true;
    } catch (error) {
        logError(`[AUDIO PREVIEW] ${error.message}`);
        // Fallback: send audio only
        return await sendTelegramMedia(chatId, 'audio', audioUrl, `🎵 ${title}`);
    }
}

// Send video with ad preview
async function sendTelegramVideoWithPreview(chatId, videoUrl, title, thumbnailUrl, duration = '', quality = 'HD') {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId) return false;

    try {
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

        await axios.post(`${TELEGRAM_BASE_URL(token)}/sendPhoto`, {
            chat_id: String(chatId),
            photo: thumbnailUrl,
            caption: caption,
            parse_mode: 'Markdown',
            reply_markup: keyboard
        }, AXIOS_DEFAULTS);

        // Send video file
        await axios.post(`${TELEGRAM_BASE_URL(token)}/sendVideo`, {
            chat_id: String(chatId),
            video: videoUrl,
            caption: `✅ *Video Ready!*\n🎥 ${title.substring(0, 40)}`,
            parse_mode: 'Markdown',
            supports_streaming: true
        }, AXIOS_DEFAULTS);

        return true;
    } catch (error) {
        logError(`[VIDEO PREVIEW] ${error.message}`);
        return await sendTelegramMedia(chatId, 'video', videoUrl, `📹 ${title}`);
    }
}

// Basic send functions
async function sendTelegramMessage(chatId, text, extra = {}) {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId) return false;
    try {
        await axios.post(`${TELEGRAM_BASE_URL(token)}/sendMessage`, {
            chat_id: String(chatId),
            text,
            disable_web_page_preview: true,
            parse_mode: 'Markdown',
            ...extra
        }, AXIOS_DEFAULTS);
        return true;
    } catch (error) {
        logError(`Send message error: ${error.message}`);
        return false;
    }
}

async function sendTelegramPhoto(chatId, photoUrl, caption = '') {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId) return false;
    try {
        await axios.post(`${TELEGRAM_BASE_URL(token)}/sendPhoto`, {
            chat_id: String(chatId),
            photo: photoUrl,
            caption: caption,
            parse_mode: 'Markdown'
        }, AXIOS_DEFAULTS);
        return true;
    } catch (error) {
        logError(`Send photo error: ${error.message}`);
        return false;
    }
}

async function sendTelegramMedia(chatId, type, url, caption = '') {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId) return false;
    const endpoint = type === 'audio' ? 'sendAudio' : 'sendVideo';
    try {
        await axios.post(`${TELEGRAM_BASE_URL(token)}/${endpoint}`, {
            chat_id: String(chatId),
            [type]: url,
            caption: caption,
            parse_mode: 'Markdown'
        }, AXIOS_DEFAULTS);
        return true;
    } catch (error) {
        logError(`Send media error: ${error.message}`);
        await sendTelegramMessage(chatId, `❌ Failed to send ${type}. File may be too large.`);
        return false;
    }
}

// ============================================================
// 🎵 YOUTUBE API FUNCTIONS (NAYAN ONLY)
// ============================================================

async function tryRequest(getter, attempts = 2) {
    let lastErr;
    for (let i = 1; i <= attempts; i++) {
        try { 
            return await getter(); 
        } catch (err) { 
            lastErr = err; 
            if (i < attempts) await new Promise(r => setTimeout(r, 1000 * i));
        }
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
    } else if (ytUrl.includes('youtube.com/shorts/')) {
        videoId = ytUrl.split('shorts/')[1].split('?')[0];
    }
    return videoId;
}

// Get audio from Nayan APIs
async function getYoutubeMp3(ytUrl) {
    const videoId = extractVideoId(ytUrl);
    if (!videoId) throw new Error('Invalid YouTube URL');

    // Try Nayan YouTube API first
    try {
        const apiUrl = `https://nayan-video-downloader.vercel.app/youtube?url=https://youtu.be/${videoId}`;
        const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));

        if (res.data?.status === true && res.data?.data?.data?.formats) {
            const formats = res.data.data.data.formats;
            const title = res.data.data.data.title;
            const thumbnail = res.data.data.data.thumbnail;

            let bestAudio = null;
            let bestPriority = 0;
            const audioPriority = { '251': 100, '250': 90, '249': 85, '140': 80, '139': 70 };

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
        logDebug(`YouTube API audio failed: ${err.message}`);
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
                    quality: 'MP3',
                    source: 'Nayan AllDown'
                };
            }
        }
    } catch (err) {
        logDebug(`AllDown audio failed: ${err.message}`);
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
                    quality: 'HD',
                    source: 'Nayan AllDown'
                };
            }
        }
    } catch (err) {
        logDebug(`AllDown video failed: ${err.message}`);
    }

    // Fallback to Nayan YouTube API
    try {
        const apiUrl = `https://nayan-video-downloader.vercel.app/youtube?url=https://youtu.be/${videoId}`;
        const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));

        if (res.data?.status === true && res.data?.data?.data?.formats) {
            const formats = res.data.data.data.formats;
            const title = res.data.data.data.title;
            const thumbnail = res.data.data.data.thumbnail;

            let bestVideo = null;
            let bestQuality = 0;
            const qualityPriority = { '2160p': 100, '1440p': 90, '1080p': 80, '720p': 70, '480p': 60, '360p': 50 };

            for (const format of formats) {
                if (format.type === 'video_with_audio' || format.type === 'video_only') {
                    let quality = format.quality || format.label || '';
                    let priority = 0;
                    for (const [q, p] of Object.entries(qualityPriority)) {
                        if (quality.includes(q)) { priority = p; break; }
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
        logDebug(`YouTube API video failed: ${err.message}`);
    }

    throw new Error('All video APIs failed');
}

// ============================================================
// 🔐 PAIRING FUNCTIONS
// ============================================================

async function generatePairingCode(phoneNumber) {
    try {
        const { version, isLatest } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState(`./pairing-${phoneNumber}`);

        const sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            browser: ['Mickey Glitch', 'Chrome', '120.0.0.0'],
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000
        });

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                sock.end(new Error('Timeout'));
                reject(new Error('Pairing timeout after 60 seconds'));
            }, 60000);

            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, pairingCode } = update;

                if (pairingCode) {
                    clearTimeout(timeout);
                    await delay(1000);
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
        logError(`Pairing Error: ${error.message}`);
        await sendMessage(chatId, '❌ *PAIRING FAILED!*\n\nPlease try again later.');
    } finally {
        setTimeout(() => {
            activePairingSessions.delete(chatId);
        }, 30000);
    }
}

// ============================================================
// 📊 TELEGRAM DATA MANAGEMENT
// ============================================================

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
    } catch (error) { 
        logError(`Load allowed chats error: ${error.message}`);
        return []; 
    }
}

function saveAllowedChats(chats) {
    const unique = Array.from(new Set(chats.map(id => String(id))));
    fs.writeFileSync(TELEGRAM_DATA_FILE, JSON.stringify(unique, null, 2), 'utf8');
}

function isChatAllowed(chatId) { 
    return loadAllowedChats().includes(String(chatId)); 
}

function addAllowedChat(chatId) {
    const allowed = loadAllowedChats();
    if (!allowed.includes(String(chatId))) { 
        allowed.push(String(chatId)); 
        saveAllowedChats(allowed); 
        logSuccess(`Chat paired: ${chatId}`);
    }
}

function removeAllowedChat(chatId) {
    const allowed = loadAllowedChats().filter(id => id !== String(chatId)); 
    saveAllowedChats(allowed);
    logInfo(`Chat unpaired: ${chatId}`);
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
    try { 
        const resp = await axios.post(`${TELEGRAM_BASE_URL(token)}/deleteWebhook`, {}, AXIOS_DEFAULTS); 
        return resp?.data?.ok || false; 
    } catch (err) { 
        return false; 
    }
}

// ============================================================
// 📝 COMMAND HANDLERS
// ============================================================

function formatHelpText() {
    return `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃      *MICKEY GLITCH BOT*        ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🛡️ *PAIRING SYSTEM*
┣ /pair <number> ➔ Connect WhatsApp
┣ /unpair ➔ Disconnect this chat
┗ /check ➔ Check pairing status

🤖 *CORE COMMANDS*
┣ /menu, /help ➔ Show all commands
┣ /ping ➔ Check bot status
┣ /alive ➔ System health
┣ /owner ➔ Developer info
┣ /stats ➔ RAM, CPU, Uptime

🎵 *MEDIA & DOWNLOADS*
┣ /play <song> ➔ Download Audio (YT)
┣ /video <query> ➔ Download Video (YT)
┣ /shazam ➔ Identify song (reply to audio)
┗ /stickertelegram <link> ➔ Sticker info

👑 *OWNER COMMANDS*
┣ /chats ➔ Paired groups list
┣ /update ➔ Update from GitHub
┣ /exec <cmd> ➔ Run terminal command
┗ /broadcast <msg> ➔ Send to all chats

⏳ *Powered by Mickey Developer*`;
}

// ============================================================
// 🎵 PLAY & VIDEO COMMAND HANDLERS
// ============================================================

async function handlePlayCommand(chatId, query, sendMessage) {
    if (!query) return sendMessage(chatId, '⚠️ *Usage:* `/play song name`\n📌 *Example:* `/play Jux Enjoy`');

    await sendMessage(chatId, `🎵 *Searching:* _${query.substring(0, 50)}_...`);

    try {
        const searchResult = await yts(query);
        const video = searchResult.videos[0];
        if (!video) return sendMessage(chatId, '❌ *Song not found.*');

        const audioData = await getYoutubeMp3(video.url);
        
        await sendTelegramAudioWithPreview(
            chatId, 
            audioData.url, 
            video.title, 
            video.thumbnail, 
            video.timestamp,
            audioData.quality || 'MP3 128kbps'
        );
    } catch (err) {
        logError(`[PLAY] ${err.message}`);
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

        const videoData = await getYoutubeMp4(video.url);
        
        await sendTelegramVideoWithPreview(
            chatId,
            videoData.url,
            video.title,
            video.thumbnail,
            video.timestamp,
            videoData.quality || 'HD'
        );
    } catch (err) {
        logError(`[VIDEO] ${err.message}`);
        await sendMessage(chatId, '❌ *Download failed.* Try again later.');
    }
}

// ============================================================
// 🎤 SHAZAM COMMAND
// ============================================================

async function handleShazamCommand(chatId, repliedMessage, sendMessage) {
    const token = settings.telegram?.botToken?.trim();
    const media = repliedMessage.audio || repliedMessage.video || repliedMessage.voice;
    
    if (!media || !media.file_id) {
        return sendMessage(chatId, '❌ *Reply to an audio/video with /shazam*');
    }
    
    if (!settings.acrcloud || !settings.acrcloud.access_key) {
        return sendMessage(chatId, '❌ *ACRCloud API not configured!*');
    }

    await sendMessage(chatId, '🔍 *Identifying song, please wait...*');

    try {
        const fileRes = await axios.get(`${TELEGRAM_BASE_URL(token)}/getFile?file_id=${media.file_id}`, AXIOS_DEFAULTS);
        const filePath = fileRes.data.result.file_path;
        const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
        const responseBuffer = await axios.get(fileUrl, { responseType: 'arraybuffer', ...AXIOS_DEFAULTS });
        const mediaBuffer = Buffer.from(responseBuffer.data);

        const tempInput = path.join(TEMP_DIR, `shazam_in_${Date.now()}`);
        const tempAudio = path.join(TEMP_DIR, `shazam_out_${Date.now()}.wav`);
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

        // Cleanup temp files
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
        logError(`Shazam error: ${err.message}`);
        await sendMessage(chatId, '❌ *Shazam system error.*'); 
    }
}

// ============================================================
// 🔄 UPDATE & BROADCAST COMMANDS
// ============================================================

async function handleUpdateCommand(chatId, isActiveOwner, sendMessage) {
    if (!isActiveOwner) return sendMessage(chatId, '🚷 Owner only command!');
    
    await sendMessage(chatId, '⏳ *Checking for updates from GitHub...*');
    const rawUrl = 'https://raw.githubusercontent.com/Mickeydeveloper/Mickey-Glitch/main/telegram-bot.js';
    
    try {
        const response = await axios.get(rawUrl, { responseType: 'text', ...AXIOS_DEFAULTS });
        if (response.status === 200 && response.data) {
            fs.writeFileSync(__filename, response.data, 'utf8');
            await sendMessage(chatId, '✅ *Code updated!* Restarting...');
            setTimeout(() => { process.exit(0); }, 2000);
        } else { throw new Error(); }
    } catch (error) { 
        await sendMessage(chatId, `❌ *Update failed.*`); 
    }
}

async function handleBroadcastCommand(chatId, isActiveOwner, message, sendMessage) {
    if (!isActiveOwner) return sendMessage(chatId, '🚷 Owner only command!');
    
    const broadcastMsg = message.substring(message.indexOf(' ') + 1);
    if (!broadcastMsg) return sendMessage(chatId, '⚠️ Usage: `/broadcast message`');
    
    const chats = loadAllowedChats();
    let success = 0;
    
    for (const chat of chats) {
        if (await sendMessage(chat, `📢 *BROADCAST*\n\n${broadcastMsg}`)) success++;
        await delay(100);
    }
    
    await sendMessage(chatId, `✅ *Broadcast sent to ${success}/${chats.length} chats*`);
}

// ============================================================
// 🚀 MAIN UPDATE HANDLER
// ============================================================

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
        
        // Answer callback
        const token = settings.telegram?.botToken?.trim();
        if (token) {
            try {
                await axios.post(`${TELEGRAM_BASE_URL(token)}/answerCallbackQuery`, {
                    callback_query_id: callback.id
                }, AXIOS_DEFAULTS);
            } catch(e) {}
        }
        return;
    }

    const message = update.message || update.edited_message;
    if (!message) return;

    const chatId = message.chat?.id;
    const sender = message.from;
    const rawText = String(message.text || '').trim();

    const sendMsg = async (id, txt, extra = {}) => sendTelegramMessage(id, txt, extra);

    // Handle Shazam (reply to media)
    if (rawText.toLowerCase() === '/shazam' || rawText.toLowerCase() === '.shazam') {
        if (message.reply_to_message) { 
            await handleShazamCommand(chatId, message.reply_to_message, sendMsg); 
        } else { 
            await sendMsg(chatId, '❌ *Reply to an audio/video with /shazam*'); 
        }
        return;
    }

    // Handle commands that don't need auth
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

    if (commandText === 'ping') {
        return sendMsg(chatId, `🏓 *Pong!* Bot is active.\n⏱️ Latency: ${Date.now() - message.date * 1000}ms`);
    }

    if (commandText === 'alive') {
        const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
        return sendMsg(chatId, `✅ *MICKEY GLITCH BOT* is Active!\n💾 RAM: ${ramUsage} MB\n⚙️ Telegram Engine | All Systems Operational`);
    }

    if (commandText === 'owner') {
        return sendMsg(chatId, `👑 *Owner:* ${settings.botOwner || 'Mickey Developer'}\n📱 *WhatsApp:* wa.me/${settings.ownerNumber || '255612130873'}\n📢 *Channel:* t.me/mickeyglitch`);
    }

    // Commands that need auth
    if (!allowed) {
        return sendMsg(chatId, '⚠️ *Chat not paired!*\n\nPlease use `/pair <number>` to connect your WhatsApp.');
    }

    switch (commandText) {
        case 'unpair':
            if (!isChatAllowed(chatId)) return sendMsg(chatId, 'ℹ️ Chat not paired.');
            removeAllowedChat(chatId);
            return sendMsg(chatId, '✅ Chat unpaired successfully.');

        case 'check':
            const isPaired = isChatAllowed(chatId);
            return sendMsg(chatId, isPaired ? '✅ *Chat is paired!*' : '❌ *Chat is not paired.*');

        case 'stats':
            const uptime = Math.floor(process.uptime());
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = uptime % 60;
            const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
            const serverFreeRam = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
            const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
            const pairedChats = loadAllowedChats().length;

            const statsText = `📊 *SYSTEM STATS*\n━━━━━━━━━━━━━━━━━━━━━━\n⏱️ *Uptime:* ${hours}h ${minutes}m ${seconds}s\n💾 *RAM:* ${ramUsage} MB\n🖥️ *Server:* ${serverFreeRam}GB / ${totalRam}GB Free\n💻 *Platform:* ${os.platform()} (${os.arch()})\n👥 *Paired Chats:* ${pairedChats}`;
            return sendMsg(chatId, statsText);

        case 'ch