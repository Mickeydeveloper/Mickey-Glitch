// ──────────────────────────────────────────────────────────────
//  🎯 ADVANCED HELP SYSTEM - Interactive Command Browser
//  Auto-synced from `commands/` folder with categorization
// ──────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const os = require('os');
const settings = require('../settings');

/**
 * COMMAND CATEGORIES - Organize commands by function
 */
const COMMAND_CATEGORIES = {
  'admin': ['ban', 'unban', 'kick', 'promote', 'demote', 'mute', 'unmute', 'warn', 'warnings', 'clear'],
  'group': ['groupmanage', 'tagall', 'tagnotadmin', 'tag', 'mention', 'hidetag'],
  'fun': ['compliment', 'character', 'wasted', 'emojimix', 'textmaker'],
  'media': ['sticker', 'sticker-alt', 'stickercrop', 'stickertelegram', 'img-blur', 'video', 'url', 'lyrics'],
  'social': ['instagram', 'facebook', 'tiktok', 'spotify', 'youtube'],
  'download': ['play', 'igs', 'imagine'],
  'utility': ['ping', 'alive', 'update', 'checkupdates', 'settings', 'weather', 'translate', 'tts'],
  'owner': ['owner', 'pair', 'sudo', 'staff', 'resetlink', 'phone', 'halotel'],
  'auto': ['autostatus', 'autoread', 'autotyping', 'autobio', 'antitag', 'antidelete', 'antilink', 'antibadword'],
  'ai': ['ai', 'chatbot']
};

const EXCLUDE = ['help', 'index', 'main'];
const BANNER = 'https://water-billimg.onrender.com/1761205727440.png'; // currently unused

function getUptime() {
  const uptime = process.uptime();
  const hours   = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  return `${hours}h ${minutes}m ${seconds}s`;
}

function readMessageText(message) {
  if (!message) return '';
  return (
    message.message?.conversation ||
    message.message?.extendedTextMessage?.text ||
    message.message?.imageMessage?.caption ||
    message.message?.videoMessage?.caption ||
    ''
  ).trim();
}

function getCommandDescription(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.split(/\r?\n/).slice(0, 8);
    for (const ln of lines) {
      const t = ln.trim();
      if (!t) continue;
      if (t.startsWith('//')) return t.replace(/^\/\/\s?/, '').trim();
      if (t.startsWith('/*')) return t.replace(/^\/\*\s?/, '').replace(/\*\/$/, '').trim();
      if (t.startsWith('*')) return t.replace(/^\*\s?/, '').trim();
    }
  } catch (e) {}
  return '';
}

function getCategoryEmoji(category) {
  const emojis = {
    'admin': '👮',    'group': '👥',   'fun': '🎮',
    'media': '🎬',    'social': '📱',  'download': '⬇️',
    'utility': '⚙️',  'owner': '👑',  'auto': '🤖',
    'ai': '🧠'
  };
  return emojis[category] || '📦';
}

function listCommandFiles() {
  const commandsDir = __dirname;
  let files = [];
  try {
    files = fs.readdirSync(commandsDir);
  } catch (e) {
    return [];
  }

  return files
    .filter(f => f.endsWith('.js'))
    .map(f => path.basename(f, '.js'))
    .filter(name => !EXCLUDE.includes(name))
    .sort((a, b) => a.localeCompare(b))
    .map(name => {
      const fp = path.join(commandsDir, `${name}.js`);
      const desc = getCommandDescription(fp);
      let category = 'other';
      for (const [cat, cmds] of Object.entries(COMMAND_CATEGORIES)) {
        if (cmds.includes(name)) {
          category = cat;
          break;
        }
      }
      return { name, desc, category };
    });
}

