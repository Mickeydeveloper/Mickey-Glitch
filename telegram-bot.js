/**
 * TELEGRAM BOT MODULE - MICKEY GLITCH
 * Fixed: Audio playback, Chart display, and Menu
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const yts = require('yt-search');
const os = require('os');
const settings = require('./settings');
const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, delay } = require('@whiskeysockets/baileys');

// ============================================================
// 📁 DIRECTORIES & CONFIGURATION
// ============================================================
const TELEGRAM_DATA_DIR = path.join(__dirname, 'data');
const TELEGRAM_DATA_FILE = path.join(TELEGRAM_DATA_DIR, 'telegramPairs.json');
const TELEGRAM_BASE_URL = (token) => `https://api.telegram.org/bot${token}`;
const TEMP_DIR = path.join(__dirname, 'tmp');
const COMMANDS_DIR = path.join(__dirname, 'commands');

// Store active pairing sessions
const activePairingSessions = new Map();
const whatsappCommands = new Map();

// Default axios config
const AXIOS_DEFAULTS = {
    timeout: 120000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
    }
};

// Ensure directories exist
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
if (!fs.existsSync(COMMANDS_DIR)) fs.mkdirSync(COMMANDS_DIR, { recursive: true });

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
// 🛠️ TELEGRAM SOCK
// ============================================================

function createTelegramSock(chatId, messageId) {
    return {
        sendMessage: async (jid, content, options = {}) => {
            try {
                const id = String(jid);
                if (!content || typeof content !== 'object') {
                    throw new Error('Invalid content format');
                }
                
                if (content.text) {
                    return await sendTelegramMessage(id, content.text, {}, messageId);
                } else if (content.image) {
                    const url = content.image.url || content.image;
                    if (!url) throw new Error('Image URL missing');
                    return await sendTelegramPhoto(id, url, content.caption || '', messageId);
                } else if (content.audio) {
                    const url = content.audio.url || content.audio;
                    if (!url) throw new Error('Audio URL missing');
                    return await sendTelegramAudio(id, url, content.caption || '', messageId);
                } else if (content.video) {
                    const url = content.video.url || content.video;
                    if (!url) throw new Error('Video URL missing');
                    return await sendTelegramVideo(id, url, content.caption || '', messageId);
                } else {
                    const text = typeof content === 'string' ? content : JSON.stringify(content);
                    return await sendTelegramMessage(id, text.substring(0, 4000), {}, messageId);
                }
            } catch (error) {
                logError(`[Sock.sendMessage] Error: ${error.message}`);
                try {
                    await sendTelegramMessage(String(jid), `❌ *Error:* ${error.message.substring(0, 200)}`, {}, messageId);
                } catch (e) {}
                return false;
            }
        },
        sendMessageAck: async () => true,
        react: async (jid, { text }) => {
            try {
                return await sendTelegramMessage(String(jid), text, {}, messageId);
            } catch (error) {
                return false;
            }
        },
        sendPresenceUpdate: async () => true,
        readMessages: async () => true,
        updateMessage: async () => true,
        logger: {
            info: logInfo,
            error: logError,
            warn: logWarning,
            debug: logDebug
        }
    };
}

// ============================================================
// 📁 COMMAND LOADER
// ============================================================

function loadWhatsappCommands() {
    if (!fs.existsSync(COMMANDS_DIR)) {
        fs.mkdirSync(COMMANDS_DIR, { recursive: true });
        return;
    }

    const files = fs.readdirSync(COMMANDS_DIR).filter(f => f.endsWith('.js'));
    whatsappCommands.clear();
    
    for (const file of files) {
        try {
            const baseName = file.replace('.js', '');
            const filePath = path.join(COMMANDS_DIR, file);
            
            delete require.cache[require.resolve(filePath)];
            const cmdModule = require(filePath);
            
            let commandName = null;
            let commandFunction = null;
            
            if (typeof cmdModule === 'function') {
                commandName = baseName;
                commandFunction = cmdModule;
            } else if (cmdModule && typeof cmdModule === 'object') {
                if (cmdModule.name && typeof cmdModule.execute === 'function') {
                    commandName = cmdModule.name;
                    commandFunction = cmdModule.execute;
                } else if (typeof cmdModule.execute === 'function') {
                    commandName = baseName;
                    commandFunction = cmdModule.execute;
                } else if (cmdModule.default && typeof cmdModule.default === 'function') {
                    commandName = baseName;
                    commandFunction = cmdModule.default;
                } else {
                    commandName = baseName;
                    commandFunction = cmdModule;
                }
            }
            
            if (commandName && typeof commandFunction === 'function') {
                whatsappCommands.set(commandName, commandFunction);
                logDebug(`Loaded command: ${commandName}`);
            }
        } catch (e) {
            logError(`Failed to load ${file}: ${e.message}`);
        }
    }
    logSuccess(`Loaded ${whatsappCommands.size} commands from /commands folder`);
}

// ============================================================
// 📱 TELEGRAM MEDIA FUNCTIONS
// ============================================================

async function sendTelegramMessage(chatId, text, extra = {}, messageId = null) {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId) return false;
    
    try {
        const safeText = String(text || '').substring(0, 4096);
        if (!safeText) return false;
        
        const response = await axios.post(`${TELEGRAM_BASE_URL(token)}/sendMessage`, {
            chat_id: String(chatId),
            text: safeText,
            disable_web_page_preview: true,
            parse_mode: 'Markdown',
            reply_to_message_id: messageId,
            ...extra
        }, {
            ...AXIOS_DEFAULTS,
            timeout: 30000
        });
        
        return response?.data?.ok !== false;
    } catch (error) {
        logError(`Send message error: ${error.message}`);
        return false;
    }
}

async function sendTelegramPhoto(chatId, photoUrl, caption = '', messageId = null) {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId || !photoUrl) return false;
    
    try {
        const response = await axios.post(`${TELEGRAM_BASE_URL(token)}/sendPhoto`, {
            chat_id: String(chatId),
            photo: photoUrl,
            caption: caption.substring(0, 1024),
            parse_mode: 'Markdown',
            reply_to_message_id: messageId
        }, {
            ...AXIOS_DEFAULTS,
            timeout: 60000
        });
        return response?.data?.ok !== false;
    } catch (error) {
        logError(`Send photo error: ${error.message}`);
        return false;
    }
}

async function sendTelegramAudio(chatId, audioUrl, caption = '', messageId = null) {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId || !audioUrl) {
        logError('Missing token, chatId, or audioUrl');
        return false;
    }
    
    try {
        logDebug(`Sending audio to ${chatId}: ${audioUrl.substring(0, 100)}...`);
        
        const response = await axios.post(`${TELEGRAM_BASE_URL(token)}/sendAudio`, {
            chat_id: String(chatId),
            audio: audioUrl,
            caption: caption.substring(0, 1024),
            parse_mode: 'Markdown',
            reply_to_message_id: messageId,
            supports_streaming: true,
            duration: 0 // Auto-detect duration
        }, {
            ...AXIOS_DEFAULTS,
            timeout: 180000, // 3 minutes for audio
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
        
        if (response?.data?.ok === true) {
            logSuccess(`Audio sent successfully to ${chatId}`);
            return true;
        } else {
            logError(`Audio send failed: ${response?.data?.description || 'Unknown error'}`);
            return false;
        }
    } catch (error) {
        logError(`Send audio error: ${error.message}`);
        if (error.response) {
            logError(`Response status: ${error.response.status}`);
            logError(`Response data: ${JSON.stringify(error.response.data)}`);
        }
        
        // Try sending as document if audio fails
        try {
            logDebug('Trying to send as document...');
            const response = await axios.post(`${TELEGRAM_BASE_URL(token)}/sendDocument`, {
                chat_id: String(chatId),
                document: audioUrl,
                caption: `🎵 *Audio file*\n${caption.substring(0, 200)}`,
                parse_mode: 'Markdown',
                reply_to_message_id: messageId
            }, {
                ...AXIOS_DEFAULTS,
                timeout: 180000
            });
            return response?.data?.ok !== false;
        } catch (e) {
            logError(`Document fallback error: ${e.message}`);
        }
        
        // Final fallback: send link
        try {
            await sendTelegramMessage(chatId, `🎵 *Audio Link:* ${audioUrl}\n\n${caption}`, {}, messageId);
            return true;
        } catch (e) {
            logError(`Link fallback error: ${e.message}`);
        }
        
        return false;
    }
}

async function sendTelegramVideo(chatId, videoUrl, caption = '', messageId = null) {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId || !videoUrl) return false;
    
    try {
        const response = await axios.post(`${TELEGRAM_BASE_URL(token)}/sendVideo`, {
            chat_id: String(chatId),
            video: videoUrl,
            caption: caption.substring(0, 1024),
            parse_mode: 'Markdown',
            reply_to_message_id: messageId,
            supports_streaming: true
        }, {
            ...AXIOS_DEFAULTS,
            timeout: 180000
        });
        return response?.data?.ok !== false;
    } catch (error) {
        logError(`Send video error: ${error.message}`);
        return false;
    }
}

// ============================================================
// 🎵 YOUTUBE FUNCTIONS
// ============================================================

function extractVideoId(ytUrl) {
    let videoId = '';
    if (ytUrl.includes('youtu.be/')) {
        videoId = ytUrl.split('youtu.be/')[1].split('?')[0];
    } else if (ytUrl.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(ytUrl.split('?')[1]);
        videoId = urlParams.get('v');
    } else if (ytUrl.includes('youtube.com/shorts/')) {
        videoId = ytUrl.split('shorts/')[1].split('?')[0];
    } else if (ytUrl.includes('youtube.com/embed/')) {
        videoId = ytUrl.split('embed/')[1].split('?')[0];
    }
    return videoId;
}

async function tryRequest(getter, attempts = 3) {
    let lastErr;
    for (let i = 1; i <= attempts; i++) {
        try { 
            return await getter(); 
        } catch (err) { 
            lastErr = err; 
            logDebug(`Attempt ${i}/${attempts} failed: ${err.message}`);
            if (i < attempts) await new Promise(r => setTimeout(r, 2000 * i));
        }
    }
    throw lastErr;
}

async function getYoutubeAudio(ytUrl) {
    const videoId = extractVideoId(ytUrl);
    if (!videoId) {
        // Try to search for the query
        return await searchYoutubeAudio(ytUrl);
    }

    // Try multiple APIs
    const apis = [
        async () => {
            const apiUrl = `https://nayan-video-downloader.vercel.app/youtube?url=https://youtu.be/${videoId}`;
            const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
            
            if (res.data?.status === true && res.data?.data?.data?.formats) {
                const formats = res.data.data.data.formats;
                const title = res.data.data.data.title || 'Unknown Title';
                const thumbnail = res.data.data.data.thumbnail || '';
                
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
                        quality: bestAudio.quality || 'MP3',
                        duration: bestAudio.duration || '0'
                    };
                }
            }
            throw new Error('No audio found in Nayan API');
        },
        async () => {
            const apiUrl = `https://nayan-video-downloader.vercel.app/alldown?url=https://youtu.be/${videoId}`;
            const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
            
            if (res.data?.status === true && res.data?.data) {
                const videoData = res.data.data;
                const videoUrl = videoData.high || videoData.low;
                if (videoUrl) {
                    return {
                        url: videoUrl,
                        title: videoData.title || 'Unknown Title',
                        thumbnail: videoData.thumbnail || '',
                        quality: 'MP3',
                        duration: videoData.duration || '0'
                    };
                }
            }
            throw new Error('No audio found in AllDown API');
        },
        async () => {
            // Try alternative API
            const apiUrl = `https://api.vevioz.com/api/button/mp3/${videoId}`;
            const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
            
            if (res.data?.success && res.data?.download) {
                return {
                    url: res.data.download,
                    title: res.data.title || 'Unknown Title',
                    thumbnail: res.data.thumbnail || '',
                    quality: 'MP3',
                    duration: res.data.duration || '0'
                };
            }
            throw new Error('No audio found in Vevioz API');
        }
    ];
    
    let lastError;
    for (const api of apis) {
        try {
            const result = await api();
            if (result?.url) {
                logDebug(`Audio found via ${api.name || 'API'}`);
                return result;
            }
        } catch (err) {
            lastError = err;
            logDebug(`API ${api.name || 'unknown'} failed: ${err.message}`);
            continue;
        }
    }
    
    // If all APIs fail, try search
    return await searchYoutubeAudio(ytUrl);
}

async function searchYoutubeAudio(query) {
    try {
        logDebug(`Searching YouTube for: ${query}`);
        const searchResult = await yts(query);
        const videos = searchResult.videos;
        
        if (!videos || videos.length === 0) {
            throw new Error('No results found');
        }
        
        const video = videos[0];
        if (!video) {
            throw new Error('No video found');
        }
        
        return await getYoutubeAudio(video.url);
    } catch (error) {
        throw new Error(`Search failed: ${error.message}`);
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
        return []; 
    }
}

function saveAllowedChats(chats) {
    try {
        const unique = Array.from(new Set(chats.map(id => String(id))));
        fs.writeFileSync(TELEGRAM_DATA_FILE, JSON.stringify(unique, null, 2), 'utf8');
    } catch (error) {
        logError(`Save allowed chats error: ${error.message}`);
    }
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
// 🔐 PAIRING FUNCTIONS
// ============================================================

async function generatePairingCode(phoneNumber) {
    try {
        const { version } = await fetchLatestBaileysVersion();
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
        await sendMessage(chatId, `❌ *PAIRING FAILED!*\n\n${error.message}\n\nPlease try again later.`);
    } finally {
        setTimeout(() => {
            activePairingSessions.delete(chatId);
        }, 30000);
    }
}

// ============================================================
// 🎵 PLAY COMMAND - FIXED AUDIO
// ============================================================

async function handlePlayCommand(chatId, query, sendMessage, messageId = null) {
    if (!query) {
        return sendMessage(chatId, '⚠️ *Usage:* `/play song name or URL`\n📌 *Example:* `/play Jux Enjoy`\n🎵 *Or:* `/play chart` - Show top chart songs');
    }

    // Check for chart
    if (query.toLowerCase().includes('chart') || query.toLowerCase().includes('top')) {
        return await showChart(chatId, sendMessage);
    }

    await sendMessage(chatId, `🎵 *Searching:* _${query.substring(0, 50)}_...`);

    try {
        let audioData;
        let videoInfo = null;
        
        // Check if it's a URL
        if (query.includes('youtube.com') || query.includes('youtu.be')) {
            audioData = await getYoutubeAudio(query);
            if (audioData) {
                // Get video info for display
                const videoId = extractVideoId(query);
                if (videoId) {
                    try {
                        const searchResult = await yts(`https://youtu.be/${videoId}`);
                        if (searchResult && searchResult.videos && searchResult.videos.length > 0) {
                            videoInfo = searchResult.videos[0];
                        }
                    } catch (e) {}
                }
            }
        } else {
            // Search for the song
            const searchResult = await yts(query);
            const videos = searchResult.videos;
            
            if (!videos || videos.length === 0) {
                return sendMessage(chatId, '❌ *No results found.*');
            }
            
            const video = videos[0];
            videoInfo = video;
            audioData = await getYoutubeAudio(video.url);
        }
        
        if (!audioData || !audioData.url) {
            throw new Error('Failed to get audio');
        }
        
        const title = videoInfo?.title || audioData.title || 'Unknown Title';
        const artist = videoInfo?.author?.name || 'Unknown Artist';
        const duration = videoInfo?.timestamp || audioData.duration || 'Unknown';
        const thumbnail = videoInfo?.thumbnail || audioData.thumbnail || '';
        
        // Create caption
        const caption = `🎵 *${title.substring(0, 60)}*\n` +
                       `🎤 *Artist:* ${artist}\n` +
                       `⏱️ *Duration:* ${duration}\n` +
                       `🎚️ *Quality:* ${audioData.quality || 'MP3'}\n\n` +
                       `⚡ *Mickey Glitch Bot*`;
        
        // Send audio
        logDebug(`Sending audio: ${audioData.url.substring(0, 100)}...`);
        const audioSent = await sendTelegramAudio(chatId, audioData.url, caption, messageId);
        
        if (audioSent) {
            // Send success message
            await sendMessage(chatId, `✅ *Audio sent successfully!*\n\n🎵 *${title}*\n⏱️ Duration: ${duration}`);
        } else {
            // Try sending as document if audio fails
            logDebug('Audio send failed, trying document...');
            const docSent = await sendTelegramDocument(chatId, audioData.url, caption, messageId);
            if (!docSent) {
                // Final fallback: send link
                await sendMessage(chatId, `✅ *Audio ready!*\n\n🎵 *${title}*\n📥 *Download:* ${audioData.url}\n\nℹ️ Click the link to download the audio.`);
            }
        }
        
    } catch (err) {
        logError(`[PLAY] ${err.message}`);
        await sendMessage(chatId, `❌ *Download failed.*\n\n📛 ${err.message}\n\n💡 Tip: Try using a different song name or URL`);
    }
}

// ============================================================
// 📊 CHART FUNCTION
// ============================================================

async function showChart(chatId, sendMessage) {
    try {
        await sendMessage(chatId, '📊 *Loading top chart songs...*');
        
        // Search for trending songs
        const searchResult = await yts('top trending songs 2026 official');
        let videos = searchResult.videos;
        
        if (!videos || videos.length === 0) {
            // Try alternative search
            const altResult = await yts('popular songs 2026');
            videos = altResult.videos;
        }
        
        if (!videos || videos.length === 0) {
            return sendMessage(chatId, '❌ *No chart songs found.*');
        }
        
        // Get top 10 songs
        videos = videos.slice(0, 10);
        
        let chartMsg = `📊 *TOP CHART SONGS*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        videos.forEach((v, i) => {
            const num = i + 1;
            const views = v.views ? `👁️ ${v.views}` : '';
            chartMsg += `${num}. *${v.title.substring(0, 40)}*\n`;
            chartMsg += `   🎤 ${v.author.name}\n`;
            chartMsg += `   ⏱️ ${v.timestamp || 'Unknown'} ${views ? `| ${views}` : ''}\n\n`;
        });
        
        chartMsg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        chartMsg += `💡 *To play:* /play [song name]\n`;
        chartMsg += `💡 *Example:* /play ${videos[0]?.title?.substring(0, 30) || 'song'}`;
        
        await sendMessage(chatId, chartMsg);
        
    } catch (error) {
        logError(`[CHART] ${error.message}`);
        await sendMessage(chatId, '❌ *Failed to load chart.* Please try again later.');
    }
}

// ============================================================
// 📝 INTERNAL COMMANDS - FIXED MENU
// ============================================================

function formatHelpText() {
    // Get internal commands
    const internalCommands = [
        '/pair <number> - Connect WhatsApp',
        '/unpair - Disconnect this chat',
        '/check - Check pairing status',
        '/play <song/URL> - Play audio from YouTube',
        '/play chart - Show top chart songs',
        '/help, /menu - Show this menu',
        '/ping - Check bot status',
        '/alive - System health',
        '/owner - Developer info',
        '/stats - RAM, CPU, Uptime'
    ];
    
    // Get commands from folder
    const externalCommands = [];
    for (const [name] of whatsappCommands) {
        externalCommands.push(`/${name}`);
    }
    
    const totalCommands = internalCommands.length + externalCommands.length;
    
    let helpText = `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n`;
    helpText += `┃      *MICKEY GLITCH BOT*        ┃\n`;
    helpText += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n`;
    
    helpText += `🛡️ *PAIRING SYSTEM*\n`;
    helpText += `┣ /pair <number> ➔ Connect WhatsApp\n`;
    helpText += `┣ /unpair ➔ Disconnect this chat\n`;
    helpText += `┗ /check ➔ Check pairing status\n\n`;
    
    helpText += `🎵 *MUSIC & MEDIA*\n`;
    helpText += `┣ /play <song> ➔ Play audio from YouTube\n`;
    helpText += `┣ /play chart ➔ Show top chart songs\n`;
    helpText += `┗ /play <URL> ➔ Play from YouTube URL\n\n`;
    
    helpText += `🤖 *CORE COMMANDS*\n`;
    helpText += `┣ /help, /menu ➔ Show this menu\n`;
    helpText += `┣ /ping ➔ Check bot status\n`;
    helpText += `┣ /alive ➔ System health\n`;
    helpText += `┣ /owner ➔ Developer info\n`;
    helpText += `┗ /stats ➔ RAM, CPU, Uptime\n\n`;
    
    // Show external commands if any
    if (externalCommands.length > 0) {
        helpText += `📂 *ADDITIONAL COMMANDS*\n`;
        const displayCmds = externalCommands.slice(0, 15);
        displayCmds.forEach(cmd => {
            helpText += `┣ ${cmd}\n`;
        });
        if (externalCommands.length > 15) {
            helpText += `┗ ... and ${externalCommands.length - 15} more\n`;
        }
        helpText += `\n`;
    }
    
    helpText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    helpText += `📊 *Total:* ${totalCommands} commands available\n`;
    helpText += `⚡ *Powered by Mickey Developer*`;
    
    return helpText;
}

// ============================================================
// 🚀 MAIN UPDATE HANDLER
// ============================================================

async function handleUpdate(update) {
    try {
        // Handle callback queries
        if (update.callback_query) {
            const callback = update.callback_query;
            const chatId = callback.message?.chat?.id;
            if (!chatId) return;
            
            try {
                const token = settings.telegram?.botToken?.trim();
                if (token) {
                    await axios.post(`${TELEGRAM_BASE_URL(token)}/answerCallbackQuery`, {
                        callback_query_id: callback.id
                    }, AXIOS_DEFAULTS);
                }
            } catch (e) {}
            return;
        }

        const message = update.message || update.edited_message;
        if (!message) return;

        const chatId = message.chat?.id;
        const messageId = message.message_id;
        const sender = message.from;
        const rawText = String(message.text || '').trim();

        if (!chatId || !sender) return;

        const sendMsg = async (id, txt, extra = {}, msgId = messageId) => {
            try {
                return await sendTelegramMessage(id, txt, extra, msgId);
            } catch (error) {
                return false;
            }
        };

        // Only process commands
        if (!rawText.startsWith('/') && !rawText.startsWith('.')) return;

        const cleanText = rawText.substring(1);
        const parts = cleanText.split(/\s+/);
        const commandText = parts[0].toLowerCase();
        const args = parts.slice(1);
        const fullArgs = args.join(' ');

        const allowed = isTelegramAuthorized(chatId);
        const isActiveOwner = isOwnerChat(chatId);

        // ============================================================
        // 📝 INTERNAL COMMANDS
        // ============================================================
        
        // Pair Command
        if (commandText === 'pair') {
            await handlePairCommand(chatId, args, sendMsg);
            return;
        }

        // Unpair
        if (commandText === 'unpair') {
            if (!isChatAllowed(chatId)) return sendMsg(chatId, 'ℹ️ Chat not paired.');
            removeAllowedChat(chatId);
            return sendMsg(chatId, '✅ Chat unpaired successfully.');
        }

        // Check
        if (commandText === 'check') {
            const isPaired = isChatAllowed(chatId);
            return sendMsg(chatId, isPaired ? '✅ *Chat is paired!*' : '❌ *Chat is not paired.*');
        }

        // Help / Menu - FIXED
        if (commandText === 'start' || commandText === 'menu' || commandText === 'help') {
            await sendMsg(chatId, formatHelpText());
            return;
        }

        // Ping
        if (commandText === 'ping') {
            const startTime = Date.now();
            await sendMsg(chatId, '🏓 *Pong!*');
            const latency = Date.now() - startTime;
            await sendMsg(chatId, `⏱️ *Latency:* ${latency}ms\n✅ *Status:* Online`);
            return;
        }

        // Alive
        if (commandText === 'alive') {
            const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
            const uptime = Math.floor(process.uptime());
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = uptime % 60;
            const pairedChats = loadAllowedChats().length;
            
            const aliveMsg = `✅ *MICKEY GLITCH BOT - ONLINE!*\n\n` +
                            `⏱️ *Uptime:* ${hours}h ${minutes}m ${seconds}s\n` +
                            `💾 *RAM:* ${ramUsage} MB\n` +
                            `👥 *Paired Chats:* ${pairedChats}\n` +
                            `📂 *Commands:* ${whatsappCommands.size + 10}\n` +
                            `⚡ *Status:* All systems operational\n\n` +
                            `📅 ${new Date().toLocaleString()}`;
            await sendMsg(chatId, aliveMsg);
            return;
        }

        // Owner
        if (commandText === 'owner') {
            const ownerMsg = `👑 *OWNER INFO*\n\n` +
                            `📛 *Name:* ${settings.botOwner || 'Mickey Developer'}\n` +
                            `📱 *WhatsApp:* wa.me/${settings.ownerNumber || '255612130873'}\n` +
                            `📢 *Channel:* t.me/mickeyglitch\n` +
                            `💻 *GitHub:* github.com/Mickeydeveloper\n\n` +
                            `⚡ *Mickey Glitch Bot*`;
            await sendMsg(chatId, ownerMsg);
            return;
        }

        // Stats
        if (commandText === 'stats') {
            const uptime = Math.floor(process.uptime());
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = uptime % 60;
            const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
            const serverFreeRam = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
            const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
            const pairedChats = loadAllowedChats().length;

            const statsText = `📊 *SYSTEM STATS*\n━━━━━━━━━━━━━━━━━━━━━━\n` +
                            `⏱️ *Uptime:* ${hours}h ${minutes}m ${seconds}s\n` +
                            `💾 *RAM:* ${ramUsage} MB\n` +
                            `🖥️ *Server:* ${serverFreeRam}GB / ${totalRam}GB Free\n` +
                            `💻 *Platform:* ${os.platform()} (${os.arch()})\n` +
                            `👥 *Paired Chats:* ${pairedChats}`;
            await sendMsg(chatId, statsText);
            return;
        }

        // Authorization check for other commands
        if (!allowed) {
            return sendMsg(chatId, '⚠️ *Chat not paired!*\n\nPlease use `/pair <number>` to connect your WhatsApp.');
        }

        // ============================================================
        // 🎵 PLAY COMMAND (Internal)
        // ============================================================
        
        if (commandText === 'play') {
            await handlePlayCommand(chatId, fullArgs, sendMsg, messageId);
            return;
        }

        // ============================================================
        // 📂 EXTERNAL COMMANDS FROM /commands FOLDER
        // ============================================================
        
        if (whatsappCommands.has(commandText)) {
            try {
                const commandFn = whatsappCommands.get(commandText);
                
                if (typeof commandFn !== 'function') {
                    throw new Error('Command is not a function');
                }
                
                const tgSock = createTelegramSock(chatId, messageId);
                
                const mockMsg = {
                    key: { 
                        remoteJid: chatId, 
                        fromMe: false, 
                        id: messageId,
                        participant: sender.id || sender.username
                    },
                    pushName: sender.first_name || sender.username || 'Telegram User',
                    message: { conversation: rawText },
                    quoted: message.reply_to_message ? {
                        key: { remoteJid: chatId, fromMe: false, id: message.reply_to_message.message_id },
                        pushName: message.reply_to_message.from?.first_name || 'Unknown',
                        message: { conversation: message.reply_to_message.text || '' }
                    } : null,
                    id: messageId,
                    sender: sender,
                    chat: message.chat,
                    from: chatId,
                    body: rawText,
                    fromMe: false,
                    isGroup: message.chat?.type === 'group' || message.chat?.type === 'supergroup',
                    participant: sender.id || sender.username
                };

                logDebug(`Executing command: ${commandText}`);
                await commandFn(tgSock, chatId, mockMsg, rawText);
                return;
            } catch (err) {
                logError(`Bridge Error (${commandText}): ${err.message}`);
                await sendMsg(chatId, `❌ *Error:* ${err.message.substring(0, 200)}`);
                return;
            }
        }

        // ============================================================
        // ❌ COMMAND NOT FOUND
        // ============================================================
        
        if (rawText.startsWith('/') || rawText.startsWith('.')) {
            const errorMsg = `❌ *Command '${commandText}' not found.*\n\n` +
                            `📂 *Available commands:*\n` +
                            `┣ /play <song/URL> - Play music\n` +
                            `┣ /play chart - Top chart songs\n` +
                            `┣ /help - Show all commands\n` +
                            `┣ /ping - Check status\n` +
                            `┣ /alive - System health\n` +
                            `┗ /owner - Developer info\n\n` +
                            `💡 Type /help for complete list`;
            await sendMsg(chatId, errorMsg);
        }
        
    } catch (error) {
        logError(`Update handling error: ${error.message}`);
        try {
            const chatId = update.message?.chat?.id;
            if (chatId) {
                await sendTelegramMessage(chatId, '❌ *System Error!*\n\nPlease try again later.');
            }
        } catch (e) {}
    }
}

// ============================================================
// 🚀 START TELEGRAM BOT
// ============================================================

let isTelegramBotRunning = false;

async function startTelegramBot() {
    if (isTelegramBotRunning) {
        logInfo('Telegram bot is already running.');
        return { sendMessage: sendTelegramMessage };
    }

    const token = settings.telegram?.botToken?.trim();
    if (!token) { 
        logError('❌ Telegram botToken not found in settings.js'); 
        return null; 
    }

    ensureTelegramDataFile();
    loadWhatsappCommands();
    await removeWebhookIfSet(token);
    
    logSuccess('🚀 Telegram bot starting...');
    logInfo(`📂 Loaded ${whatsappCommands.size} commands from /commands folder`);
    logInfo('🎵 /play command uses YouTube with audio fixes');
    logInfo('🔐 /pair command handles WhatsApp pairing');
    logInfo(`📊 Total commands: ${whatsappCommands.size + 10}`);
    
    let offset = 0;
    let pollingErrors = 0;
    
    const pollUpdates = async () => {
        try {
            const response = await axios.get(`${TELEGRAM_BASE_URL(token)}/getUpdates`, {
                params: { 
                    timeout: 30, 
                    offset: offset + 1,
                    allowed_updates: ['message', 'edited_message', 'callback_query']
                },
                ...AXIOS_DEFAULTS
            });
            
            pollingErrors = 0;
            
            const updates = response.data.result;
            if (updates && updates.length > 0) {
                for (const update of updates) {
                    try {
                        await handleUpdate(update);
                        offset = update.update_id;
                    } catch (err) {
                        logError(`Update error: ${err.message}`);
                    }
                }
            }
        } catch (err) {
            pollingErrors++;
            logError(`Polling error (${pollingErrors}): ${err.message}`);
        }
        
        const interval = pollingErrors > 5 ? 5000 : 1000;
        setTimeout(pollUpdates, interval);
    };
    
    pollUpdates();
    
    const ownerId = String(settings.telegram?.ownerId || '').trim();
    if (ownerId) {
        try {
            const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
            const startMsg = "✅ *MICKEY GLITCH BOT STARTED!*\n\n" +
                            "🟢 *Status:* Online\n" +
                            `💾 *RAM:* ${ramUsage} MB\n` +
                            `📂 *Commands:* ${whatsappCommands.size + 10} loaded\n` +
                            `👥 *Paired Chats:* ${loadAllowedChats().length}\n` +
                            `🎵 *Music:* Chart ready with audio fixes\n` +
                            `📅 *Time:* ${new Date().toLocaleString()}\n\n` +
                            "⚡ *Ready to serve!*";
            await sendTelegramMessage(ownerId, startMsg);
        } catch (e) {}
    }
    
    isTelegramBotRunning = true;
    logSuccess('✅ Telegram bot is running!');
    return { sendMessage: sendTelegramMessage };
}

module.exports = { startTelegramBot, isTelegramBotRunning };