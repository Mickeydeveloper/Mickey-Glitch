const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const os = require('os');

const aliveCommand = async (conn, chatId, msg) => {
    try {
        const senderName = msg.pushName || 'User';
        const botName = 'Mickey Glitch';
        const version = '3.1';
        const prefix = '.';
        
        // Time & Date Setup
        const now = moment().tz('Africa/Dar_es_Salaam');
        const dateStr = now.format('ddd, MMM D, YYYY');
        const timeStr = now.format('HH:mm:ss');
        const hr = now.hour();
        const greet = hr < 12 ? 'Habari za Asubuhi ☀️' : hr < 18 ? 'Habari za Mchana 🌤️' : 'Habari za Jioni 🌙';

        // Runtime Calculation
        const uptimeSec = process.uptime();
        const hrs = Math.floor(uptimeSec / 3600);
        const mins = Math.floor((uptimeSec % 3600) / 60);
        const runtime = `${hrs}h ${mins}m`;

        // Mock data kwa ajili ya mfano (Replace na function yako ya kweli)
        const totalCommands = 590; 

        // 1. IMPROVED HEADER (Muonekano mpya)
        const header = `╔════════════════════╗
  ✨ *${botName}* — *V${version}*
╚════════════════════╝
┌  👋 *${greet}*
│  👤 *User:* ${senderName}
│  🕒 *Time:* ${timeStr}
│  📅 *Date:* ${dateStr}
│  💻 *OS:* ${os.platform()}
│  ⏳ *Up:* ${runtime}
│  📦 *Cmds:* ${totalCommands}
└────────────────────┘`;

        // 2. INTRO SECTION
        const intro = `\n*Habari!* (Hello!)\nKaribu kwenye menu ya *${botName}*. Chagua command hapo chini:\n`;

        // 3. COMMAND LIST STYLING (Category Style)
        // Hapa ni mfano wa mpangilio, tumia logic yako ya categories hapa
        const categories = {
            '🤖 AI & CHAT': ['.ai', '.gemini', '.trt'],
            '⚙️ SETTINGS': ['.mode', '.settings', '.info'],
            '🎨 CREATIVE': ['.glitch', '.fire', '.sand']
        };

        let commandsList = '';
        for (const [cat, cmds] of Object.entries(categories)) {
            commandsList += `\n*╭───「 ${cat} 」*`;
            commandsList += `\n│ ` + cmds.map(c => `\`${c}\``).join('  ');
            commandsList += `\n*╰───────────────💎*`;
        }

        const finalMessage = `${header}\n${intro}${commandsList}\n\n*Powered by Mickey Labs™*`;

        // 4. SEND MESSAGE WITH IMPROVED AD
        await conn.sendMessage(chatId, {
            text: finalMessage,
            contextInfo: {
                isForwarded: true,
                forwardingScore: 999,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363398106360290@newsletter',
                    newsletterName: `Λ𝗫𝗜𝗦 𝗫𝗠𝐃: ${runtime}`,
                    serverMessageId: 101
                },
                externalAdReply: {
                    title: `Λ𝗫𝗜𝗦 𝗫𝗠𝐃 — Multi-Device Bot`,
                    body: `Total: ${totalCommands} cmds | Fast & Lite`,
                    mediaType: 1,
                    renderLargerThumbnail: true, // Inafanya picha iwe kubwa na ivutie zaidi
                    thumbnailUrl: 'https://water-billing-292n.onrender.com/1761205727440.png',
                    sourceUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26'
                }
            }
        }, { quoted: msg });

    } catch (e) {
        console.error(e);
        await conn.sendMessage(chatId, { text: "Error loading menu... (Hitilafu)" });
    }
};

module.exports = aliveCommand;
