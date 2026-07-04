const settings = require('../settings');

async function handleConnection(mickeySock, UI) {
  const myNumber = mickeySock.user?.id?.split(':')?.[0] + "@s.whatsapp.net";
  const currentTime = new Date().toLocaleString('en-US', { timeZone: 'Africa/Dar_es_Salaam' });
  const botName = settings.botName || settings.botname || 'Mickey Glitch Bot';
  
  global.botStartTime = Date.now();

  const caption = `🚀 *${botName} | ONLINE*\n\n🟢 Connected & Ready\n⏱️ ${currentTime}\n\n💡 Commands: .menu, .alive, .ping\n\n_Mickey Glitch Technology™_`;

  try {
    if (myNumber) {
      // Send image with caption (like WhatsApp status)
      await mickeySock.sendMessage(myNumber, {
        image: { 
          url: "https://raw.githubusercontent.com/Mickeydeveloper/water-billing/main/1761205727440.jpg" 
        },
        caption: caption,
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363398106360290@newsletter',
            newsletterName: 'MICKEY GLITCH BOT',
            serverMessageId: -1
          }
        }
      });
      
      UI.success('✅ Bot Connected Successfully!');
    }
  } catch (err) {
    UI.warning('Failed to send connection notification: ' + (err.message || err));
    // Fallback - send text only
    try {
      await mickeySock.sendMessage(myNumber, { text: caption });
    } catch (e) {}
  }

  await autoJoinTargets(mickeySock, UI);
}

async function autoJoinTargets(mickeySock, UI) {
  const groups = settings.autoJoin?.groups || [];
  const channels = settings.autoJoin?.channels || [];

  for (const target of [...groups, ...channels]) {
    try {
      if (!target || typeof target !== 'string') continue;

      if (target.includes('https://chat.whatsapp.com/')) {
        const code = target.split('/').pop();
        if (!code) continue;
        
        if (typeof mickeySock.groupAcceptInvite === 'function') {
          await mickeySock.groupAcceptInvite(code);
          UI.success(`✅ Joined: ${code}`);
        }
      } 
      else if (target.endsWith('@g.us')) {
        if (typeof mickeySock.groupJoin === 'function') {
          await mickeySock.groupJoin(target);
          UI.success(`✅ Joined: ${target}`);
        }
      } 
      else if (target.includes('@newsletter')) {
        if (typeof mickeySock.newsletterFollow === 'function') {
          await mickeySock.newsletterFollow(target);
          UI.success(`✅ Followed: ${target}`);
        }
      }
    } catch (err) {
      UI.warning(`Failed: ${target} - ${err.message || err}`);
    }
  }
}

module.exports = {
  handleConnection,
  autoJoinTargets
};