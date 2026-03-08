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

// Global error handlers to prevent crashes from hanging promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  // Don't exit, just log
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  // Don't exit, just log
})

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
let pairingInProgress = false

// 🚀 HEARTBEAT SYSTEM - Keep connection alive (optimized for 24/7)
function startHeartbeat(sock) {
  if (heartbeatInterval) clearInterval(heartbeatInterval)
  
  heartbeatInterval = setInterval(async () => {
    try {
      if (isConnected && sock.user) {
        // Send a lightweight presence update to keep connection alive
        await sock.sendPresenceUpdate('available')
        // Only log heartbeat every 20 minutes to reduce noise
        const now = Date.now()
        if (now - lastHeartbeatLog > 1200000) {
          console.log(chalk.gray('💓 Heartbeat'))
          lastHeartbeatLog = now
        }
      }
    } catch (error) {
      // Silent fail for heartbeat - connection errors handled elsewhere
    }
  }, 90000) // Every 90 seconds (optimized from 30s)
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
      pairingInProgress = true
      console.log(chalk.yellow(`
┌─〔 ${chalk.red.bold('🔐 DEVICE NOT LINKED')} 〕──
└───────────────`))
      
      console.log(chalk.gray('📱 Enter Phone Number (2557xxxxxxx):'))
      let phone = await question('')
      phone = phone.replace(/[^0-9]/g, '')
      if (!phone.startsWith('255')) {
        phone = phone.startsWith('0')
          ? '255' + phone.slice(1)
          : '255' + phone
      }

      console.log(chalk.blue('⏳ Generating pairing code...'))
      
      try {
        const code = await sock.requestPairingCode(phone)
        const formatted = code?.match(/.{1,4}/g)?.join(' - ') || code

        console.log(chalk.green(`
┌─〔 ${chalk.cyan.bold('📋 PAIRING CODE')} 〕──
┃ 🔑 ${chalk.yellow.bold(formatted)}
└───────────────`))
        console.log(chalk.gray('✅ Code is ready. Link your WhatsApp device:'))
        console.log(chalk.gray('   WhatsApp > Settings > Linked Devices > Link Device'))
        console.log(chalk.gray('   Then scan or enter this code on your phone.'))
        console.log(chalk.magenta('⏳ Waiting for device link... (this may take a few seconds)'))
        console.log('')

        // Listen for successful pairing
        let pairingSuccessful = false
        const pairingListener = () => {
          pairingSuccessful = true
          pairingInProgress = false
        }

        // Listen for credential updates which indicate successful pairing
        sock.ev.on('creds.update', pairingListener)

        // Wait for pairing with extended timeout
        await new Promise(resolve => {
          const checkInterval = setInterval(() => {
            if (pairingSuccessful || !pairingInProgress) {
              clearInterval(checkInterval)
              sock.ev.off('creds.update', pairingListener)
              resolve()
            }
          }, 500)

          // Hard timeout after 5 minutes
          setTimeout(() => {
            clearInterval(checkInterval)
            sock.ev.off('creds.update', pairingListener)
            resolve()
          }, 300000)
        })

        if (pairingSuccessful) {
          console.log(chalk.green('✅ Device linked successfully! Bot is now connecting...'))
        }
      } catch (pairingError) {
        pairingInProgress = false
        console.log(chalk.red('❌ Pairing error:'), chalk.red.bold(pairingError.message))
        console.log(chalk.yellow('💡 Tip: Make sure you entered the phone number correctly'))
        console.log(chalk.yellow('💡 Retrying in 5 seconds...'))
        await new Promise(r => setTimeout(r, 5000))
        return startBot()
      }
    } else {
      console.log(chalk.green('✅ Device already linked. Connecting...'))
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
        const timestamp = new Date().toLocaleString('en-GB', { timeZone: 'Africa/Dar_es_Salaam' })

        console.log(chalk.green(`
┌─〔 *CONNECTION ESTABLISHED* 〕──
┃ 🟢 *Bot:* \`${botNumber}\`
┃ 🕒 *Time:* \`${timestamp}\`
┃ ⏱️ *Attempt:* \`${connectionAttempts}\`
┃ 💚 *Status:* \`Online & Active\`
└───────────────`))

        // Start heartbeat
        startHeartbeat(sock)

        // 🔥 WELCOME MESSAGE
        setTimeout(async () => {
          try {
            await sock.sendMessage(botJid, {
              text:
`┌─〔 *SYSTEM ONLINE* 〕──
┃ 🟢 Status: Online
┃ 📱 Bot: \`${botNumber}\`
┃ ⏳ Uptime: \`${Math.floor(process.uptime())}s\`
┃ 🕒 Time: \`${timestamp}\`
└───────────────

_Mickey Glitch v3_`,

              contextInfo: {
                externalAdReply: {
                  title: "MICKEY GLITCH - BOT SYSTEM",
                  body: "🟢 Status: Online & Ready",
                  thumbnailUrl: "https://water-billing-292n.onrender.com/1761205727440.jpg ",
                  sourceUrl: "https://whatsapp.com/channel/0029Va90zAnIHphOuO8Msp3A",
                  mediaType: 1,
                  renderLargerThumbnail: true,
                  showAdAttribution: true,
                }
              }
            })
          } catch (e) {
            // Silent
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

        // Skip reconnection logic if pairing is in progress
        if (pairingInProgress) {
          console.log(chalk.yellow('⚠️  Waiting for device link...'))
          return
        }

        const statusCode = lastDisconnect?.error?.output?.statusCode
        const errorMessage = lastDisconnect?.error?.message || 'Unknown error'
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

        console.log(chalk.red(`
┌─〔 CONNECTION LOST 〕──
┃ 🔴 Status: Disconnected
┃ 📊 Code: \`${statusCode}\`
┃ 💬 Error: \`${errorMessage.substring(0, 40)}\`
└───────────────`))

        // 🔥 AUTO FIX SESSION ISSUES
        if (
          errorMessage.includes('Bad MAC') ||
          errorMessage.includes('decrypt') ||
          errorMessage.includes('Failed to decrypt') ||
          errorMessage.includes('SessionEntry') ||
          errorMessage.includes('Closing session') ||
          errorMessage.includes('session') ||
          statusCode === 408 || // Request timeout
          statusCode === 500 || // Internal server error
          statusCode === 503    // Service unavailable
        ) {
          console.log(chalk.red.bold(`
┌─〔 SESSION RECOVERY 〕──
┃ ⚠️  Status: Session Issue Detected
┃ 📝 Error: ${errorMessage.substring(0, 30)}...
┃ 🔧 Action: Resetting Session...
└───────────────`))
          try {
            fs.rmSync(SESSION_FOLDER, { recursive: true, force: true })
          } catch {}
          return startBot()
        }

        if (statusCode === DisconnectReason.loggedOut) {
          console.log(chalk.red.bold(`
┌─〔 SESSION EXPIRED 〕──
┃ 🚪 Status: Logged Out
┃ 📝 Action: Rescan QR Code
└───────────────`))
          fs.rmSync(SESSION_FOLDER, { recursive: true, force: true })
          process.exit(1)
        }

        // Improved reconnection with exponential backoff
        if (shouldReconnect && !reconnecting) {
          reconnecting = true
          const delay = getReconnectDelay(connectionAttempts)
          console.log(chalk.yellow(`
┌─〔 RECONNECTING 〕──
┃ ⏱️ Wait: \`${(delay/1000).toFixed(1)}s\`
┃ 🔢 Attempt: \`${connectionAttempts + 1}\`
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

// 🧹 CLEANUP SYSTEM - Optimized for 24/7 running
function setupCleanup(sock, botJid) {
  setInterval(async () => {
    let deleted = 0

    ;[TEMP_DIR, TMP_DIR].forEach(dir => {
      if (fs.existsSync(dir)) {
        try {
          const files = fs.readdirSync(dir)
          // Only clean if more than 100 files to reduce I/O
          if (files.length > 100) {
            files.forEach(file => {
              try {
                fs.unlinkSync(path.join(dir, file))
                deleted++
              } catch {}
            })
          }
        } catch {}
      }
    })

    // Only notify on significant cleanup
    if (deleted > 50) {
      try {
        await sock.sendMessage(botJid, {
          text: `🧹 Cleared ${deleted} temp files`
        })
      } catch {}
    }

  }, 2 * 60 * 60 * 1000) // Every 2 hours (increased from 30 min)
}

startBot()
