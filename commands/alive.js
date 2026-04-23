const moment = require('moment-timezone');

/**
 * Mickey Glitch Alive Command
 * Refined Minimalist Aesthetic
 */
const aliveCommand = async (conn, chatId, message) => {
  try {
    // 1. Data Retrieval
    const name = message.pushName || conn.user?.name || 'User';
    const uptime = clockString(process.uptime() * 1000);
    const date = moment.tz('Africa/Nairobi').format('DD MMMM YYYY');
    const time = moment.tz('Africa/Nairobi').format('HH:mm:ss');

    // 2. Clean Typography Layout
    const statusText = `
*MICKEY GLITCH v2.0.1*
_Premium Multi-Device Assistant_

*SYSTEM STATUS*
◈ *User:* ${name}
◈ *Status:* Online
◈ *Health:* 100%
◈ *Uptime:* ${uptime}

*SESSION INFO*
◈ *Time:* ${time}
◈ *Date:* ${date}
◈ *Region:* Africa/Nairobi

*Network active and ready for commands.*`.trim();

    // 3. Execution
    await conn.sendMessage(chatId, {
      text: statusText,
      contextInfo: {
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: '120363398106360290@newsletter',
          newsletterName: '🅼🅸🅲🅺🅴🆈 ɢʟɪᴛᴄʜ™',
          serverMessageId: -1
        },
        externalAdReply: {
          title: `⚡ SYSTEM: OPERATIONAL`,
          body: `Uptime: ${uptime}`,
          thumbnailUrl: 'https://water-billimg.onrender.com/1761205727440.png',
          sourceUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26',
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: message });

  } catch (error) {
    console.error('Command Error:', error.message);
    const fallback = `*MICKEY GLITCH STATUS*\n\n🟢 Systems Online\n✅ All services functional`;
    await conn.sendMessage(chatId, { text: fallback }, { quoted: message });
  }
};

/** * Helper: Format Uptime */
function clockString(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h}h ${m}m ${s}s`;
}

module.exports = aliveCommand;
