const { sendButtons } = require('gifted-btns');

async function cloneCommand(sock, chatId, message) {
    try {
        // Pata maandishi yote ya meseji
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const ctxInfo = message.message?.extendedTextMessage?.contextInfo || {};
        
        // Pata namba iliyotagiwa au namba iliyoreply-wa
        const mentioned = ctxInfo.mentionedJid?.[0] || ctxInfo.participant || null;

        if (!mentioned) {
            return await sock.sendMessage(chatId, { 
                text: '⚠️ *TAG MTU!* \nTumia: `.clone @tag_mtu` au reply meseji yake kwa kuandika `.clone`' 
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '🎭', key: message.key } });

        // Pata Picha ya Profile
        let ppUrl;
        try {
            ppUrl = await sock.profilePictureUrl(mentioned, 'image');
        } catch {
            ppUrl = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        }

        const targetName = "Mlengwa (Target)";

        const cloneMsg = `
🎭 *IDENTITY CLONED!*
━━━━━━━━━━━━━━━
👤 *Target:* @${mentioned.split('@')[0]}
🕵️ *Status:* Mirror Active!

Bot sasa inaweza ku-act kama mwanachama huyu.
━━━━━━━━━━━━━━━`;

        await sendButtons(sock, chatId, {
            title: '👤 CLONE DASHBOARD',
            text: cloneMsg,
            footer: 'Mickey Glitch Technology',
            image: { url: ppUrl },
            buttons: [
                { id: `.speak_as ${mentioned}`, text: '🗣️ ONGEA KAMA YEYE' },
                { id: `.act_scene ${mentioned}`, text: '🎭 ACT SCENE' },
                { id: 'unclone_all', text: '❌ UNCLONE' }
            ],
            contextInfo: { 
                mentionedJid: [mentioned],
                externalAdReply: {
                    title: `Mirroring: ${mentioned.split('@')[0]}`,
                    thumbnailUrl: ppUrl,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: message });

    } catch (err) {
        console.error(err);
        await sock.sendMessage(chatId, { text: '❌ Hitilafu imetokea!' });
    }
}

module.exports = cloneCommand;
