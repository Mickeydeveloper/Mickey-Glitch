// ──────────────────────────────────────────────────────────────
//  🎯 ADVANCED HELP SYSTEM - Command List
//  Dynamically reads from commands/ folder
// ──────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const os = require('os');
const settings = require('../settings');

/**
 * Command Categories
 */
const COMMAND_CATEGORIES = {
  admin:    ['ban', 'unban', 'kick', 'promote', 'demote', 'mute', 'unmute', 'warn', 'warnings', 'clear'],
  group:    ['groupmanage', 'tagall', 'tagnotadmin', 'tag', 'mention', 'hidetag'],
  fun:      ['compliment', 'character', 'wasted', 'emojimix', 'textmaker'],
  media:    ['sticker', 'sticker-alt', 'stickercrop', 'stickertelegram', 'img-blur', 'video', 'url', 'lyrics'],
  social:   ['instagram', 'facebook', 'tiktok', 'spotify', 'youtube'],
  download: ['play', 'igs', 'imagine'],
  utility:  ['ping', 'alive', 'update', 'checkupdates', 'settings', 'weather', 'translate', 'tts'],
  owner:    ['owner', 'pair', 'sudo', 'staff', 'resetlink', 'phone', 'halotel'],
  auto:     ['autostatus', 'autoread', 'autotyping', 'autobio', 'antitag', 'antidelete', 'antilink', 'antibadword'],
  ai:       ['ai', 'chatbot']
};

const EXCLUDE_FILES = ['help', 'index', 'main'];

function getUptime() {
  const t = process.uptime();
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  return `${h}h ${m}m ${s}s`;
}

function getFirstComment(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/).slice(0, 12);
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      if (line.startsWith('//'))  return line.replace(/^\/\/\s*/, '').trim();
      if (line.startsWith('/*'))  return line.replace(/^\/\*\s?/, '').replace(/\*\/$/, '').trim();
      if (line.startsWith('*'))   return line.replace(/^\*\s?/, '').trim();
    }
  } catch {}
  return '';
}

function getCategoryEmoji(cat) {
  const map = {
    admin:    '👮‍♂️',
    group:    '👥',
    fun:      '🎭',
    media:    '🖼️',
    social:   '🌐',
    download: '⬇️',
    utility:  '🛠️',
    owner:    '👑',
    auto:     '🤖',
    ai:       '🧠',
    other:    '📦'
  };
  return map[cat] || '📦';
}

function loadCommands() {
  const dir = __dirname;
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch {
    return [];
  }

  return files
    .filter(f => f.endsWith('.js'))
    .map(f => path.basename(f, '.js'))
    .filter(name => !EXCLUDE_FILES.includes(name))
    .sort()
    .map(name => {
      const fullPath = path.join(dir, name + '.js');
      const desc = getFirstComment(fullPath);
      let category = 'other';

      for (const [catName, cmdList] of Object.entries(COMMAND_CATEGORIES)) {
        if (cmdList.includes(name)) {
          category = catName;
          break;
        }
      }

      return { name, desc, category };
    });
}

function buildHelpText(commands, options) {
  const { runtime, prefix, ramUsed, ramTotal, time, username } = options;
  const realPrefix = prefix || settings.prefix || '.';

  const groups = { other: [] };
  Object.keys(COMMAND_CATEGORIES).forEach(c => groups[c] = []);

  commands.forEach(cmd => {
    if (groups[cmd.category]) {
      groups[cmd.category].push(cmd);
    } else {
      groups.other.push(cmd);
    }
  });

  let text = `🎯 *\( {settings.botName || 'Mickey Glitch'} Commands*  v \){settings.version || '?.?'}\n\n`;

  text += `▸ Uptime    : ${runtime}\n`;
  text += `▸ Mode      : ${settings.commandMode || 'public'}\n`;
  text += `▸ Prefix    : ${realPrefix}\n`;
  text += `▸ RAM       : ${ramUsed} / ${ramTotal} GB\n`;
  text += `▸ Time      : ${time}\n`;
  text += `▸ User      : ${username || 'Unknown'}\n\n`;

  Object.entries(groups).forEach(([cat, cmdList]) => {
    if (cmdList.length === 0) return;

    const emoji = getCategoryEmoji(cat);
    const title = cat.charAt(0).toUpperCase() + cat.slice(1);

    text += `\( {emoji} * \){title}* (${cmdList.length})\n`;

    cmdList.forEach(cmd => {
      const desc = cmd.desc ? ` — ${cmd.desc}` : '';
      text += `  • \( {realPrefix} \){cmd.name}${desc}\n`;
    });

    text += '\n';
  });

  text += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `✨ Total: ${commands.length} commands   |   Prefix: ${realPrefix}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━`;

  return text;
}

const FALLBACK = `⚠️ Could not load command list right now.\nTry again or contact the owner.`;

async function helpCommand(sock, chatId, msg) {
  if (!sock || !chatId) return;

  try {
    const runtime = getUptime();
    const realPrefix = settings.prefix || '.';
    const now = new Date().toLocaleTimeString('en-GB', { hour12: false });
    const usedGB = (process.memoryUsage().rss / 1e9).toFixed(2);
    const totalGB = (os.totalmem() / 1e9).toFixed(2);

    let username = 'Unknown';
    try {
      const sender = msg?.key?.participant || msg?.key?.remoteJid;
      if (sender && sender.includes('@s.whatsapp.net')) {
        username = (await sock.getName?.(sender)) || sender.split('@')[0];
      }
    } catch {}

    const commands = loadCommands();

    if (!commands.length) {
      await sock.sendMessage(chatId, { text: FALLBACK }, { quoted: msg });
      return;
    }

    const helpContent = buildHelpText(commands, {
      runtime,
      prefix: realPrefix,
      ramUsed: usedGB,
      ramTotal: totalGB,
      time: now,
      username
    });

    // Safe sending (split if too long)
    const MAX = 3800;
    if (helpContent.length <= MAX) {
      await sock.sendMessage(chatId, { text: helpContent }, { quoted: msg });
      return;
    }

    // Split logic
    const chunks = [];
    let part = '';
    for (const line of helpContent.split('\n')) {
      if (part.length + line.length + 1 > MAX) {
        chunks.push(part.trimEnd());
        part = line + '\n';
      } else {
        part += line + '\n';
      }
    }
    if (part.trim()) chunks.push(part.trimEnd());

    for (let i = 0; i < chunks.length; i++) {
      await sock.sendMessage(chatId, {
        text: chunks[i]
      }, { quoted: msg });
      if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 800));
    }

  } catch (err) {
    console.error('help error:', err);
    await sock.sendMessage(chatId, {
      text: `Error: \( {err.message || 'failed'}\n\n \){FALLBACK}`
    }, { quoted: msg });
  }
}

module.exports = helpCommand;