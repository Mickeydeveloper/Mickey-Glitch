const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { sendButtons } = require('gifted-btns');

/**
 * Mfumo wa kusoma commands automatic kutoka kwenye folder
 */
function getAutomaticCommands() {
    try {
        const commandsPath = path.join(__dirname, '../commands'); 
        const files = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        return files.map(file => `.${file.replace('.js', '')}`);
    } catch (e) {
        console.error("Hitilafu kusoma folder la commands:", e);
        return [];
    }
}

const categoryMap = {
    '.gemini': '🤖 AI & Chat',
    '.ai': '🤖 AI & Chat',
    '.chatbot': '🤖 AI & Chat',
    '.tts': '🤖 AI & Chat',
    '.translate': '🤖 AI & Chat',
    '.trt': '🤖 AI & Chat',
    '.mode': '⚙️ Settings & Admin',
    '.settings': '⚙️ Settings & Admin',
    '.owner': '👑 Owner Only',
    '.eval': '👑 Owner Only',
    '.menu': '🔧 Utilities',
    '.help': '🔧 Utilities'
};

function categorizeCommands(commands) {
    const categories = {};
    commands.forEach(cmd => {
        const category = categoryMap[cmd] || '📂 Other Commands';
        if (!categories[category]) categories[category] = [];
        categories[category].push(cmd);
    });
    return categories;
}

const aliveCommand = async (conn, chatId, msg) => {
    try {
        const senderName = msg.pushName || 'User';
        const botName = 'MICKEY GLITCH';
        const prefix = '.';
        
        const now = moment().tz('Africa/Dar_es_Salaam');
        const dateStr = now.format('ddd, MMM D, YYYY');
        const timeStr = now.format('HH:mm:ss');
        const hr = now.hour();
        const greet = hr < 12 ? 'Habari za Asubuhi ☀️' : hr < 18 ? 'Habari za Mchana 🌤️' : 'Habari za Jioni 🌙';

        const uptimeSec = process.uptime();
        const hrs = Math.floor(uptimeSec / 3600);
        const mins = Math.floor((uptimeSec % 3600) / 60);
        const runtimeStr = `${hrs}h ${mins}m`;

        const allCommands = getAutomaticCommands();
        const categorizedCommands = categorizeCommands(allCommands);
        const totalCommands = allCommands.length;

        // --- HEADER ---
        const header = `╔════════════════════╗
  ✨ *${botName}* — *V3.0*
╚════════════════════╝
┌  👋 *${greet}*
│  👤 *User:* ${senderName}
│  🕒 *Time:* ${timeStr}
│  📅 *Date:* ${dateStr}
│  💻 *OS:* ${os.platform()}
│  ⏳ *Up:* ${runtimeStr}
│  📦 *Total:* ${totalCommands} Cmds
└────────────────────┘`;

        let commandsList = '';
        Object.entries(categorizedCommands).forEach(([categoryName, commands]) => {
            commandsList += `\n*╭───「 ${categoryName.toUpperCase()} 」*`;
            // Hapa ndipo tumebadilisha: .join('\n│  • ') inafanya kila moja iwe mstari mpya
            commandsList += `\n│  • ` + commands.map(cmd => `\`${cmd}\``).join('\n│  • ');
            commandsList += `\n*╰───────────────💎*`;
        });

        const finalMessage = `${header}\n${commandsList}\n\n*©2026 Powered by Mickey Labs™*`;

        // Interactive select-list menu for quick command navigation
        const sections = [
            {
                title: '⚡ Kategoria za Menu',
                rows: [
                    { title: 'Msaada & Menu', rowId: '.help', description: 'Orodha ya amri zote' },
                    { title: 'Kuishi Bot', rowId: '.alive', description: 'Angalia hali ya bot' },
                    { title: 'Msaada Programu', rowId: '.settings', description: 'Badilisha mipangilio' },
                    { title: 'Huduma za Halotel', rowId: '.halotel', description: 'Agiza bundle ya data' }
                ]
            }
        ];

        const listMessage = {
            text: 'Chagua amri kutoka kwenye orodha ya chaguo hapa chini.',
            footer: 'Mickey Glitch — Menu ya haraka',
            title: '📜 MENU YA BOT',
            buttonText: 'Chagua Amri',
            sections
        };

        await conn.sendMessage(chatId, listMessage, { quoted: msg });

        await conn.sendMessage(chatId, {
            text: finalMessage,
            contextInfo: {
                isForwarded: true,
                forwardingScore: 999,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363398106360290@newsletter',
                    newsletterName: `${botName}: Active`,
                    serverMessageId: 101
                },
                externalAdReply: {
                    title: `${botName} — Smart Multi-Device`,
                    body: `Hello ${senderName}, Enjoy using ${botName}!`,
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    thumbnailUrl: 'https://water-billing-292n.onrender.com/1761205727440.png',
                    sourceUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26'
                }
            }
        }, { quoted: msg });

    } catch (e) {
        console.error("Error in help.js:", e);
        await conn.sendMessage(chatId, { text: "Hitilafu imetokea! (Error loading menu)" });
    }
};

module.exports = aliveCommand;
