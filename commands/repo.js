const axios = require('axios');

async function fetchThumbnail(url) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
        return Buffer.from(res.data);
    } catch (e) {
        return null;
    }
}

async function sendRepoInteractive(sock, chatId, repo, thumbnail, quotedMsg) {
    const repoText = `✨ *${repo.name.toUpperCase()} INFO* ✨\n\n👤 *Owner:* ${repo.owner.login}\n⭐ *Stars:* ${repo.stargazers_count}\n🍴 *Forks:* ${repo.forks_count}\n📅 *Created:* ${new Date(repo.created_at).toLocaleDateString()}\n🔄 *Updated:* ${new Date(repo.updated_at).toLocaleDateString()}\n\n*MICKEY GLITCH V3.0.5*`;

    // Tunasuka ujumbe wa Interactive
    const messageContent = {
        interactiveMessage: {
            header: {
                title: "MICKEY GLITCH REPO",
                hasMediaAttachment: true,
                ...(thumbnail ? { jpegThumbnail: thumbnail } : {})
            },
            body: { text: repoText },
            footer: { text: "Quantum Base Dev • Mickey Glitch" },
            nativeFlowMessage: {
                buttons: [
                    {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "🌐 Visit Repo",
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
            },
            contextInfo: {
                externalAdReply: {
                    title: "MICKEY GLITCH REPO",
                    body: "Download or Visit Repository",
                    mediaType: 1,
                    thumbnail: thumbnail,
                    sourceUrl: repo.html_url,
                    renderLargerThumbnail: true,
                    showAdAttribution: true
                },
                mentionedJid: [quotedMsg.sender || quotedMsg.key.remoteJid],
                quotedMessage: quotedMsg.message,
                participant: quotedMsg.sender || quotedMsg.key.participant || quotedMsg.key.remoteJid,
                stanzaId: quotedMsg.key.id,
                remoteJid: chatId
            }
        }
    };

    // Kusimamia ujumbe wa interactive na contextInfo
    return await sock.sendMessage(chatId, messageContent, { quoted: quotedMsg });
}

async function repoCommand(sock, chatId, message) {
    if (!sock) return;

    let command = '';
    const body = message.message?.conversation || 
                 message.message?.extendedTextMessage?.text || 
                 message.message?.buttonsResponseMessage?.selectedButtonId || 
                 message.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson || "";

    // Angalia kama ni kodi ya button (JSON)
    if (body.includes('download_zip')) {
        command = 'download_zip';
    } else {
        command = body.trim().toLowerCase();
    }

    try {
        // --- DOWNLOAD LOGIC ---
        if (command === 'download_zip' || command === '.download_zip') {
            const repoData = global.repoCache?.[chatId];
            if (!repoData) {
                return sock.sendMessage(chatId, { text: '❌ *Session expired. Run .repo tena.*' }, { quoted: message });
            }

            await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

            const owner = repoData.owner?.login || 'Mickeydeveloper';
            const zipUrl = `https://github.com/${owner}/${repoData.name}/archive/refs/heads/${repoData.default_branch || 'main'}.zip`;

            const zipRes = await axios.get(zipUrl, { responseType: 'arraybuffer', timeout: 60000 });

            await sock.sendMessage(chatId, {
                document: Buffer.from(zipRes.data),
                mimetype: 'application/zip',
                fileName: `${repoData.name}.zip`,
                caption: `✅ *ZIP Imepakuliwa!*\n📦 *Repo:* ${repoData.name}`
            }, { quoted: message });

            return sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
        }

        // --- FETCH REPO LOGIC (.repo) ---
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
