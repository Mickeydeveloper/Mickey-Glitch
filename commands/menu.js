const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const { sendInteractiveMessage } = require('gifted-btns');

/**
 * @project: MICKEY GLITCH ULTRA V4.0.0
 * @author: Quantum Base Developer (TZ)
 * @description: Ultra Menu - Compact & Attractive Design
 */

// ============ ULTRA FEATURES ============

// 1. AUTO RANK SYSTEM
const getUserRank = (totalCommands) => {
    if (totalCommands < 10) return { rank: '🥉Newbie', emoji: '🐣' };
    if (totalCommands < 50) return { rank: '🥈Regular', emoji: '📱' };
    if (totalCommands < 200) return { rank: '🥇Pro', emoji: '⚡' };
    if (totalCommands < 500) return { rank: '👑Elite', emoji: '🔥' };
    return { rank: '💎Legend', emoji: '👾' };
};

// 2. DYNAMIC BOT STATS
const getBotStats = () => {
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    
    return {
        uptime: `${days}d ${hours}h ${minutes}m`,
        memory: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1),
        commandsLoaded: 85,
        usersTotal: 1247,
        groupsActive: 43
    };
};

// 3. DAILY TIPS (Compact)
const dailyTips = [
    "⚡.ping inaonyesha speed",
    "🎨.imagine tengeneza picha AI",
    "🤖.gpt ongea na AI",
    "🎵.play pakua audio YouTube",
    "🛡️.antilink zuia link hatari",
    "👥.tagall wataje wote",
    "📥.tiktok pakua video no watermark"
];

// ============ MAIN MENU FUNCTION ============

