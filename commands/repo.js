const fs = require('fs');
const os = require('os');
const path = require('path');
const archiver = require('archiver');
const axios = require('axios');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

// CONFIGURATION
const CONFIG = {
    FOOTER: '🪐 ᴍɪᴄᴋᴇʏ ɢʟɪᴛᴄʜ ᴍᴅ • 𝟸𝟶𝟸𝟼 🪐',
    REPO_URL: 'https://github.com/Mickeydeveloper/Mickey-Glitch',
    // Picha mpya uliyotuma (iliyowekwa raw=true ili ipatikane kama picha ya ukweli)
    BANNER: 'https://github.com/Mickeymozy/Mickey-Vip/blob/main/chatbot.png?raw=true',
    VERSION: '3.3.0',
    MODE: 'PUBLIC'
};

// HELPER: Format bytes
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// HELPER: Get directory size
function getDirSize(dirPath) {
    let totalSize = 0;
    try {
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                totalSize += getDirSize(fullPath);
            } else {
                totalSize += stat.size;
            }
        }
    } catch (e) {}
    return totalSize;
}

// HELPER: Check if bot is running on VPS/Server
function isVPS() {
    const platform = os?.platform() || 'unknown';
    const isHeroku = !!process.env.DYNO;
    const isRailway = !!process.env.RAILWAY_SERVICE_NAME;
    const isRender = !!process.env.RENDER_SERVICE_NAME;
    return isHeroku || isRailway || isRender || platform !== 'win32';
}

// CREATE ZIP STREAM FROM RAM (No disk storage)
async function createProjectZipBuffer() {
    const timestamp = Date.now();
    const zipFileName = `MickeyGlitch_Bot_${timestamp}.zip`;
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks = [];

    const bufferPromise = new Promise((resolve, reject) => {
        archive.on('data', chunk => chunks.push(chunk));
        archive.on('end', () => resolve(Buffer.concat(chunks)));
        archive.on('error', reject);
    });

    const projectDir = path.join(__dirname, '..');
    const excludeDirs = ['node_modules', '.git', 'sessions', 'session', 'tmp'];

    function addDirectory(dirPath, archivePath = '') {
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const stat = fs.statSync(fullPath);
            if (excludeDirs.includes(item) || item.startsWith('.')) continue;
            if (stat.isDirectory()) addDirectory(fullPath, path.join(archivePath, item));
            else archive.file(fullPath, { name: path.join(archivePath, item) });
        }
    }

    addDirectory(projectDir);
    await archive.finalize();

    return { buffer: await bufferPromise, name: zipFileName };
}

// SEND ZIP helper
async function sendRepoZip(sock, chatId, quotedMessage) {
    try {
        try { await sock.sendMessage(chatId, { react: { text: '📦', key: quotedMessage?.key } }); } catch (e) {}
        const processingMsg = await sock.sendMessage(chatId, {
            text: 'Processing archive, please wait...'
        });

        const zipData = await createProjectZipBuffer();
        await sock.sendMessage(chatId, {
            document: zipData.buffer,
            mimetype: 'application/zip',
            fileName: zipData.name,
            caption: `✅ ZIP ready: ${zipData.name}`
        }, { quoted: quotedMessage });

        try { await sock.sendMessage(chatId, { delete: processingMsg.key }); } catch (e) {}
        return true;
    } catch (err) {
        console.error('sendRepoZip error:', err);
        try {
            await sock.sendMessage(chatId, { text: '❌ Failed to build ZIP. Try again later.' }, { quoted: quotedMessage });
        } catch (e) {}
        return false;
    }
}

