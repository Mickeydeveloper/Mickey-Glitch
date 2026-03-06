/**
 * PROFESSIONAL WHATSAPP BOT SYSTEM
 * Enterprise Connection Edition
 */

require('./settings')

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  jidNormalizedUser
} = require('@whiskeysockets/baileys')

const pino = require('pino')
const chalk = require('chalk')
const fs = require('fs')
const path = require('path')
const readline = require('readline')

const { handleMessages, handleStatusUpdate } = require('./main')
const logger = require('./lib/silentLogger')

const SESSION_FOLDER = './session'
const TEMP_DIR = './temp'
const TMP_DIR = './tmp'

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true })
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true })

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const question = (text) => new Promise((resolve) => rl.question(text, resolve))

let cleanupStarted = false
let reconnecting = false

async function startBot() {
  try {
    console.clear()
    console.log(chalk.cyan.bold('🚀 Starting Official WhatsApp Bot System...'))

    const { version } = await fetchLatestBaileysVersion()
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER)

    const sock = makeWASocket({
      version,
      logger, // custom logger with noise filtering and colors
      printQRInTerminal: false,
      browser: ["Ubuntu", "Chrome", "120.0.0"],
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
      },
      markOnlineOnConnect: false,
      syncFullHistory: true,
      retryRequestDelayMs: 300,
      maxMsgRetryCount: 5,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 10000
    })

    sock.ev.on('creds.update', saveCreds)

    // 🔐 PAIRING SYSTEM
    if (!state.creds.registered) {
      console.log(chalk.yellow('\n🔐 Device Not Linked'))
      let phone = await question('📱 Enter Phone Number (2557xxxxxxx): ')
      phone = phone.replace(/[^0-9]/g, '')
      if (!phone.startsWith('255')) {
        phone = phone.startsWith('0')
          ? '255' + phone.slice(1)
          : '255' + phone
      }

      await new Promise(r => setTimeout(r, 4000))

      const code = await sock.requestPairingCode(phone)
      const formatted = code?.match(/.{1,4}/g)?.join(' - ') || code

      console.log(chalk.green(`\n🔑 Pairing Code: ${formatted}\n`))
    }

    // 🔄 CONNECTION HANDLER
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update

      if (connection === 'connecting') {
        console.log(chalk.blue('⏳ Establishing Secure Connection...'))
      }

      if (connection === 'open') {
        reconnecting = false

        const botJid = jidNormalizedUser(sock.user.id)
        const botNumber = botJid.split('@')[0]

        console.log(chalk.green.bold(`✅ Connected Successfully: ${botNumber}`))

        // 🔥  WELCOME MESSAGE
        setTimeout(async () => {
          try {
            await sock.sendMessage(botJid, {
              text:
`
 *WHATSAPP BOT SYSTEM*


🟢 Status      : Online
🔐 Encryption  : End-to-End Secured
📡 Connection  : Successfully Established

_This automation service is operating normally._`,

              contextInfo: {
                externalAdReply: {
                  title: "OFFICIAL WHATSAPP AUTOMATION",
                  body: "ᎷᎥፈᏦᏋᎩ ᎶᏝᎥᏖፈᏂ ᏇᏂᏗᏖᏕᏗᎮᎮ ",
                  thumbnailUrl: "https://files.catbox.moe/p3yzfk.jpg",
                  sourceUrl: "https://whatsapp.com/",
                  mediaType: 1,
                  renderLargerThumbnail: true,
                  showAdAttribution: true,
                }
              }
            })
          } catch (e) {
            console.log("Ad Message Error:", e.message)
          }
        }, 4000)

        if (!cleanupStarted) {
          setupCleanup(sock, botJid)
          cleanupStarted = true
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode
        const errorMessage = lastDisconnect?.error?.message || ''

        console.log(chalk.red('❌ Connection Closed'))

        // 🔥 AUTO FIX BAD MAC
        if (
          errorMessage.includes('Bad MAC') ||
          errorMessage.includes('decrypt') ||
          errorMessage.includes('Failed to decrypt')
        ) {
          console.log(chalk.red('⚠ Corrupted Session Detected. Resetting...'))
          try {
            fs.rmSync(SESSION_FOLDER, { recursive: true, force: true })
          } catch {}
          return startBot()
        }

        if (statusCode === DisconnectReason.loggedOut) {
          console.log(chalk.red('🚪 Logged Out. Clearing Session...'))
          fs.rmSync(SESSION_FOLDER, { recursive: true, force: true })
          process.exit(1)
        }

        if (!reconnecting) {
          reconnecting = true
          console.log(chalk.yellow('🔄 Reconnecting in 5 seconds...'))
          setTimeout(() => startBot(), 5000)
        }
      }
    })

    // 📩 MESSAGE HANDLER
    sock.ev.on('messages.upsert', async (m) => {
      try {
        const msg = m.messages[0]
        if (!msg?.message) return

        if (msg.key.remoteJid === 'status@broadcast') {
          if (typeof handleStatusUpdate === 'function')
            await handleStatusUpdate(sock, m)
          return
        }

        if (typeof handleMessages === 'function')
          await handleMessages(sock, m)

      } catch (err) {
        console.log('Message Error:', err.message)
      }
    })

  } catch (err) {
    console.log(chalk.red('Fatal System Error:'), err.message)
    setTimeout(() => startBot(), 5000)
  }
}

// 🧹 CLEANUP SYSTEM
function setupCleanup(sock, botJid) {
  setInterval(async () => {
    let deleted = 0

    ;[TEMP_DIR, TMP_DIR].forEach(dir => {
      if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach(file => {
          try {
            fs.unlinkSync(path.join(dir, file))
            deleted++
          } catch {}
        })
      }
    })

    console.log('🧹 Maintenance Completed')

    if (deleted > 0) {
      try {
        await sock.sendMessage(botJid, {
          text: `🧹 System Maintenance Completed\nTemporary files cleared: ${deleted}`
        })
      } catch {}
    }

  }, 30 * 60 * 1000)
}

startBot()
