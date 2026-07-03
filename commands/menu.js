const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
// Tumeingiza function yako ya sendInteractiveMessage hapa
const { sendInteractiveMessage } = require('../lib/myfunc'); 

/**
 * @project: MICKEY GLITCH V3.0.5
 * @author: Quantum Base Developer (TZ)
 * @description: Fast & Clean Menu - Gifted Interactive Single Select Picker
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

        // Muonekano maridadi na wa kisasa (Clean Aesthetic Look)
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
                         `💡 _Gusa button ya list hapo chini ili kuchagua na kufungua menu ya kundi unalotaka._\n\n` +
                         `*🔥 𝐌𝐈𝐂𝐊𝐄𝐘 𝐆𝐋𝐈𝐓𝐂𝐇 𝐕𝟑.𝟎.𝟓 • 𝟐𝟎𝟐𝟔*`;

        // Kutengeneza rows za categories dynamically kutoka kwenye commands zako
        const menuRows = dynamicMenu.map(cat => {
            const icon = icons[cat.title] || '📂';
            return {
                header: icon,
                title: `${cat.title} MENU`,
                description: `Inajumuisha jumla ya amri (${cat.items.length})`,
                id: `.menu_cat ${cat.title.toLowerCase()}` // ID itakayorudishwa mtumiaji akiclick
            };
        });

        // Hapa tunatuma kwa kutumia muundo sahihi wa sendInteractiveMessage
        await sendInteractiveMessage(sock, chatId, {
            text: menuText,
            interactiveButtons: [
                {
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                        title: '🔍 Fungua Menu Hapa',
                        sections: [
                            {
                                title: '📌 NJIA ZA MKATO',
                                rows: [
                                    { header: '📡', title: 'Ping Bot', description: 'Angalia kasi na mtandao wa bot', id: '.ping' },
                                    { header: '⚡', title: 'Alive', description: 'Angalia kama bot ipo hewani', id: '.alive' }
                                ]
                            },
                            {
                                title: '📂 MAKUNDI YA MENU',
                                rows: menuRows // Hapa zinaingia zile categories zote zilizosomwa dynamic
                            }
                        ]
                    })
                }
            ]
        }, m); // Added 'm' if your function requires context for quoting

    } catch (e) {
        console.error('Menu Error:', e);
        await sock.sendMessage(chatId, { 
            text: '❌ *Hitilafu!* Imeshindwa kufungua Interactive List Menu.'
        }, { quoted: m });
    }
};

module.exports = menuCommand;
