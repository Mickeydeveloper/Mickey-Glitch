const moment = require('moment-timezone');

/**
 * SIMPLE MENU - Direct Baileys Interactive Format
 * No gifted-btns dependencies - guaranteed to work
 */

const simpleMenuCommand = async (sock, chatId, m) => {
    try {
        const now = moment().tz('Africa/Dar_es_Salaam');
        const greet = now.hour() < 12 ? 'Asubuhi ☀️' : now.hour() < 18 ? 'Mchana 🌤️' : 'Jioni 🌙';

        const helpText = `╔════════════════════════════════════╗
  ✨ MICKEY GLITCH - MENU V3.0.5 ✨
╚════════════════════════════════════╝

👋 Habari za ${greet}
👤 User: ${m.pushName || 'Anonymous'}
📅 ${now.format('dddd, MMMM D, YYYY')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 *Chagua amri kutoka kwa chini:*`;

        // Standard Baileys Interactive Message Format
        const message = {
            text: helpText,
            sections: [
                {
                    title: "⭐ BASIC COMMANDS",
                    rows: [
                        { header: "🔔", title: "Ping", description: "Check bot status", id: ".ping" },
                        { header: "🤖", title: "Alive", description: "Bot is alive?", id: ".alive" },
                        { header: "🆘", title: "Help", description: "Show help menu", id: ".help" },
                    ]
                },
                {
                    title: "🎨 MEDIA COMMANDS",
                    rows: [
                        { header: "🎞️", title: "Sticker", description: "Convert to sticker", id: ".sticker" },
                        { header: "🎬", title: "Video", description: "Download video", id: ".video" },
                        { header: "🎵", title: "Play", description: "Play music", id: ".play" },
                    ]
                },
                {
                    title: "👥 GROUP COMMANDS",
                    rows: [
                        { header: "👋", title: "Tag All", description: "Tag all members", id: ".tagall" },
                        { header: "🚫", title: "Ban", description: "Ban user", id: ".ban" },
                        { header: "✅", title: "Promote", description: "Promote admin", id: ".promote" },
                    ]
                },
                {
                    title: "🔧 ADMIN COMMANDS",
                    rows: [
                        { header: "⚙️", title: "Settings", description: "Bot settings", id: ".settings" },
                        { header: "🔐", title: "Owner", description: "Owner info", id: ".owner" },
                        { header: "📝", title: "Report", description: "Report issue", id: ".report" },
                    ]
                }
            ]
        };

        console.log(`📋 [MENU] Sending simple menu to ${chatId}`);

        // Send using standard Baileys format
        await sock.sendMessage(chatId, {
            text: message.text,
            sections: message.sections,
            listType: 1,
            title: "📋 FUNGUA MENU",
            footerText: "Quantum Base Developer (TZ)"
        }, { quoted: m });

        console.log(`✅ [MENU] Menu sent successfully`);
        return true;

    } catch (e) {
        console.error("❌ [MENU] Error:", e.message);
        // Fallback to text menu
        try {
            const fallbackText = `
╔════════════════════════════════════╗
  ✨ MICKEY GLITCH MENU V3.0.5 ✨
╚════════════════════════════════════╝

Karibu! Matumizi:

⭐ BASIC:
.ping - Status check
.alive - Is alive?
.help - Show help

🎨 MEDIA:
.sticker - Convert sticker
.video - Download video
.play - Play music

👥 GROUP:
.tagall - Tag all
.ban - Ban user
.promote - Promote

🔧 ADMIN:
.settings - Settings
.owner - Owner info
.report - Report

*Jaribu amri moja hapo juu!*`;

            await sock.sendMessage(chatId, { text: fallbackText }, { quoted: m });
            console.log(`✅ [MENU] Fallback text menu sent`);
        } catch (fallbackErr) {
            console.error("❌ [MENU] Fallback failed:", fallbackErr.message);
        }
    }
};

module.exports = simpleMenuCommand;
