const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { sendInteractiveMessage } = require('gifted-btns'); // Imebaki kama ulivyoomba

const CONFIG = {
    FOOTER: '👑 ᴍɪᴄᴋᴇʏ ɢʟɪᴛᴄʜ ʙᴏᴛ • 𝟸𝟶𝟸𝟼 👑',
    REPO_URL: 'https://github.com/Mickeydeveloper/Mickey-Glitch',
    BANNER: 'https://raw.githubusercontent.com/Mickeydeveloper/water-billing/main/1761205727440.jpg',
    ZIP_URL: 'https://github.com/Mickeydeveloper/Mickey-Glitch/archive/refs/heads/main.zip'
};

// Kazi ya kutuma ujumbe kwa usalama (Safe Send)
async function sendSafeInteractiveMessage(sock, chatId, payload, options = {}) {
    try {
        return await sendInteractiveMessage(sock, chatId, payload, options);
    } catch (error) {
        console.warn('⚠️ Fallback ya repo imetumika:', error?.message || error);
        if (payload?.text) {
            const fallbackOptions = options.quoted ? { quoted: options.quoted } : {};
            await sock.sendMessage(chatId, { 
                text: `${payload.text}\n\n_${payload.footer}_` 
            }, fallbackOptions);
        }
    }
}

// Kupakia mipangilio (Settings)
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

// Kupata takwimu za GitHub (Stars & Forks)
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
    return { stars: 25, forks: 60 }; // Default stats zikifeli
}

async function repoCommand(sock, chatId, message) {
    try {
        const settings = loadSettings();
        const stats = await getRepoStats();

        // 🌟 MUONEKANO MPYA NA WA KUVUTIA (Fancy Text Style)
        const repoText = `✨ *${settings.botName.toUpperCase()} - SCRIPT INFO* ✨\n\n` +
                         `📌 *Bᴏᴛ Nᴀᴍᴇ :* ${settings.botName}\n` +
                         `📦 *Vᴇʀsɪᴏɴ  :* ${settings.version}\n` +
                         `🛸 *Mᴏᴅᴇ     :* Public\n\n` +
                         `📊 *GɪᴛHᴜʙ Sᴛᴀᴛs:*\n` +
                         `│  ⭐ *Sᴛᴀʀs :* ${stats.stars}\n` +
                         `│  🔱 *Fᴏʀᴋs :* ${stats.forks}\n` +
                         `└───────────────┈⊷\n\n` +
                         `💬 _Gusa button zilizopo chini kupata source code au kudownload script kwa haraka._`;

        // Muundo thabiti wa Interactive Message (V5/V6 compatible)
        const interactiveMessage = {
            text: repoText,
            footer: CONFIG.FOOTER,
            header: {
                hasMediaAttachment: true,
                imageMessage: { url: CONFIG.BANNER } // Banner picha
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
        };

        // Kuzuia undefined error ya 'quoted'
        const sendOptions = {};
        if (message && message.key) {
            sendOptions.quoted = message;
        }

        return await sendSafeInteractiveMessage(sock, chatId, interactiveMessage, sendOptions);
    } catch (error) {
        console.error("❌ Repo Command Error:", error);
        await sock.sendMessage(chatId, { text: `❌ Hitilafu: ${error.message}` });
    }
}

module.exports = repoCommand;
