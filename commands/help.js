const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Function to get all registered commands from main.js
function getRegisteredCommands() {
    try {
        const mainPath = path.join(__dirname, '../main.js');
        const os = require('os');
        '.gemini': '🤖 AI & Chat',
        '.ai': '🤖 AI & Chat',
        '.chatbot': '🤖 AI & Chat',
        '.tts': '🤖 AI & Chat',
        '.translate': '🤖 AI & Chat',
        '.trt': '🤖 AI & Chat',

        // Settings & Admin
        '.mode': '⚙️ Settings & Admin',
        '.settings': '⚙️ Settings & Admin',
        const os = require('os');
        const moment = require('moment-timezone');

        module.exports = async (conn, chatId, msg) => {
            const senderName = msg.pushName || 'User';
            const owner = 'Λ𝗫𝗜𝗦 Ł𝗮𝗯𝘀™';
                    },
                    externalAdReply: {
                        title: `${botName} Help`,
                        body: `Total: ${totalCommands} cmds | Fast & Lite`,
                        mediaType: 1,
                        renderLargerThumbnail: false,
                        thumbnailUrl: 'https://water-billing-292n.onrender.com/1761205727440.png',
                        sourceUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26'
                    }
            const os = require('os');
            const moment = require('moment-timezone');

            module.exports = async (conn, chatId, msg) => {
                const senderName = msg.pushName || 'User';
                const owner = 'Λ𝗫𝗜𝗦 Ł𝗮𝗯𝘀™';
                const botName = 'Λ𝗫𝗜𝗦 𝗫𝗠𝗗';
                const version = '1.1';
                const developer = 'Λ𝗫𝗜𝗦 Ł𝗮𝗯𝘀™';
                const mode = 'PUBLIC';
                const prefix = '.';
                const platform = os.platform();
                const runtime = `${Math.floor(process.uptime()/60)}m ${Math.floor(process.uptime()%60)}s`;
                const totalCommands = 590;
                const userJid = msg.sender || msg.key?.participant || msg.key?.remoteJid || 'unknown';
                const now = moment().tz('Africa/Dar_es_Salaam');
                const dateStr = now.format('dddd, MMMM D, YYYY');
                const timeStr = now.format('HH:mm:ss');
                const greeting = now.hour() < 12 ? 'Good Morning' : now.hour() < 18 ? 'Good Afternoon' : 'Good Evening';

                const mainMenu = `┏━━◆ ${botName} - 𝐌𝐀𝐈𝐍 𝐌𝐄𝐍𝐔 ◆━━┓
        '.sand': '🎨 Creative',
        '.blackpink': '🎨 Creative',
        '.glitch': '🎨 Creative',
        '.fire': '🎨 Creative',
        '.textmaker': '🎨 Creative'
    };

    commands.forEach(cmd => {
        const category = categoryMap[cmd] || '🔧 Utilities';
        categories[category].push(cmd);
    });

    // Remove empty categories
    Object.keys(categories).forEach(key => {
        if (categories[key].length === 0) {
            delete categories[key];
        }
    });

    return categories;
}

const aliveCommand = async (conn, chatId, msg) => {
    try {
        const senderName = msg.pushName || 'User';
        // Get commands
        const registeredCommands = getRegisteredCommands();
        const categorizedCommands = categorizeCommands(registeredCommands);
        const totalCommands = registeredCommands.length;

        // Build lite command list
        let commandsList = '';
        Object.entries(categorizedCommands).forEach(([categoryName, commands]) => {
            commandsList += `\n${categoryName}:\n`;
            commandsList += commands.map(cmd => `  • ${cmd}`).join('  ');
            commandsList += '\n';

                await conn.sendMessage(chatId, {
                    text: mainMenu,
                    contextInfo: {
                        isForwarded: true,
                        forwardingScore: 999,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363398106360290@newsletter',
                            newsletterName: botName,
                            serverMessageId: 101
                        },
                        externalAdReply: {
                            title: `${botName} Help`,
                            body: `Total: ${totalCommands} cmds | Fast & Lite`,
                            mediaType: 1,
                            renderLargerThumbnail: false,
                            thumbnailUrl: 'https://water-billing-292n.onrender.com/1761205727440.png',
                            sourceUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26'
                        }
                    }
                }, { quoted: msg });
            };
        });

        // New short intro
        const intro = `🤖 *Mickey Lite Bot* 🤖\nHello, ${senderName}!\nType any command below to get started.`;

        // Compose lite message
        const finalMessage = `${intro}\n${commandsList}\nTotal: ${totalCommands} cmds | Status: Active`;

        await conn.sendMessage(chatId, {
            text: finalMessage,
            contextInfo: {
                isForwarded: true,
                forwardingScore: 999,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363398106360290@newsletter',
                    newsletterName: '🅼🅸🅲🅺🅴𝚈',
                    serverMessageId: 101
                },
                externalAdReply: {
                    title: "Mickey Lite Help",
                    body: `Total: ${totalCommands} cmds | Fast & Lite`,
                    mediaType: 1,
                    renderLargerThumbnail: false,
                    thumbnailUrl: 'https://water-billing-292n.onrender.com/1761205727440.png',
                    sourceUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26'
                }
            }
        }, { quoted: msg });
    } catch (e) {
        console.error(e);
        await conn.sendMessage(chatId, { text: "Error loading commands..." });
    }
};

aliveCommand.getRegisteredCommands = getRegisteredCommands;
aliveCommand.getCategories = () => categorizeCommands(getRegisteredCommands());

module.exports = aliveCommand;