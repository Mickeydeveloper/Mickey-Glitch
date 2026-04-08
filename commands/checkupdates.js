const axios = require('axios');
const { sendButtons } = require('gifted-btns');

async function checkupdatesCommand(sock, chatId, message) {
    if (!sock) return;

    const textBody = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const command = textBody.trim();

    try {
        if (command === 'download_zip') {
            // Handle ZIP download
            await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

            const repoResponse = await axios.get('https://api.github.com/repos/Mickeydeveloper/Mickey-Glitch');
            const repo = repoResponse.data;
            const branch = repo.default_branch || 'main';

            const zipUrl = `https://github.com/Mickeydeveloper/Mickey-Glitch/archive/refs/heads/${branch}.zip`;

            const zipResponse = await axios.get(zipUrl, { responseType: 'arraybuffer' });

            const fileName = `Mickey-Glitch-${branch}.zip`;

            await sock.sendMessage(chatId, {
                document: Buffer.from(zipResponse.data),
                mimetype: 'application/zip',
                fileName: fileName,
                caption: `📦 *Downloaded ZIP:*\n${fileName}\n\n*Repository: Mickey-Glitch*\n*Branch: ${branch}*`
            }, { quoted: message });

            await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
            return;
        }

        // Default: Show repo info and menu
        await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } });

        const repoResponse = await axios.get('https://api.github.com/repos/Mickeydeveloper/Mickey-Glitch');
        const repo = repoResponse.data;

        const repoText = `
📦 *REPO INFO & SYNC*
━━━━━━━━━━━━━━━━━━━━━━
📝 *Name:* ${repo.name}
📋 *Description:* ${repo.description || 'No description'}
⭐ *Stars:* ${repo.stargazers_count}
🍴 *Forks:* ${repo.forks_count}
👀 *Watchers:* ${repo.watchers_count}
📅 *Last Updated:* ${new Date(repo.updated_at).toLocaleDateString()}
🔗 *URL:* ${repo.html_url}
━━━━━━━━━━━━━━━━━━━━━━
*Choose an action:*`;

        const buttons = [
            {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                    display_text: "📋 COPY REPO URL",
                    copy_code: repo.html_url
                })
            },
            { id: 'download_zip', text: '📥 DOWNLOAD ZIP' },
            {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                    display_text: "🌐 VISIT REPO",
                    url: repo.html_url
                })
            }
        ];

       

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error("CHECKUPDATES ERROR:", err.message);
        await sock.sendMessage(chatId, { text: '🚨 *Error!*' }, { quoted: message });
    }
}

// Hii ndio sehemu muhimu iliyorekebishwa ili bot isilete error
module.exports = checkupdatesCommand;
