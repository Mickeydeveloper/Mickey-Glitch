const settings = require('../settings');

/**
 * Create new WhatsApp group - Mickey Glitch Edition
 */
async function newgroupCommand(sock, chatId, message, args) {
    try {
        // 1. Basic Checks
        if (!sock?.user) return;
        const senderJid = message.sender || message.key?.participant || chatId;
        const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';

        // 2. Jina la Group
        let groupName = (args && args.length > 0) ? args.join(' ').trim() : `Mickey Group ${Date.now()}`;
        groupName = groupName.substring(0, 25); // Limit 25 chars

        await sock.sendMessage(chatId, { react: { text: '🛠️', key: message.key } });

        // 3. Tafuta Members (Clean List)
        let participants = [];
        
        if (chatId.endsWith('@g.us')) {
            try {
                const meta = await sock.groupMetadata(chatId);
                participants = meta.participants.map(p => p.id);
            } catch (e) {
                participants = [senderJid];
            }
        } else {
            participants = [senderJid];
        }

        // Safisha list: Ondoa bot, ondoa duplicates, hakikisha ni s.whatsapp.net
        participants = [...new Set(participants)].filter(jid => 
            jid.includes('@s.whatsapp.net') && jid !== botJid
        );

        // 4. JARIBIO LA KWANZA: Tengeneza na wote
        try {
            const group = await sock.groupCreate(groupName, participants);
            
            await sock.sendMessage(chatId, { 
                text: `✅ *Group Limetengenezwa!*\n📛 Name: ${groupName}\n👥 Members: ${participants.length}` 
            }, { quoted: message });

        } catch (err) {
            console.error('First attempt failed, trying fallback...');
            
            // 5. FALLBACK (NGUVU YA ZIADA):
            // Ikishindwa (bad-request), inatengeneza group na SENDER pekee.
            // Hii inaepuka error ya Privacy Settings za watu wengine.
            try {
                const fallbackGroup = await sock.groupCreate(groupName, [senderJid]);
                
                await sock.sendMessage(chatId, { 
                    text: `⚠️ *Group limeundwa na wewe pekee.*\n\nSababu: Baadhi ya members walikataa kuongezwa (Privacy Settings).` 
                }, { quoted: message });
                
                await sock.sendMessage(fallbackGroup.id, { text: `👋 Karibu! Wengine unaweza kuwaongeza kwa link.` });

            } catch (finalErr) {
                // Ikishindwa kabisa hata na mtu mmoja
                await sock.sendMessage(chatId, { 
                    text: `❌ *Imeshindwa Kabisa!*\nSababu: ${finalErr.message}` 
                }, { quoted: message });
            }
        }

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (e) {
        console.error('Critical Error:', e);
    }
}

module.exports = newgroupCommand;
