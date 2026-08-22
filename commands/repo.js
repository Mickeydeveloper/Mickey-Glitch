const fs = require('fs');
const os = require('os');
const path = require('path');
const archiver = require('archiver');
const axios = require('axios');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

// ─── LOAD MESSAGEBUILDER ──────────────────────────────────────────────────────
let messageBuilder;
try {
    messageBuilder = require('../lib/messageBuilder');
} catch (e) {
    console.warn('⚠️ messageBuilder not found, using fallback');
    messageBuilder = {
        Button: class { constructor() {} },
        ButtonV2: class { constructor() {} },
        Carousel: class { constructor() {} },
        AIRich: class { constructor() {} },
        Toolkit: { fetchBuffer: async (url) => { const r = await axios.get(url, { responseType: 'arraybuffer' }); return Buffer.from(r.data); } },
        createCtx: (sock, chatId, msg) => ({ 
            sock, chatId, msg, 
            reply: async (text) => sock.sendMessage(chatId, { text }, { quoted: msg }),
            send: async (text) => sock.sendMessage(chatId, { text }, { quoted: msg })
        })
    };
}

const { Button, ButtonV2, AIRich, Toolkit, createCtx } = messageBuilder;

// ─── CONFIGURATION ─────────────────────────────────────────────────────────────
const CONFIG = {
    FOOTER: '🪐 ᴍɪᴄᴋᴇʏ ɢʟɪᴛᴄʜ ᴍᴅ • 𝟸𝟶𝟸𝟼 🪐',
    REPO_URL: 'ipo inbox ',
    BANNER: 'https://github.com/Mickeymozy/Mickey-Vip/blob/main/chatbot.png?raw=true',
    VERSION: '3.3.0',
    MODE: 'PUBLIC',
    BOT_NAME: 'Mickey Glitch MD'
};

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────

// Format bytes
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Get directory size
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

// Check if running on VPS
function isVPS() {
    const platform = os?.platform() || 'unknown';
    const isHeroku = !!process.env.DYNO;
    const isRailway = !!process.env.RAILWAY_SERVICE_NAME;
    const isRender = !!process.env.RENDER_SERVICE_NAME;
    return isHeroku || isRailway || isRender || platform !== 'win32';
}

// ─── ZIP CREATION ─────────────────────────────────────────────────────────────
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
    const excludeDirs = ['node_modules', '.git', 'sessions', 'session', 'tmp', 'cache'];

    function addDirectory(dirPath, archivePath = '') {
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const stat = fs.statSync(fullPath);
            if (excludeDirs.includes(item) || item.startsWith('.')) continue;
            if (stat.isDirectory()) {
                addDirectory(fullPath, path.join(archivePath, item));
            } else {
                archive.file(fullPath, { name: path.join(archivePath, item) });
            }
        }
    }

    addDirectory(projectDir);
    await archive.finalize();

    return { buffer: await bufferPromise, name: zipFileName };
}

// ─── SEND ZIP ─────────────────────────────────────────────────────────────────
async function sendRepoZip(sock, chatId, quotedMessage) {
    try {
        await react(sock, chatId, quotedMessage, '📦');
        
        const processingMsg = await sock.sendMessage(chatId, {
            text: '⏳ *Processing archive...*'
        });

        const zipData = await createProjectZipBuffer();
        
        await sock.sendMessage(chatId, {
            document: zipData.buffer,
            mimetype: 'application/zip',
            fileName: zipData.name,
            caption: `✅ *ZIP Ready!*\n📦 ${zipData.name}\n💾 Size: ${formatBytes(zipData.buffer.length)}`
        }, { quoted: quotedMessage });

        try { await sock.sendMessage(chatId, { delete: processingMsg.key }); } catch (e) {}
        return true;
    } catch (err) {
        console.error('sendRepoZip error:', err);
        try {
            await sock.sendMessage(chatId, { 
                text: '❌ Failed to build ZIP. Try again later.' 
            }, { quoted: quotedMessage });
        } catch (e) {}
        return false;
    }
}

// ─── REACT HELPER ─────────────────────────────────────────────────────────────
async function react(sock, chatId, msg, emoji) {
    try {
        if (msg?.key) {
            await sock.sendMessage(chatId, { react: { text: emoji, key: msg.key } });
        }
    } catch (e) {}
}

