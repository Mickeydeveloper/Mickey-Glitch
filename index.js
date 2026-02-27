/**
 * MICKEY GLITCH BOT - MAIN INDEX
 * Clean, consolidated connection handler and ad send
 */

require('./settings');

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  jidNormalizedUser
} = require('@whiskeysockets/baileys');

const pino = require('pino');
const chalk = require('chalk');
const readline = require('readline');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const { handleMessages, handleStatusUpdate } = require('./main');

const SESSION_FOLDER = './session';
const TEMP_DIR = path.join(process.cwd(), 'temp');
const TMP_DIR = path.join(process.cwd(), 'tmp');

// Ensure temp folders exist
if (!fsSync.existsSync(TEMP_DIR)) fsSync.mkdirSync(TEMP_DIR, { recursive: true });
if (!fsSync.existsSync(TMP_DIR)) fsSync.mkdirSync(TMP_DIR, { recursive: true });

// Aggressive cleanup every 2 minutes to remove temp files
function cleanupTempFolders() {
  const folders = [TEMP_DIR, TMP_DIR];
  setInterval(() => {
    folders.forEach(folder => {
      if (!fsSync.existsSync(folder)) return;
      try {
        for (const file of fsSync.readdirSync(folder)) {
          const filePath = path.join(folder, file);
          try { fsSync.rmSync(filePath, { recursive: true, force: true }); } catch (e) {}
        }
      } catch (e) {}
    });
  }, 2 * 60 * 1000);
}
cleanupTempFolders();

// Readline for pairing input
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function startBot(reconnectAttempts = 0) {
  try {
    console.clear();
    const { version } = await fetchLatestBaileysVersion();
    console.log(chalk.cyan(`WhatsApp v${version.join('.')}`));

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER);

    const sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['Mickey', 'Chrome', '1.0.0'],
      auth: state,
      markOnlineOnConnect: true,
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false,
      downloadHistory: false,
      fireInitQueries: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (connection === 'connecting') console.log(chalk.blue('⏳ Connecting to WhatsApp...'));
      if (qr) console.log(chalk.yellow('⚡ QR ready (fallback)'));

      // Pairing prompt when required
      if ((connection === 'connecting' || qr) && !state.creds.registered) {
        try {
          console.log(chalk.yellow('\n🔐 NEW SESSION - PAIRING REQUIRED\n'));
          const rawPhone = await question(chalk.cyan('📱 Phone (e.g. 255715123456): '));
          let phone = rawPhone.trim().replace(/[^0-9]/g, '');
          if (phone.length < 9) { console.log(chalk.red('\n❌ Invalid number\n')); process.exit(1); }
          if (!phone.startsWith('255')) phone = '255' + phone;
          console.log(chalk.green(`✅ +${phone}`));
          console.log(chalk.cyan('⏳ Getting pairing code...\n'));
          await new Promise(r => setTimeout(r, 3000));

          const code = await sock.requestPairingCode(phone);
          console.log(chalk.black.bgGreen('╔════════════════════════════════╗'));
          console.log(chalk.black.bgGreen('║   🔑 YOUR PAIRING CODE 🔑       ║'));
          console.log(chalk.black.bgGreen('╠════════════════════════════════╣'));
          console.log(chalk.black.bgGreen(`║ ${code.match(/.{1,4}/g)?.join(' - ') || code} │`));
          console.log(chalk.black.bgGreen('╚════════════════════════════════╝\n'));
          console.log(chalk.yellow('📱 WhatsApp → Settings → Linked Devices → Link Device'));
          console.log(chalk.yellow('⏰ Code expires in 30 seconds!\n'));
        } catch (e) {
          console.log(chalk.red('❌ Pairing failed')); phoneAsked = false; process.exit(1);
        }
      }

      if (connection === 'open') {
        const botJid = jidNormalizedUser(sock.user?.id);
        const botNum = botJid?.split('@')[0] || '';
        console.log(chalk.green(`✅ BOT ONLINE — +${botNum}`));

        // send ad image to bot's own JID (me)
        try {
          if (botJid) {
            const adCaption = `*MICKEY GLITCH™*\n\n📱 Bot: +${botNum}\n⚡ Ultra-fast responses\n🟢 24/7 Online\n\nSend *start* to begin.`;
            await sock.sendMessage(botJid, {
              image: { url: 'https://files.catbox.moe/llc9v7.png' },
              caption: adCaption
            });
          }
        } catch (e) { /* ignore send errors */ }

        phoneAsked = false; reconnectAttempts = 0;
      }

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        if (code === DisconnectReason.loggedOut) {
          console.log(chalk.red('📵 Logged out - cleaning session'));
          await fs.rm(SESSION_FOLDER, { recursive: true, force: true }).catch(() => {});
          process.exit(1);
        }
        console.log(chalk.yellow('⚠️ WhatsApp not available — reconnecting...'));
        const delay = Math.min(5000 * (reconnectAttempts + 1), 60000);
        setTimeout(() => startBot(reconnectAttempts + 1), delay);
      }
    });

    sock.ev.on('messages.upsert', async (m) => {
      try {
        const msg = m.messages[0]; if (!msg?.message) return;
        if (msg.key.remoteJid === 'status@broadcast') { await handleStatusUpdate?.(sock, msg); return; }
        // fast non-blocking handling
        handleMessages?.(sock, m).catch(() => {});
      } catch (e) {}
    });

    // keep presence
    setInterval(() => sock?.sendPresenceUpdate('available').catch(() => {}), 45000);

  } catch (err) {
    const delay = Math.min(10000 * (reconnectAttempts + 1), 60000);
    console.log(chalk.red('[START ERROR]'), err?.message || err);
    setTimeout(() => startBot(reconnectAttempts + 1), delay);
  }
}

startBot();
