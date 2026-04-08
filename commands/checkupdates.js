/**
 * COMMAND: .repo
 * DESIGN: Professional Repo Info with Download & Copy Buttons
 * SPEED: Ultra-Fast Response
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function repoCommand(sock, chatId, message) {
    try {
        // 1. Quick reaction
        await sock.sendMessage(chatId, { react: { text: '📦', key: message.key } });

        // 2. Repo Information
        const repoInfo = `
🗂️ *REPOSITORY INFORMATION*
━━━━━━━━━━━━━━━━━━━━━━
📁 *Name:* Mickey-Glitch
👤 *Owner:* Mickeydeveloper
📝 *Language:* JavaScript
🔄 *Last Update:* April 2026
━━━━━━━━━━━━━━━━━━━━━━
━━━━━━━━━━━━━━━━━━━━━━
*© 2026 Mickey Glitch Tech*`;

        // 3. Professional Buttons
        const buttons = [
            { buttonId: 'repo_download_zip', buttonText: { displayText: '📥 DOWNLOAD ZIP' }, type: 1 },
            { buttonId: 'repo_copy_link', buttonText: { displayText: '📋 COPY REPO LINK' }, type: 1 }
        ];

        const buttonMessage = {
            text: repoInfo,
            footer: 'Choose an option below',
            buttons: buttons,
            headerType: 1,
            contextInfo: {
                externalAdReply: {
                    title: "MICKEY GLITCH REPO",
                    body: "Open Source WhatsApp Bot",
                    thumbnailUrl: "https://i.ibb.co/vzVv8Yp/mickey.jpg",
                    sourceUrl: "https://github.com/Mickeydeveloper/Mickey-Glitch",
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        };

        await sock.sendMessage(chatId, buttonMessage, { quoted: message });

    } catch (err) {
        console.error("Repo Info Error:", err.message);
        await sock.sendMessage(chatId, { text: "❌ *Error loading repo info:* Try again." });
    }
}

// Download ZIP function
async function downloadZipCommand(sock, chatId, message) {
    try {
        await sock.sendMessage(chatId, { react: { text: '⬇️', key: message.key } });

        const repoUrl = 'https://github.com/Mickeydeveloper/Mickey-Glitch/archive/refs/heads/main.zip';
        const response = await axios.get(repoUrl, { responseType: 'arraybuffer' });

        const zipPath = path.join(__dirname, '../temp', 'Mickey-Glitch-main.zip');
        fs.writeFileSync(zipPath, response.data);

        await sock.sendMessage(chatId, {
            document: fs.readFileSync(zipPath),
            mimetype: 'application/zip',
            fileName: 'Mickey-Glitch-main.zip',
            caption: '📦 *Mickey Glitch Bot Repository*\n\nDownloaded successfully!'
        }, { quoted: message });

        // Cleanup
        setTimeout(() => {
            try { fs.unlinkSync(zipPath); } catch (e) {}
        }, 30000);

    } catch (err) {
        console.error("Download ZIP Error:", err.message);
        await sock.sendMessage(chatId, { text: "❌ *Download failed:* Try again." });
    }
}

// Copy Link function
async function copyLinkCommand(sock, chatId, message) {
    try {
        await sock.sendMessage(chatId, { react: { text: '📋', key: message.key } });

        const repoLink = 'https://github.com/Mickeydeveloper/Mickey-Glitch';

        await sock.sendMessage(chatId, {
            text: `📋 *Repository Link Copied!*\n\n${repoLink}\n\n_Paste this link in your browser to access the repository._`
        }, { quoted: message });

    } catch (err) {
        console.error("Copy Link Error:", err.message);
        await sock.sendMessage(chatId, { text: "❌ *Error copying link:* Try again." });
    }
}

module.exports = repoCommand;
module.exports.downloadZipCommand = downloadZipCommand;
module.exports.copyLinkCommand = copyLinkCommand;
