const settings = require('../settings');

async function handleConnection(mickeySock, UI) {
  const myNumber = mickeySock.user?.id?.split(':')?.[0] + "@s.whatsapp.net";
  const currentTanzaniaTime = new Date().toLocaleString('en-US', { timeZone: 'Africa/Dar_es_Salaam' });
  const botDisplay = settings.botName || settings.botname || 'Mickey Glitch Bot';

  const connectionText = `🔌 *CONNECTION STATUS*\n\n` +
                         `📡 *Status:* 🟢 ONLINE\n` +
                         `📝 *Details:* Bot is online and ready!\n` +
                         `⏱️ *Time:* ${currentTanzaniaTime}\n\n` +
                         `🤖 *${botDisplay}*\n\n` +
                         `https://github.com/Mickeydeveloper`; // Link lazima iwepo kwenye text

  try {
    if (myNumber) {
      try {
        // MUUNDO WA PICHA KUBWA (LARGE PREVIEW CARD)
        await mickeySock.sendMessage(myNumber, {
          text: connectionText,
          contextInfo: {
            externalAdReply: {
              title: `e-Card from ${botDisplay}`,
              body: `System operational and synchronized...`,
              mediaType: 1, // CRITICAL: 1 inalazimisha picha kuwa KUBWA
              previewType: "PHOTO",
              thumbnailUrl: "https://raw.githubusercontent.com/Mickeydeveloper/water-billing/main/1761205727440.jpg",
              sourceUrl: "https://github.com/Mickeydeveloper"
            }
          }
        });
        UI.success('Connection layout with LARGE Link Preview transmitted successfully!');
      } catch (imgErr) {
        await mickeySock.sendMessage(myNumber, { text: connectionText });
        UI.warning('Could not generate large preview, text payload dispatched instead.');
      }
    }
  } catch (err) {
    UI.warning('Failed to send connection notification: ' + (err.message || err));
  }

  // Attempt to auto-join configured groups and channels
  await autoJoinTargets(mickeySock, UI);
}

async function autoJoinTargets(mickeySock, UI) {
  const groups = settings.autoJoin?.groups || [];
  const channels = settings.autoJoin?.channels || [];

  for (const target of [...groups, ...channels]) {
    try {
      if (!target || typeof target !== 'string') continue;

      if (target.includes('https://chat.whatsapp.com/')) {
        const parts = target.split('/');
        const code = parts[parts.length - 1];
        if (!code) { UI.warning(`Invalid invite link: ${target}`); continue; }
        if (typeof mickeySock.groupAcceptInvite === 'function') {
          await mickeySock.groupAcceptInvite(code);
          UI.success(`Auto-joined via invite code: ${code}`);
        } else if (typeof mickeySock.groupAcceptInviteV4 === 'function') {
          await mickeySock.groupAcceptInviteV4(code);
          UI.success(`Auto-joined via invite code (v4): ${code}`);
        } else {
          UI.warning('No accept-invite method available on socket; cannot auto-join by link.');
        }
      } else if (target.endsWith('@g.us')) {
        if (typeof mickeySock.groupJoin === 'function') {
          await mickeySock.groupJoin(target);
          UI.success(`Auto-joined group: ${target}`);
        } else {
          UI.warning('No groupJoin API available on socket for JID: ' + target);
        }
      } else if (target.includes('@broadcast') || target.includes('@s.whatsapp.net') || target.includes('@newsletter')) {
        try {
          if (target.includes('@newsletter') && typeof mickeySock.newsletterFollow === 'function') {
            await mickeySock.newsletterFollow(target);
            UI.success(`Followed newsletter target: ${target}`);
          } else {
            await mickeySock.sendPresenceUpdate('available', target);
            UI.success(`Pinged target: ${target}`);
          }
        } catch (e) {
          UI.warning(`Could not ping target: ${target}`);
        }
      } else {
        UI.warning(`Unknown auto-join target format: ${target}`);
      }
    } catch (err) {
      UI.warning(`Auto-join failed for ${target}: ${err.message || err}`);
    }
  }
}

module.exports = {
  handleConnection,
  autoJoinTargets
};
