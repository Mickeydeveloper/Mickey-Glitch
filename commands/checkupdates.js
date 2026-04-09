const axios = require('axios');
const { sendButtons } = require('gifted-btns');

async function checkupdatesCommand(sock, chatId, message) {
    if (!sock) return;

    const textBody = message.message?.conversation || 
                     message.message?.extendedTextMessage?.text || 
                     message.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.body?.text || '';

    const command = textBody.trim();

    try {

        // ==================== BUTTON HANDLERS ====================
        if (command === 'copy_repo_url') {
            const repo = global.repoCache?.[chatId];
            if (!repo) {
                return sock.sendMessage(chatId, { text: '❌ *Session expired. Run .checkupdates again.*' }, { quoted: message });
            }
            await sock.sendMessage(chatId, { 
                text: `✅ *Link imekopiwa kwenye clipboard!*` 
            }, { quoted: message });
            return;
        }

        if (command === 'visit_repo_url') {
            const repo = global.repoCache?.[chatId];
            if (!repo) {
                return sock.sendMessage(chatId, { text: '❌ *Session expired. Run .checkupdates again.*' }, { quoted: message });
            }
            await sock.sendMessage(chatId, { 
                text: `🌐 *Tap the button below to open in Chrome*` 
            }, { quoted: message });
            return;
        }

        if (command === 'download_zip') {
            const repo = global.repoCache?.[chatId];
            if (!repo) return sock.sendMessage(chatId, { text: '❌ *Session expired.*' }, { quoted: message });

            await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

            const owner = repo.owner?.login || 'Mickeydeveloper';
            const repoName = repo.name;
            const branch = repo.default_branch || 'main';
            const zipUrl = `https://github.com/\( {owner}/ \){repoName}/archive/refs/heads/${branch}.zip`;

            const zipResponse = await axios.get(zipUrl, { responseType: 'arraybuffer' });
            const fileName = `\( {repoName}- \){branch}.zip`;

            await sock.sendMessage(chatId, {
                document: Buffer.from(zipResponse.data),
                mimetype: 'application/zip',
                fileName: fileName,
                caption: `📦 *ZIP Imepakuliwa Successfully!*`
            }, { quoted: message });
            return;
        }

        // ==================== MAIN MENU (Advanced Buttons) ====================
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

        // Hii ndio inafanya gifted-btns ikubali cta_copy na cta_url
        const buttons = [
            {
                id: "copy_repo_url",
                display_text: "📋 Copy Link",
                type: "copy",           // Au cta_copy
                copy_code: repo.html_url
            },
            {
                id: "visit_repo_url",
                display_text: "🌐 Visit Repo",
                type: "url",
                url: repo.html_url
            },
            {
                id: "download_zip",
                display_text: "📥 Download Zip"
            }
        ];

        await sendButtons(sock, chatId, {
            title: "🔄 REPO SYNC & INFO",
            text: repoText,
            footer: "Mickey Glitch Tech • Powered by LOFT",
            buttons: buttons
        }, { quoted: message });

        if (!global.repoCache) global.repoCache = {};
        global.repoCache[chatId] = repo;

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error("CHECKUPDATES ERROR:", err.message);
        await sock.sendMessage(chatId, { text: '🚨 *Error!*' }, { quoted: message });
    }
}

module.exports = checkupdatesCommand;