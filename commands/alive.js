const moment = require('moment-timezone');
const owners = require('../data/owner.json');
const { proto, generateWAMessageFromContent, prepareWAMessageMedia } = require('@whiskeysockets/baileys');

/** 
 * Mickey Glitch Alive Command - Whiskey Baileys Interactive Version 
 */
const aliveCommand = async (conn, chatId, message) => {
 try {
 // 1. Prepare Data
 const name = message.pushName || 'User';
 const uptime = clockString(process.uptime() * 1000);
 const date = moment.tz('Africa/Nairobi').format('DD/MM/YYYY');
 const time = moment.tz('Africa/Nairobi').format('HH:mm:ss');
 const ownerNumber = (Array.isArray(owners) && owners[0]) ? owners[0] : '255615944741';

 const statusText = `*───〔 ⚡ MICKEY GLITCH v3.1.0 〕───* 
👤 *USER:* ${name}
🚀 *STATUS:* All Systems Operational
📟 *UPTIME:* ${uptime}
📅 *DATE:* ${date}
🕒 *TIME:* ${time} (EAT)
*───〔 SYSTEM METRICS 〕───*
📡 *Latency:* Stable 🟢
🛠️ *Connection:* Strong
👤 *Owner:* ${ownerNumber}
> *Powered by Mickey Glitch Team*`;

 // 2. Create Buttons (Menu & Owner)
 const buttons = [
 { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "📜 MENU LIST", id: ".menu" }) },
 { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "👤 OWNER INFO", id: ".owner" }) }
 ];

 // 3. Prepare Message for Relay (Whiskey Baileys Style)
 let msg = generateWAMessageFromContent(chatId, {
 viewOnceMessage: {
 message: {
 interactiveMessage: proto.Message.InteractiveMessage.fromObject({
 body: proto.Message.InteractiveMessage.Body.fromObject({ text: statusText }),
 footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: "Tap below to continue" }),
 header: proto.Message.InteractiveMessage.Header.fromObject({
 title: "MICKEY GLITCH IS ACTIVE 🟢",
 hasMediaAttachment: true,
 ...(await prepareWAMessageMedia({ image: { url: 'https://water-billimg.onrender.com/1761205727440.png' } }, { upload: conn.waUploadToServer }))
 }),
 nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({ buttons: buttons }),
 contextInfo: {
 mentionedJid: [message.sender],
 externalAdReply: {
 title: "🅼🅸🅲🅺🅴🆈 ɢʟɪᴛᴄʜ™",
 body: "System Status: Online",
 thumbnailUrl: 'https://water-billimg.onrender.com/1761205727440.png',
 sourceUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26',
 mediaType: 1,
 renderLargerThumbnail: false
 }
 }
 })
 }
 }
 }, { quoted: message });

 // 4. Send Message via relayMessage
 await conn.relayMessage(chatId, msg.message, { messageId: msg.key.id });
 } catch (error) {
 console.error('Alive Command Failure:', error.message);
 // Fallback to plain text if Relay fails
 await conn.sendMessage(chatId, {
 text: `*Mickey Glitch is Online* 🟢\nUptime: ${clockString(process.uptime() * 1000)}`
 }, { quoted: message });
 }
};

function clockString(ms) {
 let h = isNaN(ms) ? '00' : Math.floor(ms / 3600000);
 let m = isNaN(ms) ? '00' : Math.floor((ms % 3600000) / 60000);
 let s = isNaN(ms) ? '00' : Math.floor((ms % 60000) / 1000);
 return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':'); 
}

module.exports = aliveCommand;
