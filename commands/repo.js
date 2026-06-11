const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { sendInteractiveMessage } = require('gifted-btns');

// ==========================================
// CONFIGURATION & SETTINGS
// ==========================================
const CONFIG = {
    FOOTER: '⭐ 𝐌𝐈𝐂𝐊𝐄𝐘 𝐆𝐋𝐈𝐓𝐂𝐇 𝐁𝐎𝐓 • 𝟐𝟎𝟐𝟔 ⭐',
    REPO_URL: 'https://github.com/Mickeydeveloper/Mickey-Glitch',
    BANNER: 'https://raw.githubusercontent.com/Mickeydeveloper/water-billing/main/1761205727440.png',
    ZIP_URL: 'https://github.com/Mickeydeveloper/Mickey-Glitch/archive/refs/heads/main.zip'
};

function loadSettings() {
    try {
        const settingsPath = path.join(__dirname, '..', 'settings.js');
        if (fs.existsSync(settingsPath)) {
            const settings = require('../settings');
            return {
                botName: settings.botName || settings.botname || '𝐌𝐈𝐂𝐊𝐄𝐘 𝐆𝐋𝐈𝐓𝐂𝐇',
                version: settings.version || '3.3.0'
            };
        }
    } catch (e) {
        console.error('Settings load error:', e);
    }
    return { botName: '𝐌𝐈𝐂𝐊𝐄𝐘 𝐆𝐋𝐈𝐓𝐂𝐇', version: '3.3.0' };
}

async function getRepoStats() {
    try {
        const response = await axios.get('https://api.github.com/repos/Mickeydeveloper/Mickey-Glitch', {
            timeout: 5000,
            headers: { 'User-Agent': 'Mickey-Glitch-Bot', 'Accept': 'application/vnd.github.v3+json' }
        });
        if (response.status === 200 && response.data) {
            return {
                stars: response.data.stargazers_count || 0,
                forks: response.data.forks_count || 0,
                issues: response.data.open_issues_count || 0
            };
        }
    } catch (e) {
        console.error('GitHub API error:', e.message);
    }
    return { stars: 20, forks: 50, issues: 5 };
}

// ==========================================
// MAIN COMMAND HANDLER
// ==========================================
async function repoCommand(sock, chatId, message, body = '') {
    try {
        const safeMessage = message || {};
        const safeKey = safeMessage.key || { remoteJid: chatId };

        // Input detection
        let input = '';
        if (body && typeof body === 'string') {
            input = body.toLowerCase().trim();
        } else if (safeMessage.message) {
            const msg = safeMessage.message;
            input = msg.conversation || msg.extendedTextMessage?.text || 
                    msg.buttonsResponseMessage?.selectedButtonId || 
                    msg.listResponseMessage?.singleSelectReply?.selectedRowId || 
                    msg.interactiveResponseMessage?.nativeFlowResponseMessage?.name || '';
        }
        
        const cleanInput = input.replace(/^\./, '').toLowerCase().trim();

        // 1. ACTION: COPY REPO URL
        if (['repo_copy_url', 'copy_repo', 'copy'].includes(cleanInput)) {
            await sock.sendMessage(chatId, { react: { text: '📋', key: safeKey } }).catch(() => {});
            return await sock.sendMessage(chatId, {
                text: `📋 *Repo URL imekopiwa!*\n\n🔗 *Link:* ${CONFIG.REPO_URL}\n\n💡 Unaweza kuipaste sasa hivi.`
            }, { quoted: safeMessage });
        }

        // 2. MAIN MENU (.repo)
        if (['repo', '', 'menu'].includes(cleanInput)) {
            await sock.sendMessage(chatId, { react: { text: '📂', key: safeKey } }).catch(() => {});
            
            const settings = loadSettings();
            const stats = await getRepoStats();

            // Muonekano mdogo (Minimalist Text)
            const menuText = `📂 *${settings.botName} - REPOSITORY*\n\n` +
                             `🤖 *Bot:* ${settings.botName}\n` +
                             `📦 *Version:* ${settings.version}\n\n` +
                             `📊 *GitHub Statistics:*\n` +
                             `• ⭐ Stars: ${stats.stars}\n` +
                             `• 🔱 Forks: ${stats.forks}\n` +
                             `• ⚠️ Issues: ${stats.issues}\n\n` +
                             `Bonyeza button hapo chini kupata script.`;

            const interactiveMessage = {
                image: { url: CONFIG.BANNER },
                text: menuText,
                footer: CONFIG.FOOTER,
                contextInfo: {
                    externalAdReply: {
                        title: `${settings.botName} • GitHub`,
                        body: `⭐ ${stats.stars} Stars | 🔱 ${stats.forks} Forks`,
                        thumbnailUrl: CONFIG.BANNER,
                        sourceUrl: CONFIG.REPO_URL,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                        showAdAttribution: true
                    }
                },
                interactiveButtons: [
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📋 COPY REPO URL",
                            id: "repo_copy_url",
                            copy_text: CONFIG.REPO_URL
                        })
                    },
                    {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "🔗 OPEN ON GITHUB",
                            id: "repo_open_url",
                            url: CONFIG.REPO_URL
                        })
                    },
                    {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📦 DOWNLOAD ZIP",
                            id: "repo_download_zip_url",
                            url: CONFIG.ZIP_URL
                        })
                    }
                ]
            };

            return await sendInteractiveMessage(sock, chatId, interactiveMessage, { quoted: safeMessage });
        }

    } catch (error) {
        console.error("❌ Repo Command Error:", error);
        await sock.sendMessage(chatId, { text: `❌ Hitilafu imetokea: ${error.message}` });
    }
}

module.exports = repoCommand;
