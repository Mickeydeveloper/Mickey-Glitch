const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs');

// Enhanced tags mapping
const tagsMap = {
  main: '💗 Information',
  jadibot: '🌟 Sub Bot',
  downloader: '📥 Downloads',
  game: '🎮 Games',
  gacha: '🎲 Gacha RPG',
  rg: '🔰 Registration',
  group: '👥 Groups',
  enable: '🎛️ Features',
  nsfw: '🔞 NSFW +18',
  tools: '🧰 Tools',
  sticker: '🌈 Stickers',
  econ: '💰 Economy',
  owner: '👑 Creator'
};

let handler = async (m, { conn, usedPrefix: _p }) => {
  try {
    const name = await conn.getName(m.sender);
    const fecha = moment.tz('Africa/Nairobi').format('DD/MM/YYYY');
    const hora = moment.tz('Africa/Nairobi').format('HH:mm:ss');
    const uptime = clockString(process.uptime() * 1000);
    
    // Database Safety
    const user = global.db?.data?.users?.[m.sender] || {};
    const totalreg = Object.keys(global.db?.data?.users || {}).length;
    const limit = user.limit || user.limite || 0;

    // Command Grouping Logic Fix
    let help = Object.values(global.plugins).filter(plugin => !plugin.disabled).map(plugin => {
      return {
        help: Array.isArray(plugin.tags) ? plugin.help : [plugin.help],
        tags: Array.isArray(plugin.tags) ? plugin.tags : [plugin.tags],
        prefix: 'customPrefix' in plugin,
        limit: plugin.limit,
        premium: plugin.premium,
        enabled: !plugin.disabled,
      };
    });

    const groups = {};
    for (let plugin of Object.values(global.plugins)) {
        if (!plugin || plugin.disabled) continue;
        
        // Ensure tags exists
        const tags = Array.isArray(plugin.tags) ? plugin.tags : (plugin.tags ? [plugin.tags] : ['main']);
        
        for (let tag of tags) {
            if (!(tag in groups)) groups[tag] = [];
            
            // Extract command strings
            let commands = [];
            if (plugin.command) {
                if (Array.isArray(plugin.command)) commands = plugin.command;
                else if (plugin.command instanceof RegExp) commands = [plugin.command.source];
                else commands = [plugin.command];
            }
            
            for (let cmd of commands) {
                // Clean the command string from regex junk
                const cleanCmd = typeof cmd === 'string' ? cmd.replace(/^\^|\/|\.|\?|\[|\]|\$|\(|\)|\|/g, '') : '';
                if (cleanCmd) groups[tag].push(cleanCmd);
            }
        }
    }

    // Header Text
    let menuBody = `╭─◇ *ᴍɪᴄᴋᴇʏ ɢʟɪᴛᴄʜ ʙᴏᴛ* ◇─╮
│ 🙋 *User:* ${name}
│ 🏷 *Limit:* ${limit}
│ 📅 *Date:* ${fecha}
│ ⏱ *Time:* ${hora}
│ ⏳ *Uptime:* ${uptime}
│ 👥 *Users:* ${totalreg}
╰──────────────╯\n`;

    // Sort and Build Sections
    const sortedTags = Object.keys(groups).sort();
    for (let tag of sortedTags) {
      if (!groups[tag].length) continue;
      const sectionName = tagsMap[tag] || `📚 ${tag.toUpperCase()}`;
      menuBody += `\n╭─── *${sectionName}* ───╮\n`;
      
      // Filter unique commands and sort
      let uniqueCmds = [...new Set(groups[tag])].sort();
      for (let cmd of uniqueCmds) {
        menuBody += `│ • ${_p}${cmd}\n`;
      }
      menuBody += `╰─────────────────────╯\n`;
    }

    menuBody += `\n✨ *Powered by Mickey From Tanzania* ✨`;

    // Send with Newsletter Forwarding
    await conn.sendMessage(m.chat, {
      text: menuBody.trim(),
      contextInfo: {
        mentionedJid: [m.sender],
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: '120363398106360290@newsletter',
          newsletterName: 'Mickey From Tanzania',
          serverMessageId: -1,
        },
        externalAdReply: {
          title: `ᴍɪᴄᴋᴇʏ ɢʟɪᴛᴄʜ ʙᴏᴛ v2.0`,
          body: `Bot connected successfully`,
          thumbnailUrl: 'https://water-billimg.onrender.com/1761205727440.png',
          sourceUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26',
          mediaType: 1,
          renderLargerThumbnail: true,
        }
      }
    }, { quoted: m });

  } catch (error) {
    console.error('CRITICAL ERROR IN MENU:', error);
    conn.reply(m.chat, '❌ *The menu encountered a glitch.*\nPlease contact the developer.', m);
  }
};

handler.help = ['menu', 'help'];
handler.tags = ['main'];
handler.command = /^(menu|help|commands|cmd)$/i;

module.exports = handler;

function clockString(ms) {
  let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000);
  let m = isNaN(ms) ? '--' : Math.floor((ms % 3600000) / 60000);
  let s = isNaN(ms) ? '--' : Math.floor((ms % 60000) / 1000);
  return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':');
}
