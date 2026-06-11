const moment = require('moment-timezone');
const { sendInteractiveMessage } = require('gifted-btns');

/**
 * @project: MICKEY GLITCH V3.0.5
 * @author: Quantum Base Developer (TZ)
 * @description: Fast & Clean Menu - Minimalist Design
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
    'MEDIA': '🎨', 'AUDIO/VIDEO': '🎵', 'FUN': '🎮',
    'AUTOMATION': '🤖', 'AI/BOT': '🧠', 'EFFECTS': '✨'
};

// Menu categories
const MENU = [
    {
        title: 'GENERAL',
        items: [
            { cmd: '.help', desc: 'Main menu', eg: '.help' },
            { cmd: '.ping', desc: 'Bot speed test', eg: '.ping' },
            { cmd: '.alive', desc: 'Bot status', eg: '.alive' },
            { cmd: '.owner', desc: 'Owner info', eg: '.owner' },
            { cmd: '.repo', desc: 'Source code', eg: '.repo' },
            { cmd: '.stats', desc: 'Bot statistics', eg: '.stats' }
        ]
    },
    {
        title: 'GROUP',
        items: [
            { cmd: '.add', desc: 'Add participant', eg: '.add 2557xxx' },
            { cmd: '.kick', desc: 'Remove participant', eg: '.kick @user' },
            { cmd: '.promote', desc: 'Make admin', eg: '.promote @user' },
            { cmd: '.demote', desc: 'Remove admin', eg: '.demote @user' },
            { cmd: '.tagall', desc: 'Mention everyone', eg: '.tagall message' },
            { cmd: '.hidetag', desc: 'Hidden mention', eg: '.hidetag text' },
            { cmd: '.setgname', desc: 'Change group name', eg: '.setgname Name' }
        ]
    },
    {
        title: 'MODERATION',
        items: [
            { cmd: '.ban', desc: 'Ban user', eg: '.ban @user' },
            { cmd: '.unban', desc: 'Unban user', eg: '.unban @user' },
            { cmd: '.antilink', desc: 'Block group links', eg: '.antilink on' },
            { cmd: '.antibadword', desc: 'Block bad words', eg: '.antibad on' },
            { cmd: '.anticall', desc: 'Block calls', eg: '.anticall on' },
            { cmd: '.warn', desc: 'Warn user', eg: '.warn @user' }
        ]
    },
    {
        title: 'MEDIA',
        items: [
            { cmd: '.sticker', desc: 'Image to sticker', eg: '.sticker' },
            { cmd: '.fb', desc: 'Facebook downloader', eg: '.fb url' },
            { cmd: '.ig', desc: 'Instagram downloader', eg: '.ig url' },
            { cmd: '.tt', desc: 'TikTok downloader', eg: '.tt url' },
            { cmd: '.ytmp3', desc: 'YouTube to audio', eg: '.ytmp3 url' },
            { cmd: '.ytmp4', desc: 'YouTube to video', eg: '.ytmp4 url' }
        ]
    },
    {
        title: 'AUDIO/VIDEO',
        items: [
            { cmd: '.play', desc: 'Play audio', eg: '.play song name' },
            { cmd: '.video', desc: 'Play video', eg: '.video song name' },
            { cmd: '.music', desc: 'Music search', eg: '.music artist' }
        ]
    },
    {
        title: 'FUN',
        items: [
            { cmd: '.compliment', desc: 'Send compliment', eg: '.comp @user' },
            { cmd: '.lyrics', desc: 'Song lyrics', eg: '.lyrics song' },
            { cmd: '.weather', desc: 'Weather info', eg: '.weather city' },
            { cmd: '.truth', desc: 'Truth question', eg: '.truth' },
            { cmd: '.dare', desc: 'Dare challenge', eg: '.dare' }
        ]
    },
    {
        title: 'AUTOMATION',
        items: [
            { cmd: '.autostatus', desc: 'Auto status view', eg: '.autostatus on' },
            { cmd: '.autotyping', desc: 'Auto typing', eg: '.autotyping on' },
            { cmd: '.autorecording', desc: 'Auto recording', eg: '.autorecording on' },
            { cmd: '.autoread', desc: 'Auto read messages', eg: '.autoread on' },
            { cmd: '.areact', desc: 'Auto react', eg: '.areact on' }
        ]
    },
    {
        title: 'AI/BOT',
        items: [
            { cmd: '.gpt', desc: 'ChatGPT AI', eg: '.gpt ask me' },
            { cmd: '.imagine', desc: 'AI image gen', eg: '.imagine cat' },
            { cmd: '.gemini', desc: 'Google Gemini', eg: '.gemini hi' },
            { cmd: '.aivoice', desc: 'AI text to speech', eg: '.aivoice hi' }
        ]
    },
    {
        title: 'EFFECTS',
        items: [
            { cmd: '.glitch', desc: 'Glitch text', eg: '.glitch text' },
            { cmd: '.neon', desc: 'Neon text', eg: '.neon text' },
            { cmd: '.fire', desc: 'Fire text', eg: '.fire text' },
            { cmd: '.matrix', desc: 'Matrix text', eg: '.matrix text' }
        ]
    }
];

// Build interactive sections
const buildSections = () => {
    return MENU.map(cat => ({
        title: `${icons[cat.title]} ${cat.title} ━━━ (${cat.items.length})`,
        rows: cat.items.map(item => ({
            header: item.cmd,
            title: item.desc,
            description: `📌 ${item.eg}`,
            id: item.cmd.toLowerCase()
        }))
    }));
};

// Get dynamic greeting
const getGreeting = (hour) => {
    if (hour < 12) return { text: 'Asubuhi', emoji: '☀️' };
    if (hour < 18) return { text: 'Mchana', emoji: '🌤️' };
    return { text: 'Jioni', emoji: '🌙' };
};

// Get random quotes
const getMotivationalQuote = () => {
    const quotes = [
        '✨ "Code is poetry in motion"',
        '⚡ "Stay hungry, stay foolish"',
        '🚀 "Dream it, code it"',
        '💎 "Innovation distinguishes leaders"',
        '🌟 "Make it work, make it right"'
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
};

// Main menu function
const menuCommand = async (sock, chatId, m, userDb = null) => {
    try {
        const now = moment().tz('Africa/Dar_es_Salaam');
        const hour = now.hour();
        const greeting = getGreeting(hour);

        // User data
        const userName = m.pushName || 'User';
        const userCmds = userDb?.commandsCount || 0;
        const userRank = getRank(userCmds);
        const stats = getStats();
        const quote = getMotivationalQuote();

        // Format date & time
        const date = now.format('DD MMMM YYYY');
        const time = now.format('HH:mm:ss');
        const day = now.format('dddd');

        // Clean menu text - Professional design
        const menuText = `╔════════════════════════════════════════╗
║       ✨ *𝐌𝐈𝐂𝐊𝐄𝐘 𝐆𝐋𝐈𝐓𝐂𝐇* ✨       ║
║            ⎯  𝐕𝟑.𝟎.𝟓  ⎯             ║
╚════════════════════════════════════════╝

┌─────────────────────────────────────────┐
│  👋 *${greeting.text} ${greeting.emoji}*, ${userName}!  │
│  🏆 *Rank:* ${userRank}                  │
│  📊 *Commands:* ${userCmds.toLocaleString()}              │
├─────────────────────────────────────────┤
│  📅 *Date:* ${day}, ${date}      │
│  ⏰ *Time:* ${time} EAT               │
│  ⚡ *Uptime:* ${stats.uptime}               │
│  💾 *Memory:* ${stats.memory}MB                │
│  👥 *Users:* ${stats.users}                  │
├─────────────────────────────────────────┤
│  💡 *"${quote}"* │
└─────────────────────────────────────────┘

⫸ *Quantum Base Developer (TZ)* ⫷

👇 *𝐓𝐀𝐏 𝐁𝐄𝐋𝐎𝐖 𝐓𝐎 𝐎𝐏𝐄𝐍 𝐌𝐄𝐍𝐔* 👇`;

        // Send interactive message with SINGLE BUTTON only
        await sendInteractiveMessage(sock, chatId, {
            text: menuText,
            contextInfo: {
                externalAdReply: {
                    title: "🌟 MICKEY GLITCH • PREMIUM BOT",
                    body: "Powered by Quantum Code | Fast & Reliable",
                    thumbnailUrl: 'https://water-billing-292n.onrender.com/1761205727440.png',
                    sourceUrl: 'https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610',
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    showAdAttribution: true
                }
            },
            interactiveButtons: [
                {
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                        title: '📋 𝐎𝐏𝐄𝐍 𝐌𝐄𝐍𝐔',
                        sections: buildSections()
                    })
                }
            ]
        });

    } catch (e) {
        console.error('Menu Error:', e);
        await sock.sendMessage(chatId, { 
            text: '❌ *Hitilafu!* Menu haikufunguka. Jaribu tena kwa .help'
        }, { quoted: m });
    }
};

module.exports = menuCommand;