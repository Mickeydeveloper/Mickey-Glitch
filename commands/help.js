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
    '.chatbot': '🤖 AI & Chat',
    '.imagine': '🎨 Image Generation',
    '.mode': '⚙️ Settings & Admin',
    '.settings': '⚙️ Settings & Admin',
    '.owner': '👑 Owner Commands',
    '.help': '🔧 Utilities',
    '.ping': '🚀 System',
    '.alive': '🔧 Utilities',
    '.halotel': '💰 Data Services',
    '.play': '🎵 Music & Audio',
    '.video': '🎬 Video & Media',
    '.download': '📥 Downloads',
    '.instagram': '📥 Downloads',
    '.tiktok': '📥 Downloads',
    '.facebook': '📥 Downloads',
    '.youtube': '📥 Downloads',
    '.shazam': '🎵 Music & Audio',
    '.ban': '⚔️ Group Management',
    '.kick': '⚔️ Group Management',
    '.mute': '⚔️ Group Management',
    '.promote': '⚔️ Group Management',
    '.demote': '⚔️ Group Management',
    '.groupmanage': '⚔️ Group Management',
    '.whois': '👤 User Info',
    '.pp': '👤 User Info',
    '.sticker': '🎭 Media Tools',
    '.meme': '😂 Fun & Games',
    '.weather': '🌍 Info Services',
    '.lyrics': '🎵 Music & Audio'
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

        // --- MAIN MENU WITH GIFTED BUTTONS ---
        const menuText = `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ 🤖 *${botName} COMMAND CENTER*
┃ 
┃ 👋 *Welcome:* ${senderName}
┃ 🕒 *Time:* ${timeStr}
┃ 📅 *Date:* ${dateStr}
┃ ⏳ *Uptime:* ${runtimeStr}
┃ 📦 *Commands:* ${totalCommands}
┃ 📍 *Status:* ✅ Online
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

*SELECT CATEGORY BELOW TO VIEW:* 👇`;

        // Create category buttons
        const categoryButtons = Object.keys(categorized).map(category => ({
            id: `help_category_${encodeURIComponent(category)}`,
            text: category
        }));

        // Limit buttons to 5 per message
        const displayButtons = categoryButtons.slice(0, 5);
        if (categoryButtons.length > 5) {
            displayButtons.push({ id: 'help_more', text: '📋 MORE CATEGORIES' });
        }

        return await sendButtons(conn, chatId, {
            title: `🎮 ${botName} MAIN MENU`,
            text: menuText,
            footer: '© 2026 Mickey Glitch Labs™',
            image: { url: 'https://water-billing-292n.onrender.com/1761205727440.png' },
            buttons: displayButtons
        }, { quoted: msg });

    } catch (e) {
        console.error("Menu Error:", e);
        await conn.sendMessage(chatId, { text: "⚠️ Error: Unable to display command list." });
    }
};

module.exports = aliveCommand;
