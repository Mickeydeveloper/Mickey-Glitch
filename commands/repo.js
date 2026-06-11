const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { sendInteractiveMessage } = require('gifted-btns');

const CONFIG = {
    FOOTER: '⭐ 𝐌𝐈𝐂𝐊𝐄𝐘 𝐆𝐋𝐈𝐓𝐂𝐇 𝐁𝐎𝐓 • 𝟐𝟎𝟐𝟔 ⭐',
    REPO_URL: 'https://github.com/Mickeydeveloper/Mickey-Glitch',
    BANNER: 'https://raw.githubusercontent.com/Mickeydeveloper/water-billing/main/1761205727440.jpg',
    ZIP_URL: 'https://github.com/Mickeydeveloper/Mickey-Glitch/archive/refs/heads/main.zip'
};

async function sendSafeInteractiveMessage(sock, chatId, payload, options = {}) {
    try {
        return await sendInteractiveMessage(sock, chatId, payload, options);
    } catch (error) {
        console.warn('Repo interactive fallback used:', error?.message || error);
        if (payload?.text) {
            await sock.sendMessage(chatId, { text: payload.text, footer: payload.footer }, options);
        }
    }
}

function loadSettings() {
    const defaultSettings = { botName: '𝐌𝐈𝐂𝐊𝐄𝐘 𝐆𝐋𝐈𝐓𝐂𝐇', version: '3.3.0' };
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
    return { stars: 25, forks: 60 };
}

async function repoCommand(sock, chatId, message) {
    try {
        const settings = loadSettings();
        const stats = await getRepoStats();
        const safeMessage = message || {};

        const repoText = `📂 *${settings.botName} - SCRIPT INFO*\n\n` +
                         `🤖 *Bot:* ${settings.botName}\n` +
                         `📦 *Version:* ${settings.version}\n\n` +
                         `📊 *GitHub Stats:*\n` +
                         `• ⭐ Stars: ${stats.stars}\n` +
                         `• 🔱 Forks: ${stats.forks}\n\n` +
                         `🔗 Tumia link za chini kupata source code au download ya haraka.`;

        // Payload safi na fupi kuzuia "payload invalid" error
        const interactiveMessage = {
            text: repoText,
            footer: CONFIG.FOOTER,
            header: {
                hasMediaAttachment: true,
                imageMessage: { url: CONFIG.BANNER }
            },
            interactiveButtons: [
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📋 COPY REPO LINK",
                        id: "cp_link",
                        copy_text: CONFIG.REPO_URL
                    })
                },
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "🔗 OPEN GITHUB",
                        id: "op_git",
                        url: CONFIG.REPO_URL
                    })
                },
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📦 DOWNLOAD ZIP",
                        id: "dl_zip",
                        url: CONFIG.ZIP_URL
                    })
                }
            ]
        };

        return await sendSafeInteractiveMessage(sock, chatId, interactiveMessage, { quoted: safeMessage });
    } catch (error) {
        console.error("❌ Repo Error:", error);
        await sock.sendMessage(chatId, { text: `❌ Hitilafu: ${error.message}` });
    }
}

module.exports = repoCommand;
