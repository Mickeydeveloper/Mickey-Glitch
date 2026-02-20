const fs = require('fs');
const path = require('path');

// 👍 Single reaction emoji for all commands - Always active
const REACTION_EMOJI = '👍';

// Path for storing auto-reaction state
const USER_GROUP_DATA = path.join(__dirname, '../data/userGroupData.json');

// Load auto-reaction state from file (default: enabled)
function loadAutoReactionState() {
    try {
        if (fs.existsSync(USER_GROUP_DATA)) {
            const data = JSON.parse(fs.readFileSync(USER_GROUP_DATA));
            // If not explicitly set, default to true
            return typeof data.autoReaction === 'boolean' ? data.autoReaction : true;
        }
    } catch (error) {
        console.error('Error loading auto-reaction state:', error);
    }
    return true; // default enabled
}

// Save auto-reaction state to file
function saveAutoReactionState(state) {
    try {
        const data = fs.existsSync(USER_GROUP_DATA) 
            ? JSON.parse(fs.readFileSync(USER_GROUP_DATA))
            : { groups: [], chatbot: {} };
        
        data.autoReaction = state;
        fs.writeFileSync(USER_GROUP_DATA, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving auto-reaction state:', error);
    }
}

// Store auto-reaction state
let isAutoReactionEnabled = loadAutoReactionState();

// Function to add reaction to a command message (only if command worked)
async function addCommandReaction(sock, message, commandWorked = false) {
    try {
        // Only react if command actually executed successfully
        if (!commandWorked || !message?.key?.id) return;

        // React with thumbs up emoji only to successful commands
        await sock.sendMessage(message.key.remoteJid, {
            react: {
                text: REACTION_EMOJI,
                key: message.key
            }
        });

    } catch (error) {
        console.debug('Error adding command reaction:', error.message);
    }
}

// Function to handle areact command
async function handleAreactCommand(sock, chatId, message, isOwner) {
    try {
        if (!isOwner) {
            await sock.sendMessage(chatId, { 
                text: '❌ This command is only available for the owner!',
                quoted: message
            });
            return;
        }

        const args = message.message?.conversation?.split(' ') || [];
        const action = args[1]?.toLowerCase();

        if (action === 'on') {
            isAutoReactionEnabled = true;
            saveAutoReactionState(true);
            await sock.sendMessage(chatId, { 
                text: '✅ Auto-reactions have been enabled globally',
                quoted: message
            });
        } else if (action === 'off') {
            isAutoReactionEnabled = false;
            saveAutoReactionState(false);
            await sock.sendMessage(chatId, { 
                text: '✅ Auto-reactions have been disabled globally',
                quoted: message
            });
        } else {
            const currentState = isAutoReactionEnabled ? 'enabled' : 'disabled';
            await sock.sendMessage(chatId, { 
                text: `Auto-reactions are currently ${currentState} globally.\n\nUse:\n.areact on - Enable auto-reactions\n.areact off - Disable auto-reactions`,
                quoted: message
            });
        }
    } catch (error) {
        console.error('Error handling areact command:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Error controlling auto-reactions',
            quoted: message
        });
    }
}

module.exports = {
    addCommandReaction,
    handleAreactCommand
}; 