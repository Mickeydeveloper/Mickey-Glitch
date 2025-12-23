const axios = require("axios");
const settings = require('../settings');

/**
 * Dynamic Uptime Formatter
 */
function getUptime() {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  return `${hours}h ${minutes}m ${seconds}s`;
}

/**
 * Premium Modern Help Menu – Clean & Elegant Design
 */
const HELP = `
╔══════════════════════════════════════════╗
║          ✦ ${settings.botName || 'Mickey Glitch'} ✦          
║             ━━━ Premium Edition ━━━             
╚══════════════════════════════════════════╝

◈ Bot    : ${settings.botName || 'Mickey Glitch'}
◈ Owner  : \( {settings.botOwner || 'Mozy24'} ( \){settings.ownerNumber ? '+' + settings.ownerNumber : 'Contact'})
◈ Version: ${settings.version || '3.0.5'}
◈ Uptime : ${getUptime()}
◈ Status : ✅ Online & Fully Active

╔━━━━━━━━━━✦ Command Menu ✦━━━━━━━━━━╗

✦ General Commands
 • help • menu • ping • alive
 • halotel • phone • tts • owner
 • attp • lyrics • groupinfo • staff
 • vv • trt • ss • jid • url • fancy

✦ Group Management
 • ban @user          • promote @user
 • demote @user       • mute <min>
 • unmute             • delete | del
 • kick @user         • kick all
 • add <number>       • warn @user
 • antilink           • antibadword
 • clear              • tag • tagall
 • tagnotadmin        • hidetag <msg>
 • chatbot            • resetlink
 • antitag <on/off>   • welcome <on/off>
 • goodbye <on/off>   • setgdesc • setgname
 • setgpp

✦ Bot Settings
 • mode <public/private>
 • clearsession • antidelete • cleartmp
 • update • settings • setpp
 • autoreact <on/off>     • autostatus <on/off>
 • autostatus react      • autotying <on/off>
 • autoread <on/off>      • anticall <on/off>
 • pmblocker <on/off/status>
 • pmblocker setmsg <text>
 • setmention • mention <on/off>

✦ Media & Stickers
 • sticker • simage • tgsticker <link>
 • take <packname> • emojimix <emoji1>+<emoji2>
 • blur <reply img> • igs • igsc <link>

✦ AI Powered
 • gpt <question>     • gemini <question>
 • imagine <prompt>

✦ Fun Effects
 • compliment @user   • character @user
 • wasted @user       • stupid @user

✦ Logo Makers
 • metallic • ice • snow • impressive
 • matrix • light • neon • devil
 • purple • thunder • leaves • 1917
 • arena • hacker • sand • blackpink
 • glitch • fire <text>

✦ Downloader
 • play • song • video • spotify
 • instagram • facebook • tiktok • ytmp4 <link>

✦ Meme Templates
 • heart • horny • circle • lgbt
 • lolice • its-so-stupid • namecard
 • oogway • tweet • ytcomment
 • comrade • gay • glass • jail
 • passed • triggered

✦ Anime Reactions
 • neko • waifu • loli • nom • poke
 • cry • kiss • pat • hug • wink • facepalm

╚━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╝
     ✨ Powered by Mickey Glitch ✨
`.trim();

/**
 * Send Premium Help Menu with Thumbnail & Button-like Ad
 */
module.exports = async (sock, chatId, message) => {
  try {
    const botName = settings.botName || 'Mickey Glitch';
    const banner = settings.bannerUrl || settings.menuBannerUrl || 'https://water-billimg.onrender.com/1761205727440.png';
    const sourceUrl = settings.homepage || settings.website || settings.updateZipUrl || 'https://github.com';

    await sock.sendMessage(chatId, {
      text: HELP,
      contextInfo: {
        isForwarded: true,
        forwardingScore: 999,
        externalAdReply: {
          title: `✦ ${botName} Premium Menu ✦`,
          body: 'Tap to explore all commands • Active 24/7',
          thumbnailUrl: banner,
          sourceUrl: sourceUrl,
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: message });

  } catch (err) {
    console.error("Help menu error:", err);
    await sock.sendMessage(chatId, { 
      text: "⚠️ Failed to load help menu. Try again later." 
    }, { quoted: message });
  }
};

// Auto-discover commands for main.js
module.exports.getAllCommands = function () {
  try {
    const commands = new Set();

    // From global plugins
    if (global.plugins && typeof global.plugins === 'object') {
      for (const key in global.plugins) {
        const plugin = global.plugins[key];
        if (plugin?.disabled) continue;

        const cmds = Array.isArray(plugin.command) 
          ? plugin.command 
          : (plugin.command ? [plugin.command] : []);

        cmds.forEach(c => {
          if (typeof c === 'string') {
            commands.add(c.replace(/^\^?\/?\.?/, '').toLowerCase());
          }
        });
      }
    }

    // From local .js files
    const fs = require('fs');
    const path = require('path');
    const dir = __dirname;
    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.js') && f !== 'help.js');

    files.forEach(file => {
      try {
        const filePath = path.join(dir, file);
        delete require.cache[require.resolve(filePath)];
        const mod = require(filePath);

        if (mod) {
          const cmds = Array.isArray(mod.command)
            ? mod.command
            : (mod.command ? [mod.command] : []);

          cmds.forEach(c => {
            if (typeof c === 'string') {
              commands.add(c.replace(/^\^?\/?\.?/, '').toLowerCase());
            }
          });
        }

        // Add filename as fallback command
        commands.add(file.replace('.js', '').toLowerCase());
      } catch (e) {
        // Silent ignore
      }
    });

    return Array.from(commands).sort();
  } catch (e) {
    console.error("Error discovering commands:", e);
    return [];
  }
};