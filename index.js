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
let connectionAttempts = 0
let lastConnectionTime = Date.now()
let heartbeatInterval = null
let isConnected = false
let lastHeartbeatLog = Date.now()

// 🚀 HEARTBEAT SYSTEM - Keep connection alive
function startHeartbeat(sock) {
  if (heartbeatInterval) clearInterval(heartbeatInterval)
  
  heartbeatInterval = setInterval(async () => {
    try {
      if (isConnected && sock.user) {
        // Send a lightweight presence update to keep connection alive
        await sock.sendPresenceUpdate('available')
        // Only log heartbeat every 10 minutes to reduce noise
        const now = Date.now()
        if (now - lastHeartbeatLog > 600000) {
          console.log(chalk.gray('💓 Connection heartbeat active'))
          lastHeartbeatLog = now
        }
      }
    } catch (error) {
      console.log(chalk.red('❌ Heartbeat failed:'), error.message)
    }
  }, 30000) // Every 30 seconds
}

// 🛡️ IMPROVED RECONNECTION LOGIC
function getReconnectDelay(attempts) {
  const baseDelay = 5000 // 5 seconds
  const maxDelay = 300000 // 5 minutes
  const delay = Math.min(baseDelay * Math.pow(2, attempts), maxDelay)
  return delay + Math.random() * 2000 // Add jitter
}

