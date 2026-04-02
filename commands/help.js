const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { sendButtons } = require('gifted-btns');

/**
 * Auto-fetch commands from the folder
 */
function getAutomaticCommands() {
    try {
        const commandsPath = path.join(__dirname, '../commands'); 
        const files = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        return files.map(file => `.${file.replace('.js', '')}`);
    } catch (e) {
        console.error("Error reading commands:", e);
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

        // --- English UI Template ---
        const statusText = `
╭━━━〔 *${botName}* 〕━━━┈⊷
┃ 👤 *User:* ${senderName}
┃ 🕒 *Time:* ${timeStr}
┃ 📅 *Date:* ${dateStr}
┃ ⏳ *Up:* ${runtimeStr}
┃ 📦 *Total:* ${totalCommands} Cmds
╰━━━━━━━━━━━━━━━━━━┈⊷

Select an option below to interact with the bot.`.trim();

        // --- GIFTED BTNS WITH CTA (CALL BUTTON) ---
        await sendButtons(conn, chatId, {
            title: 'MAIN CONTROL PANEL',
            text: statusText,
            footer: '©2026 Mickey Glitch Technology',
            image: { url: 'https://water-billing-292n.onrender.com/1761205727440.png' },
            buttons: [
                { id: '.alive', text: '📚 alive' },
                { id: '.ping', text: '🚀 Speed' },
                // Hii ndio CTA button ya kupiga simu
                { 
                    type: 'call', 
                    text: '📞 Contact Us', 
                    id: 'tel:255615944741' 
                }
            ]
        }, { quoted: msg });

    } catch (e) {
        console.error("CTA Button Error:", e);
        await conn.sendMessage(chatId, { text: "⚠️ Error loading interactive buttons." });
    }
};

module.exports = aliveCommand;
