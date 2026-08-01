/**
 * fromai.js - Send message with AI badge icon (no name visible)
 * Usage: .fromai <number> <message>
 */

const { randomBytes } = require('crypto');
const { createCtx } = require('../lib/messageBuilder');

// ─── AI CONFIG WITH BADGE ──────────────────────────────────────────────────
const AI_CONFIG = {
    badge: '✨',  // ← AI BADGE/ICON (huu ndio muundo wa icon)
    ticketId: '1669945700536053',
    version: 1,
    is_ai_message: true,
    should_show_system_message: true
};

// ─── MAIN FROMAI COMMAND ──────────────────────────────────────────────────
async function fromaiCommand(sock, chatId, message, args = []) {
    try {
        const ctx = createCtx(sock, chatId, message, { args });

        // ─── CHECK ARGUMENTS ──────────────────────────────────────────────
        if (!args || args.length < 2) {
            return await ctx.reply(
                `✨ *FromAI Usage*\n\n` +
                `📌 *Format:*\n` +
                `.fromai <namba> <ujumbe>\n\n` +
                `📌 *Example:*\n` +
                `.fromai 255612130873 Habari yako?\n\n` +
                `📌 *Aliases:*\n` +
                `.fiora, .sendai, .aisend\n\n` +
                `⚡ Mickey Glitch Sub`
            );
        }

        // ─── EXTRACT ──────────────────────────────────────────────────────
        const targetNumber = args[0].replace(/[^0-9]/g, '');
        const messageText = args.slice(1).join(' ');

        if (!targetNumber || targetNumber.length < 10) {
            return await ctx.reply(`❌ *Invalid number:* ${targetNumber || 'Empty'}`);
        }

        if (!messageText) {
            return await ctx.reply(`❌ *Empty message*`);
        }

        const targetJid = `${targetNumber}@s.whatsapp.net`;

        // ─── SEND PROCESSING ──────────────────────────────────────────────
        await ctx.reply(`⏳ _Sending AI message to ${targetNumber}..._`);

        // ─── SEND AI MESSAGE WITH BADGE ──────────────────────────────────
        await sendAIMessageWithBadge(sock, targetJid, messageText);

        // ─── SEND CONFIRMATION ────────────────────────────────────────────
        await ctx.reply(
            `✅ *AI Message Sent!*\n\n` +
            `📌 *To:* ${targetNumber}\n` +
            `📝 *Message:* ${messageText}\n` +
            `✨ *Sent with AI badge*\n\n` +
            `💡 The message has been sent with AI badge icon.`
        );

        console.log('[FROMAI] Sent to:', targetNumber);

    } catch (error) {
        console.error('[FROMAI ERROR]', error?.message || error);

        try {
            const ctx = createCtx(sock, chatId, message);
            await ctx.reply(
                `❌ *FromAI Failed*\n\n` +
                `📌 Error: ${error.message}\n\n` +
                `💡 Please try again later.`
            );
        } catch (e) {
            console.error('[FROMAI FATAL]', e.message);
        }
    }
}

// ─── SEND AI MESSAGE WITH BADGE ────────────────────────────────────────────
async function sendAIMessageWithBadge(sock, targetJid, messageText) {
    try {
        // ─── METHOD 1: Send as AI message with badge ──────────────────────
        // Hii inaweka jina la mtumaji kuwa na badge ✨
        const aiMessage = {
            conversation: `${AI_CONFIG.badge} AI Assistant`,  // ← JINA LINA BADGE
            messageContextInfo: {
                messageSecret: randomBytes(32),
                supportPayload: JSON.stringify({
                    version: AI_CONFIG.version,
                    is_ai_message: AI_CONFIG.is_ai_message,
                    should_show_system_message: AI_CONFIG.should_show_system_message,
                    ticket_id: AI_CONFIG.ticketId
                })
            }
        };

        // ─── SEND AI MESSAGE ──────────────────────────────────────────────
        await sock.relayMessage(targetJid, aiMessage, {
            additionalNodes: [
                {
                    tag: 'bot',
                    attrs: {
                        biz_bot: '1'
                    }
                },
                {
                    tag: 'biz',
                    attrs: {}
                }
            ]
        });

        // ─── SEND ACTUAL TEXT ─────────────────────────────────────────────
        await sock.sendMessage(targetJid, {
            text: messageText  // ← UJUMBE TU, HAKUNA ICON KWA SABABU BADGE IKO KWENYE JINA
        });

        console.log('[FROMAI] Message sent with AI badge');

    } catch (error) {
        console.error('[SEND AI MESSAGE ERROR]', error.message);
        
        // ─── FALLBACK ────────────────────────────────────────────────────
        await sock.sendMessage(targetJid, {
            text: `✨ ${messageText}`
        });
    }
}

// ─── EXPORT ──────────────────────────────────────────────────────────────
module.exports = fromaiCommand;
module.exports.name = 'fromai';
module.exports.aliases = ['fiora', 'sendai', 'aisend'];
module.exports.category = 'ai';
module.exports.default = fromaiCommand;
module.exports.handler = fromaiCommand;