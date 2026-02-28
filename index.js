/**
 * MICKEY GLITCH BOT - MAIN INDEX (FIXED PAIRING)
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

// Mengineyo kutoka main.js
const { handleMessages, handleStatusUpdate } = require('./main');

const SESSION_FOLDER = './session';
const TEMP_DIR = path.join(process.cwd(), 'temp');
const TMP_DIR = path.join(process.cwd(), 'tmp');

// Hakikisha folder zipo
if (!fsSync.existsSync(TEMP_DIR)) fsSync.mkdirSync(TEMP_DIR, { recursive: true });
if (!fsSync.existsSync(TMP_DIR)) fsSync.mkdirSync(TMP_DIR, { recursive: true });

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

let cleanupInitialized = false;

async function startBot(reconnectAttempts = 0) {
  try {
    console.clear();
    const { version } = await fetchLatestBaileysVersion();
    console.log(chalk.cyan(`ＭＩＣＫＥＹ-ＧＬＩＴＣＨ v3.0.0 | WhatsApp v${version.join('.')}`));

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER);

    const sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false, // Tunatumia Pairing Code
      browser: ["Ubuntu", "Chrome", "20.0.04"], 
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
      },
      markOnlineOnConnect: true,
      syncFullHistory: false,
      generateHighQualityLinkPreview: true
    });

    sock.ev.on('creds.update', saveCreds);

    // --- CONNECTION HANDLER & PAIRING LOGIC ---
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (connection === 'connecting') {
        console.log(chalk.blue('⏳ Inatafuta muunganisho...'));
      }

      // HAPA NDIPO PAIRING INAFANYIKA
      if (!sock.authState.creds.registered && !global.pairingStarted) {
        global.pairingStarted = true;
        
        console.log(chalk.yellow('\n🔐 NEW SESSION DETECTED - PAIRING REQUIRED\n'));
        let rawPhone = await question(chalk.cyan('📱 Ingiza Namba (Mfano: 255715xxxxxx): '));
        let phone = rawPhone.trim().replace(/[^0-9]/g, '');

        // Validating and Formatting Number
        if (phone.length < 9) {
          console.log(chalk.red('\n❌ Namba haitoshi! Tafadhali anza upya.\n'));
          process.exit(1);
        }
        if (!phone.startsWith('255')) {
          if (phone.startsWith('0')) phone = '255' + phone.slice(1);
          else phone = '255' + phone;
        }

        console.log(chalk.green(`✅ Inatuma ombi la Pairing kwenda: +${phone}`));
        console.log(chalk.cyan('⏳ Tafadhali subiri sekunde 6 ili kodi itengenezwe...\n'));
        
        await new Promise(r => setTimeout(r, 6000));

        try {
          const code = await sock.requestPairingCode(phone);
          const formattedCode = code?.match(/.{1,4}/g)?.join(' - ') || code;
          
          console.log(chalk.black.bgGreen('╔════════════════════════════════╗'));
          console.log(chalk.black.bgGreen('║   🔑 YOUR PAIRING CODE 🔑       ║'));
          console.log(chalk.black.bgGreen('╠════════════════════════════════╣'));
          console.log(chalk.black.bgGreen(`║          ${formattedCode}           ║`));
          console.log(chalk.black.bgGreen('╚════════════════════════════════╝\n'));
          
          console.log(chalk.yellow('📱 HATUA ZA KUFUATA:'));
          console.log(chalk.white('1. Fungua WhatsApp kwenye simu yako.'));
          console.log(chalk.white('2. Gusa Vidoti vitatu (Settings) → Linked Devices.'));
          console.log(chalk.white('3. Gusa "Link a Device" kisha chagua "Link with phone number instead".'));
          console.log(chalk.white(`4. Ingiza kodi: ${formattedCode}\n`));
        } catch (e) {
          console.log(chalk.red('❌ Ombi la kodi limeshindwa:'), e.message);
          global.pairingStarted = false;
        }
      }

      if (connection === 'open') {
        global.pairingStarted = false;
        const botJid = jidNormalizedUser(sock.user?.id);
        const botNum = botJid?.split('@')[0] || '';
        console.log(chalk.green.bold(`\n✅ MICKEY GLITCH IS ONLINE!\n📱 Number: +${botNum}`));

        // Welcome Message (Ad)
        try {
          const adCaption = `*ＭＩＣＫＥＹ-ＧＬＩＴＣＨ™*\n\n┌─〔 *STATUS* 〕──\n┃ 🟢 Online: Active\n┃ ⚡ Version: 3.0.0\n┃ 🚀 Mode: Stable\n└────────────\n\n_System fully operational._`;
          await sock.sendMessage(botJid, {
            text: adCaption,
            contextInfo: {
              externalAdReply: {
                title: 'SYSTEM CONNECTED',
                body: 'Mickey Glitch is now active',
                thumbnailUrl: 'https://files.catbox.moe/llc9v7.png',
                mediaType: 1,
                renderLargerThumbnail: true
              }
            }
          });
        } catch (e) {}

        if (!cleanupInitialized) {
          setupCleanupRoutines(sock);
          cleanupInitialized = true;
        }
      }

      if (connection === 'close') {
        global.pairingStarted = false;
        const code = lastDisconnect?.error?.output?.statusCode;
        if (code === DisconnectReason.loggedOut) {
          console.log(chalk.red('📵 Logged out - cleaning session'));
          fsSync.rmSync(SESSION_FOLDER, { recursive: true, force: true });
          process.exit(1);
        }
        const delay = Math.min(5000 * (reconnectAttempts + 1), 30000);
        setTimeout(() => startBot(reconnectAttempts + 1), delay);
      }
    });

    // --- MESSAGE & STATUS LISTENER ---
    sock.ev.on('messages.upsert', async (m) => {
      try {
        const msg = m.messages[0];
        if (!msg?.message) return;

        // Auto Status View & Like
        if (msg.key.remoteJid === 'status@broadcast') {
          if (typeof handleStatusUpdate === 'function') {
            await handleStatusUpdate(sock, m);
          }
          return;
        }

        // Handle Chat Messages
        if (typeof handleMessages === 'function') {
          await handleMessages(sock, m);
        }
      } catch (e) {
        console.error(chalk.red('[UPSERT ERROR]'), e.message);
      }
    });

  } catch (err) {
    console.log(chalk.red('[CRITICAL ERROR]'), err.message);
    setTimeout(() => startBot(), 5000);
  }
}

// Cleanup Routine
function setupCleanupRoutines(sock) {
  setInterval(() => {
    [TEMP_DIR, TMP_DIR].forEach(dir => {
      if (fsSync.existsSync(dir)) {
        fsSync.readdirSync(dir).forEach(file => {
          try { fsSync.unlinkSync(path.join(dir, file)); } catch (e) {}
        });
      }
    });
    console.log(chalk.magenta('🧹 Temp files cleaned.'));
  }, 30 * 60 * 1000);
}

startBot();