// ─── SEND WITH BUTTONV2 (MessageBuilder) ─────────────────────────────────────
async function sendWithButtonV2(sock, chatId, msg, text, footer, title, buttons) {
    try {
        const builder = new ButtonV2(sock)
            .setBody(text)
            .setFooter(footer || CONFIG.FOOTER)
            .setTitle(title || '🛸 Mickey Glitch Repo')
            .setThumbnail(CONFIG.BANNER);

        for (const btn of buttons) {
            builder.addButton(btn.displayText || btn.text, btn.buttonId || btn.id);
        }

        await builder.send(chatId, { quoted: msg });
        return true;
    } catch (error) {
        console.error('[ButtonV2 Error]', error.message);
        // Fallback to native buttons
        return await sendNativeButtons(sock, chatId, msg, text, footer, title, buttons);
    }
}

// ─── SEND NATIVE BUTTONS (Fallback) ──────────────────────────────────────────
async function sendNativeButtons(sock, chatId, msg, textBody, footerText, headerName, buttonsList) {
    try {
        // Try to get thumbnail
        let thumbnailBuffer = null;
        try {
            const buf = await Toolkit.fetchBuffer(CONFIG.BANNER);
            thumbnailBuffer = buf;
        } catch (e) {}

        const contextInfo = {
            forwardingScore: 999,
            isForwarded: true,
        };
        if (msg?.key?.participant) {
            contextInfo.mentionedJid = [msg.key.participant];
        }

        const msg2 = generateWAMessageFromContent(chatId, {
            buttonsMessage: {
                contentText: textBody,
                footerText: footerText || CONFIG.FOOTER,
                headerType: 6,
                locationMessage: {
                    degreesLatitude: 0,
                    degreesLongitude: 0,
                    name: headerName || 'Repository',
                    address: 'Mickey Glitch MD',
                    jpegThumbnail: thumbnailBuffer
                },
                viewOnce: true,
                contextInfo,
                buttons: buttonsList.map(btn => ({
                    buttonId: btn.buttonId || btn.id,
                    buttonText: { displayText: btn.displayText || btn.text },
                    type: 1
                }))
            }
        }, { userJid: sock?.user?.id, quoted: msg });

        await sock.relayMessage(chatId, msg2.message, {
            messageId: msg2.key.id,
            additionalNodes: [
                {
                    tag: 'biz',
                    attrs: {},
                    content: [
                        {
                            tag: 'interactive',
                            attrs: { type: 'native_flow', v: '1' },
                            content: [
                                { tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }
                            ]
                        }
                    ]
                }
            ]
        });
        return true;
    } catch (err) {
        console.error('sendNativeButtons error:', err);
        // Ultimate fallback
        await sock.sendMessage(chatId, { text: textBody }, { quoted: msg });
        return false;
    }
}

// ─── SEND RICH AI MESSAGE ─────────────────────────────────────────────────────
async function sendRichMessage(sock, chatId, msg, text, title, subtitle) {
    try {
        const rich = new AIRich(sock)
            .setTitle(title || '🛸 Mickey Glitch Repo')
            .setSubtitle(subtitle || '⚡ Glitch Sub Engine')
            .setFooter(CONFIG.FOOTER)
            .addText(text, { hyperlink: true, citation: true });

        await rich.send(chatId, { quoted: msg });
        return true;
    } catch (error) {
        console.error('[RichMessage Error]', error.message);
        // Fallback
        await sock.sendMessage(chatId, { text }, { quoted: msg });
        return false;
    }
}

