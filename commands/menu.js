/**
 * @project: MICKEY GLITCH V3.2.0
 * @author: Quantum Base Developer (TZ)
 * @description: Professional & Elegant Menu with Real-time Bot Stats
 * @version: 3.2.0 - Enhanced UI & Dynamic Data Integration
 */

const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { sendInteractiveMessage } = require('gifted-btns');
const os = require('os');
const chalk = require('chalk');

// ────────────────────────────────────────────────
// REAL-TIME DATA INTEGRATION
// ────────────────────────────────────────────────

// Import bot stats from main system
let botStats = {
    users: 0,
    groups: 0,
    commandsExecuted: 0,
    startTime: Date.now(),
    totalMessages: 0,
    activeChats: 0
};

// Try to load real stats from global or database
try {
    if (global.botStats) {
        botStats = { ...botStats, ...global.botStats };
    }
    
    // Load from settings if available
    const settingsPath = path.join(process.cwd(), 'settings.js');
    if (fs.existsSync(settingsPath)) {
        const settings = require(settingsPath);
        if (settings.botStats) {
            botStats = { ...botStats, ...settings.botStats };
        }
    }
} catch (e) {
    // Silent fallback
}

// ────────────────────────────────────────────────
// ENHANCED RANK SYSTEM WITH DYNAMIC TIERS
// ────────────────────────────────────────────────

const getRank = (total, userLevel = 0) => {
    const ranks = [
        { min: 0, max: 9, title: '🌱 Newbie', color: '#90EE90', badge: '⬤' },
        { min: 10, max: 49, title: '⭐ Regular', color: '#FFD700', badge: '✦' },
        { min: 50, max: 199, title: '⚡ Pro User', color: '#00BFFF', badge: '◆' },
        { min: 200, max: 499, title: '👑 Elite Member', color: '#9B59B6', badge: '◈' },
        { min: 500, max: 999, title: '💎 Legend', color: '#FF6B6B', badge: '◇' },
        { min: 1000, max: Infinity, title: '🌟 Mythical', color: '#FFD700', badge: '✦' }
    ];
    
    const rank = ranks.find(r => total >= r.min && total <= r.max) || ranks[0];
    
    // Add level indicator if available
    if (userLevel > 0) {
        rank.title += ` (Lv.${userLevel})`;
    }
    
    return rank;
};

// ────────────────────────────────────────────────
// ENHANCED STATS WITH REAL SYSTEM DATA
// ────────────────────────────────────────────────

