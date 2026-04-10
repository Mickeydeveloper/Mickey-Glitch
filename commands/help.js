const moment = require('moment-timezone');
const os = require('os');
const { sendInteractiveMessage } = require('gifted-btns');

/**
 * Main Command - Alive/Menu
 */
const aliveCommand = async (sock, chatId, message) => {
    try {
        const now = moment().tz('Africa/Dar_es_Salaam');
        const hr = now.hour();
        const greet = hr < 12 ? 'Asubuhi ☀️' : hr < 18 ? 'Mchana 🌤️' : 'Jioni 🌙';
        
        const uptime = process.uptime();
        const runtime = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;

        const helpText = `✨ *MICKEY GLITCH V3.0*\n\n` +
            `👋 Habari ya ${greet}\n` +
            `👤 User: ${message.pushName || 'User'}\n` +
            `⏳ Up: ${runtime}\n` +
            `📅 ${now.format('ddd, MMM D')}\n` +
            `───────────────`;

        return await sendInteractiveMessage(sock, chatId, {
            text: helpText,
            interactiveButtons: [{
                name: 'single_select',
                buttonParamsJson: JSON.stringify({
                    title: '📋 CHAGUA AMRI',
                    sections: [
                        {
                            title: '🎮 MAIN MENU',
                            rows: [
                                { title: 'Menu', id: '.menu', description: 'View all' },
                                { title: 'Ping', id: '.ping', description: 'Speed test' },
                                { title: 'Alive', id: '.alive', description: 'Check status' }
                            ]
                        },
                        {
                            title: '📥 DOWNLOADS',
                            rows: [
                                { title: 'YouTube', id: '.play', description: 'Play music' },
                                { title: 'TikTok', id: '.tiktok', description: 'DL Video' }
                            ]
                        }
                    ]
                })
            }],
            contextInfo: {
                externalAdReply: {
                    title: 'MICKEY GLITCH',
                    body: 'Select a command below',
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    thumbnailUrl: 'https://water-billing-292n.onrender.com/1761205727440.png',
                    sourceUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26'
                }
            }
        }, { quoted: message });
    } catch (e) {
        console.error("Error:", e);
    }
};

/**
 * Handle Button Response - Automated
 */
const handleButtonResponse = async (sock, message, buttonId, chatId) => {
    try {
        let selectedId = buttonId;

        // Parse kama ni interactive response
        const response = message.message?.interactiveResponseMessage?.nativeFlowResponseMessage;
        if (response) {
            const params = JSON.parse(response.paramsJson);
            selectedId = params.id;
        }

        if (!selectedId) return;

        console.log(`[EXEC] Running: ${selectedId}`);

        // Tuma command kama text ili bot ifunction kawaida
        return await sock.sendMessage(chatId, {
            text: selectedId,
            contextInfo: { quotedMessage: message.message }
        });

    } catch (e) {
        console.error("Button Error:", e);
    }
};

aliveCommand.handleButtonResponse = handleButtonResponse;
module.exports = aliveCommand;
