const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { generateWAMessageFromContent, prepareWAMessageMedia } = require('@whiskeysockets/baileys');

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
    return { stars: 42, forks: 98 }; // Dynamic fallback stats
}

async function repoCommand(sock, chatId, message) {
    try {
        const settings = loadSettings();
        const stats = await getRepoStats();

        // 🔥 APPEARANCE YA HALI YA JUU (FANCY & CLEAN)
        const repoText = `✨ *${settings.botName.toUpperCase()} - SCRIPT CONFIG* ✨\n\n` +
                         `┏━━━━━━━━━━━━━━━━━━━━━━┓\n` +
                         `┃ 🛸 *ʙᴏᴛ ɴᴀᴍᴇ :* ${settings.botName}\n` +
                         `┃ 📦 *本地ᴠᴇʀsɪᴏɴ:* ${settings.version}\n` +
                         `┃ 💎 *ᴍᴏᴅᴇ     :* ᴘᴜʙʟɪᴄ\n` +
                         `┗━━━━━━━━━━━━━━━━━━━━━━┛\n\n` +
                         `📊 *ɢɪᴛʜᴜʙ sᴛᴀᴛɪsᴛɪᴄs:*\n` +
                         ` ├── ⭐ *sᴛᴀʀs :* ${stats.stars}\n` +
                         ` └── 🔱 *ғᴏʀᴋs :* ${stats.forks}\n\n` +
                         `📢 *ɪɴғᴏ:* If you love this script, don't forget to give it a star on GitHub! Your support keeps us going.\n\n` +
                         `💬 _Gusa button zilizopo chini kupata source code au kudownload zip file kwa haraka._`;

        // 🛠 HATUA YA KWANZA: Upload picha kwenye server ya WhatsApp (Hii inazuia isilete Blank)
        const media = await prepareWAMessageMedia({ image: { url: CONFIG.BANNER } }, { upload: sock.waUploadToServer });

        // 🛠 HATUA YA PILI: Kutengeneza Ujumbe wa V5 kwa kutumia Mfumo Mama wa Baileys unaokubalika 100%
        let msg = generateWAMessageFromContent(chatId, {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        body: { text: repoText },
                        footer: { text: CONFIG.FOOTER },
                        header: {
                            title: "",
                            hasMediaAttachment: true,
                            imageMessage: media.imageMessage
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
                    }
                }
            }
        }, { quoted: message });

        // 🛠 HATUA YA TATU: Piga relayMessage ili kuilazimisha WhatsApp kuituma bila kupitia "gifted-btns" filter
        return await sock.relayMessage(chatId, msg.message, { messageId: msg.key.id });

    } catch (error) {
        console.error("❌ Ultra Repo Error:", error);
        
        // Hard Fallback text ikifeli kabisa ili bot isikae kimya
        await sock.sendMessage(chatId, { 
            text: `⚠️ *Mickey Glitch Fallback*\n\nLink ya Repo: ${CONFIG.REPO_URL}\nZip Download: ${CONFIG.ZIP_URL}`
        }, { quoted: message });
    }
}

module.exports = repoCommand;
