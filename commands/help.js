const { sendButtons } = require('gifted-btns');
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');

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

const helpCommand = async (conn, chatId, msg, userMessage = '.help') => {
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

        const normalizedInput = (userMessage || '.help').trim();
        const lowerInput = normalizedInput.toLowerCase();

        const renderMainMenu = async () => {
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

            const categoryButtons = Object.keys(categorized).map(category => ({
                id: `help_category_${encodeURIComponent(category)}`,
                text: category
            }));

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
        };

        if (lowerInput === '.help' || lowerInput === '.menu' || lowerInput === '.list') {
            return await renderMainMenu();
        }

        if (lowerInput.startsWith('.help ')) {
            const requestedCategory = normalizedInput.slice(6).trim();
            const categoryKey = Object.keys(categorized).find(category => category.toLowerCase() === requestedCategory.toLowerCase());

            if (!categoryKey) {
                await conn.sendMessage(chatId, {
                    text: `❌ Category not found: ${requestedCategory}\nPlease use .help again and select a category.`
                }, { quoted: msg });
                return await renderMainMenu();
            }

            const categoryCommands = categorized[categoryKey] || [];
            const categoryText = `
📂 *${categoryKey}*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${categoryCommands.map(cmd => `• ${cmd}`).join('\n')}

*Use the button below to return to the main menu.*`;

            return await sendButtons(conn, chatId, {
                title: `📚 ${categoryKey}`,
                text: categoryText,
                footer: '© 2026 Mickey Glitch Labs™',
                buttons: [{ id: 'help_more', text: '⬅️ MAIN MENU' }]
            }, { quoted: msg });
        }

        return await renderMainMenu();
    } catch (e) {
        console.error('Help command error:', e);
        await conn.sendMessage(chatId, { text: '⚠️ Error: Unable to display help menu.' });
    }
};

module.exports = helpCommand;
