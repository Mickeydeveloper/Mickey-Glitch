/**
 
 * Autorecording Command - Shows fake recording status on ALL chats
 * Ikiwa ON, recording itaonekana kwenye kila chat automatically
 */

const fs = require('fs');
const path = require('path');

// Path to store the configuration
const configPath = path.join(__dirname, '..', 'data', 'autorecording.json');

// Store active recording timeouts per chat
const activeRecordings = new Map();
let sockGlobal = null; // Store socket reference globally

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

// Check if user is owner (simplified version)
async function isOwner(senderId) {
    try {
        const ownerPath = path.join(__dirname, '..', 'config', 'owner.json');
        if (fs.existsSync(ownerPath)) {
            const ownerData = JSON.parse(fs.readFileSync(ownerPath));
            const owners = ownerData.owners || [];
            return owners.includes(senderId.split('@')[0]) || senderId.includes(ownerData.ownerNumber);
        }
        // If no owner config, check if it's from me
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
                text: '❌ This command is only available for the owner!'
            });
            return;
        }

        // Store socket globally
        sockGlobal = sock;

        // Get command arguments
        let args = [];
        if (message.message?.conversation) {
            args = message.message.conversation.trim().split(' ').slice(1);
        } else if (message.message?.extendedTextMessage?.text) {
            args = message.message.extendedTextMessage.text.trim().split(' ').slice(1);
        }

        // Initialize or read config
        const config = initConfig();

        // Toggle based on argument
        if (args.length > 0) {
            const action = args[0].toLowerCase();
            if (action === 'on' || action === 'enable') {
                config.enabled = true;
                saveConfig(config);
                await sock.sendMessage(chatId, {
                    text: '✅ Auto-recording has been ENABLED!\n📱 Recording status itaonekana kwenye chat zote.'
                });
                // Start recording on all chats
                await startRecordingOnAllChats(sock);
            } else if (action === 'off' || action === 'disable') {
                config.enabled = false;
                saveConfig(config);
                // Stop all active recordings
                await stopAllRecordings(sock);
                await sock.sendMessage(chatId, {
                    text: '✅ Auto-recording has been DISABLED!\n📱 Recording status haitaonekana tena.'
                });
            } else {
                await sock.sendMessage(chatId, {
                    text: '❌ Invalid option!\n📝 Usage: .autorecording on/off\n💡 Current status: ' + (config.enabled ? 'ON' : 'OFF')
                });
            }
        } else {
            // Show current status
            await sock.sendMessage(chatId, {
                text: `📱 Auto-recording status: ${config.enabled ? '✅ ENABLED' : '❌ DISABLED'}\n\n📝 Usage: .autorecording on/off`
            });
        }

    } catch (error) {
        console.error('Error in autorecording command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Error processing command!'
        });
    }
}

// Function to check if autorecording is enabled
function isAutorecordingEnabled() {
    try {
        const config = initConfig();
        return config.enabled;
    } catch (error) {
        console.error('Error checking autorecording status:', error);
        return false;
    }
}

// Start recording on a single chat
async function startRecordingOnChat(sock, chatId) {
    if (!isAutorecordingEnabled()) return false;

    try {
        // Clear existing timeout for this chat
        if (activeRecordings.has(chatId)) {
            clearTimeout(activeRecordings.get(chatId));
            activeRecordings.delete(chatId);
        }

        // Subscribe to presence updates
        await sock.presenceSubscribe(chatId).catch(() => {});

        // Function to show recording
        const showRecording = async () => {
            if (!isAutorecordingEnabled()) return;
            
            try {
                await sock.sendPresenceUpdate('recording', chatId).catch(() => {});
                
                // Automatically pause after 3 seconds
                setTimeout(async () => {
                    if (isAutorecordingEnabled()) {
                        await sock.sendPresenceUpdate('paused', chatId).catch(() => {});
                    }
                }, 3000);
            } catch (e) {
                console.error(`Error updating recording for ${chatId}:`, e);
            }
        };

        // Show recording immediately
        await showRecording();

        // Set interval to show recording every 8 seconds
        const interval = setInterval(async () => {
            if (isAutorecordingEnabled()) {
                await showRecording();
            } else {
                // Stop interval if disabled
                if (activeRecordings.has(chatId)) {
                    clearInterval(activeRecordings.get(chatId));
                    activeRecordings.delete(chatId);
                }
            }
        }, 8000);

        activeRecordings.set(chatId, interval);
        return true;

    } catch (error) {
        console.error(`Error starting recording for ${chatId}:`, error);
        return false;
    }
}

