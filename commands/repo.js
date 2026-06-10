// commands/repo.js
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { PassThrough } = require('stream');
const axios = require('axios');
const settings = require('../settings');
const { sendInteractiveMessage } = require('gifted-btns');

// ==========================================
// CONFIG
// ==========================================
const CONFIG = {
    FOOTER: '🌟 MICKEY GLITCH BOT • 2026 🌟',
    REPO_URL: 'https://github.com/Mickeydeveloper/Mickey-Glitch'
};

// ==========================================
// SEND INTERACTIVE MESSAGE (Using gifted-btns)
// ==========================================
async function sendRepoMenu(sock, chatId, quotedMsg, userJid) {
    try {
        const statusMessage = `╭━━━━━━━━━━━━━━━━━━╮
    ┃    📂 *REPO MENU* 📂
    ┃━━━━━━━━━━━━━━━━━━
    ┃
    ┃ 🤖 *Bot:* ${settings.botName || settings.botname || 'Mickey Glitch'}
    ┃ 📦 *Version:* ${settings.version || '3.3'}
    ┃ 📁 *Files:* Complete Source
    ┃ 💾 *Size:* ~15-20 MB
    ┃
    ┃ 🔗 *GitHub:* 
    ┃ ${settings.updateZipUrl || CONFIG.REPO_URL}
    ┃
    ╰━━━━━━━━━━━━━━━━━━╯`;

        const buttons = [
            {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                    display_text: '📦 Download Zip',
                    id: 'download_zip'
                })
            },
            {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                    display_text: '📂 View Repo',
                    id: 'view_repo'
                })
            }
        ];

        return await sendInteractiveMessage(sock, chatId, {
            image: { url: 'https://raw.githubusercontent.com/Mickeydeveloper/water-billing/main/1761205727440.png' },
            text: statusMessage,
            footer: CONFIG.FOOTER,
            contextInfo: {
                externalAdReply: {
                    title: `${settings.botName || settings.botname || 'Mickey Glitch'} • Repository`,
                    body: 'View or download the project on GitHub',
                    thumbnailUrl: 'https://raw.githubusercontent.com/Mickeydeveloper/water-billing/main/1761205727440.png',
                    sourceUrl: settings.updateZipUrl || CONFIG.REPO_URL
                }
            },
            interactiveButtons: buttons
        }, { quoted: quotedMsg });
    } catch (error) {
        console.error('Error sending repo menu:', error);
        throw error;
    }
}

// Function ya kutengeneza Zip ya Bot kama stream (haina kuandika disk)
function createProjectZipStream() {
    const timestamp = Date.now();
    const zipFileName = `MickeyGlitch_Bot_${timestamp}.zip`;
    const archive = archiver('zip', { zlib: { level: 9 } });
    const passthrough = new PassThrough();

    // Pipe archive output to pass-through so we can stream it directly
    archive.on('error', err => passthrough.emit('error', err));
    archive.pipe(passthrough);

    // Start adding files asynchronously (don't block)
    (async () => {
        try {
            const projectDir = path.join(__dirname, '..');
            const excludeDirs = ['node_modules', 'temp', '.git', 'sessions', 'cache', 'logs', 'uploads'];

            function addDirectory(dirPath, archivePath = '') {
                try {
                    const items = fs.readdirSync(dirPath);
                    for (const item of items) {
                        const fullPath = path.join(dirPath, item);
                        const stat = fs.statSync(fullPath);
                        const relativePath = archivePath ? path.join(archivePath, item) : item;

                        if (excludeDirs.includes(item) || item.startsWith('.')) continue;

                        if (stat.isDirectory()) {
                            addDirectory(fullPath, relativePath);
                        } else {
                            archive.file(fullPath, { name: relativePath });
                        }
                    }
                } catch (e) {
                    // ignore individual file errors
                }
            }

            addDirectory(projectDir);
            await archive.finalize();
        } catch (err) {
            try { archive.destroy(); } catch(e) {}
        }
    })();

    return { stream: passthrough, name: zipFileName };
}

