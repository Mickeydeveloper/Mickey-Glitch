const { 
    prepareWAMessageMedia, 
    generateWAMessageFromContent, 
    proto 
} = require("@whiskeysockets/baileys");
const moment = require('moment-timezone');
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

/**
 * Format uptime
 */
function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

/**
 * Alive Command kwa kutumia Native Flow Buttons
 */
const aliveCommand = async (conn, chatId, msg) => {
  try {
    const senderName = msg.pushName?.trim() || 'User';
    const ownerJid   = Array.isArray(owners) && owners[0] ? owners[0] : CONFIG.DEFAULT_OWNER;
    const uptime    = formatUptime(process.uptime());
    const now       = moment.tz(CONFIG.TIMEZONE);

    const statusText = `✦ *${CONFIG.BOT_NAME} STATUS* ✦

*Client* :  ${senderName}
*Status* :  *Online* ✅
*Uptime* :  ${uptime}
*Time* :  \`${now.format('HH:mm:ss')}\` EAT
*Owner* :  wa.me/${ownerJid}

→ *${CONFIG.BOT_NAME} v${CONFIG.VERSION}* – Running since last restart`;

    // 1. Tayarisha Media (Thumbnail)
    const media = await prepareWAMessageMedia({ 
        image: { url: CONFIG.THUMB_URL } 
    }, { upload: conn.waUploadToServer });

    // 2. Tengeneza Interactive Message
    const interactiveMessage = {
      body: { text: statusText },
      footer: { text: CONFIG.FOOTER },
      header: {
        title: `*${CONFIG.BOT_NAME} SYSTEM*`,
        hasMediaAttachment: true,
        imageMessage: media.imageMessage
      },
      nativeFlowMessage: {
        buttons: [
          {
            "name": "quick_reply",
            "buttonParamsJson": JSON.stringify({
              "display_text": "📜 MENU LIST",
              "id": ".menu"
            })
          },
          {
            "name": "cta_url",
            "buttonParamsJson": JSON.stringify({
              "display_text": "👤 CHAT OWNER",
              "url": `https://wa.me/${ownerJid}`,
              "merchant_url": `https://wa.me/${ownerJid}`
            })
          },
          {
            "name": "cta_call",
            "buttonParamsJson": JSON.stringify({
              "display_text": "📞 CALL OWNER",
              "phone_number": `+${ownerJid}`
            })
          }
        ]
      },
      contextInfo: {
        isForwarded: true,
        forwardingScore: 999,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363398106360290@newsletter',
            newsletterName: '🅼🅸🅲🅺🅴𝚈'
        },
        externalAdReply: {
          showAdAttribution: true,
          title: CONFIG.BOT_NAME,
          body: 'Online & Stable',
          mediaType: 1,
          thumbnailUrl: CONFIG.THUMB_URL,
          sourceUrl: CONFIG.CHANNEL_URL,
          renderLargerThumbnail: true
        }
      }
    };

    // 3. Tuma ujumbe kupitia relayMessage (Hii ndio siri ya buttons kufanya kazi)
    const message = generateWAMessageFromContent(chatId, {
      viewOnceMessage: {
        message: {
          interactiveMessage: interactiveMessage
        }
      }
    }, { quoted: msg, userJid: conn.user.id });

    await conn.relayMessage(chatId, message.message, { messageId: message.key.id });

  } catch (err) {
    console.error('[ALIVE_ERROR]', err);
    // Fallback kama kuna tatizo la mtandao au media
    await conn.sendMessage(chatId, { 
        text: `⚠️ *${CONFIG.BOT_NAME} Online!*\n\nUptime: ${formatUptime(process.uptime())}` 
    }, { quoted: msg });
  }
};

module.exports = aliveCommand;
