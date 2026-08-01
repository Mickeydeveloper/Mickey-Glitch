/**
 * fromai.js - Send message with badge only (no name)
 * Usage: .fromai <number> <message>
 * Example: .fromai 255612130873 habari kaka
 */

const { randomBytes } = require('crypto');
const { createCtx } = require('../lib/messageBuilder');

// ─── AI CONFIG ──────────────────────────────────────────────────────────────
const AI_CONFIG = {
    badge: '✨',  // Badge/icon inayoonekana kwenye ujumbe
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

        // ─── SEND MESSAGE WITH BADGE (NO NAME) ────────────────────────────
        await sendMessageWithBadge(sock, targetJid, messageText);

        // ─── SEND CONFIRMATION ────────────────────────────────────────────
        await ctx.reply(
            `✅ *Sent to ${targetNumber}*\n\n` +
            `${AI_CONFIG.badge} ${messageText}`
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

// ─── SEND MESSAGE WITH BADGE (NO NAME) ────────────────────────────────────
async function sendMessageWithBadge(sock, targetJid, messageText) {
    try {
        // ─── SEND AS NORMAL MESSAGE WITH BADGE ────────────────────────────
        // Hii inatuma ujumbe mmoja tu wenye badge mwanzoni
        await sock.sendMessage(targetJid, {
            text: `${AI_CONFIG.badge} ${messageText}`  // ← BADGE + UJUMBE
        });

        console.log('[FROMAI] Message sent with badge');

    } catch (error) {
        console.error('[SEND MESSAGE ERROR]', error.message);
        
        // ─── FALLBACK ────────────────────────────────────────────────────
        await sock.sendMessage(targetJid, {
            text: `${AI_CONFIG.badge} ${messageText}`
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