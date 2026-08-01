/**
 * fromai.js - Send single message with AI badge
 * Usage: .fromai <number> <message>
 * Example: .fromai 255612130873 Habari yako?
 */

const { randomBytes } = require('crypto');
const { createCtx } = require('../lib/messageBuilder');

// ─── AI CONFIG ──────────────────────────────────────────────────────────────
const AI_CONFIG = {
    badge: '✨',  // AI BADGE/ICON
    name: 'AI Assistant',
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

        if (!messageText || messageText.length < 1) {
            return await ctx.reply(`❌ *Empty message*`);
        }

        const targetJid = `${targetNumber}@s.whatsapp.net`;

        // ─── SEND PROCESSING ──────────────────────────────────────────────
        await ctx.reply(`⏳ _Sending AI message to ${targetNumber}..._`);

        // ─── SEND SINGLE MESSAGE WITH AI BADGE ────────────────────────────
        await sendSingleAIMessage(sock, targetJid, messageText);

        // ─── SEND CONFIRMATION ────────────────────────────────────────────
        await ctx.reply(
            `✅ *AI Message Sent!*\n\n` +
            `📌 *To:* ${targetNumber}\n` +
            `📝 *Message:* ${messageText}\n` +
            `✨ *Sent with AI badge*\n\n` +
            `💡 The message has been sent as a single AI message.`
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

// ─── SEND SINGLE MESSAGE WITH AI BADGE ────────────────────────────────────
async function sendSingleAIMessage(sock, targetJid, messageText) {
    try {
        // ─── SEND AS RELAY MESSAGE WITH AI BADGE ──────────────────────────
        // Hii inatuma ujumbe mmoja tu wenye badge ya AI kwenye jina
        await sock.relayMessage(targetJid, {
            conversation: `${AI_CONFIG.badge} ${AI_CONFIG.name}`,  // ← JINA LINA BADGE
            messageContextInfo: {
                messageSecret: randomBytes(32),
                supportPayload: JSON.stringify({
                    version: AI_CONFIG.version,
                    is_ai_message: AI_CONFIG.is_ai_message,
                    should_show_system_message: AI_CONFIG.should_show_system_message,
                    ticket_id: AI_CONFIG.ticketId
                })
            }
        }, {
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

        // ─── SEND THE ACTUAL TEXT (UJUMBE TU) ─────────────────────────────
        await sock.sendMessage(targetJid, {
            text: messageText  // ← UJUMBE TU, HAKUNA BADGE KWA SABABU IKO KWENYE JINA
        });

        console.log('[FROMAI] Single AI message sent');

    } catch (error) {
        console.error('[SEND AI MESSAGE ERROR]', error.message);
        
        // ─── FALLBACK: Send as single normal message ──────────────────────
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