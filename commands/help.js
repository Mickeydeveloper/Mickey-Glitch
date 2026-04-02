const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { sendButtons } = require('gifted-btns');

/**
 * Automatically fetch commands from the directory
 */
function getAutomaticCommands() {
    try {
        const commandsPath = path.join(__dirname, '../commands'); 
        const files = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        return files.map(file => `.${file.replace('.js', '')}`);
    } catch (e) {
        console.error("Error reading commands folder:", e);
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
    '.help': '🔧 Utilities',
    '.ping': '🚀 System Stats',
    '.uptime': '🚀 System Stats'
};

function categorizeCommands(commands) {
    const categories = {};
    commands.forEach(cmd => {
        const category = categoryMap[cmd] || '📂 Other Services';
        if (!categories[category]) categories[category] = [];
        categories[category].push(cmd);
    });
    return categories;
}

const aliveCommand = async (conn, chatId, msg) => {
    try {
        const senderName = msg.pushName || 'User';
        const botName = 'MICKEY-V3';
        
        const now = moment().tz('Africa/Dar_es_Salaam');
        const dateStr = now.format('ddd, MMM D, YYYY');
        const timeStr = now.format('hh:mm A');
        const hour = now.hour();
        
        const greeting = hour < 12 ? 'Good Morning ☀️' : hour < 18 ? 'Good Afternoon 🌤️' : 'Good Evening 🌙';

        const uptimeSec = process.uptime();
        const hrs = Math.floor(uptimeSec / 3600);
        const mins = Math.floor((uptimeSec % 3600) / 60);
        const runtimeStr = `${hrs}h ${mins}m`;

        const allCommands = getAutomaticCommands();
        const categorized = categorizeCommands(allCommands);
        const totalCommands = allCommands.length;

        // --- VISUAL HEADER ---
        const header = `
╭━━━〔 *${botName}* 〕━━━┈⊷
┃ 👋 *${greeting}*
┃ 👤 *User:* ${senderName}
┃ 🕒 *Time:* ${timeStr}
┃ 📅 *Date:* ${dateStr}
┃ ⏳ *Uptime:* ${runtimeStr}
┃ 📦 *Library:* ${totalCommands} Cmds
╰━━━━━━━━━━━━━━━━━━┈⊷`.trim();

        let commandsBody = '';
        Object.entries(categorized).forEach(([category, list]) => {
            commandsBody += `\n\n*${category.toUpperCase()}*`;
            commandsBody += `\n└  ` + list.map(cmd => `\`${cmd}\``).join(', ');
        });

        const footer = `\n\n*©2026 Mickey Glitch Labs™*`;
        const finalMessage = `${header}${commandsBody}${footer}`;

        // --- BUTTON & LIST CONFIGURATION ---
        // We use a combination of a Select List and Quick Action Buttons
        const sections = [
            {
                title: '⚡ QUICK NAVIGATION',
                rows: [
                    { title: '📜 Full Menu', rowId: '.help', description: 'Show all available commands' },
                    { title: '🟢 Status', rowId: '.alive', description: 'Check if bot is online' },
                    { title: '⚙️ Settings', rowId: '.settings', description: 'Bot configuration' },
                    { title: '👑 Support', rowId: '.owner', description: 'Contact the developer' }
                ]
            }
        ];

        // Sending the main interactive Menu
        await sendButtons(conn, chatId, {
            title: `*${botName} MAIN MENU*`,
            text: finalMessage,
            footer: 'Select a category or use buttons below',
            image: { url: 'https://water-billing-292n.onrender.com/1761205727440.png' },
            buttons: [
                { id: '.ping', text: '🚀 Speed' },
                { id: '.owner', text: '👑 Owner' },
                { id: '.help', text: '📚 Help' }
            ],
            // Adding a list section for cleaner organization
            list: {
                buttonText: 'Open Command List',
                sections: sections
            },
            contextInfo: {
                isForwarded: true,
                forwardingScore: 999,
                externalAdReply: {
                    title: `${botName} V3 — Active`,
                    body: `Hello ${senderName}, how can I help you today?`,
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    thumbnailUrl: 'https://water-billing-292n.onrender.com/1761205727440.png',
                    sourceUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26'
                }
            }
        }, { quoted: msg });

    } catch (e) {
        console.error("Menu Error:", e);
        await conn.sendMessage(chatId, { text: "⚠️ Error: Unable to load the command menu." });
    }
};

module.exports = aliveCommand;
