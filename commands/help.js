const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Function to get all registered commands from main.js
function getRegisteredCommands() {
    try {
        const mainPath = path.join(__dirname, '../main.js');
        const mainContent = fs.readFileSync(mainPath, 'utf8');
        
        // Extract command cases from the switch statement
        const commandRegex = /case\s+userMessage\.startsWith\('([^']+)'\)/g;
        const commands = new Set();
        let match;
        
        while ((match = commandRegex.exec(mainContent)) !== null) {
            const cmd = match[1];
            // Skip if it's a variable or complex condition
            if (!cmd.includes('$') && !cmd.includes('||') && !cmd.includes('&&')) {
                commands.add(cmd);
            }
        }
        
        // Also extract exact matches
        const exactRegex = /case\s+userMessage\s*===\s*'([^']+)'/g;
        while ((match = exactRegex.exec(mainContent)) !== null) {
            commands.add(match[1]);
        }
        
        // Extract complex conditions (like .play || .mp3 || .song)
        const complexRegex = /case\s+userMessage\.startsWith\('([^']+)'\)\s*\|\|\s*userMessage\.startsWith\('([^']+)'\)/g;
        while ((match = complexRegex.exec(mainContent)) !== null) {
            commands.add(match[1]); // Add the first command
            commands.add(match[2]); // Add the second command
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
        
        // Fallback descriptions for commands without comments
        const fallbackDescriptions = {
            '.ping': 'Check bot speed',
            '.alive': 'Bot status check',
            '.help': 'Show this menu',
            '.menu': 'Command list',
            '.play': 'Play music',
            '.shazam': 'Identify songs',
            '.sticker': 'Make stickers',
            '.ban': 'Ban users',
            '.kick': 'Remove members',
            '.promote': 'Make admin',
            '.demote': 'Remove admin',
            '.tagall': 'Tag all members',
            '.mute': 'Mute group',
            '.unmute': 'Unmute group',
            '.clear': 'Delete messages',
            '.delete': 'Remove message',
            '.weather': 'Weather info',
            '.tts': 'Text to speech',
            '.translate': 'Translate text',
            '.ai': 'AI chat',
            '.gpt': 'ChatGPT',
            '.mode': 'Bot mode',
            '.owner': 'Owner info',
            '.status': 'System status',
            '.settings': 'Bot settings',
            '.report': 'Report issues',
            '.compliment': 'Give compliments',
            '.character': 'Random character',
            '.wasted': 'Wasted effect',
            '.blur': 'Blur image',
            '.url': 'Upload to URL',
            '.take': 'Edit stickers',
            '.lyrics': 'Song lyrics',
            '.facebook': 'FB downloader',
            '.instagram': 'IG downloader',
            '.tiktok': 'TT downloader',
            '.video': 'Download video',
            '.add': 'Add member',
            '.unban': 'Unban user',
            '.warnings': 'Check warnings',
            '.warn': 'Warn user',
            '.staff': 'Group admins',
            '.resetlink': 'Reset group link',
            '.topmembers': 'Active members',
            '.ghost': 'Ghost members',
            '.vv': 'View once media',
            '.viewonce': 'View once media',
            '.autostatus': 'Auto status',
            '.statusforward': 'Status forward',
            '.autotyping': 'Auto typing',
            '.autoread': 'Auto read',
            '.autobio': 'Auto bio',
            '.pmblocker': 'PM blocker',
            '.pin': 'PIN security',
            '.sudo': 'Sudo users',
            '.halotel': 'Halotel info',
            '.emojimix': 'Mix emojis',
            '.textmaker': 'Text effects',
            '.metallic': 'Metallic text',
            '.ice': 'Ice text',
            '.snow': 'Snow text',
            '.impressive': 'Impressive text',
            '.matrix': 'Matrix text',
            '.light': 'Light text',
            '.neon': 'Neon text',
            '.devil': 'Devil text',
            '.purple': 'Purple text',
            '.thunder': 'Thunder text',
            '.leaves': 'Leaves text',
            '.1917': '1917 effect',
            '.arena': 'Arena text',
            '.hacker': 'Hacker text',
            '.sand': 'Sand text',
            '.blackpink': 'Blackpink text',
            '.glitch': 'Glitch text',
            '.fire': 'Fire text',
            '.antilink': 'Anti-link',
            '.antitag': 'Anti-tag',
            '.antibadword': 'Anti-badword',
            '.antidelete': 'Anti-delete',
            '.anticall': 'Anti-call',
            '.antistatusmention': 'Anti-status mention',
            '.mention': 'Mention settings',
            '.gmention': 'Group mention',
            '.setmention': 'Set mention',
            '.chatbot': 'Group chatbot',
            '.welcome': 'Welcome message',
            '.goodbye': 'Goodbye message',
            '.antiforeign': 'Anti-foreign',
            '.antispam': 'Anti-spam',
            '.antivirus': 'Anti-virus',
            '.security': 'Security settings'
        };
        
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

        // 4. Build categorized command list with compact, modern design
        let commandsList = "";
        
        Object.entries(categorizedCommands).forEach(([categoryName, commands]) => {
            // Extract emoji and text from category name
            const categoryEmoji = categoryName.split(' ')[0];
            const categoryText = categoryName.substring(categoryName.indexOf(' ') + 1);
            
            // Modern category header
            commandsList += `\n┌── ${categoryEmoji} *${categoryText}* ── ${commands.length} ──┐\n`;
            
            // Create compact command grid (2-3 columns)
            const maxCommandsPerRow = 2;
            for (let i = 0; i < commands.length; i += maxCommandsPerRow) {
                const rowCommands = commands.slice(i, i + maxCommandsPerRow);
                let rowText = "│ ";
                
                rowCommands.forEach((cmd, idx) => {
                    // Get short description (truncate to 20 chars)
                    let description = fallbackDescriptions[cmd] || "No desc";
                    try {
                        const cmdFile = path.join(__dirname, `../commands/${cmd.slice(1)}.js`);
                        if (fs.existsSync(cmdFile)) {
                            const content = fs.readFileSync(cmdFile, 'utf8');
                            const descMatch = content.match(/\/\/\s*(.*)/);
                            if (descMatch && descMatch[1].length > 0) {
                                description = descMatch[1].trim();
                                // Truncate long descriptions
                                if (description.length > 20) {
                                    description = description.substring(0, 17) + "...";
                                }
                            }
                        }
                    } catch (e) {
                        // Keep fallback description
                    }
                    
                    // Format command with description
                    const cmdText = `${cmd} (${description})`;
                    rowText += cmdText;
                    
                    // Add spacing for next command if not last in row
                    if (idx < rowCommands.length - 1) {
                        const padding = Math.max(0, 18 - cmdText.length);
                        rowText += ' '.repeat(padding) + ' │ ';
                    }
                });
                
                // Fill remaining space if only one command in row
                if (rowCommands.length === 1) {
                    const currentLength = rowText.length - 3; // subtract "│ "
                    const targetLength = 35; // Total width for 2 columns
                    if (currentLength < targetLength) {
                        rowText += ' '.repeat(targetLength - currentLength) + ' │';
                    } else {
                        rowText += ' │';
                    }
                } else {
                    rowText += ' │';
                }
                
                commandsList += rowText + '\n';
            }
            
            commandsList += `└${'─'.repeat(40)}┘\n`;
        });

        // 5. Build compact, modern message layout
        const finalMessage = `┌─ ${'═'.repeat(20)} *𝙼𝙸𝙲𝙺𝙴𝚈 𝙶𝙻𝙸𝚃𝙲𝙷* ${'═'.repeat(20)} ─┐
│ 👑 Owner: Mickey${' '.repeat(25)} │
│ 👤 User: ${senderName}${' '.repeat(27 - senderName.length)} │
│ ⏲️ Uptime: ${uptimeString}${' '.repeat(25 - uptimeString.length)} │
│ 🛡️ Mode: Public${' '.repeat(26)} │
│ 🧩 Prefix: [ ${prefix} ]${' '.repeat(23)} │
│ 🧠 RAM: ${usedRAM}GB / ${totalRAM}GB${' '.repeat(19 - (usedRAM.length + totalRAM.length))} │
└${'─'.repeat(50)}┘

┌─ ${'═'.repeat(18)} *COMMANDS* ${'═'.repeat(18)} ─┐
${commandsList}
┌─ ${'═'.repeat(18)} *STATS* ${'═'.repeat(20)} ─┐
│ 📊 Total: ${totalCommands} cmds │ ${Object.keys(categorizedCommands).length} categories │ ✅ Active │
└${'─'.repeat(50)}┘

┌─ ${'═'.repeat(16)} *USAGE* ${'═'.repeat(20)} ─┐
│ 💡 Type any command for details${' '.repeat(12)} │
└${'─'.repeat(50)}┘`;

        // 6. Tuma kwa Muonekano wa Kadi with improved styling
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
