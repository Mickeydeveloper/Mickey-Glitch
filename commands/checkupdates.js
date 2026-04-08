/**
 * COMMAND: .repo
 * DESIGN: Loft-Quantum Style (Native Flow)
 * FEATURES: Auto-fetch Repo Info & Direct ZIP Downloader
 */

const axios = require('axios');
const { proto, generateWAMessageFromContent, prepareWAMessageMedia } = require('@whiskeysockets/baileys');

async function repoCommand(sock, chatId, message) {
    const repoOwner = "Mickeydeveloper";
    const repoName = "Mickey-Glitch";
    const githubUrl = `https://github.com/${repoOwner}/${repoName}`;

    try {
        await sock.sendMessage(chatId, { react: { text: '📦', key: message.key } });

        // 1. Fetch Repo Info from GitHub API
        const repoData = await axios.get(`https://api.github.com/repos/${repoOwner}/${repoName}`);
        const { stargazers_count, forks_count, created_at, updated_at } = repoData.data;

        // Formating dates
        const created = new Date(created_at).toLocaleDateString();
        const updated = new Date(updated_at).toLocaleDateString();

        const repoText = `Hello *${pushName}*,
This is, A Whatsapp Bot Built by *Mickey and Quantum*, Enhanced with Amazing Features.

[*NAME:* ${repoName} ]
[*STARS:* ${stargazers_count} ]
[ *FORKS:* ${forks_count} ]
[ *CREATED ON:* ${created} ]
[ *LAST UPDATED:* ${updated} ]

| **`;

        // 2. Prepare Media
        const media = await prepareWAMessageMedia(
            { url: "https://i.ibb.co/vzVv8Yp/mickey.jpg" }, 
            { upload: sock.waUploadToServer }
        );

        // 3. Build Native Flow Message
        const msg = generateWAMessageFromContent(chatId, {
            viewOnceMessage: {
                message: {
                    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                        body: proto.Message.InteractiveMessage.Body.fromObject({ text: repoText }),
                        footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: "© 2026 Mickey Glitch Tech" }),
                        header: proto.Message.InteractiveMessage.Header.fromObject({
                            title: "MICKEY GLITCH",
                            hasMediaAttachment: true,
                            imageMessage: media.imageMessage
                        }),
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                            buttons: [
                                {
                                    "name": "cta_copy",
                                    "buttonParamsJson": JSON.stringify({
                                        "display_text": "📋 Copy Link",
                                        "id": githubUrl,
                                        "copy_code": githubUrl
                                    })
                                },
                                {
                                    "name": "cta_url",
                                    "buttonParamsJson": JSON.stringify({
                                        "display_text": "🔗 Visit Repo",
                                        "url": githubUrl
                                    })
                                },
                                {
                                    "name": "quick_reply",
                                    "buttonParamsJson": JSON.stringify({
                                        "display_text": "📥 Download Zip",
                                        "id": "download_repo_zip"
                                    })
                                }
                            ],
                        })
                    })
                }
            }
        }, { quoted: message });

        await sock.relayMessage(chatId, msg.message, { messageId: msg.key.id });

    } catch (err) {
        console.error("REPO ERROR:", err.message);
        await sock.sendMessage(chatId, { text: "❌ *Error fetching repo info!*" });
    }
}

// 4. Logic ya kudownload ZIP (Hii iitwe pindi id ikiwa 'download_repo_zip')
async function handleZipDownload(sock, chatId, message) {
    const zipUrl = `https://github.com/Mickeydeveloper/Mickey-Glitch/archive/refs/heads/main.zip`;
    
    try {
        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });
        
        await sock.sendMessage(chatId, {
            document: { url: zipUrl },
            mimetype: 'application/zip',
            fileName: 'Mickey-Glitch-Main.zip',
            caption: '📦 *Mickey Glitch Repo Zip*\n\nDownloaded successfully!'
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (e) {
        await sock.sendMessage(chatId, { text: "❌ *Download Failed!*" });
    }
}

module.exports = { repoCommand, handleZipDownload };