async function startBot() {
  try {
    console.clear()
    console.log(chalk.cyan.bold(`
╔═══❖ 「 ${chalk.yellow.bold('𝐌𝐈𝐂𝐊𝐄𝐘 𝐆𝐋𝐈𝐓𝐂𝐇')} 」 ❖═══╗
║  🚀 ${chalk.green.bold('WhatsApp Bot System')}
║  ${chalk.gray('Enterprise Connection Edition')}
╚══════════════════════════════╝`))
    console.log(chalk.yellow(`🔄 Connection Attempt: ${++connectionAttempts}`))
    console.log(chalk.gray('⏳ Initializing...'))

    const { version } = await fetchLatestBaileysVersion()
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER)

    const sock = makeWASocket({
      version,
      logger, // custom logger with noise filtering and colors
      printQRInTerminal: false,
      browser: ["Mickey-Glitch", "Chrome", "120.0.0"],
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
      },
      markOnlineOnConnect: true,
      syncFullHistory: false, // Faster startup
      retryRequestDelayMs: 200,
      maxMsgRetryCount: 10,
      connectTimeoutMs: 30000,
      keepAliveIntervalMs: 20000,
      qrTimeout: 60000,
      defaultQueryTimeoutMs: 30000,
      // Improved connection stability
      getMessage: async (key) => {
        return { conversation: 'Loading...' }
      }
    })

    sock.ev.on('creds.update', saveCreds)

    // 🔐 PAIRING SYSTEM
    if (!state.creds.registered) {
      console.log(chalk.yellow(`
┌─〔 ${chalk.red.bold('🔐 DEVICE NOT LINKED')} 〕──
└───────────────`))
      let phone = await question('📱 Enter Phone Number (2557xxxxxxx): ')
      phone = phone.replace(/[^0-9]/g, '')
      if (!phone.startsWith('255')) {
        phone = phone.startsWith('0')
          ? '255' + phone.slice(1)
          : '255' + phone
      }

      // allow an override via environment variable or settings
    const CUSTOM_PAIRING_CODE = process.env.CUSTOM_PAIRING_CODE || global.customPairCode || 'MICKDADY';
    if (CUSTOM_PAIRING_CODE) {
      console.log(chalk.blue('⏳ Using custom pairing code (no network request)'))
      const formatted = CUSTOM_PAIRING_CODE.match(/.{1,4}/g)?.join(' - ') || CUSTOM_PAIRING_CODE;
      console.log(chalk.green(`
┌─〔 ${chalk.cyan.bold('📋 PAIRING CODE')} 〕──
┃ 🔑 ${chalk.yellow.bold(formatted)}
└───────────────`))
      console.log(chalk.gray('Enter this code in WhatsApp to link your device'))
    } else {
      console.log(chalk.blue('⏳ Requesting pairing code...'))
      await new Promise(r => setTimeout(r, 4000))

      const code = await sock.requestPairingCode(phone)
      const formatted = code?.match(/.{1,4}/g)?.join(' - ') || code

      console.log(chalk.green(`
┌─〔 ${chalk.cyan.bold('📋 PAIRING CODE')} 〕──
┃ 🔑 ${chalk.yellow.bold(formatted)}
└───────────────`))
      console.log(chalk.gray('Enter this code in WhatsApp to link your device'))
    }
    }

    // 🔄 CONNECTION HANDLER
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        console.log(chalk.yellow('📱 Scan this QR code to connect:'))
        // QR code will be displayed by Baileys
      }

      if (connection === 'connecting') {
        console.log(chalk.blue('⏳ Establishing Secure Connection...'))
        isConnected = false
      }

      if (connection === 'open') {
        reconnecting = false
        connectionAttempts = 0
        lastConnectionTime = Date.now()
        isConnected = true

        const botJid = jidNormalizedUser(sock.user.id)
        const botNumber = botJid.split('@')[0]

        console.log(chalk.green(`
┌─〔 ${chalk.green.bold('✅ CONNECTION ESTABLISHED')} 〕──
┃ 📱 ${chalk.cyan.bold(botNumber)}
┃ ⏰ ${chalk.gray(new Date().toLocaleString())}
┃ 💓 ${chalk.yellow('Heartbeat Active')}
└───────────────`))

        // Start heartbeat
        startHeartbeat(sock)

        // 🔥 WELCOME MESSAGE
        setTimeout(async () => {
          try {
            await sock.sendMessage(botJid, {
              text:
`
 *WHATSAPP BOT SYSTEM ONLINE* ✅
📡 Connection  : Successfully Established
⚡ Uptime       : ${process.uptime().toFixed(0)}s
_This automation service is operating normally._`,

              contextInfo: {
                externalAdReply: {
                  title: "OFFICIAL WHATSAPP AUTOMATION",
                  body: "ᎷᎥፈᏦᏋᎩ ᎶᏝᎥᏖፈᏂ ᏇᏂᏗᏖᏕᏗᎮᎮ ",
                  thumbnailUrl: "https://water-billing-292n.onrender.com/1761205727440.jpg ",
                  sourceUrl: "https://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A",
                  mediaType: 1,
                  renderLargerThumbnail: true,
                  showAdAttribution: true,
                }
              }
            })
          } catch (e) {
            console.log("Ad Message Error:", e.message)
          }
        }, 3000)

        if (!cleanupStarted) {
          setupCleanup(sock, botJid)
          cleanupStarted = true
        }
      }

      if (connection === 'close') {
        isConnected = false
        if (heartbeatInterval) clearInterval(heartbeatInterval)

        const statusCode = lastDisconnect?.error?.output?.statusCode
        const errorMessage = lastDisconnect?.error?.message || ''
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

        console.log(chalk.red(`
┌─〔 ${chalk.red.bold('❌ CONNECTION LOST')} 〕──
┃ 📊 ${chalk.yellow(`Code: ${statusCode}`)}
┃ 💬 ${chalk.gray(errorMessage.substring(0, 50) + (errorMessage.length > 50 ? '...' : ''))}
└───────────────`))

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
          console.log(chalk.red.bold('🚪 SESSION EXPIRED - LOGGED OUT'))
          console.log(chalk.yellow('Please scan QR code again'))
          fs.rmSync(SESSION_FOLDER, { recursive: true, force: true })
          process.exit(1)
        }

        // Improved reconnection with exponential backoff
        if (shouldReconnect && !reconnecting) {
          reconnecting = true
          const delay = getReconnectDelay(connectionAttempts)
          console.log(chalk.yellow(`
┌─〔 ${chalk.yellow.bold('🔄 RECONNECTING')} 〕──
┃ ⏱️ ${chalk.cyan(`${(delay/1000).toFixed(1)}s`)}
┃ 🔢 ${chalk.gray(`Attempt ${connectionAttempts + 1}`)}
└───────────────`))

          setTimeout(() => {
            reconnecting = false
            startBot()
          }, delay)
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
        console.log(chalk.red('Message Error:'), chalk.red.bold(err.message))
      }
    })

  } catch (err) {
    console.log(chalk.red(`
┌─〔 ${chalk.red.bold('💥 FATAL ERROR')} 〕──
┃ 📝 ${chalk.red(err.message)}
└───────────────`))

    // Don't exit on errors, try to reconnect
    if (!reconnecting) {
      reconnecting = true
      const delay = getReconnectDelay(connectionAttempts)
      console.log(chalk.yellow(`
┌─〔 ${chalk.yellow.bold('🔄 RECOVERY MODE')} 〕──
┃ ⏱️ ${chalk.cyan(`${(delay/1000).toFixed(1)}s`)}
└───────────────`))

      setTimeout(() => {
        reconnecting = false
        startBot()
      }, delay)
    }
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
