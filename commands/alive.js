const moment = require('moment-timezone');
const owners = require('../data/owner.json');

/**
 * Mickey Glitch Alive Command - Clean Text Version
 */
const aliveCommand = async (conn, chatId, message) => {
  try {
    const name = message.pushName || 'User';
    const uptime = clockString(process.uptime() * 1000);
    const date = moment.tz('Africa/Nairobi').format('DD/MM/YYYY');
    const time = moment.tz('Africa/Nairobi').format('HH:mm:ss');
    const ownerNumber = (Array.isArray(owners) && owners[0]) ? owners[0] : '255615944741';

    const statusText = `*───〔 ⚡ MICKEY GLITCH v3.1.0 〕───*

👤 *USER:* ${name}
🚀 *STATUS:* All Systems Operational
📟 *UPTIME:* ${uptime}
📅 *DATE:* ${date}
🕒 *TIME:* ${time} (EAT)

*───〔 SYSTEM METRICS 〕───*
📡 *Latency:* Stable
🟢 *Connection:* Strong
🛠️ *Owner:* ${ownerNumber}

> *Powered by Mickey Glitch Team*`;

    // Primary image URL
    const imageUrl = 'https://water-billimg.onrender.com/1761205727440.png';
    const fallbackImageUrl = 'https://images.unsplash.com/photo-1511379938547-c1f69b13d835?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60';

    try {
      await conn.sendMessage(chatId, {
        image: { url: imageUrl },
        caption: statusText,
        contextInfo: {
          mentionedJid: [message.sender],
          externalAdReply: {
            title: "🅼🅸🅲🅺🅴🆈 ɢʟɪᴛᴄʜ™",
            body: "System Status: Online",
            thumbnailUrl: imageUrl,
            sourceUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26',
            mediaType: 1,
            renderLargerThumbnail: true
          }
        }
      }, { quoted: message });
    } catch (imageError) {
      console.error('[ALIVE] Primary image failed:', imageError.message);
      
      // Fallback: Try alternate image
      try {
        await conn.sendMessage(chatId, {
          image: { url: fallbackImageUrl },
          caption: statusText,
          contextInfo: {
            mentionedJid: [message.sender],
            externalAdReply: {
              title: "🅼🅸🅲🅺🅴🆈 ɢʟɪᴛᴄʜ™",
              body: "System Status: Online",
              thumbnailUrl: fallbackImageUrl,
              sourceUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26',
              mediaType: 1,
              renderLargerThumbnail: true
            }
          }
        }, { quoted: message });
      } catch (fallbackError) {
        console.error('[ALIVE] Fallback image failed:', fallbackError.message);
        
        // Last resort: Send text only
        await conn.sendMessage(chatId, {
          text: statusText
        }, { quoted: message });
      }
    }

  } catch (error) {
    console.error('[ALIVE] Command Error:', error.message);
    try {
      await conn.sendMessage(chatId, {
        text: `❌ Hitilafu: ${error.message || 'Alive command failed'}`
      }, { quoted: message });
    } catch (e) {
      console.error('[ALIVE] Failed to send error message:', e.message);
    }
  }
};

function clockString(ms) {
  let h = Math.floor(ms / 3600000);
  let m = Math.floor((ms % 3600000) / 60000);
  let s = Math.floor((ms % 60000) / 1000);
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
}

module.exports = aliveCommand;
