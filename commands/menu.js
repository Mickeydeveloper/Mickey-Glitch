const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const { sendInteractiveMessage } = require('gifted-btns');

/**
 * @project: MICKEY GLITCH V3.0.5
 * @author: Quantum Base Developer (TZ)
 * @description: Enhanced Menu - Reads real command names & metadata
 */

const menuCommand = async (sock, chatId, m) => {
    try {
        const botName = 'MICKEY GLITCH';
        const now = moment().tz('Africa/Dar_es_Salaam');
        const greet = now.hour() < 12 ? 'Asubuhi ☀️' : now.hour() < 18 ? 'Mchana 🌤️' : 'Jioni 🌙';

        const commandsDir = path.join(__dirname, '../commands');
        const commandFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));

        const mainJsPath = path.join(__dirname, '../main.js');
        const mainSource = fs.existsSync(mainJsPath) ? fs.readFileSync(mainJsPath, 'utf8') : '';
        const commandTriggers = extractCommandTriggers(mainSource);

        const menuSections = {};

        function extractCommandTriggers(source) {
            const handlerToFile = {};
            const importRegex = /const\s+(?:\{([^}]+)\}|(\w+))\s*=\s*require\(\s*['"]\.\/commands\/([^'"]+)['"]\s*\);/g;
            let match;

            while ((match = importRegex.exec(source)) !== null) {
                const destructured = match[1];
                const singleName = match[2];
                const fileName = match[3];

                if (destructured) {
                    destructured.split(',').map(name => name.trim()).forEach(name => {
                        if (name) {
                            handlerToFile[name] = fileName;
                        }
                    });
                } else if (singleName) {
                    handlerToFile[singleName] = fileName;
                }
            }

            const lines = source.split(/\r?\n/);
            const mapping = {};
            let activeTriggers = [];

            function addTriggers(handler) {
                const fileName = handlerToFile[handler];
                if (!fileName || activeTriggers.length === 0) return;
                if (!mapping[fileName]) mapping[fileName] = new Set();
                activeTriggers.forEach(trigger => mapping[fileName].add(trigger));
                activeTriggers = [];
            }

            function parseTriggers(text) {
                const triggers = [];
                const exactRegex = /userMessage\s*===\s*['"]([^'"]+)['"]/g;
                const startsRegex = /userMessage\.startsWith\(\s*['"]([^'"]+)['"]\s*\)/g;
                let m;

                while ((m = exactRegex.exec(text)) !== null) {
                    triggers.push(m[1].trim());
                }
                while ((m = startsRegex.exec(text)) !== null) {
                    triggers.push(m[1].trim().replace(/\s+$/, ''));
                }
                return triggers;
            }

            for (const line of lines) {
                const trimmed = line.trim();
                const caseMatch = trimmed.match(/^case\s+(.+?):(.*)$/);
                if (caseMatch) {
                    activeTriggers = parseTriggers(caseMatch[1]);
                    const afterCase = caseMatch[2].trim();
                    if (afterCase.length > 0) {
                        const awaitMatch = afterCase.match(/await\s+(\w+)\s*\(/);
                        if (awaitMatch) {
                            addTriggers(awaitMatch[1]);
                            continue;
                        }
                    }
                    continue;
                }

                const awaitMatch = trimmed.match(/await\s+(\w+)\s*\(/);
                if (awaitMatch) {
                    addTriggers(awaitMatch[1]);
                    continue;
                }

                const callMatch = trimmed.match(/^(?:const\s+\w+\s*=\s*)?(\w+)\s*\(/);
                if (callMatch && activeTriggers.length > 0) {
                    addTriggers(callMatch[1]);
                }
            }

            return Object.fromEntries(Object.entries(mapping).map(([key, set]) => [key, Array.from(set)]));
        }

        for (const file of commandFiles) {
            // Epuka faili za mfumo zisizo na amri za watumiaji
            if (['menu.js', 'help.js', 'main.js', 'statusforward.js'].includes(file)) continue;

            try {
                // Tunafuta cache ili kupata mabadiliko mapya ya code (Hot Reloading)
                delete require.cache[require.resolve(path.join(commandsDir, file))];
                const cmdFile = require(path.join(commandsDir, file));

                // 🛠️ LOGIC YA KUPATA JINA HALISI:
                // 1. Inatafuta metadata ya amri kama command/alias/name
                // 2. Inapotofautiana na main.js, inatumia amri zilizoonyeshwa huko
                const fileKey = file.replace('.js', '');
                const mainTriggers = commandTriggers[fileKey] || [];

                const normalizeCommandName = name => {
                    if (!name) return '';
                    return name.toString().toLowerCase().replace(/^\.+/, '').replace('command', '').trim();
                };

                let cmdName = normalizeCommandName(cmdFile.command) ||
                              normalizeCommandName(Array.isArray(cmdFile.alias) ? cmdFile.alias[0] : cmdFile.alias) ||
                              normalizeCommandName(cmdFile.name) ||
                              normalizeCommandName(mainTriggers[0]) ||
                              fileKey;

                const aliases = mainTriggers.slice(1).map(t => t.replace(/^[.]/, ''))
                    .filter(alias => alias && alias !== cmdName);

                const category = (cmdFile.category || 'Mengineyo').toUpperCase();
                let description = cmdFile.description || `Tumia amri ya .${cmdName}`;
                if (aliases.length) {
                    description += ` | Aliases: ${aliases.map(a => `.${a}`).join(', ')}`;
                }

                if (!menuSections[category]) {
                    menuSections[category] = [];
                }

                // Tunaongeza kwenye section husika
                menuSections[category].push({
                    header: '', 
                    title: `.${cmdName}`,
                    description: fileKey === 'sticker' ? `.${cmdName}` : description,
                    id: `.${cmdName}` 
                });

            } catch (e) {
                // Skip files ambazo si commands au zina error
                continue;
            }
        }

        // Kupanga sections (Categories) kwa herufi (A-Z)
        const sortedCategories = Object.keys(menuSections).sort();

        const sections = sortedCategories.map(cat => ({
            title: `⭐ ${cat}`,
            rows: menuSections[cat]
        }));

        const helpText = `╔════════════════════╗
  ✨ *${botName}* — *V3.0.5*
╚════════════════════╝
┌  👋 *Habari za ${greet}*
│  👤 *User:* ${m.pushName || 'User'}
│  📅 *Date:* ${now.format('ddd, MMM D')}
│  ⏰ *Time:* ${now.format('HH:mm:ss')}
└────────────────────┘
*Quantum Base Developer (TZ)*

👇 *Chagua kundi la amri hapo chini:*`;

        // Tuma ujumbe wa interactive (Button/List)
        await sendInteractiveMessage(sock, chatId, {
            text: helpText,
            contextInfo: {
                externalAdReply: {
                    title: "𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑 𝙼𝚎𝚗𝚞 𝚂𝚢𝚜𝚝𝚎𝚖",
                    body: "𝙿𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝚀𝚞𝚊𝚗𝚝𝚞𝚖 𝙲𝚘𝚍𝚎",
                    thumbnailUrl: 'https://water-billing-292n.onrender.com/1761205727440.png',
                    sourceUrl: 'https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610',
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            },
            interactiveButtons: [
                {
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                        title: '📋 FUNGUA MENU',
                        sections: sections
                    })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: 'PING BOT ⚡',
                        id: '.ping'
                    })
                }
            ]
        });

    } catch (e) {
        console.error('Menu Cmd Error:', e);
        await sock.sendMessage(chatId, { 
            text: '❌ *Hitilafu imetokea wakati wa kuandaa Menu.*' 
        }, { quoted: m });
    }
};

// Export kwa ajili ya main.js
module.exports = menuCommand;
