// ───────────────────────────────────────────────
//  MODERN PREMIUM HELP MENU
// ───────────────────────────────────────────────
const axios = require("axios");
const settings = require('../settings');

/**
 * Dynamic Uptime
 */
function getUptime() {
  const uptime = process.uptime();
  const h = Math.floor(uptime / 3600);
  const m = Math.floor((uptime % 3600) / 60);
  const s = Math.floor(uptime % 60);
  return `${h}h ${m}m ${s}s`;
}

/**
 * Main HELP MESSAGE – Premium Glitch Style
 */
const HELP = `
╭━━━━━━━━━━━━━━━━━━━━━━━━╮
      MICKEY GLITCH
      ✧ Premium Bot ✧
╰━━━━━━━━━━━━━━━━━━━━━━━━╯

Name: ${settings.botName || 'Mickey Glitch'}
Owner: ${settings.ownerName || 'Mozy24'}
Version: ${settings.version || '3.0.5'}
Uptime: ${getUptime()}
Prefix: ${settings.prefix || '.'}

Usage:
- Send ${settings.prefix || '.'}help <command> for details about a command
- Example: ${settings.prefix || '.'}play Despacito

Quick categories (use ${settings.prefix || '.'}help <command>):
- General: help, ping, alive, owner, jid, url, ss, tts
- Group: ban, promote, demote, mute, unmute, kick, add, tagall, resetlink
- Moderation: antilink, antibadword, antidelete, antistatusmention
- Media & Stickers: sticker, simage, blur, tgsticker, take, emojimix
- AI/Chat: gpt, gemini, imagine, chatbot
- Downloads: play, song, spotify, instagram, tiktok, ytmp4

Tips:
- Admin-only commands require the bot to be an admin.
- Use mentions like @user when the command needs a target.
- Configure settings with the ${settings.prefix || '.'}settings command.

Need help or want a feature? Contact the owner: ${settings.ownerContact || 'https://github.com'}

╭━━━━━━━━━━━━━━━━━━━━╮
  ✨ Mickey Glitch Bot ✨
╰━━━━━━━━━━━━━━━━━━━━╯
`;

/**
 * Send premium help menu
 */
module.exports = async (sock, chatId, message) => {
  try {
    const botname = settings.botName || 'Mickey Glitch';
    const banner = settings.bannerUrl || settings.menuBannerUrl || 'https://water-billimg.onrender.com/1761205727440.png';
    const sourceUrl = settings.homepage || settings.website || settings.updateZipUrl || 'https://github.com';

    await sock.sendMessage(chatId, {
      text: HELP.trim(),
      contextInfo: {
        isForwarded: true,
        forwardingScore: 999,
        externalAdReply: {
          title: `${botname} ✧ Menu`,
          body: `Glitch Power Active • Use .help for commands`,
          thumbnailUrl: banner,
          sourceUrl: sourceUrl,
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: message });
  } catch (err) {
    console.error("Help menu error:", err);
    await sock.sendMessage(chatId, { text: "⚠️ Error sending help menu." });
  }
};

// Provide a helper for main.js to auto-discover commands
module.exports.getAllCommands = function () {
  try {
    const set = new Set();

    if (global.plugins && typeof global.plugins === 'object') {
      for (const key in global.plugins) {
        const plugin = global.plugins[key];
        if (!plugin || plugin.disabled) continue;
        const cmds = Array.isArray(plugin.command) ? plugin.command : (plugin.command ? [plugin.command] : []);
        for (const c of cmds) {
          if (typeof c !== 'string') continue;
          set.add(c.replace(/^\^?\/?\.?/, '').toLowerCase());
        }
      }
    }

    const dir = __dirname;
    const files = require('fs').readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'help.js');
    for (const file of files) {
      try {
        const p = require('path').join(dir, file);
        delete require.cache[require.resolve(p)];
        const mod = require(p);
        if (mod) {
          if (Array.isArray(mod.command)) {
            for (const c of mod.command) if (typeof c === 'string') set.add(c.replace(/^\^?\/?\.?/, '').toLowerCase());
          } else if (typeof mod.command === 'string') {
            set.add(mod.command.replace(/^\^?\/?\.?/, '').toLowerCase());
          }
        }
        set.add(file.replace('.js', '').toLowerCase());
      } catch (e) {
        // ignore
      }
    }

    return Array.from(set).sort();
  } catch (e) {
    return [];
  }
};