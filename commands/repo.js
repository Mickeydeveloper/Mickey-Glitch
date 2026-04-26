/**
 * repo.js - Clean Version (No External Ad)
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

        const repoText = `✨ *${repo.name.toUpperCase()}*\n\n` +
            `👤 *Owner:* ${repo.owner.login}\n` +
            `⭐ *Stars:* ${repo.stargazers_count}\n` +
            `🍴 *Forks:* ${repo.forks_count}\n\n` +
            `🔗 *Url:* ${repo.html_url}`;

        let msg = generateWAMessageFromContent(chatId, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                        body: proto.Message.InteractiveMessage.Body.fromObject({
                            text: repoText
                        }),
                        footer: proto.Message.InteractiveMessage.Footer.fromObject({
                            text: "Quantum Base • Mickey Glitch"
                        }),
                        header: proto.Message.InteractiveMessage.Header.fromObject({
                            title: "MICKEY GLITCH V3",
                            hasMediaAttachment: false
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
                                        display_text: "📥 Download ZIP",
                                        id: "download_zip"
                                    })
                                }
                            ]
                        })
                    })
                }
            }
        }, { quoted: message });

        await sock.relayMessage(chatId, msg.message, { messageId: msg.key.id });
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error('Repo Error:', err);
        await sock.sendMessage(chatId, { text: `❌ *Error fetching repo data.*` });
    }
}

module.exports = repoCommand;
