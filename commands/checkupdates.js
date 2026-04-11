const axios = require('axios');
const { sendInteractiveMessage } = require('gifted-btns');

async function checkupdatesCommand(sock, chatId, message) {
    if (!sock) return;

    // Detect Command
    let command = '';
    if (message.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
        const params = JSON.parse(message.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
        command = params.id;
    } else {
        command = (message.message?.conversation || 
                   message.message?.extendedTextMessage?.text || 
                   '').trim();
    }

    try {
        // ==================== BUTTON HANDLERS ====================
        if (command === 'download_zip') {
            const repo = global.repoCache?.[chatId];
            if (!repo) return sock.sendMessage(chatId, { text: '❌ *Session expired. Run .repo again.*' });

            await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

            const owner = repo.owner?.login || 'Mickeydeveloper';
            const repoName = repo.name;
            const branch = repo.default_branch || 'main';
            const zipUrl = `https://github.com/${owner}/${repoName}/archive/refs/heads/${branch}.zip`;

            const zipResponse = await axios.get(zipUrl, { responseType: 'arraybuffer', timeout: 60000 });

            await sock.sendMessage(chatId, {
                document: Buffer.from(zipResponse.data),
                mimetype: 'application/zip',
                fileName: `${repoName}-${branch}.zip`,
                caption: `✅ *ZIP Imepakuliwa!*\n📦 Repo: ${repoName}`
            }, { quoted: message });

            return await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
        }

        // ==================== MAIN MENU (REPO INFO) ====================
        await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } });

        const repoResponse = await axios.get('https://api.github.com/repos/Mickeydeveloper/Mickey-Glitch');
        const repo = repoResponse.data;

        // Cache repo for zip download
        if (!global.repoCache) global.repoCache = {};
        global.repoCache[chatId] = repo;

        const repoText = `✨ *${repo.name.toUpperCase()} INFO* ✨

👤 *Owner:* ${repo.owner.login}
⭐ *Stars:* ${repo.stargazers_count}
🍴 *Forks:* ${repo.forks_count}
📅 *Created:* ${new Date(repo.created_at).toLocaleDateString()}
🔄 *Updated:* ${new Date(repo.updated_at).toLocaleDateString()}

*MICKEY GLITCH V3.0.5*`;

        const interactiveButtons = [
            { name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: '📋 Copy Repo Link', copy_code: repo.html_url }) },
            { name: 'cta_url',  buttonParamsJson: JSON.stringify({ display_text: '🌐 Visit Repo', url: repo.html_url, merchant_url: repo.html_url }) },
            { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '📥 Download Zip', id: 'download_zip' }) }
        ];

        // FIX: Hakikisha contextInfo haina picha mbovu (Invalid Media Type)
        await sendInteractiveMessage(sock, chatId, {
            text: repoText,
            interactiveButtons: interactiveButtons,
            footer: "Quantum Base Dev • Mickey Glitch",
            contextInfo: {
                externalAdReply: {
                    title: "MICKEY GLITCH REPO",
                    body: "Download or Visit Repository",
                    mediaType: 1, // 1 ni text/image
                    // Ikiwa huna thumbnail ya uhakika, ni bora usiiweke kabisa kuzuia Error
                    thumbnailUrl: "https://water-billing-292n.onrender.com/1761205727440.png",
                    sourceUrl: repo.html_url,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error("REPO ERROR:", err.message);
        await sock.sendMessage(chatId, { text: '🚨 *Error fetching repository! Check network.*' });
    }
}

module.exports = checkupdatesCommand;
