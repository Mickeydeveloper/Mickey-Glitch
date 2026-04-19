const axios = require('axios');

// Function ya kuvuta picha (thumbnail)
async function fetchThumbnail(url) {
    if (!url) return null;
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 8000 });
        return Buffer.from(res.data);
    } catch (e) {
        console.error('Thumbnail fetch failed:', e.message);
        return null; // Rudisha null badala ya kuleta error
    }
}

async function sendRepoInteractive(sock, chatId, repo, thumbnail, quotedMsg) {
    const repoText = `✨ *${repo.name.toUpperCase()} INFO* ✨\n\n` +
                     `👤 *Owner:* ${repo.owner.login}\n` +
                     `⭐ *Stars:* ${repo.stargazers_count}\n` +
                     `🍴 *Forks:* ${repo.forks_count}\n` +
                     `📅 *Created:* ${new Date(repo.created_at).toLocaleDateString()}\n` +
                     `🔄 *Updated:* ${new Date(repo.updated_at).toLocaleDateString()}\n\n` +
                     `*MICKEY GLITCH V3.0.5*`;

    // FIX: Tuma picha TU kama ipo (thumbnail sio null)
    if (thumbnail) {
        await sock.sendMessage(chatId, {
            image: thumbnail,
            caption: repoText // Weka text hapa ili isitoke picha tupu bila maelezo
        }, { quoted: quotedMsg });
    } else {
        // Ikiwa picha imegoma, tuma text tupu bila picha
        await sock.sendMessage(chatId, { text: repoText }, { quoted: quotedMsg });
    }

    // Tuma Interactive Buttons (Native Flow)
    const messageContent = {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    header: { title: "MICKEY GLITCH REPO", hasMediaAttachment: false },
                    body: { text: "Chagua kitendo hapa chini (Choose action):" },
                    footer: { text: "Mickey Infor Tech • Quantum Base" },
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
                    }
                }
            }
        }
    };

    return await sock.sendMessage(chatId, messageContent, { quoted: quotedMsg });
}

async function repoCommand(sock, chatId, message) {
    if (!sock) return;

    const body = message.message?.conversation || 
                 message.message?.extendedTextMessage?.text || 
                 message.message?.buttonsResponseMessage?.selectedButtonId || 
                 message.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson || "";

    // Rahisisha utambuzi wa command
    let command = body.trim().toLowerCase();
    if (body.includes('download_zip')) command = 'download_zip';

    try {
        // --- DOWNLOAD ZIP LOGIC ---
        if (command === 'download_zip' || command === '.download_zip') {
            const repoData = global.repoCache?.[chatId];
            if (!repoData) {
                return sock.sendMessage(chatId, { text: '❌ *Session expired! (Andika .repo tena)*' }, { quoted: message });
            }

            await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

            const zipUrl = `https://github.com/${repoData.owner.login}/${repoData.name}/archive/refs/heads/${repoData.default_branch || 'main'}.zip`;
            const zipRes = await axios.get(zipUrl, { responseType: 'arraybuffer', timeout: 60000 });

            await sock.sendMessage(chatId, {
                document: Buffer.from(zipRes.data),
                mimetype: 'application/zip',
                fileName: `${repoData.name}.zip`,
                caption: `✅ *ZIP Tayari (Downloaded)!*\n📦 *Repo:* ${repoData.name}`
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

            // Vuta picha, ikifeli itakuwa null
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
