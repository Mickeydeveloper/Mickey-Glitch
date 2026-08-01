/**
 * fromai.js - Send message as AI to any number
 * Usage: .fromai <number> <message>
 * Example: .fromai 255612130873 Habari yako?
 */

const { randomBytes } = require('crypto');
const { createCtx, ButtonV2 } = require('../lib/messageBuilder');

// ─── AI CONFIG ──────────────────────────────────────────────────────────────
const AI_CONFIG = {
    name: 'Fiora Sylvie',
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
                `🤖 *FromAI Usage*\n\n` +
                `📌 *Format:*\n` +
                `.fromai <namba> <ujumbe>\n\n` +
                `📌 *Example:*\n` +
                `.fromai 255612130873 Habari yako?\n\n` +
                `📌 *Aliases:*\n` +
                `.fiora <namba> <ujumbe>\n` +
                `.sendai <namba> <ujumbe>\n\n` +
                `⚡ Mickey Glitch Sub`
            );
        }

        // ─── EXTRACT NUMBER AND MESSAGE ──────────────────────────────────
        const targetNumber = args[0].replace(/[^0-9]/g, '');
        const messageText = args.slice(1).join(' ');

        // ─── VALIDATE NUMBER ──────────────────────────────────────────────
        if (!targetNumber || targetNumber.length < 10) {
            return await ctx.reply(
                `❌ *Invalid Number*\n\n` +
                `📌 Namba sahihi: 255612130873\n` +
                `📌 Namba yako: ${targetNumber || 'Hakuna namba'}\n\n` +
                `💡 Tumia: .fromai 255612130873 Ujumbe wako`
            );
        }

        // ─── VALIDATE MESSAGE ──────────────────────────────────────────────
        if (!messageText || messageText.length < 1) {
            return await ctx.reply(
                `❌ *Empty Message*\n\n` +
                `📌 Tafadhali andika ujumbe.\n\n` +
                `💡 Tumia: .fromai ${targetNumber} Ujumbe wako`
            );
        }

        // ─── FORMAT TARGET JID ────────────────────────────────────────────
        const targetJid = targetNumber.includes('@') 
            ? targetNumber 
            : `${targetNumber}@s.whatsapp.net`;

        console.log('[FROMAI] Sending to:', targetJid);
        console.log('[FROMAI] Message:', messageText);

        // ─── SEND PROCESSING MESSAGE ──────────────────────────────────────
        await ctx.reply(`⏳ _Sending AI message to ${targetNumber}..._`);

        // ─── SEND AI-STYLE MESSAGE TO TARGET ──────────────────────────────
        await sendAIMessage(sock, targetJid, messageText);

        // ─── SEND CONFIRMATION ────────────────────────────────────────────
        await ctx.reply(
            `✅ *AI Message Sent!*\n\n` +
            `📌 *To:* ${targetNumber}\n` +
            `📝 *Message:* ${messageText}\n` +
            `🤖 *From:* ${AI_CONFIG.name}\n` +
            `🎫 *Ticket:* ${AI_CONFIG.ticketId}\n\n` +
            `💡 The message has been sent as AI-style.`
        );

        // ─── SEND CONFIRMATION TO TARGET (Optional) ──────────────────────
        // Uncomment if you want to send a confirmation to the target
        // await sendAIMessage(sock, targetJid, `📨 Message sent by ${senderId.split('@')[0]}`);

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

// ─── SEND AI-STYLE MESSAGE ──────────────────────────────────────────────────
async function sendAIMessage(sock, targetJid, messageText) {
    try {
        // ─── CREATE AI-STYLE MESSAGE ──────────────────────────────────────
        const aiMessage = {
            conversation: AI_CONFIG.name,
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

        // ─── SEND ACTUAL TEXT MESSAGE ──────────────────────────────────────
        await sock.sendMessage(targetJid, {
            text: messageText
        });

        console.log('[FROMAI] AI message sent to:', targetJid);

    } catch (error) {
        console.error('[SEND AI MESSAGE ERROR]', error.message);
        
        // ─── FALLBACK: Send as normal message ────────────────────────────
        await sock.sendMessage(targetJid, {
            text: `🤖 *${AI_CONFIG.name}*\n\n${messageText}\n\n⚡ AI-Powered`
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