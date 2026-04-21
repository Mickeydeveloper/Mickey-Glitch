/**
 * repo.js - GitHub Repo Info with Working Interactive Buttons
 * Command: .repo
 */

const axios = require('axios');

// Cache ya repo data (inahifadhi muda mfupi)
const repoCache = new Map();

async function fetchThumbnail(url) {
    try {
        const res = await axios.get(url, { 
            responseType: 'arraybuffer', 
            timeout: 8000 
        });
        return Buffer.from(res.data);
    } catch (e) {
        console.log("Thumbnail fetch failed...");
        return null;
    }
}

async function repoCommand(sock, chatId, message) {
    if (!sock || !chatId) return;

    try {
        // === HANDLE BUTTON CLICKS (Download ZIP) ===
        const interactiveResponse = message.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
        
        if (interactiveResponse) {
            try {
                const responseData = JSON.parse(interactiveResponse);
                const buttonId = responseData.id || responseData.button_id;

                if (buttonId === "download_zip") {
                    const cachedRepo = repoCache.get(chatId);
                    if (!cachedRepo) {
                        return sock.sendMessage(chatId, { 
                            text: '❌ *Session imekwisha. Tumia .repo tena.*' 
                        }, { quoted: message });
                    }

                    await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

                    const zipUrl = `https://github.com/\( {cachedRepo.owner.login}/ \){cachedRepo.name}/archive/refs/heads/${cachedRepo.default_branch || 'main'}.zip`;

                    const zipRes = await axios.get(zipUrl, { 
                        responseType: 'arraybuffer', 
                        timeout: 60000 
                    });

                    await sock.sendMessage(chatId, {
                        document: Buffer.from(zipRes.data),
                        mimetype: 'application/zip',
                        fileName: `${cachedRepo.name}.zip`,
                        caption: `✅ *${cachedRepo.name}.zip Imepakuliwa Successfully!*\n\n📦 Repo: ${cachedRepo.name}\n⭐ Stars: ${cachedRepo.stargazers_count}`
                    }, { quoted: message });

                    return sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
                }
            } catch (e) {
                console.error("Button response error:", e);
            }
        }

        // === FETCH REPO & SEND INTERACTIVE MESSAGE ===
        await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } });

        const [repoRes, thumbnail] = await Promise.all([
            axios.get('https://api.github.com/repos/Mickeydeveloper/Mickey-Glitch', {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (compatible; MickeyBot)',
                    'Accept': 'application/vnd.github.v3+json'
                },
                timeout: 10000
            }),
            fetchThumbnail('https://github.com/Mickeydeveloper.png')
        ]);

        const repo = repoRes.data;
        repoCache.set(chatId, repo); // Hifadhi kwa button

        const repoText = `✨ *${repo.name.toUpperCase()}*\n\n` +
            `👤 *Owner:* ${repo.owner.login}\n` +
            `⭐ *Stars:* ${repo.stargazers_count}\n` +
            `🍴 *Forks:* ${repo.forks_count}\n` +
            `📅 *Created:* ${new Date(repo.created_at).toLocaleDateString('en-GB')}\n` +
            `🔄 *Last Updated:* ${new Date(repo.updated_at).toLocaleDateString('en-GB')}\n\n` +
            `📌 *Description:*\n${repo.description || 'No description available'}`;

        // Modern Interactive Message with Working Buttons
        await sock.sendMessage(chatId, {
            text: repoText,
            contextInfo: {
                externalAdReply: {
                    title: "MICKEY GLITCH V3.0.5",
                    body: "Official GitHub Repository",
                    thumbnail: thumbnail || undefined,
                    mediaType: 1,
                    sourceUrl: repo.html_url,
                    renderLargerThumbnail: true,
                    showAdAttribution: true
                }
            },
            footer: "Quantum Base • Mickey Glitch",
            buttons: [
                {
                    buttonId: "copy_link",
                    buttonText: { displayText: "📋 Copy Repo Link" },
                    type: 4
                },
                {
                    buttonId: "visit_repo",
                    buttonText: { displayText: "🌐 Visit Repository" },
                    type: 2,
                    url: repo.html_url
                },
                {
                    buttonId: "download_zip",
                    buttonText: { displayText: "📥 Download ZIP" },
                    type: 1
                }
            ]
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error('[REPO ERROR]', err.message);
        
        let errorMsg = '🚨 *Imeshindwa kupata taarifa za repo*';
        if (err.response?.status === 403) errorMsg += '\n\nGitHub Rate Limit – Jaribu baadaye kidogo';
        
        await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
    }
}

module.exports = repoCommand;