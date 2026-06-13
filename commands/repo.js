const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { PassThrough } = require('stream');

// ==========================================
// CLASS YA BUTTONV2 (Iliyorekebishwa na Kupewa Nguvu)
// ==========================================
class ButtonV2 {
    constructor(core) {
        this.core = core; // sock (WhatsApp Connection)
        this.title = '';
        this.body = '';
        this.footer = '';
        this.thumbnail = '';
        this.buttons = [];
    }

    setTitle(title) { this.title = title; return this; }
    setSubtitle(subtitle) { return this; } // Baileys ya sasa haina subtitle ya moja kwa moja kwenye header ya picha
    setBody(body) { this.body = body; return this; }
    setFooter(footer) { this.footer = footer; return this; }
    setThumbnail(url) { this.thumbnail = url; return this; }
    
    // Aliyebadilisha quick_reply kuwa cta_url au muundo unaoitika haraka
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

    async send(jid, quotedMessage = null) {
        if (!this.core?.sendMessage) {
            console.error("❌ ButtonV2 Error: Core connection (sock) is missing.");
            return;
        }

        // Muundo wa Uhakika 100% unaozibua Blank Screen kwenye WhatsApp zote
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

        const options = quotedMessage ? { quoted: quotedMessage } : {};
        return await this.core.sendMessage(jid, interactiveMessage, options);
    }
}

const CONFIG = {
    FOOTER: '🪐 ᴍɪᴄᴋᴇʏ ɢʟɪᴛᴄʜ ᴍᴅ • 𝟸𝟶𝟸𝟼 🪐',
    REPO_URL: 'https://github.com/Mickeydeveloper/Mickey-Glitch',
    BANNER: 'https://raw.githubusercontent.com/Mickeydeveloper/water-billing/main/1761205727440.jpg'
};

// Function yako ya kurejesha Zip ya Bot kama stream (Haikuguswa kwa usalama wake)
function createProjectZipStream() {
    const timestamp = Date.now();
    const zipFileName = `MickeyGlitch_Bot_${timestamp}.zip`;
    const archive = archiver('zip', { zlib: { level: 9 } });
    const passthrough = new PassThrough();

    archive.on('error', err => passthrough.emit('error', err));
    archive.pipe(passthrough);

    (async () => {
        try {
            const projectDir = path.join(__dirname, '..');
            const excludeDirs = ['node_modules', 'temp', '.git', 'sessions', 'session', 'cache', 'logs', 'uploads'];

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
                } catch (e) {}
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

        // TAMBUA INPUT (Inasoma maandishi yote na majibu ya vifungo vyako vya quick_reply)
        let input = (
            safeM.message?.conversation || 
            safeM.message?.extendedTextMessage?.text || 
            safeM.message?.buttonsResponseMessage?.selectedButtonId ||
            safeM.message?.templateButtonReplyMessage?.selectedId ||
            body || ''
        ).toLowerCase().trim();

        // Kuchuja kama kuna interactive response inayokuja moja kwa moja kutoka kwenye mfumo wa lib/buttonLoader
        if (safeM.message?.interactiveResponseBody?.nativeFlowSearchResult?.selectedButtonId) {
            input = safeM.message.interactiveResponseBody.nativeFlowSearchResult.selectedButtonId.toLowerCase().trim();
        }

        // Kurekebisha payload za button kama zikija bila doti (.) au zikija zikiwa fupi
        if (input === 'download_zip' || input === '.download_zip') input = 'download_zip';
        if (input === 'view_repo' || input === '.view_repo') input = 'view_repo';
        if (input === 'repo' || input === '.repo') input = 'repo';

        // 1. HANDLE DOWNLOAD ZIP BUTTON (streamed - haina kuandika disk)
        if (input === 'download_zip') {
            try { await sock.sendMessage(chatId, { react: { text: '📦', key: safeKey } }); } catch(e) {}

            const processingMsg = await sock.sendMessage(chatId, {
                text: '📦 *INATENGENEZWA...*\n\nNinaandaa archive ya bot kutoka kwenye mfumo mkuu (Direct RAM Stream). Tafadhali subiri sekunde chache...'
            });

            try {
                const zipStreamInfo = createProjectZipStream();

                await sock.sendMessage(chatId, {
                    document: zipStreamInfo.stream,
                    mimetype: 'application/zip',
                    fileName: zipStreamInfo.name,
                    caption: `✅ *ZIP STREAM READY!*\n\n📦 *File:* ${zipStreamInfo.name}\n📁 *Source:* Complete bot source code`
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
        if (input === 'view_repo') {
            try { await sock.sendMessage(chatId, { react: { text: '🌐', key: safeKey } }); } catch(e) {}
            return await sock.sendMessage(chatId, {
                text: `🛸 *MICKEY GLITCH GITHUB REPOSITORY* 🛸\n\n✨ *Link:* ${CONFIG.REPO_URL}\n\n_Hakikisha unabonyeza *Star (⭐)* na *Fork (🔱)* kwenye GitHub ili kuunga mkono kazi yetu na kupata updates zote mapema!_`
            }, { quoted: safeM });
        }

        // 3. MAIN REPO MENU (.repo)
        if (input === 'repo') {
            try { await sock.sendMessage(chatId, { react: { text: '📂', key: safeKey } }); } catch(e) {}

            // Urembo wa nguvu ya juu (Premium Layout Appearance)
            const statusMessage = `✨ *MICKEY GLITCH - SCRIPT REPOSITORY* ✨\n\n` +
                                 `┏━━━━━━━━━━━━━━━━━━━━━━┓\n` +
                                 `┃ 🛸 *ʙᴏᴛ ɴᴀᴍᴇ :* ᴍɪᴄᴋᴇʏ ɢʟɪᴛᴄʜ ᴍᴅ\n` +
                                 `┃ 📦 *ᴠᴇʀsɪᴏɴ  :* 𝟹.𝟹.𝟶\n` +
                                 `┃ 💎 *ᴍᴏᴅᴇ     :* ᴘᴜʙʟɪᴄ\n` +
                                 `┗━━━━━━━━━━━━━━━━━━━━━━┛\n\n` +
                                 `📊 *ɢɪᴛʜᴜʙ sᴛᴀᴛɪsᴛɪᴄs:*\n` +
                                 ` ├── ⭐ *sᴛᴀʀs :* 38+\n` +
                                 ` └── 🔱 *ғᴏʀᴋs :* 85+\n\n` +
                                 `📢 *ɪɴғᴏ:* Gusa vifungo vilivyopo hapo chini ili kupata faili la siri la bot ama kutembelea akaunti kuu ya GitHub kwa haraka.`;

            // Kutuma ujumbe kupitia Class yako iliyosafishwa
            return await new ButtonV2(sock)
                .setTitle('🛸 ᴍɪᴄᴋᴇʏ ɢʟɪᴛᴄʜ ᴍᴀɪɴғʀᴀᴍᴇ')
                .setBody(statusMessage)
                .setFooter(CONFIG.FOOTER)
                .setThumbnail(CONFIG.BANNER)
                .addButton('📦 Download Zip', 'download_zip')
                .addButton('📂 View Repo', 'view_repo')
                .send(userJid, safeM);
        }

    } catch (e) {
        console.error("Repo Command Error:", e);
    }
}

module.exports = repoCommand;
