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
            const response = await axios.get(
                `https://okatsu-rolezapiiz.vercel.app/tools/gsmarena?q=${encodeURIComponent(phoneQuery.trim())}`,
                { timeout: 10000 }
            );

            // Validate response
            if (!response.data || !response.data.data) {
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
            console.error('GSMarena API Error:', apiError.message);
            
            if (apiError.code === 'ECONNABORTED') {
                await sock.sendMessage(chatId, 
                    { text: '⏱️ *Timeout Error*\n\nThe API took too long to respond. Please try again.' }, 
                    { quoted: message }
                );
            } else {
                await sock.sendMessage(chatId, 
                    { text: '⚠️ *API Error*\n\nFailed to fetch phone data. Try:\n• Different spelling\n• Another phone model\n• Check your connection' }, 
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
