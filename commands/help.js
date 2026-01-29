// ──────────────────────────────────────────────────────────────
//  Help Command – Auto-generated from commands/ folder + TTS greeting
// ──────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const os = require('os');
const settings = require('../settings');
const gTTS = require('gtts');

const EXCLUDE = ['help']; // add more command names to hide if needed
const BANNER = 'https://water-billimg.onrender.com/1761205727440.png';

const FALLBACK = `*Help*\nUnable to build dynamic command list.`;

/**
 * Get the most appropriate name for greeting / display
 * Priority: contact name → pushName → phone number
 */
async function getBestDisplayName(sock, message) {
  try {
    let jid = message?.key?.participant || message?.key?.from || message?.key?.remoteJid;
    if (!jid) return 'friend';

    // Try to get real contact name (most reliable when store is enabled)
    if (sock?.getContact) {
      try {
        const contact = await sock.getContact(jid);
        if (contact?.name || contact?.verifiedName || contact?.notify) {
          return (contact.name || contact.verifiedName || contact.notify).trim();
        }
      } catch (_) {
        // silent fallback if getContact not available or fails
      }
    }

    // Fallback 1: WhatsApp display name (pushName)
    if (message?.pushName?.trim()) {
      return message.pushName.trim();
    }

    // Fallback 2: just the phone number
    return jid.split('@')[0] || 'someone';
  } catch {
    return 'friend';
  }
}

function getUptime() {
  const u = process.uptime();
  const h = Math.floor(u / 3600);
  const m = Math.floor((u % 3600) / 60);
  const s = Math.floor(u % 60);
  return `${h}h ${m}m ${s}s`;
}

function readMessageText(message) {
  if (!message?.message) return '';
  const m = message.message;
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    ''
  ).trim();
}

function getCommandDescription(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/).slice(0, 10);
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      if (t.startsWith('//')) return t.replace(/^\/\/\s*/, '').trim();
      if (t.startsWith('/*')) return t.replace(/^\/\*\s?/, '').replace(/\*\/$/, '').trim();
      if (t.startsWith('*')) return t.replace(/^\*\s?/, '').trim();
    }
  } catch {}
  return '';
}

function listCommandFiles() {
  const dir = __dirname;
  try {
    return fs
      .readdirSync(dir)
      .filter(f => f.endsWith('.js'))
      .map(f => path.basename(f, '.js'))
      .filter(name => !EXCLUDE.includes(name))
      .sort()
      .map(name => {
        const fp = path.join(dir, `${name}.js`);
        return { name, desc: getCommandDescription(fp) };
      });
  } catch {
    return [];
  }
}

function buildHelpMessage(cmdList, opts) {
  const {
    runtime = getUptime(),
    mode = settings.commandMode || 'public',
    prefix = settings.prefix || '.',
    ramUsed = '?',
    ramTotal = '?',
    time = new Date().toLocaleTimeString('en-GB', { hour12: false }),
    name = 'User',
    user = 'Unknown',
  } = opts;

  const header = `*🤖 ${settings.botName || '𝙼𝚒𝚌𝚔𝚎𝚢 𝙶𝚕𝚒𝚝𝚌𝚑'}*\n\n` +
    `👑 Owner: ${settings.botOwner || 'Mickey'}\n` +
    `✨ User: \( {name} | v \){settings.version || '?.?'}\n` +
    `⏱ Uptime: ${runtime} | ⌚ ${time}\n` +
    `🛡 Mode: ${mode} | Prefix: ${prefix}\n` +
    `🧠 RAM: ${ramUsed} / ${ramTotal} GB\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  const title = `*📋 Commands (${cmdList.length})*\n\n`;

  const list = cmdList
    .map(c => `▸ *\( {prefix} \){c.name}*${c.desc ? ` - ${c.desc}` : ''}`)
    .join('\n');

  const footer = `\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 Total: ${cmdList.length} | Excluded: ${EXCLUDE.length}`;

  return header + title + list + footer;
}

async function sendTTSGreeting(sock, chatId, message) {
  try {
    const displayName = await getBestDisplayName(sock, message);
    const text = `Hello ${displayName}, thanks for trusting my bot. Enjoy using Mickey Glitch!`;

    const filename = `greeting-${Date.now()}.mp3`;
    const dir = path.join(__dirname, '..', 'assets');
    const filepath = path.join(dir, filename);

    await fs.promises.mkdir(dir, { recursive: true });

    const gtts = new gTTS(text, 'en');

    await new Promise((resolve, reject) => {
      gtts.save(filepath, err => (err ? reject(err) : resolve()));
    });

    const buffer = await fs.promises.readFile(filepath);

    await sock.sendMessage(chatId, {
      audio: buffer,
      mimetype: 'audio/mpeg',
      ptt: true,
    }, { quoted: message });

    // cleanup
    fs.unlink(filepath, () => {});
  } catch (err) {
    console.error('[TTS Greeting] Failed:', err.message || err);
    // silent fail → don't break help command
  }
}

async function helpCommand(sock, chatId, message) {
  if (!sock || !chatId) return;

  try {
    const memUsed = (process.memoryUsage().rss / 1024 ** 3).toFixed(2);
    const memTotal = (os.totalmem() / 1024 ** 3).toFixed(2);

    const displayName = await getBestDisplayName(sock, message);
    const userId = (message?.key?.participant || message?.key?.from || '').split('@')[0] || 'Unknown';

    const cmdList = listCommandFiles();

    if (!cmdList.length) {
      return sock.sendMessage(chatId, { text: FALLBACK }, { quoted: message });
    }

    const helpText = buildHelpMessage(cmdList, {
      ramUsed: memUsed,
      ramTotal: memTotal,
      name: displayName,
      user: userId,
    });

    // Send main help message
    if (helpText.length > 4000) {
      const tmp = path.join(os.tmpdir(), `help-${Date.now()}.txt`);
      fs.writeFileSync(tmp, helpText);
      await sock.sendMessage(chatId, {
        document: { url: tmp },
        fileName: `help-commands-${new Date().toISOString().slice(0,10)}.txt`,
        mimetype: 'text/plain',
        caption: `📚 Full command list (v${settings.version || '?.?'})`,
      }, { quoted: message });
      fs.unlink(tmp, () => {});
    } else {
      await sock.sendMessage(chatId, {
        text: helpText,
        contextInfo: {
          externalAdReply: {
            title: `${settings.botName || 'Mickey Glitch'} — Commands`,
            body: `v${settings.version || '?.?'}`,
            thumbnailUrl: BANNER,
            sourceUrl: 'https://github.com/Mickeydeveloper/Mickey-Glitch',
            mediaUrl: 'https://github.com/Mickeydeveloper/Mickey-Glitch',
            mediaType: 1,
            showAdAttribution: true,
            renderLargerThumbnail: true,
          },
        },
      }, { quoted: message });
    }

    // Voice greeting (non-blocking)
    sendTTSGreeting(sock, chatId, message).catch(console.error);

  } catch (error) {
    console.error('[helpCommand] Error:', error);

    let errMsg = 'Unknown error';
    if (error instanceof Error) {
      errMsg = error.message;
    } else if (typeof error === 'string') {
      errMsg = error;
    } else {
      errMsg = String(error);
    }

    const msg = `*Error occurred:*\n\( {errMsg}\n\n \){FALLBACK}`;

    try {
      await sock.sendMessage(chatId, { text: msg }, { quoted: message });
    } catch (e2) {
      console.error('Also failed to send error message:', e2);
    }
  }
}

module.exports = helpCommand;