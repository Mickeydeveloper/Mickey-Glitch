const { isAdmin } = require('../lib/isAdmin');

async function promoteCommand(sock, chatId, message, text) {
    try {
        // 1. Pata sender ID wa aliyetuma command
        const senderId = message.key.participant || message.participant || message.key.remoteJid;

        // Check admin status BEFORE attempting promotion
        const adminStatus = await isAdmin(sock, chatId, senderId);
        
        if (!adminStatus.isBotAdmin) {
            return await sock.sendMessage(chatId, { 
                text: '*_❌ Bot lazima iwe Admin kwanza!_*' 
            }, { quoted: message });
        }

        if (!adminStatus.isSenderAdmin) {
            return await sock.sendMessage(chatId, { 
                text: '*_❌ Admins tu ndio wanaweza kupandisha (Only admins can promote)!_*' 
            }, { quoted: message });
        }

        // Parse args from text
        const args = text ? text.trim().split(/\s+/).slice(1) : [];

        // 2. Tafuta nani anapandishwa cheo (userToPromote)
        let userToPromote = [];

        // A: Angalia Mentions (@user)
        if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            userToPromote = message.message.extendedTextMessage.contextInfo.mentionedJid;
        } 
        // B: Angalia Reply (kumjibu mtu)
        else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            userToPromote = [message.message.extendedTextMessage.contextInfo.participant];
        } 
        // C: Angalia Namba kwenye Args (.promote 255xxx)
        else if (args.length > 0) {
            let num = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
            if (num.length > 15) userToPromote = [num];
        }

        // Kama hajapatikana kabisa
        if (userToPromote.length === 0) {
            return await sock.sendMessage(chatId, { 
                text: '*_⚠️ Hitilafu! M-tag mtu, reply chat yake, au andika namba kumpandisha cheo._*' 
            }, { quoted: message });
        }

        // 3. Tekeleza Promotion
        await sock.groupParticipantsUpdate(chatId, userToPromote, "promote");

        // 4. Andaa majina kwa ajili ya tag (@255xxx)
        const usernames = userToPromote.map(jid => `@${jid.split('@')[0]}`);

        const promotionMessage = `*『 GROUP PROMOTION 』*\n\n` +
            `👥 *Promoted:* ${usernames.join(', ')}\n` +
            `👑 *By:* @${senderId.split('@')[0]}\n` +
            `📅 *Date:* ${new Date().toLocaleString()}`;

        await sock.sendMessage(chatId, { 
            text: promotionMessage,
            mentions: [...userToPromote, senderId]
        }, { quoted: message });

    } catch (error) {
        console.error('Promote Error:', error);
        await sock.sendMessage(chatId, { text: '*_❌ Imeshindwa! Hakikisha bot ni admin._*' });
    }
}

// Keep handlePromotionEvent as it was (for auto-detecting system events)
async function handlePromotionEvent(sock, groupId, participants, author) {
    try {
        if (!participants || participants.length === 0) return;
        const promotedUsernames = participants.map(jid => `@${jid.split('@')[0]}`);
        const promotedBy = author ? `@${author.split('@')[0]}` : 'System';

        const msg = `*『 GROUP PROMOTION 』*\n\n` +
            `👥 *User:* ${promotedUsernames.join(', ')}\n` +
            `👑 *Admin:* ${promotedBy}`;

        await sock.sendMessage(groupId, { text: msg, mentions: [...participants, author].filter(Boolean) });
    } catch (e) { console.error(e); }
}

module.exports = { promoteCommand, handlePromotionEvent };
