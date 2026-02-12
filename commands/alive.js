const moment = require('moment-timezone');
const { getBuffer } = require('@whiskeysockets/baileys'); // Make sure this is available (or use axios/fetch)
const owners = require('../data/owner.json');

// ────────────────────────────────────────────────
const CONFIG = Object.freeze({
  BOT_NAME:    'Mickey Glitch',
  VERSION:     '3.2.6',
  DEFAULT_OWNER: '255615944741',
  TIMEZONE:    'Africa/Nairobi',
  THUMB_URL:   'https://water-billimg.onrender.com/1761205727440.png',
  CHANNEL_URL: 'https://whatsapp.com/channel/0029VaN1N7m7z4kcO3z8m43V',
  FOOTER:      '© Mickey Glitch Team • Stable & Fast'
});

let cachedThumbnail = null; // Cache once for speed & reliability

// ────────────────────────────────────────────────
/**
 * Format real process uptime in human-readable form
 * @param {number} seconds
 * @returns {string} e.g. "2 days, 14 hours, 33 minutes, 9 seconds"
 */
function formatUptime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0 seconds';

  const units = [
    { value: Math.floor(seconds / 86400), unit: 'day'    },
    { value: Math.floor((seconds % 86400) / 3600), unit: 'hour'   },
    { value: Math.floor((seconds % 3600) / 60),    unit: 'minute' },
    { value: Math.floor(seconds % 60),             unit: 'second' }
  ];

  return units
    .filter(u => u.value > 0)
    .map(u => `${u.value} \( {u.unit} \){u.value > 1 ? 's' : ''}`)
    .join(', ') || '0 seconds';
}

/**
 * Alive / Status Command – Fixed errors, real uptime, large thumbnail preview
 */
const aliveCommand = async (conn, chatId, msg) => {
  try {
    const senderName = msg.pushName?.trim() || 'User';
    const ownerJid   = Array.isArray(owners) && owners[0] ? owners[0] : CONFIG.DEFAULT_OWNER;

    const now       = moment.tz(CONFIG.TIMEZONE);
    const uptimeSec = process.uptime(); // ← real bot runtime in seconds
    const uptime    = formatUptime(uptimeSec);

    // Load thumbnail buffer once (better large preview success rate)
    if (!cachedThumbnail) {
      try {
        const { buffer } = await getBuffer(CONFIG.THUMB_URL);
        cachedThumbnail = buffer;
      } catch (fetchErr) {
        console.warn('[THUMB_FETCH_FAIL]', fetchErr.message);
        // fallback to URL later
      }
    }

    const statusText = `✦ *${CONFIG.BOT_NAME} STATUS* ✦

*Client*  :  ${senderName}
*Status*  :  *Online* ✅
*Uptime*  :  ${uptime}
*Time*    :  \`${now.format('DD MMM YYYY • HH:mm:ss')}\` EAT
*Owner*   :  wa.me/${ownerJid}

→ *\( {CONFIG.BOT_NAME} v \){CONFIG.VERSION}* – Running since last restart`;

    const buttons = [
      { index: 1, urlButton:        { displayText: '👤 Chat Owner', url: `https://wa.me/${ownerJid}` } },
      { index: 2, callButton:       { displayText: '📞 Call Owner', phoneNumber: `+${ownerJid}` } },
      { index: 3, quickReplyButton: { displayText: '📜 Menu',       id: '.menu' } },
      { index: 4, quickReplyButton: { displayText: '🔍 What is uptime?', id: 'uptime_info' } }, // handle in your cmd handler or use URL button below
      { index: 5, quickReplyButton: { displayText: '✖ Close',      id: '.cls' } }
    ];

    // Alternative: direct web search button instead of quickReply
    // Replace index 4 above with:
    // { index: 4, urlButton: { displayText: '🔍 What is uptime?', url: 'https://www.google.com/search?q=what+is+bot+uptime+WhatsApp' } }

    await conn.sendMessage(chatId, {
      text: statusText,
      footer: CONFIG.FOOTER,
      templateButtons: buttons,

      contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        externalAdReply: {
          showAdAttribution: true,
          title: `${CONFIG.BOT_NAME} ${CONFIG.VERSION}`,
          body: 'Online • Stable • Join Channel',
          mediaType: 1,
          previewType: 'PHOTO',
          ...(cachedThumbnail
            ? { thumbnail: cachedThumbnail }
            : { thumbnailUrl: CONFIG.THUMB_URL }),
          sourceUrl: CONFIG.CHANNEL_URL,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: msg });

  } catch (err) {
    console.error('[ALIVE_ERROR]', new Date().toISOString(), err?.stack || err);

    // Safe fallback – no await chain break
    conn.sendMessage(chatId, {
      text: `⚠️ *${CONFIG.BOT_NAME}* is alive!\nUptime: ${formatUptime(process.uptime())}`
    }, { quoted: msg }).catch(console.warn);
  }
};

module.exports = aliveCommand;