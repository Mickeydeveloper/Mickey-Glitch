const moment = require('moment-timezone');

const tagsMap = {
  main: '💗 Information',
  downloader: '📥 Downloads',
  group: '👥 Groups',
  owner: '👑 Creator',
  tools: '🧰 Tools',
  sticker: '🌈 Stickers'
};

const menuCommand = async (conn, m, text, usedPrefix, command) => {
  try {
    // 1. Basic Setup
    const name = await conn.getName(m.sender);
    const uptime = clockString(process.uptime() * 1000);
    const date = moment.tz('Africa/Nairobi').format('DD/MM/YYYY');
    
    // 2. Database Safety
    const user = global.db?.data?.users?.[m.sender] || { limit: 0 };

    // 3. Command Filtering & Grouping
    const groups = {};
    const plugins = Object.values(global.plugins).filter(p => !p.disabled);

    plugins.forEach(plugin => {
      if (!plugin.tags) return;
      const tags = Array.isArray(plugin.tags) ? plugin.tags : [plugin.tags];
      
      tags.forEach(tag => {
        if (!groups[tag]) groups[tag] = [];
        
        let cmds = [];
        if (Array.isArray(plugin.command)) cmds = plugin.command;
        else if (plugin.command instanceof RegExp) cmds = [plugin.command.source];
        else cmds = [plugin.command];

        cmds.forEach(cmd => {
          const clean = typeof cmd === 'string' ? cmd.replace(/^\^|\/|\.|\?|\[|\]|\$|\(|\)|\|/g, '') : '';
          if (clean) groups[tag].push(clean);
        });
      });
    });

    // 4. Build Professional Menu
    let menuBody = `╭─◇ *ᴍɪᴄᴋᴇʏ ɢʟɪᴛᴄʜ* ◇─╮\n`;
    menuBody += `│ 🙋 *User:* ${name}\n`;
    menuBody += `│ 🏷 *Limit:* ${user.limit || 0}\n`;
    menuBody += `│ ⏳ *Uptime:* ${uptime}\n`;
    menuBody += `│ 📅 *Date:* ${date}\n`;
    menuBody += `╰──────────────╯\n`;

    const sortedTags = Object.keys(groups).sort();
    sortedTags.forEach(tag => {
      const sectionName = tagsMap[tag] || `📚 ${tag.toUpperCase()}`;
      menuBody += `\n╭─── *${sectionName}* ───╮\n`;
      let uniqueCmds = [...new Set(groups[tag])].sort();
      uniqueCmds.forEach(cmd => {
        menuBody += `│ • ${usedPrefix}${cmd}\n`;
      });
      menuBody += `╰─────────────────────╯\n`;
    });

    menuBody += `\n✨ *Powered by Mickey From Tanzania* ✨`;

    // 5. Send Message
    await conn.sendMessage(m.chat, {
      text: menuBody.trim(),
      contextInfo: {
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: '120363398106360290@newsletter',
          newsletterName: 'Mickey From Tanzania',
          serverMessageId: -1
        },
        externalAdReply: {
          title: `ᴍɪᴄᴋᴇʏ ɢʟɪᴛᴄʜ ʙᴏᴛ`,
          body: `Bot menu active for ${name}`,
          thumbnailUrl: 'https://water-billimg.onrender.com/1761205727440.png',
          sourceUrl: 'https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26',
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: m });

  } catch (error) {
    console.error('Menu Error:', error);
    conn.sendMessage(m.chat, { text: '❌ An error occurred while generating the menu.' }, { quoted: m });
  }
};

// Helper function for Uptime
function clockString(ms) {
  let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000);
  let m = isNaN(ms) ? '--' : Math.floor((ms % 3600000) / 60000);
  let s = isNaN(ms) ? '--' : Math.floor((ms % 60000) / 1000);
  return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':');
}

// THE EXPORT SYSTEM YOU REQUESTED
module.exports = menuCommand;
