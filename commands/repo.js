/**
 * repo.js - Repository Information with Enhanced Features
 * Shows comprehensive GitHub repo info with interactive buttons
 */
const axios = require('axios');
const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

const repoCache = new Map();

// Format date to readable format
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Get language color emoji
function getLanguageEmoji(language) {
    const emojis = {
        'JavaScript': '🟨',
        'TypeScript': '🔵',
        'Python': '🟦',
        'Java': '☕',
        'Go': '🔵',
        'Rust': '🦀',
        'PHP': '💜',
        'C++': '⚙️',
        'Shell': '💻'
    };
    return emojis[language] || '📝';
}

async function repoCommand(sock, chatId, message) {
    if (!sock || !chatId) return;

    try {
        await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } });

        const repoRes = await axios.get('https://api.github.com/repos/Mickeydeveloper/Mickey-Glitch', {
            headers: { 'User-Agent': 'MickeyBot' }
        });

        const repo = repoRes.data;
        repoCache.set(chatId, repo);

        // Build comprehensive repo information
        const repoText = `✨ *${repo.name.toUpperCase()}*\n\n` +
            `👤 *Owner:* ${repo.owner.login}\n` +
            `⭐ *Stars:* ${repo.stargazers_count.toLocaleString()}\n` +
            `🍴 *Forks:* ${repo.forks_count.toLocaleString()}\n` +
            `👁️ *Watchers:* ${repo.watchers_count.toLocaleString()}\n` +
            `🐛 *Open Issues:* ${repo.open_issues_count}\n\n` +
            `${getLanguageEmoji(repo.language)} *Language:* ${repo.language || 'Not specified'}\n` +
            `📜 *License:* ${repo.license?.name || 'N/A'}\n` +
            `📅 *Last Updated:* ${formatDate(repo.updated_at)}\n\n` +
            `📝 *Description:*\n${repo.description || 'No description available'}\n\n` +
            `🔗 *Repository:* ${repo.html_url}`;

        // Send message with enhanced buttons
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
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({
                                display_text: "🐛 Open Issues",
                                url: `${repo.html_url}/issues`
                            })
                        },
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({
                                display_text: "👥 Contributors",
                                url: `${repo.html_url}/graphs/contributors`
                            })
                        },
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({
                                display_text: "📚 Clone",
                                url: repo.clone_url
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
        await sock.sendMessage(chatId, { text: `❌ *Error fetching repo data.*\n\n_${err.message}_` });
    }
}

module.exports = repoCommand;
