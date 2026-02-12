const moment = require('moment-timezone');
const owners = require('../data/owner.json');

// ────────────────────────────────────────────────
const CONFIG = {
  BOT_NAME:    'Mickey Glitch',
  VERSION:     '3.2.1',
  DEFAULT_OWNER: '255615944741',
  TIMEZONE:    'Africa/Nairobi',
  IMAGE_URL:   'https://water-billimg.onrender.com/1761205727440.png',
  CHANNEL_URL: 'https://whatsapp.com/channel/0029VaN1N7m7z4kcO3z8m43V',
  FOOTER:      '© Mickey Glitch Team'
};

// ────────────────────────────────────────────────
/**
 * @param {number} seconds
 * @returns {string} "2d 14h 33m 9s" or similar
 */
function formatUptime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0s';

  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return [
    d ? `${d}d` : '',
    h ? `${h}h` : '',
    m ? `${m}m` : '',
    `${s}s`
  ].filter(Boolean).join(' ') || '0s';
}

/**
 * Alive / Status command – sends **one image only** + buttons
 */
async function aliveCommand(conn, chatId, msg) {
  try {
    const senderName = msg.pushName || 'User';
    const owner = Array.isArray(owners) && owners[0] ? owners[0] : CONFIG.DEFAULT_OWNER;

    const now     = moment.tz(CONFIG.TIMEZONE);
    const uptime  = formatUptime(process.uptime());

    const caption = [
      `✦ *${CONFIG.BOT_NAME} STATUS* ✦`,
      '',
      `❖ Client   :  ${senderName}`,
      `❖ Status   :  Online`,
      `❖ Uptime   :  ${uptime}`,
      `❖ Date     :  ${now.format('DD MMMM YYYY')}`,
      `❖ Time     :  ${now.format('HH:mm:ss')} EAT`,
      `❖ Owner    :  ${owner}`,
      '',
      `Powered by ${CONFIG.BOT_NAME} ${CONFIG.VERSION}`
    ].join('\n');

    const buttons = [
      {
        index: 1,
        urlButton: {
          displayText: '👤 Chat with Owner',
          url: `https://wa.me/${owner}`
        }
      },
      {
        index: 2,
        callButton: {
          displayText: '📞 Call Owner',
          phoneNumber: `+${owner}`
        }
      },
      {
        index: 3,
        quickReplyButton: {
          displayText: '📜 Menu',
          id: '.menu'
        }
      },
      {
        index: 4,
        quickReplyButton: {
          displayText: '✖ Close',
          id: '.cls'
        }
      }
    ];

    await conn.sendMessage(chatId, {
      image: { url: CONFIG.IMAGE_URL },
      caption,
      footer: CONFIG.FOOTER,
      templateButtons: buttons,

      // Important: we keep forwarding & ad attribution, but NO extra thumbnail/media
      contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        externalAdReply: {
          title: `${CONFIG.BOT_NAME} ${CONFIG.VERSION}`,
          body: 'Always Online • 100% Stability',
          mediaType: 1,
          previewType: 'PHOTO',
          thumbnailUrl: CONFIG.IMAGE_URL,     // small preview only
          sourceUrl: CONFIG.CHANNEL_URL,
          renderLargerThumbnail: false        // ← prevents second large image
        }
      }
    }, { quoted: msg });

  } catch (err) {
    console.error('[ALIVE ERROR]', new Date().toISOString(), err?.message || err);
    // Optional fallback message
    await conn.sendMessage(chatId, {
      text: '⚠️ Status check failed — but I\'m still alive!'
    }, { quoted: msg }).catch(() => {});
  }
}

module.exports = aliveCommand;