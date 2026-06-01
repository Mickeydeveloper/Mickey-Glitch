// commands/repo.js
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

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

// Function ya kutengeneza Zip ya Bot
async function createProjectZip() {
    return new Promise(async (resolve, reject) => {
        const timestamp = Date.now();
        const zipFileName = `MickeyGlitch_Bot_${timestamp}.zip`;
        const zipFilePath = path.join(__dirname, '../temp', zipFileName);
        const tempDir = path.join(__dirname, '../temp');

        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        try {
            const output = fs.createWriteStream(zipFilePath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', () => {
                resolve({ path: zipFilePath, size: archive.pointer(), name: zipFileName });
            });

            archive.on('error', reject);
            archive.pipe(output);

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
                            archive.directory(fullPath, relativePath);
                            addDirectory(fullPath, relativePath);
                        } else {
                            archive.file(fullPath, { name: relativePath });
                        }
                    }
                } catch(e) {}
            }

            addDirectory(projectDir);
            await archive.finalize();

        } catch (error) {
            reject(error);
        }
    });
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

        // 1. HANDLE DOWNLOAD ZIP BUTTON
        if (input === '.download_zip') {
            try { await sock.sendMessage(chatId, { react: { text: '📦', key: safeKey } }); } catch(e) {}

            const processingMsg = await sock.sendMessage(chatId, {
                text: '📦 *CREATING ZIP FILE...*\n\nTafadhali subiri ninaandaa ma-file ya bot...\n⏳ Hii inaweza kuchukua sekunde 10-20...'
            });

            try {
                const zipInfo = await createProjectZip();
                const zipBuffer = fs.readFileSync(zipInfo.path);
                const fileSizeMB = (zipInfo.size / (1024 * 1024)).toFixed(2);

                await sock.sendMessage(chatId, {
                    document: zipBuffer,
                    mimetype: 'application/zip',
                    fileName: zipInfo.name,
                    caption: `✅ *ZIP FILE READY!*\n\n📦 *File:* ${zipInfo.name}\n💾 *Size:* ${fileSizeMB} MB\n📁 *Files:* Complete bot source code\n\n🌟 *MICKEY GLITCH BOT*`
                }, { quoted: safeM });

                setTimeout(() => {
                    try { fs.unlinkSync(zipInfo.path); } catch(e) {}
                }, 5000);

                await sock.sendMessage(chatId, { delete: processingMsg.key });

            } catch (error) {
                console.error('Zip error:', error);
                await sock.sendMessage(chatId, {
                    text: `❌ *FAILED TO CREATE ZIP!*\n\nError: ${error.message}\n\n📌 Clone kutoka GitHub: ${CONFIG.REPO_URL}`
                });
            }
            return;
        }

        // 2. HANDLE VIEW REPO BUTTON
        if (input === '.view_repo') {
            return await sock.sendMessage(chatId, {
                text: `📂 *GITHUB REPOSITORY*\n\n🔗 ${CONFIG.REPO_URL}\n\n🌟 Star & Fork nifungulie njia mwanangu!`
            }, { quoted: safeM });
        }

        // 3. MAIN REPO MENU (.repo)
        if (input === '.repo') {
            try { await sock.sendMessage(chatId, { react: { text: '📂', key: safeKey } }); } catch(e) {}

            const statusMessage = `╭━━━━━━━━━━━━━━━━━━╮
┃    📂 *REPO MENU* 📂
┃━━━━━━━━━━━━━━━━━━
┃
┃ 🤖 *Bot:* MICKEY GLITCH
┃ 📦 *Version:* 3.3
┃ 📁 *Files:* Complete Source
┃ 💾 *Size:* ~15-20 MB
┃
┃ 🔗 *GitHub:* 
┃ ${CONFIG.REPO_URL}
┃
╰━━━━━━━━━━━━━━━━━━╯`.trim();

            // KUITA BUTTONV2 KIOTOMATIKI BILA ERROR
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
