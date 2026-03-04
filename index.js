/**
 * MICKEY GLITCH BOT - STABLE FAST VERSION
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
const fs = require('fs');
const path = require('path');

const { handleMessages, handleStatusUpdate } = require('./main');

const SESSION_FOLDER = './session';
const TEMP_DIR = './temp';
const TMP_DIR = './tmp';

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

let sock;
let reconnecting = false;

async function startBot() {
  if (reconnecting) return;
  reconnecting = true;

  try {
    console.clear();

    const { version } = await fetchLatestBaileysVersion();
    console.log(chalk.cyan(`ＭＩＣＫＥＹ-ＧＬＩＴＣＨ | WA v${version.join('.')}`));

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER);

    sock = makeWASocket({
      version,
      logger: pino({ level: "fatal" }), // reduce memory usage
      printQRInTerminal: false,
      browser: ["Ubuntu", "Chrome", "120.0"],
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }))
      },
      markOnlineOnConnect: true,
      syncFullHistory: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 0,
      keepAliveIntervalMs: 15000
    });

    sock.ev.removeAllListeners(); // prevent duplicate listeners

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === "connecting") {
        console.log(chalk.yellow("🔄 Connecting to WhatsApp..."));
      }

      if (connection === "open") {
        reconnecting = false;
        const botNumber = jidNormalizedUser(sock.user.id);
        console.log(chalk.green(`✅ CONNECTED: ${botNumber.split("@")[0]}`));

        // Simple lightweight startup message
        await sock.sendMessage(botNumber, {
          text: "🟢 *MICKEY GLITCH ONLINE*\nFast • Stable • Active"
        });

        startCleanup(sock, botNumber);
      }

      if (connection === "close") {
        reconnecting = false;

        const reason = lastDisconnect?.error?.output?.statusCode;

        if (reason === DisconnectReason.loggedOut) {
          console.log(chalk.red("❌ Logged Out. Delete session."));
          fs.rmSync(SESSION_FOLDER, { recursive: true, force: true });
          process.exit(0);
        }

        console.log(chalk.red("⚠️ Connection Lost. Reconnecting..."));
        setTimeout(() => startBot(), 4000);
      }
    });

    // FAST MESSAGE HANDLER
    sock.ev.on("messages.upsert", async (m) => {
      if (m.type !== "notify") return;

      try {
        const msg = m.messages[0];
        if (!msg.message) return;
        if (msg.key.fromMe) return;

        if (msg.key.remoteJid === "status@broadcast") {
          if (handleStatusUpdate) return handleStatusUpdate(sock, m);
        }

        if (handleMessages) {
          await handleMessages(sock, m);
        }
      } catch (err) {
        console.log("Message Error:", err.message);
      }
    });

  } catch (err) {
    reconnecting = false;
    console.log("Startup Error:", err.message);
    setTimeout(() => startBot(), 5000);
  }
}

function startCleanup(sock, botJid) {
  setInterval(() => {
    let deleted = 0;

    [TEMP_DIR, TMP_DIR].forEach(dir => {
      if (!fs.existsSync(dir)) return;

      fs.readdirSync(dir).forEach(file => {
        try {
          fs.unlinkSync(path.join(dir, file));
          deleted++;
        } catch {}
      });
    });

    if (deleted > 0) {
      console.log(`🧹 Cleanup: ${deleted} files removed`);
    }

  }, 20 * 60 * 1000); // every 20 mins
}

startBot();