// Main Command Handler
async function repoCommand(sock, chatId, m, body = '') {
    try {
        const safeM = m || {};
        const safeKey = safeM.key || {};
        const userJid = safeKey.remoteJid || chatId;

        // Funga kila kitu kwenye ctx object ili iendane na muundo wa ButtonV2 ulioutoa
        const ctx = {
            core: sock,
            _msg: safeM
        };

        // TAMBUA INPUT (Inasoma text na majibu ya button zote)
        let input = (
            safeM.message?.conversation || 
            safeM.message?.extendedTextMessage?.text || 
            safeM.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
            safeM.message?.buttonsResponseMessage?.selectedButtonId ||
            body || ''
        ).toLowerCase().trim();

        // Kurekebisha payload za button kama zikija bila doti (.)
        if (input === 'download_zip') input = '.download_zip';
        if (input === 'view_repo') input = '.view_repo';

        // 1. HANDLE DOWNLOAD ZIP BUTTON (streamed - haina kuandika disk)
        if (input === '.download_zip') {
            try { await sock.sendMessage(chatId, { react: { text: '📦', key: safeKey } }); } catch(e) {}

            const processingMsg = await sock.sendMessage(chatId, {
                text: '📦 *INATENGENEZWA...*\n\nNinaandaa archive ya bot (haitahifadhiwa kwenye disk). Tafadhali subiri...'
            });

            try {
                // First try fetching remote GitHub zip if configured
                const remoteZipUrl = settings.updateZipUrl || (CONFIG.REPO_URL ? `${CONFIG.REPO_URL.replace(/\/+$/,'')}/archive/refs/heads/main.zip` : null);
                if (remoteZipUrl) {
                    try {
                        const resp = await axios.get(remoteZipUrl, { responseType: 'arraybuffer', timeout: 120000 });
                        const buf = Buffer.from(resp.data);
                        const remoteName = `MickeyGlitch_GitHub_${Date.now()}.zip`;
                        await sock.sendMessage(chatId, {
                            document: buf,
                            mimetype: 'application/zip',
                            fileName: remoteName,
                            caption: `✅ *ZIP READY (GitHub)*\n\n📦 *File:* ${remoteName}\n📁 *Files:* Complete bot source code (from GitHub)`
                        }, { quoted: safeM });
                        try { await sock.sendMessage(chatId, { delete: processingMsg.key }); } catch(e) {}
                        return;
                    } catch (fetchErr) {
                        console.warn('Remote zip fetch failed, falling back to local archive:', fetchErr.message || fetchErr);
                    }
                }

                // Fallback: stream local project archive
                const zipStreamInfo = createProjectZipStream();

                await sock.sendMessage(chatId, {
                    document: zipStreamInfo.stream,
                    mimetype: 'application/zip',
                    fileName: zipStreamInfo.name,
                    caption: `✅ *ZIP STREAM READY!*\n\n📦 *File:* ${zipStreamInfo.name}\n📁 *Files:* Complete bot source code (streamed)`
                }, { quoted: safeM });

                try { await sock.sendMessage(chatId, { delete: processingMsg.key }); } catch(e) {}
            } catch (error) {
                console.error('Zip stream error:', error);
                await sock.sendMessage(chatId, {
                    text: `❌ *HAIKUWEZA KUANDAA ARCHIVE!*\n\nError: ${error.message || error}\n\n📌 Clone kutoka GitHub: ${CONFIG.REPO_URL}`
                });
            }
            return;
        }

        // 2. HANDLE VIEW REPO BUTTON
        if (input === '.view_repo') {
            return await sock.sendMessage(chatId, {
                text: `📂 *GITHUB REPOSITORY*\n\n🔗 ${CONFIG.REPO_URL}\n\n🌟 Star & Fork kwenda kutoa support!`
            }, { quoted: safeM });
        }

        // 3. MAIN REPO MENU (.repo)
        if (input === '.repo') {
            try { await sock.sendMessage(chatId, { react: { text: '📂', key: safeKey } }); } catch(e) {}

            try {
                await sendRepoMenu(sock, chatId, safeM, userJid);
            } catch (error) {
                console.error('Failed to send repo menu:', error);
                await sock.sendMessage(chatId, {
                    text: `📂 *GITHUB REPOSITORY*\n\n🔗 https://github.com/MICKEYGLITCH/Mickey-Glitch-Bot\n\n🌟 Star & Fork kwenda kutoa support!`
                }, { quoted: safeM });
            }
            return;
        }

    } catch (e) {
        console.error("Repo Command Error:", e);
        await sock.sendMessage(chatId, {
            text: `❌ Error processing repo command: ${e.message?.substring(0, 50) || 'Unknown error'}`
        }).catch(err => console.error('Failed to send error message:', err));
    }
}

module.exports = repoCommand;
