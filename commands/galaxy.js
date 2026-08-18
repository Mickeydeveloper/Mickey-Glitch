/**
 * galaxy.js - Interactive Galaxy Message Command
 * Features: Native flow response with galaxy_message format
 * Creates an interactive message card with custom title
 * Usage: .galaxy <title>
 */

async function galaxyCommand(sock, chatId, msg, args = [], options = {}) {
    try {
        // Validate socket connection
        if (!sock || typeof sock.relayMessage !== 'function') {
            console.error('Invalid socket connection');
            return false;
        }

        // Get message title from arguments
        const customTitle = Array.isArray(args) ? args.join(' ').trim() : String(args || '').trim();
        const titleText = customTitle || '✨ Mickey Glitch';

        // Validate chat ID
        if (!chatId || typeof chatId !== 'string') {
            console.error('Invalid chat ID');
            return false;
        }

        // Build the interactive response message with galaxy theme
        const payload = {
            interactiveResponseMessage: {
                body: {
                    text: '\0',
                    format: 1
                },
                nativeFlowResponseMessage: {
                    name: 'galaxy_message',
                    paramsJson: JSON.stringify({
                        wa_flow_response_params: {
                            title: titleText,
                            description: 'Interactive Galaxy Message',
                            status: 'RECEIVED'
                        }
                    }),
                    version: 3
                }
            }
        };

        // Send the interactive message
        try {
            const result = await sock.relayMessage(chatId, payload, {});
            
            if (!result) {
                console.warn('relayMessage returned no result');
                return false;
            }

            console.log('[galaxy]', 'Message sent successfully with title:', titleText);
            return true;
        } catch (relayError) {
            console.error('[galaxy] relayMessage failed:', relayError?.message || relayError);
            throw relayError;
        }
    } catch (error) {
        console.error('[galaxy]', error?.message || error);
        return false;
    }
}

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────

module.exports = galaxyCommand;
module.exports.name = 'galaxy';
module.exports.aliases = ['gal', 'interactive', 'flow'];
module.exports.category = 'fun';
module.exports.desc = 'Send an interactive galaxy message';
module.exports.execute = galaxyCommand;
module.exports.run = galaxyCommand;
module.exports.handler = galaxyCommand;