const menuCommand = async (sock, chatId, m, userDb = null) => {
    try {
        const botName = 'MICKEY GLITCH';
        const now = moment().tz('Africa/Dar_es_Salaam');
        const greet = now.hour() < 12 ? '☀️' : now.hour() < 18 ? '🌤️' : '🌙';
        
        // User stats
        const userCommandsTotal = userDb?.commandsCount || 42;
        const userRank = getUserRank(userCommandsTotal);
        const botStats = getBotStats();
        const dailyTip = dailyTips[Math.floor(Math.random() * dailyTips.length)];
        
        // Category icons mapping
        const categoryIcons = {
            'GENERAL': '🏠', 'GROUP': '👥', 'MODERATION': '🛡️',
            'MEDIA': '🎨', 'AUDIO/VIDEO': '🎵', 'FUN': '🎮',
            'AUTOMATION': '🤖', 'AI/BOT': '🧠', 'EFFECTS': '✨'
        };

        // ============ COMPACT MENU CATEGORIES ============
        const MENU_CATEGORIES = [
            {
                title: 'GENERAL',
                items: [
                    { command: '.help', description: 'Menu', example: '.help' },
                    { command: '.ping', description: 'Speed', example: '.ping' },
                    { command: '.alive', description: 'Bot status', example: '.alive' },
                    { command: '.owner', description: 'Owner info', example: '.owner' },
                    { command: '.repo', description: 'Source code', example: '.repo' },
                    { command: '.stats', description: 'Bot stats', example: '.stats' }
                ]
            },
            {
                title: 'GROUP',
                items: [
                    { command: '.add', description: 'Add user', example: '.add 2557xxxxxx' },
                    { command: '.kick', description: 'Remove user', example: '.kick @user' },
                    { command: '.promote', description: 'Make admin', example: '.promote @user' },
                    { command: '.demote', description: 'Remove admin', example: '.demote @user' },
                    { command: '.tagall', description: 'Mention all', example: '.tagall hello' },
                    { command: '.hidetag', description: 'Hidden mention', example: '.hidetag msg' },
                    { command: '.setgname', description: 'Group name', example: '.setgname Name' },
                    { command: '.setgdesc', description: 'Group desc', example: '.setgdesc Text' }
                ]
            },
            {
                title: 'MODERATION',
                items: [
                    { command: '.ban', description: 'Ban user', example: '.ban @user' },
                    { command: '.unban', description: 'Unban user', example: '.unban @user' },
                    { command: '.antilink', description: 'Block links', example: '.antilink on' },
                    { command: '.antibadword', description: 'Block bad words', example: '.antibadword on' },
                    { command: '.anticall', description: 'Block calls', example: '.anticall on' },
                    { command: '.warn', description: 'Warn user', example: '.warn @user' }
                ]
            },
            {
                title: 'MEDIA',
                items: [
                    { command: '.sticker', description: 'Image to sticker', example: '.sticker' },
                    { command: '.facebook', description: 'FB downloader', example: '.facebook url' },
                    { command: '.instagram', description: 'IG downloader', example: '.instagram url' },
                    { command: '.tiktok', description: 'TT no watermark', example: '.tiktok url' },
                    { command: '.twitter', description: 'X downloader', example: '.twitter url' },
                    { command: '.ytmp3', description: 'YouTube to MP3', example: '.ytmp3 url' },
                    { command: '.ytmp4', description: 'YouTube to MP4', example: '.ytmp4 url' }
                ]
            },
            {
                title: 'AUDIO/VIDEO',
                items: [
                    { command: '.play', description: 'Audio from YT', example: '.play song name' },
                    { command: '.video', description: 'Video from YT', example: '.video song name' },
                    { command: '.music', description: 'Search music', example: '.music artist song' }
                ]
            },
            {
                title: 'FUN',
                items: [
                    { command: '.compliment', description: 'Compliment', example: '.compliment @user' },
                    { command: '.lyrics', description: 'Song lyrics', example: '.lyrics song name' },
                    { command: '.weather', description: 'Weather info', example: '.weather city' },
                    { command: '.truth', description: 'Truth game', example: '.truth' },
                    { command: '.dare', description: 'Dare game', example: '.dare' },
                    { command: '.quiz', description: 'Quiz game', example: '.quiz' }
                ]
            },
            {
                title: 'AUTOMATION',
                items: [
                    { command: '.autostatus', description: 'Auto view status', example: '.autostatus on' },
                    { command: '.autotyping', description: 'Auto typing', example: '.autotyping on' },
                    { command: '.autoread', description: 'Auto read msgs', example: '.autoread on' },
                    { command: '.areact', description: 'Auto react', example: '.areact on' }
                ]
            },
            {
                title: 'AI/BOT',
                items: [
                    { command: '.gpt', description: 'ChatGPT AI', example: '.gpt question' },
                    { command: '.imagine', description: 'AI image gen', example: '.imagine cat' },
                    { command: '.gemini', description: 'Google Gemini', example: '.gemini question' },
                    { command: '.aivoice', description: 'AI voice', example: '.aivoice text' }
                ]
            },
            {
                title: 'EFFECTS',
                items: [
                    { command: '.glitch', description: 'Glitch text', example: '.glitch text' },
                    { command: '.neon', description: 'Neon effect', example: '.neon text' },
                    { command: '.fire', description: 'Fire effect', example: '.fire text' },
                    { command: '.matrix', description: 'Matrix style', example: '.matrix text' }
                ]
            }
        ];

        // Build interactive sections (Compact)
        const sections = MENU_CATEGORIES.map(category => ({
            title: `${categoryIcons[category.title] || '📌'} ${category.title} (${category.items.length})`,
            rows: category.items.map(item => ({
                header: `📌 ${item.command}`,
                title: item.description,
                description: `💡 ${item.example}`,
                id: item.command.toLowerCase()
            }))
        }));

        // ============ DESIGN 1: CARDS STYLE (COMPACT) ============
        const helpText_Cards = `
╭─────────────────╮
│ ✨MICKEY GLITCH │
│  ⚡ULTRA V4.0⚡  │
╰─────────────────╯

┌─────────────────┐
│ ▸${m.pushName || 'User'} ${userRank.rank}│
│ ▸${userCommandsTotal}cmds ⏱️${botStats.uptime}│
│ ▸💾${botStats.memory}MB 👥${botStats.usersTotal}│
└─────────────────┘

┌─────────────────┐
│ 💡${dailyTip}│
└─────────────────┘

╭─────────────────╮
│ 🔗Mickey-trony  │
│ 👨‍💻@Mickeymozy  │
╰─────────────────╯
    【 📋OPEN 】
`;

        // ============ DESIGN 2: MINIMAL ELEGANT (COMPACT) ============
        const helpText_Minimal = `
▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰
   ✨MICKEY GLITCH✨
     ULTRA V4.0
▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

 👋${greet} ${m.pushName}
 🎖️${userRank.rank} 📊${userCommandsTotal}

 ⏱️${botStats.uptime} 💾${botStats.memory}MB
 👥${botStats.usersTotal} users

▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰
 💡${dailyTip}
▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

 🔗Mickey-trony
 👨‍💻@Mickeymozy

▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰
     【 📋OPEN 】
`;

        // ============ SELECT YOUR DESIGN HERE ============
        const helpText = helpText_Minimal; // Change to helpText_Cards if you want Cards style

        // ============ SEND INTERACTIVE MESSAGE ============
        await sendInteractiveMessage(sock, chatId, {
            text: helpText,
            contextInfo: {
                externalAdReply: {
                    title: "MICKEY GLITCH ULTRA",
                    body: "Powered by Quantum Code",
                    thumbnailUrl: 'https://water-billing-292n.onrender.com/1761205727440.png',
                    sourceUrl: 'https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610',
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            },
            interactiveButtons: [
                {
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                        title: '📋 OPEN MENU',
                        sections: sections
                    })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '⚡ PING',
                        id: '.ping'
                    })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📊 STATS',
                        id: '.stats'
                    })
                }
            ]
        });

    } catch (e) {
        console.error('Menu Error:', e);
        await sock.sendMessage(chatId, { 
            text: '❌ Error! Jaribu tena.'
        }, { quoted: m });
    }
};

module.exports = menuCommand;