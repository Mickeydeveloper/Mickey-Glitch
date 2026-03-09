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
        
        // Extract command cases from the switch statement
        const commandRegex = /case\s+userMessage\.startsWith\('([^']+)'\)/g;
        const commands = new Set();
        let match;
        
        while ((match = commandRegex.exec(mainContent)) !== null) {
            const cmd = match[1];
            // Skip if it's a variable or complex condition or excluded
            if (!cmd.includes('$') && !cmd.includes('||') && !cmd.includes('&&') && !excludedCommands.has(cmd)) {
                commands.add(cmd);
            }
        }
        
        // Also extract exact matches
        const exactRegex = /case\s+userMessage\s*===\s*'([^']+)'/g;
        while ((match = exactRegex.exec(mainContent)) !== null) {
            const cmd = match[1];
            if (!excludedCommands.has(cmd)) {
                commands.add(match[1]);
            }
        }
        
        // Extract complex conditions (like .play || .mp3 || .song)
        const complexRegex = /case\s+userMessage\.startsWith\('([^']+)'\)\s*\|\|\s*userMessage\.startsWith\('([^']+)'\)/g;
        while ((match = complexRegex.exec(mainContent)) !== null) {
            const cmd1 = match[1];
            const cmd2 = match[2];
            if (!excludedCommands.has(cmd1)) commands.add(cmd1);
            if (!excludedCommands.has(cmd2)) commands.add(cmd2);
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
        const prefix = '.'; // Badilisha kama unatumia prefix tofauti
        
        // 1. Piga hesabu ya RAM
        const totalRAM = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);
        const freeRAM = (os.freemem() / (1024 * 1024 * 1024)).toFixed(2);
        const usedRAM = (totalRAM - freeRAM).toFixed(2);

        // 2. Pata Uptime
        const uptimeSeconds = process.uptime();
        const hours = Math.floor(uptimeSeconds / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = Math.floor(uptimeSeconds % 60);
        const uptimeString = `${hours}h ${minutes}m ${seconds}s`;

        // 3. Get registered commands dynamically
        const registeredCommands = getRegisteredCommands();
        const categorizedCommands = categorizeCommands(registeredCommands);
        const totalCommands = registeredCommands.length;

        // 4. Build categorized command list with vertical format and bold styling
        let commandsList = "";
        
        Object.entries(categorizedCommands).forEach(([categoryName, commands]) => {
            // Extract emoji and text from category name
            const categoryEmoji = categoryName.split(' ')[0];
            const categoryText = categoryName.substring(categoryName.indexOf(' ') + 1);
            
            // Modern category header with better styling
            commandsList += `\n┌─ ${categoryEmoji} *${categoryText}* (${commands.length}) ─┐\n`;
            
            // Display each command on a new line with bold formatting
            commands.forEach((cmd) => {
                commandsList += `┃ ◈ *${cmd}*\n`;
            });
            
            commandsList += `└${'─'.repeat(35)}┘\n`;
        });

        // 5. Build modern message layout with improved styling
        const finalMessage = `╭─ ${'═'.repeat(16)} *𝐌𝐈𝐂𝐊𝐄𝐘 𝐆𝐋𝐈𝐓𝐂𝐇 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒* ${'═'.repeat(16)} ─╮
│
├─ ◈ *𝐒𝐄𝐍𝐃𝐄𝐑 𝐈𝐍𝐅𝐎*
│ ◇ 👤 *User:* \`${senderName}\`
│ ⏲️ *Uptime:* \`${uptimeString}\`
│ 🧠 *RAM:* \`${usedRAM}GB / ${totalRAM}GB\`
│ 🛡️ *Mode:* \`Public\`
│
├─ ◈ *𝐀𝐕𝐀𝐈𝐋𝐀𝐁𝐋𝐄 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒*
│
${commandsList}
├─ ◈ *𝐒𝐓𝐀𝐓𝐒*
│ 📊 *Total:* \`${totalCommands}\` Commands
│ 🏷️ *Categories:* \`${Object.keys(categorizedCommands).length}\`
│ ✅ *Status:* \`Active & Stable\`
│
╰─ 🔥 *Powered by Mickey Glitch V3* 🔥`;

        // 6. Send the message with improved formatting
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
                    title: "🎯 𝙼𝙸𝙲𝙺𝙴𝚈 𝙶𝙻𝙸𝚃𝙲𝙷 🎯",
                    body: `📊 ${totalCommands} Commands • ${Object.keys(categorizedCommands).length} Categories • ⚡ Active`,
                    mediaType: 1,
                    renderLargerThumbnail: true,
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

// Export functions for use by other modules
aliveCommand.getRegisteredCommands = getRegisteredCommands;
aliveCommand.getCategories = () => categorizeCommands(getRegisteredCommands());

module.exports = aliveCommand;
