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

// Load config
if (fs.existsSync(configPath)) {
    try {
        const loaded = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        config = { ...config, ...loaded };
    } catch (e) {
        console.error('Config load error:', e.message);
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
        console.error('Config save failed:', error.message);
        return false;
    }
}

// Set your target number here (where statuses are forwarded)
// Default: bot's own number. Change if you use a different personal number
function getOwnerJid(sock) {
    return sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
    // return '255612130873@s.whatsapp.net'; // ← Uncomment & set your real number if different
}

// IMPROVED: Forward status with premium caption showing sender details
async function forwardStatusToOwner(sock, message) {
    try {
        if (!config.forwardToOwner) return;

        const ownerJid = getOwnerJid(sock);
        if (!ownerJid) return;

        const msgType = message.message;
        if (!msgType?.imageMessage && !msgType?.videoMessage) return;

        const senderJid = message.key.participant || message.key.remoteJid;
        const senderNumber = senderJid.split('@')[0];

        // Get contact info (pushname, verified name)
        let displayName = senderNumber;
        let isVerified = '';

        try {
            const contact = await sock.getContactById(senderJid);
            const name = contact?.notify || contact?.name || contact?.verifiedName;
            if (name && name !== senderNumber) {
                displayName = name;
            }
            if (contact?.verifiedName) {
                isVerified = ' ✅';
            }
        } catch (e) {
            // Fallback to number if contact fetch fails
        }

        // Format time and date
        const now = new Date();
        const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const date = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

        // Premium Glitch-Style Caption
        const caption = `
╭━━━━━━━━✦ New Status ✦━━━━━━━━╮
┃                               ┃
┃  👤 From   : \( {displayName} \){isVerified}
┃  📱 Number : ${senderNumber}
┃  🕐 Time   : ${time}
┃  📅 Date   : ${date}
┃                               ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

✨ Saved by Mickey Glitch ✨
`.trim();

        await sock.sendMessage(ownerJid, {
            forward: message,
            caption: caption
        });

        console.log(`Status forwarded from \( {displayName} ( \){senderNumber})`);
    } catch (error) {
        console.error('Forward error:', error.message);
    }
}

// Premium Menu
const getStatusMenu = (targetNum, isEnabled) => `
╭━━━━━━━━✦ Auto Status ✦━━━━━━━━╮
┃                               ┃
┃  📱 View    : Always Active 🔒 ┃
┃  💫 React   : Always Active 🤍 ┃
┃  ➡️ Forward : ${isEnabled ? '✅ ENABLED' : '❌ DISABLED'}       ┃
┃  👤 Target  : ${targetNum}     ┃
┃                               ┃
┃  ✧ Commands ✧                 ┃
┃  • on   → Enable forwarding   ┃
┃  • off  → Disable forwarding  ┃
┃  • (no arg) → Show menu       ┃
┃                               ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

✨ Mickey Glitch is watching all statuses for you ✨
`.trim();

// Command handler
async function autoStatusCommand(sock, chatId, msg, args) {
    try {
        const senderId = msg.key.participant || msg.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

        if (!msg.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, { text: '❌ Owner-only command!' }, { quoted: msg });
            return;
        }

        const command = args && typeof args === 'string' ? args.trim().toLowerCase() : '';

        if (command === 'on' || command === 'off') {
            const newState = command === 'on';
            config.forwardToOwner = newState;

            if (saveConfig()) {
                const status = newState ? 'ENABLED ✅' : 'DISABLED ❌';
                const feedback = newState 
                    ? 'Now receiving all private statuses instantly! ✨' 
                    : 'Status forwarding stopped.';
                await sock.sendMessage(chatId, {
                    text: `✦ *Forwarding \( {status}*\n\n \){feedback}`
                }, { quoted: msg });
            } else {
                await sock.sendMessage(chatId, { text: '❌ Failed to save settings!' }, { quoted: msg });
            }
            return;
        }

        // Show menu
        const ownerJid = getOwnerJid(sock);
        const ownerNum = ownerJid ? ownerJid.split('@')[0] : 'Unknown';

        await sock.sendMessage(chatId, {
            text: getStatusMenu(ownerNum, config.forwardToOwner)
        }, { quoted: msg });

    } catch (error) {
        console.error('Command error:', error);
        await sock.sendMessage(chatId, { text: '⚠️ Error occurred!' }, { quoted: msg });
    }
}

// Feature checks
function isAutoStatusEnabled() { return true; }
function isStatusReactionEnabled() { return true; }

// React with white heart
async function reactToStatus(sock, statusKey) {
    if (!isStatusReactionEnabled()) return;
    try {
        await sock.relayMessage('status@broadcast', {
            reactionMessage: { key: statusKey, text: '🤍' }
        }, { messageId: statusKey.id });
    } catch (e) {}
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
        console.error('Handler error:', error.message);
    }
}

module.exports = {
    autoStatusCommand,
    handleStatusUpdate
};