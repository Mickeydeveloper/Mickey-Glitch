// 1. You MUST add this import at the top of your file
const { prepareWAMessageMedia, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const moment = require('moment-timezone');
const owners = require('../data/owner.json');

const aliveCommand = async (conn, chatId, message) => {
  try {
    const name = message.pushName || (conn.user && conn.user.name) || 'User';
    const uptime = clockString(process.uptime() * 1000);
    const date = moment.tz('Africa/Nairobi').format('DD/MM/YYYY');
    const time = moment.tz('Africa/Nairobi').format('HH:mm:ss');

    const statusText = `╭━━━━━━━━━━━━━━━━━━━━━╮
┃  ✨ *MICKEY GLITCH* ✨
┃        v3.1.0
┣━━━━━━━━━━━━━━━━━━━━━┫
┃ 🟢 *Status:* Online
┃ 📊 *Health:* Excellent
┣━━━━━━━━━━━━━━━━━━━━━┫
┃ 👤 *User:* ${name}
┃ ⏱️ *Uptime:* ${uptime}
┃ 📅 *Date:* ${date}
┃ 🕐 *Time:* ${time}
┣━━━━━━━━━━━━━━━━━━━━━┫
┃ 🚀 All systems operational
┃ ✅ Ready to serve
┗━━━━━━━━━━━━━━━━━━━━━┛`.trim();

    const ownerNumber = (Array.isArray(owners) && owners[0]) ? owners[0] : '';

    // FIX: Calling prepareWAMessageMedia directly (not via conn)
    const media = await prepareWAMessageMedia(
      { image: { url: 'https://water-billimg.onrender.com/1761205727440.png' } },
      { upload: conn.waUploadToServer }
    );

    const interactiveMessage = {
      interactiveMessage: {
        header: {
          title: "⚡ MICKEY GLITCH v2.0.1",
          hasMediaAttachment: true,
          imageMessage: media.imageMessage
        },
        body: { text: statusText },
        footer: { text: "Choose an option below" },
        nativeFlowMessage: {
          buttons: [
            {
              "name": "cta_url",
              "buttonParamsJson": JSON.stringify({
                "display_text": "Contact Owner",
                "url": `https://wa.me/${ownerNumber}`
              })
            },
            {
              "name": "quick_reply",
              "buttonParamsJson": JSON.stringify({
                "display_text": "Menu",
                "id": "menu"
              })
            }
          ]
        },
        contextInfo: {
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363398106360290@newsletter',
            newsletterName: '🅼🅸🅲🅺🅴🆈 ɢʟɪᴛᴄʜ™',
            serverMessageId: -1
          }
        }
      }
    };

    // Use generateWAMessageFromContent for better compatibility with buttons
    const msg = generateWAMessageFromContent(chatId, {
      viewOnceMessage: { message: interactiveMessage }
    }, { userJid: conn.user.id, quoted: message });

    await conn.relayMessage(chatId, msg.message, { messageId: msg.key.id });

  } catch (error) {
    console.error('Alive Command Failure:', error);
    // Simple fallback if interactive fails
    await conn.sendMessage(chatId, { text: "🟢 *Mickey Glitch is Alive*" }, { quoted: message });
  }
};

function clockString(ms) {
  let h = Math.floor(ms / 3600000);
  let m = Math.floor((ms % 3600000) / 60000);
  let s = Math.floor((ms % 60000) / 1000);
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
}

module.exports = aliveCommand;
