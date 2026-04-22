/**
 * resetlink.js - Revoke and reset group link
 */
async function resetGroupLink(sock, chatId, message) {
    try {
        await sock.groupRevokeInvite(chatId);
        await sock.sendMessage(chatId, { 
            text: '╭━━━━〔 *LINK RESET* 〕━━━━┈⊷\n┃\n┃ ✅ *Group link imebadilishwa!*\n┃\n╰━━━━━━━━━━━━━━━━━━━━┈⊷' 
        }, { quoted: message });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '❌ *Imeshindwa (Hakikisha mimi ni admin).*' });
    }
}
module.exports = resetGroupLink;
