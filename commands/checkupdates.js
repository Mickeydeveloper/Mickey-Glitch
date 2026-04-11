const axios = require('axios');


async function fetchThumbnail(url) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
        return Buffer.from(res.data);
    } catch {
        return null;
    }
}


async function sendRepoInteractive(sock, chatId, repo, thumbnail, quotedMsg) {
    const repoText = `✨ *${repo.name.toUpperCase()} INFO* ✨

👤 *Owner:* ${repo.owner.login}
⭐ *Stars:* ${repo.stargazers_count}
🍴 *Forks:* ${repo.forks_count}
📅 *Created:* ${new Date(repo.created_at).toLocaleDateString()}
🔄 *Updated:* ${new Date(repo.updated_at).toLocaleDateString()}

*MICKEY GLITCH V3.0.5*`;

    const interactiveMsg = {
        viewOnceMessage: {
            message: {
                messageContextInfo: {
                    deviceListMetadataVersion: 2,
                    deviceListMetadata: {}
                },
                interactiveMessage: {
                    contextInfo: {
                        externalAdReply: {
                            title: "MICKEY GLITCH REPO",
                            body: "Download or Visit Repository",
                            mediaType: 1,
                            thumbnail: thumbnail || undefined,
                            sourceUrl: repo.html_url,
                            renderLargerThumbnail: true,
                            showAdAttribution: true
                        },
                        ...(quotedMsg ? {
                            quotedMessage: quotedMsg.message,
                            stanzaId: quotedMsg.key.id,
                            participant: quotedMsg.key.remoteJid
                        } : {})
                    },
                    body: { text: repoText },
                    footer: { text: "Quantum Base Dev • Mickey Glitch" },
                    header: {
                        hasMediaAttachment: false
                    },
                    nativeFlowMessage: {
                        buttons: [
                            {
                                name: "cta_copy",
                                buttonParamsJson: JSON.stringify({
                                    display_text: "📋 Copy Repo Link",
                                    copy_code: repo.html_url
                                })
                            },
                            {
                                name: "cta_url",
                                buttonParamsJson: JSON.stringify({
                                    display_text: "🌐 Visit Repo",
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
                        ],
                        messageParamsJson: ""
                    }
                }
            }
        }
    };

    return sock.relayMessage(chatId, interactiveMsg, {});
}


async function checkupdatesCommand(sock, chatId, message) {
    if (!sock) return;

   
    let command = '';
    try {
        const params = message.message?.interactiveResponseMessage
            ?.nativeFlowResponseMessage?.paramsJson;
        if (params) {
            command = JSON.parse(params).id || '';
        }
    } catch { /* ignore parse error */ }

    if (!command) {
        command = (
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            ''
        ).trim().toLowerCase();
    }

    try {
        

        if (command === 'download_zip') {
            const repo = global.repoCache?.[chatId];
            if (!repo) {
                return sock.sendMessage(chatId, {
                    text: '❌ *Session expired. Run .repo tena.*'
                }, { quoted: message });
            }

            await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

            const owner = repo.owner?.login || 'Mickeydeveloper';
            const repoName = repo.name;
            const branch = repo.default_branch || 'main';
            const zipUrl = `https://github.com/${owner}/${repoName}/archive/refs/heads/${branch}.zip`;

            const zipResponse = await axios.get(zipUrl, {
                responseType: 'arraybuffer',
                timeout: 60000
            });

            await sock.sendMessage(chatId, {
                document: Buffer.from(zipResponse.data),
                mimetype: 'application/zip',
                fileName: `${repoName}-${branch}.zip`,
                caption: `✅ *ZIP Imepakuliwa!*\n📦 *Repo:* ${repoName}\n🌿 *Branch:* ${branch}`
            }, { quoted: message });

            return sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
        }

        
        await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } });

        const [repoResponse, thumbnail] = await Promise.all([
            axios.get('https://api.github.com/repos/Mickeydeveloper/Mickey-Glitch', {
                headers: { 'User-Agent': 'Mickey-Glitch-Bot' },
                timeout: 15000
            }),
            fetchThumbnail('https://water-billing-292n.onrender.com/1761205727440.png')
        ]);

        const repo = repoResponse.data;

        
        if (!global.repoCache) global.repoCache = {};
        global.repoCache[chatId] = repo;

        
        await sendRepoInteractive(sock, chatId, repo, thumbnail, message);

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error('[REPO ERROR]', err.message);
        await sock.sendMessage(chatId, {
            text: '🚨 *Error fetching repository!*\n_Check network or try tena baadaye._'
        }, { quoted: message });
    }
}

module.exports = checkupdatesCommand;