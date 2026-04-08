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
    '.sticker': '🎭 MEDIA TOOLS', '.weather': '🌍 INFO SERVICES',
    '.alive': '⚙️ SETTINGS',
    '.anime': '🎨 IMAGE GEN',
    '.antibadword': '⚔️ GROUP MANAGE',
    '.anticall': '⚔️ GROUP MANAGE',
    '.antidelete': '⚔️ GROUP MANAGE',
    '.antilink': '⚔️ GROUP MANAGE',
    '.antistatusmention': '⚔️ GROUP MANAGE',
    '.antitag': '⚔️ GROUP MANAGE',
    '.autobio': '⚙️ SETTINGS',
    '.autoread': '⚙️ SETTINGS',
    '.autostatus': '⚙️ SETTINGS',
    '.autotyping': '⚙️ SETTINGS',
    '.ban': '⚔️ GROUP MANAGE',
    '.character': '🎭 MEDIA TOOLS',
    '.chart': '🎵 MUSIC & AUDIO',
    '.chatbot': '🤖 AI & CHAT',
    '.checkupdates': '⚙️ SETTINGS',
    '.sync': '⚙️ SETTINGS',
    '.clear': '⚙️ SETTINGS',
    '.clearsession': '⚙️ SETTINGS',
    '.cleartmp': '⚙️ SETTINGS',
    '.clone': '🎭 MEDIA TOOLS',
    '.compliment': '🤖 AI & CHAT',
    '.delete': '⚔️ GROUP MANAGE',
    '.demote': '⚔️ GROUP MANAGE',
    '.emojimix': '🎭 MEDIA TOOLS',
    '.facebook': '📥 DOWNLOADS',
    '.getpp': '🎭 MEDIA TOOLS',
    '.ghost': '⚙️ SETTINGS',
    '.groupmanage': '⚔️ GROUP MANAGE',
    '.halotel': '📂 OTHER SERVICES',
    '.hidetag': '⚔️ GROUP MANAGE',
    '.igs': '📥 DOWNLOADS',
    '.img-blur': '🎨 IMAGE GEN',
    '.lyrics': '🎵 MUSIC & AUDIO',
    '.mention': '⚔️ GROUP MANAGE',
    '.misc': '📂 OTHER SERVICES',
    '.owner': '⚙️ SETTINGS',
    '.pair': '⚙️ SETTINGS',
    '.pin': '⚔️ GROUP MANAGE',
    '.ping': '⚙️ SETTINGS',
    '.pmblocker': '⚔️ GROUP MANAGE',
    '.pp': '🎭 MEDIA TOOLS',
    '.report': '⚔️ GROUP MANAGE',
    '.resetlink': '⚙️ SETTINGS',
    '.setpp': '🎭 MEDIA TOOLS',
    '.shazam': '🎵 MUSIC & AUDIO',
    '.songid': '🎵 MUSIC & AUDIO',
    '.staff': '⚙️ SETTINGS',
    '.statusforward': '⚔️ GROUP MANAGE',
    '.sticker-alt': '🎭 MEDIA TOOLS',
    '.stickercrop': '🎭 MEDIA TOOLS',
    '.stickertelegram': '🎭 MEDIA TOOLS',
    '.sudo': '⚙️ SETTINGS',
    '.tag': '⚔️ GROUP MANAGE',
    '.tagall': '⚔️ GROUP MANAGE',
    '.tagnotadmin': '⚔️ GROUP MANAGE',
    '.take': '🎭 MEDIA TOOLS',
    '.textmaker': '🎨 IMAGE GEN',
    '.topmembers': '🌍 INFO SERVICES',
    '.translate': '🌍 INFO SERVICES',
    '.tts': '🎵 MUSIC & AUDIO',
    '.unban': '⚔️ GROUP MANAGE',
    '.unmute': '⚔️ GROUP MANAGE',
    '.update': '⚙️ SETTINGS',
    '.url': '📥 DOWNLOADS',
    '.viewonce': '🎭 MEDIA TOOLS',
    '.warn': '⚔️ GROUP MANAGE',
    '.warnings': '⚔️ GROUP MANAGE',
    '.wasted': '🎨 IMAGE GEN',
    '.whois': '🌍 INFO SERVICES'
};

