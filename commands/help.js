const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Mfumo wa kusoma commands automatic kutoka kwenye folder
 */
function getAutomaticCommands() {
    try {
        const commandsPath = path.join(__dirname, '../commands'); // Hakikisha path ni sahihi kulingana na folder structure yako
        const files = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        
        // Tunatoa ".js" kwenye jina la faili ili kupata jina la command
        return files.map(file => `.${file.replace('.js', '')}`);
    } catch (e) {
        console.error("Hitilafu kusoma folder la commands:", e);
        return [];
    }
}

// Map ya Categories kwa ajili ya kupanga muonekano
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
        const category = categoryMap[cmd] || '📂 Other Cmds';
        if (!categories[category]) categories[category] = [];
        categories[category].push(cmd);
    });
    return categories;
}

const aliveCommand = async (conn, chatId, msg) => {
    try {
        // Taarifa za User & Bot
        const senderName = msg.pushName || 'Mteja'; // Jina la user (User's Name)
        const botName = 'MICKEY GLITCH';
        const prefix = '.';
        
        // Muda & Tarehe
        const now = moment().tz('Africa/Dar_es_Salaam');
        const dateStr = now.format('ddd, MMM D, YYYY');
        const timeStr = now.format('HH:mm:ss');
        const hr = now.hour();
        const greet = hr < 12 ? 'Habari za Asubuhi ☀️' : hr < 18 ? 'Habari za Mchana 🌤️' : 'Habari za Jioni 🌙';

        // Runtime
        const uptimeSec = process.uptime();
        const hrs = Math.floor(uptimeSec / 3600);
        const mins = Math.floor((uptimeSec % 3600) / 60);
        const runtimeStr = `${hrs}h ${mins}m`;

        // Automatic Command Loading
        const allCommands = getAutomaticCommands();
        const categorizedCommands = categorizeCommands(allCommands);
        const totalCommands = allCommands.length;

        // --- MUONEKANO MPYA WA KADI (AD IMPROVED) ---
        const header = `╔════════════════════╗
  ✨ *${botName}* — *V3.0*
╚════════════════════╝
┌  👋 *${greet}*
│  👤 *User:* ${senderName}
│  🕒 *Time:* ${timeStr}
│  📅 *Date:* ${dateStr}
│  💻 *OS:* ${os.platform()}
│  ⏳ *Up:* ${runtimeStr}
│  📦 *Total Cmds:* ${totalCommands}
└────────────────────┘`;

        const intro = `\n*Habari, ${senderName}!* (Hello!)\nHizi hapa ni huduma zilizopo kwenye mfumo wetu:\n`;

        let commandsList = '';
        Object.entries(categorizedCommands).forEach(([categoryName, commands]) => {
            commandsList += `\n*╭───「 ${categoryName.toUpperCase()} 」*`;
            commandsList += `\n│ ` + commands.map(cmd => `\`${cmd}\``).join('  ');
            commandsList += `\n*╰───────────────💎*`;
        });

        const finalMessage = `${header}\n${intro}${commandsList}\n\n*©2026 Powered by Mickey Labs™*`;

        // Tuma ujumbe wenye Tangazo Kubwa (Big Ad)
        await conn.sendMessage(chatId, {
            text: finalMessage,
            contextInfo: {
                isForwarded: true,
                forwardingScore: 999,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363398106360290@newsletter',
                    newsletterName: `${botName}: ${runtimeStr}`,
                    serverMessageId: 101
                },
                externalAdReply: {
                    title: `${botName} — Smart Multi-Device`,
                    body: `Hello ${senderName}, Total ${totalCommands} commands are ready!`,
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    thumbnailUrl: 'https://water-billing-292n.onrender.com/1761205727440.png',
                    sourceUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26'
                }
            }
        }, { quoted: msg });

    } catch (e) {
        console.error("Error in help.js:", e);
        await conn.sendMessage(chatId, { text: "Hitilafu imetokea wakati wa kuandaa menu." });
    }
};

module.exports = aliveCommand;
