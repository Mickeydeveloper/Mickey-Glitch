/**
 * fromai.js - AI Style Message with Buttons
 * Fixed: Now works properly!
 */

const { randomBytes } = require('crypto');
const { ButtonV2, Button, createCtx, AIRich } = require('../lib/messageBuilder');

// ─── AI USER CONFIG ──────────────────────────────────────────────────────
const AI_CONFIG = {
    name: 'Fiora Sylvie',
    fromNumber: '255612130873',
    ticketId: '1669945700536053',
    version: 1,
    is_ai_message: true,
    should_show_system_message: true
};

// ─── MAIN FROMAI COMMAND ──────────────────────────────────────────────────
async function fromaiCommand(sock, chatId, message, args = []) {
    try {
        // ─── CREATE CTX ──────────────────────────────────────────────────
        const ctx = createCtx(sock, chatId, message, { args });

        if (!sock) throw new Error('Socket connection not found');
        if (!chatId) throw new Error('Chat ID not found');

        // ─── GET ARGUMENTS ────────────────────────────────────────────────
        const query = Array.isArray(args) ? args.join(' ') : args;

        // ─── CHECK SUBCOMMANDS ────────────────────────────────────────────
        if (query?.toLowerCase() === 'help' || query?.toLowerCase() === 'menu') {
            return await showFromAIHelp(sock, chatId, message);
        }

        // ─── SEND PROCESSING MESSAGE ────────────────────────────────────
        await ctx.reply('⏳ _Processing AI media engine, please wait..._');

        // ─── SEND NORMAL MESSAGE FIRST (FOR TESTING) ────────────────────
        await sock.sendMessage(chatId, {
            text: '🤖 *FromAI Engine Active*\n\n📌 This message is powered by AI technology.'
        }, { quoted: message });

        // ─── CREATE AI-STYLE MESSAGE (FIXED) ────────────────────────────
        try {
            // Option 1: Send as normal message with special formatting
            const aiText = 
                `╭━━━━〔 *FIORA SYLVIE AI* 〕━━━━┈⊷\n` +
                `┃\n` +
                `┃ 👋 Halo dunia!\n` +
                `┃\n` +
                `┃ 📌 *FromAI Engine Active*\n` +
                `┃\n` +
                `┃ 💡 This message is powered by AI technology.\n` +
                `┃\n` +
                `┃ 🔗 Ticket: ${AI_CONFIG.ticketId}\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━━━━━┈⊷`;

            await sock.sendMessage(chatId, {
                text: aiText
            }, { quoted: message });

        } catch (aiError) {
            console.error('[AI MESSAGE ERROR]', aiError.message);
        }

        // ─── CREATE BUTTONV2 WITH AI STYLE ────────────────────────────────
        try {
            const buttonBuilder = new ButtonV2(sock)
                .setTitle('🤖 Fiora Sylvie AI')
                .setSubtitle('AI-Powered Assistant')
                .setBody(
                    `📋 *AI Menu*\n\n` +
                    `Choose an option below:\n\n` +
                    `📡 Nixel AI - AI-powered assistant\n` +
                    `🤖 ChatGPT - OpenAI integration\n` +
                    `🎨 AI Image - Generate images\n` +
                    `📝 AI Text - Text generation\n\n` +
                    `💡 *Click a button to continue*`
                )
                .setFooter(`🤖 AI-Powered | ${new Date().toLocaleDateString()}`)
                .setThumbnail('https://cdn.ornzora.eu.cc/4d2905ce-3707-4ec0-998a-68a3d851629f-FIORA.jpg')
                .addButton('📡 Nixel AI', 'nixel_ai')
                .addButton('🤖 ChatGPT', 'chatgpt_ai')
                .addButton('🎨 AI Image', 'image_ai')
                .addButton('📝 AI Text', 'text_ai')
                .addButton('📋 Menu', '.menu');

            await buttonBuilder.send(chatId, {
                quoted: message,
                fallbackText: '🤖 FromAI Engine: Halo dunia!\n\nPowered by Fiora Sylvie AI'
            });

        } catch (buttonError) {
            console.error('[BUTTON ERROR]', buttonError.message);
            
            // ─── FALLBACK: Send with normal Button ──────────────────────
            const fallbackButton = new Button(sock)
                .setTitle('🤖 FromAI Engine')
                .setBody(
                    `📋 *AI Menu*\n\n` +
                    `📡 Nixel AI - AI assistant\n` +
                    `🤖 ChatGPT - OpenAI\n` +
                    `🎨 AI Image - Generate\n` +
                    `📝 AI Text - Text gen`
                )
                .setFooter('⚡ Mickey Glitch Sub')
                .addButton('📡 Nixel AI', 'nixel_ai')
                .addButton('🤖 ChatGPT', 'chatgpt_ai')
                .addButton('🎨 AI Image', 'image_ai')
                .addButton('📝 AI Text', 'text_ai');

            await fallbackButton.send(chatId, {
                quoted: message,
                fallbackText: 'FromAI Engine: Halo dunia!'
            });
        }

        console.log('[FROMAI] AI message sent to:', chatId);

    } catch (error) {
        console.error('[FROMAI ERROR]', error?.message || error);
        console.error('[FROMAI STACK]', error?.stack);

        // ─── FALLBACK ────────────────────────────────────────────────────
        try {
            await sock.sendMessage(chatId, {
                text: `❌ *FromAI Engine failed:*\n${error.message}\n\nPlease try again later.`
            }, { quoted: message });
        } catch (e) {
            console.error('[FROMAI FATAL]', e.message);
            await sock.sendMessage(chatId, {
                text: '❌ FromAI Engine failed. Please try again later.'
            });
        }
    }
};

// ─── SHOW HELP ──────────────────────────────────────────────────────────────
async function showFromAIHelp(sock, chatId, message) {
    const helpText = 
        `╭━━━━〔 *FROMAI HELP* 〕━━━━┈⊷\n` +
        `┃\n` +
        `┃ 🤖 *FromAI Engine*\n` +
        `┃\n` +
        `┃ 📌 *Usage:*\n` +
        `┃ • .fromai - Show AI menu\n` +
        `┃ • .fromai help - Show this help\n` +
        `┃\n` +
        `┃ 📋 *Features:*\n` +
        `┃ • AI-Powered Messages\n` +
        `┃ • Interactive Menu\n` +
        `┃ • Multiple AI Options\n` +
        `┃\n` +
        `┃ 💡 *Example:*\n` +
        `┃ .fromai\n` +
        `┃\n` +
        `╰━━━━━━━━━━━━━━━━━━━━┈⊷`;

    await sock.sendMessage(chatId, { text: helpText }, { quoted: message });
}

// ─── EXPORT ──────────────────────────────────────────────────────────────
module.exports = fromaiCommand;
module.exports.name = 'fromai';
module.exports.aliases = ['aimedia', 'pairedmedia', 'fiora'];
module.exports.category = 'ai';
module.exports.default = fromaiCommand;
module.exports.code = fromaiCommand;
module.exports.handler = fromaiCommand;