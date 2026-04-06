const { sendButtons } = require('gifted-btns');
const isOwnerOrSudo = require('../lib/isOwner');

/**
 * COMMAND: .clone (The Mirror Identity)
 * Inaruhusu kuiba utambulisho wa mtu (PP & Name) kisha kutuma meseji kama yeye.
 */

async function cloneCommand(sock, chatId, message, userMessage = '') {
    try {
        const senderId = message.key.participant || message.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        
        // 1. Ruhusu Admins au Owner pekee kutumia hii command ya kijasusi
        if (!message.key.fromMe && !isOwner) return;

        const ctxInfo = message.message?.extendedTextMessage?.contextInfo || {};
        const mentioned = ctxInfo.mentionedJid ? ctxInfo.mentionedJid[0] : null;

        // Kama hajamtag mtu, mpe maelekezo
        if (!mentioned) {
            return await sock.sendMessage(chatId, { 
                text: '⚠️ *KOSA:* Tafadhali mtag (mention) mtu unayetaka kum-clone.\n\nMfano: `.clone @255xxxxxxxxx`' 
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '🎭', key: message.key } });

        // 2. Pata Picha ya Profile (PP) na Jina
        let ppUrl;
        try {
            ppUrl = await sock.profilePictureUrl(mentioned, 'image');
        } catch (e) {
            // Kama hana picha, tumia picha ya default
            ppUrl = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        }

        // Pata Jina (Kama lipo kwenye contacts au tumia namba)
        const contact = await sock.onWhatsApp(mentioned);
        const targetName = contact[0]?.notify || mentioned.split('@')[0];

        // 3. Tengeneza Muonekano wa "Identity Stolen"
        const cloneText = `
🎭 *IDENTITY MIRROR ACTIVE* 🎭
━━━━━━━━━━━━━━━━━━━━━━
👤 *Target:* ${targetName}
🆔 *Jid:* ${mentioned.split('@')[0]}
🕵️ *Status:* Utambulisho Umeibiwa!

Bot sasa inaweza kuongea, ku-act, au kutuma meseji kwa niaba ya *${targetName}* ndani ya kundi hili.
━━━━━━━━━━━━━━━━━━━━━━`;

        // 4. Tuma Button za Kijasusi
        await sendButtons(sock, chatId, {
            title: '👤 CLONE DASHBOARD',
            text: cloneText,
            footer: 'Mickey Glitch Technology © 2026',
            image: { url: ppUrl }, // Inatuma picha ya target kama Banner
            buttons: [
                { id: `.speak_as ${mentioned}`, text: '🗣️ ONGEA KAMA YEYE' },
                { id: `.act_scene ${mentioned}`, text: '🎭 ACT SCENE' },
                { id: 'unclone_all', text: '❌ UNCLONE' }
            ],
            // Hii inafanya meseji ionekane ya kijanja zaidi (External Ad Reply)
            contextInfo: {
                externalAdReply: {
                    title: `Mirroring: ${targetName}`,
                    body: "Identity Hijacked Successfully",
                    thumbnailUrl: ppUrl,
                    sourceUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26',
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: message });

    } catch (err) {
        console.error('Clone Error:', err);
        await sock.sendMessage(chatId, { text: `❌ Hitilafu (Error): ${err.message}` });
    }
}

/**
 * LOGIC YA KUSHUGHULIKIA BUTTONS (Hint kwa handler yako)
 * Unapobonyeza '.speak_as', unaweza kutumia function inayotuma meseji
 * ukitumia 'externalAdReply' ya huyo mhusika aliyekuwa cloned.
 */

module.exports = cloneCommand;
