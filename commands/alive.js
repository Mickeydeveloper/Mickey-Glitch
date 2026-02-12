const moment = require('moment-timezone');
const owners = require('../data/owner.json');

// ────────────────────────────────────────────────
const CONFIG = {
  BOT_NAME:    'Mickey Glitch',
  VERSION:     '3.2.3',
  DEFAULT_OWNER: '255615944741',
  TIMEZONE:    'Africa/Nairobi',
  THUMB_URL:   'https://water-billimg.onrender.com/1761205727440.png',   // ← good quality image recommended (at least 500×300+)
  CHANNEL_URL: 'https://whatsapp.com/channel/0029VaN1N7m7z4kcO3z8m43V',
  FOOTER:      '© Mickey Glitch Team'
};

// ────────────────────────────────────────────────
function formatUptime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0s';

  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return [d ? `\( {d}d` : '', h ? ` \){h}h` : '', m ? `\( {m}m` : '', ` \){s}s`]
    .filter(Boolean)
    .join(' ') || '0s';
}

/**
 * Alive command – TEXT + large thumbnail preview in ad/forwarded style
 * No main media attached, only the large externalAdReply thumbnail
 */
async function aliveCommand(conn, chatId, msg) {
  try {
    const senderName = msg.pushName || 'User';
    const owner = Array.isArray(owners) && owners[0] ? owners[0] : CONFIG.DEFAULT_OWNER;

    const now    = moment.tz(CONFIG.TIMEZONE);
    const uptime = formatUptime(process.uptime());

    const text = [
      `✦ *${CONFIG.BOT_NAME} STATUS* ✦`,
      '',
      `❖ Client   :  ${senderName}`,
      `❖ Status   :  Online & Stable`,
      `❖ Uptime   :  ${uptime}`,
      `❖ Date     :  ${now.format('DD MMMM YYYY')}`,
      `❖ Time     :  ${now.format('HH:mm:ss')} EAT`,
      `❖ Owner    :  ${owner}`,
      '',
      `→ ${CONFIG.BOT_NAME} ${CONFIG.VERSION} • Always Active`
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
      text,
      footer: CONFIG.FOOTER,
      templateButtons: buttons,

      contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        externalAdReply: {
          showAdAttribution: true,           // makes it look sponsored/promoted
          title: `${CONFIG.BOT_NAME} ${CONFIG.VERSION}`,
          body: 'System Online • 100% Stability • Join Channel',
          mediaType: 1,                      // PHOTO
          previewType: 'PHOTO',
          thumbnailUrl: CONFIG.THUMB_URL,    // WhatsApp fetches & shows large when renderLargerThumbnail=true
          sourceUrl: CONFIG.CHANNEL_URL,
          renderLargerThumbnail: true        // ← KEY: enables LARGE preview thumbnail
        }
      }
    }, { quoted: msg });

  } catch (err) {
    console.error('[ALIVE ERROR]', new Date().toISOString(), err?.message || err);

    // Fallback
    await conn.sendMessage(chatId, {
      text: `⚠️ ${CONFIG.BOT_NAME} is alive!\nUptime: ${formatUptime(process.uptime())}`
    }, { quoted: msg }).catch(() => {});
  }
}

module.exports = aliveCommand;