// MAIN REPO COMMAND HANDLER
async function repoCommand(sock, chatId, m, body = '') {
    try {
        const safeM = m || {};
        const safeKey = safeM.key || {};

        let input = '';
        if (safeM.message?.conversation) {
            input = safeM.message.conversation;
        } else if (safeM.message?.extendedTextMessage?.text) {
            input = safeM.message.extendedTextMessage.text;
        } else if (safeM.message?.buttonsResponseMessage?.selectedButtonId) {
            input = safeM.message.buttonsResponseMessage.selectedButtonId;
        } else if (safeM.message?.templateButtonReplyMessage?.selectedId) {
            input = safeM.message.templateButtonReplyMessage.selectedId;
        } else if (safeM.message?.interactiveResponseBody?.nativeFlowSearchResult?.selectedButtonId) {
            input = safeM.message.interactiveResponseBody.nativeFlowSearchResult.selectedButtonId;
        } else if (body) {
            input = body;
        }

        input = input.toLowerCase().trim();

        // Normalization za commands
        if (input === '.download_zip' || input === 'download_zip' || input === '.zip' || input === 'zip') input = 'download_zip';
        if (input === '.view_repo' || input === 'view_repo') input = 'view_repo';
        if (input === '.repo' || input === 'repo') input = 'repo';

        // ========== 1. HANDLE DOWNLOAD ZIP ==========
        if (input === 'download_zip') {
            await sendRepoZip(sock, chatId, safeM);
            return;
        }

        // ========== 2. HANDLE VIEW REPO ==========
        if (input === 'view_repo') {
            try { await sock.sendMessage(chatId, { react: { text: '🌐', key: safeKey } }); } catch(e) {}
            const repoMessage = `🛸 *MICKEY GLITCH GITHUB*\n\nRepository: ${CONFIG.REPO_URL}\n\nBenefits: Latest features, bug fixes, community support`;

            const nativeButtons = [
                { buttonId: 'download_zip', buttonText: { displayText: '📦 Download ZIP' }, type: 1 },
                { buttonId: '.menu', buttonText: { displayText: '📜 Menu' }, type: 1 }
            ];

            await sendNativeButtonV2(sock, chatId, safeM, repoMessage, CONFIG.FOOTER, "🌐 GITHUB VIEW", nativeButtons);
            return;
        }

        // ========== 3. MAIN REPO MENU ==========
        if (input === 'repo') {
            try { await sock.sendMessage(chatId, { react: { text: '📂', key: safeKey } }); } catch(e) {}

            const projectDir = path.join(__dirname, '..');
            let totalFiles = 0;
            try {
                const countFiles = (dir) => {
                    const items = fs.readdirSync(dir);
                    for (const item of items) {
                        if (item === 'node_modules' || item === '.git') continue;
                        const fullPath = path.join(dir, item);
                        if (fs.statSync(fullPath).isDirectory()) {
                            countFiles(fullPath);
                        } else {
                            totalFiles++;
                        }
                    }
                };
                countFiles(projectDir);
            } catch(e) {}

            const totalSize = formatBytes(getDirSize(projectDir));
            const isRunningOnVPS = isVPS();

            const statusMessage = `🛸 *BOT REPOSITORY*

*— INFO —*
🛸 *Bot:* Mickey Glitch MD
📦 *Ver:* ${CONFIG.VERSION}
🖥️ *Host:* ${isRunningOnVPS ? 'VPS' : 'Local'}

*— STATS —*
📄 *Files:* ${totalFiles}
💾 *Size:* ${totalSize}

_Use buttons below to interact._`;

            const nativeButtons = [
                { buttonId: 'download_zip', buttonText: { displayText: '📦 DOWNLOAD ZIP' }, type: 1 },
                { buttonId: 'view_repo', buttonText: { displayText: '🌐 VIEW REPO' }, type: 1 },
                { buttonId: '.menu', buttonText: { displayText: '📜 MENU' }, type: 1 }
            ];

            await sendNativeButtonV2(sock, chatId, safeM, statusMessage, CONFIG.FOOTER, "🛸 BOT REPO INFO", nativeButtons);
            return;
        }

        // Help fallback command
        if (!input || input === '.repohelp') {
            const helpMessage = `┏━━━━━━━━━━━━━━━━━━━━━━┓
┃  📖 *REPO COMMANDS* ┃
┗━━━━━━━━━━━━━━━━━━━━━━┛

📌 *Available Commands:*
├── .repo - Show main menu
├── .download_zip - Download source
└── .view_repo - Open GitHub

💡 *Usage:* Type any command above
🛸 *Bot:* Mickey Glitch MD`;

            await sock.sendMessage(chatId, { text: helpMessage }, { quoted: safeM });
        }

    } catch (e) {
        console.error('Repo Command Error:', e);
        try {
            await sock.sendMessage(chatId, {
                text: `❌ *COMMAND ERROR*\n\n📝 ${e.message || 'Unknown error'}\n\nPlease try again later.`
            });
        } catch(err) {}
    }
}

// Muundo ule ule kamili wa kutuma picha na button kama kwenye alive
async function sendNativeButtonV2(sock, chatId, message, textBody, footerText, headerName, buttonsList) {
    try {
        const fetchBuffer = async (url) => {
            const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
            return Buffer.from(res.data);
        };

        async function resizeImg(buffer, width = 300, height = 300) {
            try {
                const sharp = require('sharp');
                return await sharp(buffer).resize(width, height, { fit: 'cover' }).toBuffer();
            } catch {
                return buffer;
            }
        }

        let thumbnailBuffer = null;
        if (CONFIG.BANNER) {
            try {
                const buf = await fetchBuffer(CONFIG.BANNER);
                thumbnailBuffer = await resizeImg(buf, 300, 300);
            } catch (e) {
                console.error('[repo] thumbnail fetch failed', e && e.message ? e.message : e);
            }
        }

        const contextInfo = {
            forwardingScore: 999,
            isForwarded: true,
        };
        const mentionJid = message.key?.participant || message.key?.remoteJid;
        if (mentionJid) contextInfo.mentionedJid = [mentionJid];

        const msg = generateWAMessageFromContent(chatId, {
            buttonsMessage: {
                contentText: textBody,
                footerText: footerText,
                headerType: 6,
                locationMessage: {
                    degreesLatitude: 0,
                    degreesLongitude: 0,
                    name: headerName,
                    address: 'Repository',
                    jpegThumbnail: thumbnailBuffer
                },
                viewOnce: true,
                contextInfo,
                buttons: buttonsList
            }
        }, { userJid: (sock && sock.user && sock.user.id) || '', quoted: message || undefined });

        await sock.relayMessage(chatId, msg.message, {
            messageId: msg.key.id,
            additionalNodes: [
                {
                    tag: 'biz',
                    attrs: {},
                    content: [
                        {
                            tag: 'interactive',
                            attrs: { type: 'native_flow', v: '1' },
                            content: [
                                {
                                    tag: 'native_flow',
                                    attrs: { v: '9', name: 'mixed' }
                                }
                            ]
                        }
                    ]
                }
            ]
        });
    } catch (err) {
        console.error('sendNativeButtonV2 error inside repo:', err);
        await sock.sendMessage(chatId, { text: textBody }, { quoted: message });
    }
}

module.exports = repoCommand;
