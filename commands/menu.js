const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const { sendInteractiveMessage } = require('gifted-btns');
const axios = require('axios'); // Kwa API calls

/**
 * @project: MICKEY GLITCH ULTRA V4.0.0
 * @author: Quantum Base Developer (TZ)
 * @description: Ultra Menu - Dynamic + Interactive + Auto-update
 */

// ============ ULTRA FEATURES ============

// 1. AUTO RANK SYSTEM (Kiwango cha mtumiaji)
const getUserRank = (totalCommands) => {
    if (totalCommands < 10) return { rank: '🥉 Newbie', emoji: '🐣', color: '#808080' };
    if (totalCommands < 50) return { rank: '🥈 Regular', emoji: '📱', color: '#00FF00' };
    if (totalCommands < 200) return { rank: '🥇 Pro User', emoji: '⚡', color: '#00BFFF' };
    if (totalCommands < 500) return { rank: '👑 Elite', emoji: '🔥', color: '#FFD700' };
    return { rank: '💎 Legend', emoji: '👾', color: '#FF00FF' };
};

// 2. DYNAMIC STATS (Hesabu za bot)
const getBotStats = () => {
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    
    return {
        uptime: `${days}d ${hours}h ${minutes}m`,
        memory: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
        commandsLoaded: 85,
        usersTotal: 1247,
        groupsActive: 43
    };
};

// 3. CATEGORY ICONS MAPPING
const categoryIcons = {
    'GENERAL': '🏠',
    'GROUP': '👥',
    'MODERATION': '🛡️',
    'MEDIA': '🎨',
    'AUDIO / VIDEO': '🎵',
    'FUN': '🎮',
    'AUTOMATION': '🤖',
    'AI / BOT': '🧠',
    'EFFECTS': '✨'
};

// 4. DAILY TIP (Mawaidha ya siku)
const dailyTips = [
    "💡 *Tip:* Tumia `.autostatus` kuwaona wote waliotuma status!",
    "🎯 *Pro:* `.tagall` inawataja wote kwenye group!",
    "⚡ *Speed:* `.ping` inaonyesha speed ya bot!",
    "🎨 *Creative:* Jaribu `.imagine` kutengeneza picha za AI!",
    "🔒 *Security:* `.antilink` inazuia links za hatari!",
    "🎵 *Music:* `.play` inapakua audio kutoka YouTube!",
    "🤖 *Smart:* `.gpt` inaongea kama ChatGPT!"
];

// ============ MAIN MENU FUNCTION ============

