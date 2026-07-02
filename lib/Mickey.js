const settings = require('../settings');

async function handleConnection(mickeySock, UI) {
  const myNumber = mickeySock.user?.id?.split(':')?.[0] + "@s.whatsapp.net";
  const currentTanzaniaTime = new Date().toLocaleString('en-US', { timeZone: 'Africa/Dar_es_Salaam' });
  const botDisplay = settings.botName || settings.botname || 'Mickey Glitch Bot';
  const botStartTime = Date.now();
  global.botStartTime = botStartTime;

  // Connection message - Short and clean
  const connectionText = `🚀 *${botDisplay} | ONLINE*

🟢 Connected & Ready
⏱️ ${currentTanzaniaTime}

💡 Commands: *.menu*, *.alive*, *.ping*

_Mickey Glitch Technology™_`;

  try {
    if (myNumber) {
      try {
        // MUUNDO WA PICHA KUBWA NA KUVUTIA (LARGE, IMPRESSIVE PREVIEW CARD)
        await mickeySock.sendMessage(myNumber, {
          text: connectionText,
          contextInfo: {
            forwardingScore: 999,
            isForwarded: false,
            externalAdReply: {
              title: `⚡ ${botDisplay} | LIVE & READY ⚡`,
              body: `🎉 System Synchronized Successfully\n🟢 All Systems OPERATIONAL\n⏱️ ${currentTanzaniaTime}`,
              mediaType: 1, // 1 = Image (Kubwa zaidi)
              previewType: "PHOTO",
              thumbnailUrl: "https://raw.githubusercontent.com/Mickeydeveloper/water-billing/main/1761205727440.jpg",
              sourceUrl: "https://github.com/Mickeydeveloper/Mickey-Glitch",
              renderLargerThumbnail: true,
              showAdAttribution: true
            }
          }
        });
        UI.success('🎯 Connection Status Broadcast Transmitted Successfully (LARGE AD FORMAT)!');
      } catch (imgErr) {
        // Fallback - send without image preview
        await mickeySock.sendMessage(myNumber, { text: connectionText });
        UI.warning('⚠️ Image preview unavailable - Text-only status sent.');
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
