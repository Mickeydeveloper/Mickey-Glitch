const axios = require('axios');

async function ipLeakCommand(sock, chatId, msg, args = [], options = {}) {
    try {
        // Validate socket connection
        if (!sock || typeof sock.relayMessage !== 'function') {
            console.error('Invalid socket connection');
            return false;
        }

        const customText = Array.isArray(args) ? args.join(' ').trim() : String(args || '').trim();
        const titleText = customText || 'IP LEAK';
        const timestamp = Date.now();
        const imageUrl = `https://ipleak.nixel.dev/image/ip?timestamp=${timestamp}`;

        // Validate chat ID
        if (!chatId || typeof chatId !== 'string') {
            console.error('Invalid chat ID');
            return false;
        }

        const imageResponse = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
        });

        try {
            const result = await sock.sendMessage(chatId, {
                image: Buffer.from(imageResponse.data),
                caption: titleText
            }, { quoted: msg });
            if (!result) {
                console.warn('sendMessage returned no result');
                return false;
            }
            return true;
        } catch (relayError) {
            console.error('sendMessage failed:', relayError?.message || relayError);
            throw relayError;
        }
    } catch (error) {
        console.error('[ipleak]', error?.message || error);
        // Silently fail without sending error message (as per user requirement)
        return false;
    }
}

module.exports = ipLeakCommand;
module.exports.name = 'ipleak';
module.exports.aliases = ['ipl', 'leak'];
module.exports.category = 'owner';
module.exports.desc = 'Generate IP leak card using inline AI-style renderer';
module.exports.execute = ipLeakCommand;
module.exports.run = ipLeakCommand;
module.exports.handler = ipLeakCommand;
