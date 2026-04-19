const axios = require('axios');

async function fetchThumbnail(url) {
    if (!url) return null;
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 8000 });
        return Buffer.from(res.data);
    } catch (e) {
        return null;
    }
}

async function sendRepoInteractive(sock, chatId, repo, thumbnail, quotedMsg) {
    // Muundo wa maandishi ulioboreshwa (Stylized Text)
    const repoText = `✨ *${repo.name.toUpperCase()}* ✨\n\n` +
                     `📝 *Description:* ${repo.description || 'No description available'}\n` +
                     `👤 *Author:* ${repo.owner.login}\n` +
                     `⭐ *Stars:* ${repo.stargazers_count}\n` +
                     `🍴 *Forks:* ${repo.forks_count}\n` +
                     `📅 *Created:* ${new Date(repo.created_at).toLocaleDateString()}\n` +
                     `🔄 *Last Update:* ${new Date(repo.updated_at).toLocaleDateString()}\n\n` +
                     `*POWERED BY MICKEY GLITCH V3.0.5*`;

    // Kutengeneza ujumbe wa Interactive kwa njia sahihi (Fixing Invalid Media Type)
    const msg = {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    header: {
                        title: "Mickey Infor Tech",
                        hasMediaAttachment: !!thumbnail,
                        ...(thumbnail && { imageMessage: (await sock.prepareWAMessageMedia({ image: thumbnail }, { upload: sock.waUploadToServer })).imageMessage })
                    },
                    body: { text: repoText },
                    footer: { text: "Tap buttons below to explore 🚀" },
                    nativeFlowMessage: {
                        buttons: [
                            {
                                name: "cta_url",
                                buttonParamsJson: JSON.stringify({
                                    display_text: "🌐 Open Repository",
                                    url: repo.html_url
                                })
                            },
                            {
                                name: "cta_copy",
                                buttonParamsJson: JSON.stringify({
                                    display_text: "📋 Copy Repo Link",
                                    copy_code: repo.html_url
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
                    }
                }
            }
        }
    };

    return await sock.sendMessage(chatId, msg, { quoted: quotedMsg });
}

async function repoCommand(sock, chatId, message) {
    if (!sock) return;

    const body = message.message?.conversation || 
                 message.message?.extendedTextMessage?.text || 
                 message.message?.buttonsResponseMessage?.selectedButtonId || 
                 message.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson || "";

    let command = body.trim().toLowerCase();
    if (body.includes('download_zip')) command = 'download_zip';

    try {
        if (command === 'download_zip' || command === '.download_zip') {
            const repoData = global.repoCache?.[chatId];
            if (!repoData) return sock.sendMessage(chatId, { text: '❌ *Session expired! (Andika .repo tena)*' }, { quoted: message });

            await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

            const zipUrl = `https://github.com/${repoData.owner.login}/${repoData.name}/archive/refs/heads/${repoData.default_branch || 'main'}.zip`;
            const zipRes = await axios.get(zipUrl, { responseType: 'arraybuffer', timeout: 60000 });

            await sock.sendMessage(chatId, {
                document: Buffer.from(zipRes.data),
                mimetype: 'application/zip',
                fileName: `${repoData.name}.zip`,
                caption: `✅ *ZIP Downloaded Successfully!*\n📦 *Repo:* ${repoData.name}`
            }, { quoted: message });

            return sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
        }

        if (command === '.repo' || command === 'repo') {
            await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } });

            const repoRes = await axios.get('https://api.github.com/repos/Mickeydeveloper/Mickey-Glitch', {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 10000
            });

            const repoData = repoRes.data;
            if (!global.repoCache) global.repoCache = {};
            global.repoCache[chatId] = repoData;

            const thumbnail = await fetchThumbnail(repoData.owner.avatar_url);

            await sendRepoInteractive(sock, chatId, repoData, thumbnail, message);
            await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
        }
    } catch (err) {
        console.error('[REPO ERR]', err.message);
        await sock.sendMessage(chatId, { text: `🚨 *Error:* ${err.message}` }, { quoted: message });
    }
}

module.exports = repoCommand;
