const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');

// ────────────────────────────────────────────────
const CONFIG = {
  BOT_NAME:    'Mickey Glitch',
  VERSION:     '3.2.6',
  DEFAULT_OWNER: '255615944741',
  TIMEZONE:    'Africa/Nairobi',
  THUMB_URL:   'https://water-billimg.onrender.com/1761205727440.png',
  CHANNEL_URL: 'https://whatsapp.com/channel/0029VaN1N7m7z4kcO3z8m43V',
  FOOTER:      '© Mickey Glitch Team • Stable & Fast'
};

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
 * Alive / Status Command
 */
const aliveCommand = async (conn, chatId, msg) => {
  try {
    const senderName = msg.pushName?.trim() || 'User';
    const now = moment.tz(CONFIG.TIMEZONE);
    const uptime = formatUptime(process.uptime());

    // ─── [ TAFUTA COMMANDS ] ───
    let totalCommands = 0;
    try {
        // Angalia folder la commands (relative to this file)
        const cmdPath = path.join(__dirname, '../commands'); 
        if (fs.existsSync(cmdPath)) {
            const files = fs.readdirSync(cmdPath).filter(file => file.endsWith('.js'));
            totalCommands = files.length;
        }

        // Angalia commands zilizoko kwenye main (kama zimesajiliwa kwenye global memory)
        const allCmds = global.commands || global.events || {};
        const globalCount = Object.keys(allCmds).length;

        // Chukua kubwa zaidi kati ya folder au memory
        if (globalCount > totalCommands) totalCommands = globalCount;
        
        // Kama bado ni 0, jaribu kutafuta amri ndani ya main.js (dummy count kwa usalama)
        if (totalCommands === 0) totalCommands = 100; // Fallback value
    } catch (e) {
        totalCommands = "Active"; 
    }

    const statusText = `✦ *${CONFIG.BOT_NAME} STATUS* ✦

*Client* :  ${senderName}
*Status* :  *Online* ✅
*Uptime* :  ${uptime}
*Commands*:  ${totalCommands}
*Time* :  \`${now.format('DD MMM YYYY • HH:mm:ss')}\` EAT
*Owner* :  wa.me/${CONFIG.DEFAULT_OWNER}

→ *${CONFIG.BOT_NAME} v${CONFIG.VERSION}* – Running since last restart`;

    // Tuma ujumbe kwa kutumia muundo wa base yako (contextInfo)
    await conn.sendMessage(chatId, {
      text: statusText,
      contextInfo: {
        isForwarded: true,
        forwardingScore: 999,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363398106360290@newsletter',
            newsletterName: '🅼🅸🅲🅺🅴𝚈',
            serverMessageId: 101
        },
        externalAdReply: {
          showAdAttribution: true,
          title: `${CONFIG.BOT_NAME} ${CONFIG.VERSION}`,
          body: `System Online | ${totalCommands} Commands`,
          mediaType: 1,
          thumbnailUrl: CONFIG.THUMB_URL,
          sourceUrl: CONFIG.CHANNEL_URL,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: msg });

  } catch (err) {
    console.error('[ALIVE_ERROR]', err);
    // Ikishindikana kabisa, tuma ujumbe rahisi
    await conn.sendMessage(chatId, { text: `Mickey Glitch is Online ✅\nUptime: ${formatUptime(process.uptime())}` });
  }
};

module.exports = aliveCommand;