const getSystemStats = () => {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    
    // Get real network stats if available
    const networkInterfaces = os.networkInterfaces();
    let ipAddress = 'N/A';
    try {
        const interfaces = Object.values(networkInterfaces);
        for (const iface of interfaces) {
            for (const addr of iface) {
                if (addr.family === 'IPv4' && !addr.internal) {
                    ipAddress = addr.address;
                    break;
                }
            }
            if (ipAddress !== 'N/A') break;
        }
    } catch (e) {}

    // Get CPU info
    const cpuCount = os.cpus().length;
    const cpuSpeed = os.cpus()[0]?.speed || 0;
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memUsedPercent = ((totalMem - freeMem) / totalMem * 100).toFixed(1);
    
    // Platform info
    const platform = os.platform();
    const release = os.release();
    const hostname = os.hostname();

    // Bot-specific stats
    const cmdCount = global.commands ? Object.keys(global.commands).length : 0;
    const plugins = fs.existsSync(path.join(process.cwd(), 'plugins')) ? 
        fs.readdirSync(path.join(process.cwd(), 'plugins')).length : 0;

    return {
        uptime: `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
        memoryUsed: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
        memoryTotal: (memUsage.heapTotal / 1024 / 1024).toFixed(2),
        rss: (memUsage.rss / 1024 / 1024).toFixed(2),
        externalMem: (totalMem / 1024 / 1024 / 1024).toFixed(1) + 'GB',
        memUsedPercent,
        cpuCores: cpuCount,
        cpuSpeed: (cpuSpeed / 1000).toFixed(1) + 'GHz',
        platform: `${platform} ${release}`,
        hostname,
        ipAddress,
        cmdCount,
        plugins,
        users: botStats.users || 0,
        groups: botStats.groups || 0,
        totalMessages: botStats.totalMessages || 0,
        commandsExecuted: botStats.commandsExecuted || 0,
        activeChats: botStats.activeChats || 0,
        nodeVersion: process.version,
        pid: process.pid
    };
};

// ────────────────────────────────────────────────
// PROFESSIONAL CATEGORY ICONS
// ────────────────────────────────────────────────

const icons = {
    'GENERAL': '🏠', 
    'GROUP': '👥', 
    'MODERATION': '🛡️',
    'MEDIA': '🎨', 
    'AUDIO/VIDEO': '🎵', 
    'DOWNLOAD': '📥',
    'FUN': '🎮', 
    'AUTOMATION': '🤖', 
    'AI/BOT': '🧠',
    'EFFECTS': '✨', 
    'OWNER/ADMIN': '👑', 
    'OTHER': '📂',
    'UTILITY': '🔧',
    'GAMES': '🎯',
    'SOCIAL': '💬',
    'TOOLS': '🛠️',
    'ANIME': '🎭'
};

const categoryColors = {
    'GENERAL': '#4CAF50',
    'GROUP': '#2196F3',
    'MODERATION': '#F44336',
    'MEDIA': '#9C27B0',
    'AUDIO/VIDEO': '#FF5722',
    'DOWNLOAD': '#00BCD4',
    'FUN': '#FFC107',
    'AUTOMATION': '#795548',
    'AI/BOT': '#607D8B',
    'EFFECTS': '#E91E63',
    'OWNER/ADMIN': '#D32F2F',
    'OTHER': '#78909C',
    'UTILITY': '#8BC34A',
    'GAMES': '#FF9800',
    'SOCIAL': '#03A9F4',
    'TOOLS': '#9E9E9E',
    'ANIME': '#E040FB'
};

// ────────────────────────────────────────────────
// DYNAMIC MENU LOADER
// ────────────────────────────────────────────────

const loadDynamicMenu = (showAll = true) => {
    const commandsDir = path.join(process.cwd(), 'commands');
    const dynamicMenu = {};
    const userCategories = ['GENERAL', 'GROUP', 'MODERATION', 'MEDIA', 'AUDIO/VIDEO', 
                           'DOWNLOAD', 'FUN', 'AUTOMATION', 'AI/BOT', 'EFFECTS', 
                           'UTILITY', 'GAMES', 'SOCIAL', 'TOOLS', 'ANIME'];

    const addItem = (cat, item) => {
        const category = (cat || 'OTHER').toUpperCase();
        if (!dynamicMenu[category]) dynamicMenu[category] = [];
        if (!dynamicMenu[category].find(i => i.cmd === item.cmd)) {
            dynamicMenu[category].push({
                ...item,
                category: category
            });
        }
    };

    // File mapping for core commands
    const fileMapping = {
        'alive': 'GENERAL', 'ping': 'GENERAL', 'stats': 'GENERAL', 'owner': 'GENERAL', 
        'repo': 'GENERAL', 'info': 'GENERAL', 'donate': 'GENERAL',
        'text': 'UTILITY', 'translate': 'UTILITY', 'calc': 'UTILITY',
        'kick': 'GROUP', 'promote': 'GROUP', 'demote': 'GROUP', 'hidetag': 'GROUP', 
        'newgroup': 'GROUP', 'resetlink': 'GROUP', 'getlink': 'GROUP', 'staff': 'GROUP', 
        'groupmanage': 'GROUP', 'welcome': 'GROUP', 'goodbye': 'GROUP',
        'sticker': 'MEDIA', 'stickercrop': 'MEDIA', 'emojimix': 'MEDIA', 
        'imagine': 'MEDIA', 'img-blur': 'MEDIA', 'img-filter': 'MEDIA',
        'facebook': 'DOWNLOAD', 'gdrive': 'DOWNLOAD', 'instagram': 'DOWNLOAD', 
        'igs': 'DOWNLOAD', 'twitter': 'DOWNLOAD', 'tiktok': 'DOWNLOAD',
        'play': 'AUDIO/VIDEO', 'lyrics': 'AUDIO/VIDEO', 'shazam': 'AUDIO/VIDEO',
        'ai': 'AI/BOT', 'chatbot': 'AI/BOT', 'gpt': 'AI/BOT',
        'update': 'OWNER/ADMIN', 'cleartmp': 'OWNER/ADMIN', 'pmblocker': 'OWNER/ADMIN', 
        'settings': 'OWNER/ADMIN', 'pin': 'OWNER/ADMIN', 'getcode': 'OWNER/ADMIN',
        'ban': 'MODERATION', 'unban': 'MODERATION', 'mute': 'MODERATION',
        'game': 'GAMES', 'trivia': 'GAMES', 'quiz': 'GAMES',
        'anime': 'ANIME', 'waifu': 'ANIME'
    };

    // Load from commands folder
    if (fs.existsSync(commandsDir)) {
        const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));
        files.forEach(file => {
            const baseName = file.replace('.js', '');
            try {
                const cmdModule = require(path.join(commandsDir, file));
                const commandTrigger = baseName;
                const category = cmdModule.category || fileMapping[baseName] || 'OTHER';
                
                addItem(category, {
                    cmd: `.${commandTrigger}`,
                    desc: cmdModule.description || `Command: ${commandTrigger}`,
                    eg: `.${commandTrigger}`,
                    usage: cmdModule.usage || '',
                    example: cmdModule.example || `.${commandTrigger}`
                });
            } catch (e) {
                addItem(fileMapping[baseName] || 'OTHER', {
                    cmd: `.${baseName}`,
                    desc: `Command: ${baseName}`,
                    eg: `.${baseName}`
                });
            }
        });
    }

    // Sync from global registry
    if (global.commands && typeof global.commands === 'object') {
        Object.values(global.commands).forEach(cmd => {
            if (cmd.name) {
                const category = cmd.category || fileMapping[cmd.name] || 'OTHER';
                addItem(category, {
                    cmd: `.${cmd.name}`,
                    desc: cmd.description || `Registered command: ${cmd.name}`,
                    eg: `.${cmd.name}`,
                    usage: cmd.usage || '',
                    example: cmd.example || `.${cmd.name}`
                });
            }
        });
    }

    // Sort categories and items
    const sortedCategories = Object.keys(dynamicMenu)
        .filter(cat => showAll ? true : userCategories.includes(cat))
        .sort((a, b) => {
            const order = userCategories;
            return order.indexOf(a) - order.indexOf(b);
        });

    return sortedCategories.map(title => ({
        title,
        icon: icons[title] || '📌',
        color: categoryColors[title] || '#78909C',
        items: dynamicMenu[title].sort((a, b) => a.cmd.localeCompare(b.cmd))
    }));
};

// ────────────────────────────────────────────────
// ENHANCED GREETING SYSTEM
// ────────────────────────────────────────────────

const getGreeting = (hour, userLevel = 0) => {
    const greetings = [
        { range: [0, 4], text: 'Habari za Usiku sana', emoji: '🌙', mood: 'chill' },
        { range: [5, 11], text: 'Habari za Asubuhi', emoji: '🌅', mood: 'energetic' },
        { range: [12, 16], text: 'Habari za Mchana', emoji: '☀️', mood: 'happy' },
        { range: [17, 18], text: 'Habari za Jioni', emoji: '🌤️', mood: 'calm' },
        { range: [19, 23], text: 'Usiku Mwema', emoji: '🌙', mood: 'relaxed' }
    ];
    
    const greeting = greetings.find(g => hour >= g.range[0] && hour <= g.range[1]) || greetings[0];
    
    // Add user level emoji
    if (userLevel >= 10) greeting.emoji = '🌟';
    if (userLevel >= 50) greeting.emoji = '⭐';
    if (userLevel >= 100) greeting.emoji = '👑';
    
    return greeting;
};

// ────────────────────────────────────────────────
// PROFESSIONAL QUOTE SYSTEM
// ────────────────────────────────────────────────

const getMotivationalQuote = () => {
    const quotes = [
        { text: 'Code is poetry in motion.', author: 'Quantum' },
        { text: 'Stay hungry, stay foolish.', author: 'Steve Jobs' },
        { text: 'Innovation distinguishes leaders.', author: 'Steve Jobs' },
        { text: 'Make it work, make it right.', author: 'Programmer\'s Mantra' },
        { text: 'The best way to predict the future is to create it.', author: 'Alan Kay' },
        { text: 'Success is not final, failure is not fatal.', author: 'Winston Churchill' },
        { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
        { text: 'Dream big, work hard, stay focused.', author: 'Motivation' }
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
};

// ────────────────────────────────────────────────
// BUILD PROFESSIONAL SECTIONS WITH STYLES
// ────────────────────────────────────────────────

const buildSections = (menuData) => {
    return menuData.map(cat => ({
        title: `${cat.icon} ${cat.title}`,
        highlight_label: `${cat.items.length} commands`,
        rows: cat.items.slice(0, 15).map(item => ({
            title: item.cmd,
            description: item.desc ? item.desc.substring(0, 25) + (item.desc.length > 25 ? '...' : '') : item.eg,
            id: item.cmd.toLowerCase().replace('.', '')
        }))
    }));
};

// ────────────────────────────────────────────────
// MAIN PROFESSIONAL MENU FUNCTION
// ────────────────────────────────────────────────

const menuCommand = async (sock, chatId, m, userDb = null) => {
    try {
        const now = moment().tz('Africa/Dar_es_Salaam');
        const hour = now.hour();
        
        // Get user data
        const userName = m.pushName || 'Mteja';
        const userCmds = userDb?.commandsCount || 0;
        const userLevel = userDb?.level || 0;
        
        // Get real bot stats
        const stats = getSystemStats();
        const greeting = getGreeting(hour, userLevel);
        const rank = getRank(userCmds, userLevel);
        const quote = getMotivationalQuote();
        
        // Load dynamic menu
        const menuData = loadDynamicMenu();
        const totalCommands = menuData.reduce((acc, cat) => acc + cat.items.length, 0);

        // Format date & time
        const date = now.format('DD MMMM YYYY');
        const time = now.format('HH:mm:ss');
        const dayName = now.format('dddd');

        // ────────────────────────────────────────────────
        // PROFESSIONAL MENU LAYOUT
        // ────────────────────────────────────────────────

        const menuText = `╔══════════════════════════════════╗
║          🎯 𝗠𝗜𝗖𝗞𝗘𝗬 𝗕𝗢𝗧          ║
╚══════════════════════════════════╝

${greeting.emoji} *${greeting.text}* ${greeting.emoji}
👤 *${userName}* ── ${rank.title}

📊 *Stats za Wasanii*
   │ ├ 📝 *Commands:* ${userCmds}
   │ ├ 🌟 *Level:* ${userLevel || 0}
   │ └ 🏆 *Cheo:* ${rank.title}

⚙️ *Mfumo wa Bot*
   │ ├ 💾 *RAM:* ${stats.memoryUsed}MB / ${stats.memoryTotal}MB
   │ ├ 🖥️ *CPU:* ${stats.cpuCores} Core @ ${stats.cpuSpeed}
   │ ├ 📡 *Uptime:* ${stats.uptime}
   │ ├ 📦 *Commands:* ${stats.cmdCount}
   │ └ 🔌 *Plugins:* ${stats.plugins}

📈 *Takwimu za Bot*
   │ ├ 👥 *Users:* ${stats.users}
   │ ├ 👤 *Active:* ${stats.activeChats}
   │ ├ 💬 *Messages:* ${stats.totalMessages}
   │ └ ⚡ *Executed:* ${stats.commandsExecuted}

📅 *Maelezo ya Sasa*
   │ ├ 📆 *Tarehe:* ${date}
   │ ├ ⏰ *Saa:* ${time}
   │ └ 📌 *Siku:* ${dayName}

💡 *Nukuu ya Siku*
   ──── "${quote.text}" ────
   ✍️ _~ ${quote.author}_

📂 *Menu Categories:* ${menuData.length}
📋 *Total Commands:* ${totalCommands}

╔══════════════════════════════════╗
║  🎯 Bonyeza "Fungua Menu 📂"     ║
║  ili kuona amri zote zilizopo    ║
╚══════════════════════════════════╝

_🔄 Bot Version: 3.2.0 | Node: ${stats.nodeVersion}_`;

        // ────────────────────────────────────────────────
        // SEND PROFESSIONAL INTERACTIVE MESSAGE
        // ────────────────────────────────────────────────

        await sendInteractiveMessage(sock, chatId, {
            image: { 
                url: "https://raw.githubusercontent.com/Mickeydeveloper/water-billing/main/1761205727440.jpg" 
            },
            text: menuText,
            footer: `⚡ ${stats.platform} • Bot PID: ${stats.pid}`,
            interactiveButtons: [
                {
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                        title: '📂 Fungua Menu',
                        sections: buildSections(menuData)
                    })
                }
            ]
        }, { quoted: m });

    } catch (e) {
        console.error('Menu Error:', e);
        try {
            await sock.sendMessage(chatId, { 
                text: `❌ *Menu Error!*\n\nMaombi yameshindwa kufunguka.\nTafadhali jaribu tena baadae.\n\n📌 *Error:* ${e.message?.substring(0, 100)}`
            }, { quoted: m });
        } catch (err) {
            console.error('Fallback error:', err);
        }
    }
};

// ────────────────────────────────────────────────
// EXPORT FUNCTIONS
// ────────────────────────────────────────────────

module.exports = menuCommand;
module.exports.loadDynamicMenu = loadDynamicMenu;
module.exports.getSystemStats = getSystemStats;
module.exports.getRank = getRank;

// ────────────────────────────────────────────────
// AUTO-UPDATE STATS FROM GLOBAL
// ────────────────────────────────────────────────

// Setup auto stats update listener
if (typeof global !== 'undefined') {
    // Update stats periodically
    setInterval(() => {
        try {
            if (global.botStats) {
                botStats = { ...botStats, ...global.botStats };
            }
        } catch (e) {
            // Silent
        }
    }, 60000); // Update every minute
    
    // Load initial stats
    try {
        const statsPath = path.join(process.cwd(), 'bot_stats.json');
        if (fs.existsSync(statsPath)) {
            const savedStats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
            botStats = { ...botStats, ...savedStats };
        }
    } catch (e) {}
}

console.log(chalk.green('✓ Menu System Loaded Successfully'));
console.log(chalk.cyan(`  » Version: 3.2.0`));
console.log(chalk.cyan(`  » Categories: ${Object.keys(icons).length}`));
console.log(chalk.cyan(`  » Commands: ${loadDynamicMenu().reduce((acc, cat) => acc + cat.items.length, 0)}`));