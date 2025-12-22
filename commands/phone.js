const axios = require('axios');

/**
 * Phone Information Command
 * Fetches phone specifications from GSMarena API
 */
module.exports = async function (sock, chatId, message, phoneQuery) {
    try {
        // Validate input
        if (!phoneQuery || phoneQuery.trim() === '') {
            await sock.sendMessage(chatId, 
                { 
                    text: `╭━━━━━━━━━━━━━━━━━━━━━━━━╮
       📱 PHONE INFORMATION
╰━━━━━━━━━━━━━━━━━━━━━━━━╯

*Usage:* .phone <device name>

*Examples:*
  • .phone iPhone 15 Pro
  • .phone Samsung Galaxy S24
  • .phone Google Pixel 8
  • .phone Xiaomi 14 Ultra

_Get detailed specs including processor, camera, battery, and more!_` 
                }, 
                { quoted: message }
            );
            return;
        }

        // Show loading message
        const loadingMsg = await sock.sendMessage(chatId, 
            { text: '🔍 Searching phone information...' }, 
            { quoted: message }
        );

        try {
            // Retry logic with exponential backoff for transient API failures
            const maxAttempts = 3;
            let attempt = 0;
            let response = null;

            while (attempt < maxAttempts) {
                try {
                    attempt += 1;
                    response = await axios.get(
                        `https://okatsu-rolezapiiz.vercel.app/tools/gsmarena?query=${encodeURIComponent(phoneQuery.trim())}`,
                        { timeout: 10000 }
                    );
                    // if we get a 2xx response, break and use it
                    if (response && response.status && response.status >= 200 && response.status < 300) break;
                    // otherwise throw to trigger retry
                    throw new Error(`Unexpected status: ${response ? response.status : 'no response'}`);
                } catch (err) {
                    // If last attempt, rethrow the error so outer catch handles it
                    if (attempt >= maxAttempts) throw err;
                    // small backoff before retrying
                    await new Promise(res => setTimeout(res, 500 * attempt));
                }
            }

            // Validate response body
            if (!response || !response.data || response.data.status !== true || !response.data.result) {
                await sock.sendMessage(chatId,
                    {
                        text: `❌ *Phone Not Found*\n\nCouldn't find *"${phoneQuery}"*\n\nTry:\n• Using full model name\n• Removing extra words\n• .phone iPhone 15 Pro`
                    },
                    { quoted: message }
                );
                return;
            }

            const result = response.data.result;
            const specs = result.specs || {};

            // Helper to safely get nested spec value
            const getSpec = (category, key) => {
                return specs[category] && specs[category][key] ? specs[category][key] : 'N/A';
            };

            // Extract specific fields
            const name = result.phoneName || 'N/A';
            const brand = getSpec('Misc', 'Models')?.split(',')[0]?.split(' ')[0] || 'N/A'; // Rough brand extraction
            const release = getSpec('Launch', 'Announced') || 'N/A';
            const memory = getSpec('Memory', 'Internal') || 'N/A';
            const processor = getSpec('Platform', 'Chipset') || getSpec('Platform', 'CPU') || 'N/A';
            const camera = getSpec('Main Camera', 'Features') || getSpec('Main Camera', 'Single') || getSpec('Main Camera', 'Triple') || getSpec('Main Camera', 'Quad') || 'N/A';
            const battery = getSpec('Battery', 'Type') || 'N/A';
            const charging = getSpec('Battery', 'Charging') || 'N/A';
            const display = getSpec('Display', 'Type') + ' ' + getSpec('Display', 'Size') || 'N/A';
            const weight = getSpec('Body', 'Weight') || 'N/A';
            const colors = getSpec('Misc', 'Colors') || 'N/A';
            const price = result.prices && result.prices.EUR ? result.prices.EUR : (Object.values(result.prices || {})[0] || 'N/A');

            // Build formatted response
            const specifications = [
                { label: '📛 Device', value: name },
                { label: '🏢 Brand', value: brand },
                { label: '📅 Release', value: release },
                { label: '💾 Memory', value: memory },
                { label: '🖥️ Processor', value: processor },
                { label: '📷 Camera', value: camera },
                { label: '🔋 Battery', value: battery },
                { label: '🔌 Charging', value: charging },
                { label: '📱 Display', value: display },
                { label: '⚖️ Weight', value: weight },
                { label: '🎨 Colors', value: colors },
                { label: '💵 Price', value: price }
            ];

            // Filter out empty fields and format
            let phoneInfo = `╭━━━━━━━━━━━━━━━━━━━━━━━━╮
       📱 *PHONE INFORMATION*
╰━━━━━━━━━━━━━━━━━━━━━━━━╯

`;

            for (const spec of specifications) {
                if (spec.value && spec.value !== 'N/A') {
                    phoneInfo += `\( {spec.label}: * \){spec.value}*\n`;
                }
            }

            // Add image if available
            let imageOption = {};
            if (result.imageUrl) {
                imageOption = { image: { url: result.imageUrl }, caption: phoneInfo };
            } else {
                imageOption = { text: phoneInfo };
            }

            phoneInfo += `
╭━━━━━━━━━━━━━━━━━━━━━━━━╮
    ✨ Powered by GSMArena ✨
╰━━━━━━━━━━━━━━━━━━━━━━━━╯`;

            // Send result (with image if possible)
            await sock.sendMessage(chatId, imageOption, { quoted: message });

        } catch (apiError) {
            console.error('GSMarena API Error:', apiError && apiError.message ? apiError.message : apiError);

            // Identify common cases and surface helpful info to the user
            const status = apiError && apiError.response ? apiError.response.status : null;
            const remoteMsg = apiError && apiError.response && apiError.response.data ? JSON.stringify(apiError.response.data).slice(0, 300) : null;

            if (apiError && apiError.code === 'ECONNABORTED') {
                await sock.sendMessage(chatId,
                    { text: '⏱️ *Timeout Error*\n\nThe API took too long to respond. Please try again.' },
                    { quoted: message }
                );
            } else if (status) {
                await sock.sendMessage(chatId,
                    {
                        text: `⚠️ *API Error*\n\nServer responded with status *\( {status}*.\n \){remoteMsg ? `Details: ${remoteMsg}\n` : ''}Try:\n• Different spelling\n• Another phone model\n• Check your connection`
                    },
                    { quoted: message }
                );
            } else {
                await sock.sendMessage(chatId,
                    {
                        text: '⚠️ *API Error*\n\nFailed to fetch phone data. Try:\n• Different spelling\n• Another phone model\n• Check your connection\n\nIf the problem persists, ask the bot owner to check the API service.'
                    },
                    { quoted: message }
                );
            }
        }

        // Optional: Delete loading message
        // if (loadingMsg && loadingMsg.key) await sock.sendMessage(chatId, { delete: loadingMsg.key });

    } catch (error) {
        console.error('Phone Command Error:', error.message);
        await sock.sendMessage(chatId, 
            { text: '❌ *Command Error*\n\nSomething went wrong. Please try again later.' }, 
            { quoted: message }
        );
    }
};

// Command metadata
module.exports.command = 'phone';
module.exports.description = 'Get phone specifications from GSMarena';