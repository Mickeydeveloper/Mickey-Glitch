/**
 * getlink.js - Get group invite link
 */
async function getGroupLink(sock, chatId, message) {
    try {
        const code = await sock.groupInviteCode(chatId);
        const link = `https://chat.whatsapp.com/${code}`;
        
        const resText = `╭━━━━〔 *GROUP LINK* 〕━━━━┈⊷\n┃\n┃ 🔗 *Link:* ${link}\n┃\n╰━━━━━━━━━━━━━━━━━━━━┈⊷`;
        await sock.sendMessage(chatId, { text: resText }, { quoted: message });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '❌ *Nifanye Admin kwanza ili nipate link!*' });
    }
}
module.exports = getGroupLink;
