const { randomBytes } = require('crypto');
const { ButtonV2, createCtx } = require('../lib/messageBuilder');

// ─── AI USER CONFIG ──────────────────────────────────────────────────────
const AI_CONFIG = {
    name: 'Fiora Sylvie',
    fromNumber: '255612130873', // Namba ya AI sender
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

        // ─── SEND PROCESSING MESSAGE ────────────────────────────────────
        await ctx.reply('⏳ _Processing AI media engine, please wait..._');

        // ─── CREATE AI-STYLE MESSAGE ────────────────────────────────────
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

        // ─── CREATE BUTTON WITH AI STYLE ────────────────────────────────
        const buttonBuilder = new ButtonV2(sock)
            .setBody('Halo dunia! 👋\n\n*FromAI Engine Active*\n\n📌 This message is powered by AI technology.\n\n💡 Click the button below to explore more.')
            .setFooter('🤖 AI-Powered | Fiora Sylvie')
            .setThumbnail('https://cdn.ornzora.eu.cc/4d2905ce-3707-4ec0-998a-68a3d851629f-FIORA.jpg')
            .addRawButton({
                buttonText: { displayText: '📡 AI Menu' },
                buttonId: 'Nixel_AI_Menu',
                type: 1,
                nativeFlowInfo: {
                    name: 'single_select',
                    paramsJson: JSON.stringify({
                        title: '🤖 AI Menu',
                        sections: [{
                            title: 'Fiora Sylvie AI',
                            highlight_label: 'AI',
                            rows: [
                                {
                                    header: '📡',
                                    title: 'Nixel AI',
                                    description: 'AI-powered assistant',
                                    id: 'nixel_ai'
                                },
                                {
                                    header: '🤖',
                                    title: 'ChatGPT',
                                    description: 'OpenAI integration',
                                    id: 'chatgpt_ai'
                                },
                                {
                                    header: '🎨',
                                    title: 'AI Image',
                                    description: 'Generate images with AI',
                                    id: 'image_ai'
                                },
                                {
                                    header: '📝',
                                    title: 'AI Text',
                                    description: 'Text generation',
                                    id: 'text_ai'
                                }
                            ]
                        }]
                    })
                }
            });

        // ─── SEND AI-STYLE MESSAGE ──────────────────────────────────────
        await sock.relayMessage(chatId, aiMessage, {
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

        // ─── SEND THE BUTTON MESSAGE ────────────────────────────────────
        await buttonBuilder.send(chatId, {
            quoted: message,
            fallbackText: '🤖 FromAI Engine: Halo dunia!\n\nPowered by Fiora Sylvie AI'
        });

        console.log('[FROMAI] AI message sent to:', chatId);

    } catch (error) {
        console.error('[FROMAI ERROR]', error?.message || error);
        
        // ─── FALLBACK ────────────────────────────────────────────────────
        try {
            if (typeof sock?.sendMessage === 'function') {
                await sock.sendMessage(chatId, {
                    text: `❌ *FromAI Engine failed:*\n${error.message}\n\nPlease try again later.`
                }, { quoted: message });
            }
        } catch (e) {
            console.error('[FROMAI FATAL]', e.message);
        }
    }
}

// ─── EXPORT ──────────────────────────────────────────────────────────────
module.exports = fromaiCommand;
module.exports.name = 'fromai';
module.exports.aliases = ['aimedia', 'pairedmedia'];
module.exports.category = 'ai';
module.exports.default = fromaiCommand;
module.exports.code = fromaiCommand;
module.exports.handler = fromaiCommand;