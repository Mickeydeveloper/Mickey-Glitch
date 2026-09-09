/**
 * @project: MICKEY GLITCH V3.0.5 (SINGLE INTEGRATED MENU)
 * @author: Quantum Base Developer (TZ)
 * @version: 3.0.5
 */

const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
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
// 🚀 MAIN MENU COMMAND (RELAY MESSAGE SYSTEM)
// ==============================================
const menuCommand = async (sock, chatId, m, userDb = null) => {
    try {
        const now = moment().tz('Africa/Dar_es_Salaam');
        const hour = now.hour();
        const userName = m.pushName || 'User';
        const greeting = getGreeting(hour);
        const menuData = loadDynamicMenu();
        const stats = getSystemStats();

        const date = now.format('DD MMMM YYYY'); 
        const time = now.format('HH:mm:ss');
        const totalCmds = menuData.reduce((total, cat) => total + cat.items.length, 0);

        // Map Dynamic Categories to Menu Sections
        const dynamicSections = menuData.map(category => ({
            title: `${category.icon} ${category.title}`,
            highlight_label: `MICKEY GLITCH`,
            rows: category.items.map(item => ({
                title: item.cmd,
                description: item.desc || '',
                id: item.cmd
            }))
        }));

        const bodyText = `*-Question*\n> _Dibenci oleh parah idiot adalah harga yang harus kamu bayar karena tidak menjadi salah satu dari mereka._\n> 「 ⓘ. Mickey Glitch V3.0.5 」\n\nHõlá ${userName} habari ya ${greeting.text} ${greeting.emoji},\n📅 *Date:* ${date} | 🕒 *Time:* ${time}\n⚡ *Total Commands:* ${totalCmds}`;

        const footerText = `\n▢ ./Informação\n└──\n ├─ ▢ *Author*: *#MickeyGlitch*\n ├─ ▢ *Prefix*: *Multi*\n ├─ ▢ *Uptime*: *${stats.uptime}*\n ├─ ▢ *RAM Used*: *${stats.memoryUsed} MB*\n └─ *MickeyGlitch 🦠*`;

        // Using native relayMessage structure with WhatsApp Encrypted Image Media
        await sock.relayMessage(
            chatId,
            {
                interactiveMessage: {
                    header: {
                        imageMessage: {
                            url: "https://mmg.whatsapp.net/o1/v/t24/f2/m238/AQPQSL2c-WwkAvc0dOlawAftDtykZMtKTBvwTeI1Fdr8Wocs_tgiAO6AsK8pujABcR5GCmOEjf3ziwFmDwNwfptr803adHl-bojx6s3z3A?ccb=9-4&oh=01_Q5Aa5gHVd95avx5626NoOSElOH79nk1qP906s41fyslDiDA9Bg&oe=6AC62D74&_nc_sid=e6ed6c&mms3=true",
                            mimetype: "image/jpeg",
                            fileSha256: "gdVeRzpbpu6tnVFOhsPl1MT8MIJ3c1/tzKiGmdHDdx=",
                            fileLength: 1272476,
                            height: 768,
                            width: 936,
                            mediaKey: "fg0G3iAr5lUYRIAnlf+Otib2t6F3/H+tDgES3WpLrFU=",
                            fileEncSha256: "pf4dj4cO+IRcCkoEDJip37yMN++BeRxYFYC3Up3sWeA=",
                            directPath: "/o1/v/t24/f2/m238/AQPQSL2c-WwkAvc0dOlawAftDtykZMtKTBvwTeI1Fdr8Wocs_tgiAO6AsK8pujABcR5GCmOEjf3ziwFmDwNwfptr803adHl-bojx6s3z3A?ccb=9-4&oh=01_Q5Aa5gHVd95avx5626NoOSElOH79nk1qP906s41fyslDiDA9Bg&oe=6AC62D74&_nc_sid=e6ed6c",
                            mediaKeyTimestamp: 1788793282,
                            jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2MBERISGBUYLxoaL2NCOEJjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY//AABEIABoAIAMBEQACEQEDEQH/xAGiAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgsQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+gEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoLEQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2gA2A0AAsupplement"
                        },
                        hasMediaAttachment: true
                    },
                    body: {
                        text: bodyText
                    },
                    footer: {
                        text: footerText
                    },
                    nativeFlowMessage: {
                        buttons: [
                            {
                                name: "single_select",
                                buttonParamsJson: JSON.stringify({
                                    "icon": "DOCUMENT",
                                    "title": "🚀 SELECT COMMAND MENU",
                                    "sections": dynamicSections,
                                    "has_multiple_buttons": true
                                })
                            },
                            {
                                name: "cta_url",
                                buttonParamsJson: JSON.stringify({
                                    "display_text": "# ./MickeyGlitch Channel",
                                    "url": "https://whatsapp.com/channel/0029VbCvKL1Id7nDv6KoDH0S",
                                    "landing_page_url": "https://whatsapp.com/channel/0029VbCvKL1Id7nDv6KoDH0S",
                                    "webview_interaction": true
                                })
                            }
                        ],
                        messageParamsJson: JSON.stringify({
                            "bottom_sheet": {
                                "in_thread_buttons_limit": 0,
                                "list_title": "✨ MICKEY GLITCH COMMANDS LIST",
                                "button_title": "Select"
                            }
                        })
                    }
                }
            },
            {
                additionalNodes: [
                    {
                        tag: "biz",
                        attrs: {},
                        content: [
                            {
                                tag: "interactive",
                                attrs: {
                                    type: "native_flow",
                                    v: "1"
                                },
                                content: [
                                    {
                                        tag: "native_flow",
                                        attrs: {
                                            v: "9",
                                            name: "mixed"
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        );

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

console.log(chalk.green('✓ Native Interactive Menu System Loaded'));
