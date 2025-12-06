// ───────────────────────────────────────────────
//  MR LOFT – SIMPLE NORMAL HELP MENU
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
 * Main HELP MESSAGE (Single Text)
 */
const HELP = `
╭▰▰〔 *ᴍɪᴄᴋᴇʏ ɢʟɪᴛᴄʜ ʙᴏᴛ* 〕▰▰╮
✖ 💠 *ʙᴏᴛ ɴᴀᴍᴇ:* ᴍɪᴄᴋᴇʏ ɢʟɪᴛᴄʜ
✖ 👑 *ᴏᴡɴᴇʀ:* Mickey mozy
✖ ⚙️ *ᴠᴇʀꜱɪᴏɴ:* 3.0.5
✖ 🕐 *ᴜᴘᴛɪᴍᴇ:* ${getUptime()}
▰▰▰▰▰▰▰▰▰▰
 ᵂᴱᴸᶜᴼᴹᴱ ᴹᴵᶜᴷᴱʸ ᶜᴸᴵᵀᶜᴴ ᴮᴼᵀ ᵁˢᴱᴿˢ
▰▰▰▰▰▰▰▰▰▰

# ᴘᴀɢᴇ 01
✖ help | .menu
✖ ping
✖ alive
✖ tts <text>
✖ owner
✖ attp <text>
✖ lyrics <song>
✖ groupinfo
✖ staff | .admins
✖ vv
✖ trt <text> <lang>
✖ ss <link>
✖ jid
✖ url
✖ fancy

# ᴘᴀɢᴇ 02
✖ ban @user
✖ promote @user
✖ demote @user
✖ mute <minutes>
✖ unmute
✖ delete | .del
✖ kick @user
✖ add <number>
✖ warn @user
✖ antilink
✖ antibadword
✖ clear
✖ tag <text>
✖ tagall
✖ tagnotadmin
✖ hidetag <msg>
✖ chatbot
✖ resetlink
✖ antitag <on/off>
✖ welcome <on/off>
✖ goodbye <on/off>
✖ setgdesc <desc>
✖ setgname <name>
✖ setgpp

# ᴘᴀɢᴇ 03
✖ mode <public/private>
✖ clearsession
✖ antidelete
✖ cleartmp
✖ update
✖ settings
✖ setpp
✖ autoreact <on/off>
✖ autostatus <on/off>
✖ autostatus react <on/off>
✖ autotying <on/off>
✖ autoread <on/off>
✖ anticall <on/off>
✖ pmblocker <on/off/status>
✖ pmblocker setmsg <text>
✖ setmention
✖ mention <on/off>

# ᴘᴀɢᴇ 04
✖ blur <image>
✖ simage
✖ sticker
✖ tgsticker <link>
✖ take <packname>
✖ emojimix <emoji1>+<emoji2>
✖ igs <insta link>
✖ igsc <insta link>

# ᴘᴀɢᴇ 07
✖ gpt <question>
✖ gemini <question>
✖ imagine <prompt>

# ᴘᴀɢᴇ 08
✖ compliment @user
✖ character @user
✖ wasted @user
✖ stupid @user [text]

# ᴘᴀɢᴇ 09
✖ metallic <text>
✖ ice <text>
✖ snow <text>
✖ impressive <text>
✖ matrix <text>
✖ light <text>
✖ neon <text>
✖ devil <text>
✖ purple <text>
✖ thunder <text>
✖ leaves <text>
✖ 1917 <text>
✖ arena <text>
✖ hacker <text>
✖ sand <text>
✖ blackpink <text>
✖ glitch <text>
✖ fire <text>

# ᴘᴀɢᴇ 10
✖ play <song>
✖ song <song>
✖ spotify <query>
✖ instagram <link>
✖ facebook <link>
✖ tiktok <link>
✖ video <song>
✖ ytmp4 <link>

# ᴘᴀɢᴇ 11
✖ heart
✖ horny
✖ circle
✖ lgbt
✖ lolice
✖ its-so-stupid
✖ namecard
✖ oogway
✖ tweet
✖ ytcomment
✖ comrade
✖ gay
✖ glass
✖ jail
✖ passed
✖ triggered

# ᴘᴀɢᴇ 12
✖ neko
✖ waifu
✖ loli
✖ nom
✖ poke
✖ cry
✖ kiss
✖ pat
✖ hug
✖ wink
✖ facepalm
`;

/**
 * Send normal help menu
 */
module.exports = async (sock, chatId, message) => {
  try {
    const botname = settings.botName || 'Mickey Glitch';
    const banner = settings.bannerUrl || settings.menuBannerUrl || 'https://water-billimg.onrender.com/1761205727440.png';
    const sourceUrl = settings.homepage || settings.website || settings.updateZipUrl || 'https://github.com';

    // Send the help text with an externalAdReply so it appears as a banner (like in `alive.js`).
    await sock.sendMessage(chatId, {
      text: HELP.trim(),
      contextInfo: {
        isForwarded: true,
        forwardingScore: 999,
        externalAdReply: {
          title: `${botname} Help`,
          body: `${settings.description || 'Bot Help Menu'}`,
          thumbnailUrl: banner,
          sourceUrl: sourceUrl,
          mediaType: 1,
          showAdAttribution: false,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: message });
  } catch (err) {
    console.error("Help menu error:", err);
    await sock.sendMessage(chatId, { text: "Error sending help menu." });
  }
};

// Provide a helper for main.js to auto-discover commands (used for no-prefix support)
module.exports.getAllCommands = function () {
  try {
    const set = new Set();

    // PRIMARY: try global.plugins (if bot uses plugin system like alive.js)
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

    // FALLBACK: scan commands directory for filenames and exported `command` property
    const dir = __dirname;
    const files = require('fs').readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'help.js');
    for (const file of files) {
      try {
        const p = require('path').join(dir, file);
        delete require.cache[require.resolve(p)];
        const mod = require(p);
        // exported `command` property (string or array)
        if (mod) {
          if (Array.isArray(mod.command)) {
            for (const c of mod.command) if (typeof c === 'string') set.add(c.replace(/^\^?\/?\.?/, '').toLowerCase());
          } else if (typeof mod.command === 'string') {
            set.add(mod.command.replace(/^\^?\/?\.?/, '').toLowerCase());
          }
        }
        // always add filename (without extension) as fallback
        set.add(file.replace('.js', '').toLowerCase());
      } catch (e) {
        // ignore problematic module
      }
    }

    return Array.from(set).sort();
  } catch (e) {
    return [];
  }
};
