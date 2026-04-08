async function supportCommand(sock, chatId, message) {
    if (!sock) return;

    const supportText = `
🆘 *SUPPORT & HELP*
━━━━━━━━━━━━━━━━━━━━━━
If you need help with the bot, contact the developers:

📧 *Email:* support@mickeyglitch.com
💬 *Telegram:* @MickeyGlitchSupport
🌐 *Website:* https://mickeyglitch.com

*For technical issues, provide details and screenshots.*
━━━━━━━━━━━━━━━━━━━━━━`;

    try {
        await sock.sendMessage(chatId, { text: supportText }, { quoted: message });
    } catch (err) {
        console.error("SUPPORT ERROR:", err.message);
        await sock.sendMessage(chatId, { text: '🚨 *Error!*' }, { quoted: message });
    }
}

module.exports = supportCommand;