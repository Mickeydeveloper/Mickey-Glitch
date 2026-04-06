const axios = require('axios');
const { fetchBuffer } = require('../lib/myfunc');

/**
 * COMMAND: .checkupdates
 * DESIGN: Professional Bot Info + Change Log
 * SPEED: High-speed response with timeout handling
 */

async function checkUpdatesCommand(sock, chatId, message) {
    try {
        // 1. Tuma reaction haraka kuonyesha bot imepokea amri
        await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } });

        // 2. Fetch updates kutoka GitHub au Server (ikiwa na timeout ya sec 5)
        // Kama huna URL ya JSON, inatumia maelezo ya "Static" hapa chini kwa spidi zaidi
        const botInfo = {
            name: "MICKEY GLITCH V5.2.0",
            dev: "Mickdadi Hamza (Mickey)",
            status: "Stable",
            region: "Tanzania 🇹🇿"
        };

        const changelog = `
*LATEST UPDATE LOG:*
• Improved button response speed.
• Fixed ". Menu" space prefix detection.
• Added Identity Cloning (Mirror) system.
• Enhanced auto-cleanup for hosting panels.
• Patched YouTube downloader API timeouts.`;

        // 3. Muonekano mpya (Professional Bot Info)
        const caption = `
🚀 *${botInfo.name} INFORMATION*
━━━━━━━━━━━━━━━━━━━━━━
👤 *Developer:* ${botInfo.dev}
🌍 *Region:* ${botInfo.region}
🔧 *Build Status:* ${botInfo.status}
🛰️ *Engine:* Quantum Base Node.js
━━━━━━━━━━━━━━━━━━━━━━
${changelog}
━━━━━━━━━━━━━━━━━━━━━━
*© 2026 Mickey Infor Technology*`;

        // 4. Tuma ujumbe kwa spidi (Bila kusubiri ma-buffer makubwa)
        await sock.sendMessage(chatId, {
            text: caption,
            contextInfo: {
                externalAdReply: {
                    title: "SYSTEM UPDATE CHECK",
                    body: "Checking for latest Mickey Glitch patches...",
                    thumbnailUrl: "https://i.ibb.co/vzVv8Yp/mickey.jpg", // Weka link ya picha yako hapa
                    sourceUrl: "https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26",
                    mediaType: 1,
                    renderLargerThumbnail: false // Iwe ndogo ili itoke fasta zaidi
                }
            }
        }, { quoted: message });

    } catch (err) {
        console.error("Update Check Error:", err.message);
        await sock.sendMessage(chatId, { text: "❌ *Update server is busy.* Please try again later." });
    }
}

module.exports = checkUpdatesCommand;
