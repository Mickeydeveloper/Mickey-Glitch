/**
 * COMMAND: .checkupdates
 * DESIGN: 3 Pro Buttons + English Change Log
 * SPEED: Ultra-Fast Response
 */

async function checkUpdatesCommand(sock, chatId, message) {
    try {
        // 1. Quick reaction
        await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } });

        // 2. English Change Log Only
        const changelog = `
*LATEST SYSTEM UPDATES:*
• Improved button response architecture.
• Optimized ". Menu" command recognition.
• Enhanced auto-temp cleanup for hosting.
• Fixed stability issues in media downloads.`;

        const caption = `
🚀 *MICKEY GLITCH V5.2.0 INFO*
━━━━━━━━━━━━━━━━━━━━━━
👤 *Dev:* Mickey Tech
🔧 *Status:* Online & Stable
🛰️ *Build:* 2026 Edition
━━━━━━━━━━━━━━━━━━━━━━
${changelog}
━━━━━━━━━━━━━━━━━━━━━━
*© 2026 Mickey Infor Technology*`;

        // 3. Tuma ujumbe wenye Button 3 pekee
        const buttons = [
            { buttonId: '.update', buttonText: { displayText: '📥 UPDATE NOW' }, type: 1 },
            { buttonId: '.sendzip', buttonText: { displayText: '💾 DOWNLOAD' }, type: 1 },
            { buttonId: '.owner', buttonText: { displayText: '📢 JOIN MY CHANNEL' }, type: 1 }
        ];

        const buttonMessage = {
            text: caption,
            footer: 'Select an option below',
            buttons: buttons,
            headerType: 1,
            contextInfo: {
                externalAdReply: {
                    title: "MICKEY GLITCH UPDATES",
                    body: "System is running on latest version.",
                    thumbnailUrl: "https://i.ibb.co/vzVv8Yp/mickey.jpg",
                    sourceUrl: "https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610", // Link ya channel yako
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        };

        await sock.sendMessage(chatId, buttonMessage, { quoted: message });

    } catch (err) {
        console.error("Update Check Error:", err.message);
        await sock.sendMessage(chatId, { text: "❌ *System Error:* Try again." });
    }
}

module.exports = checkUpdatesCommand;
