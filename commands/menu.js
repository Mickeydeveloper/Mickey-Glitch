/**
 * @project: MICKEY GLITCH V3.0.5 (SINGLE INTEGRATED MENU)
 * @author: Quantum Base Developer (TZ)
 * @version: 3.0.5
 */

const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { ButtonV2 } = require('../lib/messageBuilder');
const settings = require('../settings');
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

    let withoutCommand = cleaned.replace(/command$/i, '').trim();
    if (!withoutCommand) return fallback;

    return withoutCommand.startsWith('.') ? withoutCommand.toLowerCase() : `.${withoutCommand.toLowerCase()}`;
};

const isLikelyRealCommandName = (value) => {
    if (typeof value !== 'string') return false;
    const cleaned = String(value).trim();
    if (!cleaned) return false;

    const noPrefix = cleaned.startsWith('.') ? cleaned.slice(1) : cleaned;
    if (!noPrefix) return false;

    if (/command$/i.test(noPrefix)) return false;
    if (noPrefix.length > 30) return false;

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
            const normalized = normalizeCommandName(value, fallback);
            if (!candidates.includes(normalized)) {
                candidates.push(normalized);
            }
        }
    };

    pushCandidate(getModuleProp(cmdModule, 'commandName'));
    pushCandidate(getModuleProp(cmdModule, 'command'));
    pushCandidate(getModuleProp(cmdModule, 'name'));

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

                if (usedCommandNames.has(meta.commandId)) return;
                usedCommandNames.add(meta.commandId);

                const category = (cmdModule && (cmdModule.category || fileMapping[baseName] || fileMapping[meta.commandId.replace(/^\./, '')])) || 'OTHER';
                addItem(category, {
                    cmd: meta.commandId,
                    desc: meta.description
                });
            } catch (e) {
                const cmdId = normalizeCommandName(baseName, `.${baseName}`);
                if (usedCommandNames.has(cmdId)) return;
                usedCommandNames.add(cmdId);

                const category = fileMapping[baseName] || 'OTHER';
                addItem(category, {
                    cmd: cmdId,
                    desc: `Cmd: ${baseName}`
                });
            }
        });
    }

    if (global.commands && typeof global.commands === 'object') {
        Object.values(global.commands).forEach(cmd => {
            if (cmd.name) {
                const cmdId = normalizeCommandName(cmd.name, `.${cmd.name}`);
                if (usedCommandNames.has(cmdId)) return;
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

// ==============================================
// 🚀 MAIN MENU COMMAND
// ==============================================
const menuCommand = async (sock, chatId, m, userDb = null) => {
    try {
        const identity = typeof settings.getBotIdentity === 'function' ? settings.getBotIdentity() : settings;
        const now = moment().tz(identity.timezone || 'Africa/Dar_es_Salaam');
        const hour = now.hour();
        const userName = m.pushName || 'User';
        const greeting = getGreeting(hour);
        const menuData = loadDynamicMenu();
        const stats = getSystemStats();

        const date = now.format('DD MMMM YYYY'); 
        const time = now.format('HH:mm:ss');
        const totalCmds = menuData.reduce((total, cat) => total + cat.items.length, 0);
        const commandSections = menuData.map((category) => ({
            title: `${category.icon} ${category.title}`,
            highlight_label: `${category.items.length} commands`,
            rows: category.items.map((item) => ({
                header: '',
                title: item.cmd,
                description: item.desc || 'Mickey Glitch command',
                id: item.cmd
            }))
        }));

        // Body message safi iliyopangwa vizuri
        const menuText = `✨ *${identity.name || 'MICKEY GLITCH'}*
👋 *Habari za ${greeting.text}* ${greeting.emoji}
👤 *User:* ${userName}
📅 *Date:* ${date} | 🕒 *Time:* ${time}
⚡ *Commands:* ${totalCmds} | 💾 *RAM:* ${stats.memoryUsed} MB

👇 *Bonyeza button ya list hapo chini kuona categories vyema*
❤️ _i love mom_`;

        // Kutengeneza Single Interactive Message (Picha Kubwa Juu + List Button Moja Chini)
        const singleMenu = new ButtonV2(sock)
            .setTitle(`🔥 ${identity.name || 'MICKEY GLITCH'} MENU`)
            .setSubtitle('WhatsApp automation control center')
            .setBody(menuText)
            .setFooter(`⚡ ${identity.name || 'MICKEY BOT'} | ${date}`)
            .setThumbnail('https://cdn.ornzora.eu.cc/4d2905ce-3707-4ec0-998a-68a3d851629f-FIORA.jpg')
            .addRawButton({
                buttonText: { displayText: '📡 Menu' },
                buttonId: 'Nixel',
                type: 1,
                nativeFlowInfo: {
                    name: 'single_select',
                    paramsJson: JSON.stringify({
                        title: 'Click Here!',
                        sections: [{
                            title: `${identity.name || 'MICKEY GLITCH'} Commands`,
                            highlight_label: '',
                            rows: []
                        }, ...commandSections]
                    })
                }
            });

        // Tuma kama ujumbe MMOJA TU bila kupishanisha
        await singleMenu.send(chatId, { quoted: m });

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

console.log(chalk.green('✓ Single Unified Menu System Loaded'));
