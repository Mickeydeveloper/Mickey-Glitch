/**
 * repo.js - GitHub Repo Info with Buttons
 * Command: .repo
 */

const axios = require('axios');

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
        const interactiveResponse = message.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;

        if (interactiveResponse) {
            const responseData = JSON.parse(interactiveResponse);
            const buttonId = responseData.id || responseData.button_id;

            if (buttonId === "download_zip") {
                const cachedRepo = repoCache.get(chatId);
                if (!cachedRepo) {
                    return sock.sendMessage(chatId, { text: '❌ *Session imekwisha. Tumia .repo tena.*' }, { quoted: message });
                }

                await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });
                const zipUrl = `https://github.com/${cachedRepo.owner.login}/${cachedRepo.name}/archive/refs/heads/${cachedRepo.default_branch || 'main'}.zip`;
                const zipRes = await axios.get(zipUrl, { responseType: 'arraybuffer', timeout: 60000 });

                await sock.sendMessage(chatId, {
                    document: Buffer.from(zipRes.data),
                    mimetype: 'application/zip',
                    fileName: `${cachedRepo.name}.zip`,
                    caption: `✅ *${cachedRepo.name}.zip Imepakuliwa!*`
                }, { quoted: message });
                return;
            }
        }

        await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } });

        const [repoRes, thumbnail] = await Promise.all([
            axios.get('https://api.github.com/repos/Mickeydeveloper/Mickey-Glitch', {
                headers: { 'User-Agent': 'MickeyBot', 'Accept': 'application/vnd.github.v3+json' },
                timeout: 10000
            }),
            fetchThumbnail('https://github.com/Mickeydeveloper.png')
        ]);

        const repo = repoRes.data;
        repoCache.set(chatId, repo);

        const repoText = `✨ *${repo.name.toUpperCase()}*\n\n` +
            `👤 *Owner:* ${repo.owner.login}\n` +
            `⭐ *Stars:* ${repo.stargazers_count}\n` +
            `🍴 *Forks:* ${repo.forks_count}\n` +
            `📅 *Created:* ${new Date(repo.created_at).toLocaleDateString('en-GB')}\n` +
            `🔄 *Last Updated:* ${new Date(repo.updated_at).toLocaleDateString('en-GB')}\n\n` +
            `🔗 *Repo Link:* ${repo.html_url}\n\n` +
            `📌 *Description:*\n${repo.description || 'No description available'}`;

        // Native Flow Message (New Button Format)
        const msg = {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        header: {
                            title: "MICKEY GLITCH V3.0.5",
                            hasMediaAttachment: true,
                            ...(thumbnail && { jpegThumbnail: thumbnail })
                        },
                        body: { text: repoText },
                        footer: { text: "Quantum Base • Mickey Glitch" },
                        nativeFlowMessage: {
                            buttons: [
                                {
                                    name: "cta_url",
                                    buttonParamsJson: JSON.stringify({
                                        display_text: "🌐 Visit Repository",
                                        url: repo.html_url,
                                        merchant_url: repo.html_url
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
                        },
                        contextInfo: {
                            externalAdReply: {
                                title: "MICKEY GLITCH",
                                body: "Official Repo Info",
                                thumbnail: thumbnail || undefined,
                                mediaType: 1,
                                sourceUrl: repo.html_url,
                                renderLargerThumbnail: true,
                                showAdAttribution: false // Ad imeondolewa hapa
                            }
                        }
                    }
                }
            }
        };

        await sock.sendMessage(chatId, msg, { quoted: message });
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error('[REPO ERROR]', err.message);
        await sock.sendMessage(chatId, { text: '🚨 *Imeshindwa kupata taarifa!*' }, { quoted: message });
    }
}

module.exports = repoCommand;
