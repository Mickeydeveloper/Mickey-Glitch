/**
 * @project: MICKEY GLITCH V3.0.5
 * @author: Quantum Base Developer (TZ)
 * @version: 3.0.5
 */

const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { ButtonV2 } = require('../lib/messageBuilder');
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

// FIXED: Remove "command" suffix and clean command names
const normalizeCommandName = (value, fallback) => {
    if (!value) return fallback;
    const cleaned = String(value).trim();
    if (!cleaned) return fallback;

    // Remove "command" suffix if present (case insensitive)
    let withoutCommand = cleaned.replace(/command$/i, '').trim();
    if (!withoutCommand) return fallback;

    // Ensure it starts with dot
    return withoutCommand.startsWith('.') ? withoutCommand.toLowerCase() : `.${withoutCommand.toLowerCase()}`;
};

// FIXED: Better validation for command names
const isLikelyRealCommandName = (value) => {
    if (typeof value !== 'string') return false;
    const cleaned = String(value).trim();
    if (!cleaned) return false;

    const noPrefix = cleaned.startsWith('.') ? cleaned.slice(1) : cleaned;
    if (!noPrefix) return false;

    // Reject names ending with 'command'
    if (/command$/i.test(noPrefix)) return false;

    // Reject names that are too long or have invalid characters
    if (noPrefix.length > 30) return false;

    return /^[a-z0-9._-]+$/i.test(noPrefix);
};

const isCommandModule = (mod) => {
    return mod && (typeof mod === 'object' || typeof mod === 'function');
};

// FIXED: Better command metadata extraction
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
            const normalized = normalizeCommandName(value, fallback);
            // Avoid duplicates in candidates
            if (!candidates.includes(normalized)) {
                candidates.push(normalized);
            }
        }
    };

    // Try different properties where command name might be stored
    pushCandidate(getModuleProp(cmdModule, 'commandName'));
    pushCandidate(getModuleProp(cmdModule, 'command'));
    pushCandidate(getModuleProp(cmdModule, 'name'));

    // Handle aliases
    if (Array.isArray(getModuleProp(cmdModule, 'aliases'))) {
        getModuleProp(cmdModule, 'aliases').forEach(alias => {
            if (isLikelyRealCommandName(alias)) {
                const normalized = normalizeCommandName(alias, fallback);
                if (!candidates.includes(normalized)) {
                    candidates.push(normalized);
                }
            }
        });
    }

    // If no valid command name found, use fallback
    const commandId = candidates.length > 0 ? candidates[0] : fallback;
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

        // Check if command already exists in this category
        const commandExists = dynamicMenu[category].some(i => i.cmd === item.cmd);
        if (!commandExists) {
            dynamicMenu[category].push({ ...item, category });
        }
    };

    const fileMapping = {
        'alive': 'GENERAL', 'ping': 'GENERAL', 'stats': 'GENERAL', 'owner': 'GENERAL',
        'sticker': 'MEDIA', 'facebook': 'DOWNLOAD', 'tiktok': 'DOWNLOAD',
        'play': 'AUDIO/VIDEO', 'ai': 'AI/BOT', 'gpt': 'AI/BOT',
        'menu': 'GENERAL'
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

    // Track all command names globally to avoid duplicates across categories
    const usedCommandNames = new Set();

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

                // Skip if command name is already used
                if (usedCommandNames.has(meta.commandId)) {
                    return;
                }
                usedCommandNames.add(meta.commandId);

                const category = (cmdModule && (cmdModule.category || fileMapping[baseName] || fileMapping[meta.commandId.replace(/^\./, '')])) || 'OTHER';
                addItem(category, {
                    cmd: meta.commandId,
                    desc: meta.description
                });
            } catch (e) {
                // Skip if command name is already used (error case)
                const cmdId = normalizeCommandName(baseName, `.${baseName}`);
                if (usedCommandNames.has(cmdId)) {
                    return;
                }
                usedCommandNames.add(cmdId);

                const category = fileMapping[baseName] || 'OTHER';
                addItem(category, {
                    cmd: cmdId,
                    desc: `Cmd: ${baseName}`
                });
            }
        });
    }

    // Also check global commands
    if (global.commands && typeof global.commands === 'object') {
        Object.values(global.commands).forEach(cmd => {
            if (cmd.name) {
                const cmdId = normalizeCommandName(cmd.name, `.${cmd.name}`);
                if (usedCommandNames.has(cmdId)) {
                    return;
                }
                usedCommandNames.add(cmdId);

                const category = cmd.category || fileMapping[cmd.name] || 'OTHER';
                addItem(category, {
                    cmd: cmdId,
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

const buildSections = (menuData) => {
    return menuData.map(cat => ({
        title: `${cat.icon} ${cat.title}`,
        highlight_label: `${cat.items.length} cmd`,
        rows: cat.items.map(item => ({
            title: item.cmd,
            description: item.desc ? item.desc.substring(0, 30) : '',
            id: item.cmd
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
        const userName = m.pushName || 'User';
        const greeting = getGreeting(hour);
        const menuData = loadDynamicMenu();

        const date = now.format('DD MMMM YYYY'); 
        const time = now.format('HH:mm:ss');

        const menuText = `✨ *MICKEY GLITCH V3.0.5*
👋 *Habari za ${greeting.text}* ${greeting.emoji}
👤 *User:* ${userName}
📅 *Date:* ${date} | 🕒 *Time:* ${time}

👇 *Bonyeza "📂 Menu" kuona command zote*
❤️ _i love mom_`;

        // ==============================================
        // 📤 SEND INTERACTIVE MENU - SINGLE SELECT
        // ==============================================
        const buttonBuilder = new ButtonV2(sock)
            .setBody(menuText)
            .setFooter(`⚡ MICKEY BOT | ${date}`)
            .setThumbnail('https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/menu.png');

        // ─── BUTTON 1: MENU (Single Select) ──────────────────────────────
        buttonBuilder.addRawButton({
            buttonText: { displayText: '📂 Menu' },
            buttonId: 'mickey_list_menu',
            type: 1,
            nativeFlowInfo: {
                name: 'single_select',
                paramsJson: JSON.stringify({
                    title: '📋 Orodha ya Commands',
                    sections: buildSections(menuData)
                })
            }
        });

        // Tuma ujumbe wa single select
        await buttonBuilder.send(chatId, { quoted: m });

        // IMEONDOSWA: Sehemu ya in-app signup

    } catch (e) {
        console.error('Menu Error:', e);
        try {
            await sock.sendMessage(chatId, { text: `❌ *Menu Error!*\n\n${e.message}` }, { quoted: m });
        } catch (err) {}
    }
};

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

if (typeof global !== 'undefined') {
    setInterval(() => {
        try { if (global.botStats) botStats = { ...botStats, ...global.botStats }; } catch (e) {}
    }, 60000);
}

console.log(chalk.green('✓ Menu System Loaded Successfully'));
console.log(chalk.cyan('✓ Using Single Select with Vertical Buttons'));
console.log(chalk.yellow('✓ Fixed: No duplicate commands with "command" suffix'));
console.log(chalk.red('✓ Removed: In-app signup button'));