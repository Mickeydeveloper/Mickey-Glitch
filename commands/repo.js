// commands/repo.js
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { PassThrough } = require('stream');
const axios = require('axios');
const { sendInteractiveMessage } = require('gifted-btns');

// ==========================================
// CONFIG
// ==========================================
const CONFIG = {
    FOOTER: '⭐ 𝐌𝐈𝐂𝐊𝐄𝐘 𝐆𝐋𝐈𝐓𝐂𝐇 𝐁𝐎𝐓 • 𝟐𝟎𝟐𝟔 ⭐',
    REPO_URL: 'https://github.com/Mickeydeveloper/Mickey-Glitch',
    BANNER: 'https://raw.githubusercontent.com/Mickeydeveloper/water-billing/main/1761205727440.png',
    EXCLUDE_DIRS: ['node_modules', 'temp', '.git', 'sessions', 'cache', 'logs', 'uploads', 'tmp', 'backup'],
    MAX_ZIP_SIZE: 50 * 1024 * 1024
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
    } catch (e) {}
    return {
        botName: '𝐌𝐈𝐂𝐊𝐄𝐘 𝐆𝐋𝐈𝐓𝐂𝐇',
        version: '3.3.0',
        updateZipUrl: null,
        ownerNumber: '255612130873'
    };
}

// ==========================================
// SEND INTERACTIVE MENU - CTA BUTTONS
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
╠════════════════════════════╣
║  📌 *Tap buttons below*     ║
╚════════════════════════════╝`;

        // CTA BUTTONS - 3 tu
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
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📋 𝐂𝐎𝐏𝐘 𝐑𝐄𝐏𝐎",
                        id: "repo_copy",
                        copy_text: CONFIG.REPO_URL
                    })
                },
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "🔗 𝐎𝐏𝐄𝐍 𝐑𝐄𝐏𝐎",
                        id: "repo_open",
                        url: CONFIG.REPO_URL
                    })
                },
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📦 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃 𝐙𝐈𝐏",
                        id: "repo_download"
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
// CREATE ZIP STREAM
// ==========================================
function createProjectZipStream() {
    return new Promise((resolve, reject) => {
        const timestamp = Date.now();
        const zipFileName = `MickeyGlitch_Bot_${timestamp}.zip`;
        const archive = archiver('zip', { zlib: { level: 9 } });
        const passthrough = new PassThrough();
        
        archive.on('error', (err) => reject(err));
        archive.pipe(passthrough);
        
        const projectDir = path.join(__dirname, '..');
        let fileCount = 0;
        
        function addDirectory(dirPath, archivePath = '') {
            try {
                const items = fs.readdirSync(dirPath);
                for (const item of items) {
                    if (CONFIG.EXCLUDE_DIRS.includes(item) || item.startsWith('.')) continue;
                    
                    const fullPath = path.join(dirPath, item);
                    let stat;
                    try { stat = fs.statSync(fullPath); } catch(e) { continue; }
                    
                    const relativePath = archivePath ? path.join(archivePath, item) : item;
                    
                    if (stat.isDirectory()) {
                        addDirectory(fullPath, relativePath);
                    } else {
                        if (stat.size > 10 * 1024 * 1024) continue;
                        try {
                            archive.file(fullPath, { name: relativePath });
                            fileCount++;
                        } catch(e) {}
                    }
                }
            } catch(e) {}
        }
        
        try {
            addDirectory(projectDir);
            archive.finalize();
            resolve({ stream: passthrough, name: zipFileName, fileCount });
        } catch(err) {
            reject(err);
        }
    });
}

// ==========================================
// DOWNLOAD FROM GITHUB
// ==========================================
async function downloadFromGitHub(sock, chatId, quotedMsg) {
    try {
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
        const safeMessage = message || {};
        const safeKey = safeMessage.key || { remoteJid: chatId };
        
        // INPUT DETECTION
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
                }
            } catch(e) {}
        }
        
        // Button ID mapping
        const buttonActions = {
            'repo_copy': 'copy',
            'repo_open': 'open', 
            'repo_download': 'download',
            'copy_repo': 'copy',
            'open_repo': 'open',
            'download_zip': 'download'
        };
        
        let action = buttonActions[input] || input;
        
        console.log('📂 Repo Command:', { input, action });
        
        // ==========================================
        // HANDLE COPY REPO (CTA COPY)
        // ==========================================
        if (action === 'copy' || action === '.copy_repo') {
            try {
                await sock.sendMessage(chatId, { 
                    react: { text: '📋', key: safeKey } 
                });
            } catch(e) {}
            
            await sock.sendMessage(chatId, {
                text: `╭━━━━━━━━━━━━━━━━━━━━╮
┃  📋 *𝐑𝐄𝐏𝐎 𝐂𝐎𝐏𝐈𝐄𝐃* 📋
┣━━━━━━━━━━━━━━━━━━━━┛
┃
┃ 🔗 *URL:* 
┃ ${CONFIG.REPO_URL}
┃
┃ ✅ *URL copied to clipboard!*
┃
┃ 📌 *Paste anywhere to share*
┃
╰━━━━━━━━━━━━━━━━━━━━╯

💡 *Or use:*
git clone ${CONFIG.REPO_URL}`
            }, { quoted: safeMessage });
            return;
        }
        
        // ==========================================
        // HANDLE OPEN REPO (CTA URL)
        // ==========================================
        if (action === 'open' || action === '.open_repo') {
            try {
                await sock.sendMessage(chatId, { 
                    react: { text: '🔗', key: safeKey } 
                });
            } catch(e) {}
            
            await sock.sendMessage(chatId, {
                text: `╭━━━━━━━━━━━━━━━━━━━━╮
┃  🔗 *𝐎𝐏𝐄𝐍 𝐑𝐄𝐏𝐎* 🔗
┣━━━━━━━━━━━━━━━━━━━━┛
┃
┃ 📂 *GitHub Repository:*
┃ ${CONFIG.REPO_URL}
┃
┃ 🌟 *Star & Fork to support!*
┃
┃ 📌 *Click the link above*
┃    to open in browser
┃
╰━━━━━━━━━━━━━━━━━━━━╯`
            }, { quoted: safeMessage });
            return;
        }
        
        // ==========================================
        // HANDLE DOWNLOAD ZIP
        // ==========================================
        if (action === 'download' || action === '.download_zip' || action === 'download_zip') {
            try {
                await sock.sendMessage(chatId, { 
                    react: { text: '📦', key: safeKey } 
                });
            } catch(e) {}
            
            const processingMsg = await sock.sendMessage(chatId, {
                text: `╭━━━━━━━━━━━━━━━━━━━━╮
┃  📦 *𝐏𝐑𝐄𝐏𝐀𝐑𝐈𝐍𝐆...* 📦
┣━━━━━━━━━━━━━━━━━━━━┛
┃
┃ 🔄 *Creating download package*
┃ ⏳ Please wait...
┃
╰━━━━━━━━━━━━━━━━━━━━╯`
            });
            
            try {
                // Try GitHub first
                const githubSuccess = await downloadFromGitHub(sock, chatId, safeMessage);
                
                if (githubSuccess) {
                    try { await sock.sendMessage(