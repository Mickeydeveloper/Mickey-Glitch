const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
// Hakikisha sendList au sendButtons yako inasupport interactive messages
const { sendList } = require('../lib/myfunc'); 

/**
 * @project: MICKEY GLITCH V3.0.5
 * @author: Quantum Base Developer (TZ)
 * @description: Fast & Clean Menu - Minimalist Single Select Design
 */

const getRank = (total) => {
    if (total < 10) return '🌟 Newbie';
    if (total < 50) return '⭐ Regular';
    if (total < 200) return '⚡ Pro';
    if (total < 500) return '👑 Elite';
    return '💎 Legend';
};

const getStats = () => {
    const uptime = process.uptime();
    return {
        uptime: `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
        memory: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1),
        users: '1.2k'
    };
};

const icons = {
    'GENERAL': '🏠', 'GROUP': '👥', 'MODERATION': '🛡️',
    'MEDIA': '🎨', 'AUDIO/VIDEO': '🎵', 'DOWNLOAD': '📥',
    'FUN': '🎮', 'AUTOMATION': '🤖', 'AI/BOT': '🧠',
    'EFFECTS': '✨', 'OWNER/ADMIN': '👑', 'OTHER': '📂'
};

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

    const fileMapping = {
        'alive': 'GENERAL', 'ping': 'GENERAL', 'stats': 'GENERAL', 'owner': 'GENERAL', 'repo': 'GENERAL',
        'kick': 'GROUP', 'promote': 'GROUP', 'demote': 'GROUP', 'hidetag': 'GROUP',
        'sticker': 'MEDIA', 'imagine': 'MEDIA', 'facebook': 'DOWNLOAD', 'instagram': 'DOWNLOAD',
        'play': 'AUDIO/VIDEO', 'ai': 'AI/BOT', 'update': 'OWNER/ADMIN'
    };

    if (fs.existsSync(commandsDir)) {
        const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));
        files.forEach(file => {
            const baseName = file.replace('.js', '');
            try {
                const cmdModule = require(path.join(commandsDir, file));
                addItem(cmdModule.category || fileMapping[baseName], {
                    cmd: `.${baseName}`,
                    desc: cmdModule.description || `Fungua amri ya ${baseName}`
                });
            } catch (e) {
                addItem(fileMapping[baseName], { cmd: `.${baseName}`, desc: `Amri ya ${baseName}` });
            }
        });
    }

    if (global.commands && typeof global.commands === 'object') {
        Object.values(global.commands).forEach(cmd => {
            if (cmd.name) {
                addItem(cmd.category, { cmd: `.${cmd.name}`, desc: cmd.description || `Amri ya ${cmd.name}` });
            }
        });
    }

    return Object.keys(dynamicMenu).sort().map(title => ({
        title,
        items: dynamicMenu[title].sort((a, b) => a.cmd.localeCompare(b.cmd))
    }));
};

const getGreeting = (hour) => {
    if (hour < 12) return { text: 'Asubuhi', emoji: '☀️' };
    if (hour < 18) return { text: 'Mchana', emoji: '🌤️' };
    return { text: 'Jioni', emoji: '🌙' };
};

const menuCommand = async (sock, chatId, m, userDb = null) => {
    try {
        const now = moment().tz('Africa/Dar_es_Salaam');
        const greeting = getGreeting(now.hour());
        const stats = getStats();
        const dynamicMenu = loadDynamicMenu();

        const userName = m.pushName || 'Mtumiaji';
        const userCmds = userDb?.commandsCount || 0;
        const userRank = getRank(userCmds);

        // Muonekano safi (Clean & Aesthetic Header)
        const menuText = `╭━━━〔 𝐌𝐈𝐂𝐊𝐄𝐘-𝐁𝐎𝐓 〕━━━┈⊷\n` +
                         `┃ 👋 Habari ${greeting.text} *${userName}* ${greeting.emoji}\n` +
                         `┃ 🏆 *Cheo:* ${userRank}\n` +
                         `┃ 📊 *Matumizi:* ${userCmds.toLocaleString()} cmds\n` +
                         `┣━━━━━━━━━━━━━━━━━━┈⊷\n` +
                         `┃ 📅 *Tarehe:* ${now.format('DD/MM/YYYY')}\n` +
                         `┃ ⏰ *Muda:* ${now.format('HH:mm:ss')} EAT\n` +
                         `┃ ⏳ *Uptime:* ${stats.uptime}\n` +
                         `┃ 💾 *Ram:* ${stats.memory} MB\n` +
                         `╰━━━━━━━━━━━━━━━━━━┈⊷\n\n` +
                         `💡 _Gusa button ya single-select hapo chini kuona list ya menu zote zilizopangwa kwa category._`;

        // Kuunda rows za Single Select List kutoka kwenye Dynamic Menu
        const rows = dynamicMenu.map(cat => {
            const icon = icons[cat.title] || '📂';
            return {
                title: `${icon} ${cat.title} MENU`,
                rowId: `.menu_cat ${cat.title.toLowerCase()}`, // Itatuma hii id mtumiaji akiclick
                description: `Inajumuisha amri ${cat.items.length} za ${cat.title.toLowerCase()}`
            };
        });

        // Kuongeza njia za mkato (Quick links) mwanzoni mwa list
        const sections = [
            {
                title: "📌 NJIA ZA MKATO",
                rows: [
                    { title: "📡 Ping Bot", rowId: ".ping", description: "Angalia kasi ya bot" },
                    { title: "⚡ Alive", rowId: ".alive", description: "Angalia kama bot iko hewani" }
                ]
            },
            {
                title: "📂 CATEGORIES",
                rows: rows
            }
        ];

        const footer = '🔥 𝐌𝐈𝐂𝐊𝐄𝐘 𝐆𝐋𝐈𝐓𝐂𝐇 𝐕𝟑 • 𝐐𝐮𝐚𝐧𝐭𝐮𝐦 𝐁𝐚𝐬𝐞 🔥';
        const buttonText = '🔍 Fungua Menu Hapa';

        // Tuma kwa kutumia function yako ya list/single-select
        await sendList(sock, chatId, menuText, footer, buttonText, sections, m);

    } catch (e) {
        console.error('Menu Error:', e);
        await sock.sendMessage(chatId, { 
            text: '❌ *Hitilafu!* Imeshindwa kufungua single-select menu.'
        }, { quoted: m });
    }
};

module.exports = menuCommand;