// ─── MAIN REPO COMMAND ──────────────────────────────────────────────────────
async function repoCommand(sock, chatId, m, body = '') {
    try {
        const ctx = createCtx(sock, chatId, m, { body });
        const safeM = m || {};
        const safeKey = safeM.key || {};

        // ─── EXTRACT INPUT ──────────────────────────────────────────────────
        let input = '';
        if (safeM.message?.conversation) {
            input = safeM.message.conversation;
        } else if (safeM.message?.extendedTextMessage?.text) {
            input = safeM.message.extendedTextMessage.text;
        } else if (safeM.message?.buttonsResponseMessage?.selectedButtonId) {
            input = safeM.message.buttonsResponseMessage.selectedButtonId;
        } else if (safeM.message?.templateButtonReplyMessage?.selectedId) {
            input = safeM.message.templateButtonReplyMessage.selectedId;
        } else if (body) {
            input = body;
        }

        input = input.toLowerCase().trim();

        // ─── NORMALIZE COMMANDS ─────────────────────────────────────────────
        const commands = {
            download_zip: ['download_zip', '.download_zip', 'zip', '.zip', 'downloadzip'],
            view_repo: ['view_repo', '.view_repo', 'github', '.github', 'repo_link'],
            repo: ['repo', '.repo', 'repository', '.repository'],
            help: ['help', '.help', 'repohelp', '.repohelp']
        };

        let command = 'repo'; // default
        for (const [cmd, aliases] of Object.entries(commands)) {
            if (aliases.includes(input)) {
                command = cmd;
                break;
            }
        }

        // ─── HANDLE COMMANDS ────────────────────────────────────────────────

        // 1. DOWNLOAD ZIP
        if (command === 'download_zip') {
            await sendRepoZip(sock, chatId, safeM);
            return;
        }

        // 2. VIEW REPO (GitHub)
        if (command === 'view_repo') {
            await react(sock, chatId, safeM, '🌐');
            
            const repoMessage = `🛸 *MICKEY GLITCH GITHUB*\n\n` +
                `📂 *Repository:*\n${CONFIG.REPO_URL}\n\n` +
                `✨ *Benefits:*\n` +
                `• Latest features\n` +
                `• Bug fixes\n` +
                `• Community support\n` +
                `• Active development\n\n` +
                `🔗 *Visit now:* ${CONFIG.REPO_URL}`;

            const buttons = [
                { displayText: '📦 Download ZIP', buttonId: '.rich' },
                { displayText: '📜 Menu', buttonId: '.rich' },
                { displayText: '⭐ Star', buttonId: '.rich' }
            ];

            await sendWithButtonV2(sock, chatId, safeM, repoMessage, CONFIG.FOOTER, '🌐 GitHub View', buttons);
            return;
        }

        // 3. MAIN REPO MENU
        if (command === 'repo') {
            await react(sock, chatId, safeM, '📂');

            const projectDir = path.join(__dirname, '..');
            let totalFiles = 0;
            try {
                const countFiles = (dir) => {
                    const items = fs.readdirSync(dir);
                    for (const item of items) {
                        if (item === 'node_modules' || item === '.git' || item === 'sessions') continue;
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
🛸 *Bot:* ${CONFIG.BOT_NAME}
📦 *Ver:* ${CONFIG.VERSION}
🖥️ *Host:* ${isRunningOnVPS ? 'VPS 🚀' : 'Local 💻'}
🌐 *Mode:* ${CONFIG.MODE}

*— STATS —*
📄 *Files:* ${totalFiles}
💾 *Size:* ${totalSize}
📂 *Repo:* ${CONFIG.REPO_URL}

_Use buttons below to interact._`;

            const buttons = [
                { displayText: '📦 DOWNLOAD ZIP', buttonId: '.rich' },
                { displayText: '🌐 VIEW REPO', buttonId: '.rich' },
                { displayText: '📜 MENU', buttonId: '.rich' }
            ];

            await sendWithButtonV2(sock, chatId, safeM, statusMessage, CONFIG.FOOTER, '🛸 Repo Info', buttons);
            return;
        }

        // 4. HELP
        if (command === 'help') {
            const helpMessage = `┏━━━━━━━━━━━━━━━━━━━━━━┓
┃  📖 *REPO COMMANDS* ┃
┗━━━━━━━━━━━━━━━━━━━━━━┛

📌 *Available Commands:*
├── .repo - Show main menu
├── .download_zip - Download source code
├── .view_repo - Open GitHub repo
└── .repohelp - This help menu

💡 *Usage:* Type any command above

📂 *Repo:* ${CONFIG.REPO_URL}

🛸 *Bot:* ${CONFIG.BOT_NAME}`;

            await sendRichMessage(sock, chatId, safeM, helpMessage, '📖 Repo Help', '⚡ Glitch Sub Engine');
            return;
        }

        // ─── DEFAULT: Show repo menu ──────────────────────────────────────
        await repoCommand(sock, chatId, m, 'repo');

    } catch (e) {
        console.error('Repo Command Error:', e);
        try {
            const errorMsg = `❌ *COMMAND ERROR*\n\n📝 ${e.message || 'Unknown error'}\n\nPlease try again later.`;
            await sock.sendMessage(chatId, { text: errorMsg }, { quoted: m });
        } catch(err) {}
    }
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────
module.exports = repoCommand;
module.exports.repoCommand = repoCommand;
module.exports.default = repoCommand;