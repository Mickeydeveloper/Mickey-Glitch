const { sendButtons } = require('gifted-btns');

/**
 * COMMAND: .clone (The Mirror Identity)
 * Boresha: Faster Response & Professional UI
 */

async function cloneCommand(sock, chatId, message) {
    try {
        const text = (message.message?.conversation || message.message?.extendedTextMessage?.text || "").trim();
        const ctxInfo = message.message?.extendedTextMessage?.contextInfo || {};
        
        // Pata target haraka (Mention au Reply)
        const mentioned = ctxInfo.mentionedJid?.[0] || ctxInfo.participant || null;

        if (!mentioned) {
            return await sock.sendMessage(chatId, { 
                text: '🎭 *MICKEY CLONE SYSTEM*\n\n❌ *Error:* Please tag someone or reply to their message to clone them.\n\n*Usage:* `.clone @user`' 
            }, { quoted: message });
        }

        // React papo hapo kuonyesha bot imepokea command (Inaleta speed feeling)
        sock.sendMessage(chatId, { react: { text: '🎭', key: message.key } });

        // Pata Picha ya Profile haraka
        let ppUrl;
        try {
            ppUrl = await sock.profilePictureUrl(mentioned, 'image');
        } catch {
            ppUrl = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        }

        const targetNumber = mentioned.split('@')[0];

        // MUUNDO MPYA: Maelezo ya Bot + English Update Log
        const caption = `
🤖 *MICKEY GLITCH TECHNOLOGY*
━━━━━━━━━━━━━━━━━━━━━━
The *Mirror Identity* module allows the bot to intercept and replicate the digital persona of a targeted user. This is a high-level simulation tool for group engagement and professional pranks.

👤 *CLONED TARGET:* @${targetNumber}
📡 *STATUS:* Neural Link Established
🎭 *MODE:* Ghost / Identity Mirror
━━━━━━━━━━━━━━━━━━━━━━

*LATEST UPDATES (v5.2.0):*
• _Optimized command execution latency (Instant response)._
• _Improved profile picture retrieval logic._
• _Added multi-layer button interaction support._
• _Fixed prefix-space detection for global accessibility._`;

        // Tuma kwa kasi (High Speed Execution)
        await sendButtons(sock, chatId, {
            title: '🎭 IDENTITY CLONE DASHBOARD',
            text: caption,
            footer: 'Mickey Glitch • The Future of Automation',
            image: { url: ppUrl },
            buttons: [
                { id: `.speak_as ${mentioned}`, text: '🗣️ SPEAK AS TARGET' },
                { id: `.act_scene ${mentioned}`, text: '🎬 AI ACT SCENE' },
                { id: 'unclone_all', text: '❌ TERMINATE CLONE' }
            ],
            contextInfo: { 
                mentionedJid: [mentioned],
                externalAdReply: {
                    title: `CLONING: ${targetNumber}`,
                    body: "System Hijack: Identity Mirror Active",
                    thumbnailUrl: ppUrl,
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    sourceUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26'
                }
            }
        }, { quoted: message });

    } catch (err) {
        // Silent error for speed, log only to console
        console.error('Clone Error:', err.message);
    }
}

module.exports = cloneCommand;
