const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const { sendInteractiveMessage } = require('gifted-btns');
const imageUrl = 'https://water-billing-292n.onrender.com/1761205727440.png';

/**
 * @project: MICKEY GLITCH V3.0.5
 * @author: Quantum Base Developer (TZ)
 */

const menuCommand = async (sock, chatId, m) => {
    try {
        const botName = 'MICKEY GLITCH';
        const now = moment().tz('Africa/Dar_es_Salaam');
        const greet = now.hour() < 12 ? 'Asubuhi ☀️' : now.hour() < 18 ? 'Mchana 🌤️' : 'Jioni 🌙';

        const commandsDir = path.join(__dirname, '../commands');
        const commandFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));

        const menuSections = {};

        for (const file of commandFiles) {
            // Epuka kuorodhesha menu yenyewe ndani ya list ya commands
            if (file === 'menu.js' || file === 'help.js') continue;

            try {
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
                    id: `.${cmdName}`  // ⭐ IMPORTANT: Button ID must start with '.'
                });
            } catch (e) {
                console.log(`Skipping ${file} due to export error: ${e.message}`);
                continue;
            }
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
*Quantum Base Developer (TZ)*

👇 *Bonyeza amri hapo chini:*`;

        console.log(`📋 Sending menu with ${sections.length} sections`);

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
            ]
        });

    } catch (e) {
        console.error('Menu Cmd Error:', e);
        await sock.sendMessage(chatId, { 
            text: '❌ *Error occurred! (Hitilafu imetokea)*' 
        }, { quoted: m });
    }
};

// ────────────────────────────────────────────────
// BUTTON HANDLERS - Auto-loaded by buttonLoader
const buttonHandlers = {
    // Menu navigation buttons (handled by falling through to command system)
    // Dynamic command buttons like .add, .ai, .alive etc are handled by 
    // the command prefix handler in main.js
};

// Export for auto-loader
module.exports = menuCommand;
module.exports.buttonHandlers = buttonHandlers;