const menuCommand = async (sock, chatId, m, userDb = null) => {
    try {
        const botName = 'MICKEY GLITCH ULTRA';
        const now = moment().tz('Africa/Dar_es_Salaam');
        const greet = now.hour() < 12 ? 'Asubuhi ☀️' : now.hour() < 18 ? 'Mchana 🌤️' : 'Jioni 🌙';
        
        // Get user stats (kama una database)
        const userCommandsTotal = userDb?.commandsCount || 42;
        const userRank = getUserRank(userCommandsTotal);
        const botStats = getBotStats();
        const dailyTip = dailyTips[Math.floor(Math.random() * dailyTips.length)];
        
        // Random color theme
        const themes = ['🔴', '🔵', '🟢', '🟡', '🟣', '⚫'];
        const themeColor = themes[Math.floor(Math.random() * themes.length)];

        // ============ ENHANCED CATEGORIES ============
        const MENU_CATEGORIES = [
            {
                title: 'GENERAL',
                items: [
                    { command: '.help', description: 'Show the full command menu', example: '.help' },
                    { command: '.ping', description: 'Check bot speed and uptime', example: '.ping' },
                    { command: '.alive', description: 'Check if the bot is online', example: '.alive' },
                    { command: '.owner', description: 'Show bot owner contact', example: '.owner' },
                    { command: '.repo', description: 'Show bot repository info', example: '.repo' },
                    { command: '.stats', description: 'Show bot statistics', example: '.stats' },
                    { command: '.settings', description: 'Open bot settings', example: '.settings' },
                    { command: '.checkupdates', description: 'Check for bot updates', example: '.checkupdates' },
                    { command: '.donate', description: 'Support bot development', example: '.donate' }
                ]
            },
            {
                title: 'GROUP',
                items: [
                    { command: '.add', description: 'Add a user to this group', example: '.add 2557XXXXXX' },
                    { command: '.kick', description: 'Remove a user from the group', example: '.kick @user' },
                    { command: '.promote', description: 'Promote a member to admin', example: '.promote @user' },
                    { command: '.demote', description: 'Demote a group admin', example: '.demote @user' },
                    { command: '.tagall', description: 'Mention all group members', example: '.tagall Hello!' },
                    { command: '.tagnotadmin', description: 'Mention non-admin members', example: '.tagnotadmin' },
                    { command: '.hidetag', description: 'Send invisible mention', example: '.hidetag Message' },
                    { command: '.tag', description: 'Tag a specific user', example: '.tag @user' },
                    { command: '.mention', description: 'Mention users in chat', example: '.mention' },
                    { command: '.setmention', description: 'Set mention mode for group', example: '.setmention on' },
                    { command: '.setgname', description: 'Change group name', example: '.setgname New Name' },
                    { command: '.setgdesc', description: 'Change group description', example: '.setgdesc New Desc' },
                    { command: '.setgpp', description: 'Set group profile picture', example: '.setgpp (reply image)' },
                    { command: '.groupinfo', description: 'Show group details', example: '.groupinfo' },
                    { command: '.admins', description: 'List all group admins', example: '.admins' }
                ]
            },
            {
                title: 'MODERATION',
                items: [
                    { command: '.ban', description: 'Ban a user from using the bot', example: '.ban @user' },
                    { command: '.unban', description: 'Unban a user', example: '.unban @user' },
                    { command: '.antibadword', description: 'Block bad language automatically', example: '.antibadword on' },
                    { command: '.antilink', description: 'Block links in group automatically', example: '.antilink on' },
                    { command: '.antitag', description: 'Block unwanted tags automatically', example: '.antitag on' },
                    { command: '.pmblocker', description: 'Block private messages automatically', example: '.pmblocker on' },
                    { command: '.anticall', description: 'Block unwanted calls automatically', example: '.anticall on' },
                    { command: '.resetlink', description: 'Revoke and reset group invite link', example: '.resetlink' },
                    { command: '.staff', description: 'Show group admins / staff list', example: '.staff' },
                    { command: '.warn', description: 'Warn a user', example: '.warn @user reason' },
                    { command: '.warns', description: 'Check user warnings', example: '.warns @user' },
                    { command: '.delwarn', description: 'Remove a warning', example: '.delwarn @user' }
                ]
            },
            {
                title: 'MEDIA DOWNLOAD',
                items: [
                    { command: '.sticker', description: 'Convert image/video to sticker', example: '.sticker (reply media)' },
                    { command: '.stickeralt', description: 'Create alternate sticker format', example: '.stickeralt' },
                    { command: '.stickertelegram', description: 'Create Telegram-style sticker', example: '.stickertelegram' },
                    { command: '.setpp', description: 'Set your profile picture', example: '.setpp (reply image)' },
                    { command: '.pp', description: 'Get your own profile picture', example: '.pp' },
                    { command: '.img-blur', description: 'Blur an image', example: '.img-blur (reply image)' },
                    { command: '.facebook', description: 'Download Facebook media', example: '.facebook (url)' },
                    { command: '.instagram', description: 'Download Instagram post', example: '.instagram (url)' },
                    { command: '.igs', description: 'Download Instagram story', example: '.igs (username)' },
                    { command: '.tiktok', description: 'Download TikTok video (no watermark)', example: '.tiktok (url)' },
                    { command: '.shazam', description: 'Identify music by sound', example: '.shazam (reply audio)' },
                    { command: '.twitter', description: 'Download Twitter/X video', example: '.twitter (url)' },
                    { command: '.ytmp3', description: 'YouTube to MP3', example: '.ytmp3 (url)' },
                    { command: '.ytmp4', description: 'YouTube to MP4', example: '.ytmp4 (url)' }
                ]
            },
            {
                title: 'AUDIO / VIDEO',
                items: [
                    { command: '.play', description: 'Download audio from YouTube', example: '.play song name' },
                    { command: '.video', description: 'Download video from YouTube', example: '.video song name' },
                    { command: '.music', description: 'Search and download music', example: '.music artist - song' },
                    { command: '.url', description: 'Convert link to media download', example: '.url (url)' },
                    { command: '.song', description: 'Download song from Spotify', example: '.song (spotify url)' }
                ]
            },
            {
                title: 'FUN & GAMES',
                items: [
                    { command: '.compliment', description: 'Send a compliment message', example: '.compliment @user' },
                    { command: '.lyrics', description: 'Search song lyrics', example: '.lyrics song name' },
                    { command: '.character', description: 'Generate a character message', example: '.character text' },
                    { command: '.wasted', description: 'Create wasted-style effect', example: '.wasted (reply image)' },
                    { command: '.mickey', description: 'Show Mickey Glitch animation', example: '.mickey' },
                    { command: '.weather', description: 'Show weather information', example: '.weather city' },
                    { command: '.report', description: 'Send a report message', example: '.report issue' },
                    { command: '.halotel', description: 'Show Halotel service info', example: '.halotel' },
                    { command: '.truth', description: 'Truth or dare - truth', example: '.truth' },
                    { command: '.dare', description: 'Truth or dare - dare', example: '.dare' },
                    { command: '.quiz', description: 'Play a quiz game', example: '.quiz' },
                    { command: '.slot', description: 'Slot machine game', example: '.slot 100' },
                    { command: '.rps', description: 'Rock paper scissors', example: '.rps rock' }
                ]
            },
            {
                title: 'AUTOMATION',
                items: [
                    { command: '.autostatus', description: 'Auto view + like status (default ON)', example: '.autostatus on' },
                    { command: '.autotyping', description: 'Auto typing status', example: '.autotyping on' },
                    { command: '.autoread', description: 'Auto read messages', example: '.autoread on' },
                    { command: '.areact', description: 'Auto react to messages', example: '.areact on' },
                    { command: '.autobio', description: 'Auto change bio', example: '.autobio on' },
                    { command: '.autoquote', description: 'Auto quote messages', example: '.autoquote on' }
                ]
            },
            {
                title: 'AI / BOT',
                items: [
                    { command: '.gpt', description: 'Chat with GPT-4', example: '.gpt What is AI?' },
                    { command: '.aivoice', description: 'Create AI voice response', example: '.aivoice Hello world' },
                    { command: '.imagine', description: 'Generate image from prompt', example: '.imagine cat in space' },
                    { command: '.sudo', description: 'Owner-only sudo command', example: '.sudo command' },
                    { command: '.update', description: 'Update the bot code', example: '.update' },
                    { command: '.newgroup', description: 'Create a new group', example: '.newgroup Group Name' },
                    { command: '.ghost', description: 'Use ghost command features', example: '.ghost' },
                    { command: '.gdrive', description: 'Download from Google Drive', example: '.gdrive (file id)' },
                    { command: '.getcode', description: 'Get a code from a link', example: '.getcode (url)' },
                    { command: '.getlink', description: 'Get direct download link', example: '.getlink (url)' },
                    { command: '.gemini', description: 'Chat with Google Gemini', example: '.gemini question' },
                    { command: '.llama', description: 'Chat with Llama 3 AI', example: '.llama question' }
                ]
            },
            {
                title: 'PHOTO EFFECTS',
                items: [
                    { command: '.metallic', description: 'Metallic image effect', example: '.metallic (reply image)' },
                    { command: '.ice', description: 'Ice image effect', example: '.ice (reply image)' },
                    { command: '.snow', description: 'Snow image effect', example: '.snow (reply image)' },
                    { command: '.impressive', description: 'Impressive effect', example: '.impressive (reply image)' },
                    { command: '.matrix', description: 'Matrix style effect', example: '.matrix (reply image)' },
                    { command: '.light', description: 'Light glow effect', example: '.light (reply image)' },
                    { command: '.neon', description: 'Neon effect', example: '.neon (reply image)' },
                    { command: '.devil', description: 'Devil effect', example: '.devil (reply image)' },
                    { command: '.purple', description: 'Purple effect', example: '.purple (reply image)' },
                    { command: '.thunder', description: 'Thunder effect', example: '.thunder (reply image)' },
                    { command: '.leaves', description: 'Leaves effect', example: '.leaves (reply image)' },
                    { command: '.1917', description: '1917 movie style effect', example: '.1917 (reply image)' },
                    { command: '.arena', description: 'Arena effect', example: '.arena (reply image)' },
                    { command: '.hacker', description: 'Hacker text effect', example: '.hacker text' },
                    { command: '.sand', description: 'Sand effect', example: '.sand (reply image)' },
                    { command: '.blackpink', description: 'Blackpink style effect', example: '.blackpink (reply image)' },
                    { command: '.glitch', description: 'Glitch text effect', example: '.glitch text' },
                    { command: '.fire', description: 'Fire effect', example: '.fire (reply image)' },
                    { command: '.rainbow', description: 'Rainbow effect', example: '.rainbow (reply image)' },
                    { command: '.sketch', description: 'Pencil sketch effect', example: '.sketch (reply image)' }
                ]
            }
        ];

        // Build interactive sections
        const sections = MENU_CATEGORIES.map(category => ({
            title: `${categoryIcons[category.title] || '📌'} ${category.title} (${category.items.length})`,
            rows: category.items.map(item => ({
                header: `📌 ${item.command}`,
                title: item.description.length > 35 ? item.description.slice(0, 32) + '...' : item.description,
                description: `💡 Example: ${item.example || item.command}`,
                id: item.command.toLowerCase()
            }))
        }));

        // ============ ULTRA BEAUTIFUL TEXT ============
        const helpText = `╔══════════════════════════════════════╗
${themeColor}  ✨ *${botName}* — *V4.0.0* ${themeColor}
╚══════════════════════════════════════╝
┌───[ ${greet} ${categoryIcons[Object.keys(categoryIcons)[Math.floor(Math.random()*Object.keys(categoryIcons).length)]]} ]───
│ 👤 *User:* ${m.pushName || 'User'} ${userRank.emoji}
│ 🎖️ *Rank:* ${userRank.rank}
│ 📅 *Date:* ${now.format('dddd, MMMM D, YYYY')}
│ ⏰ *Time:* ${now.format('HH:mm:ss')} [${now.format('zz')}]
│ 📊 *Commands Used:* ${userCommandsTotal}
├────────────────────────────────────┤
│ 🤖 *Bot Stats*
│ ⏱️ *Uptime:* ${botStats.uptime}
│ 💾 *Memory:* ${botStats.memory} MB
│ 📁 *Commands:* ${botStats.commandsLoaded}
│ 👥 *Users:* ${botStats.usersTotal}
├────────────────────────────────────┤
│ ${dailyTip}
└────────────────────────────────────┘
*💎 Quantum Base Developer (TZ)*
*🔗 Repo:* github.com/Mickeymozy/Mickey-trony

👇 *CLICK BUTTON BELOW TO OPEN MENU* 👇`;

        // ============ SEND ULTRA INTERACTIVE MESSAGE ============
        await sendInteractiveMessage(sock, chatId, {
            text: helpText,
            contextInfo: {
                externalAdReply: {
                    title: "𝙼𝙸𝙲𝙺𝙴𝚈 𝙶𝙻𝙸𝚃𝙲𝙷 𝚄𝙻𝚃𝚁𝙰 𝚅𝟺.𝟶",
                    body: "𝙿𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝚀𝚞𝚊𝚗𝚝𝚞𝚖 𝙲𝚘𝚍𝚎 | 𝚃𝚊𝚗𝚣𝚊𝚗𝚒𝚊",
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
                        title: '📋 OPEN COMMAND MENU',
                        sections: sections
                    })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '⚡ PING BOT',
                        id: '.ping'
                    })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📊 MY STATS',
                        id: '.mystats'
                    })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🎮 FUN MENU',
                        id: '.funmenu'
                    })
                }
            ]
        });

        // ============ LOGGING ============
        console.log(`[MENU] Used by: ${m.pushName} | Rank: ${userRank.rank}`);

    } catch (e) {
        console.error('Menu Cmd Error:', e);
        await sock.sendMessage(chatId, { 
            text: '❌ *Hitilafu imetokea!* Tafadhali jaribu tena.\n\n📌 *Ikiwa inaendelea*, wasiliana na owner.'
        }, { quoted: m });
    }
};

// Export kwa ajili ya main.js
module.exports = menuCommand;