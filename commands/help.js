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
                        }
                    ]
                })
            }],
            contextInfo: {
                externalAdReply: {
                    title: 'MICKEY GLITCH',
                    body: 'Mickey Tech Center 2026',
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    thumbnailUrl: 'https://water-billing-292n.onrender.com/1761205727440.png',
                    sourceUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26'
                }
            }
        }, { quoted: message });
    } catch (e) {
        console.error("Error help menu:", e);
    }
};

/**
 * Handle Button Response - Silent Execution
 * Badala ya sendMessage, tunaita handler moja kwa moja
 */
const handleButtonResponse = async (sock, message, buttonId, chatId, executeCommand) => {
    try {
        let selectedId = buttonId;

        const response = message.message?.interactiveResponseMessage?.nativeFlowResponseMessage;
        if (response) {
            const params = JSON.parse(response.paramsJson);
            selectedId = params.id;
        }

        if (!selectedId) return;

        // Log kwenye console tu
        console.log(`[SYSTEM] Button Pressed: ${selectedId} by ${message.pushName}`);

        /**
         * Hapa sasa: Badala ya sock.sendMessage, tunatengeneza "Fake Message" 
         * ili command handler yako iichakate kama text ya kawaida kimyakimya.
         */
        const fakeMsg = {
            ...message,
            body: selectedId,
            message: {
                conversation: selectedId
            }
        };

        // Hapa unaita ile function yako kuu ya ku-run commands (mfano: client.on au cmdHandler)
        // Inategemea jinsi index.js yako inavyoita commands.
        if (typeof executeCommand === 'function') {
            await executeCommand(sock, fakeMsg); 
        }

    } catch (e) {
        console.error("Silent Execution Error:", e);
    }
};

aliveCommand.handleButtonResponse = handleButtonResponse;
module.exports = aliveCommand;
