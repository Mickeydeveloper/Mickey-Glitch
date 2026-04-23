async function getProfilePictureCommand(sock, chatId, msg) {
  try {
    // Determine target JID: reply -> participant, mention -> first mentioned, else sender
    let targetJid = null;

    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    if (ctx?.mentionedJid && ctx.mentionedJid.length > 0) {
      targetJid = ctx.mentionedJid[0];
    } else if (ctx?.participant) {
      targetJid = ctx.participant;
    } else {
      targetJid = msg.key.participant || msg.key.remoteJid;
    }

    if (!targetJid) {
      await sock.sendMessage(chatId, { text: '⚠️ Please reply to a user or mention someone to get their profile picture.' }, { quoted: msg });
      return;
    }

    let ppUrl;
    try {
      ppUrl = await sock.profilePictureUrl(targetJid, 'image');
    } catch (e) {
      ppUrl = 'https://i.imgur.com/2wzGhpF.jpeg';
    }

    const caption = `📷 Profile picture of ${targetJid.split('@')[0]}`;

    await sock.sendMessage(chatId, {
      image: { url: ppUrl },
      caption: caption,
      mentions: [targetJid]
    }, { quoted: msg });

  } catch (error) {
    console.error('Error in getpp command:', error);
    try { await sock.sendMessage(chatId, { text: '❌ Failed to fetch profile picture.' }, { quoted: msg }); } catch (e) {}
  }
}

module.exports = getProfilePictureCommand;
