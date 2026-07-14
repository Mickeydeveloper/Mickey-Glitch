const axios = require('axios');

const tweetCommand = async (sock, chatId, message) => {
  try {
    // Get the tweet text from the message
    const tweetText = message.message?.conversation?.trim() || 
                      message.message?.extendedTextMessage?.text?.trim() || '';
    
    // Remove the command prefix
    const text = tweetText.slice(6).trim(); // '.tweet' = 6 characters
    
    if (!text) {
      await sock.sendMessage(chatId, {
        text: '*❌ Andika tweet unayotaka!*\n\n📝 *Mfano:* `.tweet Habari kutoka Mickey Glitch`'
      }, {
        quoted: message
      });
      return;
    }

    // Get user information
    const senderJid = message.key?.participant || message.key?.remoteJid || 'unknown';
    const displayName = message.pushName || senderJid.split('@')[0];
    const username = senderJid.split('@')[0];
    
    // Get user avatar
    let avatar = 'https://telegra.ph/file/24fa902ead26340f3df2c.png';
    try {
      avatar = await sock.profilePictureUrl(senderJid, 'image');
    } catch (e) {
      // Use default avatar if profile picture not available
    }

    // Tweet API parameters
    const replies = '69';
    const retweets = '69';
    const theme = 'dark';

    // Construct the tweet image URL
    const url = `https://some-random-api.com/canvas/misc/tweet?displayname=${encodeURIComponent(displayName)}&username=${encodeURIComponent(username)}&avatar=${encodeURIComponent(avatar)}&comment=${encodeURIComponent(text)}&replies=${encodeURIComponent(replies)}&retweets=${encodeURIComponent(retweets)}&theme=${encodeURIComponent(theme)}`;

    // Send loading message
    await sock.sendMessage(chatId, {
      text: '⏳ *Kutengeneza fake tweet...*'
    }, {
      quoted: message
    });

    // Download and send the tweet image
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const imageBuffer = Buffer.from(response.data);

      await sock.sendMessage(chatId, {
        image: imageBuffer,
        caption: '*🐦 FAKE TWEET IMEJIFANYA KWELI*'
      }, {
        quoted: message
      });
    } catch (apiError) {
      await sock.sendMessage(chatId, {
        text: `❌ *Hitilafu:* Hakuweza kutengeneza tweet.\n\n*Sababu:* ${apiError.message || 'API error'}`
      }, {
        quoted: message
      });
    }

  } catch (error) {
    console.error('Tweet command error:', error);
    await sock.sendMessage(chatId, {
      text: `❌ *Hitilafu:* ${error.message || 'Kuna tatizo na amri hii'}`
    }, {
      quoted: message
    });
  }
};

module.exports = tweetCommand;
