const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

// Config path
const configPath = path.join(__dirname, '../data/autoStatus.json');

// Ensure data folder exists
if (!fs.existsSync(path.dirname(configPath))) {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
}

// Config: only forwarding toggle
let config = {
    enabled: true,            // Auto view + react → always ON
    reactOn: true,            // Auto react → always ON
    forwardToOwner: true      // Forward status media to your number
};

if (fs.existsSync(configPath)) {
    try {
        const loaded = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        config = { ...config, ...loaded };
    } catch (e) {
        console.error('Failed to load config, using defaults');
    }
} else {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Save config
function saveConfig() {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Get the number where statuses should be forwarded (your personal number)
function getOwnerJid(sock) {
    // Change this to your actual personal number if bot runs on different number
    // Example: return '255712345678@s.whatsapp.net';
    
    // Default: forwards to the bot's own number (common for self-hosted bots)
    return sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
}

// Forward status media to owner
async function forwardStatusToOwner(sock, message) {
    try {
        if (!config.forwardToOwner) return;

        const ownerJid = getOwnerJid(sock);
        if (!ownerJid) {
            console.log('Owner JID not found – cannot forward');
            return;
        }

        const msgType = message.message;

        // Only forward images and videos from status
        if (msgType.imageMessage || msgType.videoMessage) {
            const sender = message.key.participant || message.key.remoteJid;
            const senderNumber = sender.split('@')[0];

            const caption = `New Private Status\nFrom: ${senderNumber}\nTime: ${new Date().toLocaleString()}`;

            // Forward the original media with caption
            await sock.sendMessage(ownerJid, {
                forward: message,
                caption: caption
            });

            console.log(`Status forwarded from ${senderNumber} to owner`);
        }
    } catch (error) {
        console.error('Error forwarding status:', error.message);
    }
}

// Command: autostatussave on/off
async function autoStatusCommand(sock, chatId, msg, args) {
    try {
        const senderId = msg.key.participant || msg.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

        if (!msg.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, { 
                text: 'This command is only for the owner!'
            }, { quoted: msg });
            return;
        }

        const command = args.toLowerCase().trim();

        if (command === 'on' || command === 'off') {
            config.forwardToOwner = command === 'on';
            saveConfig();

            await sock.sendMessage(chatId, {
                text: `*Auto Status Forwarding Updated*\n\n` +
                      `Auto View: Always ON\n` +
                      `Auto React: Always ON\n` +
                      `Forward to You: ${config.forwardToOwner ? 'Enabled' : 'Disabled'}\n\n` +
                      `Now private statuses will ${config.forwardToOwner ? 'be sent directly to your number' : 'not be forwarded'}.`
            }, { quoted: msg });

            console.log(`Status forwarding: ${config.forwardToOwner ? 'ON' : 'OFF'}`);
            return;
        }

        // Show current status
        const ownerJid = getOwnerJid(sock);
        const ownerNum = ownerJid ? ownerJid.split('@')[0] : 'Unknown';

        await sock.sendMessage(chatId, {
            text: `*Auto Status Features*\n\n` +
                  `Auto View: Always Enabled\n` +
                  `Auto React (🤍): Always Enabled\n` +
                  `Forward Statuses to You: ${config.forwardToOwner ? 'Enabled' : 'Disabled'}\n` +
                  `Target Number: \`${ownerNum}\`\n\n` +
                  `Commands:\n` +
                  `• \`autostatussave on\` → Enable forwarding\n` +
                  `• \`autostatussave off\` → Disable forwarding\n` +
                  `• \`autostatussave\` → View status`
        }, { quoted: msg });

    } catch (error) {
        console.error('Error in autostatus command:', error);
        await sock.sendMessage(chatId, { text: 'Error updating settings!' }, { quoted: msg });
    }
}

// Always enabled checks
function isAutoStatusEnabled() { return true; }
function isStatusReactionEnabled() { return true; }

// React to status with heart
async function reactToStatus(sock, statusKey) {
    if (!isStatusReactionEnabled()) return;

    try {
        await sock.relayMessage('status@broadcast', {
            reactionMessage: {
                key: statusKey,
                text: '🤍'
            }
        }, { messageId: statusKey.id });
    } catch (error) {
        console.error('Failed to react:', error.message);
    }
}

// Main handler
async function handleStatusUpdate(sock, status) {
    try {
        if (!isAutoStatusEnabled()) return;

        let message = null;
        let key = null;

        // Extract message and key from different formats
        if (status.messages && status.messages.length > 0) {
            message = status.messages[0];
            key = message.key;
        } else if (status.key) {
            message = status;
            key = status.key;
        } else if (status.reaction?.key) {
            key = status.reaction.key;
        }

        if (!key || key.remoteJid !== 'status@broadcast') return;

        // Mark as seen
        await sock.readMessages([key]).catch(() => {});

        // React
        await reactToStatus(sock, key);

        // Forward image/video status to owner
        if (message && message.message) {
            await forwardStatusToOwner(sock, message);
        }

    } catch (error) {
        console.error('Error in status handler:', error.message);
    }
}

module.exports = {
    autoStatusCommand,
    handleStatusUpdate
};