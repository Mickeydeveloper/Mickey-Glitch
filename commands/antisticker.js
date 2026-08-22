const { setAntisticker, getAntisticker, removeAntisticker } = require('../lib/index');

async function antistickerCommand(sock, chatId, message, args, options = {}) {
    const isSenderAdmin = options?.isSenderAdmin ?? false;
    if (!isSenderAdmin && !message.key.fromMe) {
        await sock.sendMessage(chatId, { text: '```For Group Admins Only!```' }, { quoted: message });
        return;
    }

    const action = Array.isArray(args) ? String(args[0] || '').toLowerCase() : '';
    const current = await getAntisticker(chatId);

    if (!action) {
        await sock.sendMessage(chatId, {
            text: `*ANTISTICKER SETUP*\n\nStatus: ${current?.enabled ? 'ON' : 'OFF'}\n\n.antisticker on\n.antisticker off`
        }, { quoted: message });
        return;
    }

    if (action === 'on') {
        const saved = await setAntisticker(chatId, true);
        await sock.sendMessage(chatId, { text: saved ? '*Antisticker has been enabled.*' : '*Failed to enable antisticker.*' }, { quoted: message });
        return;
    }

    if (action === 'off') {
        const saved = await removeAntisticker(chatId);
        await sock.sendMessage(chatId, { text: saved ? '*Antisticker has been disabled.*' : '*Failed to disable antisticker.*' }, { quoted: message });
        return;
    }

    await sock.sendMessage(chatId, { text: '*Invalid command. Use .antisticker to see usage.*' }, { quoted: message });
}

async function handleAntistickerDetection(sock, chatId, message, senderId) {
    if (!chatId?.endsWith('@g.us') || message.key?.fromMe || !message.message?.stickerMessage) return false;

    const config = await getAntisticker(chatId);
    if (!config?.enabled) return false;

    try {
        const groupMetadata = await sock.groupMetadata(chatId);
        const sender = groupMetadata.participants?.find(participant => participant.id === senderId);
        if (sender?.admin) return false;
        const botId = sock.user?.id?.split(':')[0];
        const bot = groupMetadata.participants?.find(participant => participant.id?.split(':')[0] === botId);
        if (!bot?.admin) return false;
    } catch (error) {
        console.error('Error checking antisticker permissions:', error);
        return false;
    }

    try {
        await sock.sendMessage(chatId, { delete: message.key });
        return true;
    } catch (error) {
        console.error('Error deleting sticker:', error);
        return false;
    }
}

module.exports = antistickerCommand;
module.exports.handleAntistickerDetection = handleAntistickerDetection;