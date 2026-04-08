const axios = require('axios');
const { sendButtons } = require('gifted-btns');

// Owner IDs
const owners = ["255612130873", "255612130873"]; // Replace with actual owner IDs

async function checkupdatesCommand(sock, chatId, message) {
    if (!sock) return;

    const sender = message.key.participant || message.key.remoteJid;
    const senderId = sender.split('@')[0];

    if (!owners.includes(senderId)) {
        return sock.sendMessage(chatId, { text: '❌ *This command is only for owners!*' }, { quoted: message });
    }

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
            { type: 'cta_copy', text: '📋 COPY REPO URL', data: repo.html_url },
            { id: 'download_zip', text: '📥 DOWNLOAD ZIP' },
            { type: 'cta_url', text: 'VISIT MY REPO', url: repo.html_url }
        ];

        await sendButtons(sock, chatId, {
            title: '🔄 REPO SYNC & INFO',
            text: repoText,
            footer: 'Mickey Glitch Tech',
            image: { url: repo.owner.avatar_url },
            buttons: buttons
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error("CHECKUPDATES ERROR:", err.message);
        await sock.sendMessage(chatId, { text: '🚨 *Error!*' }, { quoted: message });
    }
}

// Hii ndio sehemu muhimu iliyorekebishwa ili bot isilete error
module.exports = checkupdatesCommand;
