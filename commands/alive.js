const moment = require('moment-timezone');
const owners = require('../data/owner.json');

/**
 * Mickey Glitch Alive Command - Professional Ad Version
 */
const aliveCommand = async (conn, chatId, message) => {
  try {
    const name = message.pushName || 'User';
    const uptime = clockString(process.uptime() * 1000);
    const date = moment.tz('Africa/Nairobi').format('DD/MM/YYYY');
    const time = moment.tz('Africa/Nairobi').format('HH:mm:ss');
    const ownerNumber = (Array.isArray(owners) && owners[0]) ? owners[0] : '255615944741';

    // Muonekano mpya bila mistari ya urembo
    const statusText = `*MICKEY GLITCH v3.1.0*

*SISTEMU:* Iko Hewani
*MTUMIAJI:* ${name}
*MUDA:* ${uptime}
*TAREHE:* ${date} | ${time}
*MILIKI:* ${ownerNumber}

*Powered by Mickey Glitch Team*`;

    const imageUrl = 'https://water-billimg.onrender.com/1761205727440.png';

    // Kutuma picha ikiwa na Message from Ad
    await conn.sendMessage(chatId, {
      image: { url: imageUrl },
      caption: statusText,
      contextInfo: {
        externalAdReply: {
          title: "MESSAGE FROM AD: MICKEY GLITCH",
          body: "System Status: Online",
          mediaType: 1,
          thumbnailUrl: imageUrl,
          sourceUrl: "https://whatsapp.com/channel/0029VaN1N7m7z4kcO3z8m43V", // Unaweza kuweka link yako
          renderLargerThumbnail: false,
          showAdAttribution: true // Hii ndiyo inayoleta alama ya "Ad"
        }
      }
    }, { quoted: message });

  } catch (error) {
    console.error('[ALIVE] Command Error:', error.message);
    await conn.sendMessage(chatId, { text: `❌ Hitilafu: ${error.message}` }, { quoted: message });
  }
};

function clockString(ms) {
  let h = Math.floor(ms / 3600000);
  let m = Math.floor((ms % 3600000) / 60000);
  let s = Math.floor((ms % 60000) / 1000);
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
}

module.exports = aliveCommand;
