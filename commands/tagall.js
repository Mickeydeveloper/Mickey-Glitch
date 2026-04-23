const isAdmin = require('../lib/isAdmin');
const { checkAdminPermissions } = require('../lib/commandHelper');

async function tagAllCommand(sock, chatId, m, text, options) {
    try {
        // 1. CHECK ADMIN/USER STATUS
        const isGroup = chatId.endsWith('@g.us');
        if (!isGroup) {
            return await sock.sendMessage(chatId, {
                text: '⚠️ *Amri hii ni ya makundi tu!*'
            }, { quoted: m });
        }

        // Get bot admin status
        const groupMetadata = await sock.groupMetadata(chatId).catch(() => null);
        if (!groupMetadata) {
            return await sock.sendMessage(chatId, {
                text: '❌ *Imeshindwa kupata taarifa za kikundi.*'
            }, { quoted: m });
        }

        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupMetadata?.participants?.some(p => 
            (p.id === botId || p.id === sock.user.id) && (p.admin === 'admin' || p.admin === 'superadmin')
        ) || false;
        
        if (!isBotAdmin) {
            return await sock.sendMessage(chatId, { 
                text: '❌ *Bot lazima iwe admin ili iweze kutag watu wote (Tagall).* ' 
            }, { quoted: m });
        }

        // 2. GET GROUP DATA
        const participants = groupMetadata.participants || [];
        const groupName = groupMetadata.subject || 'Group';

        // 3. PREPARE MESSAGE
        // Kama mtumiaji aliandika ".tagall Amkeni", bot itasoma "Amkeni"
        const msgText = typeof text === 'string' ? text : "";
        const caption = msgText.trim() ? msgText.trim() : '🔔 Amkeni wote! (Everyone wake up!)';

        let messageText = `📢 *『 TAG ALL MEMBERS 』*\n\n`;
        messageText += `👥 *Members:* ${participants.length}\n`;
        messageText += `💬 *Message:* ${caption}\n\n`;
        messageText += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        participants.forEach((participant, index) => {
            messageText += `${index + 1}. @${participant.id.split('@')[0]}\n`;
        });

        // 4. SEND MESSAGE
        await sock.sendMessage(chatId, {
            text: messageText,
            mentions: participants.map(p => p.id)
        }, { quoted: m });

        // 5. REACT AFTER SUCCESS
        await sock.sendMessage(chatId, { react: { text: '✅', key: m.key } }).catch(() => {});

    } catch (error) {
        console.error('Error in tagall command:', error.message);
        // Kimya (Silent catch) kuzuia kelele kwny chat
    }
}

module.exports = tagAllCommand;
