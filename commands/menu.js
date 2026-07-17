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
// 🎨 MENU ICONS & STYLES
// ==============================================
const icons = {
    'GENERAL': '🏠', 'GROUP': '👥', 'MODERATION': '🛡️',
    'MEDIA': '🎨', 'AUDIO/VIDEO': '🎵', 'DOWNLOAD': '📥',
    'FUN': '🎮', 'AUTOMATION': '🤖', 'AI/BOT': '🧠',
    'EFFECTS': '✨', 'OWNER/ADMIN': '👑', 'OTHER': '📂',
    'UTILITY': '🔧', 'GAMES': '🎯', 'SOCIAL': '💬',
    'TOOLS': '🛠️', 'ANIME': '🎭'
};

// Button styles za kuvutia
const buttonStyles = {
    primary: '⭐',
    secondary: '💫',
    accent: '🌟',
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    danger: '🔥'
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
        'sticker': 'MEDIA', 'facebook': 'DOWNLOAD', 'tiktok': 'DOWNLOAD',
        'play': 'AUDIO/VIDEO', 'ai': 'AI/BOT', 'gpt': 'AI/BOT'
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
                    desc: cmdModule.description || `Cmd: ${baseName}`
                });
            } catch (e) {
                addItem(fileMapping[baseName] || 'OTHER', {
                    cmd: `.${baseName}`,
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
                    cmd: `.${cmd.name}`,
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
    if (hour >= 12 && hour <= 16) return { text: 'Mchana', emoji: '☀️' };
    if (hour >= 17 && hour <= 18) return { text: 'Jioni', emoji: '🌤️' };
    return { text: 'Usiku', emoji: '🌙' };
};

const buildSections = (menuData) => {
    return menuData.map(cat => ({
        title: `${cat.icon} ${cat.title}`,
        highlight_label: `${cat.items.length} cmd`,
        rows: cat.items.slice(0, 15).map(item => ({
            title: item.cmd,
            description: item.desc ? item.desc.substring(0, 20) : '',
            id: item.cmd 
        }))
    }));
};

// ==============================================
// 🚀 MAIN MENU COMMAND - BORESHWA BUTTONS
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
        
        // Menu header iliyoboreshwa
        const menuText = `✨ *MICKEY GLITCH V3.0.5* ✨
        
${buttonStyles.primary} *Habari za ${greeting.text}* ${greeting.emoji}
${buttonStyles.info} *User:* ${userName}
${buttonStyles.success} *Date:* ${date} | ⏰ *Time:* ${time}

━━━━━━━━━━━━━━━━━━━━
💫 *Bonyeza buttons chini:*
━━━━━━━━━━━━━━━━━━━━

📌 *Menu* - Angalia command zote
👑 *Owner* - Wasiliana na mwenye bot
❤️ *I love mom* - Special message`;

        // ==============================================
        // 📤 SEND INTERACTIVE MENU WITH IMPROVED BUTTONS
        // ==============================================
        const buttonBuilder = new ButtonV2(sock)
            .setBody(menuText)
            .setFooter(`MICKEY BOT • ${date}`)
            .setThumbnail('https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/Privacy/menu.png');
        
        // Button 1: Menu 📂 - Kwa kutumia nativeFlowInfo iliyoboreshwa
        buttonBuilder.addRawButton({
            buttonText: { displayText: '📂 Menu' },
            buttonId: 'mickey_list_menu',
            type: 1,
            nativeFlowInfo: {
                name: 'single_select',
                paramsJson: JSON.stringify({
                    title: '📂 Orodha ya Command Zote',
                    sections: buildSections(menuData)
                })
            }
        });
        
        // Button 2: Owner 👑 - Quick reply iliyoboreshwa
        buttonBuilder.addRawButton({
            buttonText: { displayText: '👑 Owner' },
            buttonId: '.owner',
            type: 1,
            nativeFlowInfo: {
                name: 'quick_reply',
                paramsJson: JSON.stringify({
                    display_text: '👑 Wasiliana na Owner',
                    id: '.owner'
                })
            }
        });
        
        // Button 3: Alive 🟢 - Button mpya ya kuangalia bot status
        buttonBuilder.addRawButton({
            buttonText: { displayText: '🟢 Alive' },
            buttonId: '.alive',
            type: 1,
            nativeFlowInfo: {
                name: 'quick_reply',
                paramsJson: JSON.stringify({
                    display_text: '🟢 Angalia Status ya Bot',
                    id: '.alive'
                })
            }
        });
        
        // Button 4: I 💖 Mom - Button maalum yenye hisia
        buttonBuilder.addRawButton({
            buttonText: { displayText: '❤️ I ❤️ Mom' },
            buttonId: 'love_mom',
            type: 1,
            nativeFlowInfo: {
                name: 'quick_reply',
                paramsJson: JSON.stringify({
                    display_text: '❤️ I Love Mom ❤️',
                    id: 'love_mom'
                })
            }
        });
        
        await buttonBuilder.send(chatId, { quoted: m });

    } catch (e) {
        console.error('Menu Error:', e);
        try {
            // Error handling iliyoboreshwa
            const errorMsg = `❌ *Menu Error!*
            
⚠️ Tafadhali jaribu tena baadaye.
📞 Wasiliana na *Owner* kama tatizo linaendelea.`;
            await sock.sendMessage(chatId, { text: errorMsg }, { quoted: m });
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
console.log(chalk.cyan('✓ Buttons Enhanced With Beautiful UI'));