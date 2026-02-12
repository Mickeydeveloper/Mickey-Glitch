const { 
    prepareWAMessageMedia, 
    generateWAMessageFromContent 
} = require("@whiskeysockets/baileys");
const moment = require('moment-timezone');
const owners = require('../data/owner.json');

const CONFIG = {
  BOT_NAME: 'Mickey Glitch',
  VERSION: '3.2.6',
  THUMB_URL: 'https://water-billimg.onrender.com/1761205727440.png',
  OWNER: '255615944741',
  FOOTER: '© Mickey Glitch Team'
};

const aliveCommand = async (conn, chatId, msg) => {
  try {
    const uptime = Math.floor(process.uptime());
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;

    const statusText = `✦ *${CONFIG.BOT_NAME} STATUS* ✦

*Status* : Online ✅
*Uptime* : ${hours}h ${minutes}m ${seconds}s
*Version*: ${CONFIG.VERSION}

Piga kura au chagua button hapo chini:`;

    // Kutengeneza picha iwe buffer ya WhatsApp
    const media = await prepareWAMessageMedia({ 
        image: { url: CONFIG.THUMB_URL } 
    }, { upload: conn.waUploadToServer });

    // Hapa tunatengeneza muundo wa Buttons ambao haufeli kirahisi
    const msgTemplate = generateWAMessageFromContent(chatId, {
      viewOnceMessage: {
        message: {
          templateMessage: {
            hydratedTemplate: {
              imageMessage: media.imageMessage,
              hydratedContentText: statusText,
              hydratedFooterText: CONFIG.FOOTER,
              hydratedButtons: [
                {
                  urlButton: {
                    displayText: '👤 Chat Owner',
                    url: `https://wa.me/${CONFIG.OWNER}`
                  }
                },
                {
                  quickReplyButton: {
                    displayText: '📜 Menu List',
                    id: '.menu'
                  }
                },
                {
                  quickReplyButton: {
                    displayText: '📡 Channel',
                    id: '.channel'
                  }
                }
              ]
            }
          }
        }
      }
    }, { quoted: msg });

    // Kutuma ujumbe
    await conn.relayMessage(chatId, msgTemplate.message, { messageId: msgTemplate.key.id });

  } catch (err) {
    console.error('ERROR KWENYE BUTTONS:', err);
    // Ikishindikana kabisa, tuma maandishi matupu ili ujue tatizo lipo wapi
    await conn.sendMessage(chatId, { text: "⚠️ System Error: Buttons zimegoma kurushwa na mfumo wa WhatsApp." }, { quoted: msg });
  }
};

module.exports = aliveCommand;
