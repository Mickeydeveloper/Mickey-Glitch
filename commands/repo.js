const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { generateWAMessageFromContent, prepareWAMessageMedia } = require('@whiskeysockets/baileys');

const CONFIG = {
    FOOTER: '👑 ᴍɪᴄᴋᴇʏ ɢʟɪᴛᴄʜ ʙᴏᴛ • 𝟸𝟶𝟸𝟼 👑',
    REPO_URL: 'https://github.com/Mickeydeveloper/Mickey-Glitch',
    BANNER: 'https://raw.githubusercontent.com/Mickeydeveloper/water-billing/main/1761205727440.jpg',
    ZIP_URL: 'https://github.com/Mickeydeveloper/Mickey-Glitch/archive/refs/heads/main.zip'
};

function loadSettings() {
    const defaultSettings = { botName: 'ᴍɪᴄᴋᴇʏ ɢʟɪᴛᴄʜ', version: '3.3.0' };
    try {
        const settingsPath = path.join(__dirname, '..', 'settings.js');
        if (fs.existsSync(settingsPath)) {
            return { ...defaultSettings, ...require('../settings') };
        }
    } catch (e) {}
    return defaultSettings;
}

async function getRepoStats() {
    try {
        const res = await axios.get('https://api.github.com/repos/Mickeydeveloper/Mickey-Glitch', {
            timeout: 4000,
            headers: { 'User-Agent': 'Mickey-Bot' }
        });
        if (res.status === 200 && res.data) {
            return { stars: res.data.stargazers_count || 0, forks: res.data.forks_count || 0 };
        }
    } catch (e) {}
    return { stars: 38, forks: 85 };
}

async function repoCommand(sock, chatId, message) {
    try {
        const settings = loadSettings();
        const stats = await getRepoStats();

        const repoText = `✨ *${settings.botName.toUpperCase()} - SCRIPT INFO* ✨\n\n` +
                         `🛸 *Bᴏᴛ Nᴀᴍᴇ :* ${settings.botName}\n` +
                         `📦 *Vᴇʀsɪᴏɴ  :* ${settings.version}\n` +
                         `💎 *Mᴏᴅᴇ     :* Public\n\n` +
                         `📊 *GɪᴛHᴜʙ Sᴛᴀᴛs:*\n` +
                         `│  ⭐ *Sᴛᴀʀs :* ${stats.stars}\n` +
                         `│  🔱 *Fᴏʀᴋs :* ${stats.forks}\n` +
                         `└───────────────┈⊷\n\n` +
                         `💬 _Gusa button zilizopo chini kupata source code au kudownload script kwa haraka._`;

        const media = await prepareWAMessageMedia({ image: { url: CONFIG.BANNER } }, { upload: sock.waUploadToServer });

        let msg = generateWAMessageFromContent(chatId, {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        body: { text: repoText },
                        footer: { text: CONFIG.FOOTER },
                        header: {
                            hasMediaAttachment: true,
                            imageMessage: media.imageMessage
                        },
                        nativeFlowMessage: {
                            buttons: [
                                {
                                    name: "cta_copy",
                                    buttonParamsJson: JSON.stringify({
                                        display_text: "📋 COPY REPO LINK",
                                        id: "copy_repo_link",
                                        copy_text: CONFIG.REPO_URL
                                    })
                                },
                                {
                                    name: "cta_url",
                                    buttonParamsJson: JSON.stringify({
                                        display_text: "🌐 VISIT REPO",
                                        url: CONFIG.REPO_URL
                                    })
                                },
                                {
                                    name: "cta_url",
                                    buttonParamsJson: JSON.stringify({
                                        display_text: "📦 DOWNLOAD ZIP",
                                        url: CONFIG.ZIP_URL
                                    })
                                }
                            ]
                        }
                    }
                }
            }
        }, { quoted: message });

        return await sock.relayMessage(chatId, msg.message, { messageId: msg.key.id });

    } catch (error) {
        console.error("❌ Repo Error:", error);
        await sock.sendMessage(chatId, { text: `❌ Hitilafu ya Repo: ${error.message}` });
    }
}

module.exports = repoCommand;
