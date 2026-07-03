const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { sendInteractiveMessage } = require('gifted-btns');

/**
 * @project: MICKEY GLITCH V3.0.5
 * @author: Quantum Base Developer (TZ)
 * @description: Fast & Clean Menu - Minimalist Design with Image Payment
 */

// Quick rank system
const getRank = (total) => {
    if (total < 10) return '🌟 Newbie';
    if (total < 50) return '⭐ Regular';
    if (total < 200) return '⚡ Pro';
    if (total < 500) return '👑 Elite';
    return '💎 Legend';
};

// Quick stats
const getStats = () => {
    const uptime = process.uptime();
    return {
        uptime: `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
        memory: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1),
        users: '1.2k'
    };
};

// Category icons
const icons = {
    'GENERAL': '🏠', 'GROUP': '👥', 'MODERATION': '🛡️',
    'MEDIA': '🎨', 'AUDIO/VIDEO': '🎵', 'DOWNLOAD': '📥',
    'FUN': '🎮', 'AUTOMATION': '🤖', 'AI/BOT': '🧠',
    'EFFECTS': '✨', 'OWNER/ADMIN': '👑', 'OTHER': '📂'
};

// Dynamic menu synchronization
const loadDynamicMenu = () => {
    const commandsDir = path.join(process.cwd(), 'commands');
    const dynamicMenu = {};

    const addItem = (cat, item) => {
        const category = (cat || 'OTHER').toUpperCase();
        if (!dynamicMenu[category]) dynamicMenu[category] = [];
        if (!dynamicMenu[category].find(i => i.cmd === item.cmd)) {
            dynamicMenu[category].push(item);
        }
    };

    // Default mapping for core files
    const fileMapping = {
        'alive': 'GENERAL', 'ping': 'GENERAL', 'stats': 'GENERAL', 'owner': 'GENERAL', 'repo': 'GENERAL',
        'text': 'GENERAL', 'kick': 'GROUP', 'promote': 'GROUP', 'demote': 'GROUP', 'hidetag': 'GROUP', 'newgroup': 'GROUP', 
        'resetlink': 'GROUP', 'getlink': 'GROUP', 'staff': 'GROUP', 'groupmanage': 'GROUP',
        'sticker': 'MEDIA', 'stickercrop': 'MEDIA', 'emojimix': 'MEDIA', 'imagine': 'MEDIA', 'img-blur': 'MEDIA',
        'facebook': 'DOWNLOAD', 'gdrive': 'DOWNLOAD', 'instagram': 'DOWNLOAD', 'igs': 'DOWNLOAD',
        'play': 'AUDIO/VIDEO', 'lyrics': 'AUDIO/VIDEO', 'shazam': 'AUDIO/VIDEO',
        'ai': 'AI/BOT', 'chatbot': 'AI/BOT',
        'update': 'OWNER/ADMIN', 'cleartmp': 'OWNER/ADMIN', 'pmblocker': 'OWNER/ADMIN', 'settings': 'OWNER/ADMIN', 'pin': 'OWNER/ADMIN', 'getcode': 'OWNER/ADMIN'
    };

    // 1. Sync from commands folder
    if (fs.existsSync(commandsDir)) {
        const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));
        files.forEach(file => {
            const baseName = file.replace('.js', '');
            try {
                const cmdModule = require(path.join(commandsDir, file));
                const commandTrigger = baseName;

                addItem(cmdModule.category || fileMapping[baseName], {
                    cmd: `.${commandTrigger}`,
                    desc: cmdModule.description || `Command: ${commandTrigger}`,
                    eg: `.${commandTrigger}`
                });
            } catch (e) {
                addItem(fileMapping[baseName], {
                    cmd: `.${baseName}`,
                    desc: `Command: ${baseName}`,
                    eg: `.${baseName}`
                });
            }
        });
    }

    // 2. Sync from global registry
    if (global.commands && typeof global.commands === 'object') {
        Object.values(global.commands).forEach(cmd => {
            if (cmd.name) {
                addItem(cmd.category, {
                    cmd: `.${cmd.name}`,
                    desc: cmd.description || `Registered command: ${cmd.name}`,
                    eg: `.${cmd.name}`
                });
            }
        });
    }

    // Sort and return
    return Object.keys(dynamicMenu).sort().map(title => ({
        title,
        items: dynamicMenu[title].sort((a, b) => a.cmd.localeCompare(b.cmd))
    }));
};

// Build compact interactive sections (FIXED rowId -> id)
const buildSections = (menuData) => {
    return menuData.map(cat => ({
        title: `${icons[cat.title] || '📌'} ${cat.title}`,
        rows: cat.items.map(item => ({
            title: item.cmd, 
            description: item.desc ? item.desc : item.eg, 
            id: item.cmd.toLowerCase() // FIX: WhatsApp inatumia 'id' na sio 'rowId'
        }))
    }));
};

// Get dynamic greeting
const getGreeting = (hour) => {
    if (hour < 12) return { text: 'Habari za Asubuhi', emoji: '🌅' };
    if (hour < 16) return { text: 'Habari za Mchana', emoji: '☀️' };
    if (hour < 19) return { text: 'Habari za Jioni', emoji: '🌤️' };
    return { text: 'Usiku Mwema', emoji: '🌙' };
};

// Get random quotes
const getMotivationalQuote = () => {
    const quotes = [
        '✨ Code is poetry in motion.',
        '⚡ Stay hungry, stay foolish.',
        '🚀 Dream it, code it.',
        '💎 Innovation distinguishes leaders.',
        '🌟 Make it work, make it right.'
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
};

// Main menu function
const menuCommand = async (sock, chatId, m, userDb = null) => {
    try {
        const now = moment().tz('Africa/Dar_es_Salaam');
        const hour = now.hour();
        const greeting = getGreeting(hour);

        // User data & Stats
        const userName = m.pushName || 'Mteja';
        const userCmds = userDb?.commandsCount || 0;
        const userRank = getRank(userCmds);
        const stats = getStats();
        const quote = getMotivationalQuote();
        const dynamicMenu = loadDynamicMenu();

        // Format date & time
        const date = now.format('DD-MM-YYYY');
        const time = now.format('HH:mm');

        // Modernized & Clean Text Layout
        const menuText = `╭━━━〔 𝗠𝗜𝗖𝗞𝗘𝗬 𝗠𝗘𝗡𝗨 〕━━━┈⊷
│
├─ ${greeting.emoji} *${greeting.text}, ${userName}*
├─ 🎖️ *Rank:* ${userRank}
├─ 📊 *Matumizi:* ${userCmds} cmds
│
├─ ⏳ *Uptime:* ${stats.uptime}
├─ 💾 *RAM:* ${stats.memory} MB
├─ 📆 *Tarehe:* ${date} | ${time}
│
├─ 💡 *Quote:* _${quote}_
│
╰━━━━━━━━━━━━━━━━━━┈⊷

Gusa kifungo cha *"Fungua Menu 📂"* hapo chini ili kuona na kuchagua amri (commands) zote zilizopo kwenye mfumo wetu.`;

        // Send interactive message
        await sendInteractiveMessage(sock, chatId, {
            image: { url: "https://raw.githubusercontent.com/Mickeydeveloper/water-billing/main/1761205727440.jpg" },
            text: menuText,
            footer: "⚡ Powered by Mickey Bot v3.0.5",
            interactiveButtons: [
                {
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                        title: 'Fungua Menu 📂', // Jina la button kuu
                        sections: buildSections(dynamicMenu)
                    })
                }
            ]
        }, { quoted: m });

    } catch (e) {
        console.error('Menu Error:', e);
        await sock.sendMessage(chatId, { 
            text: '❌ *Hitilafu!* Menu imeshindwa kufunguka kwa sasa. Tafadhali jaribu tena baadae.'
        }, { quoted: m });
    }
};

module.exports = menuCommand;
