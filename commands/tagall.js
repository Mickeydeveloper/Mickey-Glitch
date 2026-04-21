/**
 * Command: .tagall
 * Description: Inatagi washiriki wote wa group.
 * Inafanya kazi bila kutegemea lib ya nje (Independent).
 */

async function tagAllCommand(sock, chatId, senderId, message) {
    try {
        // 1. Pata data ya group (Fetch group metadata)
        // Tunahitaji hii ili kupata list ya participants na vyeo vyao
        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants;

        // 2. Tambua Bot ID (Identify Bot ID)
        // Baileys IDs mara nyingi huwa na format ya 'namba:ad@s.whatsapp.net'
        const botId = sock.user.id.includes(':') 
            ? sock.user.id.split(':')[0] + '@s.whatsapp.net' 
            : sock.user.id;

        // 3. Angalia vyeo (Check admin status)
        // Kama .admin ipo (admin au superadmin), basi ni admin. Kama ni null, ni member.
        const isSenderAdmin = participants.find(p => p.id === senderId)?.admin !== null;
        const isBotAdmin = participants.find(p => p.id === botId)?.admin !== null;

        // 4. Masharti ya usalama (Security checks)
        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { 
                text: '❌ Bot lazima iwe Admin ili iweze kutagi watu wote.' 
            }, { quoted: message });
            return;
        }

        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { 
                text: '🚫 Amri hii ni kwa ajili ya ma-Admin wa group tu.' 
            }, { quoted: message });
            return;
        }

        if (!participants || participants.length === 0) {
            await sock.sendMessage(chatId, { text: 'No participants found.' });
            return;
        }

        // 5. Tengeneza ujumbe (Build message text)
        let messageText = '🔊 *TAG ALL MEMBERS*\n\n';
        
        // Tunatengeneza list ya mentions (@123456)
        const mentions = [];
        for (let participant of participants) {
            messageText += `@${participant.id.split('@')[0]}\n`;
            mentions.push(participant.id);
        }

        // 6. Tuma ujumbe (Send the final message)
        await sock.sendMessage(chatId, {
            text: messageText,
            mentions: mentions
        }, { quoted: message });

    } catch (error) {
        console.error('Error in tagall command:', error);
        // Ikitokea tatizo, mjulishe mtumiaji (Notify user if error occurs)
        try {
            await sock.sendMessage(chatId, { text: '⚠️ Hitilafu imetokea wakati wa kutagi washiriki.' });
        } catch (err) {
            console.error('Failed to send error message:', err);
        }
    }
}

// Export command ili iweze kutumika kwenye main file (Export for use)
module.exports = tagAllCommand;
