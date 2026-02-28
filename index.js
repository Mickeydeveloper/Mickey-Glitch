/**
 * MICKEY GLITCH BOT - MAIN INDEX (AUTO-CLEANUP + AD)
 */

require('./settings');

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
  makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');

const pino = require('pino');
const chalk = require('chalk');
const readline = require('readline');
const fsSync = require('fs');
const path = require('path');

const { handleMessages, handleStatusUpdate } = require('./main');

const SESSION_FOLDER = './session';
const TEMP_DIR = path.join(process.cwd(), 'temp');
const TMP_DIR = path.join(process.cwd(), 'tmp');

if (!fsSync.existsSync(TEMP_DIR)) fsSync.mkdirSync(TEMP_DIR, { recursive: true });
if (!fsSync.existsSync(TMP_DIR)) fsSync.mkdirSync(TMP_DIR, { recursive: true });

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

let cleanupInitialized = false;

async function startBot(reconnectAttempts = 0) {
  try {
    console.clear();
    const { version } = await fetchLatestBaileysVersion();
    console.log(chalk.cyan(`ＭＩＣＫＥＹ-ＧＬＩＴＣＨ v3.0 | WA v${version.join('.')}`));

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER);

    const sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ["ubuntu", "Chrome", "20.0"], 
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
      },
      markOnlineOnConnect: true,
      syncFullHistory: false,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'connecting') {
        console.log(chalk.blue('⏳ Inatafuta muunganisho... (Connecting...)'));
      }

      // --- PAIRING LOGIC ---
      if (!sock.authState.creds.registered && !global.pairingStarted) {
        global.pairingStarted = true;
        console.log(chalk.yellow('\n🔐 KUUNGANISHA BOT (SESSION LOGIN)'));
        let rawPhone = await question(chalk.cyan('📱 Namba (Num) [Ex: 2557xxxxxxxx]: '));
        let phone = rawPhone.trim().replace(/[^0-9]/g, '');
        if (!phone.startsWith('255')) phone = phone.startsWith('0') ? '255' + phone.slice(1) : '255' + phone;

        console.log(chalk.cyan('⏳ Subiri sekunde 6... (Wait 6s...)'));
        await new Promise(r => setTimeout(r, 6000));

        try {
          const code = await sock.requestPairingCode(phone);
          const fCode = code?.match(/.{1,4}/g)?.join(' - ') || code;
          console.log(chalk.black.bgGreen(`\n🔑 KODI (CODE): ${fCode}\n`));
          console.log(chalk.white('Ingiza kodi hiyo kwenye WhatsApp yako (Enter code in WA)'));
        } catch (e) {
          console.log(chalk.red('❌ Failed:'), e.message);
          global.pairingStarted = false;
        }
      }

      // --- CONNECTION OPEN ---
      if (connection === 'open') {
        global.pairingStarted = false;
        const botJid = jidNormalizedUser(sock.user?.id);
        console.log(chalk.green.bold(`\n✅ IPO HEWANI! (ONLINE!) +${botJid.split('@')[0]}`));

        // 📤 Welcome Ad Message
        setTimeout(async () => {
          try {
            await sock.sendMessage(botJid, {
              text: `*ＭＩＣＫＥＹ-ＧＬＩＴＣＨ™*\n\n🟢 *Status:* Active (Ipo Hewani)\n🚀 *Mode:* Stable (Imetulia)\n\n_System fully operational._`,
              contextInfo: {
                externalAdReply: {
                  title: 'ＭＩＣＫＥＹ-ＧＬＩＴＣＨ™',
                  body: 'Ultimate WhatsApp Bot',
                  thumbnailUrl: 'https://files.catbox.moe/llc9v7.png',
                  sourceUrl: 'https://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A',
                  mediaType: 1,
                  renderLargerThumbnail: true,
                  showAdAttribution: true
                }
              }
            });
          } catch (e) {}
        }, 3000);

        if (!cleanupInitialized) {
          setupCleanupRoutines(sock, botJid);
          cleanupInitialized = true;
        }
      }

      if (connection === 'close') {
        global.pairingStarted = false;
        const code = lastDisconnect?.error?.output?.statusCode;
        if (code === DisconnectReason.loggedOut) {
          fsSync.rmSync(SESSION_FOLDER, { recursive: true, force: true });
          process.exit(1);
        }
        setTimeout(() => startBot(reconnectAttempts + 1), 5000);
      }
    });

    sock.ev.on('messages.upsert', async (m) => {
      try {
        const msg = m.messages[0];
        if (!msg?.message) return;
        if (msg.key.remoteJid === 'status@broadcast') {
          if (typeof handleStatusUpdate === 'function') await handleStatusUpdate(sock, m);
          return;
        }
        if (typeof handleMessages === 'function') await handleMessages(sock, m);
      } catch (e) {}
    });

  } catch (err) {
    setTimeout(() => startBot(), 5000);
  }
}

// 🧹 Cleanup Routine with WA Message
function setupCleanupRoutines(sock, botJid) {
  setInterval(async () => {
    let filesDeleted = 0;
    [TEMP_DIR, TMP_DIR].forEach(dir => {
      if (fsSync.existsSync(dir)) {
        fsSync.readdirSync(dir).forEach(file => {
          try {
            fsSync.unlinkSync(path.join(dir, file));
            filesDeleted++;
          } catch (e) {}
        });
      }
    });

    console.log(chalk.magenta('🧹 Usafi umefanyika. (Cleanup done.)'));
    
    // Tuma ujumbe wa usafi (Send Refresh Msg)
    try {
      if (filesDeleted > 0) {
        await sock.sendMessage(botJid, { 
          text: `🧹 *REFRESH OCCURRED*\n\n✅ Folders *temp* & *tmp* cleared!\n🗑️ Files deleted: ${filesDeleted}\n⏰ Time: ${new Date().toLocaleTimeString()}`
        });
      }
    } catch (e) {}
  }, 30 * 60 * 1000); // 30 mins
}

startBot();
