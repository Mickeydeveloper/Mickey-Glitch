/**
 * fromai.js - AI Style Message with Buttons
 * Fully working version using messageBuilder
 * Creator: Mickey Glitch Sub
 */

const { ButtonV2, createCtx } = require('../lib/messageBuilder');

// ─── AI CONFIG ──────────────────────────────────────────────────────────────
const AI_CONFIG = {
    name: 'Fiora Sylvie',
    ticketId: '1669945700536053',
    version: '1.0'
};

// ─── MAIN FROMAI COMMAND ──────────────────────────────────────────────────
async function fromaiCommand(sock, chatId, message, args = []) {
    try {
        // ─── CHECK SOCKET ──────────────────────────────────────────────────
        if (!sock || typeof sock !== 'object') {
            console.error('[FROMAI] Invalid socket');
            return;
        }

        // ─── CHECK IF sendMessage EXISTS ──────────────────────────────────
        if (typeof sock.sendMessage !== 'function') {
            console.error('[FROMAI] sendMessage is not a function');
            console.log('[FROMAI] Socket keys:', Object.keys(sock));
            
            // Try to find sendMessage in sock
            if (sock.core && typeof sock.core.sendMessage === 'function') {
                sock = sock.core; // Use core if available
            } else if (sock.sock && typeof sock.sock.sendMessage === 'function') {
                sock = sock.sock; // Use sock if available
            } else {
                throw new Error('sendMessage not found in socket');
            }
        }

        // ─── CREATE CTX ──────────────────────────────────────────────────
        const ctx = createCtx(sock, chatId, message, { args });

        // ─── GET QUERY ──────────────────────────────────────────────────────
        const query = Array.isArray(args) ? args.join(' ') : args;

        // ─── HELP COMMAND ──────────────────────────────────────────────────
        if (query === 'help' || query === 'menu') {
            return await sendHelpMessage(sock, chatId, message);
        }

        // ─── SEND PROCESSING MESSAGE ────────────────────────────────────
        await sock.sendMessage(chatId, {
            text: '⏳ _Processing AI media engine, please wait..._'
        }, { quoted: message }).catch(() => {});

        // ─── SEND AI STYLE MESSAGE ──────────────────────────────────────
        const aiText = 
            `╭━━━━〔 *FIORA SYLVIE AI* 〕━━━━┈⊷\n` +
            `┃\n` +
            `┃ 👋 *Halo dunia!*\n` +
            `┃\n` +
            `┃ 🤖 *FromAI Engine Active*\n` +
            `┃\n` +
            `┃ 📌 This message is powered by AI technology.\n` +
            `┃\n` +
            `┃ 🔗 Ticket: ${AI_CONFIG.ticketId}\n` +
            `┃ 📡 Version: ${AI_CONFIG.version}\n` +
            `┃\n` +
            `┃ 💡 *Choose an option below:*\n` +
            `┃\n` +
            `┃ 📡 Nixel AI - AI Assistant\n` +
            `┃ 🤖 ChatGPT - OpenAI Integration\n` +
            `┃ 🎨 AI Image - Generate Images\n` +
            `┃ 📝 AI Text - Text Generation\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━━━━━┈⊷`;

        await sock.sendMessage(chatId, {
            text: aiText
        }, { quoted: message }).catch(() => {});

        // ─── CREATE BUTTONV2 WITH AI STYLE ──────────────────────────────
        try {
            const buttonBuilder = new ButtonV2(sock)
                .setTitle('🤖 Fiora Sylvie AI')
                .setSubtitle('AI-Powered Assistant')
                .setBody(
                    `📋 *AI Menu*\n\n` +
                    `Choose an option below:\n\n` +
                    `📡 Nixel AI - AI-powered assistant\n` +
                    `🤖 ChatGPT - OpenAI integration\n` +
                    `🎨 AI Image - Generate images with AI\n` +
                    `📝 AI Text - Advanced text generation\n\n` +
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
                fallbackText: '🤖 FromAI Engine: Powered by Fiora Sylvie AI'
            });

            console.log('[FROMAI] Sent successfully to:', chatId);

        } catch (buttonError) {
            console.error('[BUTTON ERROR]', buttonError.message);

            // ─── FALLBACK: Send simple text with links ──────────────────
            const fallbackText = 
                `🤖 *Fiora Sylvie AI*\n\n` +
                `📋 *AI Menu (Fallback)*\n\n` +
                `📡 Nixel AI - .nixel\n` +
                `🤖 ChatGPT - .chatgpt\n` +
                `🎨 AI Image - .image\n` +
                `📝 AI Text - .text\n\n` +
                `⚡ Mickey Glitch Sub`;

            await sock.sendMessage(chatId, {
                text: fallbackText
            }, { quoted: message }).catch(() => {});
        }

    } catch (error) {
        console.error('[FROMAI ERROR]', error?.message || error);
        console.error('[FROMAI STACK]', error?.stack);

        // ─── ULTIMATE FALLBACK ────────────────────────────────────────────
        try {
            const errorText = 
                `❌ *FromAI Engine failed*\n\n` +
                `📌 Error: ${error.message || 'Unknown error'}\n\n` +
                `🔄 Please try again later.\n\n` +
                `⚡ Mickey Glitch Sub`;

            await sock.sendMessage(chatId, {
                text: errorText
            }, { quoted: message }).catch(() => {});
        } catch (e) {
            console.error('[FROMAI FATAL]', e.message);
        }
    }
};

// ─── SEND HELP MESSAGE ──────────────────────────────────────────────────────
async function sendHelpMessage(sock, chatId, message) {
    try {
        const helpText = 
            `╭━━━━〔 *FROMAI HELP* 〕━━━━┈⊷\n` +
            `┃\n` +
            `┃ 🤖 *FromAI Engine*\n` +
            `┃\n` +
            `┃ 📌 *Usage:*\n` +
            `┃ • .fromai - Show AI menu\n` +
            `┃ • .fromai help - Show this help\n` +
            `┃ • .fromai chat - Start AI chat\n` +
            `┃\n` +
            `┃ 📋 *Features:*\n` +
            `┃ • AI-Powered Messages\n` +
            `┃ • Interactive Menu\n` +
            `┃ • Multiple AI Options\n` +
            `┃ • View Once Support\n` +
            `┃\n` +
            `┃ 💡 *Example:*\n` +
            `┃ .fromai\n` +
            `┃\n` +
            `┃ 🔗 *Creator:* Mickdadi Hamza\n` +
            `┃ 📞 *Support:* wa.me/255612130873\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━━━━━┈⊷`;

        await sock.sendMessage(chatId, {
            text: helpText
        }, { quoted: message }).catch(() => {});

    } catch (error) {
        console.error('[HELP ERROR]', error.message);
        await sock.sendMessage(chatId, {
            text: '❌ Could not load help.'
        }).catch(() => {});
    }
}

// ─── EXPORT ──────────────────────────────────────────────────────────────
module.exports = fromaiCommand;
module.exports.name = 'fromai';
module.exports.aliases = ['aimedia', 'pairedmedia', 'fiora'];
module.exports.category = 'ai';
module.exports.default = fromaiCommand;
module.exports.handler = fromaiCommand;
module.exports.code = fromaiCommand;