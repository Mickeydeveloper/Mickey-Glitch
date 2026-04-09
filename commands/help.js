const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { sendButtons } = require('gifted-btns');
const { sendInteractiveMessage } = require('gifted-btns');

/**
 * Main command handler
 */
const aliveCommand = async (sock, chatId, message) => {
    try {
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

        const helpText = `╔════════════════════╗
  ✨ *${botName}* — *V3.0*
╚════════════════════╝
┌  👋 *${greet}*
│  👤 *User:* ${senderName}
│  🕒 *Time:* ${timeStr}
│  📅 *Date:* ${dateStr}
│  💻 *OS:* ${os.platform()}
│  ⏳ *Up:* ${runtimeStr}
└────────────────────┘

*📋 CHAGUA AMRI CHINI:* 👇`;

        // Create buttons for key commands that trigger directly
        const commandButtons = [
            { id: '.menu', text: '📋 FULL MENU' },
            { id: '.ai', text: '🤖 AI CHAT' },
            { id: '.play', text: '🎵 MUSIC' },
            { id: '.img', text: '🖼️ IMAGES' },
            { id: '.sticker', text: '🎭 STICKERS' },
            { id: '.ping', text: '⚡ SPEED TEST' },
            { id: '.owner', text: '👑 OWNER INFO' },
            { id: '.settings', text: '⚙️ BOT SETTINGS' }
        ];

        // Send using gifted-btns sendButtons (like alive.js)
        return await sendButtons(sock, chatId, {
            title: '🆘 MICKEY HELP MENU',
            text: helpText,
            footer: '©2026 Powered by Mickey Labs™',
            buttons: commandButtons
        }, { quoted: message });

    } catch (e) {
        console.error("Error in help.js:", e);
        await sock.sendMessage(chatId, { text: "Hitilafu imetokea! (Error loading menu)" });
    }
};

module.exports = aliveCommand;
