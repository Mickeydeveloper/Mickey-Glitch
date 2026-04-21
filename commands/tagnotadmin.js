/**
 * tagnotadmin.js
 * Tag Non-Admins command - Imeboreshwa na kutumia isAdmin mpya
 */

const { isAdmin } = require('../lib/isAdmin');

async function tagNotAdminCommand(sock, chatId, senderId, message) {
    try {
        // Tumia isAdmin iliyoboreshwa
        const adminStatus = await isAdmin(sock, chatId, senderId);

        if (!adminStatus.isGroup) {
            await sock.sendMessage(chatId, { 
                text: '*_❌ Hii command inafanya kazi kwenye group pekee!_*' 
            }, { quoted: message });
            return;
        }

        if (!adminStatus.isBotAdmin) {
            await sock.sendMessage(chatId, { 
                text: '*_⚠️ Bot lazima iwe Admin ili iweze kutag non-admins!_\n\nNipandishe vyeo kwanza.' 
            }, { quoted: message });
            return;
        }

        if (!adminStatus.isSenderAdmin) {
            await sock.sendMessage(chatId, { 
                text: '*_❌ Only group admins can use .tagnotadmin command!_*' 
            }, { quoted: message });
            return;
        }

        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants || [];

        // Filter non-admins only
        const nonAdmins = participants
            .filter(p => !p.admin || p.admin === null) // Hakuna admin role
            .map(p => p.id);

        if (nonAdmins.length === 0) {
            await sock.sendMessage(chatId, { 
                text: '*_✅ Hakuna non-admin members katika group hii._*' 
            }, { quoted: message });
            return;
        }

        // Tengeneza ujumbe
        let text = `👥 *TAG NON-ADMIN MEMBERS*\n\n`;
        text += `🏷️ *Group:* ${groupMetadata.subject || 'Unknown Group'}\n`;
        text += `👤 *Aliyeita:* @${senderId.split('@')[0]}\n`;
        text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        nonAdmins.forEach(jid => {
            text += `◦ @${jid.split('@')[0]}\n`;
        });

        // Tuma ujumbe
        await sock.sendMessage(chatId, {
            text: text,
            mentions: nonAdmins
        }, { quoted: message });

    } catch (error) {
        console.error('Error in tagnotadmin command:', error);
        
        await sock.sendMessage(chatId, { 
            text: '*_❌ Imeshindwa kutekeleza .tagnotadmin.\nJaribu tena au angalia console._*' 
        }, { quoted: message });
    }
}

module.exports = tagNotAdminCommand;