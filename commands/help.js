const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { sendInteractiveMessage } = require('gifted-btns');

/**
 * Inasoma files zote kwenye folder la commands na kutengeneza list ya buttons
 */
const getCommandButtons = () => {
    const commandsPath = path.join(__dirname, '../commands'); // Rekebisha path kulingana na folder lako
    const sections = [];
    
    try {
        const files = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        const rows = files.map(file => {
            const cmdName = file.replace('.js', '');
            return {
                header: '⚡',
                title: cmdName.charAt(0).toUpperCase() + cmdName.slice(1),
                description: `Run ${cmdName} command`,
                id: `.${cmdName}` // Hii ndio itatumika kama trigger
            };
        });

        sections.push({
            title: '🤖 MICKEY AUTO COMMANDS',
            rows: rows
        });
    } catch (err) {
        console.error("Hakuweza kusoma folder la commands:", err);
    }
    return sections;
};

const aliveCommand = async (sock, chatId, message) => {
    try {
        const sections = getCommandButtons();
        const helpText = `✨ *MICKEY GLITCH V3.0*\n\nBonyeza button hapo chini kuchagua command. Itafanya kazi kimoja bila kutuma text!`;

        return await sendInteractiveMessage(sock, chatId, {
            text: helpText,
            interactiveButtons: [{
                name: 'single_select',
                buttonParamsJson: JSON.stringify({
                    title: '📋 ORODHA YA AMRI',
                    sections: sections
                })
            }],
            contextInfo: {
                externalAdReply: {
                    title: 'MICKEY GLITCH',
                    body: 'Automated Command Menu',
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    thumbnailUrl: 'https://water-billing-292n.onrender.com/1761205727440.png'
                }
            }
        }, { quoted: message });
    } catch (e) {
        console.error("Error help menu:", e);
    }
};

/**
 * Handle Button Response - Hapa ndio "uchawi" wa ku-process command ulipo
 */
const handleButtonResponse = async (sock, m, buttonId, chatId, commandHandler) => {
    try {
        let selectedId = buttonId;
        const response = m.message?.interactiveResponseMessage?.nativeFlowResponseMessage;
        
        if (response) {
            const params = JSON.parse(response.paramsJson);
            selectedId = params.id;
        }

        if (!selectedId) return;

        // 1. Log kwenye console kama ulivyotaka
        console.log(`📝 Command used: ${selectedId}`);
        console.log(`[SYSTEM] Button Pressed: ${selectedId} by ${m.pushName}`);

        // 2. Tengeza "fake message" object ili command handler iifikirie kuwa ni text ya kawaida
        // Tunatumia structure ambayo bot yako inaitambua (mfano .body au text)
        const fakeMessage = {
            ...m,
            body: selectedId,
            msg: { ...m.msg, text: selectedId },
            message: { conversation: selectedId }
        };

        // 3. Ipeleke kwenye main command handler yako (index.js)
        if (typeof commandHandler === 'function') {
            await commandHandler(sock, fakeMessage);
        } else {
            console.log("⚠️ Error: commandHandler is not a function. Hakikisha umeipitisha kutoka index.js");
        }

    } catch (e) {
        console.error("Button processing error:", e);
    }
};

aliveCommand.handleButtonResponse = handleButtonResponse;
module.exports = aliveCommand;
