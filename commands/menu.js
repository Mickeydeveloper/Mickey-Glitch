/**
 * @project: MICKEY GLITCH V3.0.5 (AIRICH A2UI DASHBOARD MENU)
 * @author: Quantum Base Developer (TZ)
 */

const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

// Global / Local Import ya lib/a2ui (Airich Structure)
let a2ui;
try {
    a2ui = require('../lib/a2ui') || require('./lib/a2ui');
} catch (e) {
    a2ui = null;
}

// ==============================================
// 📊 SYSTEM STATS LOADER
// ==============================================
const getSystemStats = () => {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    return {
        uptime: `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
        memoryUsed: (memUsage.heapUsed / 1024 / 1024).toFixed(2)
    };
};

const icons = {
    'GENERAL': '🧭', 'GROUP': '👥', 'MODERATION': '🛡️',
    'DOWNLOAD': '📥', 'FUN': '🎮', 'AI': '🧠',
    'OWNER': '👑', 'OTHER': '📂', 'TOOLS': '🛠️',
    'SEARCH': '🔍', 'STICKER': '🏷️', 'RPG': '⚔️'
};

// ==============================================
// 📂 DYNAMIC MENU LOADER (ONDOA NENO COMMAND)
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

const sanitizeName = (rawName) => {
    if (!rawName) return '';
    // Ondoa neno 'command' au 'cmd' kabisa kwenye jina
    let clean = String(rawName).replace(/command/gi, '').replace(/cmd/gi, '').trim();
    return clean ? `.${clean.toLowerCase()}` : '';
};

const loadDynamicMenu = () => {
    const commandsDir = resolveCommandsDir();
    const dynamicMenu = {};

    if (fs.existsSync(commandsDir)) {
        const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));
        files.forEach(file => {
            const baseName = file.replace(/\.js$/i, '');
            if (baseName === 'menu') return;
            try {
                const fullPath = path.join(commandsDir, file);
                delete require.cache[require.resolve(fullPath)];
                const cmdModule = require(fullPath);
                
                // Safisha jina na ondoa neno 'command'
                const cleanName = sanitizeName(cmdModule.name || baseName);
                const category = (cmdModule.category || 'OTHER').toUpperCase();

                if (cleanName) {
                    if (!dynamicMenu[category]) dynamicMenu[category] = [];
                    if (!dynamicMenu[category].includes(cleanName)) {
                        dynamicMenu[category].push(cleanName);
                    }
                }
            } catch (e) {
                const cleanBase = sanitizeName(baseName);
                if (cleanBase) {
                    if (!dynamicMenu['OTHER']) dynamicMenu['OTHER'] = [];
                    dynamicMenu['OTHER'].push(cleanBase);
                }
            }
        });
    }

    return dynamicMenu;
};

// ==============================================
// 🚀 MAIN MENU COMMAND (AIRICH A2UI UI)
// ==============================================
const menuCommand = async (sock, chatId, m) => {
    try {
        const userName = m.pushName || 'User';
        let userJid = m.sender || m.key?.participant || chatId;
        if (typeof userJid !== 'string') userJid = String(userJid || chatId);

        const menuData = loadDynamicMenu();
        const stats = getSystemStats();
        const totalCmds = Object.values(menuData).flat().length;
        const imageUrl = "https://files.catbox.moe/lnptmh.jpg";

        // 1. Orodha ya Commands kwa nje (bila neno command)
        let textMenu = `✦ *MICKEY GLITCH DASHBOARD* ✦\n\n`;
        textMenu += `👤 *User:* @${userJid.split('@')[0]}\n`;
        textMenu += `⚡ *Uptime:* ${stats.uptime}\n`;
        textMenu += `💾 *RAM:* ${stats.memoryUsed} MB\n`;
        textMenu += `📊 *Jumla:* ${totalCmds} Fitur\n`;
        textMenu += `───────────────────\n\n`;

        for (const [category, cmds] of Object.entries(menuData)) {
            const icon = icons[category] || '📂';
            textMenu += `*${icon} ${category}*\n`;
            cmds.forEach(cmd => {
                textMenu += ` › \`${cmd}\`\n`;
            });
            textMenu += `\n`;
        }

        textMenu += `© Mickey Glitch Technology`;

        // 2. Airich A2UI Bloks Structure
        let bloksPayload;
        if (a2ui && typeof a2ui.createBloks === 'function') {
            bloksPayload = a2ui.createBloks({
                title: "✦ Mickey Glitch — Dashboard ✦",
                image: imageUrl,
                user: `@${userJid.split('@')[0]}`,
                uptime: stats.uptime,
                commands: totalCmds
            });
        } else {
            // Standard Airich / A2UI JSON Template
            bloksPayload = {
                version: "v0.9",
                createSurface: {
                    surfaceId: "airich-menu-surface-01",
                    catalogId: "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json",
                    components: [
                        { id: "root", component: "Column", children: ["header_title", "header_image", "user_card", "server_card"] },
                        { id: "header_title", component: "Text", text: "✦ MICKEY GLITCH DASHBOARD ✦", variant: "h1" },
                        { id: "header_image", component: "Image", url: imageUrl, variant: "header", fit: "cover" },
                        { id: "user_card", component: "Card", child: "user_card_column" },
                        { id: "user_card_column", component: "Column", children: ["user_card_header", "user_card_body"] },
                        { id: "user_card_header", component: "Text", text: "👤 Taarifa za Mtumiaji", variant: "h2" },
                        { id: "user_card_body", component: "Text", text: `• Mtumiaji: @${userJid.split('@')[0]}\n• Hali: Mwenyeji`, variant: "body" },
                        { id: "server_card", component: "Card", child: "server_card_column" },
                        { id: "server_card_column", component: "Column", children: ["server_card_header", "server_card_body"] },
                        { id: "server_card_header", component: "Text", text: "⚡ Hali ya Mfumo", variant: "h2" },
                        { id: "server_card_body", component: "Text", text: `• Muda wa Ufanyaji Kazi: ${stats.uptime}\n• RAM: ${stats.memoryUsed} MB\n• Jumla ya Fitur: ${totalCmds}`, variant: "body" }
                    ]
                }
            };
        }

        // Tuma ujumbe kupitia relayMessage
        await sock.relayMessage(
            chatId,
            {
                interactiveMessage: {
                    body: { text: textMenu },
                    footer: { text: "© Mickey Glitch Technology" },
                    bloksWidget: {
                        uuid: "766dfced-36ce-4feb-b5fc-b4a6ef3c04c9",
                        data: JSON.stringify(bloksPayload),
                        type: "im_a2ui"
                    },
                    contextInfo: {
                        mentionedJid: [userJid]
                    }
                }
            },
            {}
        );

    } catch (e) {
        console.error('Menu Error:', e);
        await sock.sendMessage(chatId, { text: `❌ *Error:* ${e.message}` }, { quoted: m });
    }
};

module.exports = menuCommand;
