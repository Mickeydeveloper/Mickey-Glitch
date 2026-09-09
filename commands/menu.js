/**
 * @project: MICKEY GLITCH V3.0.5 (A2UI BLOKS SINGLE SELECT MENU)
 * @author: Quantum Base Developer (TZ)
 * @version: 3.0.5
 */

const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const os = require('os');
const chalk = require('chalk');

// ==============================================
// 📊 BOT STATS & SYSTEM STATS
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

const getSystemStats = () => {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    const cmdCount = global.commands ? Object.keys(global.commands).length : 0;

    return {
        uptime: `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
        memoryUsed: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
        cmdCount,
        users: botStats.users || 0,
        groups: botStats.groups || 0
    };
};

const icons = {
    'GENERAL': '🧭', 'GROUP': '👥', 'MODERATION': '🛡️',
    'MEDIA': '🎨', 'AUDIO/VIDEO': '🎵', 'DOWNLOAD': '📥',
    'FUN': '🎮', 'AUTOMATION': '🤖', 'AI/BOT': '🧠',
    'EFFECTS': '✨', 'OWNER/ADMIN': '👑', 'OTHER': '📂',
    'UTILITY': '🛠️', 'GAMES': '🎯', 'SOCIAL': '💬',
    'TOOLS': '🛠️', 'ANIME': '🎭', 'SEARCH': '🔍',
    'STICKER': '🏷️', 'RPG': '⚔️'
};

// ==============================================
// 📂 DYNAMIC MENU LOADER
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

const loadDynamicMenu = () => {
    const commandsDir = resolveCommandsDir();
    const dynamicMenu = {};

    const addItem = (cat, item) => {
        const category = (cat || 'OTHER').toUpperCase();
        if (!dynamicMenu[category]) dynamicMenu[category] = [];
        if (!dynamicMenu[category].some(i => i.cmd === item.cmd)) {
            dynamicMenu[category].push(item);
        }
    };

    if (fs.existsSync(commandsDir)) {
        const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));
        files.forEach(file => {
            const baseName = file.replace(/\.js$/i, '');
            if (baseName === 'menu') return;
            try {
                const fullPath = path.join(commandsDir, file);
                delete require.cache[require.resolve(fullPath)];
                const cmdModule = require(fullPath);
                const cmdId = normalizeCommandName(cmdModule.name || baseName, `.${baseName}`);
                const category = (cmdModule.category || 'OTHER').toUpperCase();
                addItem(category, { cmd: cmdId, desc: cmdModule.description || `Cmd: ${baseName}` });
            } catch (e) {
                addItem('OTHER', { cmd: `.${baseName}`, desc: `Cmd: ${baseName}` });
            }
        });
    }

    return Object.keys(dynamicMenu).map(title => ({
        title,
        icon: icons[title] || '📂',
        items: dynamicMenu[title]
    }));
};

// ==============================================
// 🚀 MAIN MENU COMMAND (SINGLE SELECT A2UI)
// ==============================================
const menuCommand = async (sock, chatId, m) => {
    try {
        const now = moment().tz('Africa/Dar_es_Salaam');
        const userName = m.pushName || 'User';

        // FIX: Hakikisha sender/chatId ni string kamili kabla ya kutumia
        let userJid = m.sender || m.key?.participant || chatId;
        if (typeof userJid !== 'string') {
            userJid = String(userJid || chatId);
        }

        const menuData = loadDynamicMenu();
        const stats = getSystemStats();

        const totalCmds = menuData.reduce((acc, cat) => acc + cat.items.length, 0);

        // Dynamic Section Rows generator for Single Select
        const menuRows = menuData.map(category => ({
            header: "",
            title: `${category.icon} ${category.title}`,
            description: `Buka ${category.items.length} perintah`,
            id: `.menu ${category.title.toLowerCase()}`
        }));

        // A2UI Widget Data Structure
        const bloksData = {
            version: "v0.9",
            createSurface: {
                surfaceId: "menu-widget=dd55e2aa-5105-42ee-9fbd-224a9034b7c5",
                catalogId: "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json",
                components: [
                    { id: "root", component: "Column", children: ["header_title", "header_image", "user_card", "server_card", "menu_guide_card", "main_footer_info"] },
                    { id: "header_title", component: "Text", text: "✦ Mickey Glitch — Dashboard ✦", variant: "h1" },
                    { id: "header_image", component: "Image", url: "https://files.catbox.moe/lnptmh.jpg", variant: "header", fit: "cover" },
                    { id: "user_card", component: "Card", child: "user_card_column" },
                    { id: "user_card_column", component: "Column", children: ["user_card_header", "user_card_body", "user_card_caption"] },
                    { id: "user_card_header", component: "Text", text: "👤 Taarifa za Mtumiaji", variant: "h2" },
                    { id: "user_card_body", component: "Text", text: `• User: @${userJid.split('@')[0]}\n• Role: User\n• Status: Active`, variant: "body" },
                    { id: "user_card_caption", component: "Text", text: `Karibu tena ${userName} kwenye Mickey Glitch.`, variant: "caption" },
                    { id: "server_card", component: "Card", child: "server_card_column" },
                    { id: "server_card_column", component: "Column", children: ["server_card_header", "server_card_body"] },
                    { id: "server_card_header", component: "Text", text: "⚡ Takwimu za Bot", variant: "h2" },
                    { id: "server_card_body", component: "Text", text: `• Uptime: ${stats.uptime}\n• Command: ${totalCmds} Fitur\n• RAM: ${stats.memoryUsed} MB`, variant: "body" },
                    { id: "menu_guide_card", component: "Card", child: "menu_guide_column" },
                    { id: "menu_guide_column", component: "Column", children: ["menu_guide_header", "menu_guide_body"] },
                    { id: "menu_guide_header", component: "Text", text: "📖 Msaada", variant: "h3" },
                    { id: "menu_guide_body", component: "Text", text: "Bonyeza kitufe cha '📂 PILIH KATEGORI' chini kufungua menu.", variant: "body" },
                    { id: "main_footer_info", component: "Text", text: "Andika .menu all kuona amri zote.", variant: "caption" }
                ]
            }
        };

        // FIX: Sanitize JID array ili zisiwe na invalid types
        const validMentions = [userJid].filter(j => typeof j === 'string' && j.includes('@'));

        await sock.relayMessage(
            chatId,
            {
                interactiveMessage: {
                    footer: {
                        text: "© Mickey Glitch"
                    },
                    nativeFlowMessage: {
                        buttons: [
                            {
                                name: "single_select",
                                buttonParamsJson: JSON.stringify({
                                    title: "📂 PILIH KATEGORI",
                                    sections: [
                                        {
                                            title: "✧ Mickey Glitch Commands ✧",
                                            highlight_label: "Mickey Glitch",
                                            rows: menuRows
                                        }
                                    ]
                                })
                            }
                        ],
                        messageParamsJson: "{}"
                    },
                    bloksWidget: {
                        uuid: "766dfced-36ce-4feb-b5fc-b4a6ef3c04c9",
                        data: JSON.stringify(bloksData),
                        type: "im_a2ui"
                    },
                    contextInfo: {
                        mentionedJid: validMentions,
                        groupMentions: [],
                        statusAttributions: []
                    }
                }
            },
            {}
        );

    } catch (e) {
        console.error('Menu Error:', e);
        try {
            await sock.sendMessage(chatId, { text: `❌ *Menu Error!*\n\n${e.message}` }, { quoted: m });
        } catch (err) {}
    }
};

module.exports = menuCommand;
