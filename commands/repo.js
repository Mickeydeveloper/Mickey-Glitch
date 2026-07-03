const fs = require('fs');
const os = require('os');
const path = require('path');
const archiver = require('archiver');
const { PassThrough } = require('stream');
const { sendInteractiveMessage } = require('gifted-btns');

// CONFIGURATION
const CONFIG = {
    FOOTER: '🪐 ᴍɪᴄᴋᴇʏ ɢʟɪᴛᴄʜ ᴍᴅ • 𝟸𝟶𝟸𝟼 🪐',
    REPO_URL: 'https://github.com/Mickeydeveloper/Mickey-Glitch',
    BANNER: 'https://raw.githubusercontent.com/Mickeydeveloper/water-billing/main/1761205727440.jpg',
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
    
    // Async packing
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

// MAIN REPO COMMAND HANDLER
async function repoCommand(sock, chatId, m, body = '') {
    try {
        const safeM = m || {};
        const safeKey = safeM.key || {};
        
        // Detect input from various message types
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
        
        // Normalize inputs
        if (input === '.download_zip' || input === 'download_zip') input = 'download_zip';
        if (input === '.view_repo' || input === 'view_repo') input = 'view_repo';
        if (input === '.repo' || input === 'repo') input = 'repo';
        
        // ========== HANDLE DOWNLOAD ZIP ==========
        if (input === 'download_zip') {
            // React to message
            try {
                await sock.sendMessage(chatId, { react: { text: '📦', key: safeKey } });
            } catch(e) {}
            
            // Send processing message
            const processingMsg = await sock.sendMessage(chatId, {
                text: '┏━━━━━━━━━━━━━━━━━━━━━━┓\n' +
                      '┃  📦 *BUILDING ARCHIVE*  ┃\n' +
                      '┗━━━━━━━━━━━━━━━━━━━━━━┛\n\n' +
                      '⚙️ *Status:* Processing files...\n' +
                      '📁 *Source:* Bot directory\n' +
                      '💿 *Method:* Secure Buffer\n\n' +
                      '_Please wait a moment..._'
            });
            
            try {
                const zipData = await createProjectZipBuffer();
                
                // Send ZIP file
                await sock.sendMessage(chatId, {
                    document: zipData.buffer,
                    mimetype: 'application/zip',
                    fileName: zipData.name,
                    caption: `✅ *ZIP READY!*\n📦 File: ${zipData.name}\n🛸 Bot: Mickey Glitch MD`
                }, { quoted: safeM });
                
                // Delete processing message
                try {
                    await sock.sendMessage(chatId, { delete: processingMsg.key });
                } catch(e) {}
                
            } catch (error) {
                console.error('Zip stream error:', error);
                await sock.sendMessage(chatId, {
                    text: `❌ *ARCHIVE CREATION FAILED*\n\n` +
                          `📝 *Error:* ${error.message || 'Unknown error'}\n\n` +
                          `📌 *Alternative:* Clone directly from GitHub\n` +
                          `${CONFIG.REPO_URL}`
                });
            }
            return;
        }
        
        // ========== HANDLE VIEW REPO ==========
        if (input === 'view_repo') {
            try {
                await sock.sendMessage(chatId, { react: { text: '🌐', key: safeKey } });
            } catch(e) {}
            
            const repoMessage = `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  🛸 *MICKEY GLITCH GITHUB*  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

✨ *Repository:* 
${CONFIG.REPO_URL}

📊 *Quick Actions:*
├── ⭐ Star the repo
├── 🔱 Fork to your account
└── 👁️ Watch for updates

💡 *Benefits:*
• Latest features
• Bug fixes
• Community support
• Regular updates

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*© 2026 Mickey Glitch Labs*`;

            return await sock.sendMessage(chatId, { text: repoMessage }, { quoted: safeM });
        }
        
        // ========== MAIN REPO MENU ==========
        if (input === 'repo') {
            // React
            try {
                await sock.sendMessage(chatId, { react: { text: '📂', key: safeKey } });
            } catch(e) {}
            
            // Calculate bot stats
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

            // Send with interactive message
            return await sendInteractiveMessage(sock, chatId, {
                image: { url: CONFIG.BANNER },
                text: statusMessage,
                footer: "⭐ 𝐌𝐈𝐂𝐊𝐄𝐘 𝐆𝐋𝐈𝐓𝐂𝐇 𝐁𝐎𝐓 • 𝟐𝟎𝟐𝟔 ⭐",
                interactiveButtons: [
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({ 
                            display_text: '📦 DOWNLOAD ZIP', 
                            id: 'download_zip' 
                        })
                    },
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({ 
                            display_text: '🌐 VIEW REPO', 
                            id: 'view_repo' 
                        })
                    },
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({ 
                            display_text: '📜 MENU', 
                            id: '.menu' 
                        })
                    }
                ]
            }, { quoted: safeM });
        }
        
        // If no valid command, show help
        if (!input || input === '.repohelp') {
            const helpMessage = `┏━━━━━━━━━━━━━━━━━━━━━━┓
┃  📖 *REPO COMMANDS*   ┃
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
        // Send error message
        try {
            await sock.sendMessage(chatId, {
                text: `❌ *COMMAND ERROR*\n\n📝 ${e.message || 'Unknown error'}\n\nPlease try again later.`
            });
        } catch(err) {}
    }
}

module.exports = repoCommand;