function buildHelpMessage(cmdList, opts = {}) {
  const { runtime, mode, prefix, ramUsed, ramTotal, time, user, name } = opts;

  const grouped = {};
  for (const cat of Object.keys(COMMAND_CATEGORIES)) grouped[cat] = [];
  grouped['other'] = [];

  cmdList.forEach(cmd => {
    (grouped[cmd.category] || grouped['other']).push(cmd);
  });

  let content = `🎯 *\( {settings.botName || '𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑'} COMMAND LIST* v \){settings.version || '?.?'}\n\n`;

  content += `▸ Uptime  : ${runtime}\n`;
  content += `▸ Mode    : ${mode || settings.commandMode || 'public'}\n`;
  content += `▸ Prefix  : ${prefix || '.'}\n`;
  content += `▸ RAM     : ${ramUsed} / ${ramTotal} GB\n`;
  content += `▸ Time    : ${time}\n`;
  content += `▸ User    : ${name || user || 'Unknown'}\n\n`;

  for (const [category, cmds] of Object.entries(grouped)) {
    if (cmds.length === 0) continue;

    const emoji = getCategoryEmoji(category);
    const title = category.charAt(0).toUpperCase() + category.slice(1);

    content += `\( {emoji} * \){title}* (${cmds.length})\n`;

    cmds.forEach(cmd => {
      const desc = cmd.desc ? ` — ${cmd.desc}` : '';
      content += `• \( {prefix} \){cmd.name}${desc}\n`;
    });
    content += '\n';
  }

  content += `━━━━━━━━━━━━━━━━━━\n`;
  content += `✨ Total commands: ${cmdList.length}  |  Prefix: ${prefix}\n`;
  content += `━━━━━━━━━━━━━━━━━━`;

  return content;
}

const FALLBACK = `*Help*\nUnable to generate command list right now. Try again later.`;

async function helpCommand(sock, chatId, message) {
  if (!sock || !chatId) return console.error('Missing sock or chatId');

  try {
    // ─── Gather info ───────────────────────────────────────
    const runtime   = getUptime();
    const mode      = settings.commandMode || 'public';
    const prefix    = settings.prefix || '.';
    const timeNow   = new Date().toLocaleTimeString('en-GB', { hour12: false });
    const memUsedGB = (process.memoryUsage().rss / 1024 ** 3).toFixed(2);
    const memTotalGB= (os.totalmem()         / 1024 ** 3).toFixed(2);

    let displayName = 'Unknown';
    let userId      = 'Unknown';

    try {
      const sender = message?.key?.participant || message?.key?.from || message?.sender;
      if (sender) {
        const jid = String(sender);
        userId = jid.split('@')[0];
        displayName = (typeof sock.getName === 'function')
          ? (await sock.getName(jid) || userId)
          : userId;
      }
    } catch {}

    const cmdList = listCommandFiles();
    if (!cmdList.length) {
      await sock.sendMessage(chatId, { text: FALLBACK });
      return;
    }

    let helpText = buildHelpMessage(cmdList, {
      runtime,
      mode,
      prefix,
      ramUsed: memUsedGB,
      ramTotal: memTotalGB,
      time: timeNow,
      user: userId,
      name: displayName
    });

    // ─── Split if message is too long (> ~3900 chars safe margin) ───
    const MAX_LEN = 3900;
    if (helpText.length <= MAX_LEN) {
      await sock.sendMessage(chatId, { text: helpText }, { quoted: message });
      return;
    }

    // Simple split (you can improve this with better chunking)
    const parts = [];
    let current = '';
    const lines = helpText.split('\n');

    for (const line of lines) {
      if (current.length + line.length + 1 > MAX_LEN) {
        parts.push(current);
        current = line + '\n';
      } else {
        current += line + '\n';
      }
    }
    if (current) parts.push(current);

    // Send sequentially
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const caption = i === 0 ? '📚 Command List (part 1)' : `📚 Command List (part ${i+1})`;
      await sock.sendMessage(chatId, {
        text: part.trimEnd(),
        footer: caption
      }, { quoted: message });
      // small delay to prevent rate limiting in some clients
      await new Promise(r => setTimeout(r, 800));
    }

  } catch (error) {
    console.error('helpCommand error:', error);
    const msg = `*Error occurred*\n\( {error?.message || 'Unknown error'}\n\n \){FALLBACK}`;
    await sock.sendMessage(chatId, { text: msg }, { quoted: message });
  }
}

module.exports = helpCommand;