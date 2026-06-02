/**
 * Knight Bot - A WhatsApp Bot
 * Autorecording Command - Shows fake recording status continuously
 */

const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

// Path to store the configuration
const configPath = path.join(__dirname, '..', 'data', 'autorecording.json');

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
            } else {
                await sock.sendMessage(chatId, {
                    text: '❌ Invalid option! Use: .autorecording on/off'
                });
                return;
            }
        } else {
            // Toggle current state
            config.enabled = !config.enabled;
        }

        // Save updated configuration
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        // Send confirmation message
        await sock.sendMessage(chatId, {
            text: `✅ Auto-recording has been ${config.enabled ? 'enabled' : 'disabled'}!`
        });

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

// Start continuous recording (keeps recording status always on)
async function startContinuousRecording(sock, chatId) {
    if (isAutorecordingEnabled()) {
        try {
            // Subscribe to presence updates
            await sock.presenceSubscribe(chatId);
            
            // Send recording status continuously
            await sock.sendPresenceUpdate('recording', chatId);
            
            return true;
        } catch (error) {
            console.error('❌ Error starting continuous recording:', error);
            return false;
        }
    }
    return false;
}

// Keep recording status active - call this repeatedly
async function keepRecordingActive(sock, chatId) {
    if (isAutorecordingEnabled()) {
        try {
            // Refresh recording status every 3 seconds to keep it active
            setInterval(async () => {
                if (isAutorecordingEnabled()) {
                    await sock.sendPresenceUpdate('recording', chatId).catch(() => {});
                }
            }, 3000);
            return true;
        } catch (error) {
            console.error('❌ Error keeping recording active:', error);
            return false;
        }
    }
    return false;
}

// Handle message with continuous recording
async function handleAutorecordingForMessage(sock, chatId, userMessage) {
    if (isAutorecordingEnabled()) {
        try {
            // Start continuous recording
            await startContinuousRecording(sock, chatId);
            
            // Keep it active
            await keepRecordingActive(sock, chatId);
            
            return true;
        } catch (error) {
            console.error('❌ Error in handleAutorecordingForMessage:', error);
            return false;
        }
    }
    return false;
}

// Handle commands with continuous recording - BEFORE command execution
async function handleAutorecordingForCommand(sock, chatId) {
    if (isAutorecordingEnabled()) {
        try {
            // Start continuous recording
            await startContinuousRecording(sock, chatId);
            
            // Keep it active
            await keepRecordingActive(sock, chatId);
            
            return true;
        } catch (error) {
            console.error('❌ Error in handleAutorecordingForCommand:', error);
            return false;
        }
    }
    return false;
}

// Show continuous recording status AFTER command execution
async function showRecordingAfterCommand(sock, chatId) {
    if (isAutorecordingEnabled()) {
        try {
            // Just keep recording active continuously
            await startContinuousRecording(sock, chatId);
            await keepRecordingActive(sock, chatId);
            return true;
        } catch (error) {
            console.error('❌ Error in showRecordingAfterCommand:', error);
            return false;
        }
    }
    return false;
}

// Function to stop recording
async function stopRecording(sock, chatId) {
    try {
        await sock.sendPresenceUpdate('paused', chatId);
        return true;
    } catch (error) {
        console.error('Error stopping recording:', error);
        return false;
    }
}

module.exports = {
    autorecordingCommand,
    isAutorecordingEnabled,
    handleAutorecordingForMessage,
    handleAutorecordingForCommand,
    showRecordingAfterCommand,
    startContinuousRecording,
    keepRecordingActive,
    stopRecording
};