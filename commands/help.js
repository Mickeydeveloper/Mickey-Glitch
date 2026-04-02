const { sendButtons } = require('gifted-btns');
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const os = require('os');

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
    '.mode': '⚙️ Settings & Admin',
    '.settings': '⚙️ Settings & Admin',
    '.owner': '👑 Owner Only',
    '.help': '🔧 Utilities',
    '.ping': '🚀 System Stats'
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
        const botName = 'ＭＩＣＫＥＹ-Ｖ３';
        
        const now = moment().tz('Africa/Dar_es_Salaam');
        const timeStr = now.format('hh:mm A');
        const dateStr = now.format('ddd, MMM D, YYYY');

        const uptimeSec = process.uptime();
        const hrs = Math.floor(uptimeSec / 3600);
        const mins = Math.floor((uptimeSec % 3600) / 60);
        const runtimeStr = `${hrs}h ${mins}m`;

        const allCommands = getAutomaticCommands();
        const categorized = categorizeCommands(allCommands);
        const totalCommands = allCommands.length;

        // --- VISUAL HEADER ---
        let finalText = `
╭━━━〔 *${botName}* 〕━━━┈⊷
┃ 👋 *Welcome back!*
┃ 👤 *User:* ${senderName}
┃ 🕒 *Time:* ${timeStr}
┃ 📅 *Date:* ${dateStr}
┃ ⏳ *Uptime:* ${runtimeStr}
┃ 📦 *Total:* ${totalCommands} Cmds
╰━━━━━━━━━━━━━━━━━━┈⊷`.trim();

        // --- COMMAND LIST (Hapa ndipo commands zinarudi) ---
        Object.entries(categorized).forEach(([category, list]) => {
            finalText += `\n\n*${category.toUpperCase()}*`;
            finalText += `\n└  ` + list.map(cmd => `\`${cmd}\``).join(', ');
        });

        finalText += `\n\n*©2026 Mickey Glitch Labs™*`;

        // --- INTERACTIVE LIST SECTIONS ---
        const sections = [
            {
                title: "⚡ QUICK ACTIONS",
                rows: [
                    { title: "Main Menu", rowId: ".help", description: "Refresh command list" },
                    { title: "Bot Status", rowId: ".alive", description: "Check system health" },
                    { title: "Buy Data", rowId: ".halotel", description: "Order Halotel bundles" }
                ]
            }
        ];

        // Tuma ujumbe wenye Text (Commands) na List Button kwa pamoja
        await conn.sendMessage(chatId, {
            text: finalText,
            footer: "Select a quick action below",
            title: `*${botName} COMMAND CENTER*`,
            buttonText: "Open Shortcut Menu",
            sections: sections,
            contextInfo: {
                externalAdReply: {
                    title: `${botName} V3 — Active`,
                    body: `Systems operational, ${senderName}!`,
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    thumbnailUrl: 'https://water-billing-292n.onrender.com/1761205727440.png',
                    sourceUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26'
                }
            }
        }, { quoted: msg });

    } catch (e) {
        console.error("Menu Error:", e);
        await conn.sendMessage(chatId, { text: "⚠️ Error: Unable to display command list." });
    }
};

module.exports = aliveCommand;
