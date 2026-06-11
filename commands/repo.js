// commands/repo.js
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { PassThrough } = require('stream');
const axios = require('axios');
const { sendInteractiveMessage } = require('gifted-btns');

// ==========================================
// CONFIG - IMARA ZAIDI
// ==========================================
const CONFIG = {
    FOOTER: '⭐ 𝐌𝐈𝐂𝐊𝐄𝐘 𝐆𝐋𝐈𝐓𝐂𝐇 𝐁𝐎𝐓 • 𝟐𝟎𝟐𝟔 ⭐',
    REPO_URL: 'https://github.com/Mickeydeveloper/Mickey-Glitch',
    BANNER: 'https://raw.githubusercontent.com/Mickeydeveloper/water-billing/main/1761205727440.png',
    EXCLUDE_DIRS: ['node_modules', 'temp', '.git', 'sessions', 'cache', 'logs', 'uploads', 'tmp', 'backup'],
    MAX_ZIP_SIZE: 50 * 1024 * 1024 // 50MB max
};

// ==========================================
// SAFE SETTINGS LOADER
// ==========================================
function loadSettings() {
    try {
        const settingsPath = path.join(__dirname, '..', 'settings.js');
        if (fs.existsSync(settingsPath)) {
            const settings = require('../settings');
            return {
                botName: settings.botName || settings.botname || '𝐌𝐈𝐂𝐊𝐄𝐘 𝐆𝐋𝐈𝐓𝐂𝐇',
                version: settings.version || '3.3.0',
                updateZipUrl: settings.updateZipUrl || null,
                ownerNumber: settings.ownerNumber || '255612130873'
            };
        }
    } catch (e) {
        console.error('Settings load error:', e);
    }
    return {
        botName: '𝐌𝐈𝐂𝐊𝐄𝐘 𝐆𝐋𝐈𝐓𝐂𝐇',
        version: '3.3.0',
        updateZipUrl: null,
        ownerNumber: '255612130873'
    };
}

// ==========================================
// SEND INTERACTIVE MENU (IMARA ZAIDI)
// ==========================================
async function sendRepoMenu(sock, chatId, quotedMsg) {
    try {
        const settings = loadSettings();
        
        const statusMessage = `╔════════════════════════════╗
║      📂 *𝐑𝐄𝐏𝐎 𝐌𝐄𝐍𝐔* 📂      ║
╠════════════════════════════╣
║                            ║
║  🤖 *Bot Name*             ║
║  › ${settings.botName}     ║
║                            ║
║  📦 *Version*              ║
║  › ${settings.version}     ║
║                            ║
║  📁 *Files*                ║
║  › Complete Source Code   ║
║                            ║
║  💾 *Size*                 ║
║  › ~15-20 MB (zipped)     ║
║                            ║
║  🔗 *GitHub*               ║
║  › ${CONFIG.REPO_URL.split('/').slice(-2).join('/')}
║                            ║
╠════════════════════════════╣
║  📌 *Tap buttons below*     ║
║     to get the source code! ║
╚════════════════════════════╝`;

        // Using PROPER button format that works with gifted-btns
        const interactiveMessage = {
            image: { url: CONFIG.BANNER },
            text: statusMessage,
            footer: CONFIG.FOOTER,
            contextInfo: {
                externalAdReply: {
                    title: `${settings.botName} • Repository`,
                    body: 'View or download project on GitHub',
                    thumbnailUrl: CONFIG.BANNER,
                    sourceUrl: CONFIG.REPO_URL,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            },
            interactiveButtons: [
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📦 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃 𝐙𝐈𝐏",
                        id: "repo_download_zip"
                    })
                },
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📂 𝐕𝐈𝐄𝐖 𝐑𝐄𝐏𝐎",
                        id: "repo_view_repo"
                    })
                },
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: "⭐ 𝐒𝐓𝐀𝐑 𝐎𝐍 𝐆𝐈𝐓𝐇𝐔𝐁",
                        id: "repo_star"
                    })
                }
            ]
        };

        return await sendInteractiveMessage(sock, chatId, interactiveMessage, { quoted: quotedMsg });
    } catch (error) {
        console.error('Error sending repo menu:', error);
        throw error;
    }
}

