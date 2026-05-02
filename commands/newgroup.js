const settings = require('../settings');

/**
 * Create new WhatsApp group - Works in both private and group chats
 */
async function newgroupCommand(sock, chatId, message, args) {
    try {
        if (!sock || !chatId || !message) {
            return console.error('❌ Missing required parameters for newgroup command');
        }

        // Get bot number for reference
        const botNumber = sock.user?.id?.split(':')[0] || '';

        // 1. Define group name (Jina la group)
        const groupName = (args && Array.isArray(args) && args.join(' ').trim()) || `Mickey Group ${Date.now()}`;

        if (!groupName || groupName.length === 0) {
            return await sock.sendMessage(chatId, {
                text: '❌ *Jina la group halipatikani! (Group name not found)*'
            }, { quoted: message });
        }

        // 3. Define members (Wanachama)
        // Ikiwa ni kwenye group, itachukua members wote. Ikiwa ni DM, utakuwa wewe pekee.
        const senderJid = message.sender || message.key?.participant;
        let members = [];

        try {
            if (message.isGroup || chatId?.endsWith('@g.us')) {
                const groupMetadata = await sock.groupMetadata(chatId);
                
                if (groupMetadata && groupMetadata.participants && Array.isArray(groupMetadata.participants)) {
                    members = groupMetadata.participants
                        .filter(p => p && p.id)
                        .map(p => p.id);
                } else {
                    members = senderJid ? [senderJid] : [];
                }

                if (senderJid && !members.includes(senderJid)) {
                    members.push(senderJid);
                }
            } else {
                if (senderJid) {
                    members.push(senderJid);
                }
            }
        } catch (metadataError) {
            console.error('Error getting group metadata:', metadataError);
            if (senderJid) {
                members = [senderJid];
            }
        }

        if (!members || members.length === 0) {
            return await sock.sendMessage(chatId, {
                text: '❌ *Haijaweza kupata wanachama wa kuunda group. (Could not get members)*'
            }, { quoted: message });
        }

        try {
            // 4. Create group (Tengeneza group)
            const newGroup = await sock.groupCreate(groupName, members);

            if (!newGroup || !newGroup.id) {
                throw new Error('Group creation returned invalid response');
            }

            // Tuma jibu kwenye chat ulikotoa amri
            await sock.sendMessage(chatId, {
                text: `✅ *Group Jipya Limetengenezwa!* (New Group Created)\n\n📛 *Jina:* ${groupName}\n👥 *Wanachama:* ${members.length}\n🆔 *ID:* ${newGroup.id}`
            }, { quoted: message });

            // Tuma ujumbe wa kwanza kwenye group jipya
            try {
                await sock.sendMessage(newGroup.id, {
                    text: `👋 *Karibuni kwenye ${groupName}!*\n\n_Created via MICKEY GLITCH_\n\n*Bot Number:* ${botNumber}`
                });
            } catch (welcomeError) {
                console.error('Error sending welcome message:', welcomeError);
            }

        } catch (error) {
            console.error('Group creation error:', error);
            await sock.sendMessage(chatId, {
                text: `❌ *Imeshindwa kutengeneza group!* (Failed to create group)\n\n_Error: ${error.message || 'Unknown error'}_`
            }, { quoted: message });
        }

    } catch (e) {
        console.error('NewGroup Cmd Error:', e);
        try {
            await sock.sendMessage(chatId, {
                text: '❌ *Hitilafu imetokea! (Error occurred)*'
            }, { quoted: message });
        } catch (sendError) {
            console.error('Error sending error message:', sendError);
        }
    }
}

module.exports = newgroupCommand;
module.exports.name = 'newgroup';
module.exports.category = 'GENERAL';
module.exports.description = 'Create a new group (Works in private and group chats)';
