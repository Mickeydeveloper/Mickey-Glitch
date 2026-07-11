/**
 * @project: MICKEY GLITCH V3.0.5
 * @author: Quantum Base Developer (TZ)
 * @version: 3.0.5
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
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

const Catalog = {
    key: {
        remoteJid: '0@s.whatsapp.net',
        fromMe: false,
        id: 'Mickeycatalog',
        participant: '0@s.whatsapp.net'
    },
    message: {
        productMessage: {
            product: {
                title: 'MICKEY GLITCH V3.0.5',
                description: 'MICKEY GLITCH V3.0.5 - The Ultimate WhatsApp Bot',
                currencyCode: 'BTC',
                priceAmount1000: 100000000,
                retailerId: 'BTC100000000',
                productImageCount: 1
            },
            businessOwnerJid: '0@s.whatsapp.net'
        }
    }
};

const sendAudio = async (sock, chatId, m) => {
    try {
        const audioUrl = 'https://raw.githubusercontent.com/Mickeymozy/Mickey-Vip/main/sina%20mda%20nae.mp3';
        const response = await axios.get(audioUrl, {
            responseType: 'arraybuffer',
            timeout: 15000
        });

        await sock.sendMessage(chatId, {
            audio: Buffer.from(response.data),
            mimetype: 'audio/mp3',
            ptt: false
        }, {
            quoted: m
        });
    } catch (err) {
        console.error('[Menu Audio] Failed to send audio:', err?.message || err);
    }
};

const getGreeting = (hour) => {
    if (hour >= 0 && hour <= 4) return { text: 'Usiku sana', emoji: '🌙' };
    if (hour >= 5 && hour <= 11) return { text: 'Asubuhi', emoji: '☀️' };
    if (hour >= 12 && hour <= 16) return { text: 'Mchana', emoji: '☀️' };
    if (hour >= 17 && hour <= 18) return { text: 'Jioni', emoji: '🌤️' };
    return { text: 'Usiku', emoji: '🌙' };
};

// FIXED: `id` sasa inabaki kuwa amri kamili yenye nukta (mfano: .general) ili ikibonyezwa itume command husika moja kwa moja!
const buildSections = (menuData) => {
    return menuData.map(cat => ({
        title: `${cat.icon} ${cat.title}`,
        highlight_label: `${cat.items.length} cmd`,
        rows: cat.items.slice(0, 15).map(item => ({
            title: item.cmd,
            description: item.desc ? item.desc.substring(0, 20) : '',
            id: item.cmd // Inatuma kodi halisi kama ilivyo (e.g. .ping au .sticker)
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
        
        const date = now.format('DD July 2026'); 
        const time = now.format('HH:mm:ss');

        const menuText = `✨ *MICKEY GLITCH V3.0.5*
👋 *Habari za ${greeting.text}* ${greeting.emoji}
👤 *User:* ${userName}
📅 *Date:* ${date} | ⏰ *Time:* ${time}

👇 _Bonyeza "Menu 📂" kuona command zote_
❤️ _i love mom_`;

        // ==============================================
        // 📤 SEND INTERACTIVE MENU (ROW OF 2 BUTTONS FIXED)
        // ==============================================
        await new ButtonV2(sock)
            .setBody(menuText)
            .setFooter(`MICKEY BOT`)
            .setThumbnail('https://cdn.ornzora.eu.cc/4d2905ce-3707-4ec0-998a-68a3d851629f-FIORA.jpg')
            // Row Button 1: Dynamic Single Select List Menu
            .addRawButton({
                buttonText: { displayText: 'Menu 📂' },
                buttonId: 'mickey_list_menu',
                type: 1,
                nativeFlowInfo: {
                    name: 'single_select',
                    paramsJson: JSON.stringify({
                        title: '📂 Fungua Orodha',
                        sections: buildSections(menuData)
                    })
                }
            })
            // FIXED BUTTON 2: Muundo sahihi wa Quick Reply unaoondoa error ya WhatsApp toleo jipya
            .addRawButton({
                buttonText: { displayText: 'Owner 👑' },
                buttonId: '.owner', // Unajaza command hapa moja kwa moja kama ID yake
                type: 1,
                nativeFlowInfo: {
                    name: 'quick_reply',
                    paramsJson: JSON.stringify({
                        display_text: 'Owner 👑',
                        id: '.owner'
                    })
                }
            })
            .send(chatId, { quoted: m });

            await sendAudio(sock, chatId, m);

    } catch (e) {
        console.error('Menu Error:', e);
        try {
            await sock.sendMessage(chatId, { text: `❌ *Menu Error!*` }, { quoted: m });
        } catch (err) {}
    }
};

module.exports = menuCommand;
module.exports.loadDynamicMenu = loadDynamicMenu;
module.exports.getSystemStats = getSystemStats;

if (typeof global !== 'undefined') {
    setInterval(() => {
        try { if (global.botStats) botStats = { ...botStats, ...global.botStats }; } catch (e) {}
    }, 60000);
}

console.log(chalk.green('✓ Menu System Loaded Successfully'));
