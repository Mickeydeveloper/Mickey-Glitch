const axios = require('axios');
const { sendInteractiveMessage } = require('gifted-btns');   // ← Hakikisha umeimport hii

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
                text: `🌐 *Repository Link*` 
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

        // ==================== MAIN MENU WITH CTA BUTTONS ====================
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
            { 
                name: 'cta_copy', 
                buttonParamsJson: JSON.stringify({ 
                    display_text: '📋 Copy Link', 
                    copy_code: repo.html_url 
                }) 
            },
            { 
                name: 'cta_url', 
                buttonParamsJson: JSON.stringify({ 
                    display_text: '🌐 Visit Repo', 
                    url: repo.html_url,
                    merchant_url: repo.html_url 
                }) 
            },
            { 
                name: 'quick_reply', 
                buttonParamsJson: JSON.stringify({ 
                    display_text: '📥 Download Zip', 
                    id: 'download_zip' 
                }) 
            }
        ];

        await sendInteractiveMessage(sock, chatId, {
            text: repoText,
            interactiveButtons: interactiveButtons,
            footer: "Mickey Glitch Tech • Powered by LOFT"
        }, { quoted: message });

        // Cache repo
        if (!global.repoCache) global.repoCache = {};
        global.repoCache[chatId] = repo;

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error("CHECKUPDATES ERROR:", err.message);
        await sock.sendMessage(chatId, { text: '🚨 *Error fetching repository!*' }, { quoted: message });
    }
}

module.exports = checkupdatesCommand;