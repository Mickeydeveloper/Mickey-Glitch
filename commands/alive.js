const moment = require('moment-timezone');
const owners = require('../data/owner.json');
const { proto, generateWAMessageFromContent, prepareWAMessageMedia } = require('@whiskeysockets/baileys');

const aliveCommand = async (conn, chatId, message) => {
    try {
        // 1. Setup Variables
        const name = message.pushName || 'User';
        const uptime = clockString(process.uptime() * 1000);
        const date = moment.tz('Africa/Nairobi').format('DD/MM/YYYY');
        const time = moment.tz('Africa/Nairobi').format('HH:mm:ss');
        const ownerNumber = Array.isArray(owners) ? owners[0] : '255615944741';
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

        // 2. Prepare Media Header
        // This is often where the 'rendering error' happens if upload fails
        const mediaHeader = await prepareWAMessageMedia(
            { image: { url: imageUrl } }, 
            { upload: conn.waUploadToServer }
        );

        // 3. Build Interactive Message
        const messagePayload = {
            viewOnceMessage: {
                message: {
                    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                        body: { text: statusText },
                        footer: { text: "Tap below to continue" },
                        header: {
                            title: "MICKEY GLITCH IS ACTIVE 🟢",
                            hasMediaAttachment: true,
                            ...mediaHeader
                        },
                        nativeFlowMessage: {
                            buttons: [
                                { 
                                    name: "quick_reply", 
                                    buttonParamsJson: JSON.stringify({ display_text: "📜 MENU LIST", id: ".menu" }) 
                                },
                                { 
                                    name: "quick_reply", 
                                    buttonParamsJson: JSON.stringify({ display_text: "👤 OWNER INFO", id: ".owner" }) 
                                }
                            ]
                        },
                        contextInfo: {
                            mentionedJid: [message.sender],
                            forwardingScore: 999,
                            isForwarded: true,
                            externalAdReply: {
                                title: "🅼🅸🅺🅴🆈 ɢʟɪᴛᴄʜ™",
                                body: "System Status: Online",
                                mediaType: 1,
                                previewType: 0,
                                renderLargerThumbnail: true,
                                thumbnailUrl: imageUrl,
                                sourceUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26'
                            }
                        }
                    })
                }
            }
        };

        const msg = generateWAMessageFromContent(chatId, messagePayload, { quoted: message });
        await conn.relayMessage(chatId, msg.message, { messageId: msg.key.id });

    } catch (error) {
        console.error('Critical Error in Alive Command:', error);
        // Fallback that actually looks good if the interactive message fails
        await conn.sendMessage(chatId, {
            text: `*⚡ MICKEY GLITCH IS ONLINE* 🟢\n\n👤 *User:* ${message.pushName}\n📟 *Uptime:* ${clockString(process.uptime() * 1000)}\n\n_Note: Interactive buttons failed to load._`,
            contextInfo: {
                externalAdReply: {
                    title: "MICKEY GLITCH ERROR FALLBACK",
                    body: "Buttons unavailable",
                    thumbnailUrl: 'https://water-billimg.onrender.com/1761205727440.png',
                    sourceUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26',
                    mediaType: 1
                }
            }
        }, { quoted: message });
    }
};

function clockString(ms) {
    let h = Math.floor(ms / 3600000);
    let m = Math.floor((ms % 3600000) / 60000);
    let s = Math.floor((ms % 60000) / 1000);
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':'); 
}

module.exports = aliveCommand;
