const moment = require('moment-timezone');
const owners = require('../data/owner.json');
const { proto, generateWAMessageFromContent, prepareWAMessageMedia } = require('@whiskeysockets/baileys');

/** * Mickey Glitch Alive Command - Optimized Baileys Version 
 */
const aliveCommand = async (conn, chatId, message) => {
    try {
        // 1. Data Preparation
        const name = message.pushName || 'User';
        const uptime = clockString(process.uptime() * 1000);
        const date = moment.tz('Africa/Nairobi').format('DD/MM/YYYY');
        const time = moment.tz('Africa/Nairobi').format('HH:mm:ss');
        
        // Ensure owner number is a string and handle potential array issues
        const ownerNumber = Array.isArray(owners) ? owners[0] : (owners.ownerNumber || '255615944741');
        const imageUrl = 'https://water-billimg.onrender.com/1761205727440.png';

        const statusText = `*───〔 ⚡ MICKEY GLITCH v3.1.0 〕───* 👤 *USER:* ${name}
🚀 *STATUS:* All Systems Operational
📟 *UPTIME:* ${uptime}
📅 *DATE:* ${date}
🕒 *TIME:* ${time} (EAT)

*───〔 SYSTEM METRICS 〕───*
📡 *Latency:* Stable 🟢
🛠️ *Connection:* Strong
👤 *Owner:* ${ownerNumber}

> *Powered by Mickey Glitch Team*`;

        // 2. Button Configuration
        const buttons = [
            { 
                name: "quick_reply", 
                buttonParamsJson: JSON.stringify({ display_text: "📜 MENU LIST", id: ".menu" }) 
            },
            { 
                name: "quick_reply", 
                buttonParamsJson: JSON.stringify({ display_text: "👤 OWNER INFO", id: ".owner" }) 
            }
        ];

        // 3. Media Upload (Pre-processing the header image)
        const media = await prepareWAMessageMedia(
            { image: { url: imageUrl } }, 
            { upload: conn.waUploadToServer }
        );

        // 4. Construct Interactive Message
        const interactiveMsg = {
            viewOnceMessage: {
                message: {
                    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                        body: { text: statusText },
                        footer: { text: "Tap below to explore more" },
                        header: {
                            title: "MICKEY GLITCH IS ACTIVE 🟢",
                            hasMediaAttachment: true,
                            ...media
                        },
                        nativeFlowMessage: {
                            buttons: buttons
                        },
                        contextInfo: {
                            mentionedJid: [message.sender],
                            externalAdReply: {
                                title: "🅼🅸🅺🅴🆈 ɢʟɪᴛᴄʜ™",
                                body: "System Status: Online",
                                thumbnail: (await conn.getFile(imageUrl)).data, // Better for direct rendering
                                sourceUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26',
                                mediaType: 1,
                                renderLargerThumbnail: true
                            }
                        }
                    })
                }
            }
        };

        const msg = generateWAMessageFromContent(chatId, interactiveMsg, { quoted: message });

        // 5. Execution
        await conn.relayMessage(chatId, msg.message, { messageId: msg.key.id });

    } catch (error) {
        console.error('Alive Command Failure:', error);
        // Clean fallback
        await conn.sendMessage(chatId, {
            text: `*Mickey Glitch is Online* 🟢\n\n*Uptime:* ${clockString(process.uptime() * 1000)}\n*Status:* System encountered a rendering error but remains active.`
        }, { quoted: message });
    }
};

/**
 * Formats milliseconds into HH:MM:SS
 */
function clockString(ms) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
}

module.exports = aliveCommand;
