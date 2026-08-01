/**
 * fromai.js - Send message with AI structure (conversation + metadata)
 * Usage: .fromai <number> <message>
 * Example: .fromai 255612130873 habari kaka
 */

const { randomBytes } = require('crypto');
const { createCtx } = require('../lib/messageBuilder');

// ─── AI CONFIG ──────────────────────────────────────────────────────────────
const AI_CONFIG = {
    name: 'Fiora Sylvie',  // ← JINA LA AI
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
                `📌 *FromAI Usage*\n\n` +
                `.fromai <namba> <ujumbe>\n\n` +
                `Example: .fromai 255612130873 habari kaka`
            );
        }

        // ─── EXTRACT ──────────────────────────────────────────────────────
        const targetNumber = args[0].replace(/[^0-9]/g, '');
        const messageText = args.slice(1).join(' ');

        if (!targetNumber || targetNumber.length < 10) {
            return await ctx.reply(`❌ Invalid number: ${targetNumber || 'Empty'}`);
        }

        if (!messageText || messageText.length < 1) {
            return await ctx.reply(`❌ Empty message`);
        }

        const targetJid = `${targetNumber}@s.whatsapp.net`;

        // ─── SEND PROCESSING ──────────────────────────────────────────────
        await ctx.reply(`⏳ _Sending to ${targetNumber}..._`);

        // ─── SEND AI-STRUCTURED MESSAGE ──────────────────────────────────
        await sendAIStructuredMessage(sock, targetJid, messageText);

        // ─── SEND CONFIRMATION ────────────────────────────────────────────
        await ctx.reply(
            `✅ *Sent to ${targetNumber}*\n\n📝 ${messageText}`
        );

        console.log('[FROMAI] Sent to:', targetNumber);

    } catch (error) {
        console.error('[FROMAI ERROR]', error?.message || error);

        try {
            const ctx = createCtx(sock, chatId, message);
            await ctx.reply(`❌ Error: ${error.message}`);
        } catch (e) {
            console.error('[FROMAI FATAL]', e.message);
        }
    }
}

// ─── SEND AI STRUCTURED MESSAGE ────────────────────────────────────────────
async function sendAIStructuredMessage(sock, targetJid, messageText) {
    try {
        // ─── CREATE AI-STRUCTURED MESSAGE ──────────────────────────────────
        const aiMessage = {
            conversation: AI_CONFIG.name,  // ← "Fiora Sylvie"
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

        // ─── SEND AI-STRUCTURED MESSAGE (FIRST) ──────────────────────────
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

        // ─── SEND ACTUAL TEXT MESSAGE ─────────────────────────────────────
        await sock.sendMessage(targetJid, {
            text: messageText  // ← UJUMBE TU
        });

        console.log('[FROMAI] AI-structured message sent');

    } catch (error) {
        console.error('[SEND AI STRUCTURED ERROR]', error.message);
        
        // ─── FALLBACK ────────────────────────────────────────────────────
        await sock.sendMessage(targetJid, {
            text: messageText
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