const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

// Config path
const configPath = path.join(__dirname, '../data/autoStatus.json');

// Ensure data folder exists
if (!fs.existsSync(path.dirname(configPath))) {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
}

// Config
let config = {
    enabled: true,
    reactOn: true,
    forwardToOwner: true
};

if (fs.existsSync(configPath)) {
    try {
        const loaded = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        config = { ...config, ...loaded };
    } catch (e) {
        console.error('Failed to load autoStatus config:', e.message);
    }
} else {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Save config safely
function saveConfig() {
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        console.error('Failed to save config file:', error.message);
        return false;
    }
}

// Get owner JID (change this if bot number ≠ your personal number)
function getOwnerJid(sock) {
    // OPTION 1: Forward to bot's own number (default for most self-bots)
    return sock.user?.id?.split(':')[0] + '@s.whatsapp.net';

    // OPTION 2: Replace with your personal number (uncomment if needed)
    // return '255700000000@s.whatsapp.net'; // ← Your real number here
}

// Forward status to owner
async function forwardStatusToOwner(sock, message) {
    try {
        if (!config.forwardToOwner) return;

        const ownerJid = getOwnerJid(sock);
        if (!ownerJid) {
            console.log('Owner JID not available');
            return;
        }

        const msgType = message.message;
        if (!msgType.imageMessage && !msgType.videoMessage) return;

        const sender = message.key.participant || message.key.remoteJid;
        const senderNumber = sender.split('@')[0];

        const caption = `New Private Status\nFrom: ${senderNumber}\nTime: ${new Date().toLocaleString()}`;

        await sock.sendMessage(ownerJid, {
            forward: message,
            caption: caption
        });

        console.log(`Forwarded status from ${senderNumber}`);
    } catch (error) {
        console.error('Error forwarding:', error.message);
    }
}

// Fixed Command Handler
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

        // Safely extract and clean the argument
        let command = '';
        if (args && typeof args === 'string') {
            command = args.trim().toLowerCase();
        }

        // Handle on/off
        if (command === 'on' || command === 'off') {
            const newState = command === 'on';
            config.forwardToOwner = newState;

            if (saveConfig()) {
                await sock.sendMessage(chatId, {
                    text: `*Auto Status Forwarding: ${newState ? 'ENABLED ✅' : 'DISABLED ❌'}*\n\n` +
                          `Private statuses (images/videos) will now ${newState ? '' : 'NOT '}be forwarded to your number.\n\n` +
                          `Auto View: Always ON\n` +
                          `Auto React (🤍): Always ON`
                }, { quoted: msg });

                console.log(`Status forwarding turned ${newState ? 'ON' : 'OFF'} by owner`);
            } else {
                await sock.sendMessage(chatId, {
                    text: 'Failed to save settings! Check server permissions or disk space.'
                }, { quoted: msg });
            }
            return;
        }

        // Show current status (no args or invalid)
        const ownerJid = getOwnerJid(sock);
        const ownerNum = ownerJid ? ownerJid.split('@')[0] : 'Unknown';

        await sock.sendMessage(chatId, {
            text: `*Auto Status Features*\n\n` +
                  `Auto View: Always Enabled 🔒\n` +
                  `Auto React (🤍): Always Enabled 🔒\n` +
                  `Forward to Your Number: ${config.forwardToOwner ? '✅ Enabled' : '❌ Disabled'}\n` +
                  `Target: \`${ownerNum}\`\n\n` +
                  `*Commands:*\n` +
                  `• autostatussave on  → Enable forwarding\n` +
                  `• autostatussave off → Disable forwarding\n` +
                  `• autostatussave     → Show this menu`
        }, { quoted: msg });

    } catch (error) {
        console.error('Critical error in autoStatusCommand:', error);
        await sock.sendMessage(chatId, { 
            text: 'Unexpected error occurred. Check bot console.' 
        }, { quoted: msg });
    }
}

// Checkers
function isAutoStatusEnabled() { return true; }
function isStatusReactionEnabled() { return true; }

// React to status
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
        // Silent fail for reactions
    }
}

// Main handler
async function handleStatusUpdate(sock, status) {
    try {
        if (!isAutoStatusEnabled()) return;

        let message = null;
        let key = null;

        if (status.messages?.length > 0) {
            message = status.messages[0];
            key = message.key;
        } else if (status.key) {
            message = status;
            key = status.key;
        } else if (status.reaction?.key) {
            key = status.reaction.key;
        }

        if (!key || key.remoteJid !== 'status@broadcast') return;

        await sock.readMessages([key]).catch(() => {});

        await reactToStatus(sock, key);

        if (message?.message) {
            await forwardStatusToOwner(sock, message);
        }

    } catch (error) {
        console.error('Error in handleStatusUpdate:', error.message);
    }
}

module.exports = {
    autoStatusCommand,
    handleStatusUpdate
};