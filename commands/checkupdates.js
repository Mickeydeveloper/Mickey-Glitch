const axios = require('axios');
const { sendInteractiveMessage } = require('gifted-btns');

async function checkupdatesCommand(sock, chatId, message) {
    if (!sock) return;

    // ==================== IMPROVED COMMAND DETECTION ====================
    let command = '';

    if (message.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.body?.text) {
        command = message.message.interactiveResponseMessage.nativeFlowResponseMessage.body.text.trim();
    } 
    else if (message.message?.conversation) {
        command = message.message.conversation.trim();
    } 
    else if (message.message?.extendedTextMessage?.text) {
        command = message.message.extendedTextMessage.text.trim();
    }

    console.log("DEBUG Command Received:", command); // Hii itakusaidia kuona command inakuja

    try {

        // ==================== BUTTON HANDLERS ====================
        if (command === 'download_zip' || command.includes('Download Zip')) {
            const repo = global.repoCache?.[chatId];
            if (!repo) {
                return sock.sendMessage(chatId, { text: '❌ *Session expired. Run .checkupdates again.*' }, { quoted: message });
            }

            await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

            try {
                const owner = repo.owner?.login || 'Mickeydeveloper';
                const repoName = repo.name;
                const branch = repo.default_branch || 'main';
                const zipUrl = `https://github.com/\( {owner}/ \){repoName}/archive/refs/heads/${branch}.zip`;

                const zipResponse = await axios.get(zipUrl, { 
                    responseType: 'arraybuffer',
                    timeout: 60000 
                });

                const fileName = `\( {repoName}- \){branch}.zip`;

                await sock.sendMessage(chatId, {
                    document: Buffer.from(zipResponse.data),
                    mimetype: 'application/zip',
                    fileName: fileName,
                    caption: `✅ *ZIP Imepakuliwa Successfully!*\n\n📦 Repository: ${repo.name}\n🔀 Branch: ${branch}`
                }, { quoted: message });

                await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

            } catch (downloadErr) {
                console.error("Download Error:", downloadErr.message);
                await sock.sendMessage(chatId, { text: '❌ *Failed to download ZIP. Repo might be too big or network issue.*' }, { quoted: message });
            }
            return;
        }

        if (command === 'copy_repo_url' || command.includes('Copy Link')) {
            const repo = global.repoCache?.[chatId];
            if (!repo) return sock.sendMessage(chatId, { text: '❌ Session expired.' }, { quoted: message });
            
            await sock.sendMessage(chatId, { text: `✅ *Link imekopiwa kwenye clipboard!*` }, { quoted: message });
            return;
        }

        if (command === 'visit_repo_url' || command.includes('Visit Repo')) {
            const repo = global.repoCache?.[chatId];
            if (!repo) return sock.sendMessage(chatId, { text: '❌ Session expired.' }, { quoted: message });
            
            await sock.sendMessage(chatId, { text: `🌐 *Repository Link Ready*` }, { quoted: message });
            return;
        }

        // ==================== MAIN MENU ====================
        await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } });

        const repoResponse = await axios.get('https://api.github.com/repos/Mickeydeveloper/Mickey-Glitch');
        const repo = repoResponse.data;

        const createdDate = new Date(repo.created_at).toLocaleDateString('en-US');
        const updatedDate = new Date(repo.updated_at).toLocaleDateString('en-US');

        const repoText = `Hello Mickey Dady,
This is ${repo.name.toUpperCase()}, A Whatsapp Bot Built by MICKEYDEVELOPER,
Enhanced with Amazing Features to Make Your Whatsapp Communication and Interaction Experience Amazing

[ ] NAME: ${repo.name}
[ ] STARS: ${repo.stargazers_count}
[ ] FORKS: ${repo.forks_count}
[ ] CREATED ON: ${createdDate}
[ ] LAST UPDATED: ${updatedDate}
| POWERED BY MICKEY`;

        const interactiveButtons = [
            { name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: '📋 Copy Link', copy_code: repo.html_url }) },
            { name: 'cta_url',  buttonParamsJson: JSON.stringify({ display_text: '🌐 Visit Repo', url: repo.html_url, merchant_url: repo.html_url }) },
            { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '📥 Download Zip', id: 'download_zip' }) }
        ];

        await sendInteractiveMessage(sock, chatId, {
            text: repoText,
            interactiveButtons: interactiveButtons,
            footer: "Mickey Glitch Tech • Powered by LOFT"
        }, { quoted: message });

        if (!global.repoCache) global.repoCache = {};
        global.repoCache[chatId] = repo;

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error("CHECKUPDATES ERROR:", err.message);
        await sock.sendMessage(chatId, { text: '🚨 *Error fetching repository!*' }, { quoted: message });
    }
}

module.exports = checkupdatesCommand;