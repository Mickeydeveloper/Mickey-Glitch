/**
 * @project: MICKEY GLITCH V3.0.5
 * @author: Quantum Base Developer (TZ)
 * @version: 3.0.5
 */

const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { sendInteractiveMessage } = require('gifted-btns');
const os = require('os');
const chalk = require('chalk');

// ==============================================
// 📊 BOT STATS
// ==============================================
let botStats = {
    users: 0,
    groups: 0,
    commandsExecuted: 0,
    startTime: Date.now(),
    totalMessages: 0,
    activeChats: 0
};

try {
    if (global.botStats) botStats = { ...botStats, ...global.botStats };
    const settingsPath = path.join(process.cwd(), 'settings.js');
    if (fs.existsSync(settingsPath)) {
        const settings = require(settingsPath);
        if (settings.botStats) botStats = { ...botStats, ...settings.botStats };
    }
} catch (e) {}

// ==============================================
// 🏆 RANK SYSTEM
// ==============================================
const getRank = (total, userLevel = 0) => {
    const ranks = [
        { min: 0, max: 9, title: '🌱 Newbie' },
        { min: 10, max: 49, title: '⭐ Regular' },
        { min: 50, max: 199, title: '⚡ Pro' },
        { min: 200, max: 499, title: '👑 Elite' },
        { min: 500, max: 999, title: '💎 Legend' },
        { min: 1000, max: Infinity, title: '🌟 Mythical' }
    ];
    const rank = ranks.find(r => total >= r.min && total <= r.max) || ranks[0];
    if (userLevel > 0) rank.title += ` (Lv.${userLevel})`;
    return rank;
};

