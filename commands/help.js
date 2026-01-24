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
const BANNER = 'https://water-billimg.onrender.com/1761205727440.png';

function getUptime() {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
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
  } catch (e) {
    // ignore
  }
  return '';
}

function getCategoryEmoji(category) {
  const emojis = {
    'admin': '👮',
    'group': '👥',
    'fun': '🎮',
    'media': '🎬',
    'social': '📱',
    'download': '⬇️',
    'utility': '⚙️',
    'owner': '👑',
    'auto': '🤖',
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
  const cmds = files
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
  return cmds;
}

function buildHelpMessage(cmdList, opts = {}) {
  const { runtime, mode, prefix, ramUsed, ramTotal, time, user, name } = opts;

  // Group commands by category
  const grouped = {};
  for (const cat of Object.keys(COMMAND_CATEGORIES)) {
    grouped[cat] = [];
  }
  grouped['other'] = [];

  cmdList.forEach(cmd => {
    if (grouped[cmd.category]) {
      grouped[cmd.category].push(cmd);
    } else {
      grouped['other'].push(cmd);
    }
  });

  const header = `🎯 *${settings.botName || '𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑'} - COMMAND CENTER* v${settings.version || '?.?'}\n\n` +
    `▸ Runtime: ${runtime || getUptime()}\n` +
    `▸ Mode: ${mode || settings.commandMode || 'public'}\n` +
    `▸ Prefix: ${prefix || '.'}\n` +
    `▸ RAM: ${ramUsed || '?'} / ${ramTotal || '?'} GB\n` +
    `▸ Time: ${time || new Date().toLocaleTimeString('en-GB', { hour12: false })}\n` +
    `▸ User: ${name || user || 'Unknown'}\n\n`;

  let content = header;

  // Build categorized command list
  for (const [category, cmds] of Object.entries(grouped)) {
    if (cmds.length === 0) continue;
    
    const emoji = getCategoryEmoji(category);
    const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);
    content += `\n${emoji} *${categoryTitle}* (${cmds.length})\n`;
    
    cmds.forEach(cmd => {
      const nameStr = `${prefix}${cmd.name}`;
      const descStr = cmd.desc ? ` - ${cmd.desc}` : '';
      content += `• ${nameStr}${descStr}\n`;
    });
  }

  const total = cmdList.length;
  content += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  content += `✨ *Total:* ${total} | 📚 *Prefix:* ${prefix} | 📖 *Usage:* ${prefix}cmd [args]\n`;
  content += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  return content;
} 

const FALLBACK = `*Help*\nUnable to build dynamic help list.`;

async function helpCommand(sock, chatId, message) {
  if (!sock || !chatId) return console.error('Missing sock or chatId');

  try {
    const text = readMessageText(message);

    // Gather runtime & system info to display in header
    const runtime = getUptime();
    const mode = settings.commandMode || 'public';
    const prefix = settings.prefix || '.';
    const timeNow = new Date().toLocaleTimeString('en-GB', { hour12: false });
    const memUsedGB = (process.memoryUsage().rss / (1024 ** 3)).toFixed(2);
    const memTotalGB = (os.totalmem() / (1024 ** 3)).toFixed(2);

    // Determine requesting user (best-effort) and resolve display name where possible
    let senderJid = null;
    let userId = 'Unknown';
    let displayName = 'Unknown';
    try {
      const sender = message?.key?.participant || message?.key?.from || message?.sender || message?.participant;
      if (sender) {
        senderJid = typeof sender === 'string' ? sender : String(sender);
        userId = senderJid.split('@')[0];
        try {
          if (typeof sock.getName === 'function') {
            displayName = await sock.getName(senderJid);
          } else {
            displayName = userId;
          }
        } catch (e) {
          displayName = userId;
        }
      }
    } catch (e) {}

    const cmdList = listCommandFiles();
    if (!cmdList.length) {
      await sock.sendMessage(chatId, { text: FALLBACK });
      return;
    }

    const helpText = buildHelpMessage(cmdList, {
      runtime,
      mode,
      prefix,
      ramUsed: memUsedGB,
      ramTotal: memTotalGB,
      time: timeNow,
      user: userId,
      name: displayName
    });

    // Always send as document for better compatibility across all chats
    try {
      const tmpPath = path.join(os.tmpdir(), `help-${Date.now()}.txt`);
      fs.writeFileSync(tmpPath, helpText, 'utf8');
      const fileBuf = fs.readFileSync(tmpPath);
      
      await sock.sendMessage(chatId, {
        document: fileBuf,
        fileName: `help_${settings.botName?.replace(/\s+/g, '_') || 'bot'}_${new Date().toISOString().slice(0,10)}.txt`,
        mimetype: 'text/plain',
        caption: `📚 Help — Command List (v${settings.version || '?.?'})`
      });
      
      try { fs.unlinkSync(tmpPath); } catch (_) {}
      return;
    } catch (e) {
      console.error('Failed to send help as file:', e);
      // Fallback to text message
      await sock.sendMessage(chatId, { text: helpText });
      return;
    }

  } catch (error) {
    console.error('helpCommand Error:', error);
    const msg = `*Error:* ${error?.message || error}\n\n${FALLBACK}`;
    await sock.sendMessage(chatId, { text: msg }, { quoted: message });
  }
}

module.exports = helpCommand;