const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { sendInteractiveMessage } = require('gifted-btns');

/**
 * Mfumo wa kusoma commands automatic kutoka kwenye folder
 */
function getAutomaticCommands() {
    try {
        const commandsPath = path.join(__dirname, '../commands'); 
        const files = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        return files.map(file => `.${file.replace('.js', '')}`);
    } catch (e) {
        console.error("Hitilafu kusoma folder la commands:", e);
        return [];
    }
}

const categoryMap = {
    '.gemini': '🤖 AI & Chat',
    '.ai': '🤖 AI & Chat',
    '.chatbot': '🤖 AI & Chat',
    '.tts': '🤖 AI & Chat',
    '.translate': '🤖 AI & Chat',
    '.trt': '🤖 AI & Chat',
    '.mode': '⚙️ Settings & Admin',
    '.settings': '⚙️ Settings & Admin',
    '.owner': '👑 Owner Only',
    '.eval': '👑 Owner Only',
    '.menu': '🔧 Utilities',
    '.help': '🔧 Utilities'
};

function categorizeCommands(commands) {
    const categories = {};
    commands.forEach(cmd => {
        const category = categoryMap[cmd] || '📂 Other Commands';
        if (!categories[category]) categories[category] = [];
        categories[category].push(cmd);
    });
    return categories;
}

/**
 * Load and execute a command by name
 */
async function executeCommand(commandName, sock, chatId, message) {
    try {
        const cmdPath = path.join(__dirname, `${commandName}.js`);
        if (!fs.existsSync(cmdPath)) {
            return await sock.sendMessage(chatId, { 
                text: `❌ Amri "${commandName}" haipatikani!` 
            }, { quoted: message });
        }
        
        // Clear require cache to get latest version
        delete require.cache[require.resolve(cmdPath)];
        const commandModule = require(cmdPath);
        
        // Call the command function
        if (typeof commandModule === 'function') {
            await commandModule(sock, chatId, message, '');
        } else if (commandModule && typeof commandModule === 'object') {
            // Handle exported objects with specific functions
            const handleCommand = Object.values(commandModule).find(fn => typeof fn === 'function');
            if (handleCommand) {
                await handleCommand(sock, chatId, message, '');
            }
        }
    } catch (error) {
        console.error(`Error executing command ${commandName}:`, error);
        await sock.sendMessage(chatId, { 
            text: `❌ Hitilafu itokea wakati wa kueneza amri: ${error.message}` 
        }, { quoted: message });
    }
}

const aliveCommand = async (sock, chatId, message) => {
    try {
        const msgText = (message.text || message.body || '').trim().toLowerCase();
        
        // ==================== HANDLE COMMAND SELECTION ====================
        if (msgText.startsWith('cmd_')) {
            const commandName = '.' + msgText.replace('cmd_', '');
            return await executeCommand(commandName, sock, chatId, message);
        }

        // ==================== SHOW MENU ====================
        const senderName = message.pushName || 'User';
        const botName = 'MICKEY GLITCH';
        const prefix = '.';
        
        const now = moment().tz('Africa/Dar_es_Salaam');
        const dateStr = now.format('ddd, MMM D, YYYY');
        const timeStr = now.format('HH:mm:ss');
        const hr = now.hour();
        const greet = hr < 12 ? 'Habari za Asubuhi ☀️' : hr < 18 ? 'Habari za Mchana 🌤️' : 'Habari za Jioni 🌙';

        const uptimeSec = process.uptime();
        const hrs = Math.floor(uptimeSec / 3600);
        const mins = Math.floor((uptimeSec % 3600) / 60);
        const runtimeStr = `${hrs}h ${mins}m`;

        const allCommands = getAutomaticCommands();
        const categorizedCommands = categorizeCommands(allCommands);
        const totalCommands = allCommands.length;

        const helpText = `╔════════════════════╗
  ✨ *${botName}* — *V3.0*
╚════════════════════╝
┌  👋 *${greet}*
│  👤 *User:* ${senderName}
│  🕒 *Time:* ${timeStr}
│  📅 *Date:* ${dateStr}
│  💻 *OS:* ${os.platform()}
│  ⏳ *Up:* ${runtimeStr}
│  📦 *Total:* ${totalCommands} Cmds
└────────────────────┘

*📋 CHAGUA AMRI CHINI:* 👇`;

        // Build sections for interactive button
        const sections = [];
        Object.entries(categorizedCommands).forEach(([categoryName, commands]) => {
            const rows = commands.map((cmd) => ({
                header: cmd.substring(1, 2).toUpperCase(),
                title: cmd,
                description: categoryName,
                id: `cmd_${cmd.replace('.', '')}`
            }));
            sections.push({
                title: categoryName,
                rows: rows
            });
        });

        // Send using gifted-btns sendInteractiveMessage (like halotel.js)
        return await sendInteractiveMessage(sock, chatId, {
            text: helpText,
            footer: '©2026 Powered by Mickey Labs™',
            interactiveButtons: [
                {
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                        title: '🔧 AMRI ZA MICKEY',
                        sections: sections
                    })
                }
            ]
        }, { quoted: message });

    } catch (e) {
        console.error("Error in help.js:", e);
        await sock.sendMessage(chatId, { text: "Hitilafu imetokea! (Error loading menu)" });
    }
};

module.exports = aliveCommand;