// ==========================================
// CREATE ZIP STREAM (HAINA KUANDIKA DISK)
// ==========================================
function createProjectZipStream() {
    return new Promise((resolve, reject) => {
        const timestamp = Date.now();
        const zipFileName = `MickeyGlitch_Bot_${timestamp}.zip`;
        const archive = archiver('zip', { 
            zlib: { level: 9 } // Maximum compression
        });
        
        const passthrough = new PassThrough();
        
        archive.on('error', (err) => {
            console.error('Archive error:', err);
            reject(err);
        });
        
        archive.pipe(passthrough);
        
        const projectDir = path.join(__dirname, '..');
        let fileCount = 0;
        
        // Function to add files recursively
        function addDirectory(dirPath, archivePath = '') {
            try {
                const items = fs.readdirSync(dirPath);
                
                for (const item of items) {
                    // Skip excluded directories and hidden files
                    if (CONFIG.EXCLUDE_DIRS.includes(item) || item.startsWith('.')) {
                        continue;
                    }
                    
                    const fullPath = path.join(dirPath, item);
                    let stat;
                    
                    try {
                        stat = fs.statSync(fullPath);
                    } catch(e) {
                        continue; // Skip if can't stat
                    }
                    
                    const relativePath = archivePath ? path.join(archivePath, item) : item;
                    
                    if (stat.isDirectory()) {
                        addDirectory(fullPath, relativePath);
                    } else {
                        // Skip files that are too large (>10MB)
                        if (stat.size > 10 * 1024 * 1024) {
                            console.log(`Skipping large file: ${relativePath} (${(stat.size / 1024 / 1024).toFixed(2)}MB)`);
                            continue;
                        }
                        
                        try {
                            archive.file(fullPath, { name: relativePath });
                            fileCount++;
                        } catch(e) {
                            console.error(`Failed to add file: ${relativePath}`, e);
                        }
                    }
                }
            } catch (e) {
                console.error(`Error reading directory ${dirPath}:`, e);
            }
        }
        
        // Start adding files
        try {
            addDirectory(projectDir);
            console.log(`Added ${fileCount} files to archive`);
            
            archive.finalize();
            resolve({ stream: passthrough, name: zipFileName, fileCount });
        } catch (err) {
            reject(err);
        }
    });
}

// ==========================================
// DOWNLOAD FROM GITHUB (IKIWA INAFAA)
// ==========================================
async function downloadFromGitHub(sock, chatId, quotedMsg, safeKey) {
    try {
        // First try to get direct download URL from GitHub API
        const apiUrl = 'https://api.github.com/repos/Mickeydeveloper/Mickey-Glitch/zipball/main';
        
        const response = await axios({
            method: 'GET',
            url: apiUrl,
            responseType: 'arraybuffer',
            timeout: 120000,
            maxContentLength: CONFIG.MAX_ZIP_SIZE,
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Mickey-Glitch-Bot'
            }
        });
        
        if (response.status === 200 && response.data) {
            const zipBuffer = Buffer.from(response.data);
            const zipName = `MickeyGlitch_GitHub_${Date.now()}.zip`;
            
            await sock.sendMessage(chatId, {
                document: zipBuffer,
                mimetype: 'application/zip',
                fileName: zipName,
                caption: `╭━━━━━━━━━━━━━━━━━━━━╮
┃  ✅ *𝐙𝐈𝐏 𝐑𝐄𝐀𝐃𝐘* ✅
┣━━━━━━━━━━━━━━━━━━━━┛
┃
┃ 📦 *File:* ${zipName}
┃ 📊 *Size:* ${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB
┃ 📁 *Source:* GitHub (Official)
┃
┃ 🌟 *Latest version from*
┃    main branch
┃
╰━━━━━━━━━━━━━━━━━━━━╯`
            }, { quoted: quotedMsg });
            
            return true;
        }
        return false;
    } catch (error) {
        console.error('GitHub download failed:', error.message);
        return false;
    }
}

