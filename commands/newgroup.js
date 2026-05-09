const settings = require('../settings');

/**
 * Create new WhatsApp group - Works in both private and group chats
 */
async function newgroupCommand(sock, chatId, message, args) {
    try {
        if (!sock || !chatId || !message) {
            return console.error('❌ Missing required parameters');
        }

        const botNumber = sock.user?.id?.split(':')[0] || '';
        const botJid = sock.user?.id.includes(':') ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : sock.user.id;

        if (!sock.user || !sock.user.id) {
            return await sock.sendMessage(chatId, {
                text: '❌ *Bot haijaunganishwa vizuri. (Bot not connected)*'
            }, { quoted: message });
        }

        // 1. Define group name
        let groupName = (args && args.length > 0) ? args.join(' ').trim() : `Mickey Group ${Date.now()}`;
        groupName = groupName.replace(/[^\w\s\-_]/g, '').trim() || `Group ${Math.floor(Math.random() * 1000)}`;
        
        if (groupName.length > 25) groupName = groupName.substring(0, 25).trim();

        // 2. Define members
        const senderJid = message.sender || message.key?.participant || chatId;
        let members = [];

        try {
            if (chatId?.endsWith('@g.us')) {
                const groupMetadata = await sock.groupMetadata(chatId).catch(() => null);
                if (groupMetadata?.participants) {
                    members = groupMetadata.participants.map(p => p.id);
                }
            }
        } catch (e) {
            console.log('Metadata fetch skipped');
        }

        // Hakikisha sender yupo
        if (senderJid && !members.includes(senderJid)) {
            members.push(senderJid);
        }

        // USALAMA: Safisha list ya members
        members = [...new Set(members)].filter(jid => jid && jid.includes('@s.whatsapp.net') && jid !== botJid);

        // NGUVU MPYA: Hata kama hakuna members wengine, bot itajijumuisha yenyewe na sender
        if (members.length === 0) {
            members = [senderJid];
        }

        // Limit members to 250 for safety
        if (members.length > 250) members = members.slice(0, 250);

        await sock.sendMessage(chatId, { react: { text: '🛠️', key: message.key } });

        try {
            // Add delay
            await new Promise(r => setTimeout(r, 1500));

            // 3. Create group
            const newGroup = await sock.groupCreate(groupName, members);

            if (newGroup && newGroup.id) {
                await sock.sendMessage(chatId, {
                    text: `✅ *Group Limetengenezwa!*\n\n📛 *Jina:* ${groupName}\n👥 *Wanachama:* ${members.length}\n🆔 *ID:* ${newGroup.id}`
                }, { quoted: message });

                // Tuma welcome message
                await sock.sendMessage(newGroup.id, {
                    text: `👋 *Karibuni kwenye ${groupName}!*\n\n_Created via MICKEY GLITCH_`
                }).catch(e => console.log('Welcome msg failed'));
                
                await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
            }

        } catch (error) {
            console.error('Inner creation error:', error);
            
            // Kama members wote wamekataa (Privacy), jaribu kutengeneza na sender pekee
            if (members.length > 1) {
                try {
                    const fallbackGroup = await sock.groupCreate(groupName, [senderJid]);
                    return await sock.sendMessage(chatId, {
                        text: `✅ *Group limeundwa na wewe pekee!* (Wengine wana privacy settings).`
                    }, { quoted: message });
                } catch (e2) {
                    throw error; // Rusha error ya kwanza kama hii pia ikifeli
                }
            }
            throw error;
        }

    } catch (e) {
        console.error('Final Catch:', e);
        const errType = e.message || 'Unknown';
        await sock.sendMessage(chatId, {
            text: `❌ *Imeshindwa:* ${errType}\n\n_Hakikisha bot ina ruhusa ya kuunda group._`
        }, { quoted: message });
    }
}

module.exports = newgroupCommand;
module.exports.name = 'newgroup';
module.exports.category = 'GENERAL';
module.exports.description = 'Create a new group even with one member';