// ==============================================
// 📊 SYSTEM STATS
// ==============================================
const getSystemStats = () => {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    const cpuCount = os.cpus().length;
    const cpuSpeed = os.cpus()[0]?.speed || 0;
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memUsedPercent = ((totalMem - freeMem) / totalMem * 100).toFixed(1);
    const platform = os.platform();
    const release = os.release();
    const cmdCount = global.commands ? Object.keys(global.commands).length : 0;
    const plugins = fs.existsSync(path.join(process.cwd(), 'plugins')) ? 
        fs.readdirSync(path.join(process.cwd(), 'plugins')).length : 0;

    return {
        uptime: `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
        memoryUsed: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
        memoryTotal: (memUsage.heapTotal / 1024 / 1024).toFixed(2),
        cpuCores: cpuCount,
        cpuSpeed: (cpuSpeed / 1000).toFixed(1) + 'GHz',
        platform: `${platform} ${release}`,
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

// ==============================================
// 🎨 MENU ICONS & COLORS
// ==============================================
const icons = {
    'GENERAL': '🏠', 'GROUP': '👥', 'MODERATION': '🛡️',
    'MEDIA': '🎨', 'AUDIO/VIDEO': '🎵', 'DOWNLOAD': '📥',
    'FUN': '🎮', 'AUTOMATION': '🤖', 'AI/BOT': '🧠',
    'EFFECTS': '✨', 'OWNER/ADMIN': '👑', 'OTHER': '📂',
    'UTILITY': '🔧', 'GAMES': '🎯', 'SOCIAL': '💬',
    'TOOLS': '🛠️', 'ANIME': '🎭'
};

const categoryColors = {
    'GENERAL': '#4CAF50', 'GROUP': '#2196F3', 'MODERATION': '#F44336',
    'MEDIA': '#9C27B0', 'AUDIO/VIDEO': '#FF5722', 'DOWNLOAD': '#00BCD4',
    'FUN': '#FFC107', 'AUTOMATION': '#795548', 'AI/BOT': '#607D8B',
    'EFFECTS': '#E91E63', 'OWNER/ADMIN': '#D32F2F', 'OTHER': '#78909C',
    'UTILITY': '#8BC34A', 'GAMES': '#FF9800', 'SOCIAL': '#03A9F4',
    'TOOLS': '#9E9E9E', 'ANIME': '#E040FB'
};

// ==============================================
// 📂 LOAD DYNAMIC MENU
// ==============================================
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
            dynamicMenu[category].push({ ...item, category });
        }
    };

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

    if (fs.existsSync(commandsDir)) {
        const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));
        files.forEach(file => {
            const baseName = file.replace('.js', '');
            try {
                const cmdModule = require(path.join(commandsDir, file));
                const category = cmdModule.category || fileMapping[baseName] || 'OTHER';
                addItem(category, {
                    cmd: `.${baseName}`,
                    desc: cmdModule.description || `Command: ${baseName}`,
                    eg: `.${baseName}`
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

    if (global.commands && typeof global.commands === 'object') {
        Object.values(global.commands).forEach(cmd => {
            if (cmd.name) {
                const category = cmd.category || fileMapping[cmd.name] || 'OTHER';
                addItem(category, {
                    cmd: `.${cmd.name}`,
                    desc: cmd.description || `Command: ${cmd.name}`,
                    eg: `.${cmd.name}`
                });
            }
        });
    }

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

// ==============================================
// 💬 GREETING SYSTEM
// ==============================================
const getGreeting = (hour, userLevel = 0) => {
    const greetings = [
        { range: [0, 4], text: 'Habari za Usiku sana', emoji: '🌙' },
        { range: [5, 11], text: 'Habari za Asubuhi', emoji: '☀️' },
        { range: [12, 16], text: 'Habari za Mchana', emoji: '☀️' },
        { range: [17, 18], text: 'Habari za Jioni', emoji: '🌤️' },
        { range: [19, 23], text: 'Usiku Mwema', emoji: '🌙' }
    ];
    const greeting = greetings.find(g => hour >= g.range[0] && hour <= g.range[1]) || greetings[0];
    if (userLevel >= 10) greeting.emoji = '🌟';
    if (userLevel >= 50) greeting.emoji = '⭐';
    if (userLevel >= 100) greeting.emoji = '👑';
    return greeting;
};

// ==============================================
// 💡 QUOTE SYSTEM
// ==============================================
const getMotivationalQuote = () => {
    const quotes = [
        { text: 'Code is poetry in motion.', author: 'Quantum' },
        { text: 'Stay hungry, stay foolish.', author: 'Steve Jobs' },
        { text: 'Innovation distinguishes leaders.', author: 'Steve Jobs' },
        { text: 'Make it work, make it right.', author: 'Programmer\'s Mantra' },
        { text: 'The best way to predict the future is to create it.', author: 'Alan Kay' },
        { text: 'Success is not final, failure is not fatal.', author: 'Winston Churchill' },
        { text: 'Dream big, work hard, stay focused.', author: 'Motivation' },
        { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' }
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
};

// ==============================================
// 📱 BUILD SECTIONS
// ==============================================
const buildSections = (menuData) => {
    return menuData.map(cat => ({
        title: `${cat.icon} ${cat.title}`,
        highlight_label: `${cat.items.length} cmd`,
        rows: cat.items.slice(0, 15).map(item => ({
            title: item.cmd,
            description: item.desc ? item.desc.substring(0, 25) + (item.desc.length > 25 ? '...' : '') : item.eg,
            id: item.cmd.toLowerCase().replace('.', '')
        }))
    }));
};

// ==============================================
// 🚀 MAIN MENU COMMAND
// ==============================================
const menuCommand = async (sock, chatId, m, userDb = null) => {
    try {
        const now = moment().tz('Africa/Dar_es_Salaam');
        const hour = now.hour();
        const userName = m.pushName || 'Mteja';
        const userCmds = userDb?.commandsCount || 0;
        const userLevel = userDb?.level || 0;
        const stats = getSystemStats();
        const greeting = getGreeting(hour, userLevel);
        const rank = getRank(userCmds, userLevel);
        const quote = getMotivationalQuote();
        const menuData = loadDynamicMenu();
        const totalCommands = menuData.reduce((acc, cat) => acc + cat.items.length, 0);
        const date = now.format('DD MMMM YYYY');
        const time = now.format('HH:mm:ss');
        const dayName = now.format('dddd');

        // ==============================================
        // 📝 PROFESSIONAL MENU TEXT
        // ==============================================
        const menuText = `╔════════════════════════════╗
║  ✨ MICKEY GLITCH — V3.0.5  ║
╚════════════════════════════╝

┌  👋 *${greeting.text}* ${greeting.emoji}
│  👤 *User:* ${userName}
│  📅 *Date:* ${date}
│  ⏰ *Time:* ${time}
└───────────────────────────┘



📂 *Menu:* ${menuData.length} Categories
📋 *Commands:* ${totalCommands}

┌  📌 *Chagua kundi la amri*
│  👇 Bonyeza "Fungua Menu 📂"
└───────────────────────────┘

_🔄 Bot Version: 3.0.5_`;

        // ==============================================
        // 📤 SEND INTERACTIVE MENU
        // ==============================================
        await sendInteractiveMessage(sock, chatId, {
            image: { 
                url: "https://github.com/Mickeymozy/Mickey-Vip/blob/main/chatbot.png" 
            },
            text: menuText,
            footer: `⚡ ${stats.platform}`,
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
                text: `❌ *Menu Error!*\n\nTafadhali jaribu tena baadae.`
            }, { quoted: m });
        } catch (err) {
            console.error('Fallback error:', err);
        }
    }
};

// ==============================================
// 📤 EXPORTS
// ==============================================
module.exports = menuCommand;
module.exports.loadDynamicMenu = loadDynamicMenu;
module.exports.getSystemStats = getSystemStats;
module.exports.getRank = getRank;

// ==============================================
// 🔄 AUTO-UPDATE STATS
// ==============================================
if (typeof global !== 'undefined') {
    setInterval(() => {
        try {
            if (global.botStats) botStats = { ...botStats, ...global.botStats };
        } catch (e) {}
    }, 60000);

    try {
        const statsPath = path.join(process.cwd(), 'bot_stats.json');
        if (fs.existsSync(statsPath)) {
            const savedStats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
            botStats = { ...botStats, ...savedStats };
        }
    } catch (e) {}
}

console.log(chalk.green('✓ Menu System Loaded Successfully'));
console.log(chalk.cyan(`  » Version: 3.0.5`));
console.log(chalk.cyan(`  » Categories: ${Object.keys(icons).length}`));
console.log(chalk.cyan(`  » Commands: ${loadDynamicMenu().reduce((acc, cat) => acc + cat.items.length, 0)}`));