// ==========================================
// CREATE INSTALLER SCRIPT
// ==========================================
function createInstallerScript() {
    const projectDir = path.join(__dirname, '..');
    const files = [];
    
    function collectFiles(dir, base = '') {
        try {
            const items = fs.readdirSync(dir);
            for (const item of items) {
                if (item.startsWith('.') || CONFIG.EXCLUDE_DIRS.includes(item)) continue;
                
                const fullPath = path.join(dir, item);
                const relativePath = base ? path.join(base, item) : item;
                
                try {
                    const stat = fs.statSync(fullPath);
                    if (stat.isDirectory()) {
                        collectFiles(fullPath, relativePath);
                    } else {
                        // Skip files > 5MB for installer
                        if (stat.size > 5 * 1024 * 1024) continue;
                        
                        const data = fs.readFileSync(fullPath);
                        files.push({
                            path: relativePath.replace(/\\/g, '/'),
                            data: data.toString('base64'),
                            size: stat.size
                        });
                    }
                } catch(e) {}
            }
        } catch(e) {}
    }
    
    collectFiles(projectDir);
    
    const script = `#!/usr/bin/env node
// Mickey Glitch Bot - Self Extracting Installer
// Run: node ${Date.now()}_installer.js

const fs = require('fs');
const path = require('path');

const files = ${JSON.stringify(files, null, 2)};

console.log('📦 Extracting ${files.length} files...');

let extracted = 0;
for (const file of files) {
    const outputPath = path.join(process.cwd(), file.path);
    const outputDir = path.dirname(outputPath);
    
    try {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        fs.writeFileSync(outputPath, Buffer.from(file.data, 'base64'));
        extracted++;
        process.stdout.write('\\r📁 Extracted: ' + extracted + '/' + files.length);
    } catch(e) {
        console.error('\\n❌ Failed:', file.path, e.message);
    }
}

console.log('\\n✅ Extraction complete!');
console.log('📂 Files extracted to: ' + process.cwd());
console.log('🚀 Run: npm install && npm start');
`;
    
    return {
        buffer: Buffer.from(script, 'utf8'),
        name: `mickey_installer_${Date.now()}.js`
    };
}

