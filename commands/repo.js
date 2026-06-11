// commands/repo.js
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { PassThrough } = require('stream');
const axios = require('axios');
const { sendInteractiveMessage } = require('gifted-btns');

// ==========================================
// CONFIGURATION
// ==========================================
const CONFIG = {
    FOOTER: '⭐ 𝐌𝐈𝐂𝐊𝐄𝐘 𝐆𝐋𝐈𝐓𝐂𝐇 𝐁𝐎𝐓 • 𝟐𝟎𝟐𝟔 ⭐',
    REPO_URL: 'https://github.com/Mickeydeveloper/Mickey-Glitch',
    BANNER: 'https://raw.githubusercontent.com/Mickeydeveloper/water-billing/main/1761205727440.png',
    ZIP_URL: 'https://github.com/Mickeydeveloper/Mickey-Glitch/archive/refs/heads/main.zip',
    EXCLUDE_DIRS: ['node_modules', 'temp', '.git', 'sessions', 'cache', 'logs', 'uploads', 'tmp', 'backup'],
    MAX_ZIP_SIZE: 50 * 1024 * 1024
};

// ==========================================
// LOAD SETTINGS
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
// GET REPO STATS FROM GITHUB API
// ==========================================
async function getRepoStats() {
    try {
        const response = await axios({
            method: 'GET',
            url: 'https://api.github.com/repos/Mickeydeveloper/Mickey-Glitch',
            timeout: 5000,
            headers: {
                'User-Agent': 'Mickey-Glitch-Bot',
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (response.status === 200 && response.data) {
            return {
                stars: response.data.stargazers_count || 0,
                forks: response.data.forks_count || 0,
                watchers: response.data.watchers_count || 0,
                size: response.data.size || 0,
                updated: response.data.updated_at || new Date().toISOString()
            };
        }
    } catch (error) {
        console.error('GitHub API error:', error.message);
    }
    
    return {
        stars: 20,
        forks: 50,
        watchers: 10,
        size: 15000,
        updated: new Date().toISOString()
    };
}

// ==========================================
// SEND INTERACTIVE MENU WITH CTA BUTTONS
// ==========================================
async function sendRepoMenu(sock, chatId, quotedMsg) {
    try {
        const settings = loadSettings();
        const stats = await getRepoStats();
        
        const menuText = `╔════════════════════════════════════════╗
║         📂 *𝐑𝐄𝐏𝐎𝐒𝐈𝐓𝐎𝐑𝐘 𝐌𝐄𝐍𝐔* 📂         ║
╠════════════════════════════════════════╣
║                                        ║
║  🤖 *Bot:* ${settings.botName}                    ║
║  📦 *Version:* ${settings.version}                      ║
║                                        ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
║                                        ║
║  📊 *GitHub Stats:*                    ║
║  • ⭐ Stars: ${stats.stars}                           ║
║  • 🔱 Forks: ${stats.forks}                           ║
║  • 👁️ Watchers: ${stats.watchers}                      ║
║                                        ║
║  📁 *Repository Info:*                 ║
║  • Size: ~${Math.floor(stats.size / 1024)} MB                    ║
║  • Language: JavaScript 100%          ║
║  • License: MIT                       ║
║                                        ║
║  🔗 *Repository URL:*                  ║
║  ${CONFIG.REPO_URL} ║
║                                        ║
╠════════════════════════════════════════╣
║  📌 *Tap buttons below to interact*     ║
╚════════════════════════════════════════╝`;

        const interactiveMessage = {
            image: { url: CONFIG.BANNER },
            text: menuText,
            footer: CONFIG.FOOTER,
            contextInfo: {
                externalAdReply: {
                    title: `${settings.botName} • GitHub Repository`,
                    body: `⭐ ${stats.stars} Stars | 🔱 ${stats.forks} Forks`,
                    thumbnailUrl: CONFIG.BANNER,
                    sourceUrl: CONFIG.REPO_URL,
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    showAdAttribution: true
                }
            },
            interactiveButtons: [
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📋 𝐂𝐎𝐏𝐘 𝐑𝐄𝐏𝐎 𝐔𝐑𝐋",
                        id: "repo_copy_url",
                        copy_text: CONFIG.REPO_URL
                    })
                },
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "🔗 𝐎𝐏𝐄𝐍 𝐎𝐍 𝐆𝐈𝐓𝐇𝐔𝐁",
                        id: "repo_open_url",
                        url: CONFIG.REPO_URL
                    })
                },
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
                        display_text: "📊 𝐕𝐈𝐄𝐖 𝐒𝐓𝐀𝐓𝐒",
                        id: "repo_view_stats"
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
// SEND SIMPLE TEXT MENU (FALLBACK)
// ==========================================
async function sendTextMenu(sock, chatId, quotedMsg) {
    const stats = await getRepoStats();
    
    const textMenu = `╔════════════════════════════════════════╗
║         📂 *𝐑𝐄𝐏𝐎𝐒𝐈𝐓𝐎𝐑𝐘 𝐌𝐄𝐍𝐔* 📂         ║
╠════════════════════════════════════════╣
║                                        ║
║  📊 *GitHub Stats:*                    ║
║  • ⭐ Stars: ${stats.stars}                           ║
║  • 🔱 Forks: ${stats.forks}                           ║
║  • 👁️ Watchers: ${stats.watchers}                      ║
║                                        ║
║  🔗 *Repository URL:*                  ║
║  ${CONFIG.REPO_URL}
║                                        ║
║  📦 *Download ZIP:*                    ║
║  ${CONFIG.ZIP_URL}
║                                        ║
╠════════════════════════════════════════╣
║  📌 *Commands:*                        ║
║  • .copy_repo - Copy URL              ║
║  • .view_repo - Open GitHub           ║
║  • .download_zip - Get source code    ║
║  • .repo_stats - View statistics      ║
╚════════════════════════════════════════╝`;

    await sock.sendMessage(chatId, { text: textMenu }, { quoted: quotedMsg });
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
        const response = await axios({
            method: 'GET',
            url: CONFIG.ZIP_URL,
            responseType: 'arraybuffer',
            timeout: 120000,
            maxContentLength: CONFIG.MAX_ZIP_SIZE,
            headers: {
                'User-Agent': 'Mickey-Glitch-Bot',
                'Accept': 'application/zip'
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
┃  ✅ *𝐙𝐈𝐏 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃𝐄𝐃* ✅
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
// VIEW STATS (Text Response)
// ==========================================
async function viewRepoStats(sock, chatId, quotedMsg, safeKey) {
    try {
        await sock.sendMessage(chatId, { react: { text: '📊', key: safeKey } }).catch(() => {});
        
        const stats = await getRepoStats();
        const updatedDate = new Date(stats.updated).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const statsText = `╔════════════════════════════════════════╗
║        📊 *𝐑𝐄𝐏𝐎𝐒𝐈𝐓𝐎𝐑𝐘 𝐒𝐓𝐀𝐓𝐒* 📊        ║
╠════════════════════════════════════════╣
║                                        ║
║  📈 *GitHub Metrics:*                  ║
║  • ⭐ Stars: ${stats.stars}                           ║
║  • 🔱 Forks: ${stats.forks}                           ║
║  • 👁️ Watchers: ${stats.watchers}                      ║
║                                        ║
║  📁 *Repository Info:*                 ║
║  • Size: ~${Math.floor(stats.size / 1024)} MB                    ║
║  • Language: JavaScript 100%          ║
║  • License: MIT                       ║
║                                        ║
║  🕐 *Last Updated:*                    ║
║  ${updatedDate}
║                                        ║
║  🔗 *Repository:*                      ║
║  ${CONFIG.REPO_URL}
║                                        ║
╠════════════════════════════════════════╣
║  💡 *Use .repo for full menu*           ║
╚════════════════════════════════════════╝`;
        
        await sock.sendMessage(chatId, { text: statsText }, { quoted: quotedMsg });
    } catch (error) {
        console.error('Stats view error:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to fetch repository stats' });
    }
}

// ==========================================
// MAIN COMMAND HANDLER
// ==========================================
async function repoCommand(sock, chatId, message, body = '') {
    try {
        const safeMessage = message || {};
        const safeKey = safeMessage.key || { remoteJid: chatId };
        
        // ========== INPUT DETECTION ==========
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
            } catch(e) {
                console.error('Input detection error:', e);
            }
        }
        
        // Remove dot prefix for comparison
        const cleanInput = input.replace(/^\./, '');
        
        console.log('📂 Repo Command:', { input: cleanInput, chatId });
        
        // ========== HANDLE COPY REPO URL (CTA Copy) ==========
        if (cleanInput === 'repo_copy_url' || cleanInput === 'copy_repo' || cleanInput === 'copy') {
            try {
                await sock.sendMessage(chatId, { react: { text: '📋', key: safeKey } }).catch(() => {});
            } catch(e) {}
            
            await sock.sendMessage(chatId, {
                text: `╭━━━━━━━━━━━━━━━━━━━━╮
┃  📋 *𝐑𝐄𝐏𝐎 𝐔𝐑𝐋 𝐂𝐎𝐏𝐈𝐄𝐃* 📋
┣━━━━━━━━━━━━━━━━━━━━┛
┃
┃ ✅ *URL has been copied!*
┃
┃ 🔗 ${CONFIG.REPO_URL}
┃
┃ 💡 *Paste anywhere to share*
┃    or use in your browser
┃
╰━━━━━━━━━━━━━━━━━━━━╯
                
📌 *Clone command:*
git clone ${CONFIG.REPO_URL}`
            }, { quoted: safeMessage });
            return;
        }
        
        // ========== HANDLE OPEN REPO (CTA URL) ==========
        if (cleanInput === 'repo_open_url' || cleanInput === 'view_repo' || cleanInput === 'open') {
            try {
                await sock.sendMessage(chatId, { react: { text: '🔗', key: safeKey } }).catch(() => {});
            } catch(e) {}
            
            await sock.sendMessage(chatId, {
                text: `╭━━━━━━━━━━━━━━━━━━━━╮
┃  🔗 *𝐎𝐏𝐄𝐍 𝐆𝐈𝐓𝐇𝐔𝐁* 🔗
┣━━━━━━━━━━━━━━━━━━━━┛
┃
┃ 📂 *Repository URL:*
┃ ${CONFIG.REPO_URL}
┃
┃ 🌟 *Don't forget to:*
┃ • ⭐ Star the repo
┃ • 🔱 Fork it
┃ • 👁️ Watch for updates
┃
┃ 📌 *Click the link above*
┃    to open in browser
┃
╰━━━━━━━━━━━━━━━━━━━━╯`
            }, { quoted: safeMessage });
            return;
        }
        
        // ========== HANDLE DOWNLOAD ZIP ==========
        if (cleanInput === 'repo_download_zip' || cleanInput === 'download_zip' || cleanInput === 'download') {
            try {
                await sock.sendMessage(chatId, { react: { text: '📦', key: safeKey } }).catch(() => {});
            } catch(e) {}
            
            const processingMsg = await sock.sendMessage(chatId, {
                text: `╭━━━━━━━━━━━━━━━━━━━━╮
┃  📦 *𝐏𝐑𝐄𝐏𝐀𝐑𝐈𝐍𝐆...* 📦
┣━━━━━━━━━━━━━━━━━━━━┛
┃
┃ 🔄 *Creating download package*
┃ ⏳ Please wait a moment...
┃
┃ 📌 *Fetching from GitHub...*
┃
╰━━━━━━━━━━━━━━━━━━━━╯`
            });
            
            try {
                // Try GitHub direct download first
                const githubSuccess = await downloadFromGitHub(sock, chatId, safeMessage);
                
                if (githubSuccess) {
                    try { await sock.sendMessage(chatId, { delete: processingMsg.key }); } catch(e) {}
                    return;
                }
                
                // If GitHub fails, send direct link
                await sock.sendMessage(chatId, {
                    text: `╭━━━━━━━━━━━━━━━━━━━━╮
┃  📦 *𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃 𝐙𝐈𝐏* 📦
┣━━━━━━━━━━━━━━━━━━━━┛
┃
┃ 🔗 *Direct Download Link:*
┃ ${CONFIG.ZIP_URL}
┃
┃ 📊 *Size:* ~15-20 MB
┃
┃ 💡 *Click the link above*
┃    to download directly
┃
┃ 📌 *Alternative:* Clone with Git
┃    git clone ${CONFIG.REPO_URL}
┃
╰━━━━━━━━━━━━━━━━━━━━╯`
                }, { quoted: safeMessage });
                
                try { await sock.sendMessage(chatId, { delete: processingMsg.key }); } catch(e) {}
                
            } catch (error) {
                console.error('Download error:', error);
                await sock.sendMessage(chatId, {
                    text: `❌ *Download Failed!*\n\n📌 Clone directly from GitHub:\n${CONFIG.REPO_URL}\n\n📦 Or download ZIP from:\n${CONFIG.ZIP_URL}`
                });
                try { await sock.sendMessage(chatId, { delete: processingMsg.key }); } catch(e) {}
            }
            return;
        }
        
        // ========== HANDLE VIEW STATS ==========
        if (cleanInput === 'repo_view_stats' || cleanInput === 'repo_stats' || cleanInput === 'stats') {
            await viewRepoStats(sock, chatId, safeMessage, safeKey);
            return;
        }
        
        // ========== MAIN MENU (.repo) ==========
        if (cleanInput === 'repo' || cleanInput === '' || cleanInput === 'menu') {
            try {
                await sock.sendMessage(chatId, { react: { text: '📂', key: safeKey } }).catch(() => {});
            } catch(e) {}
            
            try {
                await sendRepoMenu(sock, chatId, safeMessage);
            } catch (error) {
                console.error('Interactive menu error:', error);
                await sendTextMenu(sock, chatId, safeMessage);
            }
            return;
        }
        
        // ========== FALLBACK: Show menu if unknown command ==========
        if (cleanInput !== '') {
            await sock.sendMessage(chatId, {
                text: `❌ *Unknown command: ${input}*\n\n📝 *Use .repo to see available options*`
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
┃ • Clone directly: ${CONFIG.REPO_URL}
┃
╰━━━━━━━━━━━━━━━━━━━━╯`
            });
        } catch(e) {
            console.error('Failed to send error message:', e);
        }
    }
}

module.exports = repoCommand;