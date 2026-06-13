const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { sendInteractiveMessage } = require('gifted-btns');

const CONFIG = {
    FOOTER: '🪐 ᴍɪᴄᴋᴇʏ ɢʟɪᴛᴄʜ ᴍᴅ • 𝟸𝟶𝟸𝟼 🪐',
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

        // 🌟 MUONEKANO MPYA WA KUVUTIA NA PREMIUM APPEARANCE
        const repoText = `✨ *${settings.botName.toUpperCase()} - SCRIPT CONFIG* ✨\n\n` +
                         `┏━━━━━━━━━━━━━━━━━━━━━━┓\n` +
                         `┃ 🛸 *ʙᴏᴛ ɴᴀᴍᴇ :* ${settings.botName}\n` +
                         `┃ 📦 *ᴠᴇʀsɪᴏɴ  :* ${settings.version}\n` +
                         `┃ 💎 *ᴍᴏᴅᴇ     :* ᴘᴜʙʟɪᴄ\n` +
                         `┗━━━━━━━━━━━━━━━━━━━━━━┛\n\n` +
                         `📊 *ɢɪᴛʜᴜʙ sᴛᴀᴛɪsᴛɪᴄs:*\n` +
                         ` ├── ⭐ *sᴛᴀʀs :* ${stats.stars}\n` +
                         ` └── 🔱 *ғᴏʀᴋs :* ${stats.forks}\n\n` +
                         `📢 *ɪɴғᴏ:* If you love this script, don't forget to give it a star on GitHub! Your support keeps us going.\n\n` +
                         `💬 _Gusa button zilizopo chini kupata source code au kudownload zip file kwa haraka._`;

        // Muundo safi wa button unaoendana na npm ya gifted-btns kwa sasa
        const interactiveMessage = {
            text: repoText,
            footer: CONFIG.FOOTER,
            header: {
                hasMediaAttachment: true,
                imageMessage: { url: CONFIG.BANNER }
            },
            nativeFlowMessage: {
                buttons: [
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📋 ᴄᴏᴘʏ ʀᴇᴘᴏ ʟɪɴᴋ",
                            id: "copy_repo_link",
                            copy_text: CONFIG.REPO_URL
                        })
                    },
                    {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "🌐 ᴠɪsɪᴛ ɢɪᴛʜᴜʙ",
                            url: CONFIG.REPO_URL
                        })
                    },
                    {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📦 ᴅᴏᴡɴʟᴏᴀᴅ sᴄʀɪᴘᴛ (ᴢɪᴘ)",
                            url: CONFIG.ZIP_URL
                        })
                    }
                ]
            }
        };

        const sendOptions = message?.key ? { quoted: message } : {};
        
        // Kutuma kwa kutumia npm ya gifted-btns
        return await sendInteractiveMessage(sock, chatId, interactiveMessage, sendOptions);

    } catch (error) {
        console.error("❌ Repo Error:", error);
        await sock.sendMessage(chatId, { text: `❌ Hitilafu ya Repo: ${error.message}` });
    }
}

module.exports = repoCommand;
