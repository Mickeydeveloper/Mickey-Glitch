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
            if (!response || !response.data || !response.data.data) {
                await sock.sendMessage(chatId,
                    {
                        text: `❌ *Phone Not Found*\n\nCouldn't find *"${phoneQuery}"*\n\nTry:\n• Using full model name\n• Removing extra words\n• .phone iPhone 15 Pro`
                    },
                    { quoted: message }
                );
                return;
            }

            const phoneData = response.data.data;

            // Build formatted response
            const specifications = [
                { label: '📛 Device', value: phoneData.name },
                { label: '🏢 Brand', value: phoneData.brand },
                { label: '📅 Release', value: phoneData.release },
                { label: '💾 Memory', value: phoneData.memory },
                { label: '🖥️ Processor', value: phoneData.processor },
                { label: '📷 Camera', value: phoneData.camera },
                { label: '🔋 Battery', value: phoneData.battery },
                { label: '🔌 Charging', value: phoneData.charging },
                { label: '📱 Display', value: phoneData.display },
                { label: '⚖️ Weight', value: phoneData.weight },
                { label: '🎨 Colors', value: phoneData.colors },
                { label: '💵 Price', value: phoneData.price }
            ];

            // Filter out empty fields and format
            let phoneInfo = `╭━━━━━━━━━━━━━━━━━━━━━━━━╮
       📱 *PHONE INFORMATION*
╰━━━━━━━━━━━━━━━━━━━━━━━━╯

`;

            for (const spec of specifications) {
                if (spec.value && spec.value !== 'N/A' && spec.value !== null) {
                    phoneInfo += `${spec.label}: *${spec.value}*\n`;
                }
            }

            phoneInfo += `
╭━━━━━━━━━━━━━━━━━━━━━━━━╮
    ✨ Powered by GSMArena ✨
╰━━━━━━━━━━━━━━━━━━━━━━━━╯`;

            // Send result
            await sock.sendMessage(chatId, { text: phoneInfo }, { quoted: message });

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
                        text: `⚠️ *API Error*\n\nServer responded with status *${status}*.\n${remoteMsg ? `Details: ${remoteMsg}\n` : ''}Try:\n• Different spelling\n• Another phone model\n• Check your connection`
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
