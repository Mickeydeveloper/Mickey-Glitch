/**
 * Knight Bot - A WhatsApp Bot
 * Autorecording Command - Shows fake recording status on ALL chats
 * Ikiwa ON, recording itaonekana kwenye kila chat automatically
 */

const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

// Path to store the configuration
const configPath = path.join(__dirname, '..', 'data', 'autorecording.json');

// Store active recording intervals per chat
const activeRecordings = new Map();

// Initialize configuration file if it doesn't exist
function initConfig() {
    if (!fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, JSON.stringify({ enabled: false }, null, 2));
    }
    return JSON.parse(fs.readFileSync(configPath));
}

// Toggle autorecording feature
async function autorecordingCommand(sock, chatId, message) {
    try {
        const senderId = message.key.participant || message.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

        if (!message.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, {
                text: '❌ This command is only available for the owner!'
            });
            return;
        }

        // Get command arguments
        const args = message.message?.conversation?.trim().split(' ').slice(1) || 
                    message.message?.extendedTextMessage?.text?.trim().split(' ').slice(1) || 
                    [];

        // Initialize or read config
        const config = initConfig();

        // Toggle based on argument or toggle current state if no argument
        if (args.length > 0) {
            const action = args[0].toLowerCase();
            if (action === 'on' || action === 'enable') {
                config.enabled = true;
            } else if (action === 'off' || action === 'disable') {
                config.enabled = false;
                // Stop all active recordings when disabling
                await stopAllRecordings(sock);
            } else {
                await sock.sendMessage(chatId, {
                    text: '❌ Invalid option! Use: .autorecording on/off'
                });
                return;
            }
        } else {
            // Toggle current state
            config.enabled = !config.enabled;
            if (!config.enabled) {
                await stopAllRecordings(sock);
            }
        }

        // Save updated configuration
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        // Send confirmation message
        await sock.sendMessage(chatId, {
            text: `✅ Auto-recording has been ${config.enabled ? 'enabled' : 'disabled'}!`
        });

        // If enabled, start recording on all chats
        if (config.enabled) {
            await startRecordingOnAllChats(sock);
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

// Start recording on a single chat (short duration)
async function startRecordingOnChat(sock, chatId) {
    if (!isAutorecordingEnabled()) return false;
    
    try {
        // Clear existing interval for this chat
        if (activeRecordings.has(chatId)) {
            clearInterval(activeRecordings.get(chatId));
            activeRecordings.delete(chatId);
        }
        
        // Subscribe to presence updates
        await sock.presenceSubscribe(chatId).catch(() => {});
        
        // Show recording for 2 seconds only (shorter time)
        await sock.sendPresenceUpdate('recording', chatId).catch(() => {});
        
        // Auto-pause after 2 seconds
        setTimeout(async () => {
            if (isAutorecordingEnabled()) {
                await sock.sendPresenceUpdate('paused', chatId).catch(() => {});
            }
        }, 2000);
        
        // Set interval to show recording every 5 seconds (short burst)
        const interval = setInterval(async () => {
            if (isAutorecordingEnabled()) {
                try {
                    await sock.sendPresenceUpdate('recording', chatId).catch(() => {});
                    
                    // Auto-pause after 2 seconds
                    setTimeout(async () => {
                        if (isAutorecordingEnabled()) {
                            await sock.sendPresenceUpdate('paused', chatId).catch(() => {});
                        }
                    }, 2000);
                } catch (e) {
                    console.error(`Error updating recording for ${chatId}:`, e);
                }
            } else {
                // Stop interval if disabled
                if (activeRecordings.has(chatId)) {
                    clearInterval(activeRecordings.get(chatId));
                    activeRecordings.delete(chatId);
                }
            }
        }, 5000); // Every 5 seconds
        
        activeRecordings.set(chatId, interval);
        return true;
        
    } catch (error) {
        console.error(`❌ Error starting recording for ${chatId}:`, error);
        return false;
    }
}

// Start recording on all active chats
async function startRecordingOnAllChats(sock) {
    if (!isAutorecordingEnabled()) return;
    
    try {
        // Get all active chats from sock
        const allChats = await sock.groupFetchAllParticipating?.() || {};
        const chatIds = Object.keys(allChats);
        
        // Also add common chats
        const commonChats = ['status@broadcast'];
        
        const allChatIds = [...chatIds, ...commonChats];
        
        console.log(`🟢 Starting autorecording on ${allChatIds.length} chats...`);
        
        // Start recording on each chat
        for (const chatId of allChatIds) {
            await startRecordingOnChat(sock, chatId);
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log(`✅ Autorecording active on ${activeRecordings.size} chats`);
        
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

// Handle message with short recording burst
async function handleAutorecordingForMessage(sock, chatId, userMessage) {
    if (isAutorecordingEnabled()) {
        try {
            // Quick recording burst (1.5 seconds only)
            await sock.presenceSubscribe(chatId).catch(() => {});
            await sock.sendPresenceUpdate('recording', chatId).catch(() => {});
            
            // Short delay based on message length (max 2 seconds)
            const shortDelay = Math.min(1500, userMessage.length * 30);
            await new Promise(resolve => setTimeout(resolve, shortDelay));
            
            // Pause
            await sock.sendPresenceUpdate('paused', chatId).catch(() => {});
            
            return true;
        } catch (error) {
            console.error('❌ Error in handleAutorecordingForMessage:', error);
            return false;
        }
    }
    return false;
}

// Handle commands with short recording
async function handleAutorecordingForCommand(sock, chatId) {
    if (isAutorecordingEnabled()) {
        try {
            // Very short recording burst (1 second)
            await sock.presenceSubscribe(chatId).catch(() => {});
            await sock.sendPresenceUpdate('recording', chatId).catch(() => {});
            
            // Short delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Pause
            await sock.sendPresenceUpdate('paused', chatId).catch(() => {});
            
            return true;
        } catch (error) {
            console.error('❌ Error in handleAutorecordingForCommand:', error);
            return false;
        }
    }
    return false;
}

// Show recording after command (short)
async function showRecordingAfterCommand(sock, chatId) {
    if (isAutorecordingEnabled()) {
        try {
            await sock.presenceSubscribe(chatId).catch(() => {});
            await sock.sendPresenceUpdate('recording', chatId).catch(() => {});
            
            // Short burst
            await new Promise(resolve => setTimeout(resolve, 800));
            await sock.sendPresenceUpdate('paused', chatId).catch(() => {});
            
            return true;
        } catch (error) {
            console.error('❌ Error in showRecordingAfterCommand:', error);
            return false;
        }
    }
    return false;
}

// Listen for new chats and auto-start recording
async function onNewChat(sock, chatId) {
    if (isAutorecordingEnabled()) {
        await startRecordingOnChat(sock, chatId);
    }
}

module.exports = {
    autorecordingCommand,
    isAutorecordingEnabled,
    handleAutorecordingForMessage,
    handleAutorecordingForCommand,
    showRecordingAfterCommand,
    startRecordingOnChat,
    startRecordingOnAllChats,
    stopRecordingOnChat,
    stopAllRecordings,
    onNewChat
};