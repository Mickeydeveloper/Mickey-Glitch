/**
 * getlink.js - Get group invite link with copy button
 * Uses CTA Copy feature from messageBuilder
 */

const { ButtonV2, createCtx } = require('../lib/messageBuilder');

async function getGroupLink(sock, chatId, message) {
    try {
        // ─── CREATE CTX ──────────────────────────────────────────────────
        const ctx = createCtx(sock, chatId, message);
        
        // ─── CHECK IF GROUP ──────────────────────────────────────────────
        if (!chatId.endsWith('@g.us')) {
            return await ctx.reply('❌ *This command only works in groups!*');
        }

        // ─── GET GROUP LINK ──────────────────────────────────────────────
        const code = await sock.groupInviteCode(chatId);
        const link = `https://chat.whatsapp.com/${code}`;

        // ─── GET GROUP METADATA ──────────────────────────────────────────
        let groupName = 'Group';
        let participantCount = 0;
        try {
            const metadata = await sock.groupMetadata(chatId);
            groupName = metadata.subject || 'Group';
            participantCount = metadata.participants?.length || 0;
        } catch (_) {}

        // ─── CREATE BEAUTIFUL CARD ──────────────────────────────────────
        const card = new ButtonV2(sock)
            .setTitle('🔗 Group Invite Link')
            .setBody(
                `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `📋 *Group Information*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `📌 *Name:* ${groupName}\n` +
                `👥 *Members:* ${participantCount}\n` +
                `🆔 *Group ID:* ${chatId.split('@')[0]}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `🔗 *Invite Link*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `\`${link}\`\n\n` +
                `📌 *Click the button below to copy the link*\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `> ⚡ Mickey Glitch Sub`
            )
            .setFooter(`📅 ${new Date().toLocaleDateString()} | ⚡ Mickey Glitch Sub`)
            
            // ─── CTA COPY BUTTON ──────────────────────────────────────────
            .addButton({
                name: 'cta_copy',
                buttonParamsJson: JSON.stringify({
                    display_text: '📋 Copy Link',
                    copy_code: link,
                    id: 'copy_group_link'
                })
            })
            
            // ─── CTA URL BUTTON ───────────────────────────────────────────
            .addButton({
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '🌐 Open Link',
                    url: link,
                    webview_interaction: false
                })
            })
            
            // ─── QUICK REPLY BUTTON ──────────────────────────────────────
            .addButton({
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: '🔄 Refresh Link',
                    id: '.getlink'
                })
            });

        // ─── SEND CARD ──────────────────────────────────────────────────
        await card.send(chatId, {
            quoted: message,
            fallbackText: `🔗 Group Link: ${link}\n\nShare this link to invite others!`
        });

    } catch (error) {
        console.error('[GETLINK ERROR]', error?.message || error);
        
        // ─── HANDLE ERRORS ──────────────────────────────────────────────
        const ctx = createCtx(sock, chatId, message);
        
        if (error.message?.includes('not-authorized') || error.message?.includes('403')) {
            await ctx.reply('❌ *I need to be an admin to get the group link!*\n\nPlease make me admin and try again.');
        } else if (error.message?.includes('not-found') || error.message?.includes('404')) {
            await ctx.reply('❌ *Group not found or I was removed.*');
        } else {
            await ctx.reply(`❌ *Failed to get group link:*\n${error.message}`);
        }
    }
}

module.exports = getGroupLink;
module.exports.name = 'getlink';
module.exports.aliases = ['link', 'grouplink', 'invite'];
module.exports.category = 'group';
module.exports.default = getGroupLink;
module.exports.handler = getGroupLink;