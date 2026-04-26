/**
 * repo.js - Repository Information with Button Support
 * Shows GitHub repo info with interactive buttons
 */
const axios = require('axios');
const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

const repoCache = new Map();

async function repoCommand(sock, chatId, message) {
    if (!sock || !chatId) return;

    try {
        await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } });

        const repoRes = await axios.get('https://api.github.com/repos/Mickeydeveloper/Mickey-Glitch', {
            headers: { 'User-Agent': 'MickeyBot' }
        });

        const repo = repoRes.data;
        repoCache.set(chatId, repo);

        // Clean text only - no extra formatting
        const repoText = `✨ *${repo.name.toUpperCase()}*\n\n` +
            `👤 *Owner:* ${repo.owner.login}\n` +
            `⭐ *Stars:* ${repo.stargazers_count}\n` +
            `🍴 *Forks:* ${repo.forks_count}\n\n` +
            `📝 *Description:* ${repo.description || 'N/A'}\n` +
            `🌐 *URL:* ${repo.html_url}`;

        // Send message with buttons only
        let msg = generateWAMessageFromContent(chatId, {
            interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                body: proto.Message.InteractiveMessage.Body.fromObject({
                    text: repoText
                }),
                footer: proto.Message.InteractiveMessage.Footer.fromObject({
                    text: "Quantum Base • Mickey Glitch V3.0.5"
                }),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                    buttons: [
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({
                                display_text: "🌐 Visit GitHub",
                                url: repo.html_url
                            })
                        },
                        {
                            name: "quick_reply",
                            buttonParamsJson: JSON.stringify({
                                display_text: "📋 Menu",
                                id: ".menu"
                            })
                        }
                    ]
                })
            })
        }, { quoted: message });

        await sock.relayMessage(chatId, msg.message, { messageId: msg.key.id });
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error('Repo Error:', err);
        await sock.sendMessage(chatId, { text: `❌ *Error fetching repo data.*` });
    }
}

module.exports = repoCommand;
