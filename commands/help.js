const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const { sendInteractiveMessage } = require('gifted-btns');

/**
 * @project: MICKEY GLITCH V3.0.5
 * @author: Quantum Base Developer (TZ)
 */

const helpCommand = async (sock, chatId, m) => {
    try {
        const botName = 'MICKEY GLITCH';
        const now = moment().tz('Africa/Dar_es_Salaam');
        const greet = now.hour() < 12 ? 'Asubuhi ☀️' : now.hour() < 18 ? 'Mchana 🌤️' : 'Jioni 🌙';

        const commandsDir = path.join(__dirname, '../commands');
        const commandFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));

        const menuSections = {};

        for (const file of commandFiles) {
            // Hii inazuia "help" na "menu" zisijionyeshe ndani ya orodha ya commands
            if (file === 'help.js' || file === 'menu.js') continue;

            const cmdFile = require(path.join(commandsDir, file));

            let cmdName = cmdFile.name || file.replace('.js', ''); 
            cmdName = cmdName.toLowerCase().replace('command', '');

            const category = (cmdFile.category || 'MENU').toUpperCase();
            const description = cmdFile.description || `Tumia .${cmdName}`;

            if (!menuSections[category]) {
                menuSections[category] = [];
            }

            menuSections[category].push({
                header: '✨',
                title: cmdName.charAt(0).toUpperCase() + cmdName.slice(1),
                description: description,
                id: `.${cmdName}`
            });
        }

        const sections = Object.keys(menuSections).map(cat => ({
            title: `⭐ ${cat}`,
            rows: menuSections[cat]
        }));

        const helpText = `╔════════════════════╗
  ✨ *${botName}* — *V3.0.5*
╚════════════════════╝
┌  👋 *Habari za ${greet}*
│  👤 *User:* ${m.pushName || 'User'}
│  📅 *Date:* ${now.format('ddd, MMM D')}
└────────────────────┘
*Quantum Base Developer (TZ)*`;

        return await sendInteractiveMessage(sock, chatId, {
            text: helpText,
            interactiveButtons: [
                {
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                        title: '📋 FUNGUA MENU',
                        sections: sections
                    })
                }
            ],
            contextInfo: {
                externalAdReply: {
                    title: '🎉 MICKEY GLITCH V3.0.5',
                    body: 'Quantum Base Developer (TZ)',
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    thumbnailUrl: 'https://water-billing-292n.onrender.com/1761205727440.png',
                    sourceUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26'
                }
            }
        }, { quoted: m });

    } catch (e) {
        console.error("Error kwenye Dynamic Menu:", e);
    }
};

// Hii inahakikisha kuwa mfumo ukisoma file hili, unajua ni la 'help' NA 'menu'
module.exports = {
    name: 'help',
    alias: ['menu'],
    category: 'main',
    execute: helpCommand,
    // Ongeza hii hapa chini kama ziada kwa mifumo inayotumia object export
    helpCommand 
};
