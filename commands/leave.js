/**
 * leave.js - Leave a group (Bot only)
 * Usage: .leave
 */

async function leaveCommand(sock, chatId, m, text, options) {
    try {
        const isGroup = chatId.endsWith('@g.us');
        if (!isGroup) {
            return await sock.sendMessage(chatId, { 
                text: '⚠️ *Amri hii ni ya makundi tu!*' 
            }, { quoted: m });
        }

        // Only owner/sudo can use this
        if (!options?.isOwner) {
            return await sock.sendMessage(chatId, { 
                text: '❌ *Owner only!*' 
            }, { quoted: m });
        }

        // Send goodbye message
        const msg = `╭━━━━〔 *GOODBYE* 〕━━━━┈⊷\n` +
            `┃\n` +
            `┃ 👋 *Asante kwa kumkamatia Mickey!*\n` +
            `┃ 🤖 Naumuhimu kukoma kwenye kikundi.\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━━━━━┈⊷`;
        
        await sock.sendMessage(chatId, { text: msg });

        // Leave the group
        setTimeout(async () => {
            try {
                await sock.groupLeave(chatId);
                console.log(`✅ Bot left group: ${chatId}`);
            } catch (err) {
                console.error('[LEAVE] Failed to leave group:', err.message);
            }
        }, 1000);

    } catch (err) {
        console.error('[LEAVE] Error:', err.message);
        await sock.sendMessage(chatId, { text: '❌ *Hitilafu! Jaribu tena...*' }, { quoted: m }).catch(() => {});
    }
}

module.exports = leaveCommand;
