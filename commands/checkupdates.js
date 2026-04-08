/**
 * COMMAND: .repo
 * DESIGN: Ultra-Modern Native Flow (Loft Style)
 * FUNCTION: Auto-Sync GitHub Data + ZIP Downloader
 */

const axios = require('axios');
const { proto, generateWAMessageFromContent, prepareWAMessageMedia } = require('@whiskeysockets/baileys');

async function repoCommand(sock, chatId, message) {
    const repoOwner = "Mickeydeveloper";
    const repoName = "Mickey-Glitch";
    const githubUrl = `https://github.com/${repoOwner}/${repoName}`;
    const pushName = message.pushName || 'User';

    try {
        await sock.sendMessage(chatId, { react: { text: '📂', key: message.key } });

        // 1. Fetch live data from GitHub API
        const { data } = await axios.get(`https://api.github.com/repos/${repoOwner}/${repoName}`);
        
        const info = {
            stars: data.stargazers_count,
            forks: data.forks_count,
            created: new Date(data.created_at).toLocaleDateString('en-GB'),
            updated: new Date(data.updated_at).toLocaleDateString('en-GB'),
            descr: data.description || "No description available"
        };

        const repoText = `Hello *${pushName}*, 

This is *${repoName.toUpperCase()}* 🚀
A powerful WhatsApp bot built for speed and stability.

[❏] *Stars:* ${info.stars}
[❏] *Forks:* ${info.forks}
[❏] *Created:* ${info.created}
[❏] *Last Update:* ${info.updated}

*Description:* ${info.descr}

_Powered by Mickey & Quantum_`;

        // 2. Prepare high-quality header image
        const media = await prepareWAMessageMedia(
            { url: "https://i.ibb.co/vzVv8Yp/mickey.jpg" }, 
            { upload: sock.waUploadToServer }
        );

        // 3. Modern Native Flow Appearance
        const msg = generateWAMessageFromContent(chatId, {
            viewOnceMessage: {
                message: {
                    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                        body: proto.Message.InteractiveMessage.Body.fromObject({ text: repoText }),
                        footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: "MICKEY GLITCH TECH © 2026" }),
                        header: proto.Message.InteractiveMessage.Header.fromObject({
                            title: "SYSTEM REPOSITORY INFO",
                            hasMediaAttachment: true,
                            imageMessage: media.imageMessage
                        }),
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                            buttons: [
                                {
                                    "name": "cta_copy",
                                    "buttonParamsJson": JSON.stringify({
                                        "display_text": "📋 Copy Repo Link",
                                        "id": githubUrl,
                                        "copy_code": githubUrl
                                    })
                                },
                                {
                                    "name": "cta_url",
                                    "buttonParamsJson": JSON.stringify({
                                        "display_text": "🔗 Visit GitHub",
                                        "url": githubUrl
                                    })
                                },
                                {
                                    "name": "quick_reply",
                                    "buttonParamsJson": JSON.stringify({
                                        "display_text": "📥 Download Source (ZIP)",
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
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error("REPO_ERROR:", err);
        await sock.sendMessage(chatId, { text: "⚠️ *System Error:* Failed to fetch repo info." });
    }
}

/**
 * FUNCTION: handleZipDownload
 * Triggered when button ID 'download_repo_zip' is pressed
 */
async function handleZipDownload(sock, chatId, message) {
    const zipUrl = `https://github.com/Mickeydeveloper/Mickey-Glitch/archive/refs/heads/main.zip`;

    try {
        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });

        await sock.sendMessage(chatId, {
            document: { url: zipUrl },
            mimetype: 'application/zip',
            fileName: 'Mickey-Glitch-Main.zip',
            caption: '✅ *Repo Zip File Ready!*\n\nExtract and enjoy coding.'
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '📦', key: message.key } });

    } catch (e) {
        await sock.sendMessage(chatId, { text: "❌ *Download Failed:* Link is currently unavailable." });
    }
}

module.exports = { repoCommand, handleZipDownload };