// Start recording on all active chats
async function startRecordingOnAllChats(sock) {
    if (!isAutorecordingEnabled()) return;

    try {
        // Get all groups
        let groupIds = [];
        try {
            const groups = await sock.groupFetchAllParticipating();
            if (groups) {
                groupIds = Object.keys(groups);
            }
        } catch (e) {
            console.error('Error fetching groups:', e);
        }

        // Get all private chats (this is tricky in Baileys)
        // Alternative: We'll record on groups and when messages come to private chats
        
        const allChatIds = [...groupIds];

        console.log(`🟢 Starting autorecording on ${allChatIds.length} groups...`);

        // Start recording on each group
        for (const chatId of allChatIds) {
            await startRecordingOnChat(sock, chatId);
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`✅ Autorecording active on ${activeRecordings.size} groups`);

    } catch (error) {
        console.error('Error starting recording on all chats:', error);
    }
}

// Stop recording on a specific chat
async function stopRecordingOnChat(sock, chatId) {
    try {
        if (activeRecordings.has(chatId)) {
            clearInterval(activeRecordings.get(chatId));
            activeRecordings.delete(chatId);
        }

        // Set status to paused
        await sock.sendPresenceUpdate('paused', chatId).catch(() => {});
        return true;

    } catch (error) {
        console.error(`Error stopping recording for ${chatId}:`, error);
        return false;
    }
}

// Stop all recordings
async function stopAllRecordings(sock) {
    console.log('🔴 Stopping all autorecordings...');

    for (const [chatId, interval] of activeRecordings) {
        clearInterval(interval);
        try {
            await sock.sendPresenceUpdate('paused', chatId).catch(() => {});
        } catch (e) {}
    }

    activeRecordings.clear();
    console.log('✅ All recordings stopped');
}

// Handle incoming message - show recording briefly
async function handleAutorecordingForMessage(sock, chatId, userMessage) {
    if (!isAutorecordingEnabled()) return false;
    
    try {
        // Show recording for 2 seconds when message arrives
        await sock.presenceSubscribe(chatId).catch(() => {});
        await sock.sendPresenceUpdate('recording', chatId).catch(() => {});
        
        // Short delay based on message length
        const delay = Math.min(2000, (userMessage?.length || 10) * 50);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Pause after "recording"
        await sock.sendPresenceUpdate('paused', chatId).catch(() => {});
        
        return true;
    } catch (error) {
        console.error('Error in handleAutorecordingForMessage:', error);
        return false;
    }
}

// Show recording after command execution
async function showRecordingAfterCommand(sock, chatId) {
    if (!isAutorecordingEnabled()) return false;
    
    try {
        await sock.presenceSubscribe(chatId).catch(() => {});
        await sock.sendPresenceUpdate('recording', chatId).catch(() => {});
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        await sock.sendPresenceUpdate('paused', chatId).catch(() => {});
        
        return true;
    } catch (error) {
        console.error('Error in showRecordingAfterCommand:', error);
        return false;
    }
}

// Export all functions
module.exports = {
    autorecordingCommand,
    isAutorecordingEnabled,
    handleAutorecordingForMessage,
    showRecordingAfterCommand,
    startRecordingOnChat,
    startRecordingOnAllChats,
    stopRecordingOnChat,
    stopAllRecordings
};