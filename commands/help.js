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

        const totalCommands = getAutomaticCommands().length;

        // --- THE LIST SECTIONS ---
        const sections = [
            {
                title: "🚀 SYSTEM & STATUS",
                rows: [
                    { title: "Check Speed", rowId: ".ping", description: "View bot response latency" },
                    { title: "Bot Status", rowId: ".alive", description: "Check if system is stable" },
                    { title: "Runtime", rowId: ".uptime", description: "See how long the bot has been up" }
                ]
            },
            {
                title: "🛠️ CATEGORIES",
                rows: [
                    { title: "AI Services", rowId: ".ai", description: "Gemini, ChatGPT, and more" },
                    { title: "Tools & Utils", rowId: ".help", description: "View all utility commands" },
                    { title: "Settings", rowId: ".settings", description: "Configure bot behavior" }
                ]
            },
            {
                title: "👑 SUPPORT",
                rows: [
                    { title: "Contact Owner", rowId: ".owner", description: "Get help from the developer" },
                    { title: "Update Bot", rowId: ".update", description: "Check for latest patches" }
                ]
            }
        ];

        // --- THE LIST MESSAGE STRUCTURE ---
        const listMessage = {
            text: `
╭━━━〔 *${botName}* 〕━━━┈⊷
┃ 👤 *User:* ${senderName}
┃ 🕒 *Time:* ${timeStr}
┃ 📅 *Date:* ${dateStr}
┃ ⏳ *Up:* ${runtimeStr}
┃ 📦 *Total:* ${totalCommands} Cmds
╰━━━━━━━━━━━━━━━━━━┈⊷

Welcome to the main menu. Please click the button below to browse all available services.`.trim(),
            footer: "©2026 Mickey Glitch Technology",
            title: "〔 INTERACTIVE COMMAND CENTER 〕",
            buttonText: "Tap to Open Menu", // This is the text on the single list button
            sections
        };

        // Send the list message
        await conn.sendMessage(chatId, listMessage, { quoted: msg });

    } catch (e) {
        console.error("List Menu Error:", e);
        await conn.sendMessage(chatId, { text: "⚠️ Error: The interactive list could not be displayed." });
    }
};

module.exports = aliveCommand;
