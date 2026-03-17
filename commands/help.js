const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Function to get all registered commands from main.js
function getRegisteredCommands() {
    try {
        const mainPath = path.join(__dirname, '../main.js');
        const mainContent = fs.readFileSync(mainPath, 'utf8');

        // Commands that show "not available" messages - exclude from help
        const excludedCommands = new Set([
            '.horny', '.circle', '.lgbt', '.lolice', '.tonikawa', '.namecard',
            '.oogway', '.tweet', '.ytcomment', '.comrade', '.gay', '.glass',
            '.jail', '.passed', '.triggered', '.heart', '.hijab',
            '.animu', '.nom', '.poke', '.cry', '.kiss', '.pat', '.hug',
            '.wink', '.facepalm', '.face-palm', '.animuquote', '.quote', '.loli'
        ]);

        const commands = new Set();

        // Regex to match all case statements
        const caseRegex = /case\s+([^\n:]+):/g;
        let match;

        while ((match = caseRegex.exec(mainContent)) !== null) {
            let caseLine = match[1];

            // Split multiple conditions joined by || or &&
            caseLine.split(/\|\||&&/).forEach(part => {
                // Clean up quotes and whitespace
                const cmdMatch = part.match(/['"`](.*?)['"`]/);
                if (cmdMatch && !excludedCommands.has(cmdMatch[1])) {
                    commands.add(cmdMatch[1].trim());
                }
            });
        }

        return Array.from(commands).sort();
    } catch (error) {
        console.error('Error reading registered commands:', error);
        return [];
    }
}

// Function to categorize commands
function categorizeCommands(commands) {
    const categories = {
        '🎵 Media & Entertainment': [],
        '👥 Group Management': [],
        '🔧 Utilities': [],
        '🎮 Fun & Games': [],
        '🤖 AI & Chat': [],
        '⚙️ Settings & Admin': [],
        '📊 Information': [],
        '🔒 Security': [],
        '📱 Social': [],
        '🎨 Creative': []
    };

    const categoryMap = {
        // Media & Entertainment
        '.play': '🎵 Media & Entertainment',
        '.songid': '🎵 Media & Entertainment',
        '.shazam': '🎵 Media & Entertainment',
        '.music': '🎵 Media & Entertainment',
        '.mp3': '🎵 Media & Entertainment',
        '.video': '🎵 Media & Entertainment',
        '.ytmp4': '🎵 Media & Entertainment',
        '.tiktok': '🎵 Media & Entertainment',
        '.tt': '🎵 Media & Entertainment',
        '.lyrics': '🎵 Media & Entertainment',
        '.sticker': '🎵 Media & Entertainment',
        '.s': '🎵 Media & Entertainment',
        '.take': '🎵 Media & Entertainment',
        '.steal': '🎵 Media & Entertainment',
        '.tg': '🎵 Media & Entertainment',
        '.stickertelegram': '🎵 Media & Entertainment',
        '.tgsticker': '🎵 Media & Entertainment',
        '.telesticker': '🎵 Media & Entertainment',
        '.url': '🎵 Media & Entertainment',
        '.tourl': '🎵 Media & Entertainment',
        '.facebook': '🎵 Media & Entertainment',
        '.fb': '🎵 Media & Entertainment',
        '.instagram': '🎵 Media & Entertainment',
        '.igs': '🎵 Media & Entertainment',

        // Group Management
        '.tagall': '👥 Group Management',
        '.tagnotadmin': '👥 Group Management',
        '.hidetag': '👥 Group Management',
        '.tag': '👥 Group Management',
        '.kick': '👥 Group Management',
        '.ban': '👥 Group Management',
        '.unban': '👥 Group Management',
        '.promote': '👥 Group Management',
        '.demote': '👥 Group Management',
        '.mute': '👥 Group Management',
        '.unmute': '👥 Group Management',
        '.warn': '👥 Group Management',
        '.warnings': '👥 Group Management',
        '.staff': '👥 Group Management',
        '.admins': '👥 Group Management',
        '.listadmin': '👥 Group Management',
        '.resetlink': '👥 Group Management',
        '.revoke': '👥 Group Management',
        '.anularlink': '👥 Group Management',
        '.setgdesc': '👥 Group Management',
        '.setgname': '👥 Group Management',
        '.setgpp': '👥 Group Management',

        // Utilities
        '.ping': '🔧 Utilities',
        '.alive': '🔧 Utilities',
        '.status': '🔧 Utilities',
        '.connection': '🔧 Utilities',
        '.help': '🔧 Utilities',
        '.menu': '🔧 Utilities',
        '.bot': '🔧 Utilities',
        '.list': '🔧 Utilities',
        '.cmd': '🔧 Utilities',
        '.commands': '🔧 Utilities',
        '.delete': '🔧 Utilities',
        '.del': '🔧 Utilities',
        '.clear': '🔧 Utilities',
        '.cleartmp': '🔧 Utilities',
        '.clearsession': '🔧 Utilities',
        '.clearsesi': '🔧 Utilities',
        '.topmembers': '🔧 Utilities',
        '.ghost': '🔧 Utilities',
        '.report': '🔧 Utilities',
        '.vv': '🔧 Utilities',
        '.viewonce': '🔧 Utilities',
        '.add': '🔧 Utilities',

        // Fun & Games
        '.compliment': '🎮 Fun & Games',
        '.character': '🎮 Fun & Games',
        '.wasted': '🎮 Fun & Games',
        '.emojimix': '🎮 Fun & Games',
        '.emix': '🎮 Fun & Games',
        '.blur': '🎮 Fun & Games',
        '.img-blur': '🎮 Fun & Games',

        // AI & Chat
        '.gpt': '🤖 AI & Chat',
        '.gemini': '🤖 AI & Chat',
        '.ai': '🤖 AI & Chat',
        '.chatbot': '🤖 AI & Chat',
        '.tts': '🤖 AI & Chat',
        '.translate': '🤖 AI & Chat',
        '.trt': '🤖 AI & Chat',

        // Settings & Admin
        '.mode': '⚙️ Settings & Admin',
        '.settings': '⚙️ Settings & Admin',
        '.autostatus': '⚙️ Settings & Admin',
        '.statusforward': '⚙️ Settings & Admin',
        '.autotyping': '⚙️ Settings & Admin',
        '.autoread': '⚙️ Settings & Admin',
        '.autobio': '⚙️ Settings & Admin',
        '.pmblocker': '⚙️ Settings & Admin',
        '.pin': '⚙️ Settings & Admin',
        '.owner': '⚙️ Settings & Admin',
        '.sudo': '⚙️ Settings & Admin',

        // Information
        '.weather': '📊 Information',
        '.halotel': '📊 Information',

        // Security
        '.antilink': '🔒 Security',
        '.antitag': '🔒 Security',
        '.antibadword': '🔒 Security',
        '.antidelete': '🔒 Security',
        '.anticall': '🔒 Security',
        '.antistatusmention': '🔒 Security',
        '.astatus': '🔒 Security',
        '.mention': '🔒 Security',
        '.gmention': '🔒 Security',
        '.setmention': '🔒 Security',

        // Creative
        '.metallic': '🎨 Creative',
        '.ice': '🎨 Creative',
        '.snow': '🎨 Creative',
        '.impressive': '🎨 Creative',
        '.matrix': '🎨 Creative',
        '.light': '🎨 Creative',
        '.neon': '🎨 Creative',
        '.devil': '🎨 Creative',
        '.purple': '🎨 Creative',
        '.thunder': '🎨 Creative',
        '.leaves': '🎨 Creative',
        '.1917': '🎨 Creative',
        '.arena': '🎨 Creative',
        '.hacker': '🎨 Creative',
        '.sand': '🎨 Creative',
        '.blackpink': '🎨 Creative',
        '.glitch': '🎨 Creative',
        '.fire': '🎨 Creative',
        '.textmaker': '🎨 Creative'
    };

    commands.forEach(cmd => {
        const category = categoryMap[cmd] || '🔧 Utilities';
        categories[category].push(cmd);
    });

    // Remove empty categories
    Object.keys(categories).forEach(key => {
        if (categories[key].length === 0) {
            delete categories[key];
        }
    });

    return categories;
}

const aliveCommand = async (conn, chatId, msg) => {
    try {
        const senderName = msg.pushName || 'User';
        // Get commands
        const registeredCommands = getRegisteredCommands();
        const categorizedCommands = categorizeCommands(registeredCommands);
        const totalCommands = registeredCommands.length;

        // Build lite command list
        let commandsList = '';
        Object.entries(categorizedCommands).forEach(([categoryName, commands]) => {
            commandsList += `\n${categoryName}:\n`;
            commandsList += commands.map(cmd => `  • ${cmd}`).join('  ');
            commandsList += '\n';
        });

        // New short intro
        const intro = `🤖 *Mickey Lite Bot* 🤖\nHello, ${senderName}!\nType any command below to get started.`;

        // Compose lite message
        const finalMessage = `${intro}\n${commandsList}\nTotal: ${totalCommands} cmds | Status: Active`;

        await conn.sendMessage(chatId, {
            text: finalMessage,
            contextInfo: {
                isForwarded: true,
                forwardingScore: 999,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363398106360290@newsletter',
                    newsletterName: '🅼🅸🅲🅺🅴𝚈',
                    serverMessageId: 101
                },
                externalAdReply: {
                    title: "Mickey Lite Help",
                    body: `Total: ${totalCommands} cmds | Fast & Lite`,
                    mediaType: 1,
                    renderLargerThumbnail: false,
                    thumbnailUrl: 'https://water-billing-292n.onrender.com/1761205727440.png',
                    sourceUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26'
                }
            }
        }, { quoted: msg });
    } catch (e) {
        console.error(e);
        await conn.sendMessage(chatId, { text: "Error loading commands..." });
    }
};

aliveCommand.getRegisteredCommands = getRegisteredCommands;
aliveCommand.getCategories = () => categorizeCommands(getRegisteredCommands());

module.exports = aliveCommand;