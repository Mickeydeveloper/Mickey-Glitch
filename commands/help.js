const { sendButtons } = require('gifted-btns');
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');

/**
 * Fetch commands auto kutoka folder
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

// Map ya categories (Unaweza kuongeza hapa)
const categoryMap = {
    '.gemini': '🤖 AI & CHAT', '.ai': '🤖 AI & CHAT', '.imagine': '🎨 IMAGE GEN',
    '.mode': '⚙️ SETTINGS', '.settings': '⚙️ SETTINGS',
    '.play': '🎵 MUSIC & AUDIO', '.video': '🎬 VIDEO & MEDIA',
    '.download': '📥 DOWNLOADS', '.instagram': '📥 DOWNLOADS', '.tiktok': '📥 DOWNLOADS',
    '.kick': '⚔️ GROUP MANAGE', '.promote': '⚔️ GROUP MANAGE',
    '.sticker': '🎭 MEDIA TOOLS', '.weather': '🌍 INFO SERVICES'
};

function categorizeCommands(commands) {
    const categories = {};
    commands.forEach(cmd => {
        const category = categoryMap[cmd] || '📂 OTHER SERVICES';
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
        const runtimeStr = `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`;

        const allCommands = getAutomaticCommands();
        const categorized = categorizeCommands(allCommands);
        
        // Safisha input (kama ni button ID au text)
        let input = userMessage.trim();
        console.log(`[HELP] Received input: "${input}"`);
        
        // Logic ya Button ID Response
        if (input.startsWith('help_cat_')) {
            input = decodeURIComponent(input.replace('help_cat_', ''));
            console.log(`[HELP] Decoded button ID to: "${input}"`);
        }

        // 1. RENDER CATEGORY LIST (Kama amechagua kundi)
        const categoryKeys = Object.keys(categorized);
        
        // Match category - Handle direct category name OR .help CategoryName format
        let selectedCat = null;
        
        if (input && input !== '.help') {
            // Remove .help prefix if present
            const cleanInput = input.replace(/^\.help\s+/i, '').trim();
            
            // Try exact match first (case-insensitive)
            selectedCat = categoryKeys.find(k => k.toLowerCase() === cleanInput.toLowerCase());
            
            // If no exact match, try partial match
            if (!selectedCat) {
                selectedCat = categoryKeys.find(k => k.toLowerCase().includes(cleanInput.toLowerCase()) || cleanInput.toLowerCase().includes(k.toLowerCase()));
            }
            
            if (selectedCat) {
                console.log(`[HELP] Found matching category: "${selectedCat}"`);
            }
        }

        if (selectedCat) {
            const cmds = categorized[selectedCat];
            const catText = `*╭━━━━━━━ ⚡ ━━━━━━━╮*
┃ 📂 *CAT:* ${selectedCat}
*╰━━━━━━━━━━━━━━━━━━━━━╯*

${cmds.map(c => `  ◦ ${c}`).join('\n')}

📌 *Tip:* Type command exactly to use.`;

            return await sendButtons(conn, chatId, {
                title: `[ ${selectedCat} ]`,
                text: catText,
                footer: '© 2026 Mickey Glitch Labs™',
                buttons: [{ id: '.help', text: '⬅️ BACK TO MENU' }]
            }, { quoted: msg });
        }

        // 2. RENDER MAIN MENU (Default)
        const mainMenuText = `
╭━━━━━━━━━━━━━━━━━━━━━━━
┃ 👋 *Hi,* ${senderName}
┃ 🕒 *Time:* ${timeStr}
┃ ⏳ *Uptime:* ${runtimeStr}
┃ 📦 *Total:* ${allCommands.length} Cmds
╰━━━━━━━━━━━━━━━━━━━━━━━

*Select a category below to see commands:*`;

        // Tengeneza button za categories (Max 5 kwa WhatsApp limit ya kawaida)
        const buttons = categoryKeys.slice(0, 5).map(cat => ({
            id: `help_cat_${encodeURIComponent(cat)}`,
            text: cat
        }));

        return await sendButtons(conn, chatId, {
            title: `ＭＩＣＫＥＹ-Ｖ３ MENU`,
            text: mainMenuText,
            footer: 'Mickey Glitch Labs - Innovation with Precision',
            image: { url: 'https://water-billing-292n.onrender.com/1761205727440.png' },
            buttons: buttons
        }, { quoted: msg });

    } catch (e) {
        console.error('Help Error:', e);
        await conn.sendMessage(chatId, { text: '⚠️ Error loading menu.' });
    }
};

module.exports = helpCommand;
