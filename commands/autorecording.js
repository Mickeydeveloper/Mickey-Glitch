/**
 * Auto-recording Command - Shows recording status when message IS RECEIVED
 * Ikiwa ON, recording itaonekana automatically kwenye chat pale ujumbe unapoingia
 */

const fs = require('fs');
const path = require('path');

// Path to store the configuration
const configPath = path.join(__dirname, '..', 'data', 'autorecording.json');

// Store active recording timeouts per chat
const activeRecordings = new Map();

// Initialize configuration file if it doesn't exist
function initConfig() {
    if (!fs.existsSync(configPath)) {
        const dir = path.dirname(configPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(configPath, JSON.stringify({ enabled: false }, null, 2));
    }
    return JSON.parse(fs.readFileSync(configPath));
}

// Save configuration
function saveConfig(config) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Check if user is owner
async function isOwner(senderId) {
    try {
        const ownerPath = path.join(__dirname, '..', 'config', 'owner.json');
        if (fs.existsSync(ownerPath)) {
            const ownerData = JSON.parse(fs.readFileSync(ownerPath));
            const owners = ownerData.owners || [];
            return owners.includes(senderId.split('@')[0]) || senderId.includes(ownerData.ownerNumber);
        }
        return false;
    } catch (error) {
        console.error('Error checking owner:', error);
        return false;
    }
}

// Toggle autorecording feature
async function autorecordingCommand(sock, chatId, message) {
    try {
        const senderId = message.key.participant || message.key.remoteJid;
        const isOwnerUser = await isOwner(senderId);

        if (!message.key.fromMe && !isOwnerUser) {
            await sock.sendMessage(chatId, {
                text: '❌ Command hii ni kwa owner pekee!'
            });
            return;
        }

        // Get command arguments
        let args = [];
        if (message.message?.conversation) {
            args = message.message.conversation.trim().split(' ').slice(1);
        } else if (message.message?.extendedTextMessage?.text) {
            args = message.message.extendedTextMessage.text.trim().split(' ').slice(1);
        }

        const config = initConfig();

        if (args.length > 0) {
            const action = args[0].toLowerCase();
            if (action === 'on' || action === 'enable') {
                config.enabled = true;
                saveConfig(config);
                await sock.sendMessage(chatId, {
                    text: '✅ *Auto-recording IMEWASHWA!*\n\n📱 Sasa recording itaonekana automatically kwenye:\n• Group chats\n• Private chats\n\n✨ Kila ujumbe unapoingia, itaonyesha "recording..." kwa sekunde chache.'
                });
            } else if (action === 'off' || action === 'disable') {
                config.enabled = false;
                saveConfig(config);
                await sock.sendMessage(chatId, {
                    text: '✅ *Auto-recording IMEZIMWA!*\n\n📱 Recording status haitaonekana tena.'
                });
            } else {
                await sock.sendMessage(chatId, {
                    text: '❌ Option isiyo sahihi!\n\n📝 *Usage:* .autorecording on/off\n💡 *Current status:* ' + (config.enabled ? '✅ IMEWASHWA' : '❌ IMEZIMWA')
                });
            }
        } else {
            await sock.sendMessage(chatId, {
                text: `📱 *Auto-recording Status:* ${config.enabled ? '✅ IMEWASHWA' : '❌ IMEZIMWA'}\n\n📝 *Usage:* .autorecording on/off\n\n⚡ *Feature:* Inaonyesha "recording..." automatically pale ujumbe unapoingia kwenye groups au private chats.`
            });
        }

    } catch (error) {
        console.error('Error in autorecording command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Error processing command!'
        });
    }
}

// Check if autorecording is enabled
function isAutorecordingEnabled() {
    try {
        const config = initConfig();
        return config.enabled;
    } catch (error) {
        console.error('Error checking autorecording status:', error);
        return false;
    }
}

// MAIN FUNCTION: Show recording when a message is RECEIVED
async function showRecordingOnMessageReceived(sock, chatId, messageText = '') {
    if (!isAutorecordingEnabled()) return false;

    try {
        // Clear any existing recording timeout for this chat
        if (activeRecordings.has(chatId)) {
            clearTimeout(activeRecordings.get(chatId));
            activeRecordings.delete(chatId);
        }

        // Subscribe to presence updates
        await sock.presenceSubscribe(chatId).catch(() => {});

        // Show recording status (kana kwamba bot inarekodi ujumbe ulioingia)
        await sock.sendPresenceUpdate('recording', chatId).catch(() => {});

        // Duration based on message length (1-3 seconds)
        let duration = 2000; // default 2 seconds
        
        if (messageText && messageText.length > 0) {
            duration = Math.min(3000, Math.max(1000, messageText.length * 20));
        }

        // Auto-pause after duration
        const timeout = setTimeout(async () => {
            if (isAutorecordingEnabled()) {
                await sock.sendPresenceUpdate('paused', chatId).catch(() => {});
                activeRecordings.delete(chatId);
            }
        }, duration);

        activeRecordings.set(chatId, timeout);
        
        return true;

    } catch (error) {
        console.error(`Error showing recording for ${chatId}:`, error);
        return false;
    }
}

// Stop recording on a specific chat
async function stopRecording(sock, chatId) {
    try {
        if (activeRecordings.has(chatId)) {
            clearTimeout(activeRecordings.get(chatId));
            activeRecordings.delete(chatId);
        }
        await sock.sendPresenceUpdate('paused', chatId).catch(() => {});
        return true;
    } catch (error) {
        console.error(`Error stopping recording for ${chatId}:`, error);
        return false;
    }
}

// Export functions
module.exports = {
    autorecordingCommand,
    isAutorecordingEnabled,
    showRecordingOnMessageReceived,  // Call this when message is RECEIVED
    stopRecording
};