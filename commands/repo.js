const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const axios = require('axios');

async function repoCommand(sock, chatId, message) {
    try {
        const body = message.message?.conversation || 
                     message.message?.extendedTextMessage?.text || 
                     message.message?.buttonsResponseMessage?.selectedButtonId || 
                     message.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson || "";

        let command = body.trim().toLowerCase();
        if (body.includes('download_zip')) command = 'download_zip';

        // --- LOGIC YA DOWNLOAD ZIP ---
        if (command === 'download_zip' || command === '.download_zip') {
            const repoData = global.repoCache?.[chatId];
            if (!repoData) return sock.sendMessage(chatId, { text: '❌ *Session expired!* (Andika .repo tena ili kupata link mpya)' }, { quoted: message });

            await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

            const zipUrl = `https://github.com/${repoData.owner.login}/${repoData.name}/archive/refs/heads/${repoData.default_branch || 'main'}.zip`;
            const zipRes = await axios.get(zipUrl, { responseType: 'arraybuffer', timeout: 60000 });

            return await sock.sendMessage(chatId, {
                document: Buffer.from(zipRes.data),
                mimetype: 'application/zip',
                fileName: `${repoData.name}.zip`,
                caption: `✅ *ZIP Downloaded Successfully!*\n📦 *Repo:* ${repoData.name}\n🚀 *Powered by Mickey Glitch*`
            }, { quoted: message });
        }

        // --- LOGIC YA .REPO ---
        if (command === '.repo' || command === 'repo') {
            await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } });

            const repoRes = await axios.get('https://api.github.com/repos/Mickeydeveloper/Mickey-Glitch', {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 10000
            });

            const repo = repoRes.data;
            if (!global.repoCache) global.repoCache = {};
            global.repoCache[chatId] = repo;

            const repoText = `✨ *${repo.name.toUpperCase()}* ✨\n\n` +
                             `📝 *Description:* ${repo.description || 'No description available'}\n` +
                             `👤 *Author:* ${repo.owner.login}\n` +
                             `⭐ *Stars:* ${repo.stargazers_count}\n` +
                             `🍴 *Forks:* ${repo.forks_count}\n` +
                             `📅 *Created:* ${new Date(repo.created_at).toLocaleDateString()}\n` +
                             `🔄 *Last Update:* ${new Date(repo.updated_at).toLocaleDateString()}\n\n` +
                             `*POWERED BY MICKEY GLITCH V3.0.5*`;

            const msg = generateWAMessageFromContent(chatId, {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            header: { title: "Mickey Infor Tech", hasMediaAttachment: false },
                            body: { text: repoText },
                            footer: { text: "Tap buttons below to explore 🚀" },
                            nativeFlowMessage: {
                                buttons: [
                                    { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "🌐 Open Repository", url: repo.html_url }) },
                                    { name: "cta_copy", buttonParamsJson: JSON.stringify({ display_text: "📋 Copy Repo Link", copy_code: repo.html_url }) },
                                    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "📥 Download ZIP", id: "download_zip" }) }
                                ]
                            },
                            contextInfo: {
                                externalAdReply: {
                                    title: repo.full_name,
                                    body: "Official Bot Source Code",
                                    thumbnailUrl: repo.owner.avatar_url,
                                    sourceUrl: repo.html_url,
                                    mediaType: 1,
                                    renderLargerThumbnail: false
                                }
                            }
                        }
                    }
                }
            }, { userJid: sock.user.id, quoted: message });

            await sock.relayMessage(chatId, msg.message, { messageId: msg.key.id });
            await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
        }
    } catch (err) {
        console.error('[REPO ERR]', err.message);
        await sock.sendMessage(chatId, { text: `🚨 *Error:* ${err.message}` }, { quoted: message });
    }
}

module.exports = repoCommand;
