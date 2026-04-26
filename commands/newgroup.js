const { sendInteractiveMessage } = require('gifted-btns');
const settings = require('../settings');

/**
 * Create new WhatsApp group
 */
async function newgroupCommand(sock, chatId, message, args) {
    try {
        if (!message.isGroup) {
            return await sock.sendMessage(chatId, {
                text: '❌ *This command only works in groups!*\n\n*Usage:* `.newgroup GroupName`'
            }, { quoted: message });
        }

        // Check if user is admin
        const groupMetadata = await sock.groupMetadata(chatId);
        const isAdmin = groupMetadata.participants.find(p => p.id === message.sender)?.admin;

        if (!isAdmin) {
            return await sock.sendMessage(chatId, {
                text: '❌ *Only admins can use this command!*'
            }, { quoted: message });
        }

        const groupName = args.join(' ') || `Group ${new Date().getTime()}`;
        
        if (!groupName || groupName.trim().length === 0) {
            return await sock.sendMessage(chatId, {
                text: '❌ *Please provide a group name!*\n\n*Usage:* `.newgroup GroupName`'
            }, { quoted: message });
        }

        // Get current group members
        const members = groupMetadata.participants.map(p => p.id);

        try {
            // Create new group with specified name and members
            const newGroup = await sock.groupCreate(groupName, members);
            
            await sock.sendMessage(chatId, {
                text: `✅ *New Group Created!*

📛 *Group Name:* ${groupName}
👥 *Members:* ${members.length}
🆔 *Group ID:* ${newGroup.gid}

🔗 *Invite Link:* ${newGroup.inviteLink || 'N/A'}`
            }, { quoted: message });

            // Send info to new group
            await sock.sendMessage(newGroup.gid, {
                text: `👋 *Welcome to ${groupName}!*\n\n_Created using MICKEY GLITCH_`
            });

        } catch (error) {
            await sock.sendMessage(chatId, {
                text: `❌ *Failed to create group!*\n\n_Error: ${error.message}_`
            }, { quoted: message });
        }

    } catch (e) {
        console.error('NewGroup Cmd Error:', e);
        await sock.sendMessage(chatId, {
            text: '❌ *Error occurred! (Hitilafu imetokea)*'
        }, { quoted: message });
    }
}

module.exports = newgroupCommand;
module.exports.name = 'newgroup';
module.exports.category = 'GROUP';
module.exports.description = 'Create a new WhatsApp group with current members';