// ==========================================
// MAIN COMMAND HANDLER
// ==========================================
async function repoCommand(sock, chatId, message, body = '') {
    try {
        // SAFETY CHECKS
        const safeMessage = message || {};
        const safeKey = safeMessage.key || { remoteJid: chatId };
        
        // INPUT DETECTION - Support multiple formats
        let input = '';
        
        if (body && typeof body === 'string') {
            input = body.toLowerCase().trim();
        }
        
        if (!input && safeMessage.message) {
            try {
                if (safeMessage.message.conversation) {
                    input = safeMessage.message.conversation.toLowerCase().trim();
                } else if (safeMessage.message.extendedTextMessage?.text) {
                    input = safeMessage.message.extendedTextMessage.text.toLowerCase().trim();
                } else if (safeMessage.message.buttonsResponseMessage?.selectedButtonId) {
                    input = safeMessage.message.buttonsResponseMessage.selectedButtonId.toLowerCase().trim();
                } else if (safeMessage.message.listResponseMessage?.singleSelectReply?.selectedRowId) {
                    input = safeMessage.message.listResponseMessage.singleSelectReply.selectedRowId.toLowerCase().trim();
                }
            } catch(e) {}
        }
        
        // Normalize button IDs
        const buttonMap = {
            'repo_download_zip': 'download',
            'repo_view_repo': 'view',
            'repo_star': 'star',
            'download_zip': 'download',
            'view_repo': 'view'
        };
        
        let action = buttonMap[input] || input;
        
        console.log('📂 Repo Command:', { input, action, chatId });
        
        // ==========================================
        // HANDLE DOWNLOAD ZIP
        // ==========================================
        if (action === 'download' || action === '.download_zip' || action === 'download_zip') {
            // Send reaction
            try {
                await sock.sendMessage(chatId, { 
                    react: { text: '📦', key: safeKey } 
                });
            } catch(e) {}
            
            // Send processing message
            const processingMsg = await sock.sendMessage(chatId, {
                text: `╭━━━━━━━━━━━━━━━━━━━━╮
┃  📦 *𝐏𝐑𝐎𝐂𝐄𝐒𝐒𝐈𝐍𝐆...* 📦
┣━━━━━━━━━━━━━━━━━━━━┛
┃
┃ 🔄 *Preparing download...*
┃
┃ ⏳ Please wait, this may
┃    take a few seconds.
┃
┃ 📌 Trying GitHub first...
┃
╰━━━━━━━━━━━━━━━━━━━━╯`
            });
            
            try {
                // FIRST: Try GitHub direct download
                const githubSuccess = await downloadFromGitHub(sock, chatId, safeMessage, safeKey);
                
                if (githubSuccess) {
                    // Delete processing message
                    try { await sock.sendMessage(chatId, { delete: processingMsg.key }); } catch(e) {}
                    return;
                }
                
                // SECOND: Try remote zip URL from settings
                const settings = loadSettings();
                if (settings.updateZipUrl) {
                    try {
                        const response = await axios({
                            method: 'GET',
                            url: settings.updateZipUrl,
                            responseType: 'arraybuffer',
                            timeout: 120000
                        });
                        
                        if (response.data) {
                            const zipBuffer = Buffer.from(response.data);
                            const zipName = `MickeyGlitch_Remote_${Date.now()}.zip`;
                            
                            await sock.sendMessage(chatId, {
                                document: zipBuffer,
                                mimetype: 'application/zip',
                                fileName: zipName,
                                caption: `✅ *ZIP READY (Remote)*\n\n📦 Size: ${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB`
                            }, { quoted: safeMessage });
                            
                            try { await sock.sendMessage(chatId, { delete: processingMsg.key }); } catch(e) {}
                            return;
                        }
                    } catch(e) {
                        console.log('Remote URL failed:', e.message);
                    }
                }
                
                // THIRD: Create local zip stream
                await sock.sendMessage(chatId, {
                    text: `🔄 *Creating local archive...*\n\nThis may take a moment...`
                });
                
                const zipInfo = await createProjectZipStream();
                
                await sock.sendMessage(chatId, {
                    document: zipInfo.stream,
                    mimetype: 'application/zip',
                    fileName: zipInfo.name,
                    caption: `╭━━━━━━━━━━━━━━━━━━━━╮
┃  ✅ *𝐙𝐈𝐏 𝐑𝐄𝐀𝐃𝐘* ✅
┣━━━━━━━━━━━━━━━━━━━━┛
┃
┃ 📦 *File:* ${zipInfo.name}
┃ 📁 *Files:* ${zipInfo.fileCount} files
┃ 📊 *Format:* ZIP (Streamed)
┃
┃ 💡 *Extract with any ZIP tool*
┃
╰━━━━━━━━━━━━━━━━━━━━╯`
                }, { quoted: safeMessage });
                
                // Also send installer script for panels without unzip
                try {
                    const installer = createInstallerScript();
                    await sock.sendMessage(chatId, {
                        document: installer.buffer,
                        mimetype: 'application/javascript',
                        fileName: installer.name,
                        caption: `📜 *Alternative Installer*\n\nRun: node ${installer.name}\n\n(For panels without unzip utility)`
                    }, { quoted: safeMessage });
                } catch(instErr) {
                    console.log('Installer creation skipped:', instErr.message);
                }
                
                // Delete processing message
                try { await sock.sendMessage(chatId, { delete: processingMsg.key }); } catch(e) {}
                
            } catch (error) {
                console.error('Download error:', error);
                await sock.sendMessage(chatId, {
                    text: `❌ *Download Failed!*\n\nError: ${error.message || 'Unknown error'}\n\n📌 Clone directly from:\n${CONFIG.REPO_URL}`
                });
                try { await sock.sendMessage(chatId, { delete: processingMsg.key }); } catch(e) {}
            }
            return;
        }
        
        // ==========================================
        // HANDLE VIEW REPO
        // ==========================================
        if (action === 'view' || action === '.view_repo' || action === 'view_repo') {
            try {
                await sock.sendMessage(chatId, { 
                    react: { text: '📂', key: safeKey } 
                });
            } catch(e) {}
            
            const settings = loadSettings();
            
            await sock.sendMessage(chatId, {
                text: `╭━━━━━━━━━━━━━━━━━━━━╮
┃  📂 *𝐆𝐈𝐓𝐇𝐔𝐁 𝐑𝐄𝐏𝐎* 📂
┣━━━━━━━━━━━━━━━━━━━━┛
┃
┃ 🔗 *URL:*
┃ ${CONFIG.REPO_URL}
┃
┃ 📊 *Repo Stats:*
┃ • Stars ⭐ | Forks 🔱
┃ • Open Source ✅
┃ • MIT License 📜
┃
┃ 🚀 *Commands to clone:*
┃ git clone ${CONFIG.REPO_URL}
┃ cd Mickey-Glitch
┃ npm install
┃ npm start
┃
╰━━━━━━━━━━━━━━━━━━━━╯

🌟 *Star & Fork to support!*`
            }, { quoted: safeMessage });
            return;
        }
        
        // ==========================================
        // HANDLE STAR (Open GitHub)
        // ==========================================
        if (action === 'star' || action === '.repo_star' || action === 'repo_star') {
            await sock.sendMessage(chatId, {
                text: `⭐ *Star on GitHub*\n\n🔗 ${CONFIG.REPO_URL}\n\nClick the ⭐ button on GitHub to support this project!\n\nYour support keeps the project alive! 🚀`
            }, { quoted: safeMessage });
            return;
        }
        
        // ==========================================
        // MAIN MENU (.repo)
        // ==========================================
        if (action === '.repo' || action === 'repo' || action === 'menu') {
            // Send reaction
            try {
                await sock.sendMessage(chatId, { 
                    react: { text: '📂', key: safeKey } 
                });
            } catch(e) {}
            
            try {
                await sendRepoMenu(sock, chatId, safeMessage);
            } catch (error) {
                console.error('Menu error:', error);
                // Fallback menu
                await sock.sendMessage(chatId, {
                    text: `📂 *Repository Menu*\n\n1️⃣ Download Zip\n2️⃣ View Repo\n3️⃣ Star on GitHub\n\nSend:\n.download_zip\n.view_repo\n.repo_star`
                }, { quoted: safeMessage });
            }
            return;
        }
        
        // ==========================================
        // IF NOT MATCHED, SHOW MENU
        // ==========================================
        if (action && action !== '') {
            await sock.sendMessage(chatId, {
                text: `❌ *Unknown option: ${action}*\n\n📝 *Use .repo to see available options*`
            });
        }
        
    } catch (error) {
        console.error("❌ Repo Command Error:", error);
        try {
            await sock.sendMessage(chatId, {
                text: `╭━━━━━━━━━━━━━━━━━━━━╮
┃  ❌ *𝐄𝐑𝐑𝐎𝐑* ❌
┣━━━━━━━━━━━━━━━━━━━━┛
┃
┃ 🔴 *Something went wrong!*
┃
┃ 📝 *Error:* ${error.message?.substring(0, 100) || 'Unknown'}
┃
┃ 💡 *Try:*
┃ • Use .repo again
┃ • Check connection
┃ • Clone from GitHub directly
┃
╰━━━━━━━━━━━━━━━━━━━━╯`
            });
        } catch(e) {}
    }
}

module.exports = repoCommand;