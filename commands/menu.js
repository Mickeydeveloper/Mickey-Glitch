/**
 * @project: MICKEY GLITCH V3.0.5
 * @author: Quantum Base Developer (TZ)
 * @version: 3.0.6
 */

const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { ButtonV2, Button } = require('../lib/messageBuilder');
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
// 📊 SYSTEM STATS
// ==============================================
const getSystemStats = () => {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    const cmdCount = global.commands ? Object.keys(global.commands).length : 0;

    return {
        uptime: `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h`,
        memoryUsed: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
        cmdCount,
        users: botStats.users || 0,
        groups: botStats.groups || 0
    };
};

// ==============================================
// 🎨 MENU ICONS
// ==============================================
const icons = {
    'GENERAL': '🏠', 'GROUP': '👥', 'MODERATION': '🛡️',
    'MEDIA': '🎨', 'AUDIO/VIDEO': '🎵', 'DOWNLOAD': '📥',
    'FUN': '🎮', 'AUTOMATION': '🤖', 'AI/BOT': '🧠',
    'EFFECTS': '✨', 'OWNER/ADMIN': '👑', 'OTHER': '📂',
    'UTILITY': '🔧', 'GAMES': '🎯', 'SOCIAL': '💬',
    'TOOLS': '🛠️', 'ANIME': '🎭'
};

// ==============================================
// 📂 LOAD DYNAMIC MENU
// ==============================================
const resolveCommandsDir = () => {
    const candidates = [
        path.resolve(__dirname, '..', 'commands'),
        path.join(process.cwd(), 'commands'),
        path.join(__dirname, 'commands')
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) return candidate;
    }

    return path.resolve(__dirname, '..', 'commands');
};

const normalizeCommandName = (value, fallback) => {
    if (!value) return fallback;
    const cleaned = String(value).trim();
    if (!cleaned) return fallback;
    return cleaned.startsWith('.') ? cleaned.toLowerCase() : `.${cleaned.toLowerCase()}`;
};

const isLikelyRealCommandName = (value) => {
    if (typeof value !== 'string') return false;
    const cleaned = String(value).trim();
    if (!cleaned) return false;
    const noPrefix = cleaned.startsWith('.') ? cleaned.slice(1) : cleaned;
    if (!noPrefix) return false;
    if (/command$/i.test(noPrefix)) return false;
    return /^[a-z0-9._-]+$/i.test(noPrefix);
};

const isCommandModule = (mod) => {
    return mod && (typeof mod === 'object' || typeof mod === 'function');
};

const getCommandMeta = (cmdModule, fallbackName) => {
    const fallback = normalizeCommandName(fallbackName, `.${fallbackName}`);
    const moduleValue = isCommandModule(cmdModule) ? cmdModule : null;

    if (!moduleValue) {
        return { commandId: fallback, description: `Cmd: ${fallbackName}` };
    }

    const getModuleProp = (module, prop) => {
        if (typeof module !== 'object' && typeof module !== 'function') return undefined;
        if (typeof module === 'function' && !Object.prototype.hasOwnProperty.call(module, prop)) {
            return undefined;
        }
        return module[prop];
    };

    const candidates = [];
    const pushCandidate = (value) => {
        if (typeof value === 'string' && value.trim() && isLikelyRealCommandName(value)) {
            candidates.push(normalizeCommandName(value, fallback));
        }
    };

    pushCandidate(getModuleProp(cmdModule, 'commandName'));
    pushCandidate(getModuleProp(cmdModule, 'command'));
    pushCandidate(getModuleProp(cmdModule, 'name'));

    if (Array.isArray(getModuleProp(cmdModule, 'aliases'))) {
        getModuleProp(cmdModule, 'aliases').forEach(alias => pushCandidate(alias));
    }

    const commandId = candidates.find(Boolean) || fallback;
    const description = getModuleProp(cmdModule, 'description') || `Cmd: ${fallbackName}`;

    return { commandId, description };
};

