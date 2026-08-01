const axios = require('axios');

const tweetCommand = async (sock, chatId, message) => {
  try {
    const text = (message.message?.conversation || message.message?.extendedTextMessage?.text || '').trim().slice(6).trim();

    if (!text) {
      return await sock.sendMessage(chatId, {
        text: '*❌ Andika tweet unayotaka!*\n\n📝 *Mfano:* `.tweet Habari kutoka Mickey Glitch`'
      }, { quoted: message });
    }

    const displayName = message.pushName || (message.key?.participant || message.key?.remoteJid || 'user').split('@')[0];
    const username = (message.key?.participant || message.key?.remoteJid || 'user').split('@')[0];
    const avatar = 'https://telegra.ph/file/24fa902ead26340f3df2c.png';

    const url = `https://some-random-api.com/canvas/misc/tweet?displayname=${encodeURIComponent(displayName)}&username=${encodeURIComponent(username)}&avatar=${encodeURIComponent(avatar)}&comment=${encodeURIComponent(text)}&replies=69&retweets=69&theme=dark`;

    await sock.sendMessage(chatId, { text: '⏳ *Kutengeneza fake tweet...*' }, { quoted: message });

    const { data } = await axios.get(url, { responseType: 'arraybuffer' });
    await sock.sendMessage(chatId, {
      image: Buffer.from(data),
      caption: '*🐦 FAKE TWEET IMEJIFANYA KWELI*'
    }, { quoted: message });
  } catch (error) {
    console.error('Tweet command error:', error);
    await sock.sendMessage(chatId, {
      text: `❌ *Hitilafu:* ${error.message || 'Kuna tatizo na amri hii'}`
    }, { quoted: message });
  }
};

module.exports = tweetCommand;
