const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const { sendInteractiveMessage } = require('gifted-btns');

/**
 * @project: MICKEY GLITCH V4.0
 * @author: Quantum Base Developer (TZ)
 * @description: Simplified Narrow Menu
 */

// AUTO RANK SYSTEM
const getUserRank = (totalCommands) => {
    if (totalCommands < 10) return '🥉Newbie';
    if (totalCommands < 50) return '🥈Regular';
    if (totalCommands < 200) return '🥇Pro';
    if (totalCommands < 500) return '👑Elite';
    return '💎Legend';
};

// BOT STATS
const getBotStats = () => {
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    return {
        uptime: `${days}d ${hours}h ${minutes}m`,
        memory: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1),
        usersTotal: 1247
    };
};

// DAILY TIPS (Short)
const dailyTips = [
    "⚡.ping speed",
    "🎨.imagine picha AI",
    "🤖.gpt ongea na AI",
    "🎵.play audio YT",
    "🛡️.antilink zuia link",
    "👥.tagall wataje wote",
    "📥.tiktok pakua video"
];

const menuCommand = async (sock, chatId, m, userDb = null) => {
    try {
        const now = moment().tz('Africa/Dar_es_Salaam');
        const greet = now.hour() < 12 ? '☀️' : now.hour() < 18 ? '🌤️' : '🌙';

        const userCommandsTotal = userDb?.commandsCount || 42;
        const userRank = getUserRank(userCommandsTotal);
        const botStats = getBotStats();
        const dailyTip = dailyTips[Math.floor(Math.random() * dailyTips.length)];

        // Category icons
        const categoryIcons = {
            'GENERAL': '🏠', 'GROUP': '👥', 'MODERATION': '🛡️',
            'MEDIA': '🎨', 'AUDIO/VIDEO': '🎵', 'FUN': '🎮',
            'AUTOMATION': '🤖', 'AI/BOT': '🧠', 'EFFECTS': '✨'
        };

        // COMPACT CATEGORIES (Short descriptions)
        const MENU_CATEGORIES = [
            {
                title: 'GENERAL',
                items: [
                    { command: '.help', description: 'Menu', example: '.help' },
                    { command: '.ping', description: 'Speed', example: '.ping' },
                    { command: '.alive', description: 'Status', example: '.alive' },
                    { command: '.owner', description: 'Owner', example: '.owner' },
                    { command: '.repo', description: 'Repo', example: '.repo' },
                    { command: '.stats', description: 'Stats', example: '.stats' }
                ]
            },
            {
                title: 'GROUP',
                items: [
                    { command: '.add', description: 'Add user', example: '.add 2557xxx' },
                    { command: '.kick', description: 'Kick', example: '.kick @user' },
                    { command: '.promote', description: 'Make admin', example: '.promote @user' },
                    { command: '.demote', description: 'Remove admin', example: '.demote @user' },
                    { command: '.tagall', description: 'Mention all', example: '.tagall hi' },
                    { command: '.hidetag', description: 'Hidden tag', example: '.hidetag msg' },
                    { command: '.setgname', description: 'Set name', example: '.setgname Name' }
                ]
            },
            {
                title: 'MODERATION',
                items: [
                    { command: '.ban', description: 'Ban', example: '.ban @user' },
                    { command: '.unban', description: 'Unban', example: '.unban @user' },
                    { command: '.antilink', description: 'Block links', example: '.antilink on' },
                    { command: '.antibadword', description: 'Block bad words', example: '.antibad on' },
                    { command: '.anticall', description: 'Block calls', example: '.anticall on' },
                    { command: '.warn', description: 'Warn', example: '.warn @user' }
                ]
            },
            {
                title: 'MEDIA',
                items: [
                    { command: '.sticker', description: 'To sticker', example: '.sticker' },
                    { command: '.fb', description: 'FB down', example: '.fb url' },
                    { command: '.ig', description: 'IG down', example: '.ig url' },
                    { command: '.tt', description: 'TT down', example: '.tt url' },
                    { command: '.ytmp3', description: 'YT to MP3', example: '.ytmp3 url' },
                    { command: '.ytmp4', description: 'YT to MP4', example: '.ytmp4 url' }
                ]
            },
            {
                title: 'AUDIO/VIDEO',
                items: [
                    { command: '.play', description: 'Audio', example: '.play song' },
                    { command: '.video', description: 'Video', example: '.video song' },
                    { command: '.music', description: 'Music', example: '.music artist' }
                ]
            },
            {
                title: 'FUN',
                items: [
                    { command: '.compliment', description: 'Compliment', example: '.comp @user' },
                    { command: '.lyrics', description: 'Lyrics', example: '.lyrics song' },
                    { command: '.weather', description: 'Weather', example: '.weather city' },
                    { command: '.truth', description: 'Truth', example: '.truth' },
                    { command: '.dare', description: 'Dare', example: '.dare' }
                ]
            },
            {
                title: 'AUTOMATION',
                items: [
                    { command: '.autostatus', description: 'Auto status', example: '.autostatus on' },
                    { command: '.autotyping', description: 'Auto type', example: '.autotyping on' },
                    { command: '.autoread', description: 'Auto read', example: '.autoread on' },
                    { command: '.areact', description: 'Auto react', example: '.areact on' }
                ]
            },
            {
                title: 'AI/BOT',
                items: [
                    { command: '.gpt', description: 'ChatGPT', example: '.gpt hi' },
                    { command: '.imagine', description: 'AI image', example: '.imagine cat' },
                    { command: '.gemini', description: 'Gemini', example: '.gemini hi' },
                    { command: '.aivoice', description: 'AI voice', example: '.aivoice hi' }
                ]
            },
            {
                title: 'EFFECTS',
                items: [
                    { command: '.glitch', description: 'Glitch', example: '.glitch text' },
                    { command: '.neon', description: 'Neon', example: '.neon text' },
                    { command: '.fire', description: 'Fire', example: '.fire text' },
                    { command: '.matrix', description: 'Matrix', example: '.matrix text' }
                ]
            }
        ];

        // Build sections
        const sections = MENU_CATEGORIES.map(category => ({
            title: `${categoryIcons[category.title]} ${category.title} (${category.items.length})`,
            rows: category.items.map(item => ({
                header: item.command,
                title: item.description,
                description: `💡 ${item.example}`,
                id: item.command.toLowerCase()
            }))
        }));

        // ============ NARROW MENU TEXT (No wide lines) ============
        const helpText = `
*✨MICKEY GLITCH V4.0*

👤 ${m.pushName || 'User'} (${userRank})
📊 ${userCommandsTotal}cmds ⏱️${botStats.uptime}
💾 ${botStats.memory}MB 👥${botStats.usersTotal}

💡 ${dailyTip}

🔗 Mickey-trony | 👨‍💻@Mickeymozy

📋 *TAP BUTTON BELOW*
`;

        // Send message
        await sendInteractiveMessage(sock, chatId, {
            text: helpText,
            contextInfo: {
                externalAdReply: {
                    title: "MICKEY GLITCH",
                    body: "Ultra Bot",
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
                        title: '📋 MENU',
                        sections: sections
                    })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '⚡PING',
                        id: '.ping'
                    })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📊STATS',
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