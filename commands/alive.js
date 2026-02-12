const moment = require('moment-timezone');
const { getBuffer } = require('@whiskeysockets/baileys'); // assume imported in main file or use axios/fetch alternative
const owners = require('../data/owner.json');

// ────────────────────────────────────────────────
const CONFIG = Object.freeze({
  BOT_NAME:    'Mickey Glitch',
  VERSION:     '3.2.5',
  DEFAULT_OWNER: '255615944741',
  TIMEZONE:    'Africa/Nairobi',
  THUMB_URL:   'https://water-billimg.onrender.com/1761205727440.png',
  CHANNEL_URL: 'https://whatsapp.com/channel/0029VaN1N7m7z4kcO3z8m43V',
  FOOTER:      '© Mickey Glitch Team • Always Online'
});

let cachedThumb = null; // cache buffer for faster large preview

// ────────────────────────────────────────────────
/**
 * Formats real process uptime (seconds) → "2d 14h 33m 9s" with proper spacing
 * @param {number} seconds - process.uptime()
 * @returns {string}
 */
function formatRealUptime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0 seconds';

  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts = [];
  if (d > 0) parts.push(`\( {d} day \){d > 1 ? 's' : ''}`);
  if (h > 0) parts.push(`\( {h} hour \){h > 1 ? 's' : ''}`);
  if (m > 0) parts.push(`\( {m} minute \){m > 1 ? 's' : ''}`);
  if (s > 0 || parts.length === 0) parts.push(`\( {s} second \){s !== 1 ? 's' : ''}`);

  return parts.join(', ');
}

/**
 * Alive command – Real accurate uptime + web search button
 */
const aliveCommand = async (conn, chatId, msg) => {
  try {
    const name = msg.pushName || 'User';
    const owner = Array.isArray(owners) && owners[0] || CONFIG.DEFAULT_OWNER;

    const now = moment.tz(CONFIG.TIMEZONE);
    const uptimeSec = process.uptime();                    // ← real Node.js process uptime
    const uptimeStr = formatRealUptime(uptimeSec);

    // Cache thumbnail buffer once (improves large preview quality & speed)
    if (!cachedThumb) {
      try {
        const res = await getBuffer(CONFIG.THUMB_URL);
        cachedThumb = res.buffer;
      } catch {} // silent fail → fallback to URL
    }

    const text = `✦ *${CONFIG.BOT_NAME} STATUS* ✦

*Client*    :  ${name}
*Status*    :  *Online* ✅
*Uptime*    :  ${uptimeStr}
*Launched*  :  ${now.format('DD MMMM YYYY • HH:mm:ss')} EAT
*Owner*     :  wa.me/${owner}

→ *\( {CONFIG.BOT_NAME} v \){CONFIG.VERSION}* – Real process runtime since last restart`;

    const buttons = [
      { index: 1, urlButton:      { displayText: '👤 Chat Owner',    url: `https://wa.me/${owner}` } },
      { index: 2, callButton:     { displayText: '📞 Call Owner',    phoneNumber: `+${owner}` } },
      { index: 3, quickReplyButton: { displayText: '📜 Menu',        id: '.menu' } },
      { index: 4, quickReplyButton: { displayText: '🔍 What is uptime?', id: '.search' } }, // ← can handle in your handler
      { index: 5, quickReplyButton: { displayText: '✖ Close',       id: '.cls' } }
    ];

    await conn.sendMessage(chatId, {
      text,
      footer: CONFIG.FOOTER,
      templateButtons: buttons,

      contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        externalAdReply: {
          showAdAttribution: true,
          title: `${CONFIG.BOT_NAME} ${CONFIG.VERSION}`,
          body: 'Real Uptime • Stable • Join Channel',
          mediaType: 1,
          previewType: 'PHOTO',
          ...(cachedThumb ? { thumbnail: cachedThumb } : { thumbnailUrl: CONFIG.THUMB_URL }),
          sourceUrl: CONFIG.CHANNEL_URL,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: msg });

  } catch (err) {
    console.error('[ALIVE]', new Date().toISOString(), err?.message || err);

    // Fast fallback
    conn.sendMessage(chatId, {
      text: `⚠️ *${CONFIG.BOT_NAME}* is running!\nUptime: ${formatRealUptime(process.uptime())}`
    }, { quoted: msg }).catch(() => {});
  }
};

module.exports = aliveCommand;