// commands/repo.js
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { PassThrough } = require('stream');

// ==========================================
// CLASS YA BUTTONV2 (Kipande ulichopewa)
// ==========================================
class ButtonV2 {
    constructor(core) {
        this.core = core; // Hapa core ni sock (WhatsApp Connection)
        this.title = '';
        this.subtitle = '';
        this.body = '';
        this.footer = '';
        this.thumbnail = '';
        this.buttons = [];
    }

    setTitle(title) { this.title = title; return this; }
    setSubtitle(subtitle) { this.subtitle = subtitle; return this; }
    setBody(body) { this.body = body; return this; }
    setFooter(footer) { this.footer = footer; return this; }
    setThumbnail(url) { this.thumbnail = url; return this; }
    
    addButton(displayText, commandId) {
        this.buttons.push({
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
                display_text: displayText,
                id: commandId
            })
        });
        return this;
    }

    async send(jid) {
        if (!this.core?.sendMessage) {
            console.error("❌ ButtonV2 Error: Core connection (sock) is missing or invalid.");
            return;
        }

        // Muundo thabiti wa WhatsApp Interactive Message unaokubalika sasa hivi
        const interactiveMessage = {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        header: {
                            title: this.title,
                            hasMediaAttachment: !!this.thumbnail,
                            ...(this.thumbnail ? { imageMessage: { url: this.thumbnail } } : {})
                        },
                        body: { text: this.body },
                        footer: { text: this.footer },
                        nativeFlowMessage: {
                            buttons: this.buttons,
                            messageVersion: 1
                        }
                    }
                }
            }
        };

        return await this.core.sendMessage(jid, interactiveMessage);
    }
}

const CONFIG = {
    FOOTER: '🌟 MICKEY GLITCH BOT • 2026 🌟',
    REPO_URL: 'https://github.com/MICKEYGLITCH/Mickey-Glitch-Bot'
};

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

            const statusMessage = `╭━━━━━━━━━━━━━━━━━━╮\n┃    📂 *REPO MENU* 📂\n┃━━━━━━━━━━━━━━━━━━\n┃\n┃ 🤖 *Bot:* MICKEY GLITCH\n┃ 📦 *Version:* 3.3\n┃ 📁 *Files:* Complete Source\n┃ 💾 *Size:* ~15-20 MB\n┃\n┃ 🔗 *GitHub:* \n┃ ${CONFIG.REPO_URL}\n┃\n╰━━━━━━━━━━━━━━━━━━╯`.trim();

            return await new ButtonV2(ctx.core)
                .setTitle('🚀 Artoria')
                .setSubtitle('Artoria Pendragon')
                .setBody(statusMessage)
                .setFooter(CONFIG.FOOTER)
                .setThumbnail('https://raw.githubusercontent.com/Mickeydeveloper/water-billing/main/1761205727440.png')
                .addButton('📦 Download Zip', 'download_zip')
                .addButton('📂 View Repo', 'view_repo')
                .send(userJid);
        }

    } catch (e) {
        console.error("Repo Command Error:", e);
    }
}

module.exports = repoCommand;
