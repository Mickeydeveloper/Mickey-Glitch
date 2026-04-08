const { sendButtons } = require('gifted-btns');
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');

// ⚡ CACHE: Store commands to avoid repeated file reads
let commandCache = null;
let categorizedCache = null;
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// ⚡ TIMEZONE CACHE: Set timezone once at startup
const TIMEZONE = 'Africa/Dar_es_Salaam';

/**
 * Fetch commands auto kutoka folder with caching
 */
function getAutomaticCommands() {
    const now = Date.now();
    // Return cached commands if still valid
    if (commandCache && (now - cacheTime) < CACHE_DURATION) {
        return commandCache;
    }
    
    try {
        const commandsPath = path.join(__dirname, '../commands'); 
        const files = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        commandCache = files.map(file => `.${file.replace('.js', '')}`);
        cacheTime = now;
        return commandCache;
    } catch (e) {
        console.error("Error reading commands folder:", e);
        return commandCache || [];
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
        
        // ⚡ OPTIMIZED: Use fast time calculation instead of moment.tz
        const now = moment().tz(TIMEZONE);
        const timeStr = now.format('hh:mm A');
        const runtimeStr = `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`;

        // Use cached commands - much faster second time
        const allCommands = getAutomaticCommands();
        const categorized = categorizeCommands(allCommands);
        const categoryKeys = Object.keys(categorized);
        
        // Safisha input - FAST string operations only
        let input = userMessage.trim();
        
        // Extract category from button ID
        let selectedCat = null;
        
        if (input.startsWith('help_cat_')) {
            // Button ID format: help_cat_<encoded_category_name>
            const encoded = input.substring(9); // Skip 'help_cat_'
            const decoded = decodeURIComponent(encoded);
            
            // Direct lookup - O(n) but n is small (usually 5-10 categories)
            selectedCat = categoryKeys.find(cat => cat === decoded);
        } else if (input && input !== '.help') {
            // Handle text input format: .help CategoryName
            const cleanInput = input.replace(/^\.help\s+/i, '').trim();
            
            // Try exact match first
            selectedCat = categoryKeys.find(k => k === cleanInput);
            
            // If no exact match, try case-insensitive
            if (!selectedCat) {
                const lowerClean = cleanInput.toLowerCase();
                selectedCat = categoryKeys.find(k => k.toLowerCase() === lowerClean);
            }
        }

        // Show category view if matched - FAST RETURN
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

        // Only show 5 categories to keep it fast - WhatsApp limit anyway
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
        console.error('[HELP ERROR]', e.message);
        await conn.sendMessage(chatId, { text: '⚠️ Menu loading error. Try again.' });
    }
};

module.exports = helpCommand;