const loadDynamicMenu = (showAll = true) => {
    const commandsDir = resolveCommandsDir();
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
        'sticker': 'MEDIA', 'facebook': 'DOWNLOAD', 'tiktok': 'DOWNLOAD',
        'play': 'AUDIO/VIDEO', 'ai': 'AI/BOT', 'gpt': 'AI/BOT'
    };

    const collectCommandFiles = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        const files = [];

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name.toLowerCase() === 'lib' || entry.name.startsWith('.')) continue;
                files.push(...collectCommandFiles(fullPath));
            } else if (entry.isFile() && entry.name.endsWith('.js')) {
                files.push(fullPath);
            }
        }

        return files;
    };

    if (fs.existsSync(commandsDir)) {
        const commandFiles = collectCommandFiles(commandsDir).sort();

        commandFiles.forEach(fullPath => {
            const fileName = path.basename(fullPath);
            const baseName = fileName.replace(/\.js$/i, '');
            if (baseName === 'menu') return;

            try {
                delete require.cache[require.resolve(fullPath)];
                const cmdModule = require(fullPath);
                const meta = getCommandMeta(cmdModule, baseName);
                const category = (cmdModule && (cmdModule.category || fileMapping[baseName] || fileMapping[meta.commandId.replace(/^\./, '')])) || 'OTHER';
                addItem(category, {
                    cmd: meta.commandId,
                    desc: meta.description
                });
            } catch (e) {
                addItem(fileMapping[baseName] || 'OTHER', {
                    cmd: normalizeCommandName(baseName, `.${baseName}`),
                    desc: `Cmd: ${baseName}`
                });
            }
        });
    }

    if (global.commands && typeof global.commands === 'object') {
        Object.values(global.commands).forEach(cmd => {
            if (cmd.name) {
                const category = cmd.category || fileMapping[cmd.name] || 'OTHER';
                addItem(category, {
                    cmd: normalizeCommandName(cmd.name, `.${cmd.name}`),
                    desc: cmd.description || `Cmd: ${cmd.name}`
                });
            }
        });
    }

    return Object.keys(dynamicMenu)
        .filter(cat => showAll ? true : userCategories.includes(cat))
        .sort((a, b) => userCategories.indexOf(a) - userCategories.indexOf(b))
        .map(title => ({
            title,
            icon: icons[title] || '📌',
            items: dynamicMenu[title].sort((a, b) => a.cmd.localeCompare(b.cmd))
        }));
};

const getGreeting = (hour) => {
    if (hour >= 0 && hour <= 4) return { text: 'Usiku sana', emoji: '🌙' };
    if (hour >= 5 && hour <= 11) return { text: 'Asubuhi', emoji: '☀️' };
    if (hour >= 12 && hour <= 16) return { text: 'Mchana', emoji: '🎉' };
    if (hour >= 17 && hour <= 18) return { text: 'Jioni', emoji: '🌤️' };
    return { text: 'Usiku', emoji: '🌙' };
};

// ==============================================
// 🚀 MAIN MENU COMMAND - FIXED VERSION
// ==============================================
const menuCommand = async (sock, chatId, m, userDb = null) => {
    try {
        const now = moment().tz('Africa/Dar_es_Salaam');
        const hour = now.hour();
        const userName = m.pushName || 'User';
        const greeting = getGreeting(hour);
        const menuData = loadDynamicMenu();

        const date = now.format('DD MMMM YYYY'); 
        const time = now.format('HH:mm:ss');

        // ==============================================
        // 📤 SEND MENU USING BUTTON (NOT BUTTONV2)
        // ==============================================
        const menuText = `✨ *MICKEY GLITCH V3.0.6*
👋 *Habari za ${greeting.text}* ${greeting.emoji}
👤 *User:* ${userName}
📅 *Date:* ${date} | 🕒 *Time:* ${time}
📊 *Commands:* ${menuData.reduce((acc, cat) => acc + cat.items.length, 0)}

📂 *Select category below:*`;

        // Tumia Button (si ButtonV2) kwa ajili ya quick replies
        const menuButtons = new Button(sock)
            .setTitle('🧩 MICKEY GLITCH MENU')
            .setBody(menuText)
            .setFooter('💡 Bonyeza button kuona commands');

        // Ongeza buttons kwa kila category
        menuData.slice(0, 4).forEach(cat => {
            const label = `${cat.icon} ${cat.title} (${cat.items.length})`;
            menuButtons.addReply(label, `.menu_cat_${cat.title}`);
        });

        // Ongeza button ya kuona commands zote
        menuButtons.addReply('📋 ALL COMMANDS', '.menu_all');
        menuButtons.addReply('❌ Close', '.menu_close');

        // Tuma menu
        await menuButtons.send(chatId, { quoted: m });

        // Weka state kwa ajili ya navigation
        if (!global.menuStates) global.menuStates = {};
        global.menuStates[chatId] = {
            current: 'main',
            data: menuData
        };

    } catch (e) {
        console.error('Menu Error:', e);
        try {
            await sock.sendMessage(chatId, { text: `❌ *Menu Error:* ${e.message}` }, { quoted: m });
        } catch (err) {}
    }
};