// Category aliases for easier access
const categoryAliasMap = {
    'ai': '🤖 AI & CHAT',
    'chat': '🤖 AI & CHAT',
    'music': '🎵 MUSIC & AUDIO',
    'audio': '🎵 MUSIC & AUDIO',
    'download': '📥 DOWNLOADS',
    'downloads': '📥 DOWNLOADS',
    'group': '⚔️ GROUP MANAGE',
    'manage': '⚔️ GROUP MANAGE',
    'admin': '⚔️ GROUP MANAGE',
    'media': '🎭 MEDIA TOOLS',
    'tools': '🎭 MEDIA TOOLS',
    'image': '🎨 IMAGE GEN',
    'gen': '🎨 IMAGE GEN',
    'settings': '⚙️ SETTINGS',
    'config': '⚙️ SETTINGS',
    'info': '🌍 INFO SERVICES',
    'other': '📂 OTHER SERVICES',
    'misc': '📂 OTHER SERVICES'
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

function normalizeCategory(str) {
    return str
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[^\x00-\x7F]/g, '')
        .replace(/[^a-z0-9 ]/g, '');
}
const helpCommand = async (conn, chatId, msg, userMessage = '.help') => {
    try {
        const senderName = msg.pushName || 'User';
        const botName = 'ＭＩＣＫＥＹ ＧＬＩＴＣＨ Ｖ３';
        
        // ⚡ OPTIMIZED: Use fast time calculation instead of moment.tz
        const now = moment().tz(TIMEZONE);
        const timeStr = now.format('hh:mm A');
        const runtimeStr = `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`;

        // Use cached commands - much faster second time
        const allCommands = getAutomaticCommands();
        const categorized = categorizeCommands(allCommands);
        const categoryKeys = Object.keys(categorized).sort();
        
        // Safisha input - FAST string operations only
        let input = userMessage.trim();

        const aliasKey = input.toLowerCase().replace(/^\./, '');
        if (aliasKey in categoryAliasMap) {
            input = `help_cat_${encodeURIComponent(categoryAliasMap[aliasKey])}`;
        }
        
        // Extract category from button ID
        let selectedCat = null;
        
        if (input.startsWith('help_cat_')) {
            // Button ID format: help_cat_<encoded_category_name>
            const encoded = input.substring(9); // Skip 'help_cat_'
            const decoded = decodeURIComponent(encoded).trim();
            const normalized = normalizeCategory(decoded);
            
            selectedCat = categoryKeys.find(cat => normalizeCategory(cat) === normalized);
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
            // Fallback: normalized match for spacing/emoji differences
            if (!selectedCat) {
                const normalized = normalizeCategory(cleanInput);
                selectedCat = categoryKeys.find(cat => {
                    const catNorm = normalizeCategory(cat);
                    return catNorm === normalized || catNorm.includes(normalized) || normalized.includes(catNorm);
                });
            }
        }

        // Show category view if matched - FAST RETURN
        if (selectedCat) {
            const cmds = categorized[selectedCat];
            const totalCmds = cmds.length;

            const catText = `╔══════════════════════════════════════════════╗
║              📂 CATEGORY: ${selectedCat}              ║
╚══════════════════════════════════════════════╝

📋 *Commands:* ${totalCmds} available

*Tap any command button below to execute it instantly!*`;

            // Show all commands as buttons (no limit)
            const commandButtons = cmds.map(cmd => ({ id: cmd, text: cmd }));
            commandButtons.push({ id: '.help', text: '⬅️ BACK TO MENU' });

            return await sendButtons(conn, chatId, {
                title: `[ ${selectedCat} - ${totalCmds} Commands ]`,
                text: catText,
                footer: '© 2026 Mickey Glitch Technology - All Rights Reserved',
                buttons: commandButtons
            }, { quoted: msg });
        }

        // 2. RENDER MAIN MENU (Default) - Auto-synced
        const mainMenuText = `
╔══════════════════════════════════════════════╗
║              ＭＩＣＫＥＹ ＧＬＩＴＣＨ Ｖ３              ║
║                                              ║
║  👋 *Hello,* ${senderName}!                    ║
║  🕒 *Time:* ${timeStr}                         ║
║  ⏳ *Uptime:* ${runtimeStr}                     ║
║  🔄 *Commands:* ${allCommands.length} Synced   ║
║  📁 *Categories:* ${categoryKeys.length}       ║
║  ✅ *Status:* Auto-Symced & Active             ║
║  📊 *Version:* 5.2.0                           ║
║                                              ║
║  ════════════════════════════════════════════  ║
║  🤖 *AI-Powered WhatsApp Bot*                 ║
║  🎵 *Music & Media Downloads*                 ║
║  ⚙️ *Advanced Group Management*               ║
║  🎨 *Image & Sticker Tools*                   ║
║  🌍 *Multi-Language Support*                 ║
╚══════════════════════════════════════════════╝

*Select a category below:*`;

        // Show all categories
        const buttons = categoryKeys.map(cat => ({
            id: `help_cat_${encodeURIComponent(cat)}`,
            text: cat
        }));

        return await sendButtons(conn, chatId, {
            title: `� AUTO-SYNCED COMMAND CENTER`,
            text: mainMenuText,
            footer: '🔄 Auto-Syncing from commands folder - 2026',
            image: { url: 'https://i.ibb.co/vzVv8Yp/mickey.jpg' },
            buttons: buttons
        }, { quoted: msg });

    } catch (e) {
        console.error('[HELP ERROR]', e.message);
        await conn.sendMessage(chatId, { text: '⚠️ Menu loading error. Try again.' });
    }
};

module.exports = helpCommand;