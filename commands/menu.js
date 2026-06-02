const moment = require('moment-timezone');
const { sendInteractiveMessage } = require('gifted-btns');

/**
 * @project: MICKEY GLITCH V3.0.5
 * @author: Quantum Base Developer (TZ)
 * @description: Fast & Clean Menu
 */

// Quick rank system
const getRank = (total) => {
    if (total < 10) return '🥉 Newbie';
    if (total < 50) return '🥈 Regular';
    if (total < 200) return '🥇 Pro';
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

// Menu categories (short & clean)
const MENU = [
    {
        title: 'GENERAL',
        items: [
            { cmd: '.help', desc: 'Menu', eg: '.help' },
            { cmd: '.ping', desc: 'Speed', eg: '.ping' },
            { cmd: '.alive', desc: 'Status', eg: '.alive' },
            { cmd: '.owner', desc: 'Owner', eg: '.owner' },
            { cmd: '.repo', desc: 'Source', eg: '.repo' },
            { cmd: '.stats', desc: 'Stats', eg: '.stats' }
        ]
    },
    {
        title: 'GROUP',
        items: [
            { cmd: '.add', desc: 'Add user', eg: '.add 2557xxx' },
            { cmd: '.kick', desc: 'Kick', eg: '.kick @user' },
            { cmd: '.promote', desc: 'Make admin', eg: '.promote @user' },
            { cmd: '.demote', desc: 'Remove admin', eg: '.demote @user' },
            { cmd: '.tagall', desc: 'Mention all', eg: '.tagall hi' },
            { cmd: '.hidetag', desc: 'Hidden tag', eg: '.hidetag msg' },
            { cmd: '.setgname', desc: 'Set name', eg: '.setgname Name' }
        ]
    },
    {
        title: 'MODERATION',
        items: [
            { cmd: '.ban', desc: 'Ban', eg: '.ban @user' },
            { cmd: '.unban', desc: 'Unban', eg: '.unban @user' },
            { cmd: '.antilink', desc: 'Block links', eg: '.antilink on' },
            { cmd: '.antibadword', desc: 'Block bad words', eg: '.antibad on' },
            { cmd: '.anticall', desc: 'Block calls', eg: '.anticall on' },
            { cmd: '.warn', desc: 'Warn', eg: '.warn @user' }
        ]
    },
    {
        title: 'MEDIA',
        items: [
            { cmd: '.sticker', desc: 'To sticker', eg: '.sticker' },
            { cmd: '.fb', desc: 'FB down', eg: '.fb url' },
            { cmd: '.ig', desc: 'IG down', eg: '.ig url' },
            { cmd: '.tt', desc: 'TT down', eg: '.tt url' },
            { cmd: '.ytmp3', desc: 'YT to MP3', eg: '.ytmp3 url' },
            { cmd: '.ytmp4', desc: 'YT to MP4', eg: '.ytmp4 url' }
        ]
    },
    {
        title: 'AUDIO/VIDEO',
        items: [
            { cmd: '.play', desc: 'Audio', eg: '.play song' },
            { cmd: '.video', desc: 'Video', eg: '.video song' },
            { cmd: '.music', desc: 'Music', eg: '.music artist' }
        ]
    },
    {
        title: 'FUN',
        items: [
            { cmd: '.compliment', desc: 'Compliment', eg: '.comp @user' },
            { cmd: '.lyrics', desc: 'Lyrics', eg: '.lyrics song' },
            { cmd: '.weather', desc: 'Weather', eg: '.weather city' },
            { cmd: '.truth', desc: 'Truth', eg: '.truth' },
            { cmd: '.dare', desc: 'Dare', eg: '.dare' }
        ]
    },
    {
        title: 'AUTOMATION',
        items: [
            { cmd: '.autostatus', desc: 'Auto status', eg: '.autostatus on' },
            { cmd: '.autotyping', desc: 'Auto type', eg: '.autotyping on' },
            { cmd: '.autorecording', desc: 'Auto record', eg: '.autorecording on' },
            { cmd: '.autoread', desc: 'Auto read', eg: '.autoread on' },
            { cmd: '.areact', desc: 'Auto react', eg: '.areact on' }
        ]
    },
    {
        title: 'AI/BOT',
        items: [
            { cmd: '.gpt', desc: 'ChatGPT', eg: '.gpt hi' },
            { cmd: '.imagine', desc: 'AI image', eg: '.imagine cat' },
            { cmd: '.gemini', desc: 'Gemini', eg: '.gemini hi' },
            { cmd: '.aivoice', desc: 'AI voice', eg: '.aivoice hi' }
        ]
    },
    {
        title: 'EFFECTS',
        items: [
            { cmd: '.glitch', desc: 'Glitch', eg: '.glitch text' },
            { cmd: '.neon', desc: 'Neon', eg: '.neon text' },
            { cmd: '.fire', desc: 'Fire', eg: '.fire text' },
            { cmd: '.matrix', desc: 'Matrix', eg: '.matrix text' }
        ]
    }
];

// Build interactive sections
const buildSections = () => {
    return MENU.map(cat => ({
        title: `${icons[cat.title]} ${cat.title} (${cat.items.length})`,
        rows: cat.items.map(item => ({
            header: item.cmd,
            title: item.desc,
            description: `💡 ${item.eg}`,
            id: item.cmd.toLowerCase()
        }))
    }));
};

// Main menu function
const menuCommand = async (sock, chatId, m, userDb = null) => {
    try {
        const now = moment().tz('Africa/Dar_es_Salaam');
        const hour = now.hour();
        
        // Greeting based on time
        let greet = '';
        if (hour < 12) greet = 'Asubuhi ☀️';
        else if (hour < 18) greet = 'Mchana 🌤️';
        else greet = 'Jioni 🌙';
        
        // User data
        const userName = m.pushName || 'User';
        const userCmds = userDb?.commandsCount || 0;
        const userRank = getRank(userCmds);
        const stats = getStats();
        
        // Format date
        const date = now.format('ddd, MMM DD');
        const time = now.format('HH:mm:ss');
        
        // ============ EXACT MATCH TO YOUR DESIGN ============
        const menuText = `╔════════════════════╗
  ✨ *MICKEY GLITCH* — *V3.0.5*
╚════════════════════╝
┌  👋 *Habari za ${greet}*
│  👤 *User:* ${userName} ${userRank}
│  📅 *Date:* ${date}
│  ⏰ *Time:* ${time}
└────────────────────┘
*Quantum Base Developer (TZ)*

👇 *Chagua kundi la amri hapo chini:*`;
        
        // Send interactive message
        await sendInteractiveMessage(sock, chatId, {
            text: menuText,
            contextInfo: {
                externalAdReply: {
                    title: "MICKEY GLITCH MENU",
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
                        title: '📋 FUNGUA MENU',
                        sections: buildSections()
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
            text: '❌ *Hitilafu!* Jaribu tena.'
        }, { quoted: m });
    }
};

module.exports = menuCommand;