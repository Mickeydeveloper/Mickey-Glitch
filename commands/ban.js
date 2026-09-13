const fs = require('fs');
const isAdmin = require('../lib/isAdmin');
const { isSudo } = require('../lib/index');

function normalizeUserId(value) {
    if (!value) return '';
    const cleaned = String(value).trim();
    if (!cleaned) return '';
    return cleaned.split(':')[0].split('@')[0];
}

function loadBannedUsers() {
    try {
        const file = './data/banned.json';
        if (!fs.existsSync(file)) {
            fs.writeFileSync(file, JSON.stringify([], null, 2));
            return [];
        }
        const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
        return Array.isArray(raw) ? raw : [];
    } catch (error) {
        console.error('[ban] failed to load banned list:', error);
        return [];
    }
}

function saveBannedUsers(list) {
    try {
        fs.writeFileSync('./data/banned.json', JSON.stringify(list, null, 2));
        return true;
    } catch (error) {
        console.error('[ban] failed to save banned list:', error);
        return false;
    }
}

function isUserBanned(userId) {
    const target = normalizeUserId(userId);
    if (!target) return false;

    const bannedUsers = loadBannedUsers();
    return bannedUsers.some(entry => normalizeUserId(entry) === target);
}

async function autoDeleteBannedMessages(sock, chatId, message) {
    if (!message || !chatId) return false;

    const senderId = message.key?.participant || message.key?.remoteJid || message.participant || message.sender;
    if (!senderId || !isUserBanned(senderId)) return false;

    try {
        const messageKey = message.key || {};
        if (messageKey.id) {
            await sock.sendMessage(chatId, { delete: messageKey });
        }

        return true;
    } catch (error) {
        console.error('[ban-auto-delete] failed:', error);
        return false;
    }
}

async function banCommand(sock, chatId, message) {
    const isGroup = chatId.endsWith('@g.us');
    if (isGroup) {
        const senderId = message.key.participant || message.key.remoteJid;
        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);
        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { text: 'Please make the bot an admin to use .ban' }, { quoted: message });
            return;
        }
        if (!isSenderAdmin && !message.key.fromMe) {
            await sock.sendMessage(chatId, { text: 'Only group admins can use .ban' }, { quoted: message });
            return;
        }
    } else {
        const senderId = message.key.participant || message.key.remoteJid;
        const senderIsSudo = await isSudo(senderId);
        if (!message.key.fromMe && !senderIsSudo) {
            await sock.sendMessage(chatId, { text: 'Only owner/sudo can use .ban in private chat' }, { quoted: message });
            return;
        }
    }

    let userToBan;

    if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        userToBan = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
    } else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
        userToBan = message.message.extendedTextMessage.contextInfo.participant;
    }

    if (!userToBan) {
        await sock.sendMessage(chatId, {
            text: 'Please mention the user or reply to their message to ban!'
        }, { quoted: message });
        return;
    }

    try {
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        if (userToBan === botId || userToBan === botId.replace('@s.whatsapp.net', '@lid')) {
            await sock.sendMessage(chatId, { text: 'You cannot ban the bot account.' }, { quoted: message });
            return;
        }
    } catch {}

    try {
        const bannedUsers = loadBannedUsers();
        const normalizedTarget = normalizeUserId(userToBan);
        const exists = bannedUsers.some(entry => normalizeUserId(entry) === normalizedTarget);

        if (!exists) {
            bannedUsers.push(userToBan);
            saveBannedUsers(bannedUsers);

            await sock.sendMessage(chatId, {
                text: `Successfully banned @${userToBan.split('@')[0]}!\nAll future messages from them will be deleted immediately.`,
                mentions: [userToBan],
                quoted: message
            });
        } else {
            await sock.sendMessage(chatId, {
                text: `${userToBan.split('@')[0]} is already banned!`,
                mentions: [userToBan],
                quoted: message
            });
        }
    } catch (error) {
        console.error('Error in ban command:', error);
        await sock.sendMessage(chatId, { text: 'Failed to ban user!' }, { quoted: message });
    }
}

module.exports = banCommand;
module.exports.banCommand = banCommand;
module.exports.autoDeleteBannedMessages = autoDeleteBannedMessages;
module.exports.isUserBanned = isUserBanned;