// ==============================================
// 📂 MENU NAVIGATION HANDLER
// ==============================================
const handleMenuNavigation = async (sock, chatId, m, text) => {
    try {
        if (!global.menuStates) global.menuStates = {};
        const state = global.menuStates[chatId];
        
        // Kama ni close
        if (text === '.menu_close') {
            delete global.menuStates[chatId];
            await sock.sendMessage(chatId, { 
                text: '✅ Menu imefungwa. Tuma .menu tena kufungua.' 
            }, { quoted: m });
            return true;
        }

        // Kama ni kuona commands zote
        if (text === '.menu_all') {
            const allCommands = [];
            state?.data?.forEach(cat => {
                cat.items.forEach(item => {
                    allCommands.push(`${item.cmd} - ${item.desc || ''}`);
                });
            });

            const chunks = [];
            let chunk = '';
            allCommands.forEach(cmd => {
                if ((chunk + cmd).length > 4000) {
                    chunks.push(chunk);
                    chunk = '';
                }
                chunk += cmd + '\n';
            });
            if (chunk) chunks.push(chunk);

            await sock.sendMessage(chatId, { 
                text: `📋 *ALL COMMANDS (${allCommands.length})*\n\n${chunks[0]}` 
            }, { quoted: m });

            if (chunks.length > 1) {
                for (let i = 1; i < chunks.length; i++) {
                    await sock.sendMessage(chatId, { text: chunks[i] }, { quoted: m });
                }
            }
            return true;
        }

        // Kama ni category selection
        if (text.startsWith('.menu_cat_')) {
            const categoryName = text.replace('.menu_cat_', '');
            const category = state?.data?.find(cat => cat.title === categoryName);
            
            if (category) {
                const commandsList = category.items.map(item => 
                    `• ${item.cmd} - ${item.desc || ''}`
                ).join('\n');

                const catMenu = new Button(sock)
                    .setTitle(`${category.icon} ${category.title}`)
                    .setBody(`📋 *Commands (${category.items.length})*\n\n${commandsList}`)
                    .setFooter('🔙 Bonyeza back kurudi');
                
                catMenu.addReply('🔙 Back to Menu', '.menu');
                await catMenu.send(chatId, { quoted: m });
                return true;
            }
        }

        return false;
    } catch (e) {
        console.error('Menu Navigation Error:', e);
        return false;
    }
};

// ==============================================
// 📊 UTILITY FUNCTIONS
// ==============================================
const getAllCommands = () => {
    const menuData = loadDynamicMenu();
    return menuData.flatMap(cat => cat.items.map(item => item.cmd.replace(/^[.]/, '').trim()));
};

const getCategories = () => {
    const menuData = loadDynamicMenu();
    return menuData.map(cat => ({
        title: cat.title,
        icon: cat.icon,
        commands: cat.items.map(item => item.cmd.replace(/^[.]/, '').trim())
    }));
};

// ==============================================
// 📤 EXPORTS
// ==============================================
module.exports = menuCommand;
module.exports.loadDynamicMenu = loadDynamicMenu;
module.exports.getSystemStats = getSystemStats;
module.exports.getAllCommands = getAllCommands;
module.exports.getCategories = getCategories;
module.exports.handleMenuNavigation = handleMenuNavigation;

// Initialize global menu state
if (typeof global !== 'undefined') {
    if (!global.menuStates) global.menuStates = {};
    
    setInterval(() => {
        try { 
            if (global.botStats) botStats = { ...botStats, ...global.botStats }; 
        } catch (e) {}
    }, 60000);
}

console.log(chalk.green('✓ Menu System Loaded Successfully v3.0.6'));
console.log(chalk.cyan('✓ Fixed Menu Display Issues'));