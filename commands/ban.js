const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

const bannedFile = path.join(__dirname, '..', 'data', 'banned.json');

async function banCommand(sock, chatId, message) {
  try {
    const senderId = message.key.participant || message.key.remoteJid;
    const senderIsOwner = await isOwnerOrSudo(senderId, sock, chatId).catch(() => false);

    if (!message.key.fromMe && !senderIsOwner) {
      await sock.sendMessage(chatId, { text: 'Only owner/sudo can use this command.' }, { quoted: message });
      return;
    }

    // Determine target user: mentioned, replied-to, or argument
    let target;
    const ctx = message.message?.extendedTextMessage?.contextInfo;
    if (ctx?.mentionedJid?.length) target = ctx.mentionedJid[0];
    else if (ctx?.participant) target = ctx.participant;
    else {
      const text = (message.message?.conversation || message.message?.extendedTextMessage?.text || '').trim();
      const parts = text.split(/\s+/);
      if (parts[1]) {
        const raw = parts[1].replace(/^@/, '');
        target = raw.includes('@') ? raw : `${raw}@s.whatsapp.net`;
      }
    }

    if (!target) {
      await sock.sendMessage(chatId, { text: 'Please mention or reply to the user you want to ban.' }, { quoted: message });
      return;
    }

    if (!target.includes('@')) target = `${target}@s.whatsapp.net`;

    // Prevent banning the bot
    const botId = sock?.user?.id ? `${sock.user.id.split(':')[0]}@s.whatsapp.net` : null;
    if (botId && target === botId) {
      await sock.sendMessage(chatId, { text: 'You cannot ban the bot account.' }, { quoted: message });
      return;
    }

    // Read banned list
    let banned = [];
    try {
      const raw = fs.readFileSync(bannedFile, 'utf8');
      banned = JSON.parse(raw || '[]');
    } catch (e) {
      banned = [];
    }

    if (!Array.isArray(banned)) banned = [];

    if (banned.includes(target)) {
      await sock.sendMessage(chatId, { text: `User ${target.split('@')[0]} is already banned.` }, { quoted: message });
      return;
    }

    banned.push(target);
    fs.writeFileSync(bannedFile, JSON.stringify(banned, null, 2), 'utf8');

    await sock.sendMessage(chatId, { text: `Banned user: ${target.split('@')[0]}` }, { quoted: message });
  } catch (err) {
    console.error('banCommand error:', err);
    await sock.sendMessage(chatId, { text: 'Failed to ban user due to an internal error.' }, { quoted: message });
  }
}

module.exports = banCommand;
