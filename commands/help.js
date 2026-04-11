const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const { sendInteractiveMessage } = require('gifted-btns');

/**
 * @project: MICKEY GLITCH V3.0.5
 * @author: Quantum Base Developer (TZ)
 * @description: Dynamic Auto-Sync Menu
 */

const helpCommand = async (sock, chatId, m) => {
    try {
        const botName = 'MICKEY GLITCH';
        const now = moment().tz('Africa/Dar_es_Salaam');
        const greet = now.hour() < 12 ? 'Asubuhi ☀️' : now.hour() < 18 ? 'Mchana 🌤️' : 'Jioni 🌙';

        // 1. SOMA COMMANDS ZOTE KWENYE FOLDER AUTOMATIC
        const commandsDir = path.join(__dirname, '../commands'); // Hakikisha path inaelekea folder la commands
        const commandFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));

        const menuSections = {};

        // 2. PANGA COMMANDS KWA CATEGORY
        for (const file of commandFiles) {
            const command = require(path.join(commandsDir, file));
            if (command.name && !command.hidden) { // Tuseme hutaki kuonyesha commands zilizofichwa
                const category = command.category || 'OTHER'; // Default category
                
                if (!menuSections[category]) {
                    menuSections[category] = [];
                }

                menuSections[category].push({
                    header: '✨',
                    title: command.name.charAt(0).toUpperCase() + command.name.slice(1),
                    description: command.description || `Tumia .${command.name}`,
                    id: `.${command.name}`
                });
            }
        }

        // 3. TENGENEZA STRUCTURE YA BUTTONS
        const sections = Object.keys(menuSections).map(cat => ({
            title: `⭐ ${cat.toUpperCase()}`,
            rows: menuSections[cat]
        }));

        const helpText = `╔════════════════════╗
  ✨ *${botName}* — *V3.0.5*
╚════════════════════╝
┌  👋 *Habari za ${greet}*
│  👤 *User:* ${m.pushName || 'Mteja'}
│  📅 *Date:* ${now.format('ddd, MMM D')}
│  ⏳ *Up:* ${process.uptime() < 3600 ? Math.floor(process.uptime()/60)+'m' : Math.floor(process.uptime()/3600)+'h'}
└────────────────────┘
*Hapa ni list ya amri zote zilizopo kwenye mfumo wako.*`;

        return await sendInteractiveMessage(sock, chatId, {
            text: helpText,
            interactiveButtons: [
                {
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                        title: '📋 FUNGUA MENU',
                        sections: sections // Hii inaleta zile sections tulizozitengeneza juu automatic
                    })
                }
            ],
            contextInfo: {
                externalAdReply: {
                    title: '🎉 MICKEY GLITCH V3.0.5',
                    body: 'Quantum Base Developer (TZ)',
                    mediaUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26',
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

module.exports = {
    name: 'help',
    alias: ['menu', 'list'],
    category: 'main',
    description: 'Auto-sync list ya commands zote',
    execute: helpCommand
};
