const axios = require('axios');

/**
 * Fetch thumbnail na kuifanya iwe Buffer kwa ajili ya AdReply
 */
async function fetchThumbnail(url) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
        return Buffer.from(res.data);
    } catch (e) {
        console.log("Thumbnail fetch error, using fallback...");
        return null;
    }
}

/**
 * Kutuma Interactive Message kwa kutumia relayMessage
 */
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
                        // Inahakikisha quoted message ipo sahihi
                        mentionedJid: [quotedMsg.key.participant || quotedMsg.key.remoteJid],
                        ...(quotedMsg ? {
                            quotedMessage: quotedMsg.message,
                            stanzaId: quotedMsg.key.id,
                            participant: quotedMsg.key.participant || quotedMsg.key.remoteJid,
                            remoteJid: chatId
                        } : {})
                    },
                    body: { text: repoText },
                    footer: { text: "Quantum Base Dev • Mickey Glitch" },
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
                    }
                }
            }
        }
    };

    return await sock.relayMessage(chatId, interactiveMsg, { messageId: quotedMsg.key.id });
}

async function repoCommand(sock, chatId, message) {
    if (!sock) return;

    let command = '';
    try {
        const params = message.message?.interactiveResponseMessage
            ?.nativeFlowResponseMessage?.paramsJson;
        if (params) {
            command = JSON.parse(params).id || '';
        }
    } catch { }

    if (!command) {
        command = (
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            ''
        ).trim().toLowerCase();
    }

    try {
        // --- DOWNLOAD LOGIC ---
        if (command === 'download_zip' || command === '.download_zip') {
            const repo = global.repoCache?.[chatId];
            if (!repo) {
                return sock.sendMessage(chatId, { text: '❌ *Session expired. Run .repo tena.*' }, { quoted: message });
            }

            await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

            const owner = repo.owner?.login || 'Mickeydeveloper';
            const zipUrl = `https://github.com/${owner}/${repo.name}/archive/refs/heads/${repo.default_branch || 'main'}.zip`;

            const zipRes = await axios.get(zipUrl, { responseType: 'arraybuffer', timeout: 60000 });

            await sock.sendMessage(chatId, {
                document: Buffer.from(zipRes.data),
                mimetype: 'application/zip',
                fileName: `${repo.name}.zip`,
                caption: `✅ *ZIP Imepakuliwa!*\n📦 *Repo:* ${repo.name}`
            }, { quoted: message });

            return sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
        }

        // --- FETCH REPO LOGIC ---
        await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } });

        // Muhimu: Ongeza User-Agent na timeout
        const repoRes = await axios.get('https://api.github.com/repos/Mickeydeveloper/Mickey-Glitch', {
            headers: { 
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/vnd.github.v3+json'
            },
            timeout: 10000
        });

        const repoData = repoRes.data;
        if (!global.repoCache) global.repoCache = {};
        global.repoCache[chatId] = repoData;

        const thumbnail = await fetchThumbnail(repoData.owner.avatar_url);

        await sendRepoInteractive(sock, chatId, repoData, thumbnail, message);
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error('[REPO ERR]', err.response?.data || err.message);
        await sock.sendMessage(chatId, {
            text: `🚨 *System Error:* Failed to fetch repo info.\n_Sababu: ${err.response?.status === 403 ? "GitHub Rate Limit" : "Network Timeout"}_`
        }, { quoted: message });
    }
}

module.exports = repoCommand;
