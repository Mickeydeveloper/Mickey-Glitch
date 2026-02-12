const moment = require('moment-timezone');
const { getBuffer } = require('@whiskeysockets/baileys'); // if not already imported in your main file
const owners = require('../data/owner.json');

// ────────────────────────────────────────────────
const CONFIG = Object.freeze({
  BOT_NAME: 'Mickey Glitch',
  VERSION: '3.2.4',
  DEFAULT_OWNER: '255615944741',
  TIMEZONE: 'Africa/Nairobi',
  THUMB_URL: 'https://water-billimg.onrender.com/1761205727440.png',
  CHANNEL_URL: 'https://whatsapp.com/channel/0029VaN1N7m7z4kcO3z8m43V',
  FOOTER: '© Mickey Glitch Team • Fast & Stable'
});

// Pre-fetch thumbnail buffer once (if possible) or per-call — improves large preview reliability
let cachedThumbBuffer = null;

/**
 * Format uptime: "2d 14h 33m 9s"
 * @param {number} sec
 * @returns {string}
 */
const formatUptime = (sec) => {
  if (sec < 0 || !Number.isFinite(sec)) return '0s';

  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  return [d && `\( {d}d`, h && ` \){h}h`, m && `\( {m}m`, ` \){s}s`]
    .filter(Boolean)
    .join(' ') || '0s';
};

/**
 * Alive command – Text + large thumbnail preview (ad-style forwarded bubble)
 * No main media → fast send, clean look
 */
const aliveCommand = async (conn, chatId, msg) => {
  try {
    const name = msg.pushName || 'User';
    const owner = Array.isArray(owners) && owners[0] || CONFIG.DEFAULT_OWNER;

    const now = moment.tz(CONFIG.TIMEZONE);
    const uptime = formatUptime(process.uptime());

    // Prepare thumbnail buffer (fallback to URL if fetch fails)
    if (!cachedThumbBuffer) {
      try {
        const { buffer } = await getBuffer(CONFIG.THUMB_URL);
        cachedThumbBuffer = buffer;
      } catch {
        // keep as null → baileys falls back to thumbnailUrl
      }
    }

    const text = `✦ *${CONFIG.BOT_NAME} STATUS* ✦

*Client*  :  ${name}
*Status*  :  *Online* ✅
*Uptime*  :  \`${uptime}\`
*Date*    :  ${now.format('DD MMMM YYYY')}
*Time*    :  \`${now.format('HH:mm:ss')}\` EAT
*Owner*   :  ${owner}

→ *${CONFIG.BOT_NAME} ${CONFIG.VERSION}* • Always Ready`;

    const buttons = [
      { index: 1, urlButton: { displayText: '👤 Chat Owner', url: `https://wa.me/${owner}` } },
      { index: 2, callButton: { displayText: '📞 Call Owner', phoneNumber: `+${owner}` } },
      { index: 3, quickReplyButton: { displayText: '📜 Menu', id: '.menu' } },
      { index: 4, quickReplyButton: { displayText: '✖ Close', id: '.cls' } }
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
          body: 'Online • Stable • Join Channel',
          mediaType: 1,
          previewType: 'PHOTO',
          ...(cachedThumbBuffer
            ? { thumbnail: cachedThumbBuffer }
            : { thumbnailUrl: CONFIG.THUMB_URL }),
          sourceUrl: CONFIG.CHANNEL_URL,
          renderLargerThumbnail: true   // ← aims for large preview
        }
      }
    }, { quoted: msg });

  } catch (err) {
    console.error('[ALIVE]', new Date().toISOString(), err?.message || err);

    // Ultra-fast fallback (no await delay)
    conn.sendMessage(chatId, {
      text: `⚠️ *\( {CONFIG.BOT_NAME}* is alive!\nUptime: \` \){formatUptime(process.uptime())}\``
    }, { quoted: msg }).catch(() => {});
  }
};

module.exports = aliveCommand;