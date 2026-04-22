/**
 * group.js - Mute/Unmute group chat
 */
async function groupControl(sock, chatId, message, args) {
    const action = args[0]?.toLowerCase();

    if (action === 'close' || action === 'mute') {
        await sock.groupSettingUpdate(chatId, 'announcement');
        return sock.sendMessage(chatId, { text: '🔒 *Group limefungwa. Admins tu ndio wanaweza kutuma meseji.*' });
    } 
    
    if (action === 'open' || action === 'unmute') {
        await sock.groupSettingUpdate(chatId, 'not_announcement');
        return sock.sendMessage(chatId, { text: '🔓 *Group limefunguliwa. Kila mtu anaweza kutuma meseji.*' });
    }

    await sock.sendMessage(chatId, { text: '💡 *Usage:* `.group close` au `.group open`' });
}
module.exports = groupControl;
