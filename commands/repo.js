const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { PassThrough } = require('stream');
const { prepareWAMessageMedia } = require('@whiskeysockets/baileys');

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
function createProjectZipStream() {
    const timestamp = Date.now();
    const zipFileName = `MickeyGlitch_Bot_${timestamp}.zip`;
    const archive = archiver('zip', { zlib: { level: 9 } });
    const passthrough = new PassThrough();

    archive.on('error', (err) => {
        console.error('Archive error:', err);
        passthrough.emit('error', err);
    });
    
    archive.pipe(passthrough);

    // Async packing
    (async () => {
        try {
            const projectDir = path.join(__dirname, '..');
            const excludeDirs = [
                'node_modules', 'temp', '.git', 'sessions', 'session', 
                'cache', 'logs', 'uploads', 'tmp', 'backup', 'dump',
                '.env', '.gitignore', '*.log', '*.tmp'
            ];
            
            let fileCount = 0;
            let totalSize = 0;

            function addDirectory(dirPath, archivePath = '') {
                try {
                    if (!fs.existsSync(dirPath)) return;
                    
                    const items = fs.readdirSync(dirPath);
                    for (const item of items) {
                        const fullPath = path.join(dirPath, item);
                        const stat = fs.statSync(fullPath);
                        const relativePath = archivePath ? path.join(archivePath, item) : item;

                        // Skip excluded directories and hidden files
                        if (excludeDirs.includes(item) || item.startsWith('.')) continue;
                        
                        // Skip large files (>50MB)
                        if (stat.size > 50 * 1024 * 1024) continue;

                        if (stat.isDirectory()) {
                            addDirectory(fullPath, relativePath);
                        } else {
                            archive.file(fullPath, { name: relativePath });
                            fileCount++;
                            totalSize += stat.size;
                        }
                    }
                } catch (e) {
                    console.error(`Error reading ${dirPath}:`, e.message);
                }
            }

            addDirectory(projectDir);
            
            // Add metadata file
            const metadata = {
                created: new Date().toISOString(),
                bot_name: 'Mickey Glitch MD',
                version: CONFIG.VERSION,
                file_count: fileCount,
                total_size: formatBytes(totalSize),
                repo_url: CONFIG.REPO_URL
            };
            
            archive.append(JSON.stringify(metadata, null, 2), { name: 'bot_metadata.json' });
            
            await archive.finalize();
            console.log(`[ZIP] Created ${zipFileName} with ${fileCount} files (${formatBytes(totalSize)})`);
        } catch (err) {
            console.error('ZIP creation error:', err);
            try { archive.destroy(); } catch(e) {}
        }
    })();

    return { stream: passthrough, name: zipFileName };
}

// SEND INTERACTIVE MESSAGE (Custom implementation - no external npm)
async function sendInteractiveMessage(sock, chatId, messageData, options = {}) {
    try {
        const { text, footer, header, buttons } = messageData;
        
        // Check if sock has the method
        if (sock.sendMessage) {
            // Try interactive message format
            const interactiveMsg = {
                text: text,
                footer: footer,
                contextInfo: {
                    forwardingScore: 0,
                    isForwarded: false,
                    externalAdReply: {
                        title: header?.title || 'Mickey Glitch MD',
                        body: 'Repository Manager',
                        thumbnailUrl: CONFIG.BANNER,
                        sourceUrl: CONFIG.REPO_URL,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                },
                buttons: buttons?.map(btn => ({
                    buttonId: btn.id,
                    buttonText: { displayText: btn.display_text },
                    type: 1
                }))
            };
            
            // Send with buttons
            if (buttons && buttons.length > 0) {
                return await sock.sendMessage(chatId, {
                    text: text,
                    footer: footer,
                    buttons: buttons.map(btn => ({
                        buttonId: btn.id,
                        buttonText: { displayText: btn.display_text },
                        type: 1
                    })),
                    headerType: 1,
                    viewOnce: true
                }, options);
            }
            
            // Simple text with buttons fallback
            return await sock.sendMessage(chatId, { 
                text: `${text}\n\n${footer}\n\n${buttons?.map(btn => `▸ *${btn.display_text}* - Send "${btn.id}"`).join('\n')}` 
            }, options);
        }
        
        throw new Error('sendMessage not available');
    } catch (error) {
        console.error('Interactive message error:', error);
        // Fallback to plain text with instructions
        const buttonsText = buttons?.map(btn => `╭──────────────╮\n│ • *${btn.display_text}* │\n╰──────────────╯\n💬 *Command:* \`${btn.id}\``).join('\n\n');
        return await sock.sendMessage(chatId, {
            text: `${text}\n\n${buttonsText || ''}\n\n${footer}`
        }, options);
    }
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
                      '💿 *Method:* RAM Streaming\n\n' +
                      '_Please wait a moment..._'
            });
            
            try {
                const zipStreamInfo = createProjectZipStream();
                
                // Send ZIP file
                await sock.sendMessage(chatId, {
                    document: zipStreamInfo.stream,
                    mimetype: 'application/zip',
                    fileName: zipStreamInfo.name,
                    caption: `┏━━━━━━━━━━━━━━━━━━━━━━┓\n` +
                            `┃  ✅ *ZIP READY!*        ┃\n` +
                            `┗━━━━━━━━━━━━━━━━━━━━━━┛\n\n` +
                            `📦 *File:* ${zipStreamInfo.name}\n` +
                            `📁 *Content:* Complete source code\n` +
                            `🛸 *Bot:* Mickey Glitch MD\n\n` +
                            `_Extract and deploy on your own server!_`
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
            
            // Premium Status Message
            const statusMessage = `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ✨ *BOT REPOSITORY MANAGER*  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━┓
┃ 📊 *BOT INFORMATION*  ┃
┗━━━━━━━━━━━━━━━━━━━━━━┛
├── 🛸 *Name:* Mickey Glitch MD
├── 📦 *Version:* ${CONFIG.VERSION}
├── 💎 *Mode:* ${CONFIG.MODE}
└── 🖥️ *Host:* ${isRunningOnVPS ? '🚀 VPS/Cloud' : '💻 Local'}

┏━━━━━━━━━━━━━━━━━━━━━━┓
┃ 📁 *PROJECT STATS*     ┃
┗━━━━━━━━━━━━━━━━━━━━━━┛
├── 📄 *Files:* ${totalFiles}+
├── 💾 *Size:* ${totalSize}
└── 🔧 *Modules:* 50+

┏━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🎯 *QUICK ACTIONS*     ┃
┗━━━━━━━━━━━━━━━━━━━━━━┛
├── 📦 *Download ZIP* - Get full source
└── 🌐 *View Repo* - Visit GitHub

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${CONFIG.FOOTER}

💡 *Tap buttons below or type:*
• \`.download_zip\` - Get source code
• \`.view_repo\` - Open GitHub`;

            // Prepare buttons
            const buttons = [
                {
                    id: 'download_zip',
                    display_text: '📦 DOWNLOAD ZIP'
                },
                {
                    id: 'view_repo',
                    display_text: '🌐 VIEW REPO'
                }
            ];
            
            // Send with interactive message
            return await sendInteractiveMessage(sock, chatId, {
                text: statusMessage,
                footer: CONFIG.FOOTER,
                header: {
                    title: '🛸 Mickey Glitch Mainframe'
                },
                buttons: buttons
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