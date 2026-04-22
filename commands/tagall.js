const isAdmin = require('../lib/isAdmin');

async function tagAllCommand(sock, chatId, senderId, message, userMessage) {
    try {
        // 1. SILENT ADMIN CHECK (Inacheki u-admin wa bot pekee)
        const adminStatus = await isAdmin(sock, chatId, senderId);
        
        // --- FREE FOR ALL ---
        // Nimeondoa "if (!isSenderAdmin)" ili kila mtu aweze kutag wote.
        
        if (!adminStatus.isBotAdmin) {
            return await sock.sendMessage(chatId, { 
                text: '⚠️ *Bot lazima iwe admin ili iweze kutag watu wote (Tagall).* ' 
            }, { quoted: message });
        }

        // 2. GET GROUP DATA
        const groupMetadata = await sock.groupMetadata(chatId).catch(() => null);
        if (!groupMetadata) return;

        const participants = groupMetadata.participants || [];
        const groupName = groupMetadata.subject || 'Group';

        // 3. ANDAA UJUMBE
        // Kama mtumiaji aliandika ".tagall Amkeni", bot itasoma "Amkeni"
        const args = typeof userMessage === 'string' ? userMessage.split(/\s+/).slice(1).join(' ') : '';
        const caption = args ? args : '🔔 Amkeni wote! (Everyone wake up!)';

        let messageText = `📢 *『 TAG ALL MEMBERS 』*\n\n`;
        messageText += `👥 *Members:* ${participants.length}\n`;
        messageText += `💬 *Message:* ${caption}\n\n`;
        messageText += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        participants.forEach((participant, index) => {
            messageText += `${index + 1}. @${participant.id.split('@')[0]}\n`;
        });

        // 4. TUMA UJUMBE
        await sock.sendMessage(chatId, {
            text: messageText,
            mentions: participants.map(p => p.id)
        }, { quoted: message });

        // 5. REACT AFTER SUCCESS
        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }).catch(() => {});

    } catch (error) {
        console.error('Error in tagall command:', error.message);
        // Kimya (Silent catch) kuzuia kelele kwny chat
    }
}

module.exports = tagAllCommand;
