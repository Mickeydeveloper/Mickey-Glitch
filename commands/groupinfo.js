/**
 * groupinfo.js - Show detailed group information
 * Usage: .groupinfo
 */

async function groupInfoCommand(sock, chatId, m, text, options) {
    try {
        const isGroup = chatId.endsWith('@g.us');
        if (!isGroup) {
            return await sock.sendMessage(chatId, { 
                text: '⚠️ *Amri hii ni ya makundi tu!*' 
            }, { quoted: m });
        }

        // Get group metadata
        const groupMeta = await sock.groupMetadata(chatId).catch(() => null);
        if (!groupMeta) {
            return await sock.sendMessage(chatId, { text: '❌ *Imeshindwa kupata taarifa za kikundi.*' }, { quoted: m });
        }

        const participants = groupMeta.participants || [];
        const admins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
        const createdTime = new Date(groupMeta.creation * 1000).toLocaleDateString('sw-TZ', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const groupOwner = groupMeta.owner || 'Unknown';
        const memberCount = participants.length;
        const adminCount = admins.length;
        const restricted = groupMeta.restrict === 'on' ? '✅ ENABLED' : '❌ DISABLED';
        const announced = groupMeta.announce === 'on' ? '✅ ENABLED' : '❌ DISABLED';

        let info = `╔═══════════════════════════╗\n`;
        info += `║  📊 *GROUP INFO* 📊  ║\n`;
        info += `╚═══════════════════════════╝\n\n`;
        info += `👥 *Jina:* \`${groupMeta.subject}\`\n`;
        info += `🆔 *ID:* \`${chatId}\`\n`;
        info += `👤 *Owner:* \`${groupOwner.split('@')[0]}\`\n`;
        info += `📅 *Iliyoundwa:* \`${createdTime}\`\n\n`;
        info += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        info += `📈 *STATISTICS:*\n`;
        info += `  👥 Members: \`${memberCount}\`\n`;
        info += `  👨‍💼 Admins: \`${adminCount}\`\n`;
        info += `  🔒 Restricted: ${restricted}\n`;
        info += `  📢 Announced: ${announced}\n\n`;
        info += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        info += `🛡️ *ADMINS:*\n`;

        if (admins.length > 0) {
            admins.slice(0, 10).forEach((admin, index) => {
                info += `  ${index + 1}. @${admin.id.split('@')[0]}\n`;
            });
            if (admins.length > 10) {
                info += `  ... *+${admins.length - 10} more*\n`;
            }
        } else {
            info += `  _Walipo admins_\n`;
        }

        info += `\n━━━━━━━━━━━━━━━━━━━━━━━━`;

        await sock.sendMessage(chatId, { text: info }, { quoted: m });
        
        // React with success
        await sock.sendMessage(chatId, { react: { text: '✅', key: m.key } }).catch(() => {});

    } catch (err) {
        console.error('[GROUPINFO] Error:', err.message);
        await sock.sendMessage(chatId, { text: '❌ *Hitilafu! Jaribu tena...*' }, { quoted: m }).catch(() => {});
    }
}

module.exports = groupInfoCommand;
