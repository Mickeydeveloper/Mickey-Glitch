/**
 * repo.js - GitHub Repo Info with Buttons
 * Fixed for Baileys Native Flow
 */

const axios = require('axios');
const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

const repoCache = new Map();

async function fetchThumbnail(url) {
    try {
        const res = await axios.get(url, { 
            responseType: 'arraybuffer', 
            timeout: 8000 
        });
        return Buffer.from(res.data);
    } catch (e) {
        return null;
    }
}

async function repoCommand(sock, chatId, message) {
    if (!sock || !chatId) return;

    try {
        // Logic ya kudownload zip kama ilivyokuwa
        const interactiveResponse = message.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
        if (interactiveResponse) {
            const responseData = JSON.parse(interactiveResponse);
            const buttonId = responseData.id;

            if (buttonId === "download_zip") {
                const cachedRepo = repoCache.get(chatId);
                if (!cachedRepo) return sock.sendMessage(chatId, { text: '❌ *Session expired (Session imekwisha).*' });
                
                await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });
                const zipUrl = `https://github.com/${cachedRepo.owner.login}/${cachedRepo.name}/archive/refs/heads/${cachedRepo.default_branch || 'main'}.zip`;
                const zipRes = await axios.get(zipUrl, { responseType: 'arraybuffer', timeout: 60000 });

                return await sock.sendMessage(chatId, {
                    document: Buffer.from(zipRes.data),
                    mimetype: 'application/zip',
                    fileName: `${cachedRepo.name}.zip`,
                    caption: `✅ *${cachedRepo.name}.zip Ready!*`
                }, { quoted: message });
            }
        }

        await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } });

        const [repoRes, thumb] = await Promise.all([
            axios.get('https://api.github.com/repos/Mickeydeveloper/Mickey-Glitch', {
                headers: { 'User-Agent': 'MickeyBot' },
                timeout: 10000
            }),
            fetchThumbnail('https://github.com/Mickeydeveloper.png')
        ]);

        const repo = repoRes.data;
        repoCache.set(chatId, repo);

        const repoText = `✨ *${repo.name.toUpperCase()}*\n\n` +
            `👤 *Owner:* ${repo.owner.login}\n` +
            `⭐ *Stars:* ${repo.stargazers_count}\n` +
            `🍴 *Forks:* ${repo.forks_count}\n\n` +
            `📌 *Desc:* ${repo.description || 'No desc'}`;

        // Jenga Interactive Message
        let msg = generateWAMessageFromContent(chatId, {
            viewOnceMessage: {
                message: {
                    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                        body: proto.Message.InteractiveMessage.Body.fromObject({
                            text: repoText
                        }),
                        footer: proto.Message.InteractiveMessage.Footer.fromObject({
                            text: "Quantum Base • Mickey Glitch"
                        }),
                        header: proto.Message.InteractiveMessage.Header.fromObject({
                            title: "MICKEY GLITCH V3.0.5",
                            hasMediaAttachment: false
                        }),
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                            buttons: [
                                {
                                    name: "cta_url",
                                    buttonParamsJson: JSON.stringify({
                                        display_text: "🌐 Visit Repo",
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
                        }),
                        contextInfo: {
                            externalAdReply: {
                                title: "MICKEY GLITCH",
                                body: "Official Repo Info",
                                thumbnail: thumb,
                                mediaType: 1,
                                sourceUrl: repo.html_url,
                                renderLargerThumbnail: true
                            }
                        }
                    })
                }
            }
        }, { quoted: message });

        await sock.relayMessage(chatId, msg.message, { messageId: msg.key.id });
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error('[REPO ERROR]', err);
        await sock.sendMessage(chatId, { text: '🚨 *Error fetching data (Imeshindwa kupata data)!*' });
    }
}

module.exports = repoCommand;
