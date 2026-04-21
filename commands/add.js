/**
 * add.js 
 * Command ya kuongeza member kwenye group
 */

// FIX: Ongeza mabano { } hapa chini ili kuchukua function yenyewe
const { isAdmin } = require('../lib/isAdmin');

/**
 * Add command: Invite a member to the group by phone number
 * Usage: .add <phone_number>
 * Example: .add 255612130873
 */
async function addCommand(sock, chatId, message, text) {
    try {
        // Guard: Check if socket is ready
        if (!sock || typeof sock.sendMessage !== 'function') {
            return;
        }

        // Extract sender ID from message
        const senderId = message.key.participant || message.key.remoteJid;

        const isGroup = chatId.endsWith('@g.us');
        if (!isGroup) {
            await sock.sendMessage(chatId, { text: '*_❌ Hii command ni ya group pekee!_*' }, { quoted: message });
            return;
        }

        // Check admin status
        const adminStatus = await isAdmin(sock, chatId, senderId);
        
        if (!adminStatus.isSenderAdmin) {
            await sock.sendMessage(chatId, { text: '*_❌ Only group admins can add members!_*' }, { quoted: message });
            return;
        }

        if (!adminStatus.isBotAdmin) {
            await sock.sendMessage(chatId, { text: '*_❌ Bot lazima iwe Admin kwanza!_*' }, { quoted: message });
            return;
        }

        // Extract phone number from text (Safisha namba)
        const textBody = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        let phoneNumber = (textBody || '').trim().replace(/[^0-9]/g, '');
        
        // If no phone number found in message text, it might be in the args
        if (!phoneNumber && text && text.length > 4) {
            phoneNumber = text.trim().replace(/[^0-9]/g, '');
        }
        
        if (!phoneNumber) {
            await sock.sendMessage(chatId, { text: '*_⚠️ Usage: .add 2557xxx_*' }, { quoted: message });
            return;
        }

        if (phoneNumber.length < 10) {
            await sock.sendMessage(chatId, { text: '*_❌ Namba ni fupi mno! Hakikisha ina country code (mf. 255)._*' }, { quoted: message });
            return;
        }

        const memberId = `${phoneNumber}@s.whatsapp.net`;

        try {
            // Add member
            await sock.groupParticipantsUpdate(chatId, [memberId], 'add');

            await sock.sendMessage(chatId, { 
                text: `✅ Umefanikiwa kumuongeza +${phoneNumber} kwenye group!` 
            }, { quoted: message });

        } catch (addError) {
            const errorMsg = addError?.message?.toLowerCase() || '';

            if (errorMsg.includes('already') || errorMsg.includes('409')) {
                await sock.sendMessage(chatId, { text: `⚠️ +${phoneNumber} tayari yumo kwenye group.` }, { quoted: message });
            } else if (errorMsg.includes('403') || errorMsg.includes('privacy')) {
                await sock.sendMessage(chatId, { text: `❌ +${phoneNumber} ameweka privacy, tumia invite link.` }, { quoted: message });
            } else {
                await sock.sendMessage(chatId, { text: `❌ Imeshindwa: ${addError.message}` }, { quoted: message });
            }
        }
    } catch (e) {
        console.error('addCommand error:', e);
        await sock.sendMessage(chatId, { text: '*_❌ Hitilafu imetokea! Jaribu tena._*' }, { quoted: message });
    }
}

module.exports = addCommand;
