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
        *MICKEY GLITCH BOT* 
           ✧ Premium Bot ✧
╰━━━━━━━━━━━━━━━━━━━━━━━━╯

🔹 *Bot Name:* Mickey Glitch
🔹 *Owner:* Mozy24
🔹 *Version:* 3.0.5
🔹 *Uptime:* ${getUptime()}
🔹 *Database:* Zenith Base
🔹 *Status:* ✅ Online & Active

╭━━━━━━━━━━━━━━━━━━━━━━━━╮
    Welcome to Glitch Power!
╰━━━━━━━━━━━━━━━━━━━━━━━━╯ 


🔹 * • General Commands*
🔹 help | menu
🔹 ping
🔹 alive
🔹 halotel <gb number>
🔹 phone <device name>
🔹 tts <text>
🔹 owner
🔹 attp <text>
🔹 lyrics <song>
🔹 groupinfo
🔹 staff | admins
🔹 vv
🔹 trt <text> <lang>
🔹 ss <link>
🔹 jid
🔹 url
🔹 fancy

🔹 *• Group Management*
🔹 ban @user
🔹 promote @user
🔹 demote @user
🔹 mute <minutes>
🔹 unmute
🔹 delete | del
🔹 kick @user
🔹 add <number>
🔹 warn @user
🔹 antilink
🔹 antibadword
🔹 clear
🔹 tag <text>
🔹 tagall
🔹 tagnotadmin
🔹 hidetag <msg>
🔹 chatbot
🔹 resetlink
🔹 antitag <on/off>
🔹 welcome <on/off>
🔹 goodbye <on/off>
🔹 setgdesc <desc>
🔹 setgname <name>
🔹 setgpp

🔹 *• Bot Settings*
🔹 mode <public/private>
🔹 clearsession
🔹 antidelete
🔹 cleartmp
🔹 update
🔹 settings
🔹 setpp
🔹 autoreact <on/off>
🔹 autostatus <on/off>
🔹 autostatus react <on/off>
🔹 autotying <on/off>
🔹 autoread <on/off>
🔹 anticall <on/off>
🔹 pmblocker <on/off/status>
🔹 pmblocker setmsg <text>
🔹 setmention
🔹 mention <on/off>

🔹 * • Media & Stickers*
🔹 blur <reply image>
🔹 simage
🔹 sticker
🔹 tgsticker <link>
🔹 take <packname>
🔹 emojimix <emoji1>+<emoji2>
🔹 igs <insta link>
🔹 igsc <insta link>

🔹 *• AI Commands*
🔹 gpt <question>
🔹 gemini <question>
🔹 imagine <prompt>

🔹 * Fun Effects*
🔹 compliment @user
🔹 character @user
🔹 wasted @user
🔹 stupid @user [text]

🔹 * • Logo Makers*
🔹 metallic <text>
🔹 ice <text>
🔹 snow <text>
🔹 impressive <text>
🔹 matrix <text>
🔹 light <text>
🔹 neon <text>
🔹 devil <text>
🔹 purple <text>
🔹 thunder <text>
🔹 leaves <text>
🔹 1917 <text>
🔹 arena <text>
🔹 hacker <text>
🔹 sand <text>
🔹 blackpink <text>
🔹 glitch <text>
🔹 fire <text>

🔹 *• Downloader*
🔹 play <song>
🔹 song <song>
🔹 spotify <query>
🔹 instagram <link>
🔹 facebook <link>
🔹 tiktok <link>
🔹 video <song>
🔹 ytmp4 <link>

🔹 *• Meme Templates*
🔹 heart
🔹 horny
🔹 circle
🔹 lgbt
🔹 lolice
🔹 its-so-stupid
🔹 namecard
🔹 oogway
🔹 tweet
🔹 ytcomment
🔹 comrade
🔹 gay
🔹 glass
🔹 jail
🔹 passed
🔹 triggered

🔹 *• Anime Reactions*
🔹 neko
🔹 waifu
🔹 loli
🔹 nom
🔹 poke
🔹 cry
🔹 kiss
🔹 pat
🔹 hug
🔹 wink
🔹 facepalm

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