const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { PassThrough } = require('stream');
const { prepareWAMessageMedia } = require('@whiskeysockets/baileys');
const { sendInteractiveMessage } = require('gifted-btns'); // Npm uliyotaka ikuepo

const CONFIG = {
    FOOTER: '🪐 ᴍɪᴄᴋᴇʏ ɢʟɪᴛᴄʜ ᴍᴅ • 𝟸𝟶𝟸𝟼 🪐',
    REPO_URL: 'https://github.com/Mickeydeveloper/Mickey-Glitch',
    BANNER: 'https://raw.githubusercontent.com/Mickeydeveloper/water-billing/main/1761205727440.jpg'
};

// Mfumo wa kutengeneza ZIP moja kwa moja kutoka kwenye RAM (Streaming)
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

        // KUGUNDUA INPUT (Inasoma meseji za kawaida na majibu ya button kutoka kwenye lib/buttonLoader)
        let input = (
            safeM.message?.conversation || 
            safeM.message?.extendedTextMessage?.text || 
            safeM.message?.buttonsResponseMessage?.selectedButtonId ||
            safeM.message?.templateButtonReplyMessage?.selectedId ||
            body || ''
        ).toLowerCase().trim();

        // Kuchuja kama kuna interactive response inayokuja moja kwa moja kutoka WhatsApp
        if (safeM.message?.interactiveResponseBody?.nativeFlowSearchResult?.selectedButtonId) {
            input = safeM.message.interactiveResponseBody.nativeFlowSearchResult.selectedButtonId.toLowerCase().trim();
        }

        // Kurekebisha payload ziendane vizuri
        if (input === 'download_zip' || input === '.download_zip') input = 'download_zip';
        if (input === 'view_repo' || input === '.view_repo') input = 'view_repo';
        if (input === 'repo' || input === '.repo') input = 'repo';

        // 1. HANDLE DOWNLOAD ZIP BUTTON
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

        // 3. MAIN REPO MENU (.repo) -> Hapa ndio tunatumia ile NPM ya gifted-btns
        if (input === 'repo') {
            try { await sock.sendMessage(chatId, { react: { text: '📂', key: safeKey } }); } catch(e) {}

            // 👑 PREMIUM LOOK & APPEARANCE LAYOUT
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

            // Kulazimisha picha iandandaliwe mapema (Inazuia "payload invalid" au "blank screen")
            const media = await prepareWAMessageMedia({ image: { url: CONFIG.BANNER } }, { upload: sock.waUploadToServer });

            // Payload maalum na thabiti ya gifted-btns npm
            const interactiveMessage = {
                text: statusMessage,
                footer: CONFIG.FOOTER,
                header: {
                    title: "🛸 ᴍɪᴄᴋᴇʏ ɢʟɪᴛᴄʜ ᴍᴀɪɴғʀᴀᴍᴇ",
                    hasMediaAttachment: true,
                    imageMessage: media.imageMessage
                },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "quick_reply",
                            buttonParamsJson: JSON.stringify({
                                display_text: "📦 ᴅᴏᴡɴʟᴏᴀᴅ ᴢɪᴘ",
                                id: "download_zip"
                            })
                        },
                        {
                            name: "quick_reply",
                            buttonParamsJson: JSON.stringify({
                                display_text: "📂 ᴠɪᴇᴡ ʀᴇᴘᴏ",
                                id: "view_repo"
                            })
                        }
                    ]
                }
            };

            const sendOptions = safeM?.key ? { quoted: safeM } : {};

            // Kutuma ujumbe kwa nguvu ya juu kupitia npm ya gifted-btns
            return await sendInteractiveMessage(sock, chatId, interactiveMessage, sendOptions);
        }

    } catch (e) {
        console.error("Repo Command Error:", e);
    }
}

module.exports = repoCommand;
